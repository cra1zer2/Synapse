'use client'

import { SubjectAttendance, AbsenceDetail } from '@/models/attendance.model'
import { AppDictionary } from '@/config/dictionary.config'

interface AttendanceDetailModalProps {
    subjectDetail: SubjectAttendance
    onClose: () => void
    onSelectAbsenceForExcuse: (absence: AbsenceDetail) => void
    t: AppDictionary
}

export function AttendanceDetailModal({
    subjectDetail,
    onClose,
    onSelectAbsenceForExcuse,
    t
}: AttendanceDetailModalProps) {
    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--ios-card-solid)] rounded-3xl p-5 w-full max-w-sm border border-[var(--ios-separator)]/20 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            >
                <div className="flex items-start justify-between border-b border-[var(--ios-separator)]/20 pb-3">
                    <div>
                        <h3 className="text-base font-bold text-[var(--ios-label)]">{subjectDetail.subject}</h3>
                        <p className="text-xs text-[var(--ios-secondary)] mt-0.5">
                            {subjectDetail.percentage}% ({subjectDetail.absentLessons} opuszczonych)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-[var(--ios-element)]/60 text-[var(--ios-secondary)] text-xs font-bold flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    {subjectDetail.absences && subjectDetail.absences.length > 0 ? (
                        subjectDetail.absences.map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-[var(--ios-bg)] p-3 rounded-2xl flex flex-col gap-1.5"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[var(--ios-label)]">{item.date}</span>
                                    <span
                                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${item.isUnexcused
                                                ? 'bg-[#ff3b30]/15 text-[#ff3b30]'
                                                : 'bg-[#34c759]/15 text-[#34c759]'
                                            }`}
                                    >
                                        {item.type.toUpperCase()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs text-[var(--ios-secondary)]">
                                    <span>
                                        Lekcja {item.lessonNumber} {item.time ? `(${item.time})` : ''}
                                    </span>
                                    <span>{item.typeName}</span>
                                </div>

                                {item.isUnexcused && (
                                    <button
                                        onClick={() => {
                                            onClose()
                                            onSelectAbsenceForExcuse(item)
                                        }}
                                        className="mt-1 w-full bg-[var(--ios-blue)] text-white text-xs font-semibold py-2 rounded-xl active:opacity-80 transition-all shadow-xs"
                                    >
                                        {t.excuseAction}
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-xs text-[var(--ios-secondary)] py-4">{t.noAbsencesRecorded}</div>
                    )}
                </div>
            </div>
        </div>
    )
}