/**
 * Server Actions: BFF API Proxy
 * Stateless Next.js Server Actions mediating client requests to Librus Synergia and demo data providers.
 * Coordinates concurrent dashboard synchronization, messages, profile lookup, justifications, and diagnostics.
 */

'use server'

import { fetchGatewayEndpoint } from '@/services/gateway.service'
import { submitJustification, fetchLiveJustificationsHistory, translateLiveJustifications } from '@/services/justification.service'
import { fetchSmartTimetable } from '@/services/timetable.service'
import { fetchStudentGrades } from '@/services/grade.service'
import { fetchAttendanceMetrics } from '@/services/attendance.service'
import { translateText } from '@/services/translation.service'
import {
  AppLanguage,
  getTranslationTargetCode,
  normalizeLanguage
} from '@/config/dictionary.config'
import {
  fetchMessagesBundle,
  applyTranslatedMessagesBundle,
  fetchReceiversOnly,
  fetchMessageContent,
  sendMessageToUser,
  downloadMessageAttachment
} from '@/services/message.service'
import { JustificationPayload } from '@/models/justification.model'
import { StudentProfile } from '@/models/account.model'
import { isDemoAccount, isStudentUsername, sanitizeAccountLabel, formatClassLabel } from '@/utils/account.util'
import { MessagesActionResult } from '@/models/message.model'
import { SmartTimetableResult } from '@/models/timetable.model'
import { GradesResult } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'
import {
  getDemoStudentProfile,
  getDemoSmartTimetable,
  getDemoGrades,
  getDemoAttendance,
  getDemoMessagesBundle,
  getDemoReceivers,
  getDemoMessageContent,
  getDemoLiveJustifications
} from '@/services/demo-data.service'

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function resolveActionTranslateTarget(translate: boolean | AppLanguage = false): boolean | string {
  if (typeof translate === 'boolean') return translate
  return getTranslationTargetCode(normalizeLanguage(translate)) || false
}

async function timedStep<T>(
  fn: () => Promise<{ success: boolean; data?: T; error?: string }>
): Promise<{ result: { success: boolean; data?: T; error?: string }; durationMs: number }> {
  const start = performance.now()
  try {
    const result = await fn()
    return { result, durationMs: Math.round(performance.now() - start) }
  } catch (err: unknown) {
    return {
      result: { success: false, error: toErrorMessage(err) },
      durationMs: Math.round(performance.now() - start)
    }
  }
}

/* === Dashboard Sync & Profile === */

export async function syncAllUserDataAction(
  username: string,
  pass: string,
  translate: boolean | AppLanguage = false,
  targetDateIso?: string
): Promise<{
  success: boolean
  error?: string
  serverTimings?: {
    totalMs: number
    timetableMs: number
    gradesMs: number
    attendanceMs: number
  }
  timetable?: { success: boolean; data?: SmartTimetableResult; error?: string }
  grades?: { success: boolean; data?: GradesResult; error?: string }
  attendance?: { success: boolean; data?: AttendanceResult; error?: string }
}> {
  const overallStart = performance.now()
  try {
    const cleanUser = String(username || '').trim()
    const cleanPass = String(pass || '').trim()
    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Brak danych logowania' }
    }

    const translateTarget = resolveActionTranslateTarget(translate)

    if (isDemoAccount(cleanUser)) {
      return {
        success: true,
        serverTimings: {
          totalMs: 15,
          timetableMs: 5,
          gradesMs: 5,
          attendanceMs: 5
        },
        timetable: { success: true, data: getDemoSmartTimetable(targetDateIso, Boolean(translateTarget)) },
        grades: { success: true, data: getDemoGrades(Boolean(translateTarget)) },
        attendance: { success: true, data: getDemoAttendance(Boolean(translateTarget)) }
      }
    }

    const [timetableStep, gradesStep, attendanceStep] = await Promise.all([
      timedStep(() => fetchSmartTimetable(cleanUser, cleanPass, translateTarget, targetDateIso)),
      timedStep(() => fetchStudentGrades(cleanUser, cleanPass, translateTarget)),
      timedStep(() => fetchAttendanceMetrics(cleanUser, cleanPass, translateTarget))
    ])

    return {
      success: true,
      serverTimings: {
        totalMs: Math.round(performance.now() - overallStart),
        timetableMs: timetableStep.durationMs,
        gradesMs: gradesStep.durationMs,
        attendanceMs: attendanceStep.durationMs
      },
      timetable: timetableStep.result,
      grades: gradesStep.result,
      attendance: attendanceStep.result
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: toErrorMessage(error)
    }
  }
}

export async function getStudentProfileAction(
  username: string,
  pass: string
): Promise<{ success: boolean; data?: StudentProfile; error?: string }> {
  try {
    const cleanUser = String(username || '').trim()
    const cleanPass = String(pass || '').trim()
    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Wprowadź login i hasło' }
    }

    if (isDemoAccount(cleanUser)) {
      return {
        success: true,
        data: getDemoStudentProfile(cleanUser)
      }
    }

    const [meRes, luckyRes, schoolsRes, classesRes] = await Promise.all([
      fetchGatewayEndpoint(cleanUser, cleanPass, 'gateway/api/2.0/Me'),
      fetchGatewayEndpoint(cleanUser, cleanPass, 'gateway/api/2.0/LuckyNumbers').catch(() => null),
      fetchGatewayEndpoint(cleanUser, cleanPass, 'gateway/api/2.0/Schools').catch(() => null),
      fetchGatewayEndpoint(cleanUser, cleanPass, 'gateway/api/2.0/Classes').catch(() => null)
    ])

    const me = meRes?.Me || meRes?.data?.Me
    if (!me || typeof me !== 'object') {
      return { success: false, error: 'Nieprawidłowy login lub hasło (brak profilu)' }
    }

    const accountInfo = me.Account || {}
    const userInfo = me.User || {}

    const firstName = userInfo.FirstName || accountInfo.FirstName || ''
    const lastName = userInfo.LastName || accountInfo.LastName || ''
    const full = [firstName, lastName].filter(Boolean).join(' ')
    const fullName = full.length > 0 ? full : accountInfo.Login || cleanUser

    const rawMeClassId = me.Class?.Id ?? userInfo.Class?.Id ?? null
    const meClassId = rawMeClassId !== null && !isNaN(Number(rawMeClassId)) ? Number(rawMeClassId) : null

    let resolvedClassName = formatClassLabel(me.Class)
    if (!resolvedClassName) {
      const classesList = Array.isArray(classesRes?.Classes) ? classesRes.Classes : []
      const matchedClass =
        (meClassId ? classesList.find((c: { Id?: unknown }) => Number(c?.Id) === meClassId) : null) ||
        classesRes?.Class ||
        classesList[0] ||
        null
      resolvedClassName = formatClassLabel(matchedClass)
    }
    if (!resolvedClassName && meClassId) {
      const classByIdRes = await fetchGatewayEndpoint(cleanUser, cleanPass, `gateway/api/2.0/Classes/${meClassId}`).catch(() => null)
      resolvedClassName = formatClassLabel(
        classByIdRes?.Class || (Array.isArray(classByIdRes?.Classes) ? classByIdRes.Classes[0] : null)
      )
    }

    const schoolCandidate =
      schoolsRes?.School?.Name ||
      (Array.isArray(schoolsRes?.Schools) ? schoolsRes.Schools[0]?.Name : '') ||
      me.School?.Name ||
      ''
    const className = sanitizeAccountLabel(resolvedClassName)
    const schoolName = sanitizeAccountLabel(typeof schoolCandidate === 'string' ? schoolCandidate : '')

    const rawLucky = luckyRes?.LuckyNumber?.LuckyNumber
    const lucky = typeof rawLucky === 'number' ? rawLucky : null

    const rawClassNum =
      userInfo.ClassNumber ??
      me.ClassNumber ??
      accountInfo.ClassNumber ??
      userInfo.Number ??
      null
    const classNumber =
      rawClassNum !== null && !isNaN(Number(rawClassNum)) && Number(rawClassNum) > 0
        ? Number(rawClassNum)
        : null

    const role: 'student' | 'parent' = isStudentUsername(cleanUser) ? 'student' : 'parent'

    return {
      success: true,
      data: { fullName, className, schoolName, luckyNumber: lucky, classNumber, role }
    }
  } catch (error: unknown) {
    return { success: false, error: toErrorMessage(error) }
  }
}

/* === Justifications === */

export async function createJustificationAction(username: string, pass: string, payload: JustificationPayload) {
  if (isDemoAccount(username)) {
    return { success: true, data: { status: 'ok', message: 'Wniosek demonstracyjny został przyjęty.' }, error: undefined }
  }
  try {
    return await submitJustification(username, pass, payload)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getLiveJustificationsAction(
  username: string,
  pass: string,
  statusFilter: '0' | '1' | '2' | '3' = '0',
  translate: boolean | AppLanguage = false
) {
  const translateTarget = resolveActionTranslateTarget(translate)
  if (isDemoAccount(username)) {
    const items = getDemoLiveJustifications(statusFilter)
    return { success: true, data: translateTarget ? await translateLiveJustifications(items, true, translateTarget) : items }
  }
  try {
    return await fetchLiveJustificationsHistory(username, pass, statusFilter, '', '', translateTarget)
  } catch (error: unknown) {
    return { success: false, data: [], error: toErrorMessage(error) }
  }
}

/* === Messages & Attachments === */

export async function getMessagesAndAnnouncementsAction(
  username: string,
  pass: string,
  translate: boolean | AppLanguage = false
): Promise<MessagesActionResult> {
  const translateTarget = resolveActionTranslateTarget(translate)
  if (isDemoAccount(username)) {
    const bundle = getDemoMessagesBundle()
    return translateTarget ? await applyTranslatedMessagesBundle(bundle, translateTarget) : bundle
  }
  return fetchMessagesBundle(username, pass, translateTarget)
}

export async function getReceiversAction(username: string, pass: string) {
  if (isDemoAccount(username)) {
    return { success: true, receivers: getDemoReceivers() }
  }
  try {
    const list = await fetchReceiversOnly(username, pass)
    return { success: true, receivers: list }
  } catch (err: unknown) {
    return { success: false, receivers: [], error: toErrorMessage(err) }
  }
}

export async function readMessageAction(
  username: string,
  pass: string,
  messageId: number,
  folderId: number = 5,
  translate: boolean | AppLanguage = false
) {
  const translateTarget = resolveActionTranslateTarget(translate)
  if (isDemoAccount(username)) {
    const res = getDemoMessageContent(messageId)
    if (translateTarget && res.content) {
      return { ...res, content: await translateText(res.content, translateTarget) }
    }
    return res
  }
  try {
    return await fetchMessageContent(username, pass, messageId, folderId, translateTarget)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function downloadAttachmentAction(username: string, pass: string, filePath: string, fileName: string) {
  if (isDemoAccount(username)) {
    return { success: false, error: 'W trybie demonstracyjnym pobieranie załączników jest wyłączone' }
  }
  try {
    return await downloadMessageAttachment(username, pass, filePath, fileName)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function sendMessageAction(
  username: string,
  pass: string,
  receiverId: number | number[],
  title: string,
  body: string
) {
  if (isDemoAccount(username)) {
    return { success: true, message: 'Wiadomość demonstracyjna została wysłana' }
  }
  try {
    const ids = Array.isArray(receiverId) ? receiverId : [receiverId]
    if (ids.length === 0) {
      return { success: false, error: 'Brak odbiorców' }
    }
    return await sendMessageToUser(username, pass, ids, title, body)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/* === Diagnostics === */

interface DiagnosticItemResult {
  name: string
  category: string
  durationMs: number
  status: 'ok' | 'error'
  error?: string
  details?: string
}

interface DiagnosticsBundleResult {
  success: boolean
  timestamp: string
  totalDurationMs: number
  items: DiagnosticItemResult[]
  error?: string
}

export async function runDisplayDiagnosticsAction(
  username: string,
  pass: string,
  translate: boolean | AppLanguage = false
): Promise<DiagnosticsBundleResult> {
  const translateTarget = resolveActionTranslateTarget(translate)
  const cleanUser = String(username || '').trim()
  const cleanPass = String(pass || '').trim()
  if (!cleanUser || !cleanPass) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      totalDurationMs: 0,
      items: [],
      error: 'Brak danych logowania'
    }
  }

  if (isDemoAccount(cleanUser)) {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      totalDurationMs: 18,
      items: [
        { name: 'Profil i autoryzacja (Demo)', category: 'profile', durationMs: 2, status: 'ok', details: 'Aleksander Kowalski (4T)' },
        { name: 'Plan lekcji (Timetable)', category: 'timetable', durationMs: 4, status: 'ok', details: 'Dni: 5, Lekcji: 32' },
        { name: 'Oceny (Grades)', category: 'grades', durationMs: 3, status: 'ok', details: 'Przedmiotów: 10, Średnia: 4.97' },
        { name: 'Frekwencja (Attendance)', category: 'attendance', durationMs: 3, status: 'ok', details: 'Obecność: 96.8%, Nb: 8' },
        { name: 'Wiadomości i ogłoszenia', category: 'messages', durationMs: 3, status: 'ok', details: 'Wiadomości: 4, Ogłoszenia: 1' },
        { name: 'Statusy usprawiedliwień', category: 'justifications', durationMs: 3, status: 'ok', details: 'Wpisów: 3' }
      ]
    }
  }

  const overallStart = performance.now()
  const items: DiagnosticItemResult[] = []

  const testStep = async <T extends { success?: boolean; error?: string }>(
    name: string,
    category: string,
    fn: () => Promise<T>,
    extractDetails?: (data: T) => string
  ) => {
    const s = performance.now()
    try {
      const data = await fn()
      const durationMs = Math.round(performance.now() - s)
      const isOk = Boolean(data && data.success !== false)
      const errMsg = data?.error ? String(data.error) : undefined
      items.push({
        name,
        category,
        durationMs,
        status: isOk ? 'ok' : 'error',
        error: errMsg,
        details: extractDetails && isOk ? extractDetails(data) : undefined
      })
    } catch (err: unknown) {
      items.push({
        name,
        category,
        durationMs: Math.round(performance.now() - s),
        status: 'error',
        error: toErrorMessage(err)
      })
    }
  }

  await testStep(
    'Profil i autoryzacja (Gateway)',
    'profile',
    () => getStudentProfileAction(cleanUser, cleanPass),
    (d) => (d.data ? d.data.fullName + (d.data.className ? ' (' + d.data.className + ')' : '') : 'OK')
  )

  await testStep(
    'Plan lekcji (Timetable)',
    'timetable',
    () => fetchSmartTimetable(cleanUser, cleanPass, translateTarget),
    (d) =>
      d.data?.schedule
        ? 'Dni: ' + d.data.schedule.length + ', Lekcji: ' + d.data.schedule.reduce((acc, cur) => acc + (cur.lessons?.length || 0), 0)
        : 'OK'
  )

  await testStep(
    'Oceny (Grades)',
    'grades',
    () => fetchStudentGrades(cleanUser, cleanPass, translateTarget),
    (d) => (d.data?.subjects ? 'Przedmiotów: ' + d.data.subjects.length + ', Średnia: ' + (d.data.overallAverage ?? '—') : 'OK')
  )

  await testStep(
    'Frekwencja (Attendance)',
    'attendance',
    () => fetchAttendanceMetrics(cleanUser, cleanPass, translateTarget),
    (d) => (d.data ? 'Obecność: ' + d.data.overallPercentage + '%, Nb: ' + d.data.totalAbsent : 'OK')
  )

  await testStep(
    'Wiadomości i ogłoszenia',
    'messages',
    () => fetchMessagesBundle(cleanUser, cleanPass, translateTarget),
    (d) => 'Wiadomości: ' + (d.messages?.length || 0) + ', Ogłoszenia: ' + (d.announcements?.length || 0)
  )

  await testStep(
    'Statusy usprawiedliwień',
    'justifications',
    () => fetchLiveJustificationsHistory(cleanUser, cleanPass, '0', '', '', translateTarget),
    (d) => 'Wpisów: ' + (d.data?.length || 0)
  )

  return {
    success: true,
    timestamp: new Date().toISOString(),
    totalDurationMs: Math.round(performance.now() - overallStart),
    items
  }
}
