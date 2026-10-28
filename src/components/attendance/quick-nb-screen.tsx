'use client'

import { useState, useEffect, useMemo } from 'react'
import { AttendanceResult, AbsenceDetail } from '@/models/attendance.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosCard } from '@/components/ios/ios-ui'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { formatSubjectName } from '@/utils/text.util'
import {
  getPendingJustifications,
  savePendingJustification,
  reconcilePendingJustifications,
  isLessonJustificationPending,
  PendingJustificationRecord
} from '@/utils/justification.util'

interface QuickNbScreenProps {
  isOpen: boolean
  onClose: () => void
  attendanceData: AttendanceResult
  canSubmitExcuse?: boolean
  showFullSubjectNames?: boolean
  onSubmitMultiple: (payload: { dateIso: string; lessons: number[]; message: string }) => Promise<{ ok: boolean; error?: string }>
  lang?: AppLanguage
  t: AppDictionary
}

interface GroupedAbsenceDay {
  date: string
  isoDate: string
  lessons: AbsenceDetail[]
  allPending: boolean
  hasSelectable: boolean
}

type ScreenMode = 'form' | 'submitting' | 'completed'

interface SubmitFailure {
  date: string
  lessons: number[]
  error: string
}

export function QuickNbScreen({
  isOpen,
  onClose,
  attendanceData,
  canSubmitExcuse = true,
  showFullSubjectNames = false,
  onSubmitMultiple,
  lang = 'pl',
  t
}: QuickNbScreenProps) {
  const [parentMessage, setParentMessage] = useState('')
  const [mode, setMode] = useState<ScreenMode>('form')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [failures, setFailures] = useState<SubmitFailure[]>([])

  const [pendingList, setPendingList] = useState<PendingJustificationRecord[]>(() => {
    return reconcilePendingJustifications(attendanceData.subjects)
  })

  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isOpen) {
      const refreshed = reconcilePendingJustifications(attendanceData.subjects)
      setPendingList(refreshed)
    } else {
      setMode('form')
      setProgressCurrent(0)
      setProgressTotal(0)
    }
  }, [isOpen, attendanceData])

  const groupedDays = useMemo(() => {
    const map: Record<string, { date: string; isoDate: string; lessons: AbsenceDetail[] }> = {}

    attendanceData.unexcusedAbsences.forEach((abs) => {
      const key = abs.date
      if (!map[key]) {
        const iso = abs.date.includes('.') ? abs.date.split('.').reverse().join('-') : abs.date
        map[key] = {
          date: abs.date,
          isoDate: iso,
          lessons: []
        }
      }
      map[key].lessons.push(abs)
    })

    const result: GroupedAbsenceDay[] = Object.values(map).map((group) => {
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

    return result
  }, [attendanceData.unexcusedAbsences, pendingList])

  useEffect(() => {
    const initialSelected: Record<string, boolean> = {}
    groupedDays.forEach((group) => {
      group.lessons.forEach((abs) => {
        const isPending = isLessonJustificationPending(pendingList, group.isoDate, abs.date, abs.lessonNumber)
        if (!isPending) {
          initialSelected[abs.date + '_' + abs.lessonNumber] = true
        }
      })
    })
    setSelectedMap(initialSelected)
  }, [groupedDays, pendingList])

  const selectableLessons = useMemo(() => {
    return groupedDays.flatMap((g) =>
      g.lessons.filter((l) => !isLessonJustificationPending(pendingList, g.isoDate, g.date, l.lessonNumber))
    )
  }, [groupedDays, pendingList])

  const totalSelectableCount = selectableLessons.length
  const selectedCount = Object.entries(selectedMap).filter(([key, checked]) => {
    if (!checked) return false
    const parts = key.split('_')
    const date = parts[0]
    const num = Number(parts[1])
    const group = groupedDays.find((g) => g.date === date)
    if (!group) return false
    return !isLessonJustificationPending(pendingList, group.isoDate, date, num)
  }).length

  const isAllSelected = totalSelectableCount > 0 && selectedCount === totalSelectableCount

  const toggleSelectAll = () => {
    const nextState = !isAllSelected
    const updated: Record<string, boolean> = {}
    groupedDays.forEach((group) => {
      group.lessons.forEach((l) => {
        const isPending = isLessonJustificationPending(pendingList, group.isoDate, group.date, l.lessonNumber)
        if (!isPending) {
          updated[group.date + '_' + l.lessonNumber] = nextState
        }
      })
    })
    setSelectedMap(updated)
  }

  const toggleLesson = (date: string, lessonNumber: number) => {
    const group = groupedDays.find((g) => g.date === date)
    if (!group) return
    const isPending = isLessonJustificationPending(pendingList, group.isoDate, date, lessonNumber)
    if (isPending) return

    const key = date + '_' + lessonNumber
    setSelectedMap((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setMode('form')
      setProgressCurrent(0)
      setProgressTotal(0)
    }, 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmitExcuse || selectedCount === 0 || mode !== 'form') return

    const totalToSubmit = selectedCount
    setProgressTotal(totalToSubmit)
    setProgressCurrent(0)
    setMode('submitting')

    let currentProgress = 0
    const failed: SubmitFailure[] = []
    setFailures([])

    for (const group of groupedDays) {
      const selectedLessons = group.lessons
        .filter((l) => {
          const isPending = isLessonJustificationPending(pendingList, group.isoDate, group.date, l.lessonNumber)
          return !isPending && selectedMap[group.date + '_' + l.lessonNumber]
        })
        .map((l) => l.lessonNumber)

      if (selectedLessons.length > 0) {
        const { ok, error } = await onSubmitMultiple({
          dateIso: group.isoDate,
          lessons: selectedLessons,
          message: parentMessage
        })

        if (!ok) {
          failed.push({ date: group.date, lessons: selectedLessons, error: error || 'Nieznany błąd' })
        } else {
          savePendingJustification({
            dateIso: group.isoDate,
            dateDisplay: group.date,
            lessons: selectedLessons,
            message: parentMessage
          })
        }

        for (let i = 0; i < selectedLessons.length; i++) {
          currentProgress++
          setProgressCurrent(currentProgress)
          await new Promise((r) => setTimeout(r, 60))
        }
      }
    }

    setFailures(failed)
    setPendingList(getPendingJustifications())
    setProgressCurrent(totalToSubmit)
    await new Promise((r) => setTimeout(r, 200))
    setMode('completed')
  }

  const pageTitle = lang === 'en' ? 'Unexcused Absences' : 'Zaległe nb'

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
        {mode === 'form' && (
          <>
            <IosCard className="p-4 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight">
                  {lang === 'en' ? 'Unexcused Lessons' : 'Nieusprawiedliwione godziny'}
                </span>
                <h2 className="text-[28px] font-semibold text-[var(--ios-red)] tracking-tight leading-none mt-0.5 tabular-nums">
                  {attendanceData.unexcusedAbsences.length} nb
                </h2>
              </div>

              {totalSelectableCount > 0 ? (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-full bg-[var(--ios-element)]/50 text-[var(--ios-label)] active:scale-[0.96] active:opacity-75 transition-[transform,opacity] duration-150 cursor-pointer"
                >
                  <span className="text-[13px] font-medium tracking-tight">
                    {lang === 'en' ? 'Select all' : 'Zaznacz wszystkie'}
                  </span>
                  <div className={
                    "w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0 " +
                    (isAllSelected
                      ? "bg-[var(--ios-blue)] text-white"
                      : "border border-[var(--ios-separator)] bg-[var(--ios-card-solid)]")
                  }>
                    {isAllSelected && (
                      <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </button>
              ) : (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[var(--ios-yellow)]/15 text-[var(--ios-yellow)] dark:text-[#ffd60a]">
                  {t.pendingJustification}
                </span>
              )}
            </IosCard>

            {!canSubmitExcuse && (
              <div className="p-3.5 rounded-[16px] bg-[var(--ios-orange-subtle)] border border-[var(--ios-orange)]/25 text-[var(--ios-orange)] text-[13px] font-normal leading-relaxed">
                {t.onlyParentCanExcuse}
              </div>
            )}

            {groupedDays.length > 0 ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                  {groupedDays.map((group) => (
                    <div key={group.date} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between px-4 text-[13px] text-[var(--ios-secondary)]">
                        <span className="font-semibold tracking-tight text-[var(--ios-label)]">
                          {group.date}
                        </span>
                        <div className="flex items-center gap-2">
                          {group.allPending && (
                            <span className="text-[11px] font-medium text-[var(--ios-yellow)] dark:text-[#ffd60a]">
                              {t.pendingJustification}
                            </span>
                          )}
                          <span className="tabular-nums">
                            {group.lessons.length} {lang === 'en' ? 'periods' : 'lekcji'}
                          </span>
                        </div>
                      </div>

                      <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
                        {group.lessons.map((lesson) => {
                          const isPending = isLessonJustificationPending(
                            pendingList,
                            group.isoDate,
                            group.date,
                            lesson.lessonNumber
                          )
                          const key = group.date + '_' + lesson.lessonNumber
                          const isChecked = Boolean(selectedMap[key]) && !isPending

                          return (
                            <div
                              key={lesson.lessonNumber}
                              onClick={() => !isPending && canSubmitExcuse && toggleLesson(group.date, lesson.lessonNumber)}
                              className={
                                "px-4 py-3 flex items-center justify-between gap-3 transition-colors duration-100 " +
                                (isPending
                                  ? "opacity-50 cursor-not-allowed bg-transparent"
                                  : "cursor-pointer active:bg-[var(--ios-element)]/55 hover:bg-[var(--ios-element)]/20")
                              }
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                {isPending ? (
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[12px] text-[var(--ios-yellow)] dark:text-[#ffd60a]">
                                    ⏳
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
                                    {t.lessonNumberLabel(lesson.lessonNumber)} {lesson.time ? '• ' + lesson.time : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center">
                                {isPending ? (
                                  <span className="text-[11px] font-medium text-[var(--ios-yellow)] dark:text-[#ffd60a] tabular-nums">
                                    {t.pendingJustification}
                                  </span>
                                ) : (
                                  <span className="text-[12px] font-medium text-[var(--ios-red)] tracking-tight tabular-nums">
                                    NB
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </IosCard>
                    </div>
                  ))}
                </div>

                <IosCard className="p-3.5 flex flex-col gap-1.5">
                  <span className="text-[11px] font-normal text-[var(--ios-secondary)] uppercase tracking-wider px-1">
                    {lang === 'en' ? 'Note for teacher' : 'Wiadomość do wychowawcy'}
                  </span>
                  <textarea
                    value={parentMessage}
                    disabled={!canSubmitExcuse || totalSelectableCount === 0}
                    onChange={(e) => setParentMessage(e.target.value)}
                    placeholder={t.commentPlaceholder}
                    className="w-full bg-[var(--ios-input)] text-[var(--ios-label)] text-[15px] font-normal rounded-[16px] p-3 outline-none placeholder-[var(--ios-secondary)]/60 resize-none h-20 border border-transparent focus:border-[var(--ios-blue)]/40 transition-colors disabled:opacity-50"
                  />
                </IosCard>

                <button
                  type="submit"
                  disabled={!canSubmitExcuse || selectedCount === 0}
                  className="h-[50px] w-full bg-[var(--ios-blue)] text-white text-[15px] font-medium tracking-tight rounded-[16px] active:scale-[0.98] active:opacity-85 disabled:opacity-40 transition-[transform,opacity] duration-150 flex items-center justify-center gap-2 mt-1 cursor-pointer"
                >
                  {lang === 'en' ? (`Excuse selected (${selectedCount})`) : (`Usprawiedliw zaznaczone (${selectedCount})`)}
                </button>
              </form>
            ) : (
              <IosCard className="p-8 text-center text-[15px] font-normal text-[var(--ios-secondary)]">
                {lang === 'en' ? 'All absences are excused' : 'Wszystkie nieobecności są usprawiedliwione'}
              </IosCard>
            )}
          </>
        )}

        {mode === 'submitting' && (
          <IosCard className="p-8 flex flex-col items-center justify-center gap-4 text-center my-auto min-h-[300px]">
            <IosSpinner size="large" className="text-[var(--ios-blue)]" />
            <div className="flex flex-col gap-1 mt-1">
              <h3 className="text-[16px] font-medium text-[var(--ios-label)] tracking-tight">
                {lang === 'en' ? 'Submitting justifications...' : 'Wysyłanie usprawiedliwień...'}
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

        {mode === 'completed' && failures.length > 0 && (
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

        {mode === 'completed' && failures.length === 0 && (
          <IosCard className="p-8 flex flex-col items-center justify-center gap-4 text-center my-auto min-h-[300px]">
            <div className="w-14 h-14 rounded-full bg-[var(--ios-green-subtle)] text-[var(--ios-green)] border border-[var(--ios-green)]/20 flex items-center justify-center text-[28px]">
              ✓
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-[17px] font-medium text-[var(--ios-label)] tracking-tight">
                {lang === 'en' ? 'All Excuses Submitted' : 'Usprawiedliwiono pomyślnie'}
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
