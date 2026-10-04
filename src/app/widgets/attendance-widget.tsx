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
    const isDanger = attendanceData.overallStatus === 'danger'
    const isWarning = attendanceData.overallStatus === 'warning'

    return (
        <section className="w-full flex flex-col gap-3 min-h-[540px]">
            <div className="bg-[var(--bg-card)] rounded-3xl p-5 border border-[var(--border-subtle)] shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.attendanceRate}</p>
                        <h2 className={`text-4xl font-black tracking-tight mt-1 ${isDanger
                                ? 'text-rose-600 dark:text-rose-400'
                                : isWarning
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-[var(--text-primary)]'
                            }`}>
                            {attendanceData.overallPercentage}%
                        </h2>
                    </div>

                    <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${isDanger
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                            : isWarning
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        }`}>
                        {isDanger ? t.dangerBadge : isWarning ? t.warningBadge : t.safeBadge}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[var(--border-subtle)] text-xs">
                    <div className="bg-[var(--bg-element)] p-3 rounded-2xl flex flex-col justify-between">
                        <p className="text-[var(--text-secondary)] font-medium">{t.safeToMiss}</p>
                        <p className="font-black text-[var(--text-primary)] text-base mt-1">
                            {attendanceData.safeAbsencesRemaining} {t.lessons}
                        </p>
                    </div>
                    <div className="bg-[var(--bg-element)] p-3 rounded-2xl flex flex-col justify-between">
                        <p className="text-[var(--text-secondary)] font-medium">{t.neededToRecover}</p>
                        <p className="font-black text-[var(--text-primary)] text-base mt-1">
                            {attendanceData.lessonsToRecover} {t.lessons}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                {attendanceData.subjects.map((sub) => {
                    const subDanger = sub.status === 'danger'
                    const subWarning = sub.status === 'warning'

                    return (
                        <article
                            key={sub.subject}
                            onClick={() => onSelectSubject(sub)}
                            className="bg-[var(--bg-card)] rounded-3xl p-4 border border-[var(--border-subtle)] shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                        >
                            <div className="pr-3">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-[var(--text-primary)]">{sub.subject}</h4>
                                    {sub.unexcusedCount > 0 && (
                                        <span className="text-[10px] font-bold bg-rose-500/15 text-rose-600 px-2 py-0.5 rounded-full border border-rose-500/20">
                                            {sub.unexcusedCount} nb
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                    {t.missedOf(sub.absentLessons, sub.totalLessons)}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${subDanger
                                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                        : subWarning
                                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                            : 'bg-[var(--bg-element)] text-[var(--text-primary)] border-transparent'
                                    }`}>
                                    {sub.percentage}%
                                </span>
                                <span className="text-xs text-[var(--text-secondary)] font-bold">›</span>
                            </div>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}