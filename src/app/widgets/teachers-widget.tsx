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
            <div className="bg-[#f2f2f7] rounded-2xl p-3 flex flex-col gap-2">
                <input
                    type="text"
                    placeholder={t.searchTeacher}
                    value={teacherSearch}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-white text-[#1c1c1e] text-xs font-medium rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#007aff]"
                />

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={selectedCalendarDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="flex-1 bg-white text-[#1c1c1e] text-xs font-medium rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                    />
                    <button
                        type="button"
                        onClick={onToggleShowAllDates}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${showAllDates
                                ? 'bg-[#1c1c1e] text-white shadow-xs'
                                : 'bg-white text-[#8e8e93]'
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
                            className="bg-[#f2f2f7] rounded-2xl p-3 flex flex-col gap-1.5"
                        >
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-[#1c1c1e]">{absence.teacher}</h4>
                                {absence.isRelevantToStudent && (
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                        {t.myTeacher}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-[#8e8e93]">
                                <span className="font-semibold bg-white px-2 py-0.5 rounded-md text-[#1c1c1e]">
                                    {absence.date}
                                </span>
                                <span className="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                    {absence.reason}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-[#f2f2f7] rounded-2xl p-6 text-center text-[#8e8e93] text-xs font-medium">
                        {t.noAbsencesToday}
                    </div>
                )}
            </div>
        </div>
    )
}