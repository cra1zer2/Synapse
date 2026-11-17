/**
 * Feature Screen: Absence Justification Composer
 * Multi-mode excuse builder supporting unexcused `nb` batch selection, date ranges, and specific periods.
 * Tracks submission progress and records optimistic pending entries on success.
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { AlertCircle, Check } from 'lucide-react'
import { AttendanceResult, AbsenceDetail } from '@/models/attendance.model'
import { SmartTimetableResult, LessonItem } from '@/models/timetable.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { UiScreen } from '@/components/ui/ui-screen'
import { UiButton } from '@/components/ui/ui-button'
import { UiCard, UiSegmentedControl } from '@/components/ui/ui-controls'
import { UiSpinner } from '@/components/ui/ui-spinner'
import {
  getPendingJustifications,
  savePendingJustification,
  reconcilePendingJustifications,
  isLessonJustificationPending,
  PendingJustificationRecord
} from '@/utils/justification.util'
import { getDatesList, getTodayIsoString } from '@/utils/date.util'
import { formatPolishPlural } from '@/utils/text.util'
import { ExcuseNbTab } from './excuse-nb-tab'
import { ExcuseRangeTab } from './excuse-range-tab'
import { ExcuseHoursTab } from './excuse-hours-tab'

interface ManualExcuseScreenProps {
  isOpen: boolean
  onClose: () => void
  attendanceData: AttendanceResult
  timetableData: SmartTimetableResult | null
  canSubmitExcuse?: boolean
  showFullSubjectNames?: boolean
  onSubmitJustification: (payload: {
    dateFrom: string
    dateTo: string
    lessons: number[]
    message: string
  }) => Promise<{ ok: boolean; error?: string }>
  lang?: AppLanguage
  t: AppDictionary
  initialModeTab?: 'nb' | 'range' | 'hours'
}

type ModeTab = 'nb' | 'range' | 'hours'
type ScreenStatus = 'form' | 'submitting' | 'completed'

export function ManualExcuseScreen({
  isOpen,
  onClose,
  attendanceData,
  timetableData,
  canSubmitExcuse = true,
  showFullSubjectNames = false,
  onSubmitJustification,
  lang = 'pl',
  t,
  initialModeTab = 'range'
}: ManualExcuseScreenProps) {
  const [modeTab, setModeTab] = useState<ModeTab>(initialModeTab)
  const [status, setStatus] = useState<ScreenStatus>('form')
  const [parentMessage, setParentMessage] = useState('')
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isOpen && initialModeTab) {
      setModeTab(initialModeTab)
    }
  }, [isOpen, initialModeTab])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const [pendingList, setPendingList] = useState<PendingJustificationRecord[]>([])
  const todayIso = useMemo(() => getTodayIsoString(), [])

  const [dateFrom, setDateFrom] = useState(todayIso)
  const [dateTo, setDateTo] = useState(todayIso)
  const [selectedDayIso, setSelectedDayIso] = useState(todayIso)
  const [selectedHoursMap, setSelectedHoursMap] = useState<Record<number, boolean>>({})
  const [selectedNbMap, setSelectedNbMap] = useState<Record<string, boolean>>({})

  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [failures, setFailures] = useState<Array<{ date: string; lessons: number[]; error: string }>>([])

  useEffect(() => {
    if (isOpen) {
      setPendingList(reconcilePendingJustifications(attendanceData.subjects))
    } else {
      setStatus('form')
      setProgressCurrent(0)
      setProgressTotal(0)
    }
  }, [isOpen, attendanceData.subjects])

  const groupedNbDays = useMemo(() => {
    const map: Record<string, { date: string; isoDate: string; lessons: AbsenceDetail[] }> = {}
    attendanceData.unexcusedAbsences.forEach((abs) => {
      const key = abs.date
      if (!map[key]) {
        const iso = abs.date.includes('.') ? abs.date.split('.').reverse().join('-') : abs.date
        map[key] = { date: abs.date, isoDate: iso, lessons: [] }
      }
      map[key].lessons.push(abs)
    })

    return Object.values(map).map((group) => {
      group.lessons.sort((a, b) => a.lessonNumber - b.lessonNumber)
      const pendingCount = group.lessons.filter((l) =>
        isLessonJustificationPending(pendingList, group.isoDate, group.date, l.lessonNumber)
      ).length
      return {
        ...group,
        allPending: pendingCount === group.lessons.length,
        hasSelectable: pendingCount < group.lessons.length
      }
    })
  }, [attendanceData.unexcusedAbsences, pendingList])

  useEffect(() => {
    const initialSelected: Record<string, boolean> = {}
    groupedNbDays.forEach((group) => {
      group.lessons.forEach((abs) => {
        const isPending = isLessonJustificationPending(pendingList, group.isoDate, abs.date, abs.lessonNumber)
        if (!isPending) {
          initialSelected[abs.date + '_' + abs.lessonNumber] = true
        }
      })
    })
    setSelectedNbMap(initialSelected)
  }, [groupedNbDays, pendingList])

  const selectableNbCount = useMemo(() => {
    return groupedNbDays.flatMap((g) =>
      g.lessons.filter((l) => !isLessonJustificationPending(pendingList, g.isoDate, g.date, l.lessonNumber))
    ).length
  }, [groupedNbDays, pendingList])

  const selectedNbCount = useMemo(() => {
    return Object.entries(selectedNbMap).filter(([key, checked]) => {
      if (!checked) return false
      const [date, numStr] = key.split('_')
      const num = Number(numStr)
      const group = groupedNbDays.find((g) => g.date === date)
      if (!group) return false
      return !isLessonJustificationPending(pendingList, group.isoDate, date, num)
    }).length
  }, [selectedNbMap, groupedNbDays, pendingList])

  const isAllNbSelected = selectableNbCount > 0 && selectedNbCount === selectableNbCount

  const toggleSelectAllNb = () => {
    const nextState = !isAllNbSelected
    const updated: Record<string, boolean> = {}
    groupedNbDays.forEach((group) => {
      group.lessons.forEach((l) => {
        const isPending = isLessonJustificationPending(pendingList, group.isoDate, group.date, l.lessonNumber)
        if (!isPending) {
          updated[group.date + '_' + l.lessonNumber] = nextState
        }
      })
    })
    setSelectedNbMap(updated)
  }

  const toggleNbLesson = (date: string, lessonNumber: number) => {
    const group = groupedNbDays.find((g) => g.date === date)
    if (!group) return
    if (isLessonJustificationPending(pendingList, group.isoDate, date, lessonNumber)) return
    const key = date + '_' + lessonNumber
    setSelectedNbMap((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const excusedLessonNumbers = useMemo(() => {
    const set = new Set<number>()
    attendanceData.subjects.forEach((sub) => {
      sub.absences.forEach((abs) => {
        const absIso = abs.date.includes('.') ? abs.date.split('.').reverse().join('-') : abs.date
        if (absIso === selectedDayIso && (abs.type === 'u' || abs.type === 'zw')) {
          set.add(abs.lessonNumber)
        }
      })
    })
    return set
  }, [attendanceData, selectedDayIso])

  const dayLessons = useMemo(() => {
    if (timetableData?.schedule) {
      const matchedDay = timetableData.schedule.find((d) => d.isoDate === selectedDayIso)
      if (matchedDay?.lessons && matchedDay.lessons.length > 0) {
        return matchedDay.lessons
      }
    }

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

  const toggleHour = (lessonNum: number) => {
    if (excusedLessonNumbers.has(lessonNum)) return
    if (isLessonJustificationPending(pendingList, selectedDayIso, selectedDayIso, lessonNum)) return
    setSelectedHoursMap((prev) => ({ ...prev, [lessonNum]: !prev[lessonNum] }))
  }

  const selectedLessonsArray = useMemo(() => {
    return Object.entries(selectedHoursMap)
      .filter(([num, checked]) => {
        if (!checked) return false
        const n = Number(num)
        return (
          !excusedLessonNumbers.has(n) &&
          !isLessonJustificationPending(pendingList, selectedDayIso, selectedDayIso, n)
        )
      })
      .map(([num]) => Number(num))
      .sort((a, b) => a - b)
  }, [selectedHoursMap, excusedLessonNumbers, pendingList, selectedDayIso])

  const rangePlan = useMemo(() => {
    if (modeTab !== 'range') return { days: [], totalLessons: 0 }
    const dates = getDatesList(dateFrom, dateTo)
    const days: Array<{ dateIso: string; dateDisplay: string; lessons: number[] }> = []
    let total = 0

    dates.forEach((dIso) => {
      const dDisplay = dIso.split('-').reverse().join('.')
      const matchedAbsences: AbsenceDetail[] = []

      attendanceData.subjects.forEach((sub) => {
        sub.absences.forEach((a) => {
          const aIso = a.date.includes('.') ? a.date.split('.').reverse().join('-') : a.date
          if ((aIso === dIso || a.date === dDisplay) && a.isUnexcused) {
            matchedAbsences.push(a)
          }
        })
      })

      let lessonNums: number[] = []
      if (matchedAbsences.length > 0) {
        lessonNums = matchedAbsences
          .map((a) => a.lessonNumber)
          .filter((num) => !isLessonJustificationPending(pendingList, dIso, dDisplay, num))
      } else {
        const matchedDay = timetableData?.schedule.find((s) => s.isoDate === dIso)
        const candidates =
          matchedDay?.lessons && matchedDay.lessons.length > 0
            ? matchedDay.lessons.map((l) => l.number)
            : [1, 2, 3, 4, 5, 6, 7]
        lessonNums = candidates.filter((num) => !isLessonJustificationPending(pendingList, dIso, dDisplay, num))
      }

      if (lessonNums.length > 0) {
        days.push({ dateIso: dIso, dateDisplay: dDisplay, lessons: lessonNums })
        total += lessonNums.length
      }
    })

    return { days, totalLessons: total }
  }, [modeTab, dateFrom, dateTo, attendanceData, timetableData, pendingList])

  const handleClose = () => {
    onClose()
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setStatus('form')
      setProgressCurrent(0)
      setProgressTotal(0)
    }, 300)
  }

  /* === Justification Submission Pipeline === */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmitExcuse || status !== 'form') return

    if (modeTab === 'nb' && selectedNbCount === 0) return
    if (modeTab === 'range' && rangePlan.totalLessons === 0) return
    if (modeTab === 'hours' && selectedLessonsArray.length === 0) return

    const unknownErrorLabel = pickText(lang, { pl: 'Nieznany błąd', en: 'Unknown error' })
    const totalToSubmit =
      modeTab === 'nb'
        ? selectedNbCount
        : modeTab === 'range'
          ? rangePlan.totalLessons
          : selectedLessonsArray.length

    setProgressTotal(totalToSubmit)
    setProgressCurrent(0)
    setStatus('submitting')

    let progressCount = 0
    const failed: Array<{ date: string; lessons: number[]; error: string }> = []
    setFailures([])

    const runDaySubmission = async (dateIso: string, dateDisplay: string, lessons: number[]) => {
      const { ok, error } = await onSubmitJustification({
        dateFrom: dateIso,
        dateTo: dateIso,
        lessons,
        message: parentMessage
      })

      if (ok) {
        savePendingJustification({
          dateIso,
          dateDisplay,
          lessons,
          message: parentMessage
        })
      } else {
        failed.push({ date: dateDisplay, lessons, error: error || unknownErrorLabel })
      }

      for (let i = 0; i < lessons.length; i++) {
        progressCount++
        setProgressCurrent(progressCount)
        await new Promise((r) => setTimeout(r, 60))
      }
    }

    if (modeTab === 'nb') {
      for (const group of groupedNbDays) {
        const selectedLessons = group.lessons
          .filter((l) => {
            const isPending = isLessonJustificationPending(pendingList, group.isoDate, group.date, l.lessonNumber)
            return !isPending && selectedNbMap[group.date + '_' + l.lessonNumber]
          })
          .map((l) => l.lessonNumber)

        if (selectedLessons.length > 0) {
          await runDaySubmission(group.isoDate, group.date, selectedLessons)
        }
      }
    } else if (modeTab === 'range') {
      for (const day of rangePlan.days) {
        await runDaySubmission(day.dateIso, day.dateDisplay, day.lessons)
      }
    } else {
      const displayDate = selectedDayIso.split('-').reverse().join('.')
      await runDaySubmission(selectedDayIso, displayDate, selectedLessonsArray)
    }

    setFailures(failed)
    setPendingList(getPendingJustifications())
    setProgressCurrent(totalToSubmit)
    await new Promise((r) => setTimeout(r, 200))
    setStatus('completed')
  }

  const pageTitle = pickText(lang, { pl: 'Usprawiedliwienia', en: 'Justifications' })
  const submitLabel =
    modeTab === 'nb'
      ? pickText(lang, {
          pl: `Usprawiedliw zaznaczone (${selectedNbCount})`,
          en: `Excuse selected (${selectedNbCount})`
        })
      : modeTab === 'range'
        ? pickText(lang, {
            pl: `Usprawiedliw okres (${rangePlan.totalLessons} ${formatPolishPlural(rangePlan.totalLessons, 'lekcja', 'lekcje', 'lekcji')})`,
            en: `Excuse range (${rangePlan.totalLessons} ${rangePlan.totalLessons === 1 ? 'period' : 'periods'})`
          })
        : pickText(lang, {
            pl: `Usprawiedliw zaznaczone (${selectedLessonsArray.length})`,
            en: `Excuse selected (${selectedLessonsArray.length})`
          })

  return (
    <UiScreen
      isOpen={isOpen}
      onClose={onClose}
      title={pageTitle}
      backLabel={t.backAction}
      isSubView={true}
      className="z-[60]"
    >
      <div className="flex flex-col gap-4 pb-4 select-none">
        {status === 'form' && (
          <>
            <UiSegmentedControl<ModeTab>
              value={modeTab}
              onChange={setModeTab}
              options={[
                { id: 'nb', label: pickText(lang, { pl: 'Zaległe nb', en: 'Unexcused nb' }) },
                { id: 'range', label: pickText(lang, { pl: 'Okres dni', en: 'Date Range' }) },
                { id: 'hours', label: pickText(lang, { pl: 'Godziny', en: 'Specific Hours' }) }
              ]}
              className="w-full"
            />

            {!canSubmitExcuse && (
              <div className="p-3.5 rounded-[14px] bg-[var(--ios-orange-subtle)] ios-tile text-[var(--ios-orange)] text-[12px] font-normal leading-relaxed">
                {t.onlyParentCanExcuse}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {modeTab === 'nb' ? (
                <ExcuseNbTab
                  totalUnexcusedCount={attendanceData.unexcusedAbsences.length}
                  groupedNbDays={groupedNbDays}
                  selectableNbCount={selectableNbCount}
                  isAllNbSelected={isAllNbSelected}
                  selectedNbMap={selectedNbMap}
                  pendingList={pendingList}
                  canSubmitExcuse={canSubmitExcuse}
                  showFullSubjectNames={showFullSubjectNames}
                  onToggleSelectAll={toggleSelectAllNb}
                  onToggleLesson={toggleNbLesson}
                  lang={lang}
                  t={t}
                />
              ) : modeTab === 'range' ? (
                <ExcuseRangeTab
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  daysCount={rangePlan.days.length}
                  totalLessons={rangePlan.totalLessons}
                  onChangeDateFrom={setDateFrom}
                  onChangeDateTo={setDateTo}
                  lang={lang}
                />
              ) : (
                <ExcuseHoursTab
                  selectedDayIso={selectedDayIso}
                  dayLessons={dayLessons}
                  selectedHoursMap={selectedHoursMap}
                  selectedCount={selectedLessonsArray.length}
                  excusedLessonNumbers={excusedLessonNumbers}
                  pendingList={pendingList}
                  canSubmitExcuse={canSubmitExcuse}
                  showFullSubjectNames={showFullSubjectNames}
                  onChangeDayIso={(iso) => {
                    setSelectedDayIso(iso)
                    setSelectedHoursMap({})
                  }}
                  onToggleHour={toggleHour}
                  lang={lang}
                  t={t}
                />
              )}

              <div className="sticky bottom-0 z-10 -mx-2 px-2 pt-3 pb-2 bg-[var(--ios-modal-bg)]/95 backdrop-blur-md border-t border-[var(--ios-separator)] flex flex-col gap-2.5">
<UiCard className="p-3.5 flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-[var(--ios-secondary)] uppercase tracking-wider px-1">
                  {pickText(lang, { pl: 'Wiadomość do wychowawcy', en: 'Note for teacher' })}
                </span>
                <textarea
                  value={parentMessage}
                  disabled={!canSubmitExcuse}
                  onChange={(e) => setParentMessage(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  className="w-full ios-well text-[var(--ios-label)] text-[15px] font-normal rounded-[14px] p-3 outline-none placeholder-[var(--ios-secondary)] resize-none h-20 border-none transition-colors"
                />
              </UiCard>

              <UiButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={
                  !canSubmitExcuse ||
                  (modeTab === 'nb' && selectedNbCount === 0) ||
                  (modeTab === 'range' && rangePlan.totalLessons === 0) ||
                  (modeTab === 'hours' && selectedLessonsArray.length === 0)
                }
                className="mt-1"
              >
                {submitLabel}
              </UiButton>
</div>
            </form>
          </>
        )}

        {status === 'submitting' && (
          <UiCard className="p-8 flex flex-col items-center justify-center gap-4 text-center my-auto min-h-[300px]">
            <UiSpinner size="large" className="text-[var(--ios-blue)]" />
            <div className="flex flex-col gap-1 mt-1">
              <h3 className="text-[16px] font-medium text-[var(--ios-label)] tracking-tight">
                {pickText(lang, { pl: 'Wysyłanie usprawiedliwienia...', en: 'Submitting justification...' })}
              </h3>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)] tabular-nums">
                {progressCurrent} / {progressTotal}
              </p>
            </div>
            <div className="w-full max-w-[240px] bg-[var(--ios-element)] shadow-[var(--ios-segmented-track-shadow)] h-2 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[var(--ios-blue)] ios-progress-fill rounded-full transition-[width] duration-300 ease-out"
                style={{ width: Math.round((progressCurrent / Math.max(progressTotal, 1)) * 100) + '%' }}
              />
            </div>
          </UiCard>
        )}

        {status === 'completed' && failures.length > 0 && (
          <UiCard className="p-6 flex flex-col items-center justify-center gap-4 text-center my-auto min-h-[300px]">
            <div className="w-14 h-14 rounded-full bg-[var(--ios-red-subtle)] ios-tile text-[var(--ios-red)] flex items-center justify-center">
              <AlertCircle className="w-7 h-7" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-[17px] font-medium text-[var(--ios-label)] tracking-tight">
                {pickText(lang, { pl: 'Nie wysłano części usprawiedliwień', en: 'Some excuses were not sent' })}
              </h3>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)]">
                {pickText(lang, {
                  pl: `Librus odrzucił ${failures.length} ${formatPolishPlural(failures.length, 'dzień', 'dni', 'dni')}.`,
                  en: `${failures.length} ${failures.length === 1 ? 'day rejected by Librus.' : 'days rejected by Librus.'}`
                })}
              </p>
            </div>
            <div className="w-full flex flex-col gap-2 text-left">
              {failures.map((f) => (
                <div key={f.date} className="p-3 rounded-[14px] ios-well text-[12px] leading-relaxed">
                  <div className="font-semibold text-[var(--ios-label)]">
                    {f.date} • {pickText(lang, { pl: 'lekcje', en: 'lessons' })}: {f.lessons.join(', ')}
                  </div>
                  <div className="text-[var(--ios-red)] break-words">{f.error}</div>
                </div>
              ))}
            </div>
            <UiButton variant="secondary" size="lg" onClick={handleClose} className="mt-2 px-8">
              {t.done}
            </UiButton>
          </UiCard>
        )}

        {status === 'completed' && failures.length === 0 && (
          <UiCard className="p-8 flex flex-col items-center justify-center gap-4 text-center my-auto min-h-[300px]">
            <div className="w-14 h-14 rounded-full bg-[var(--ios-green-subtle)] ios-tile text-[var(--ios-green)] flex items-center justify-center">
              <Check className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-[17px] font-medium text-[var(--ios-label)] tracking-tight">
                {pickText(lang, { pl: 'Usprawiedliwiono pomyślnie', en: 'Justification Submitted' })}
              </h3>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)]">
                {pickText(lang, {
                  pl: `Wysłano ${progressTotal} ${formatPolishPlural(progressTotal, 'usprawiedliwienie', 'usprawiedliwienia', 'usprawiedliwień')} do wychowawcy.`,
                  en: `Sent ${progressTotal} ${progressTotal === 1 ? 'justification to teacher.' : 'justifications to teacher.'}`
                })}
              </p>
            </div>

            <UiButton variant="secondary" size="lg" onClick={handleClose} className="mt-2 px-8">
              {t.done}
            </UiButton>
          </UiCard>
        )}
      </div>
    </UiScreen>
  )
}
