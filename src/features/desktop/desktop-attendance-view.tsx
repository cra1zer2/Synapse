'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  RefreshCw,
  Send
} from 'lucide-react'
import {
  AbsenceDetail,
  AttendanceResult,
  LegacyAttendanceDay,
  SubjectAttendance
} from '@/models/attendance.model'
import { LiveJustificationItem } from '@/models/justification.model'
import { SmartTimetableResult, LessonItem, DaySchedule } from '@/models/timetable.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { formatSubjectName, formatPolishPlural } from '@/utils/text.util'
import {
  formatDayDate,
  formatHumanDate,
  getDatesList,
  getSchoolWeekMondayIso,
  getTodayIsoString
} from '@/utils/date.util'
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
import {
  MacDatePicker,
  MacGroupBox,
  MacPopupSelect,
  MacPushButton,
  MacSegmentedControl
} from './mac-primitives'

export type DesktopAttendanceSubTab = 'summary' | 'journal' | 'justifications'
export type DesktopExcuseModeTab = 'nb' | 'range' | 'hours'

function formatCompactLessonRange(lessons: number[]): string {
  const sorted = Array.from(new Set(lessons)).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b)
  if (sorted.length === 0) return ''
  const parts: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i]
    } else {
      parts.push(start === prev ? `${start}` : `${start}–${prev}`)
      start = sorted[i]
      prev = sorted[i]
    }
  }
  parts.push(start === prev ? `${start}` : `${start}–${prev}`)
  return parts.join(', ')
}

function shiftIsoDate(baseIso: string, deltaDays: number): string {
  const parts = baseIso.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return baseIso
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + deltaDays))
  return dt.toISOString().slice(0, 10)
}

function toIsoDateString(raw: string): string {
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const m = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

interface DesktopAttendanceViewProps {
  attendanceData: AttendanceResult | null
  attendanceError: string | null
  onRetry: () => void
  timetableData: SmartTimetableResult | null
  showFullSubjectNames: boolean
  vocationalSubjects?: string[]
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
  onFetchWeekTimetable?: (weekStartIso: string) => Promise<SmartTimetableResult | null>
  excuseMode?: DesktopExcuseModeTab
  onChangeExcuseMode?: (mode: DesktopExcuseModeTab) => void
  subTab: DesktopAttendanceSubTab
  lang: AppLanguage
  t: AppDictionary
}

export function DesktopAttendanceView({
  attendanceData,
  attendanceError,
  onRetry,
  timetableData,
  showFullSubjectNames,
  vocationalSubjects = [],
  isStudent,
  canSubmitExcuse,
  liveJustifications,
  isLoadingLiveJustifications,
  liveJustificationsFilter,
  onChangeLiveFilter,
  onLoadLiveJustifications,
  onSubmitJustification,
  onFetchWeekTimetable,
  excuseMode,
  onChangeExcuseMode,
  subTab: requestedSubTab,
  lang,
  t
}: DesktopAttendanceViewProps) {
  const [selectedSubject, setSelectedSubject] = useState<SubjectAttendance | null>(null)
  const [selectedJournalDay, setSelectedJournalDay] = useState<LegacyAttendanceDay | null>(null)
  const [pendingList, setPendingList] = useState<PendingJustificationRecord[]>([])

  const todayIso = useMemo(() => getTodayIsoString(), [])
  const [internalExcuseTab, setInternalExcuseTab] = useState<DesktopExcuseModeTab>('nb')
  const excuseTab = excuseMode ?? internalExcuseTab
  const setExcuseTab = (mode: DesktopExcuseModeTab) => {
    setInternalExcuseTab(mode)
    onChangeExcuseMode?.(mode)
  }
  const [parentMessage, setParentMessage] = useState('')
  const [selectedNbMap, setSelectedNbMap] = useState<Record<string, boolean>>({})
  const [dateFrom, setDateFrom] = useState(todayIso)
  const [dateTo, setDateTo] = useState(todayIso)
  const [selectedDayIso, setSelectedDayIso] = useState(todayIso)
  const [selectedHoursMap, setSelectedHoursMap] = useState<Record<number, boolean>>({})
  const [showManualHoursFallback, setShowManualHoursFallback] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [submitFailures, setSubmitFailures] = useState<Array<{ date: string; error: string }>>([])
  const [extraWeekSchedules, setExtraWeekSchedules] = useState<Record<string, SmartTimetableResult>>({})
  const [loadingWeekIso, setLoadingWeekIso] = useState<string | null>(null)
  const attemptedWeeksRef = useRef<Set<string>>(new Set())

  const selectedWeekIso = useMemo(() => getSchoolWeekMondayIso(selectedDayIso), [selectedDayIso])

  const allowExcuse = canSubmitExcuse !== undefined ? canSubmitExcuse : !isStudent
  const subTab: DesktopAttendanceSubTab =
    !allowExcuse && requestedSubTab === 'justifications' ? 'summary' : requestedSubTab

  useEffect(() => {
    setShowManualHoursFallback(false)
  }, [selectedDayIso])

  useEffect(() => {
    setSubmitState('idle')
  }, [excuseTab])

  useEffect(() => {
    if (!onFetchWeekTimetable || subTab !== 'justifications') return
    const targetWeeks: string[] = []
    if (excuseTab === 'hours' && selectedDayIso) {
      targetWeeks.push(selectedWeekIso)
    } else if (excuseTab === 'range' && dateFrom && dateTo) {
      const dates = getDatesList(dateFrom, dateTo)
      for (const d of dates) {
        const wIso = getSchoolWeekMondayIso(d)
        if (!targetWeeks.includes(wIso)) targetWeeks.push(wIso)
        if (targetWeeks.length >= 3) break
      }
    }

    const missingWeek = targetWeeks.find((wIso) => {
      if (attemptedWeeksRef.current.has(wIso)) return false
      if (timetableData?.weekStart === wIso) return false
      if (extraWeekSchedules[wIso]) return false
      if (excuseTab === 'hours' && wIso === selectedWeekIso && timetableData?.schedule?.some((d) => d.isoDate === selectedDayIso)) {
        return false
      }
      return true
    })
    if (!missingWeek) return

    attemptedWeeksRef.current.add(missingWeek)
    let cancelled = false
    setLoadingWeekIso(missingWeek)
    onFetchWeekTimetable(missingWeek)
      .then((res) => {
        if (!cancelled && res) {
          setExtraWeekSchedules((prev) => ({ ...prev, [missingWeek]: res }))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingWeekIso((cur) => (cur === missingWeek ? null : cur))
      })
    return () => {
      cancelled = true
    }
  }, [
    onFetchWeekTimetable,
    subTab,
    excuseTab,
    selectedDayIso,
    selectedWeekIso,
    dateFrom,
    dateTo,
    timetableData,
    extraWeekSchedules
  ])

  useEffect(() => {
    if (attendanceData?.subjects) {
      setPendingList(reconcilePendingJustifications(attendanceData.subjects))
    }
  }, [attendanceData?.subjects])

  useEffect(() => {
    if (subTab === 'justifications' && allowExcuse && liveJustifications.length === 0 && !isLoadingLiveJustifications) {
      onLoadLiveJustifications(liveJustificationsFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, allowExcuse])

  const vocationalSet = useMemo(
    () => new Set(vocationalSubjects.map((s) => s.trim().toLowerCase()).filter(Boolean)),
    [vocationalSubjects]
  )

  const sortedSubjects = useMemo(() => {
    if (!attendanceData?.subjects) return []
    return [...attendanceData.subjects].sort((a, b) => {
      if (a.percentage !== b.percentage) return a.percentage - b.percentage
      if (b.absentLessons !== a.absentLessons) return b.absentLessons - a.absentLessons
      return a.subject.localeCompare(b.subject)
    })
  }, [attendanceData?.subjects])

  const { vocationalList, regularList } = useMemo(() => {
    if (vocationalSet.size === 0) {
      return { vocationalList: [] as SubjectAttendance[], regularList: sortedSubjects }
    }
    const voc: SubjectAttendance[] = []
    const reg: SubjectAttendance[] = []
    for (const sub of sortedSubjects) {
      if (vocationalSet.has(sub.subject.trim().toLowerCase())) {
        voc.push(sub)
      } else {
        reg.push(sub)
      }
    }
    return { vocationalList: voc, regularList: reg }
  }, [sortedSubjects, vocationalSet])

  useEffect(() => {
    if (selectedSubject && sortedSubjects.length > 0) {
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
    return Object.values(map)
      .map((g) => {
        g.lessons.sort((a, b) => a.lessonNumber - b.lessonNumber)
        return g
      })
      .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
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

  const totalActionableNbCount = useMemo(() => {
    let total = 0
    for (const g of groupedNbDays) {
      for (const l of g.lessons) {
        if (!isLessonJustificationPending(pendingList, g.isoDate, g.date, l.lessonNumber)) {
          total++
        }
      }
    }
    return total
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

  const toggleAllNb = () => {
    const allSelected = totalActionableNbCount > 0 && selectedNbCount === totalActionableNbCount
    const next: Record<string, boolean> = {}
    groupedNbDays.forEach((g) => {
      g.lessons.forEach((abs) => {
        if (!isLessonJustificationPending(pendingList, g.isoDate, abs.date, abs.lessonNumber)) {
          next[`${abs.date}_${abs.lessonNumber}`] = !allSelected
        }
      })
    })
    setSelectedNbMap(next)
  }

  const unexcusedLessonNumsForSelectedDay = useMemo(() => {
    const nums = new Set<number>()
    if (!attendanceData) return nums
    const selectedDisplay = selectedDayIso.split('-').reverse().join('.')
    for (const abs of attendanceData.unexcusedAbsences) {
      const aIso = abs.date.includes('.') ? abs.date.split('.').reverse().join('-') : abs.date
      if (aIso === selectedDayIso || abs.date === selectedDisplay) {
        nums.add(abs.lessonNumber)
      }
    }
    return nums
  }, [attendanceData, selectedDayIso])

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
        const wIso = getSchoolWeekMondayIso(dIso)
        const matchedDay =
          timetableData?.schedule.find((s) => s.isoDate === dIso) ||
          extraWeekSchedules[wIso]?.schedule.find((s) => s.isoDate === dIso)
        const cands = matchedDay?.lessons?.length ? matchedDay.lessons.map((l) => l.number) : [1, 2, 3, 4, 5, 6, 7]
        lessonNums = cands.filter((n) => !isLessonJustificationPending(pendingList, dIso, dDisplay, n))
      }
      if (lessonNums.length > 0) {
        days.push({ dateIso: dIso, dateDisplay: dDisplay, lessons: lessonNums })
        total += lessonNums.length
      }
    })
    return { days, totalLessons: total }
  }, [excuseTab, dateFrom, dateTo, attendanceData, timetableData, extraWeekSchedules, pendingList])

  const dayLessonsForHours = useMemo(() => {
    const manualFallback = Array.from({ length: 8 }, (_, i) => ({
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

    const matched: DaySchedule | undefined =
      timetableData?.schedule.find((d) => d.isoDate === selectedDayIso) ||
      extraWeekSchedules[selectedWeekIso]?.schedule.find((d) => d.isoDate === selectedDayIso)

    if (matched?.lessons?.length) {
      return { lessons: matched.lessons, isScheduledData: true }
    }

    const weekLoaded =
      Boolean(extraWeekSchedules[selectedWeekIso]) ||
      timetableData?.weekStart === selectedWeekIso ||
      Boolean(timetableData?.schedule?.some((d) => d.isoDate === selectedDayIso)) ||
      attemptedWeeksRef.current.has(selectedWeekIso)

    if (weekLoaded || onFetchWeekTimetable) {
      return { lessons: showManualHoursFallback ? manualFallback : [], isScheduledData: false }
    }

    return { lessons: manualFallback, isScheduledData: false }
  }, [timetableData, extraWeekSchedules, selectedWeekIso, selectedDayIso, showManualHoursFallback, onFetchWeekTimetable, t])

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

            {(() => {
              const renderSubjectRow = (sub: SubjectAttendance, isVocational: boolean) => {
                const isSel = selectedSubject?.subject === sub.subject
                const activeNb = sub.absences.filter((a) => {
                  const aIso = a.date.includes('.') ? a.date.split('.').reverse().join('-') : a.date
                  return a.isUnexcused && !isLessonJustificationPending(pendingList, aIso, a.date, a.lessonNumber)
                }).length
                const spCount = sub.absences.filter((a) => a.type === 'sp').length
                const dangerThreshold = isVocational ? 75 : 50
                const isDanger = sub.percentage < dangerThreshold
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
                      <div className="text-[13px] font-semibold text-[var(--mac-label-1)] leading-snug">
                        {formatSubjectName(sub.subject, showFullSubjectNames)}
                      </div>
                      <div className="text-[11px] text-[var(--mac-label-2)] mt-0.5 tabular-nums">
                        {t.missedLessonsCount(sub.absentLessons)} {t.ofScheduled(sub.totalLessons)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="min-w-12 flex items-center justify-end gap-1.5 shrink-0">
                        {activeNb > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--ios-red-subtle)] text-[var(--mac-red)] text-[10px] font-semibold tabular-nums whitespace-nowrap">
                            {activeNb} nb
                          </span>
                        )}
                        {spCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)] text-[10px] font-semibold tabular-nums whitespace-nowrap">
                            {spCount} sp
                          </span>
                        )}
                      </div>
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
              }

              if (vocationalList.length > 0) {
                return (
                  <>
                    <MacGroupBox
                      title={pickText(lang, {
                        pl: 'Przedmioty zawodowe (próg 75%)',
                        en: 'Vocational subjects (75% threshold)'
                      })}
                      noPadding
                    >
                      <div className="mac-divide-y">
                        {vocationalList.map((sub) => renderSubjectRow(sub, true))}
                      </div>
                    </MacGroupBox>
                    {regularList.length > 0 && (
                      <MacGroupBox
                        title={pickText(lang, {
                          pl: 'Pozostałe przedmioty',
                          en: 'Other subjects'
                        })}
                        noPadding
                      >
                        <div className="mac-divide-y">
                          {regularList.map((sub) => renderSubjectRow(sub, false))}
                        </div>
                      </MacGroupBox>
                    )}
                  </>
                )
              }

              return (
                <MacGroupBox title={t.subjectsSection} noPadding>
                  <div className="mac-divide-y">
                    {regularList.map((sub) => renderSubjectRow(sub, false))}
                  </div>
                </MacGroupBox>
              )
            })()}
          </div>

          <aside className="w-[340px] shrink-0 p-4 pl-0 overflow-y-auto flex flex-col gap-3.5">
            {selectedSubject ? (
              <>
                <MacGroupBox contentClassName="p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-blue)]">
                      {t.subjectAttendance}
                    </div>
                    {vocationalSet.has(selectedSubject.subject.trim().toLowerCase()) && (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0',
                          selectedSubject.percentage < 75
                            ? 'bg-[var(--ios-red-subtle)] text-[var(--mac-red)]'
                            : 'bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)]'
                        )}
                      >
                        {pickText(lang, { pl: 'Zawodowy · 75%', en: 'Vocational · 75%' })}
                      </span>
                    )}
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
              <MacGroupBox
                className="flex-1"
                contentClassName="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 text-[var(--mac-label-2)]"
              >
                <CheckCircle2 className="w-6 h-6 text-[var(--mac-label-3)]" strokeWidth={1.7} />
                <span className="text-[12px]">
                  {pickText(lang, {
                    pl: 'Wybierz przedmiot, aby zobaczyć szczegóły',
                    en: 'Select a subject to view details'
                  })}
                </span>
              </MacGroupBox>
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
              <MacGroupBox
                className="flex-1"
                contentClassName="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 text-[var(--mac-label-2)]"
              >
                <CheckCircle2 className="w-6 h-6 text-[var(--mac-label-3)]" strokeWidth={1.7} />
                <span className="text-[12px]">
                  {pickText(lang, {
                    pl: 'Wybierz przedmiot, aby zobaczyć szczegóły',
                    en: 'Select a subject to view details'
                  })}
                </span>
              </MacGroupBox>
            )}
          </aside>
        </div>
      )}

      {/* TAB 3: JUSTIFICATIONS COMPOSER + LIVE LIBRUS STATUSES */}
      {subTab === 'justifications' && allowExcuse && (
        <div className="flex-1 min-h-0 flex">
          <form
            onSubmit={handleSubmitExcuse}
            className="flex-1 min-w-0 flex flex-col min-h-0 bg-[var(--mac-canvas-bg)]"
          >
            <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
              {excuseTab === 'nb' && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-[var(--mac-label-2)] tabular-nums">
                      {pickText(lang, {
                        pl: `Wybrano ${selectedNbCount} z ${totalActionableNbCount} nieobecności`,
                        en: `Selected ${selectedNbCount} of ${totalActionableNbCount} absences`
                      })}
                    </span>
                    {totalActionableNbCount > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllNb}
                        className="text-[12px] font-semibold text-[var(--mac-blue)] hover:underline cursor-pointer"
                      >
                        {selectedNbCount === totalActionableNbCount
                          ? pickText(lang, { pl: 'Odznacz wszystko', en: 'Unselect all' })
                          : pickText(lang, { pl: 'Zaznacz wszystko', en: 'Select all' })}
                      </button>
                    )}
                  </div>

                  <MacGroupBox className={groupedNbDays.length === 0 ? 'flex-1' : undefined} noPadding>
                    {groupedNbDays.length > 0 ? (
                      <div className="mac-divide-y">
                        {groupedNbDays.map((g) => {
                          const actionable = g.lessons.filter(
                            (l) => !isLessonJustificationPending(pendingList, g.isoDate, g.date, l.lessonNumber)
                          )
                          const allDayChecked =
                            actionable.length > 0 &&
                            actionable.every((l) => Boolean(selectedNbMap[`${g.date}_${l.lessonNumber}`]))
                          const dayMeta = formatDayDate(g.isoDate, lang)

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
                              <div className="px-4 py-2 bg-[var(--mac-fill-5)] flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[11px] font-semibold text-[var(--mac-label-1)]">
                                    {dayMeta.weekday} · {formatHumanDate(g.isoDate, false, lang)}
                                  </span>
                                  <span className="text-[11px] text-[var(--mac-label-3)] tabular-nums">
                                    ({g.lessons.length})
                                  </span>
                                </div>
                                {actionable.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={toggleDay}
                                    className="text-[11px] font-semibold text-[var(--mac-blue)] hover:underline cursor-pointer shrink-0"
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
                                        'w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors',
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
                                        <span className="text-[13px] font-medium text-[var(--mac-label-1)] truncate">
                                          {formatSubjectName(l.subject, showFullSubjectNames)}
                                        </span>
                                      </div>
                                      {isPend ? (
                                        <span className="px-2 py-0.5 rounded-full bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)] text-[10px] font-semibold shrink-0 whitespace-nowrap">
                                          {t.pendingJustification}
                                        </span>
                                      ) : l.teacher ? (
                                        <span className="text-[11px] text-[var(--mac-label-2)] truncate max-w-[160px] shrink-0">
                                          {l.teacher}
                                        </span>
                                      ) : null}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="py-20 flex flex-col items-center justify-center gap-2 text-center text-[var(--mac-label-2)]">
                        <CheckCircle2 className="w-7 h-7 text-[var(--mac-label-3)] stroke-[1.5]" />
                        <span className="text-[13px] font-medium">
                          {pickText(lang, { pl: 'Brak nieusprawiedliwionych godzin', en: 'All absences excused' })}
                        </span>
                      </div>
                    )}
                  </MacGroupBox>
                </>
              )}

              {excuseTab === 'range' && (
                <>
                  <MacGroupBox noPadding>
                    <div className="mac-divide-y">
                      <div className="p-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)] block mb-1.5">
                            {pickText(lang, { pl: 'Od dnia', en: 'From' })}
                          </label>
                          <MacDatePicker
                            value={dateFrom}
                            onChange={(iso) => {
                              setDateFrom(iso)
                              if (iso > dateTo) setDateTo(iso)
                            }}
                            lang={lang}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)] block mb-1.5">
                            {pickText(lang, { pl: 'Do dnia', en: 'To' })}
                          </label>
                          <MacDatePicker
                            value={dateTo}
                            onChange={(iso) => {
                              setDateTo(iso)
                              if (iso < dateFrom) setDateFrom(iso)
                            }}
                            lang={lang}
                            align="right"
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div className="px-4 py-2.5 bg-[var(--mac-fill-5)] flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            {
                              label: pickText(lang, { pl: 'Dzisiaj', en: 'Today' }),
                              from: todayIso,
                              to: todayIso
                            },
                            {
                              label: pickText(lang, { pl: 'Wczoraj', en: 'Yesterday' }),
                              from: shiftIsoDate(todayIso, -1),
                              to: shiftIsoDate(todayIso, -1)
                            },
                            {
                              label: pickText(lang, { pl: 'Ostatnie 3 dni', en: 'Last 3 days' }),
                              from: shiftIsoDate(todayIso, -2),
                              to: todayIso
                            },
                            {
                              label: pickText(lang, { pl: 'Ten tydzień', en: 'This week' }),
                              from: getSchoolWeekMondayIso(todayIso),
                              to: todayIso
                            }
                          ].map((preset) => {
                            const active = dateFrom === preset.from && dateTo === preset.to
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  setDateFrom(preset.from)
                                  setDateTo(preset.to)
                                }}
                                className={cn(
                                  'h-[24px] px-2.5 rounded-full text-[11px] font-medium cursor-pointer transition-colors',
                                  active
                                    ? 'bg-[var(--mac-blue)] text-white'
                                    : 'bg-[var(--mac-fill-3)] hover:bg-[var(--mac-fill-2)] text-[var(--mac-label-1)]'
                                )}
                              >
                                {preset.label}
                              </button>
                            )
                          })}
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] text-[11px] font-semibold tabular-nums shrink-0">
                          {pickText(lang, {
                            pl: `${rangePlan.days.length} dni · ${rangePlan.totalLessons} lekcji`,
                            en: `${rangePlan.days.length}d · ${rangePlan.totalLessons} periods`
                          })}
                        </span>
                      </div>
                    </div>
                  </MacGroupBox>

                  <MacGroupBox
                    title={pickText(lang, { pl: 'Podgląd wysyłki', en: 'Submission preview' })}
                    noPadding
                  >
                    {rangePlan.days.length > 0 ? (
                      <div className="mac-divide-y">
                        {rangePlan.days.map((d) => {
                          const meta = formatDayDate(d.dateIso, lang)
                          return (
                            <div
                              key={d.dateIso}
                              className="px-4 py-2.5 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-[38px] h-[36px] rounded-[10px] bg-[var(--mac-fill-3)] flex flex-col items-center justify-center shrink-0 leading-none">
                                  <span className="text-[12px] font-bold text-[var(--mac-label-1)] tabular-nums">
                                    {meta.dayNum}
                                  </span>
                                  <span className="text-[9px] uppercase font-semibold text-[var(--mac-label-2)] mt-0.5">
                                    {meta.monthName}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold text-[var(--mac-label-1)] truncate">
                                    {meta.weekday} · {formatHumanDate(d.dateIso, false, lang)}
                                  </div>
                                  <div className="text-[11px] text-[var(--mac-label-2)] tabular-nums">
                                    {d.lessons.length}{' '}
                                    {pickText(lang, {
                                      pl: formatPolishPlural(d.lessons.length, 'lekcja', 'lekcje', 'lekcji'),
                                      en: d.lessons.length === 1 ? 'period' : 'periods'
                                    })}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[12px] font-medium text-[var(--mac-label-2)] tabular-nums shrink-0">
                                {pickText(lang, { pl: 'Lekcje', en: 'Periods' })} {formatCompactLessonRange(d.lessons)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-[12px] text-[var(--mac-label-2)]">
                        {pickText(lang, {
                          pl: 'Brak lekcji do usprawiedliwienia w wybranym zakresie',
                          en: 'No lessons to justify in the selected range'
                        })}
                      </div>
                    )}
                  </MacGroupBox>
                </>
              )}

              {excuseTab === 'hours' && (
                <>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <MacDatePicker
                        value={selectedDayIso}
                        onChange={(iso) => {
                          setSelectedDayIso(iso)
                          setSelectedHoursMap({})
                        }}
                        lang={lang}
                        className="w-[148px]"
                      />
                      <span className="text-[12px] font-medium text-[var(--mac-label-2)]">
                        {formatDayDate(selectedDayIso, lang).weekday}
                      </span>
                    </div>
                    {dayLessonsForHours.lessons.length > 0 &&
                      (() => {
                        const allSel = dayLessonsForHours.lessons.every((l) => Boolean(selectedHoursMap[l.number]))
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (allSel) {
                                setSelectedHoursMap({})
                              } else {
                                const next: Record<number, boolean> = {}
                                dayLessonsForHours.lessons.forEach((l) => {
                                  next[l.number] = true
                                })
                                setSelectedHoursMap(next)
                              }
                            }}
                            className="text-[12px] font-semibold text-[var(--mac-blue)] hover:underline cursor-pointer shrink-0 whitespace-nowrap"
                          >
                            {allSel
                              ? pickText(lang, { pl: 'Wyczyść', en: 'Clear all' })
                              : pickText(lang, { pl: 'Zaznacz wszystkie', en: 'Select all' })}
                          </button>
                        )
                      })()}
                  </div>

                  <MacGroupBox
                    className={
                      loadingWeekIso === selectedWeekIso || dayLessonsForHours.lessons.length === 0
                        ? 'flex-1'
                        : undefined
                    }
                    noPadding
                  >
                    {loadingWeekIso === selectedWeekIso ? (
                      <div className="py-16 flex flex-col items-center justify-center gap-2 text-[var(--mac-label-2)]">
                        <UiSpinner size="small" className="text-[var(--mac-blue)]" />
                        <span className="text-[12px]">
                          {pickText(lang, { pl: 'Pobieranie planu lekcji...', en: 'Loading timetable...' })}
                        </span>
                      </div>
                    ) : dayLessonsForHours.lessons.length > 0 ? (
                      <div className="mac-divide-y">
                        {dayLessonsForHours.lessons.map((l) => {
                          const active = Boolean(selectedHoursMap[l.number])
                          const isNb = unexcusedLessonNumsForSelectedDay.has(l.number)
                          return (
                            <button
                              key={l.number}
                              type="button"
                              onClick={() =>
                                setSelectedHoursMap((p) => ({ ...p, [l.number]: !p[l.number] }))
                              }
                              className={cn(
                                'w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors',
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
                                <div className="min-w-0 flex-1">
                                  <div className="text-[13px] font-medium text-[var(--mac-label-1)] truncate">
                                    {formatSubjectName(l.subject, showFullSubjectNames)}
                                  </div>
                                  {l.teacher && (
                                    <div className="text-[11px] text-[var(--mac-label-2)] truncate">
                                      {l.teacher}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isNb && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--ios-red-subtle)] text-[var(--mac-red)] text-[10px] font-semibold uppercase">
                                    nb
                                  </span>
                                )}
                                {l.time && (
                                  <span className="text-[11px] text-[var(--mac-label-2)] tabular-nums">
                                    {l.time}
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="py-16 px-6 flex flex-col items-center justify-center gap-3 text-center text-[var(--mac-label-2)]">
                        <CalendarDays className="w-7 h-7 text-[var(--mac-label-3)] stroke-[1.5]" />
                        <span className="text-[13px] font-medium">
                          {pickText(lang, {
                            pl: 'Brak zaplanowanych lekcji w tym dniu',
                            en: 'No lessons scheduled on this day'
                          })}
                        </span>
                        <MacPushButton
                          type="button"
                          size="sm"
                          variant="tinted"
                          onClick={() => setShowManualHoursFallback(true)}
                        >
                          {pickText(lang, {
                            pl: 'Wybierz godziny ręcznie (1–8)',
                            en: 'Select periods manually (1–8)'
                          })}
                        </MacPushButton>
                      </div>
                    )}
                  </MacGroupBox>
                </>
              )}
            </div>

            <div className="shrink-0 border-t border-[var(--mac-row-divider)] bg-[var(--mac-window-bg)] px-5 py-3 flex flex-col gap-2">
              {submitState === 'done' && submitFailures.length === 0 && (
                <div className="px-3 py-1.5 rounded-[8px] bg-[var(--ios-green-subtle)] text-[var(--mac-green)] text-[12px] font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    {pickText(lang, {
                      pl: 'Usprawiedliwienie wysłane do Synergii.',
                      en: 'Justification sent to Synergia.'
                    })}
                  </span>
                </div>
              )}
              {submitFailures.length > 0 && (
                <div className="px-3 py-1.5 rounded-[8px] bg-[var(--ios-red-subtle)] text-[var(--mac-red)] text-[12px]">
                  {submitFailures[0].date}: {submitFailures[0].error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={parentMessage}
                  onChange={(e) => setParentMessage(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  className="flex-1 h-[38px] px-3.5 rounded-[10px] bg-[var(--mac-fill-4)] border border-[var(--mac-group-border)] text-[13px] text-[var(--mac-label-1)] placeholder-[var(--mac-label-2)] outline-none mac-input-focus"
                />
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
                  className="shrink-0 px-5"
                >
                  {excuseTab === 'nb'
                    ? pickText(lang, { pl: `Wyślij (${selectedNbCount})`, en: `Submit (${selectedNbCount})` })
                    : excuseTab === 'range'
                      ? pickText(lang, {
                          pl: `Wyślij okres (${rangePlan.totalLessons})`,
                          en: `Submit (${rangePlan.totalLessons})`
                        })
                      : pickText(lang, {
                          pl: `Wyślij (${selectedHoursList.length})`,
                          en: `Submit (${selectedHoursList.length})`
                        })}
                </MacPushButton>
              </div>
            </div>
          </form>

          <aside className="w-[360px] shrink-0 border-l border-[var(--mac-row-divider)] bg-[var(--mac-window-bg)] flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-[var(--mac-row-divider)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[12px] font-semibold text-[var(--mac-label-1)] truncate">
                  {t.liveJustificationsTitle}
                </span>
                <span className="h-[18px] px-1.5 rounded-full bg-[var(--mac-fill-2)] text-[var(--mac-label-2)] text-[11px] font-semibold tabular-nums flex items-center justify-center shrink-0">
                  {liveJustifications.length}
                </span>
              </div>
              <MacPopupSelect
                wrapperClassName="!w-auto shrink-0"
                className="!w-auto"
                value={liveJustificationsFilter}
                onChange={(e) => {
                  const f = e.target.value as '0' | '1' | '2' | '3'
                  onChangeLiveFilter(f)
                  onLoadLiveJustifications(f)
                }}
              >
                <option value="0">{pickText(lang, { pl: 'Wszystkie', en: 'All' })}</option>
                <option value="1">{pickText(lang, { pl: 'Wysłane', en: 'Sent' })}</option>
                <option value="2">{pickText(lang, { pl: 'Przyjęte', en: 'Accepted' })}</option>
                <option value="3">{pickText(lang, { pl: 'Odrzucone', en: 'Rejected' })}</option>
              </MacPopupSelect>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {isLoadingLiveJustifications ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <UiSpinner size="large" className="text-[var(--mac-blue)]" />
                  <span className="text-[12px] text-[var(--mac-label-2)]">{t.updatingStatus}</span>
                </div>
              ) : liveJustifications.length > 0 ? (
                <div className="mac-divide-y">
                  {liveJustifications.map((item) => {
                    const code =
                      item.statusCode === 'accepted'
                        ? 1
                        : item.statusCode === 'rejected'
                          ? 2
                          : item.statusCode === 'pending'
                            ? 0
                            : item.statusRaw || 0
                    const meta = getJustificationStatusMeta(code, t)
                    const badgeColor =
                      meta.variant === 'green'
                        ? 'bg-[var(--ios-green-subtle)] text-[var(--mac-green)]'
                        : meta.variant === 'red'
                          ? 'bg-[var(--ios-red-subtle)] text-[var(--mac-red)]'
                          : meta.variant === 'orange'
                            ? 'bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)]'
                            : 'bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)]'

                    const uniqueIsoDates = Array.from(
                      new Set((item.dates || []).map(toIsoDateString).filter(Boolean))
                    )
                    const itemLessons = Array.isArray(item.lessons) ? item.lessons : []
                    const singleIso = uniqueIsoDates.length === 1 ? uniqueIsoDates[0] : null
                    const dayChipMeta = singleIso ? formatDayDate(singleIso, lang) : null
                    const primaryTitle =
                      singleIso && itemLessons.length > 0
                        ? `${pickText(lang, {
                            pl: itemLessons.length === 1 ? 'Lekcja' : 'Lekcje',
                            en: itemLessons.length === 1 ? 'Period' : 'Periods'
                          })} ${formatCompactLessonRange(itemLessons)}`
                        : item.periodStr

                    return (
                      <div key={item.id} className="px-4 py-3 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--mac-fill-3)] flex flex-col items-center justify-center shrink-0 leading-none">
                              {dayChipMeta ? (
                                <>
                                  <span className="text-[12px] font-bold text-[var(--mac-label-1)] tabular-nums">
                                    {dayChipMeta.dayNum}
                                  </span>
                                  <span className="text-[9px] uppercase font-semibold text-[var(--mac-label-2)] mt-0.5">
                                    {dayChipMeta.monthName}
                                  </span>
                                </>
                              ) : (
                                <CalendarDays className="w-4 h-4 text-[var(--mac-label-2)]" strokeWidth={1.8} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-semibold text-[var(--mac-label-1)] truncate">
                                {primaryTitle}
                              </div>
                              <div className="text-[11px] text-[var(--mac-label-2)] tabular-nums truncate mt-0.5">
                                {item.count} {pickText(lang, { pl: 'godz.', en: 'periods' })} ·{' '}
                                {formatHumanDate(item.sentAt, true, lang)}
                              </div>
                              {item.teacher && (
                                <div className="text-[11px] text-[var(--mac-label-3)] truncate">
                                  {item.teacher}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', badgeColor)}>
                            {meta.label}
                          </span>
                        </div>
                        {item.comment && (
                          <div className="text-[11.5px] text-[var(--mac-label-1)] bg-[var(--mac-fill-4)] px-2.5 py-1.5 rounded-[7px]">
                            {item.comment}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-20 px-6 flex flex-col items-center justify-center gap-3 text-center text-[var(--mac-label-2)]">
                  <CheckCircle2 className="w-7 h-7 text-[var(--mac-label-3)] stroke-[1.5]" />
                  <span className="text-[12px]">{t.liveJustificationsEmpty}</span>
                  <MacPushButton
                    type="button"
                    size="sm"
                    variant="tinted"
                    icon={<RefreshCw className="w-3 h-3" />}
                    onClick={() => onLoadLiveJustifications(liveJustificationsFilter)}
                  >
                    {t.refresh}
                  </MacPushButton>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
