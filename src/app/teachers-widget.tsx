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
        <section className="flex flex-col gap-3 min-h-[520px]">
            <div className="bg-white rounded-3xl p-3.5 border border-[#e5e5ea] shadow-xs flex flex-col gap-2.5">
                <input
                    type="text"
                    placeholder={t.searchTeacher}
                    value={teacherSearch}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
                />

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={selectedCalendarDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="flex-1 bg-[#f2f2f7] text-[#1c1c1e] text-xs font-medium rounded-xl px-3 py-2 outline-none cursor-pointer"
                    />
                    <button
                        onClick={onToggleShowAllDates}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${showAllDates
                                ? 'bg-[#1c1c1e] text-white shadow-xs'
                                : 'bg-[#f2f2f7] text-[#8e8e93]'
                            }`}
                    >
                        {t.allDates}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-2.5">
                {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((absence, idx) => (
                        <article
                            key={`${absence.teacher}-${absence.date}-${idx}`}
                            className="bg-white rounded-3xl p-4 border border-[#e5e5ea] shadow-xs flex flex-col gap-2"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-[#1c1c1e]">{absence.teacher}</h3>
                                {absence.isRelevantToStudent && (
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                                        {t.myTeacher}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-[#8e8e93]">
                                <span className="font-semibold bg-[#f2f2f7] px-2.5 py-1 rounded-lg text-[#1c1c1e]">
                                    {absence.date}
                                </span>
                                <span className="font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                                    {absence.reason}
                                </span>
                            </div>
                        </article>
                    ))
                ) : (
                    <div className="bg-white rounded-3xl p-8 border border-[#e5e5ea] text-center text-[#8e8e93] text-sm font-medium">
                        {t.noAbsencesToday}
                    </div>
                )}
            </div>
        </section>
    )
}