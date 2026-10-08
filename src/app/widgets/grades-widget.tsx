'use client'

import { GradesResult, GradeItem, SubjectGrades } from '@/models/grade.model'
import { AppDictionary } from '@/config/dictionary.config'

interface GradesWidgetProps {
    gradesData: GradesResult
    ignoreGradeModifiers?: boolean
    onSelectGrade: (grade: GradeItem) => void
    onSelectWarning: (sub: SubjectGrades) => void
    t: AppDictionary
}

function parseGradeValue(gradeStr: string, ignoreModifiers: boolean): number | null {
    const clean = gradeStr.trim().toLowerCase()
    if (!clean || clean === 'np' || clean === 'bz' || clean === '+' || clean === '-') {
        return null
    }

    const baseValues: Record<string, number> = {
        '6': 6,
        '5': 5,
        '4': 4,
        '3': 3,
        '2': 2,
        '1': 1
    }

    const baseChar = clean[0]
    if (!(baseChar in baseValues)) {
        return null
    }

    let val = baseValues[baseChar]
    if (!ignoreModifiers) {
        if (clean.includes('+')) val += 0.5
        else if (clean.includes('-')) val -= 0.25
    }

    return val
}

function calculateWeightedAverage(grades: GradeItem[], ignoreModifiers: boolean): number | null {
    let totalScore = 0
    let totalWeight = 0

    for (const item of grades) {
        const numeric = parseGradeValue(item.grade, ignoreModifiers)
        if (numeric !== null && item.weight > 0) {
            totalScore += numeric * item.weight
            totalWeight += item.weight
        }
    }

    if (totalWeight === 0) {
        return null
    }

    return Math.round((totalScore / totalWeight) * 100) / 100
}

export function GradesWidget({
    gradesData,
    ignoreGradeModifiers = false,
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

    let totalSubjectAverages = 0
    let evaluatedCount = 0

    const subjectsWithCalculatedAverages = gradesData.subjects.map((sub) => {
        if (!ignoreGradeModifiers) {
            if (sub.finalAverage !== null) {
                totalSubjectAverages += sub.finalAverage
                evaluatedCount++
            }
            return sub
        }

        const avg1 = calculateWeightedAverage(sub.semester1, true)
        const avg2 = calculateWeightedAverage(sub.semester2, true)
        let finalAvg: number | null = null

        if (avg2 !== null && avg1 !== null) {
            finalAvg = Math.round(((avg1 + avg2) / 2) * 100) / 100
        } else {
            finalAvg = avg2 ?? avg1
        }

        if (finalAvg !== null) {
            totalSubjectAverages += finalAvg
            evaluatedCount++
        }

        return {
            ...sub,
            finalAverage: finalAvg
        }
    })

    const displayOverallAverage = ignoreGradeModifiers
        ? evaluatedCount > 0
            ? Math.round((totalSubjectAverages / evaluatedCount) * 100) / 100
            : '—'
        : gradesData.overallAverage ?? '—'

    return (
        <section className="w-full flex flex-col gap-4 min-h-[500px]">
            <div className="bg-[var(--ios-card)] rounded-[18px] p-4 shadow-xs flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-[var(--ios-secondary)]">{t.gpaTitle}</p>
                    <h2 className="text-3xl font-semibold text-[var(--ios-label)] tracking-tight mt-0.5">
                        {displayOverallAverage}
                    </h2>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-[var(--ios-secondary)] uppercase tracking-wider px-1">
                    {t.partialGradesTitle}
                </span>

                <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                    {subjectsWithCalculatedAverages.map((sub) => (
                        <article key={sub.subject} className="p-3.5 flex flex-col gap-2.5">
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