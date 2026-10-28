'use client'

import { useState, useMemo } from 'react'
import { AttendanceResult, LegacyAttendanceDay, AbsenceDetail } from '@/models/attendance.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosCard } from '@/components/ios/ios-ui'
import { formatPolishDayDate } from '@/utils/date.util'
import { formatSubjectName } from '@/utils/text.util'

interface LegacyAttendanceScreenProps {
  isOpen: boolean
  onClose: () => void
  attendanceData: AttendanceResult
  showFullSubjectNames?: boolean
  lang?: AppLanguage
  t: AppDictionary
}

export function LegacyAttendanceScreen({
  isOpen,
  onClose,
  attendanceData,
  showFullSubjectNames = false,
  lang = 'pl',
  t
}: LegacyAttendanceScreenProps) {
  const [activeDay, setActiveDay] = useState<LegacyAttendanceDay | null>(null)
  const [cachedDay, setCachedDay] = useState<LegacyAttendanceDay | null>(null)

  const table = attendanceData.legacyTable

  const days: LegacyAttendanceDay[] = useMemo(() => {
    if (table?.days && table.days.length > 0) {
      return table.days
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
  }, [table, attendanceData])

  const summary = useMemo(() => {
    if (table?.summary) return table.summary
    return {
      u: days.reduce((acc, d) => acc + d.uCount, 0),
      nu: days.reduce((acc, d) => acc + d.nuCount, 0),
      total: days.reduce((acc, d) => acc + d.totalCount, 0),
      sp: days.reduce((acc, d) => acc + d.spCount, 0),
      zw: days.reduce((acc, d) => acc + d.zwCount, 0),
      sl: days.reduce((acc, d) => acc + (d.slCount || 0), 0)
    }
  }, [table, days])

  const getAbsencesForDay = (dayIso: string, dayDate: string): AbsenceDetail[] => {
    const list: AbsenceDetail[] = []
    attendanceData.subjects.forEach((sub) => {
      sub.absences.forEach((abs) => {
        const absIso = abs.date.includes('.') ? abs.date.split('.').reverse().join('-') : abs.date
        if (absIso === dayIso || abs.date === dayDate) {
          list.push(abs)
        }
      })
    })
    return list.sort((a, b) => a.lessonNumber - b.lessonNumber)
  }

  const handleOpenDay = (day: LegacyAttendanceDay) => {
    setCachedDay(day)
    setActiveDay(day)
  }

  const handleCloseDay = () => {
    setActiveDay(null)
    setTimeout(() => {
      setCachedDay(null)
    }, 390)
  }

  const lessonCols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const displayDay = activeDay || cachedDay

  const activeDayAbsences = useMemo(() => {
    if (!displayDay) return []
    return getAbsencesForDay(displayDay.isoDate, displayDay.date)
  }, [displayDay])

  return (
    <>
      <IosScreen
        isOpen={isOpen}
        onClose={onClose}
        title={lang === 'en' ? 'Attendance Table' : 'Tabela obecności'}
        backLabel={t.backAction}
        isSubView={true}
        isReceded={Boolean(activeDay)}
        className="z-[60]"
      >
        <div className="flex flex-col gap-3.5 pb-16 select-none max-w-[402px] mx-auto w-full">
          {/* Сводная карточка со всеми кодами Librus */}
          <IosCard className="p-3 grid grid-cols-5 divide-x divide-[var(--ios-separator)] text-center">
            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-[12px] font-semibold text-[var(--ios-red)] tracking-tight">nb</span>
              <span className="text-[18px] font-medium tabular-nums text-[var(--ios-label)] mt-0.5 leading-none">
                {summary.nu}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-[12px] font-semibold text-[var(--ios-green)] tracking-tight">usp</span>
              <span className="text-[18px] font-medium tabular-nums text-[var(--ios-label)] mt-0.5 leading-none">
                {summary.u}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-[12px] font-semibold text-[var(--ios-orange)] tracking-tight">sp</span>
              <span className="text-[18px] font-medium tabular-nums text-[var(--ios-label)] mt-0.5 leading-none">
                {summary.sp}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-[12px] font-semibold text-[var(--ios-yellow)] dark:text-[#ffd60a] tracking-tight">sL</span>
              <span className="text-[18px] font-medium tabular-nums text-[var(--ios-label)] mt-0.5 leading-none">
                {summary.sl}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-[12px] font-semibold text-[var(--ios-purple)] tracking-tight">zw</span>
              <span className="text-[18px] font-medium tabular-nums text-[var(--ios-label)] mt-0.5 leading-none">
                {summary.zw}
              </span>
            </div>
          </IosCard>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-normal uppercase text-[var(--ios-secondary)] tracking-[-0.08px] px-3 select-none">
              {lang === 'en' ? 'Attendance History' : 'Historia obecności'}
            </span>

            <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
              {/* Шапка таблицы с легкими номерами уроков */}
              <div className="px-3 py-2 flex items-center justify-between gap-2 bg-[var(--ios-element)]/30 border-b border-[var(--ios-separator)] text-[11px] font-normal text-[var(--ios-secondary)]">
                <span className="w-[58px] shrink-0 text-left">Data</span>

                <div className="grid grid-cols-11 gap-0.5 flex-1 text-center">
                  {lessonCols.map((col) => (
                    <span key={col} className="w-full text-center font-normal">
                      {col}
                    </span>
                  ))}
                </div>

                <span className="w-[32px] shrink-0 text-right pr-0.5">Suma</span>
              </div>

              {days.map((day) => {
                const dateInfo = formatPolishDayDate(day.isoDate, lang)
                return (
                  <div
                    key={day.date}
                    onClick={() => handleOpenDay(day)}
                    className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-[var(--ios-element)]/25 active:bg-[var(--ios-element)]/45 transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col w-[58px] shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[15px] font-medium text-[var(--ios-label)] leading-none tabular-nums">
                          {dateInfo.dayNum}
                        </span>
                        <span className="text-[11px] font-normal text-[var(--ios-secondary)]">
                          {dateInfo.monthName}
                        </span>
                      </div>
                      <span className="text-[11px] font-normal text-[var(--ios-secondary)] mt-0.5 leading-none">
                        {dateInfo.weekday}
                      </span>
                    </div>

                    <div className="grid grid-cols-11 gap-0.5 flex-1 items-center text-center">
                      {lessonCols.map((col) => {
                        const lesson = day.lessons[col]
                        if (!lesson) {
                          return (
                            <div
                              key={col}
                              className="w-full aspect-square max-h-[22px] rounded-[4px] bg-[var(--ios-element)]/20 flex items-center justify-center text-[11px] text-[var(--ios-secondary)]/30 font-normal"
                            >
                              ·
                            </div>
                          )
                        }

                        const t = lesson.type
                        const isSl = t === 'sl'
                        const isNu = t === 'nb'
                        const isU = t === 'u'
                        const isSp = t === 'sp'
                        const isZw = t === 'zw'

                        const badgeClass = isSl
                          ? 'bg-[var(--ios-yellow)]/15 text-[var(--ios-yellow)] dark:text-[#ffd60a] border-[var(--ios-yellow)]/35 font-medium'
                          : isNu
                            ? 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border-[var(--ios-red)]/35 font-medium'
                            : isU
                              ? 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)] border-[var(--ios-green)]/35 font-medium'
                              : isSp
                                ? 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] border-[var(--ios-orange)]/35 font-medium'
                                : isZw
                                  ? 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)] border-[var(--ios-purple)]/35 font-medium'
                                  : 'bg-[var(--ios-element)] text-[var(--ios-label)] border-transparent font-medium'

                        return (
                          <div
                            key={col}
                            className={"w-full aspect-square max-h-[22px] rounded-[4px] border flex items-center justify-center text-[9px] leading-none shadow-xs " + badgeClass}
                          >
                            {lesson.symbol}
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex items-center gap-1 w-[32px] shrink-0 justify-end pr-0.5">
                      <span className="text-[13px] font-medium tabular-nums text-[var(--ios-label)]">
                        {day.totalCount}
                      </span>
                    </div>
                  </div>
                )
              })}
            </IosCard>
          </div>
        </div>
      </IosScreen>

      {/* Экран деталей дня без счетчика */}
      <IosScreen
        isOpen={Boolean(activeDay)}
        onClose={handleCloseDay}
        title={displayDay ? displayDay.date : ''}
        backLabel={lang === 'en' ? 'Table' : 'Tabela'}
        isSubView={true}
        className="z-[70]"
      >
        <div className="flex flex-col gap-3 pb-16 select-none max-w-[402px] mx-auto w-full">
          {displayDay && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-normal uppercase text-[var(--ios-secondary)] tracking-[-0.08px] px-3 select-none">
                {lang === 'en' ? 'Lessons & Absences' : 'Lekcje w tym dniu'}
              </span>

              <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
                {activeDayAbsences.length > 0 ? (
                  activeDayAbsences.map((item, idx) => (
                    <div key={idx} className="p-3.5 px-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                        <h4 className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] leading-snug truncate">
                          {formatSubjectName(item.subject, showFullSubjectNames)}
                        </h4>
                        <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-[16px] tabular-nums">
                          {t.lessonNumberLabel(item.lessonNumber)} {item.time ? '• ' + item.time : ''}
                        </p>
                        {item.teacher && (
                          <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-[16px] truncate">
                            {item.teacher}
                          </p>
                        )}
                      </div>

                      <span className={"text-[12px] font-medium px-2.5 py-0.5 rounded-full border shrink-0 tabular-nums " + (
                        item.type === 'sl'
                          ? "bg-[var(--ios-yellow)]/15 text-[var(--ios-yellow)] dark:text-[#ffd60a] border-[var(--ios-yellow)]/30"
                          : item.type === 'sp'
                            ? "bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] border-[var(--ios-orange)]/30"
                            : item.isUnexcused
                              ? "bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border-[var(--ios-red)]/30"
                              : "bg-[var(--ios-green-subtle)] text-[var(--ios-green)] border-[var(--ios-green)]/30"
                      )}>
                        {item.type === 'sl' ? 'sL' : item.type.toUpperCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[15px] text-[var(--ios-secondary)] font-normal">
                    Brak szczegółów lekcji dla tego dnia.
                  </div>
                )}
              </IosCard>
            </div>
          )}
        </div>
      </IosScreen>
    </>
  )
}
