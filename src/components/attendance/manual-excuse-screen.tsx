'use client'

import { useState, useEffect, useMemo } from 'react'
import { AttendanceResult, AbsenceDetail } from '@/models/attendance.model'
import { SmartTimetableResult, LessonItem } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosCard, IosSegmentedControl } from '@/components/ios/ios-ui'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { formatSubjectName } from '@/utils/text.util'
import {
  getPendingJustifications,
  savePendingJustification,
  reconcilePendingJustifications,
  isLessonJustificationPending,
  PendingJustificationRecord
} from '@/utils/justification.util'
import { getDatesList } from '@/utils/date.util'

interface ManualExcuseScreenProps {
  isOpen: boolean
  onClose: () => void
  attendanceData: AttendanceResult
  timetableData: SmartTimetableResult | null
  canSubmitExcuse?: boolean
  showFullSubjectNames?: boolean
  onSubmitJustification: (payload: { dateFrom: string; dateTo: string; lessons: number[]; message: string }) => Promise<{ ok: boolean; error?: string }>
  lang?: AppLanguage
  t: AppDictionary
}

type ModeTab = 'range' | 'hours'
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
  t
}: ManualExcuseScreenProps) {
  const [modeTab, setModeTab] = useState<ModeTab>('range')
  const [status, setStatus] = useState<ScreenStatus>('form')
  const [parentMessage, setParentMessage] = useState('')

  const [pendingList, setPendingList] = useState<PendingJustificationRecord[]>(() => {
    return reconcilePendingJustifications(attendanceData.subjects)
  })

  const todayIso = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + d
  }, [])

  const [dateFrom, setDateFrom] = useState(todayIso)
  const [dateTo, setDateTo] = useState(todayIso)
  const [selectedDayIso, setSelectedDayIso] = useState(todayIso)
  const [selectedHoursMap, setSelectedHoursMap] = useState<Record<number, boolean>>({})

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
  }, [isOpen, attendanceData])

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
    if (!timetableData?.schedule) {
      return Array.from({ length: 8 }, (_, i) => ({
        number: i + 1,
        subject: 'Lekcja ' + (i + 1),
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
    }

    const matchedDay = timetableData.schedule.find((d) => d.isoDate === selectedDayIso)
    if (matchedDay && matchedDay.lessons && matchedDay.lessons.length > 0) {
      return matchedDay.lessons
    }

    return Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      subject: 'Lekcja ' + (i + 1),
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
  }, [timetableData, selectedDayIso])

  const toggleHour = (lessonNum: number) => {
    if (excusedLessonNumbers.has(lessonNum)) return
    if (isLessonJustificationPending(pendingList, selectedDayIso, selectedDayIso, lessonNum)) return

    setSelectedHoursMap((prev) => ({
      ...prev,
      [lessonNum]: !prev[lessonNum]
    }))
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
        const candidates = matchedDay?.lessons && matchedDay.lessons.length > 0
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
    setTimeout(() => {
      setStatus('form')
      setProgressCurrent(0)
      setProgressTotal(0)
    }, 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmitExcuse || status !== 'form') return

    if (modeTab === 'range' && rangePlan.totalLessons === 0) return
    if (modeTab === 'hours' && selectedLessonsArray.length === 0) return

    const totalToSubmit = modeTab === 'range' ? rangePlan.totalLessons : selectedLessonsArray.length
    setProgressTotal(totalToSubmit)
    setProgressCurrent(0)
    setStatus('submitting')

    let progressCount = 0
    const failed: Array<{ date: string; lessons: number[]; error: string }> = []
    setFailures([])

    if (modeTab === 'range') {
      for (const day of rangePlan.days) {
        const { ok, error } = await onSubmitJustification({
          dateFrom: day.dateIso,
          dateTo: day.dateIso,
          lessons: day.lessons,
          message: parentMessage
        })

        if (ok) {
          savePendingJustification({
            dateIso: day.dateIso,
            dateDisplay: day.dateDisplay,
            lessons: day.lessons,
            message: parentMessage
          })
        } else {
          failed.push({ date: day.dateDisplay, lessons: day.lessons, error: error || 'Nieznany błąd' })
        }

        for (let i = 0; i < day.lessons.length; i++) {
          progressCount++
          setProgressCurrent(progressCount)
          await new Promise((r) => setTimeout(r, 60))
        }
      }
    } else {
      const displayDate = selectedDayIso.split('-').reverse().join('.')
      const { ok, error } = await onSubmitJustification({
        dateFrom: selectedDayIso,
        dateTo: selectedDayIso,
        lessons: selectedLessonsArray,
        message: parentMessage
      })

      if (ok) {
        savePendingJustification({
          dateIso: selectedDayIso,
          dateDisplay: displayDate,
          lessons: selectedLessonsArray,
          message: parentMessage
        })
      } else {
        failed.push({ date: displayDate, lessons: selectedLessonsArray, error: error || 'Nieznany błąd' })
      }

      for (let i = 1; i <= selectedLessonsArray.length; i++) {
        setProgressCurrent(i)
        await new Promise((r) => setTimeout(r, 60))
      }
    }

    setFailures(failed)
    setPendingList(getPendingJustifications())
    setProgressCurrent(totalToSubmit)
    await new Promise((r) => setTimeout(r, 200))
    setStatus('completed')
  }

  const pageTitle = lang === 'en' ? 'Manual Justification' : 'Ręczne usprawiedliwienie'

  return (
    <IosScreen
      isOpen={isOpen}
      onClose={onClose}
      title={pageTitle}
      backLabel={t.backAction}
      isSubView={true}
      className="z-[60]"
    >
      <div className="flex flex-col gap-4 pb-16 select-none">
        {status === 'form' && (
          <>
            <IosSegmentedControl<ModeTab>
              value={modeTab}
              onChange={setModeTab}
              options={[
                { id: 'range', label: lang === 'en' ? 'Date Range' : 'Okres dni' },
                { id: 'hours', label: lang === 'en' ? 'Specific Hours' : 'Wybrane godziny' }
              ]}
              className="w-full"
            />

            {!canSubmitExcuse && (
              <div className="p-3.5 rounded-[16px] bg-[var(--ios-orange-subtle)] border border-[var(--ios-orange)]/25 text-[var(--ios-orange)] text-[12px] font-normal leading-relaxed">
                {t.onlyParentCanExcuse}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {modeTab === 'range' ? (
                <IosCard className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-normal text-[var(--ios-label)]">
                      {lang === 'en' ? 'From' : 'Od dnia'}
                    </span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-[var(--ios-input)] text-[var(--ios-label)] text-[13px] font-medium px-3 py-1.5 rounded-full outline-none tabular-nums"
                      required
                    />
                  </div>

                  <div className="h-[0.5px] bg-[var(--ios-separator)]" />

                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-normal text-[var(--ios-label)]">
                      {lang === 'en' ? 'To' : 'Do dnia'}
                    </span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-[var(--ios-input)] text-[var(--ios-label)] text-[13px] font-medium px-3 py-1.5 rounded-full outline-none tabular-nums"
                      required
                    />
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-[var(--ios-secondary)]">
                    <span>{rangePlan.days.length} {lang === 'en' ? 'days' : 'dni w wybranym okresie'}</span>
                    <span className="font-medium text-[var(--ios-label)]">{rangePlan.totalLessons} {lang === 'en' ? 'periods' : 'lekcji do wysłania'}</span>
                  </div>
                </IosCard>
              ) : (
                <div className="flex flex-col gap-3">
                  <IosCard className="p-3.5 px-4 flex items-center justify-between">
                    <span className="text-[15px] font-normal text-[var(--ios-label)]">
                      {lang === 'en' ? 'Day' : 'Wybierz dzień'}
                    </span>
                    <input
                      type="date"
                      value={selectedDayIso}
                      onChange={(e) => {
                        setSelectedDayIso(e.target.value)
                        setSelectedHoursMap({})
                      }}
                      className="bg-[var(--ios-input)] text-[var(--ios-label)] text-[13px] font-medium px-3 py-1.5 rounded-full outline-none tabular-nums"
                      required
                    />
                  </IosCard>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between px-4 text-[13px] text-[var(--ios-secondary)]">
                      <span>{lang === 'en' ? 'Select lesson periods' : 'Wybierz godziny lekcyjne'}</span>
                      <span className="tabular-nums">
                        {selectedLessonsArray.length} {lang === 'en' ? 'selected' : 'zaznaczonych'}
                      </span>
                    </div>

                    <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
                      {dayLessons.map((lesson) => {
                        const isExcused = excusedLessonNumbers.has(lesson.number)
                        const isPending = isLessonJustificationPending(
                          pendingList,
                          selectedDayIso,
                          selectedDayIso,
                          lesson.number
                        )
                        const isChecked = Boolean(selectedHoursMap[lesson.number]) && !isExcused && !isPending
                        const isBlocked = isExcused || isPending

                        return (
                          <div
                            key={lesson.number}
                            onClick={() => !isBlocked && canSubmitExcuse && toggleHour(lesson.number)}
                            className={
                              "px-4 py-3 flex items-center justify-between gap-3 transition-colors duration-100 " +
                              (isBlocked
                                ? "opacity-50 cursor-not-allowed bg-transparent"
                                : "cursor-pointer active:bg-[var(--ios-element)]/55 hover:bg-[var(--ios-element)]/20")
                            }
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {isPending ? (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[12px] text-[var(--ios-yellow)] dark:text-[#ffd60a]">
                                  ⏳
                                </div>
                              ) : isExcused ? (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[12px] text-[var(--ios-secondary)]">
                                  🔒
                                </div>
                              ) : (
                                <div className={
                                  "w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors shrink-0 " +
                                  (isChecked
                                    ? "bg-[var(--ios-blue)] text-white"
                                    : "border border-[var(--ios-separator)] bg-[var(--ios-element)]/30")
                                }>
                                  {isChecked && (
                                    <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <h4 className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] truncate leading-snug">
                                  {formatSubjectName(lesson.subject, showFullSubjectNames)}
                                </h4>
                                <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-[16px] tabular-nums mt-0.5">
                                  {t.lessonNumberLabel(lesson.number)} {lesson.time ? '• ' + lesson.time : ''}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center">
                              {isPending ? (
                                <span className="text-[11px] font-medium text-[var(--ios-yellow)] dark:text-[#ffd60a] tabular-nums">
                                  {t.pendingJustification}
                                </span>
                              ) : isExcused ? (
                                <span className="text-[11px] font-medium text-[var(--ios-green)] tabular-nums">
                                  usprawiedliwione
                                </span>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </IosCard>
                  </div>
                </div>
              )}

              <IosCard className="p-3.5 flex flex-col gap-1.5">
                <span className="text-[11px] font-normal text-[var(--ios-secondary)] uppercase tracking-wider px-1">
                  {lang === 'en' ? 'Note for teacher' : 'Wiadomość do wychowawcy'}
                </span>
                <textarea
                  value={parentMessage}
                  disabled={!canSubmitExcuse}
                  onChange={(e) => setParentMessage(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  className="w-full bg-[var(--ios-input)] text-[var(--ios-label)] text-[15px] font-normal rounded-[16px] p-3 outline-none placeholder-[var(--ios-secondary)]/60 resize-none h-20 border border-transparent focus:border-[var(--ios-blue)]/40 transition-colors"
                />
              </IosCard>

              <button
                type="submit"
                disabled={
                  !canSubmitExcuse ||
                  (modeTab === 'range' && rangePlan.totalLessons === 0) ||
                  (modeTab === 'hours' && selectedLessonsArray.length === 0)
                }
                className="h-[50px] w-full bg-[var(--ios-blue)] text-white text-[15px] font-medium tracking-tight rounded-[16px] active:scale-[0.98] active:opacity-85 disabled:opacity-40 transition-[transform,opacity] duration-150 flex items-center justify-center gap-2 mt-1 cursor-pointer"
              >
                {modeTab === 'range'
                  ? (lang === 'en' ? (`Excuse range (${rangePlan.totalLessons} periods)`) : (`Usprawiedliw okres (${rangePlan.totalLessons} lekcji)`))
                  : (lang === 'en' ? (`Excuse selected (${selectedLessonsArray.length})`) : (`Usprawiedliw zaznaczone (${selectedLessonsArray.length})`))}
              </button>
            </form>
          </>
        )}

        {status === 'submitting' && (
          <IosCard className="p-8 flex flex-col items-center justify-center gap-4 text-center my-auto min-h-[300px]">
            <IosSpinner size="large" className="text-[var(--ios-blue)]" />
            <div className="flex flex-col gap-1 mt-1">
              <h3 className="text-[16px] font-medium text-[var(--ios-label)] tracking-tight">
                {lang === 'en' ? 'Submitting justification...' : 'Wysyłanie usprawiedliwienia...'}
              </h3>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)] tabular-nums">
                {progressCurrent} / {progressTotal}
              </p>
            </div>
            <div className="w-full max-w-[240px] bg-[var(--ios-element)] h-2 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[var(--ios-blue)] rounded-full transition-[width] duration-300 ease-out"
                style={{ width: Math.round((progressCurrent / Math.max(progressTotal, 1)) * 100) + "%" }}
              />
            </div>
          </IosCard>
        )}

        {status === 'completed' && failures.length > 0 && (
          <IosCard className="p-6 flex flex-col items-center justify-center gap-4 text-center my-auto min-h-[300px]">
            <div className="w-14 h-14 rounded-full bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border border-[var(--ios-red)]/20 flex items-center justify-center text-[28px]">
              !
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-[17px] font-medium text-[var(--ios-label)] tracking-tight">
                {lang === 'en' ? 'Some excuses were not sent' : 'Nie wysłano części usprawiedliwień'}
              </h3>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)]">
                {lang === 'en'
                  ? `${failures.length} day(s) rejected by Librus.`
                  : `Librus odrzucił ${failures.length} dzień/dni.`}
              </p>
            </div>
            <div className="w-full flex flex-col gap-2 text-left">
              {failures.map((f) => (
                <div key={f.date} className="p-3 rounded-[14px] bg-[var(--ios-element)]/40 text-[12px] leading-relaxed">
                  <div className="font-semibold text-[var(--ios-label)]">
                    {f.date} • {lang === 'en' ? 'lessons' : 'lekcje'}: {f.lessons.join(', ')}
                  </div>
                  <div className="text-[var(--ios-red)] break-words">{f.error}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="h-[50px] px-8 bg-[var(--ios-element)] text-[var(--ios-label)] text-[15px] font-medium tracking-tight rounded-[16px] active:scale-[0.98] active:opacity-75 transition-[transform,opacity] duration-150 mt-2 cursor-pointer"
            >
              {t.done}
            </button>
          </IosCard>
        )}

        {status === 'completed' && failures.length === 0 && (
          <IosCard className="p-8 flex flex-col items-center justify-center gap-4 text-center my-auto min-h-[300px]">
            <div className="w-14 h-14 rounded-full bg-[var(--ios-green-subtle)] text-[var(--ios-green)] border border-[var(--ios-green)]/20 flex items-center justify-center text-[26px]">
              ✓
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-[17px] font-medium text-[var(--ios-label)] tracking-tight">
                {lang === 'en' ? 'Justification Submitted' : 'Usprawiedliwiono pomyślnie'}
              </h3>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)]">
                {lang === 'en' ? (`Sent ${progressTotal} justifications to teacher.`) : (`Wysłano ${progressTotal} usprawiedliwień do wychowawcy.`)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="h-[50px] px-8 bg-[var(--ios-element)] text-[var(--ios-label)] text-[15px] font-medium tracking-tight rounded-[16px] active:scale-[0.98] active:opacity-75 transition-[transform,opacity] duration-150 mt-2 cursor-pointer"
            >
              {t.done}
            </button>
          </IosCard>
        )}
      </div>
    </IosScreen>
  )
}
