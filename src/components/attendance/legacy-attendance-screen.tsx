'use client'

import { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { AttendanceResult, LegacyAttendanceDay, AbsenceDetail } from '@/models/attendance.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosCard, IosEmptyState } from '@/components/ios/ios-ui'
import { getAttendanceTypeStyle } from '@/utils/badge.util'
import { formatPolishDayDate } from '@/utils/date.util'
import { formatSubjectName } from '@/utils/text.util'
import { cn } from '@/utils/cn.util'

interface LegacyAttendanceViewProps {
  attendanceData: AttendanceResult
  showFullSubjectNames?: boolean
  lang?: AppLanguage
  t: AppDictionary
  onSubViewChange?: (isOpen: boolean) => void
}

interface LegacyAttendanceScreenProps extends LegacyAttendanceViewProps {
  isOpen: boolean
  onClose: () => void
}

export function LegacyAttendanceView({
  attendanceData,
  showFullSubjectNames = false,
  lang = 'pl',
  t,
  onSubViewChange
}: LegacyAttendanceViewProps) {
  const [activeDay, setActiveDay] = useState<LegacyAttendanceDay | null>(null)
  const [cachedDay, setCachedDay] = useState<LegacyAttendanceDay | null>(null)

  const table = attendanceData.legacyTable

  const days: LegacyAttendanceDay[] = useMemo(() => {
    if (table?.days && table.days.length > 0) {
      return table.days.filter((day) =>
        Object.values(day.lessons || {}).some((lesson) => lesson.type !== 'ob')
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

  const lessonCols = useMemo(() => {
    let minCol = 1
    let maxCol = 8
    for (const day of days) {
      for (const k of Object.keys(day.lessons)) {
        const n = Number(k)
        if (!isNaN(n)) {
          if (n < minCol) minCol = n
          if (n > maxCol) maxCol = n
        }
      }
    }
    const cols: number[] = []
    for (let i = minCol; i <= Math.min(maxCol, 10); i++) {
      cols.push(i)
    }
    return cols
  }, [days])

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
    onSubViewChange?.(true)
  }

  const handleCloseDay = () => {
    setActiveDay(null)
    onSubViewChange?.(false)
    setTimeout(() => {
      setCachedDay(null)
    }, 350)
  }

  const displayDay = activeDay || cachedDay

  const activeDayAbsences = useMemo(() => {
    if (!displayDay) return []
    return getAbsencesForDay(displayDay.isoDate, displayDay.date)
  }, [displayDay, attendanceData])

  const statItems = [
    { label: 'nb', value: summary.nu, isAlert: summary.nu > 0 },
    { label: 'usp', value: summary.u, isAlert: false },
    { label: 'sp', value: summary.sp, isAlert: false },
    { label: 'sL', value: summary.sl, isAlert: false },
    { label: 'zw', value: summary.zw, isAlert: false }
  ]

  return (
    <>
      <div className="flex flex-col gap-3.5 pb-16 select-none w-full">
        <IosCard className="p-3.5 grid grid-cols-5 gap-1.5 text-center">
          {statItems.map((st) => (
            <div key={st.label} className="flex flex-col items-center justify-center py-1.5 rounded-[14px] bg-[var(--bg-card-secondary)]">
              <span className="text-[11px] font-medium text-[var(--ios-secondary)] leading-none">
                {st.label}
              </span>
              <span className={cn(
                'text-[19px] font-semibold tabular-nums mt-1.5 leading-none',
                st.isAlert
                  ? 'text-[var(--ios-red)]'
                  : st.value > 0
                    ? 'text-[var(--ios-label)]'
                    : 'text-[var(--ios-tertiary)] font-normal'
              )}>
                {st.value}
              </span>
            </div>
          ))}
        </IosCard>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium uppercase text-[var(--ios-secondary)] tracking-[0.02em] px-4 pt-1 select-none">
            {lang === 'en' ? 'Attendance History' : 'Historia obecności'}
          </span>

          {days.length > 0 ? (
            <IosCard className="overflow-hidden divide-y">
              {days.map((day) => {
                const dateInfo = formatPolishDayDate(day.isoDate, lang)
                return (
                  <div
                    key={day.date}
                    onClick={() => handleOpenDay(day)}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col w-[52px] shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[15px] font-semibold text-[var(--ios-label)] leading-none tabular-nums">
                          {dateInfo.dayNum}
                        </span>
                        <span className="text-[11px] font-normal text-[var(--ios-secondary)]">
                          {dateInfo.monthName}
                        </span>
                      </div>
                      <span className="text-[11px] font-normal text-[var(--ios-tertiary)] mt-0.5 leading-none">
                        {dateInfo.weekday}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 flex-1 min-w-0 items-center">
                      {lessonCols.map((col) => {
                        const lesson = day.lessons[col]
                        if (!lesson) {
                          return (
                            <div
                              key={col}
                              className="w-[22px] sm:w-[24px] h-[24px] rounded-[7px] bg-[var(--bg-card-secondary)] flex items-center justify-center text-[10px] text-[var(--ios-quaternary)] font-medium tabular-nums shrink-0"
                            >
                              {col}
                            </div>
                          )
                        }

                        const style = getAttendanceTypeStyle(lesson.type)
                        const isEmphasized = lesson.type === 'nb' || lesson.type === 'sp' || lesson.type === 'sl'

                        return (
                          <div
                            key={col}
                            className={cn(
                              'w-[22px] sm:w-[24px] h-[24px] rounded-[7px] flex items-center justify-center text-[10px] leading-none tracking-tight shrink-0',
                              style.bgClass,
                              style.textClass,
                              isEmphasized ? 'font-semibold' : 'font-medium'
                            )}
                          >
                            {lesson.symbol}
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 min-w-[34px] shrink-0">
                      <span className={cn(
                        'text-[13px] font-semibold tabular-nums',
                        day.nuCount > 0 ? 'text-[var(--ios-red)]' : 'text-[var(--ios-secondary)]'
                      )}>
                        {day.totalCount}
                      </span>
                      <svg className="w-3.5 h-3.5 text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </IosCard>
          ) : (
            <IosEmptyState
              inCard
              icon={<Calendar className="w-[22px] h-[22px]" strokeWidth={1.9} />}
              iconTone="green"
              title={t.noAbsencesRecorded}
            />
          )}
        </div>
      </div>

      <IosScreen
        isOpen={Boolean(activeDay)}
        onClose={handleCloseDay}
        title={displayDay ? displayDay.date : ''}
        backLabel={lang === 'en' ? 'Journal' : 'Dziennik'}
        showBackButton={true}
        isSubView={true}
        className="z-[70]"
      >
        <div className="flex flex-col gap-3 pb-16 select-none w-full">
          {displayDay && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium uppercase text-[var(--ios-secondary)] tracking-[0.02em] px-4 select-none">
                {lang === 'en' ? 'Lessons & Absences' : 'Lekcje w tym dniu'}
              </span>

              <IosCard className="overflow-hidden divide-y">
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

                      {(() => {
                        const badgeStyle = getAttendanceTypeStyle(
                          item.type === 'nb' && !item.isUnexcused ? 'u' : item.type
                        )
                        return (
                          <span className={cn(
                            'text-[12px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 tabular-nums',
                            badgeStyle.bgClass,
                            badgeStyle.textClass
                          )}>
                            {item.type === 'sl' ? 'sL' : item.type.toUpperCase()}
                          </span>
                        )
                      })()}
                    </div>
                  ))
                ) : (
                  <IosEmptyState
                    compact
                    icon={<Calendar className="w-[20px] h-[20px]" strokeWidth={1.9} />}
                    title={t.noAbsencesRecorded}
                  />
                )}
              </IosCard>
            </div>
          )}
        </div>
      </IosScreen>
    </>
  )
}

export function LegacyAttendanceScreen({
  isOpen,
  onClose,
  attendanceData,
  showFullSubjectNames = false,
  lang = 'pl',
  t
}: LegacyAttendanceScreenProps) {
  const [isDaySubViewOpen, setIsDaySubViewOpen] = useState(false)

  return (
    <IosScreen
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'en' ? 'Attendance Table' : 'Tabela obecności'}
      backLabel={t.attendance || t.backAction}
      showBackButton={true}
      isSubView={true}
      isReceded={isDaySubViewOpen}
      className="z-[60]"
    >
      <LegacyAttendanceView
        attendanceData={attendanceData}
        showFullSubjectNames={showFullSubjectNames}
        lang={lang}
        t={t}
        onSubViewChange={setIsDaySubViewOpen}
      />
    </IosScreen>
  )
}
