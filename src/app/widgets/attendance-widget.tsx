'use client'

import { AttendanceResult, SubjectAttendance } from '@/models/attendance.model'
import { AppDictionary } from '@/config/dictionary.config'

interface AttendanceWidgetProps {
    attendanceData: AttendanceResult
    onSelectSubject: (sub: SubjectAttendance) => void
    onOpenExcuseModal: () => void
    t: AppDictionary
}

export function AttendanceWidget({
    attendanceData,
    onSelectSubject,
    onOpenExcuseModal,
    t
}: AttendanceWidgetProps) {
    const isDanger = attendanceData.overallStatus === 'danger'
    const isWarning = attendanceData.overallStatus === 'warning'

    const statusColor = isDanger
        ? 'text-[#ff3b30]'
        : isWarning
            ? 'text-[#ff9500]'
            : 'text-[#34c759]'

    return (
        <section className="w-full flex flex-col gap-4 min-h-[500px]">
            {attendanceData.unexcusedAbsences.length > 0 && (
                <div className="bg-[#ff3b30]/10 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#ff3b30] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            !
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#ff3b30]">Nieusprawiedliwione</p>
                            <p className="text-[11px] text-[#ff3b30]/80">
                                {attendanceData.unexcusedAbsences.length} lekcji wymaga usprawiedliwienia
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onOpenExcuseModal}
                        className="text-xs font-bold bg-[#ff3b30] text-white px-3 py-1.5 rounded-full shadow-xs active:scale-95 transition-transform"
                    >
                        Usprawiedliw
                    </button>
                </div>
            )}

            <div className="bg-[var(--ios-card)] rounded-2xl p-4 shadow-xs border border-[var(--ios-separator)]/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-[var(--ios-secondary)]">{t.attendanceRate}</p>
                        <h2 className={`text-4xl font-extrabold tracking-tight mt-0.5 ${statusColor}`}>
                            {attendanceData.overallPercentage}%
                        </h2>
                    </div>

                    <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${isDanger
                            ? 'bg-[#ff3b30]/10 text-[#ff3b30]'
                            : isWarning
                                ? 'bg-[#ff9500]/10 text-[#ff9500]'
                                : 'bg-[#34c759]/10 text-[#34c759]'
                            }`}
                    >
                        {isDanger ? t.dangerBadge : isWarning ? t.warningBadge : t.safeBadge}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--ios-separator)]/20">
                    <div className="bg-[var(--ios-bg)] p-2.5 rounded-xl">
                        <span className="text-[10px] font-medium text-[var(--ios-secondary)]">{t.safeToMiss}</span>
                        <p className="text-sm font-bold text-[var(--ios-label)] mt-0.5">
                            {attendanceData.safeAbsencesRemaining} {t.lessons}
                        </p>
                    </div>
                    <div className="bg-[var(--ios-bg)] p-2.5 rounded-xl">
                        <span className="text-[10px] font-medium text-[var(--ios-secondary)]">{t.neededToRecover}</span>
                        <p className="text-sm font-bold text-[var(--ios-label)] mt-0.5">
                            {attendanceData.lessonsToRecover} {t.lessons}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-bold text-[var(--ios-secondary)] uppercase tracking-wider px-1">
                    Przedmioty
                </p>

                <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)]/20 overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]/20">
                    {attendanceData.subjects.map((sub) => {
                        const subDanger = sub.status === 'danger'
                        const subWarning = sub.status === 'warning'

                        return (
                            <article
                                key={sub.subject}
                                onClick={() => onSelectSubject(sub)}
                                className="p-3.5 flex items-center justify-between cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors"
                            >
                                <div className="pr-2 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs font-semibold text-[var(--ios-label)] truncate">{sub.subject}</h4>
                                        {sub.unexcusedCount > 0 && (
                                            <span className="text-[9px] font-bold bg-[#ff3b30]/10 text-[#ff3b30] px-1.5 py-0.5 rounded-full">
                                                {sub.unexcusedCount} nb
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-[var(--ios-secondary)] mt-0.5">
                                        {t.missedOf(sub.absentLessons, sub.totalLessons)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span
                                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${subDanger
                                            ? 'bg-[#ff3b30]/10 text-[#ff3b30]'
                                            : subWarning
                                                ? 'bg-[#ff9500]/10 text-[#ff9500]'
                                                : 'text-[var(--ios-secondary)]'
                                            }`}
                                    >
                                        {sub.percentage}%
                                    </span>
                                    <span className="text-xs text-[var(--ios-tertiary)] font-bold">›</span>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}