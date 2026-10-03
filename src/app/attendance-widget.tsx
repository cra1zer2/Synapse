'use client'

import { AttendanceResult, SubjectAttendance } from '@/models/attendance.model'
import { AppDictionary } from '@/config/dictionary.config'

interface AttendanceWidgetProps {
    attendanceData: AttendanceResult
    onSelectSubject: (sub: SubjectAttendance) => void
    t: AppDictionary
}

export function AttendanceWidget({
    attendanceData,
    onSelectSubject,
    t
}: AttendanceWidgetProps) {
    return (
        <section className="flex flex-col gap-3 min-h-[520px]">
            <div className="bg-white rounded-3xl p-5 border border-[#e5e5ea] shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-wider">{t.attendanceRate}</p>
                        <h2 className={`text-3xl font-black mt-0.5 ${attendanceData.overallStatus === 'danger'
                                ? 'text-rose-600'
                                : attendanceData.overallStatus === 'warning'
                                    ? 'text-amber-600'
                                    : 'text-[#1c1c1e]'
                            }`}>
                            {attendanceData.overallPercentage}%
                        </h2>
                    </div>

                    <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${attendanceData.overallStatus === 'danger'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : attendanceData.overallStatus === 'warning'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                        {attendanceData.overallStatus === 'danger'
                            ? t.dangerBadge
                            : attendanceData.overallStatus === 'warning'
                                ? t.warningBadge
                                : t.safeBadge}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e5e5ea] text-xs">
                    <div className="bg-[#f2f2f7] p-2.5 rounded-xl">
                        <p className="text-[#8e8e93] font-medium">{t.safeToMiss}</p>
                        <p className="font-black text-[#1c1c1e] text-sm mt-0.5">
                            {attendanceData.safeAbsencesRemaining} {t.lessons}
                        </p>
                    </div>
                    <div className="bg-[#f2f2f7] p-2.5 rounded-xl">
                        <p className="text-[#8e8e93] font-medium">{t.neededToRecover}</p>
                        <p className="font-black text-[#1c1c1e] text-sm mt-0.5">
                            {attendanceData.lessonsToRecover} {t.lessons}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                {attendanceData.subjects.map((sub) => (
                    <article
                        key={sub.subject}
                        onClick={() => onSelectSubject(sub)}
                        className="bg-white rounded-3xl p-4 border border-[#e5e5ea] shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                    >
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h4 className="text-sm font-bold text-[#1c1c1e]">{sub.subject}</h4>
                                {sub.unexcusedCount > 0 && (
                                    <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                                        {sub.unexcusedCount} nb
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-[#8e8e93] mt-0.5">
                                {t.missedOf(sub.absentLessons, sub.totalLessons)}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${sub.status === 'danger'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : sub.status === 'warning'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-[#f2f2f7] text-[#1c1c1e] border-transparent'
                                }`}>
                                {sub.percentage}%
                            </span>
                            <span className="text-xs text-[#8e8e93]">›</span>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}