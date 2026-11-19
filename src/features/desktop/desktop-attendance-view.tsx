'use client'

import React, { useMemo, useState, useEffect } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Send
} from 'lucide-react'
import {
  AbsenceDetail,
  AttendanceResult,
  LegacyAttendanceDay,
  SubjectAttendance
} from '@/models/attendance.model'
import { LiveJustificationItem } from '@/models/justification.model'
import { SmartTimetableResult, LessonItem } from '@/models/timetable.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { formatSubjectName, formatPolishPlural } from '@/utils/text.util'
import { formatDayDate, formatHumanDate, getDatesList, getTodayIsoString } from '@/utils/date.util'
import { getAttendanceTypeStyle, getJustificationStatusMeta } from '@/utils/badge.util'
import {
  PendingJustificationRecord,
  getPendingJustifications,
  isLessonJustificationPending,
  reconcilePendingJustifications,
  savePendingJustification
} from '@/utils/justification.util'
import { UiSpinner } from '@/components/ui/ui-spinner'
import { cn } from '@/utils/cn.util'
import { MacGroupBox, MacPushButton, MacSegmentedControl } from './mac-primitives'

export type DesktopAttendanceSubTab = 'summary' | 'journal' | 'justifications'

interface DesktopAttendanceViewProps {
  attendanceData: AttendanceResult | null
  attendanceError: string | null
  onRetry: () => void
  timetableData: SmartTimetableResult | null
  showFullSubjectNames: boolean
  isStudent: boolean
  canSubmitExcuse: boolean
  liveJustifications: LiveJustificationItem[]
  isLoadingLiveJustifications: boolean
  liveJustificationsFilter: '0' | '1' | '2' | '3'
  onChangeLiveFilter: (filter: '0' | '1' | '2' | '3') => void
  onLoadLiveJustifications: (filter?: '0' | '1' | '2' | '3') => void
  onSubmitJustification: (payload: {
    dateFrom: string
    dateTo: string
    lessons: number[]
    message: string
  }) => Promise<{ ok: boolean; error?: string }>
  subTab: DesktopAttendanceSubTab
  lang: AppLanguage
  t: AppDictionary
}

type ExcuseModeTab = 'nb' | 'range' | 'hours'

export function DesktopAttendanceView({
  attendanceData,
  attendanceError,
  onRetry,
  timetableData,
  showFullSubjectNames,
  isStudent,
  canSubmitExcuse,
  liveJustifications,
  isLoadingLiveJustifications,
  liveJustificationsFilter,
  onChangeLiveFilter,
  onLoadLiveJustifications,
  onSubmitJustification,
  subTab: requestedSubTab,
  lang,
  t
}: DesktopAttendanceViewProps) {
  const [selectedSubject, setSelectedSubject] = useState<SubjectAttendance | null>(null)
  const [selectedJournalDay, setSelectedJournalDay] = useState<LegacyAttendanceDay | null>(null)
  const [pendingList, setPendingList] = useState<PendingJustificationRecord[]>([])

  // Composer state
  const todayIso = useMemo(() => getTodayIsoString(), [])
  const [excuseTab, setExcuseTab] = useState<ExcuseModeTab>('nb')
  const [parentMessage, setParentMessage] = useState('')
  const [selectedNbMap, setSelectedNbMap] = useState<Record<string, boolean>>({})
  const [dateFrom, setDateFrom] = useState(todayIso)
  const [dateTo, setDateTo] = useState(todayIso)
  const [selectedDayIso, setSelectedDayIso] = useState(todayIso)
  const [selectedHoursMap, setSelectedHoursMap] = useState<Record<number, boolean>>({})
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [submitFailures, setSubmitFailures] = useState<Array<{ date: string; error: string }>>([])

  const allowExcuse = canSubmitExcuse !== undefined ? canSubmitExcuse : !isStudent
  const subTab: DesktopAttendanceSubTab =
    !allowExcuse && requestedSubTab === 'justifications' ? 'summary' : requestedSubTab

  useEffect(() => {
    if (attendanceData?.subjects) {
      setPendingList(reconcilePendingJustifications(attendanceData.subjects))
    }
  }, [attendanceData?.subjects])

  // Fetch live justifications automatically when switching to the justifications tab
  useEffect(() => {
    if (subTab === 'justifications' && allowExcuse && liveJustifications.length === 0 && !isLoadingLiveJustifications) {
      onLoadLiveJustifications(liveJustificationsFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, allowExcuse])

  const sortedSubjects = useMemo(() => {
    if (!attendanceData?.subjects) return []
    return [...attendanceData.subjects].sort((a, b) => {
      if (a.unexcusedCount > 0 && b.unexcusedCount === 0) return -1
      if (b.unexcusedCount > 0 && a.unexcusedCount === 0) return 1
      if (a.percentage !== b.percentage) return a.percentage - b.percentage
      return a.subject.localeCompare(b.subject)
    })
  }, [attendanceData?.subjects])

  useEffect(() => {
    if (!selectedSubject && sortedSubjects.length > 0) {
      setSelectedSubject(sortedSubjects[0])
    } else if (selectedSubject && sortedSubjects.length > 0) {
      const refreshed = sortedSubjects.find((s) => s.subject === selectedSubject.subject)
      if (refreshed) setSelectedSubject(refreshed)
    }
  }, [sortedSubjects, selectedSubject])

  // Journal data normalization
  const journalDays: LegacyAttendanceDay[] = useMemo(() => {
    if (!attendanceData) return []
    if (attendanceData.legacyTable?.days && attendanceData.legacyTable.days.length > 0) {
      return attendanceData.legacyTable.days.filter((day) =>
        Object.values(day.lessons || {}).some((l) => l.type !== 'ob')
      )
    }
    const dayMap: Record<string, LegacyAttendanceDay> = {}
    attendanceData.subjects.forEach((sub) => {
      sub.absences.forEach((abs) => {
        const d = abs.date
        if (!dayMap[d]) {
          const iso = d.includes('.') ? d.split('.').reverse().join('-') : d
          dayMap[d] = {
            date: d,
            isoDate: iso,
            weekday: '',
            lessons: {},
            uCount: 0,
            nuCount: 0,
            totalCount: 0,
            spCount: 0,
            zwCount: 0,
            slCount: 0
          }
        }
        const sym = abs.type.toLowerCase() as 'nb' | 'u' | 'sp' | 'zw' | 'sl'
        dayMap[d].lessons[abs.lessonNumber] = {
          symbol: sym === 'sl' ? 'sL' : sym.toUpperCase(),
          type: sym
        }
        if (sym === 'sl') {
          dayMap[d].slCount++
          dayMap[d].nuCount++
          dayMap[d].totalCount++
        } else if (abs.isUnexcused) {
          dayMap[d].nuCount++
          dayMap[d].totalCount++
        } else if (sym === 'u') {
          dayMap[d].uCount++
          dayMap[d].totalCount++
        } else if (sym === 'sp') {
          dayMap[d].spCount++
        } else if (sym === 'zw') {
          dayMap[d].zwCount++
        }
      })
    })
    return Object.values(dayMap).sort((a, b) => b.isoDate.localeCompare(a.isoDate))
  }, [attendanceData])

  useEffect(() => {
    if (!selectedJournalDay && journalDays.length > 0) {
      setSelectedJournalDay(journalDays[0])
    }
  }, [journalDays, selectedJournalDay])

  const journalSummary = useMemo(() => {
    if (attendanceData?.legacyTable?.summary) return attendanceData.legacyTable.summary
    return {
      u: journalDays.reduce((a, d) => a + d.uCount, 0),
      nu: journalDays.reduce((a, d) => a + d.nuCount, 0),
      total: journalDays.reduce((a, d) => a + d.totalCount, 0),
      sp: journalDays.reduce((a, d) => a + d.spCount, 0),
      zw: journalDays.reduce((a, d) => a + d.zwCount, 0),
      sl: journalDays.reduce((a, d) => a + (d.slCount || 0), 0)
    }
  }, [attendanceData, journalDays])

  const lessonCols = useMemo(() => {
    let minCol = 1
    let maxCol = 8
    for (const d of journalDays) {
      for (const [k, l] of Object.entries(d.lessons)) {
        if (!l || l.type === 'ob') continue
        const n = Number(k)
        if (!isNaN(n)) {
          if (n < minCol) minCol = n
          if (n > maxCol) maxCol = n
        }
      }
    }
    const cols: number[] = []
    for (let i = minCol; i <= Math.min(maxCol, 10); i++) cols.push(i)
    return cols
  }, [journalDays])

  // Composer helpers
  const groupedNbDays = useMemo(() => {
    if (!attendanceData) return []
    const map: Record<string, { date: string; isoDate: string; lessons: AbsenceDetail[] }> = {}
    attendanceData.unexcusedAbsences.forEach((abs) => {
      if (!map[abs.date]) {
        const iso = abs.date.includes('.') ? abs.date.split('.').reverse().join('-') : abs.date
        map[abs.date] = { date: abs.date, isoDate: iso, lessons: [] }
      }
      map[abs.date].lessons.push(abs)
    })
    return Object.values(map).map((g) => {
      g.lessons.sort((a, b) => a.lessonNumber - b.lessonNumber)
      return g
    })
  }, [attendanceData])

  useEffect(() => {
    const initial: Record<string, boolean> = {}
    groupedNbDays.forEach((g) => {
      g.lessons.forEach((abs) => {
        if (!isLessonJustificationPending(pendingList, g.isoDate, abs.date, abs.lessonNumber)) {
          initial[`${abs.date}_${abs.lessonNumber}`] = true
        }
      })
    })
    setSelectedNbMap(initial)
  }, [groupedNbDays, pendingList])

  const selectedNbCount = useMemo(() => {
    return Object.entries(selectedNbMap).filter(([k, checked]) => {
      if (!checked) return false
      const [date, numStr] = k.split('_')
      const g = groupedNbDays.find((x) => x.date === date)
      if (!g) return false
      return !isLessonJustificationPending(pendingList, g.isoDate, date, Number(numStr))
    }).length
  }, [selectedNbMap, groupedNbDays, pendingList])

  const rangePlan = useMemo(() => {
    if (!attendanceData || excuseTab !== 'range') return { days: [] as Array<{ dateIso: string; dateDisplay: string; lessons: number[] }>, totalLessons: 0 }
    const dates = getDatesList(dateFrom, dateTo)
    const days: Array<{ dateIso: string; dateDisplay: string; lessons: number[] }> = []
    let total = 0
    dates.forEach((dIso) => {
      const dDisplay = dIso.split('-').reverse().join('.')
      const matched: AbsenceDetail[] = []
      attendanceData.subjects.forEach((sub) => {
        sub.absences.forEach((a) => {
          const aIso = a.date.includes('.') ? a.date.split('.').reverse().join('-') : a.date
          if ((aIso === dIso || a.date === dDisplay) && a.isUnexcused) matched.push(a)
        })
      })
      let lessonNums: number[] = []
      if (matched.length > 0) {
        lessonNums = matched.map((a) => a.lessonNumber).filter((n) => !isLessonJustificationPending(pendingList, dIso, dDisplay, n))
      } else {
        const matchedDay = timetableData?.schedule.find((s) => s.isoDate === dIso)
        const cands = matchedDay?.lessons?.length ? matchedDay.lessons.map((l) => l.number) : [1, 2, 3, 4, 5, 6, 7]
        lessonNums = cands.filter((n) => !isLessonJustificationPending(pendingList, dIso, dDisplay, n))
      }
      if (lessonNums.length > 0) {
        days.push({ dateIso: dIso, dateDisplay: dDisplay, lessons: lessonNums })
        total += lessonNums.length
      }
    })
    return { days, totalLessons: total }
  }, [excuseTab, dateFrom, dateTo, attendanceData, timetableData, pendingList])

  const dayLessonsForHours = useMemo(() => {
    const matched = timetableData?.schedule.find((d) => d.isoDate === selectedDayIso)
    if (matched?.lessons?.length) return matched.lessons
    return Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      subject: t.lessonNumberLabel(i + 1),
      time: '',
      room: '',
      teacher: '',
      isCancelled: false,
      isSubstitution: false,
      isShortened: false,
      durationMinutes: 45,
      flag: null,
      teacherAbsent: false
    })) as LessonItem[]
  }, [timetableData, selectedDayIso, t])

  const selectedHoursList = useMemo(
    () => Object.entries(selectedHoursMap).filter(([, c]) => c).map(([n]) => Number(n)).sort((a, b) => a - b),
    [selectedHoursMap]
  )

  const handleSubmitExcuse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allowExcuse || submitState === 'submitting') return
    setSubmitState('submitting')
    setSubmitFailures([])
    const failed: Array<{ date: string; error: string }> = []

    const runDay = async (dateIso: string, dateDisplay: string, lessons: number[]) => {
      const { ok, error } = await onSubmitJustification({
        dateFrom: dateIso,
        dateTo: dateIso,
        lessons,
        message: parentMessage
      })
      if (ok) {
        savePendingJustification({ dateIso, dateDisplay, lessons, message: parentMessage })
      } else {
        failed.push({ date: dateDisplay, error: error || 'Error' })
      }
    }

    if (excuseTab === 'nb') {
      for (const g of groupedNbDays) {
        const list = g.lessons
          .filter((l) => !isLessonJustificationPending(pendingList, g.isoDate, g.date, l.lessonNumber) && selectedNbMap[`${g.date}_${l.lessonNumber}`])
          .map((l) => l.lessonNumber)
        if (list.length > 0) await runDay(g.isoDate, g.date, list)
      }
    } else if (excuseTab === 'range') {
      for (const d of rangePlan.days) {
        await runDay(d.dateIso, d.dateDisplay, d.lessons)
      }
    } else if (selectedHoursList.length > 0) {
      await runDay(selectedDayIso, selectedDayIso.split('-').reverse().join('.'), selectedHoursList)
    }

    setSubmitFailures(failed)
    setPendingList(getPendingJustifications())
    setSubmitState('done')
    onLoadLiveJustifications(liveJustificationsFilter)
  }

  if (attendanceError && !attendanceData) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-[var(--mac-red)]" />
        <p className="text-[14px] font-medium text-[var(--mac-label-1)]">{attendanceError}</p>
        <MacPushButton variant="prominent" size="lg" onClick={onRetry}>
          {t.refresh}
        </MacPushButton>
      </div>
    )
  }

  if (!attendanceData) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <UiSpinner size="large" className="text-[var(--mac-blue)]" />
        <span className="text-[13px] text-[var(--mac-label-2)]">{t.loadingTimetable}</span>
      </div>
    )
  }

  const barBg =
    attendanceData.overallStatus === 'danger'
      ? 'bg-[var(--mac-red)]'
      : attendanceData.overallStatus === 'warning'
        ? 'bg-[var(--mac-orange)]'
        : 'bg-[var(--mac-green)]'

  return (
    <div className="h-full flex flex-col min-h-0 select-none">
      {/* TAB 1: SUMMARY SPLIT VIEW (mode switched in left sidebar) */}
      {subTab === 'summary' && (
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 overflow-y-auto p-5 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3 items-stretch">
              <MacGroupBox
                className="h-full"
                contentClassName="h-full flex flex-col justify-between min-h-[92px]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)] truncate">
                  {t.attendanceRate}
                </div>
                <div className="mt-1">
                  <div className="text-[26px] font-bold text-[var(--mac-label-1)] tabular-nums leading-tight">
                    {attendanceData.overallPercentage}%
                  </div>
                  <div className="w-full h-[5px] rounded-full bg-[var(--mac-fill-2)] mt-2 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', barBg)}
                      style={{ width: `${Math.min(Math.max(attendanceData.overallPercentage, 0), 100)}%` }}
                    />
                  </div>
                </div>
              </MacGroupBox>
              <MacGroupBox
                className="h-full"
                contentClassName="h-full flex flex-col justify-between min-h-[92px]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)] truncate">
                  {pickText(lang, { pl: 'Opuszczone / Wszystkie', en: 'Missed / Scheduled' })}
                </div>
                <div className="text-[26px] font-bold text-[var(--mac-label-1)] mt-1 tabular-nums leading-tight">
                  {attendanceData.totalAbsent}{' '}
                  <span className="text-[15px] font-medium text-[var(--mac-label-2)]">
                    / {attendanceData.totalScheduled}
                  </span>
                </div>
              </MacGroupBox>
              <MacGroupBox
                className="h-full"
                contentClassName="h-full flex flex-col justify-between min-h-[92px]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)] truncate">
                  {pickText(lang, { pl: 'Nieusprawiedliwione', en: 'Unexcused Absences' })}
                </div>
                <div
                  className={cn(
                    'text-[26px] font-bold mt-1 tabular-nums leading-tight',
                    attendanceData.unexcusedAbsences.length > 0 ? 'text-[var(--mac-red)]' : 'text-[var(--mac-green)]'
                  )}
                >
                  {attendanceData.unexcusedAbsences.length} nb
                </div>
              </MacGroupBox>
            </div>

            <MacGroupBox title={t.subjectsSection} noPadding>
              <div className="mac-divide-y">
                {sortedSubjects.map((sub) => {
                  const isSel = selectedSubject?.subject === sub.subject
                  const activeNb = sub.absences.filter((a) => {
                    const aIso = a.date.includes('.') ? a.date.split('.').reverse().join('-') : a.date
                    return a.isUnexcused && !isLessonJustificationPending(pendingList, aIso, a.date, a.lessonNumber)
                  }).length
                  const isDanger = sub.percentage < 50
                  return (
                    <button
                      key={sub.subject}
                      type="button"
                      onClick={() => setSelectedSubject(sub)}
                      className={cn(
                        'w-full px-4 py-3 flex items-center justify-between gap-4 text-left cursor-pointer transition-colors',
                        isSel ? 'bg-[var(--ios-blue-subtle)]/45' : 'hover:bg-[var(--mac-fill-4)]'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span className="text-[13px] font-semibold text-[var(--mac-label-1)] leading-snug">
                            {formatSubjectName(sub.subject, showFullSubjectNames)}
                          </span>
                          {activeNb > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--ios-red-subtle)] text-[var(--mac-red)] text-[10px] font-semibold tabular-nums shrink-0 whitespace-nowrap mt-0.5">
                              {activeNb} nb
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--mac-label-2)] mt-0.5 tabular-nums">
                          {t.missedLessonsCount(sub.absentLessons)} {t.ofScheduled(sub.totalLessons)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24 h-[5px] rounded-full bg-[var(--mac-fill-2)] overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', isDanger ? 'bg-[var(--mac-red)]' : 'bg-[var(--mac-green)]')}
                            style={{ width: `${Math.min(Math.max(sub.percentage, 0), 100)}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            'w-12 text-right text-[14px] font-semibold tabular-nums',
                            isDanger ? 'text-[var(--mac-red)]' : 'text-[var(--mac-label-1)]'
                          )}
                        >
                          {sub.percentage}%
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </MacGroupBox>
          </div>

          <aside className="w-[340px] shrink-0 border-l border-[var(--mac-row-divider)] bg-[var(--mac-canvas-bg)] p-4 overflow-y-auto flex flex-col gap-3.5">
            {selectedSubject ? (
              <>
                <MacGroupBox contentClassName="p-4 flex flex-col gap-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-blue)]">
                    {t.subjectAttendance}
                  </div>
                  <h3 className="text-[16px] font-bold text-[var(--mac-label-1)] leading-snug mt-0.5">
                    {formatSubjectName(selectedSubject.subject, showFullSubjectNames)}
                  </h3>
                  <div className="text-[12px] text-[var(--mac-label-2)] mt-0.5 tabular-nums">
                    {selectedSubject.percentage}% · {t.missedLessonsCount(selectedSubject.absentLessons)}{' '}
                    {t.ofScheduled(selectedSubject.totalLessons)}
                  </div>
                </MacGroupBox>

                <MacGroupBox title={t.recordedAbsencesTitle} noPadding>
                  {selectedSubject.absences.length > 0 ? (
                    <div className="mac-divide-y">
                      {selectedSubject.absences.map((item, idx) => {
                        const iso = item.date.includes('.') ? item.date.split('.').reverse().join('-') : item.date
                        const isPend = isLessonJustificationPending(pendingList, iso, item.date, item.lessonNumber)
                        const st = getAttendanceTypeStyle(item.type)
                        return (
                          <div key={`${item.date}-${item.lessonNumber}-${idx}`} className="px-3.5 py-2.5 flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-semibold text-[var(--mac-label-1)] tabular-nums">
                                {item.date} · {t.lessonNumberLabel(item.lessonNumber)}
                              </span>
                              {isPend ? (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)] text-[10px] font-semibold">
                                  {t.pendingJustification}
                                </span>
                              ) : (
                                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase', st.bgClass, st.textClass)}>
                                  {item.type}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[var(--mac-label-2)]">
                              <span className="truncate">{item.typeName}</span>
                              {item.teacher && <span className="shrink-0">{item.teacher}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-[12px] text-[var(--mac-label-2)]">{t.noAbsencesRecorded}</div>
                  )}
                </MacGroupBox>
              </>
            ) : (
              <div className="py-16 text-center text-[12px] text-[var(--mac-label-2)]">{t.noAbsencesRecorded}</div>
            )}
          </aside>
        </div>
      )}

      {/* TAB 2: CHRONOLOGICAL JOURNAL MATRIX */}
      {subTab === 'journal' && (
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 overflow-y-auto p-5 flex flex-col gap-4">
            <div className="grid grid-cols-5 gap-2.5">
              {[
                { label: pickText(lang, { pl: 'Nieusp. (nb)', en: 'Unexc. (nb)' }), val: journalSummary.nu, tone: 'text-[var(--mac-red)]' },
                { label: pickText(lang, { pl: 'Uspraw. (u)', en: 'Excused (u)' }), val: journalSummary.u, tone: 'text-[var(--mac-green)]' },
                { label: pickText(lang, { pl: 'Spóźn. (sp)', en: 'Late (sp)' }), val: journalSummary.sp, tone: 'text-[var(--mac-orange)]' },
                { label: pickText(lang, { pl: 'Zwoln. (zw)', en: 'Dismiss. (zw)' }), val: journalSummary.zw, tone: 'text-[var(--mac-purple)]' },
                { label: pickText(lang, { pl: 'Razem', en: 'Total' }), val: journalSummary.total, tone: 'text-[var(--mac-label-1)]' }
              ].map((stat) => (
                <MacGroupBox key={stat.label}>
                  <div className="text-[11px] font-semibold uppercase text-[var(--mac-label-2)] truncate">{stat.label}</div>
                  <div className={cn('text-[20px] font-bold tabular-nums mt-0.5', stat.tone)}>{stat.val}</div>
                </MacGroupBox>
              ))}
            </div>

            <MacGroupBox noPadding>
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--mac-row-divider)] bg-[var(--mac-fill-5)] text-[11px] font-semibold uppercase text-[var(--mac-label-2)]">
                      <th className="py-2.5 px-4">{t.dateLabel}</th>
                      {lessonCols.map((col) => (
                        <th key={col} className="py-2.5 px-2 text-center w-[42px] tabular-nums">
                          {col}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-right">nb / u</th>
                    </tr>
                  </thead>
                  <tbody className="mac-divide-y">
                    {journalDays.map((day) => {
                      const isSel = selectedJournalDay?.date === day.date
                      const meta = formatDayDate(day.isoDate, lang)
                      return (
                        <tr
                          key={day.date}
                          onClick={() => setSelectedJournalDay(day)}
                          className={cn(
                            'cursor-pointer transition-colors',
                            isSel ? 'bg-[var(--ios-blue-subtle)]/40' : 'hover:bg-[var(--mac-fill-4)]'
                          )}
                        >
                          <td className="py-2.5 px-4 text-[12px] font-medium text-[var(--mac-label-1)] tabular-nums">
                            {day.date}{' '}
                            <span className="text-[11px] text-[var(--mac-label-2)] ml-1">{meta.weekday}</span>
                          </td>
                          {lessonCols.map((col) => {
                            const cell = day.lessons[col]
                            if (!cell || cell.type === 'ob') {
                              return (
                                <td key={col} className="py-2 px-1 text-center text-[11px] text-[var(--mac-label-3)]">
                                  ·
                                </td>
                              )
                            }
                            const st = getAttendanceTypeStyle(cell.type)
                            return (
                              <td key={col} className="py-2 px-1 text-center">
                                <span
                                  className={cn(
                                    'inline-flex items-center justify-center min-w-[26px] h-[22px] px-1 rounded-[5px] text-[11px] font-semibold',
                                    st.bgClass,
                                    st.textClass
                                  )}
                                >
                                  {cell.symbol}
                                </span>
                              </td>
                            )
                          })}
                          <td className="py-2.5 px-3 text-right text-[12px] font-semibold tabular-nums">
                            <span className="text-[var(--mac-red)]">{day.nuCount}</span>
                            <span className="text-[var(--mac-label-3)] mx-1">/</span>
                            <span className="text-[var(--mac-green)]">{day.uCount}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </MacGroupBox>
          </div>

          <aside className="w-[320px] shrink-0 border-l border-[var(--mac-row-divider)] bg-[var(--mac-window-bg)] p-4 overflow-y-auto">
            {selectedJournalDay ? (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-[var(--mac-blue)]">
                    {pickText(lang, { pl: 'Szczegóły dnia', en: 'Day Breakdown' })}
                  </div>
                  <h3 className="text-[16px] font-bold text-[var(--mac-label-1)] mt-0.5 tabular-nums">
                    {selectedJournalDay.date}
                  </h3>
                </div>
                <MacGroupBox noPadding>
                  <div className="mac-divide-y">
                    {Object.entries(selectedJournalDay.lessons)
                      .filter(([, l]) => l && l.type !== 'ob')
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([num, l]) => {
                        const lessonNum = Number(num)
                        const st = getAttendanceTypeStyle(l.type)
                        const matchedAbsence = (attendanceData?.subjects || [])
                          .flatMap((s) => s.absences)
                          .find(
                            (a) =>
                              (a.date === selectedJournalDay.date ||
                                a.date === selectedJournalDay.isoDate) &&
                              a.lessonNumber === lessonNum
                          )
                        const resolvedSubject = l.subject || matchedAbsence?.subject
                        const resolvedTeacher = l.teacher || matchedAbsence?.teacher
                        return (
                          <div key={num} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-[12px]">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[var(--mac-label-1)] leading-snug truncate">
                                {resolvedSubject
                                  ? `${lessonNum}. ${formatSubjectName(resolvedSubject, showFullSubjectNames)}`
                                  : t.lessonNumberLabel(lessonNum)}
                              </div>
                              {resolvedTeacher && (
                                <div className="text-[11px] text-[var(--mac-label-2)] truncate">
                                  {resolvedTeacher}
                                </div>
                              )}
                            </div>
                            <span className={cn('px-2 py-0.5 rounded-[5px] text-[11px] font-semibold shrink-0', st.bgClass, st.textClass)}>
                              {l.symbol}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </MacGroupBox>
              </div>
            ) : (
              <div className="py-16 text-center text-[12px] text-[var(--mac-label-2)]">{t.noAbsencesRecorded}</div>
            )}
          </aside>
        </div>
      )}

      {/* TAB 3: JUSTIFICATIONS COMPOSER + LIVE LIBRUS STATUSES */}
      {subTab === 'justifications' && allowExcuse && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 overflow-hidden bg-[var(--mac-canvas-bg)]">
          {/* Left 5 cols: Justification Composer */}
          <div className="lg:col-span-5 overflow-y-auto flex flex-col gap-3.5 pr-1">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--mac-label-1)]">
                {pickText(lang, { pl: 'Wyślij usprawiedliwienie', en: 'Submit Justification' })}
              </h3>
              <p className="text-[12px] text-[var(--mac-label-2)] mt-0.5">
                {pickText(lang, {
                  pl: 'Wybierz nieobecności, zakres dni lub pojedyncze godziny lekcyjne.',
                  en: 'Select unexcused absences, a date range, or specific periods.'
                })}
              </p>
            </div>

            <MacSegmentedControl<ExcuseModeTab>
              value={excuseTab}
              onChange={(m) => {
                setExcuseTab(m)
                setSubmitState('idle')
              }}
              options={[
                { id: 'nb', label: pickText(lang, { pl: 'Zaległe nb', en: 'Unexcused nb' }) },
                { id: 'range', label: pickText(lang, { pl: 'Zakres dat', en: 'Date range' }) },
                { id: 'hours', label: pickText(lang, { pl: 'Godziny', en: 'Hours' }) }
              ]}
              className="w-full shrink-0"
            />

            <form onSubmit={handleSubmitExcuse} className="flex flex-col gap-3.5">
              {excuseTab === 'nb' && (
                <MacGroupBox
                  title={`${pickText(lang, { pl: 'Wybrane do usprawiedliwienia', en: 'Selected absences' })}: ${selectedNbCount}`}
                  noPadding
                >
                  {groupedNbDays.length > 0 ? (
                    <div className="mac-divide-y max-h-[300px] overflow-y-auto">
                      {groupedNbDays.map((g) => {
                        const actionable = g.lessons.filter(
                          (l) => !isLessonJustificationPending(pendingList, g.isoDate, g.date, l.lessonNumber)
                        )
                        const allDayChecked =
                          actionable.length > 0 &&
                          actionable.every((l) => Boolean(selectedNbMap[`${g.date}_${l.lessonNumber}`]))

                        const toggleDay = () => {
                          setSelectedNbMap((prev) => {
                            const next = { ...prev }
                            actionable.forEach((l) => {
                              next[`${g.date}_${l.lessonNumber}`] = !allDayChecked
                            })
                            return next
                          })
                        }

                        return (
                          <div key={g.date} className="flex flex-col">
                            <div className="px-3.5 py-2 bg-[var(--mac-fill-5)] flex items-center justify-between gap-2 text-[11px] font-semibold text-[var(--mac-label-2)] tabular-nums">
                              <span>{g.date}</span>
                              {actionable.length > 0 && (
                                <button
                                  type="button"
                                  onClick={toggleDay}
                                  className="text-[var(--mac-blue)] hover:underline cursor-pointer font-semibold"
                                >
                                  {allDayChecked
                                    ? pickText(lang, { pl: 'Odznacz dzień', en: 'Unselect day' })
                                    : pickText(lang, { pl: 'Zaznacz dzień', en: 'Select day' })}
                                </button>
                              )}
                            </div>
                            <div className="mac-divide-y">
                              {g.lessons.map((l) => {
                                const isPend = isLessonJustificationPending(
                                  pendingList,
                                  g.isoDate,
                                  g.date,
                                  l.lessonNumber
                                )
                                const key = `${g.date}_${l.lessonNumber}`
                                const checked = Boolean(selectedNbMap[key])
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    disabled={isPend}
                                    onClick={() =>
                                      setSelectedNbMap((prev) => ({ ...prev, [key]: !prev[key] }))
                                    }
                                    className={cn(
                                      'w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors',
                                      isPend
                                        ? 'opacity-65 cursor-default'
                                        : checked
                                          ? 'bg-[var(--ios-blue-subtle)]/25 cursor-pointer hover:bg-[var(--ios-blue-subtle)]/35'
                                          : 'cursor-pointer hover:bg-[var(--mac-fill-4)]'
                                    )}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <span
                                        className={cn(
                                          'w-4 h-4 rounded-[5px] flex items-center justify-center shrink-0 transition-colors border',
                                          isPend
                                            ? 'bg-[var(--ios-orange-subtle)] border-transparent text-[var(--mac-orange)]'
                                            : checked
                                              ? 'bg-[var(--mac-blue)] border-[var(--mac-blue)] text-white'
                                              : 'bg-transparent border-[var(--mac-label-3)]'
                                        )}
                                      >
                                        {!isPend && checked && <Check className="w-3 h-3" strokeWidth={3} />}
                                      </span>
                                      <span className="w-6 h-6 rounded-full bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                                        {l.lessonNumber}
                                      </span>
                                      <span className="text-[13px] font-medium text-[var(--mac-label-1)] leading-snug">
                                        {formatSubjectName(l.subject, showFullSubjectNames)}
                                      </span>
                                    </div>
                                    {isPend ? (
                                      <span className="px-2 py-0.5 rounded-full bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)] text-[10px] font-semibold shrink-0 whitespace-nowrap">
                                        {t.pendingJustification}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-[var(--ios-red-subtle)] text-[var(--mac-red)] text-[10px] font-semibold uppercase shrink-0">
                                        nb
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-[12px] text-[var(--mac-label-2)]">
                      {pickText(lang, { pl: 'Brak nieusprawiedliwionych godzin', en: 'All absences excused' })}
                    </div>
                  )}
                </MacGroupBox>
              )}

              {excuseTab === 'range' && (
                <MacGroupBox contentClassName="p-3.5 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-[var(--mac-label-2)] block mb-1">
                        {pickText(lang, { pl: 'Od dnia', en: 'From' })}
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full h-[34px] px-3 rounded-[8px] bg-[var(--mac-fill-4)] border border-[var(--mac-group-border)] text-[12px] font-medium text-[var(--mac-label-1)] outline-none mac-input-focus"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-[var(--mac-label-2)] block mb-1">
                        {pickText(lang, { pl: 'Do dnia', en: 'To' })}
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full h-[34px] px-3 rounded-[8px] bg-[var(--mac-fill-4)] border border-[var(--mac-group-border)] text-[12px] font-medium text-[var(--mac-label-1)] outline-none mac-input-focus"
                      />
                    </div>
                  </div>
                  <div className="text-[12px] text-[var(--mac-label-2)] flex items-center justify-between pt-2 border-t border-[var(--mac-row-divider)]">
                    <span>{pickText(lang, { pl: 'Lekcji do wysłania:', en: 'Periods queued:' })}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] text-[11px] font-semibold tabular-nums">
                      {rangePlan.totalLessons}
                    </span>
                  </div>
                </MacGroupBox>
              )}

              {excuseTab === 'hours' && (
                <>
                  <MacGroupBox contentClassName="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <label className="text-[12px] font-medium text-[var(--mac-label-2)] shrink-0">
                        {t.dateLabel}
                      </label>
                      <input
                        type="date"
                        value={selectedDayIso}
                        onChange={(e) => {
                          setSelectedDayIso(e.target.value)
                          setSelectedHoursMap({})
                        }}
                        className="h-[32px] px-3 rounded-[8px] bg-[var(--mac-fill-4)] border border-[var(--mac-group-border)] text-[12px] font-medium text-[var(--mac-label-1)] outline-none mac-input-focus"
                      />
                    </div>
                    {(() => {
                      const allSel =
                        dayLessonsForHours.length > 0 &&
                        dayLessonsForHours.every((l) => Boolean(selectedHoursMap[l.number]))
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (allSel) {
                              setSelectedHoursMap({})
                            } else {
                              const next: Record<number, boolean> = {}
                              dayLessonsForHours.forEach((l) => {
                                next[l.number] = true
                              })
                              setSelectedHoursMap(next)
                            }
                          }}
                          className="text-[11px] font-semibold text-[var(--mac-blue)] hover:underline cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          {allSel
                            ? pickText(lang, { pl: 'Wyczyść', en: 'Clear all' })
                            : pickText(lang, { pl: 'Zaznacz wszystkie', en: 'Select all' })}
                        </button>
                      )
                    })()}
                  </MacGroupBox>

                  <MacGroupBox
                    title={`${pickText(lang, { pl: 'Godziny lekcyjne', en: 'School periods' })} (${selectedHoursList.length})`}
                    noPadding
                  >
                    <div className="mac-divide-y max-h-[260px] overflow-y-auto">
                      {dayLessonsForHours.map((l) => {
                        const active = Boolean(selectedHoursMap[l.number])
                        return (
                          <button
                            key={l.number}
                            type="button"
                            onClick={() =>
                              setSelectedHoursMap((p) => ({ ...p, [l.number]: !p[l.number] }))
                            }
                            className={cn(
                              'w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors',
                              active
                                ? 'bg-[var(--ios-blue-subtle)]/25 hover:bg-[var(--ios-blue-subtle)]/35'
                                : 'hover:bg-[var(--mac-fill-4)]'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className={cn(
                                  'w-4 h-4 rounded-[5px] flex items-center justify-center shrink-0 transition-colors border',
                                  active
                                    ? 'bg-[var(--mac-blue)] border-[var(--mac-blue)] text-white'
                                    : 'bg-transparent border-[var(--mac-label-3)]'
                                )}
                              >
                                {active && <Check className="w-3 h-3" strokeWidth={3} />}
                              </span>
                              <span className="w-6 h-6 rounded-full bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                                {l.number}
                              </span>
                              <span className="text-[13px] font-medium text-[var(--mac-label-1)] leading-snug">
                                {formatSubjectName(l.subject, showFullSubjectNames)}
                              </span>
                            </div>
                            {l.time && (
                              <span className="text-[11px] text-[var(--mac-label-2)] tabular-nums shrink-0">
                                {l.time}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </MacGroupBox>
                </>
              )}

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)] block mb-1">
                  {pickText(lang, { pl: 'Treść wiadomości dla wychowawcy', en: 'Message to homeroom teacher' })}
                </label>
                <textarea
                  rows={3}
                  value={parentMessage}
                  onChange={(e) => setParentMessage(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  className="w-full p-2.5 rounded-[10px] bg-[var(--mac-group-bg)] border border-[var(--mac-group-border)] text-[13px] text-[var(--mac-label-1)] placeholder-[var(--mac-label-2)] outline-none mac-input-focus resize-none"
                />
              </div>

              <MacPushButton
                type="submit"
                variant="prominent"
                size="xl"
                loading={submitState === 'submitting'}
                disabled={
                  submitState === 'submitting' ||
                  (excuseTab === 'nb' && selectedNbCount === 0) ||
                  (excuseTab === 'range' && rangePlan.totalLessons === 0) ||
                  (excuseTab === 'hours' && selectedHoursList.length === 0)
                }
                icon={<Send className="w-3.5 h-3.5" />}
                className="w-full"
              >
                {excuseTab === 'nb'
                  ? pickText(lang, { pl: `Wyślij (${selectedNbCount})`, en: `Submit (${selectedNbCount})` })
                  : excuseTab === 'range'
                    ? pickText(lang, {
                        pl: `Wyślij okres (${rangePlan.totalLessons} ${formatPolishPlural(rangePlan.totalLessons, 'lekcja', 'lekcje', 'lekcji')})`,
                        en: `Submit range (${rangePlan.totalLessons})`
                      })
                    : pickText(lang, { pl: `Wyślij (${selectedHoursList.length})`, en: `Submit (${selectedHoursList.length})` })}
              </MacPushButton>

              {submitState === 'done' && submitFailures.length === 0 && (
                <div className="px-3 py-2 rounded-[9px] bg-[var(--ios-green-subtle)] text-[var(--mac-green)] text-[12px] font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{pickText(lang, { pl: 'Usprawiedliwienie wysłane do Synergii.', en: 'Justification sent to Synergia.' })}</span>
                </div>
              )}
              {submitFailures.length > 0 && (
                <div className="px-3 py-2 rounded-[9px] bg-[var(--ios-red-subtle)] text-[var(--mac-red)] text-[12px]">
                  {submitFailures[0].date}: {submitFailures[0].error}
                </div>
              )}
            </form>
          </div>

          {/* Right 7 cols: Live Librus Justification Statuses */}
          <div className="lg:col-span-7 overflow-y-auto flex flex-col gap-3.5 min-h-0">
            {isLoadingLiveJustifications ? (
              <MacGroupBox
                title={t.liveJustificationsTitle}
                className="flex-1"
                contentClassName="py-20 flex flex-col items-center justify-center gap-2"
              >
                <UiSpinner size="large" className="text-[var(--mac-blue)]" />
                <span className="text-[12px] text-[var(--mac-label-2)]">{t.updatingStatus}</span>
              </MacGroupBox>
            ) : liveJustifications.length > 0 ? (
              <MacGroupBox title={t.liveJustificationsTitle} noPadding>
                <div className="mac-divide-y">
                  {liveJustifications.map((item) => {
                    const code =
                      item.statusCode === 'accepted' ? 1 : item.statusCode === 'rejected' ? 2 : item.statusCode === 'pending' ? 0 : item.statusRaw || 0
                    const meta = getJustificationStatusMeta(code, t)
                    const badgeColor =
                      meta.variant === 'green'
                        ? 'bg-[var(--ios-green-subtle)] text-[var(--mac-green)]'
                        : meta.variant === 'red'
                          ? 'bg-[var(--ios-red-subtle)] text-[var(--mac-red)]'
                          : meta.variant === 'orange'
                            ? 'bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)]'
                            : 'bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)]'
                    return (
                      <div key={item.id} className="p-3.5 flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[13px] font-semibold text-[var(--mac-label-1)]">{item.periodStr}</div>
                            <div className="text-[11px] text-[var(--mac-label-2)] tabular-nums">
                              {item.count} {pickText(lang, { pl: 'godz.', en: 'periods' })} ·{' '}
                              {formatHumanDate(item.sentAt, true, lang)}
                              {item.teacher ? ` · ${item.teacher}` : ''}
                            </div>
                          </div>
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0', badgeColor)}>
                            {meta.label}
                          </span>
                        </div>
                        {item.comment && (
                          <div className="text-[12px] text-[var(--mac-label-1)] bg-[var(--mac-fill-4)] px-3 py-1.5 rounded-[7px]">
                            {item.comment}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </MacGroupBox>
            ) : (
              <MacGroupBox
                title={t.liveJustificationsTitle}
                contentClassName="py-16 text-center text-[13px] text-[var(--mac-label-2)] flex flex-col items-center gap-2"
              >
                <CheckCircle2 className="w-7 h-7 text-[var(--mac-label-3)]" />
                <span>{t.liveJustificationsEmpty}</span>
              </MacGroupBox>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
