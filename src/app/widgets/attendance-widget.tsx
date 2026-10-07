'use client'

import { AttendanceResult, SubjectAttendance } from '@/models/attendance.model'
import { AppDictionary } from '@/config/dictionary.config'

interface AttendanceWidgetProps {
    attendanceData: AttendanceResult
    onSelectSubject: (sub: SubjectAttendance) => void
    onOpenExcuseModal: () => void
    t: AppDictionary
}

function formatMissedLabel(absent: number, total: number): string {
    if (absent === 0) {
        return `0 opuszczonych z ${total}`
    }
    if (absent === 1) {
        return `1 opuszczona z ${total}`
    }
    const lastTwo = absent % 100
    const last = absent % 10
    if (lastTwo >= 12 && lastTwo <= 14) {
        return `${absent} opuszczonych z ${total}`
    }
    if (last >= 2 && last <= 4) {
        return `${absent} opuszczone z ${total}`
    }
    return `${absent} opuszczonych z ${total}`
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

    const sortedSubjects = [...attendanceData.subjects].sort((a, b) => {
        if (a.unexcusedCount > 0 && b.unexcusedCount === 0) return -1
        if (b.unexcusedCount > 0 && a.unexcusedCount === 0) return 1
        if (a.percentage !== b.percentage) return a.percentage - b.percentage
        if (a.absentLessons > 0 && b.absentLessons === 0) return -1
        if (b.absentLessons > 0 && a.absentLessons === 0) return 1
        return a.subject.localeCompare(b.subject)
    })

    return (
        <section className="w-full flex flex-col gap-3 min-h-[500px]">
            {attendanceData.unexcusedAbsences.length > 0 && (
                <div className="bg-[#ff3b30]/10 rounded-[18px] p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#ff3b30] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                            !
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#ff3b30] tracking-tight">Nieusprawiedliwione godziny</p>
                            <p className="text-[11px] font-normal text-[#ff3b30]/80 truncate">
                                {attendanceData.unexcusedAbsences.length} {attendanceData.unexcusedAbsences.length === 1 ? 'lekcja' : 'lekcji'} do usprawiedliwienia
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onOpenExcuseModal}
                        className="text-xs font-semibold bg-[#ff3b30] text-white px-3 py-1.5 rounded-full shadow-xs active:scale-95 transition-transform shrink-0"
                    >
                        {t.excuseAction}
                    </button>
                </div>
            )}

            <div className="bg-[var(--ios-card)] rounded-[18px] p-4 shadow-xs flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-[var(--ios-secondary)]">{t.attendanceRate}</p>
                    <h2 className={`text-3xl font-semibold tracking-tight mt-0.5 ${statusColor}`}>
                        {attendanceData.overallPercentage}%
                    </h2>
                </div>

                <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDanger
                        ? 'bg-[#ff3b30]/15 text-[#ff3b30]'
                        : isWarning
                            ? 'bg-[#ff9500]/15 text-[#ff9500]'
                            : 'bg-[#34c759]/15 text-[#34c759]'
                        }`}
                >
                    {isDanger ? t.dangerBadge : isWarning ? t.warningBadge : t.safeBadge}
                </span>
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-[var(--ios-secondary)] uppercase tracking-wider px-1">
                    Przedmioty
                </span>

                <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                    {sortedSubjects.map((sub) => {
                        const subDanger = sub.status === 'danger'
                        const subWarning = sub.status === 'warning'

                        return (
                            <article
                                key={sub.subject}
                                onClick={() => onSelectSubject(sub)}
                                className="p-3.5 flex items-center justify-between cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors"
                            >
                                <div className="pr-2 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="text-xs font-semibold text-[var(--ios-label)] truncate leading-tight">
                                            {sub.subject}
                                        </h4>
                                        {sub.unexcusedCount > 0 && (
                                            <span className="text-[9px] font-semibold bg-[#ff3b30]/15 text-[#ff3b30] px-1.5 py-0.5 rounded-full shrink-0">
                                                {sub.unexcusedCount} nb
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] font-normal text-[var(--ios-secondary)] mt-0.5">
                                        {formatMissedLabel(sub.absentLessons, sub.totalLessons)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${subDanger
                                            ? 'bg-[#ff3b30]/15 text-[#ff3b30]'
                                            : subWarning
                                                ? 'bg-[#ff9500]/15 text-[#ff9500]'
                                                : 'text-[var(--ios-label)]'
                                            }`}
                                    >
                                        {sub.percentage}%
                                    </span>
                                    <span className="text-xs text-[var(--ios-secondary)] font-medium">›</span>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}