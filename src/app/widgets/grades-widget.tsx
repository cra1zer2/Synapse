'use client'

import { GradesResult, GradeItem, SubjectGrades } from '@/models/grade.model'
import { AppDictionary } from '@/config/dictionary.config'

interface GradesWidgetProps {
    gradesData: GradesResult
    onSelectGrade: (grade: GradeItem) => void
    onSelectWarning: (sub: SubjectGrades) => void
    t: AppDictionary
}

export function GradesWidget({
    gradesData,
    onSelectGrade,
    onSelectWarning,
    t
}: GradesWidgetProps) {
    const getBadgeStyle = (num: number | null) => {
        if (num === null) return 'bg-[var(--ios-element)] text-[var(--ios-secondary)]'
        if (num >= 5) return 'bg-[#34c759]/15 text-[#34c759]'
        if (num >= 4) return 'bg-[#007aff]/15 text-[#007aff]'
        if (num >= 3) return 'bg-[#ff9500]/15 text-[#ff9500]'
        return 'bg-[#ff3b30]/15 text-[#ff3b30]'
    }

    return (
        <section className="w-full flex flex-col gap-4 min-h-[500px]">
            <div className="bg-[var(--ios-card)] rounded-[22px] p-4.5 shadow-xs flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-[var(--ios-secondary)]">Średnia ocen (GPA)</p>
                    <h2 className="text-3xl font-semibold text-[var(--ios-label)] tracking-tight mt-0.5">
                        {gradesData.overallAverage ?? '—'}
                    </h2>
                </div>
                <span className="text-xs font-semibold text-[var(--ios-blue)] bg-[var(--ios-blue)]/10 px-3 py-1 rounded-full">
                    {gradesData.subjects.length} przedmiotów
                </span>
            </div>

            <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-semibold text-[var(--ios-secondary)] uppercase tracking-wider px-1">
                    Oceny cząstkowe
                </p>

                <div className="bg-[var(--ios-card)] rounded-[22px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                    {gradesData.subjects.map((sub) => (
                        <article key={sub.subject} className="p-4 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <h4 className="text-xs font-semibold text-[var(--ios-label)]">{sub.subject}</h4>
                                    {sub.warning && (
                                        <button
                                            onClick={() => onSelectWarning(sub)}
                                            className="text-[9px] font-semibold bg-[#ff3b30]/15 text-[#ff3b30] px-1.5 py-0.5 rounded-full"
                                        >
                                            &lt; 2.0
                                        </button>
                                    )}
                                </div>

                                {sub.finalAverage !== null && (
                                    <span className="text-xs font-semibold text-[var(--ios-label)]">
                                        {sub.finalAverage}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {sub.semester1.concat(sub.semester2).map((item, idx) => (
                                    <button
                                        key={`${item.grade}-${item.date}-${idx}`}
                                        onClick={() => onSelectGrade(item)}
                                        className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-transform active:scale-95 ${getBadgeStyle(
                                            item.numericValue
                                        )}`}
                                    >
                                        {item.grade}
                                    </button>
                                ))}
                                {sub.semester1.length === 0 && sub.semester2.length === 0 && (
                                    <span className="text-xs font-normal text-[var(--ios-secondary)]">{t.noGradesRecorded}</span>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}