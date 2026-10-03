'use client'

import { useRef } from 'react'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'
import { AppDictionary } from '@/config/dictionary.config'

interface ScheduleWidgetProps {
    timetableData: SmartTimetableResult
    selectedDay: string
    onSelectDay: (day: string) => void
    currentWeekPivot: string
    onShiftWeek: (deltaDays: number) => void
    onSelectDate: (dateIso: string) => void
    onManualRefresh: () => void
    isLoadingWeek: boolean
    t: AppDictionary
}

export function ScheduleWidget({
    timetableData,
    selectedDay,
    onSelectDay,
    currentWeekPivot,
    onShiftWeek,
    onSelectDate,
    onManualRefresh,
    isLoadingWeek,
    t
}: ScheduleWidgetProps) {
    const dateInputRef = useRef<HTMLInputElement>(null)

    const currentDaySchedule: DaySchedule | undefined = timetableData.schedule.find(
        (d) => d.dayName === selectedDay
    )

    const formatWeekRange = (startIso: string, endIso: string) => {
        const sParts = (startIso || '').split('-')
        const eParts = (endIso || '').split('-')
        if (sParts.length === 3 && eParts.length === 3) {
            return `${sParts[2]}.${sParts[1]} — ${eParts[2]}.${eParts[1]}.${eParts[0]}`
        }
        return `${startIso} — ${endIso}`
    }

    return (
        <section className="flex flex-col gap-3 min-h-[540px]">
            <div className="bg-white rounded-3xl p-3 border border-[#e5e5ea] shadow-xs flex items-center justify-between">
                <button
                    onClick={() => onShiftWeek(-7)}
                    className="w-9 h-9 rounded-2xl bg-[#f2f2f7] text-[#1c1c1e] font-black text-sm flex items-center justify-center active:scale-95 transition-transform shrink-0"
                >
                    ‹
                </button>

                <div className="flex items-center gap-1.5 overflow-hidden px-1">
                    <span className="text-xs font-black text-[#1c1c1e] truncate">
                        {formatWeekRange(timetableData.weekStart, timetableData.weekEnd)}
                    </span>

                    <input
                        ref={dateInputRef}
                        type="date"
                        value={currentWeekPivot}
                        onChange={(e) => {
                            if (e.target.value) {
                                onSelectDate(e.target.value)
                            }
                        }}
                        className="sr-only"
                    />

                    <button
                        onClick={() => {
                            if (dateInputRef.current) {
                                if (typeof dateInputRef.current.showPicker === 'function') {
                                    dateInputRef.current.showPicker()
                                } else {
                                    dateInputRef.current.click()
                                }
                            }
                        }}
                        className="w-7 h-7 rounded-xl bg-[#f2f2f7] text-[#1c1c1e] flex items-center justify-center text-xs active:scale-90 transition-transform shrink-0"
                    >
                        📅
                    </button>

                    <button
                        onClick={onManualRefresh}
                        disabled={isLoadingWeek}
                        className="w-7 h-7 rounded-xl bg-[#f2f2f7] text-[#1c1c1e] flex items-center justify-center text-xs active:scale-90 transition-transform disabled:opacity-40 shrink-0"
                    >
                        ↻
                    </button>
                </div>

                <button
                    onClick={() => onShiftWeek(7)}
                    className="w-9 h-9 rounded-2xl bg-[#f2f2f7] text-[#1c1c1e] font-black text-sm flex items-center justify-center active:scale-95 transition-transform shrink-0"
                >
                    ›
                </button>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
                {timetableData.schedule.map((day) => (
                    <button
                        key={day.dayName}
                        onClick={() => onSelectDay(day.dayName)}
                        className={`h-14 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${selectedDay === day.dayName
                                ? 'bg-[#1c1c1e] text-white shadow-xs'
                                : 'bg-white text-[#8e8e93] border border-[#e5e5ea]'
                            }`}
                    >
                        <span>{day.dayName.slice(0, 3)}</span>
                        <span className="text-[10px] opacity-75">
                            {day.date ? day.date.split('.')[0] : ''}
                        </span>
                    </button>
                ))}
            </div>

            {isLoadingWeek ? (
                <div className="bg-white rounded-3xl p-16 border border-[#e5e5ea] flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-[#1c1c1e] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-[#8e8e93]">{t.loadingTimetable}</p>
                </div>
            ) : (
                <>
                    {currentDaySchedule && currentDaySchedule.events && currentDaySchedule.events.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            {currentDaySchedule.events.map((ev, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${ev.category === 'holiday'
                                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                                            : ev.category === 'exam'
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                : 'bg-blue-50 text-blue-800 border-blue-200'
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                                    <p>{ev.title}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                        {currentDaySchedule && currentDaySchedule.lessons && currentDaySchedule.lessons.length > 0 ? (
                            currentDaySchedule.lessons.map((lesson) => (
                                <article
                                    key={`${lesson.number}-${lesson.subject}-${lesson.time}`}
                                    className="bg-white rounded-3xl p-4 border border-[#e5e5ea] shadow-xs flex flex-col gap-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-[#8e8e93] bg-[#f2f2f7] px-2.5 py-1 rounded-lg">
                                                {lesson.time}
                                            </span>
                                            {lesson.lessonCount && lesson.lessonCount > 1 && (
                                                <span className="text-[10px] font-bold text-[#007aff] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                    {lesson.lessonCount}x
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {lesson.isShortened && (
                                                <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                                                    {lesson.durationMinutes} min
                                                </span>
                                            )}
                                            {lesson.isCancelled && (
                                                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                                                    Cancelled
                                                </span>
                                            )}
                                            {lesson.isSubstitution && (
                                                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                                                    Substitution
                                                </span>
                                            )}
                                            {lesson.teacherAbsent && (
                                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                                    Teacher Absent
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-2">
                                        <h2 className="text-base font-bold text-[#1c1c1e] leading-snug">
                                            {lesson.subject}
                                        </h2>
                                        {lesson.room && (
                                            <span className="text-xs font-bold text-[#007aff] bg-blue-50 px-2.5 py-1 rounded-lg shrink-0">
                                                {lesson.room}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs font-medium text-[#8e8e93]">
                                        {lesson.teacher || 'No teacher specified'}
                                    </p>
                                </article>
                            ))
                        ) : (
                            <div className="bg-white rounded-3xl p-10 border border-[#e5e5ea] text-center text-[#8e8e93] text-sm font-medium flex flex-col items-center gap-1">
                                <p className="font-bold text-[#1c1c1e]">{t.noLessonsDay}</p>
                                <p className="text-xs opacity-75">{t.vacationDay}</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    )
}