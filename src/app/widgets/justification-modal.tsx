'use client'

import { useState } from 'react'
import { AbsenceDetail } from '@/models/attendance.model'
import { AppDictionary } from '@/config/dictionary.config'

interface JustificationModalProps {
    absence: AbsenceDetail
    onClose: () => void
    onSubmit: (msg: string) => Promise<boolean>
    t: AppDictionary
}

export function JustificationModal({
    absence,
    onClose,
    onSubmit,
    t
}: JustificationModalProps) {
    const [parentMessage, setParentMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        const ok = await onSubmit(parentMessage)
        setIsSubmitting(false)
        if (ok) {
            setSuccess(true)
            setTimeout(() => {
                onClose()
            }, 1400)
        }
    }

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-5 w-full max-w-sm border border-[#e5e5ea] shadow-xl flex flex-col gap-3.5"
            >
                <div>
                    <h3 className="text-base font-extrabold text-[#1c1c1e]">Usprawiedliwienie</h3>
                    <p className="text-xs text-[#8e8e93] mt-0.5">
                        {absence.subject} • {absence.date} (Lekcja {absence.lessonNumber})
                    </p>
                </div>

                {success ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center text-xs font-bold">
                        ✓ {t.justificationSent}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <textarea
                            placeholder={t.commentPlaceholder}
                            value={parentMessage}
                            onChange={(e) => setParentMessage(e.target.value)}
                            className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-xs rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#007aff] resize-none h-20"
                        />

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-[#f2f2f7] text-[#1c1c1e] text-xs font-bold py-2.5 rounded-xl active:opacity-80"
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-[#007aff] text-white text-xs font-bold py-2.5 rounded-xl active:opacity-80 disabled:opacity-50 transition-all shadow-xs"
                            >
                                {isSubmitting ? t.sending : t.send}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}