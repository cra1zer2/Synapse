'use client'

import { AbsentTeacherItem } from '@/models/timetable.model'
import { AppDictionary } from '@/config/dictionary.config'

interface TeachersWidgetProps {
    allAbsentTeachers: AbsentTeacherItem[]
    teacherSearch: string
    onSearchChange: (val: string) => void
    selectedCalendarDate: string
    onDateChange: (val: string) => void
    showAllDates: boolean
    onToggleShowAllDates: () => void
    t: AppDictionary
}

export function TeachersWidget({
    allAbsentTeachers,
    teacherSearch,
    onSearchChange,
    selectedCalendarDate,
    onDateChange,
    showAllDates,
    onToggleShowAllDates,
    t
}: TeachersWidgetProps) {
    const filteredTeachers = allAbsentTeachers.filter((item) => {
        const matchesSearch = teacherSearch === '' || item.teacher.toLowerCase().includes(teacherSearch.toLowerCase())
        if (showAllDates) {
            return matchesSearch
        }
        const matchesDate = item.isoDate === selectedCalendarDate
        return matchesSearch && matchesDate
    })

    return (
        <div className="w-full flex flex-col gap-3">
            <div className="bg-[var(--ios-card)] rounded-[20px] p-3.5 shadow-xs border border-[var(--ios-separator)]/60 flex flex-col gap-2.5">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        placeholder={t.searchTeacher}
                        value={teacherSearch}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-[var(--ios-element)]/60 text-[var(--ios-label)] placeholder-[var(--ios-secondary)] text-xs font-normal rounded-[12px] px-3.5 py-2 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={selectedCalendarDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="flex-1 bg-[var(--ios-element)]/60 text-[var(--ios-label)] text-xs font-medium rounded-[12px] px-3 py-1.5 outline-none cursor-pointer border border-transparent focus:border-[var(--ios-blue)] transition-all"
                    />
                    <button
                        type="button"
                        onClick={onToggleShowAllDates}
                        className={`px-3 py-1.5 rounded-[12px] text-xs font-medium transition-all active:scale-95 ${showAllDates
                                ? 'bg-[var(--ios-blue)] text-white shadow-xs'
                                : 'bg-[var(--ios-element)]/60 text-[var(--ios-secondary)] hover:text-[var(--ios-label)]'
                            }`}
                    >
                        {t.allDates}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((absence, idx) => (
                        <div
                            key={`${absence.teacher}-${absence.date}-${idx}`}
                            className="bg-[var(--ios-card)] rounded-[16px] p-3.5 shadow-xs border border-[var(--ios-separator)]/60 flex flex-col gap-2"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="text-xs font-semibold text-[var(--ios-label)] truncate">{absence.teacher}</h4>
                                {absence.isRelevantToStudent && (
                                    <span className="text-[10px] font-semibold text-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] px-2 py-0.5 rounded-full shrink-0">
                                        {t.myTeacher}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-[var(--ios-secondary)]">
                                <span className="font-medium bg-[var(--ios-element)]/60 px-2 py-0.5 rounded-[6px] text-[var(--ios-label)]">
                                    {absence.date}
                                </span>
                                <span className="font-medium text-[var(--ios-orange)] bg-[var(--ios-orange-subtle)] px-2 py-0.5 rounded-[6px]">
                                    {absence.reason}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-[var(--ios-card)] rounded-[20px] p-6 text-center text-[var(--ios-secondary)] text-xs font-normal border border-[var(--ios-separator)]/60 shadow-xs">
                        {t.noAbsencesToday}
                    </div>
                )}
            </div>
        </div>
    )
}