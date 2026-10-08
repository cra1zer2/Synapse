'use client'

import { GradeItem, SubjectGrades } from '@/models/grade.model'
import { AppDictionary } from '@/config/dictionary.config'

interface GradeModalProps {
    selectedGrade: GradeItem | null
    selectedWarningSubject: SubjectGrades | null
    onCloseGrade: () => void
    onCloseWarning: () => void
    t: AppDictionary
}

export function GradeModal({
    selectedGrade,
    selectedWarningSubject,
    onCloseGrade,
    onCloseWarning,
    t
}: GradeModalProps) {
    if (selectedWarningSubject && selectedWarningSubject.warning) {
        return (
            <div
                onClick={onCloseWarning}
                className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[var(--ios-card)] text-[var(--ios-label)] rounded-t-[28px] sm:rounded-[28px] p-5 w-full max-w-sm border border-[var(--ios-separator)]/60 shadow-2xl flex flex-col gap-3.5"
                >
                    <div className="w-9 h-1 rounded-full bg-[var(--ios-element)] mx-auto -mt-1 mb-0.5 sm:hidden opacity-60 shrink-0" />

                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--ios-red)] bg-[var(--ios-red-subtle)] px-2.5 py-1 rounded-full">
                            {t.minimalEffortToFix}
                        </span>
                        <span className="text-sm font-semibold text-[var(--ios-label)]">
                            {t.currentAverage(selectedWarningSubject.finalAverage)}
                        </span>
                    </div>

                    <h3 className="text-base font-semibold text-[var(--ios-label)] tracking-tight">
                        {selectedWarningSubject.subject}
                    </h3>

                    {selectedWarningSubject.warning.status === 'done' ? (
                        <div className="bg-[var(--ios-red-subtle)] border border-[var(--ios-red)]/20 p-4 rounded-[16px] text-center">
                            <p className="text-base font-semibold text-[var(--ios-red)]">{t.youAreDone}</p>
                            <p className="text-xs text-[var(--ios-red)]/80 mt-1">{t.scoreTooDeep}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-[var(--ios-secondary)]">{t.recommendedTargets}</p>
                            {selectedWarningSubject.warning.fixOptions.map((opt, i) => (
                                <div key={i} className="bg-[var(--ios-element)]/45 p-2.5 rounded-[12px] text-xs font-medium text-[var(--ios-label)] flex items-center gap-2">
                                    <span className="text-[var(--ios-green)] font-semibold">✓</span>
                                    <span>{opt.description}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={onCloseWarning}
                        className="mt-1 w-full bg-[var(--ios-blue)] text-white text-xs font-semibold h-11 rounded-[12px] active:scale-[0.98] transition-all shadow-xs"
                    >
                        {t.gotIt}
                    </button>
                </div>
            </div>
        )
    }

    if (selectedGrade) {
        return (
            <div
                onClick={onCloseGrade}
                className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[var(--ios-card)] text-[var(--ios-label)] rounded-t-[28px] sm:rounded-[28px] p-5 w-full max-w-sm border border-[var(--ios-separator)]/60 shadow-2xl flex flex-col gap-3.5"
                >
                    <div className="w-9 h-1 rounded-full bg-[var(--ios-element)] mx-auto -mt-1 mb-0.5 sm:hidden opacity-60 shrink-0" />

                    <div className="flex items-center justify-between">
                        <span className="text-xl font-semibold px-3.5 py-1 rounded-[12px] bg-[var(--ios-element)] text-[var(--ios-label)]">
                            {selectedGrade.grade}
                        </span>
                        <span className="text-xs font-medium text-[var(--ios-secondary)] bg-[var(--ios-element)] px-2.5 py-1 rounded-full">
                            {t.weight}: {selectedGrade.weight}
                        </span>
                    </div>

                    <div>
                        <h4 className="text-base font-semibold text-[var(--ios-label)]">{selectedGrade.category}</h4>
                        {selectedGrade.description && (
                            <p className="text-xs font-normal text-[var(--ios-secondary)] mt-0.5">{selectedGrade.description}</p>
                        )}
                    </div>

                    <div className="border-t border-[var(--ios-separator)] pt-2.5 flex flex-col gap-1.5 text-xs text-[var(--ios-secondary)]">
                        <div className="flex justify-between">
                            <span>{t.teacherLabel}:</span>
                            <span className="font-medium text-[var(--ios-label)]">{selectedGrade.teacher || t.notSpecified}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t.dateLabel}:</span>
                            <span className="font-medium text-[var(--ios-label)]">{selectedGrade.date || t.notSpecified}</span>
                        </div>
                    </div>

                    <button
                        onClick={onCloseGrade}
                        className="mt-1 w-full bg-[var(--ios-blue)] text-white text-xs font-semibold h-11 rounded-[12px] active:scale-[0.98] transition-all shadow-xs"
                    >
                        {t.close}
                    </button>
                </div>
            </div>
        )
    }

    return null
}