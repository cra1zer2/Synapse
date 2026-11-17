/**
 * Feature Component: Lucky Number Daily Banner
 * Dismissible status card highlighting when the active student's diary number matches today's Librus lucky number.
 * Shown only when enabled in settings and not dismissed for the current school day.
 */

'use client'

import { X } from 'lucide-react'
import { StudentProfile } from '@/models/account.model'
import { AppLanguage, pickText } from '@/config/dictionary.config'

interface LuckyNumberBannerProps {
  profile: StudentProfile | null
  lang: AppLanguage
  visible: boolean
  closeLabel: string
  onDismiss: () => void
}

export function LuckyNumberBanner({
  profile,
  lang,
  visible,
  closeLabel,
  onDismiss
}: LuckyNumberBannerProps) {
  if (
    !visible ||
    profile?.luckyNumber === null ||
    profile?.luckyNumber === undefined ||
    profile?.classNumber === null ||
    profile?.classNumber === undefined ||
    profile.luckyNumber !== profile.classNumber
  ) {
    return null
  }

  return (
    <div className="ios-card px-4 py-3 flex items-center justify-between gap-3 select-none ios-reveal">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[var(--ios-green-subtle)] ios-tile text-[var(--ios-green)] flex items-center justify-center font-semibold text-[13px] shrink-0 tabular-nums">
          #{profile.luckyNumber}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[14px] font-semibold text-[var(--ios-label)] tracking-[-0.15px] truncate leading-tight">
            {pickText(lang, { pl: 'Twój szczęśliwy numerek dzisiaj!', en: 'Your lucky number today!' })}
          </span>
          <span className="text-[12px] font-normal text-[var(--ios-secondary)] truncate leading-tight mt-0.5">
            {pickText(lang, {
              pl: 'Zwolnienie z niezapowiedzianych odpowiedzi',
              en: 'You are exempt from unannounced quizzes'
            })}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="w-7 h-7 rounded-full ios-element-pill text-[var(--ios-secondary)] hover:text-[var(--ios-label)] flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer"
        aria-label={closeLabel}
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.4} />
      </button>
    </div>
  )
}
