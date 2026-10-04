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
    return (
        <section className="w-full flex flex-col gap-3 min-h-[540px]">
            <div className="bg-[var(--bg-card)] rounded-3xl p-5 border border-[var(--border-subtle)] shadow-xs flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Overall GPA</p>
                    <h2 className="text-3xl font-black text-[var(--text-primary)] mt-0.5">
                        {gradesData.overallAverage ?? 'N/A'}
                    </h2>
                </div>
                <span className="text-xs font-bold text-[#007aff] bg-blue-500/15 border border-blue-500/20 px-3 py-1.5 rounded-xl">
                    {gradesData.subjects.length} Subjects
                </span>
            </div>

            <div className="flex flex-col gap-2.5">
                {gradesData.subjects.map((sub) => (
                    <article
                        key={sub.subject}
                        className="bg-[var(--bg-card)] rounded-3xl p-4 border border-[var(--border-subtle)] shadow-xs flex flex-col gap-2.5"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">{sub.subject}</h3>
                                {sub.warning && (
                                    <button
                                        onClick={() => onSelectWarning(sub)}
                                        className="text-[10px] font-bold bg-rose-500/15 text-rose-500 px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse"
                                    >
                                        Risk &lt; 2.0
                                    </button>
                                )}
                            </div>

                            {sub.finalAverage !== null && (
                                <span className="text-xs font-black text-[var(--text-primary)] bg-[var(--bg-element)] px-2.5 py-1 rounded-lg">
                                    {sub.finalAverage}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {sub.semester1.concat(sub.semester2).map((item, idx) => (
                                <button
                                    key={`${item.grade}-${item.date}-${idx}`}
                                    onClick={() => onSelectGrade(item)}
                                    className="w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center border transition-transform active:scale-95 bg-[var(--bg-element)] text-[var(--text-primary)] border-[var(--border-subtle)]"
                                >
                                    {item.grade}
                                </button>
                            ))}
                            {sub.semester1.length === 0 && sub.semester2.length === 0 && (
                                <span className="text-xs text-[var(--text-secondary)]">{t.noGradesRecorded}</span>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}