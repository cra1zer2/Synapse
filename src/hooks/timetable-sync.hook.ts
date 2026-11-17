/**
 * Hook: Dashboard Sync & Week Navigation
 * Coordinates concurrent loading, caching, and week-pivoted synchronization of timetable, grades, and attendance.
 * Uses race-condition request guards and Warsaw-timezone date normalization.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'
import { GradesResult } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'
import { AppLanguage, pickText, normalizeLanguage } from '@/config/dictionary.config'
import { syncAllUserDataAction } from '@/app/actions'
import { getTodayIsoString, getTodayDayName, normalizeToMondayIso, getSchoolWeekMondayIso } from '@/utils/date.util'
import { addRequestLog } from '@/utils/request-logger.util'

function getInitialWeekPivot(): string {
  return getSchoolWeekMondayIso(getTodayIsoString())
}

function recalibrateScheduleToday(schedule: DaySchedule[]): DaySchedule[] {
  const realTodayIso = getTodayIsoString()
  return schedule.map((d) => ({
    ...d,
    isToday: d.isoDate === realTodayIso
  }))
}

interface UseTimetableSyncOptions {
  username: string
  password: string
  lang: AppLanguage
  isConfigured: boolean
}

export function useTimetableSync({ username, password, lang, isConfigured }: UseTimetableSyncOptions) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoadingWeek, setIsLoadingWeek] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [currentWeekPivot, setCurrentWeekPivot] = useState(getInitialWeekPivot)

  const [timetableData, setTimetableData] = useState<SmartTimetableResult | null>(null)
  const [todayTimetableData, setTodayTimetableData] = useState<SmartTimetableResult | null>(null)
  const [gradesData, setGradesData] = useState<GradesResult | null>(null)
  const [attendanceData, setAttendanceData] = useState<AttendanceResult | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>(getTodayDayName)

  const [timetableError, setTimetableError] = useState<string | null>(null)
  const [gradesError, setGradesError] = useState<string | null>(null)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)

  const weekCacheRef = useRef<Record<string, SmartTimetableResult>>({})
  const activeRequestCounter = useRef(0)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastUsernameRef = useRef<string>('')
  const pivotRef = useRef<string>(currentWeekPivot)

  useEffect(() => {
    pivotRef.current = currentWeekPivot
  }, [currentWeekPivot])

  const executeSync = useCallback(
    async (u: string, p: string, currentAppLang: AppLanguage, rawPivot: string, silentUpdate: boolean) => {
      const weekPivot = normalizeToMondayIso(rawPivot)
      const currentSchoolWeekMonday = getSchoolWeekMondayIso(getTodayIsoString())
      const isTargetTodayWeek = weekPivot === currentSchoolWeekMonday
      const requestId = ++activeRequestCounter.current

      if (!silentUpdate) {
        setIsLoadingWeek(true)
      }
      setIsUpdating(true)
      setTimetableError(null)
      setGradesError(null)
      setAttendanceError(null)

      const clientStart = performance.now()
      try {
        const res = await syncAllUserDataAction(u, p, currentAppLang, weekPivot)
        const clientDurationMs = Math.round(performance.now() - clientStart)

        addRequestLog({
          name: pickText(currentAppLang, {
            pl: 'Główna synchronizacja (Plan, Oceny, Frekwencja)',
            en: 'Main Sync (Schedule, Grades, Attendance)'
          }),
          clientDurationMs,
          serverDurationMs: res.serverTimings?.totalMs,
          breakdown: res.serverTimings
            ? {
                [pickText(currentAppLang, { pl: 'Plan lekcji', en: 'Timetable' })]: res.serverTimings.timetableMs,
                [pickText(currentAppLang, { pl: 'Oceny', en: 'Grades' })]: res.serverTimings.gradesMs,
                [pickText(currentAppLang, { pl: 'Frekwencja', en: 'Attendance' })]: res.serverTimings.attendanceMs
              }
            : undefined,
          status: res.success ? 'ok' : 'error',
          error: res.error,
          details: `${pickText(currentAppLang, { pl: 'Tydzień', en: 'Week' })}: ${weekPivot}`
        })

        if (requestId !== activeRequestCounter.current) return

        const fallbackConnectionError = pickText(currentAppLang, {
          pl: 'Błąd połączenia',
          en: 'Connection error'
        })

        if (!res.success) {
          setTimetableError(res.error || fallbackConnectionError)
          setGradesError(res.error || fallbackConnectionError)
          setAttendanceError(res.error || fallbackConnectionError)
          return
        }

        const tRes = res.timetable
        const gRes = res.grades
        const aRes = res.attendance

        if (aRes?.success && 'data' in aRes && aRes.data) {
          setAttendanceData(aRes.data)
          setAttendanceError(null)
        } else if (aRes && !aRes.success) {
          setAttendanceError(
            aRes.error || pickText(currentAppLang, { pl: 'Błąd ładowania frekwencji', en: 'Failed to load attendance' })
          )
        }

        if (gRes?.success && 'data' in gRes && gRes.data) {
          setGradesData(gRes.data)
          setGradesError(null)
        } else if (gRes && !gRes.success) {
          setGradesError(
            gRes.error || pickText(currentAppLang, { pl: 'Błąd ładowania ocen', en: 'Failed to load grades' })
          )
        }

        if (tRes?.success && 'data' in tRes && tRes.data) {
          const recalibratedSchedule = recalibrateScheduleToday(tRes.data.schedule)
          const fetchedData: SmartTimetableResult = {
            ...tRes.data,
            schedule: recalibratedSchedule
          }
          weekCacheRef.current[`${u}_${currentAppLang}_${weekPivot}`] = fetchedData
          if (isTargetTodayWeek) {
            setTodayTimetableData(fetchedData)
          }
          setTimetableData(fetchedData)
          setTimetableError(null)
        } else if (tRes && !tRes.success) {
          setTimetableError(
            tRes.error || pickText(currentAppLang, { pl: 'Błąd ładowania planu lekcji', en: 'Failed to load schedule' })
          )
        }

        if (typeof window !== 'undefined' && isTargetTodayWeek && (tRes?.data || gRes?.data || aRes?.data)) {
          const syncedAt = Date.now()
          setLastSyncedAt(syncedAt)
          localStorage.setItem(
            `synapse_cache_${u}`,
            JSON.stringify({
              t: tRes?.data,
              g: gRes?.data,
              a: aRes?.data,
              lang: currentAppLang,
              lastSyncedAt: syncedAt
            })
          )
        }
      } finally {
        if (requestId === activeRequestCounter.current) {
          setIsLoadingWeek(false)
          setIsUpdating(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    if (!isConfigured || !username || !password) {
      activeRequestCounter.current++
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      lastUsernameRef.current = ''
      weekCacheRef.current = {}
      setTimetableData(null)
      setTodayTimetableData(null)
      setGradesData(null)
      setAttendanceData(null)
      setTimetableError(null)
      setGradesError(null)
      setAttendanceError(null)
      setLastSyncedAt(null)
      setIsUpdating(false)
      setIsLoadingWeek(false)
      return
    }

    let hasWarmCache = false
    const isAccountSwitch = lastUsernameRef.current !== username
    lastUsernameRef.current = username

    const targetMonday = getSchoolWeekMondayIso(getTodayIsoString())
    if (isAccountSwitch) {
      setCurrentWeekPivot(targetMonday)
      pivotRef.current = targetMonday
    }

    if (typeof window !== 'undefined') {
      const cachedSnapshot = localStorage.getItem(`synapse_cache_${username}`)
      if (cachedSnapshot) {
        try {
          const parsed = JSON.parse(cachedSnapshot)
          const cachedWeekMonday = parsed.t?.weekStart ? normalizeToMondayIso(parsed.t.weekStart) : null
          const cachedLang = normalizeLanguage(parsed.lang)
          if (parsed.t && Array.isArray(parsed.t.schedule) && (!cachedWeekMonday || cachedWeekMonday === targetMonday)) {
            const cal = { ...parsed.t, schedule: recalibrateScheduleToday(parsed.t.schedule) }
            setTimetableData(cal)
            setTodayTimetableData(cal)
            weekCacheRef.current[`${username}_${cachedLang}_${targetMonday}`] = cal
            hasWarmCache = true
          } else if (isAccountSwitch) {
            setTimetableData(null)
            setTodayTimetableData(null)
          }
          if (parsed.g) setGradesData(parsed.g)
          else if (isAccountSwitch) setGradesData(null)

          if (parsed.a) setAttendanceData(parsed.a)
          else if (isAccountSwitch) setAttendanceData(null)

          if (typeof parsed.lastSyncedAt === 'number') setLastSyncedAt(parsed.lastSyncedAt)
          else if (isAccountSwitch) setLastSyncedAt(null)

          if (parsed.lang && parsed.lang !== lang) {
            hasWarmCache = true
          }
        } catch {
          if (isAccountSwitch) {
            setTimetableData(null)
            setTodayTimetableData(null)
            setGradesData(null)
            setAttendanceData(null)
          }
        }
      } else if (isAccountSwitch) {
        setTimetableData(null)
        setTodayTimetableData(null)
        setGradesData(null)
        setAttendanceData(null)
      }
    }

    const normalizedPivot = normalizeToMondayIso(pivotRef.current)
    executeSync(username, password, lang, normalizedPivot, hasWarmCache)
  }, [isConfigured, username, password, lang, executeSync])

  const queueWeekChange = (targetDateIso: string) => {
    const mondayPivot = normalizeToMondayIso(targetDateIso)
    setCurrentWeekPivot(mondayPivot)
    pivotRef.current = mondayPivot

    const cachedWeek = weekCacheRef.current[`${username}_${lang}_${mondayPivot}`]
    if (cachedWeek) {
      setTimetableData(cachedWeek)
      setIsLoadingWeek(false)
    } else {
      setIsLoadingWeek(true)
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      if (username && password) {
        executeSync(username, password, lang, mondayPivot, Boolean(cachedWeek))
      }
    }, 80)
  }

  const shiftWeek = (deltaDays: number) => {
    const [y, m, d] = currentWeekPivot.split('-').map(Number)
    const next = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + deltaDays))
    queueWeekChange(next.toISOString().split('T')[0])
  }

  return {
    isUpdating,
    isLoadingWeek,
    lastSyncedAt,
    currentWeekPivot,
    timetableData,
    todayTimetableData,
    gradesData,
    attendanceData,
    timetableError,
    gradesError,
    attendanceError,
    selectedDay,
    setSelectedDay,
    queueWeekChange,
    shiftWeek,
    executeSync
  }
}
