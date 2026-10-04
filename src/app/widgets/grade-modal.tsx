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
                className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl p-5 w-full max-w-sm border border-[#e5e5ea] shadow-xl flex flex-col gap-3"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-xl">
                            {t.minimalEffortToFix}
                        </span>
                        <span className="text-sm font-extrabold text-[#1c1c1e]">
                            {t.currentAverage(selectedWarningSubject.finalAverage)}
                        </span>
                    </div>

                    <h3 className="text-base font-extrabold text-[#1c1c1e]">
                        {selectedWarningSubject.subject}
                    </h3>

                    {selectedWarningSubject.warning.status === 'done' ? (
                        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-center">
                            <p className="text-lg font-black text-rose-700">{t.youAreDone}</p>
                            <p className="text-xs text-rose-600 mt-1">{t.scoreTooDeep}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold text-[#8e8e93]">{t.recommendedTargets}</p>
                            {selectedWarningSubject.warning.fixOptions.map((opt, i) => (
                                <div key={i} className="bg-[#f2f2f7] p-2.5 rounded-xl text-xs font-medium text-[#1c1c1e] flex items-center gap-2">
                                    <span className="text-emerald-600 font-extrabold">✓</span>
                                    <span>{opt.description}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={onCloseWarning}
                        className="mt-2 w-full bg-[#1c1c1e] text-white text-xs font-bold py-2.5 rounded-xl active:opacity-80 transition-all"
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
                className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl p-5 w-full max-w-sm border border-[#e5e5ea] shadow-xl flex flex-col gap-3"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xl font-extrabold px-3 py-1 rounded-2xl border bg-[#f2f2f7] text-[#1c1c1e] border-gray-200">
                            {selectedGrade.grade}
                        </span>
                        <span className="text-xs font-semibold text-[#8e8e93] bg-[#f2f2f7] px-2.5 py-1 rounded-lg">
                            {t.weight}: {selectedGrade.weight}
                        </span>
                    </div>

                    <div>
                        <h4 className="text-base font-bold text-[#1c1c1e]">{selectedGrade.category}</h4>
                        {selectedGrade.description && (
                            <p className="text-xs text-[#8e8e93] mt-0.5">{selectedGrade.description}</p>
                        )}
                    </div>

                    <div className="border-t border-[#e5e5ea] pt-2 flex flex-col gap-1 text-xs text-[#8e8e93]">
                        <div className="flex justify-between">
                            <span>{t.teacherLabel}:</span>
                            <span className="font-medium text-[#1c1c1e]">{selectedGrade.teacher || t.notSpecified}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t.dateLabel}:</span>
                            <span className="font-medium text-[#1c1c1e]">{selectedGrade.date || t.notSpecified}</span>
                        </div>
                    </div>

                    <button
                        onClick={onCloseGrade}
                        className="mt-2 w-full bg-[#1c1c1e] text-white text-xs font-bold py-2.5 rounded-xl active:opacity-80 transition-all"
                    >
                        {t.close}
                    </button>
                </div>
            </div>
        )
    }

    return null
}