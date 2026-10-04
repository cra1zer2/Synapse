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
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-card)] rounded-3xl p-5 w-full max-w-sm border border-[var(--border-subtle)] shadow-xl flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto"
            >
                <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-3">
                    <div>
                        <h3 className="text-base font-extrabold text-[var(--text-primary)]">{subjectDetail.subject}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {subjectDetail.percentage}% ({subjectDetail.absentLessons} opuszczonych)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-[var(--bg-element)] text-[var(--text-secondary)] text-xs font-bold flex items-center justify-center shrink-0 active:scale-95"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    {subjectDetail.absences && subjectDetail.absences.length > 0 ? (
                        subjectDetail.absences.map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-[var(--bg-element)] p-3 rounded-2xl flex flex-col gap-1.5 text-xs text-[var(--text-primary)]"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold">{item.date}</span>
                                    <span
                                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${item.isUnexcused
                                                ? 'bg-rose-500/15 text-rose-500 border-rose-500/20'
                                                : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20'
                                            }`}
                                    >
                                        {item.type.toUpperCase()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-[var(--text-secondary)]">
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
                                        className="mt-1 w-full bg-[#007aff] text-white text-xs font-bold py-2 rounded-xl active:opacity-80 transition-all shadow-xs"
                                    >
                                        {t.excuseAction}
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-xs text-[var(--text-secondary)] py-4">{t.noAbsencesRecorded}</div>
                    )}
                </div>
            </div>
        </div>
    )
}