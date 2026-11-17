'use client'
import { ReactNode } from 'react'
import { StudentProfile } from '@/models/account.model'
import { AppDictionary, AppLanguage, getLanguageMeta } from '@/config/dictionary.config'
import { cn } from '@/utils/cn.util'
import { resolveAvatarLetter } from '@/utils/account.util'

interface DashboardHeaderProps {
  profile: StudentProfile | null
  username: string
  isUpdating: boolean
  isManualRefreshing: boolean
  isPullRefreshing?: boolean
  lastSyncedAt: number | null
  onRefresh: () => void
  onOpenSettings: () => void
  title?: string
  trailingAction?: ReactNode
  lang?: AppLanguage
  t: AppDictionary
}

function formatSyncTime(timestamp: number, lang: AppLanguage): string {
  try {
    return new Date(timestamp).toLocaleTimeString(getLanguageMeta(lang).intlLocale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw',
    })
  } catch {
    return ''
  }
}

export function DashboardHeader({
  profile,
  username,
  lastSyncedAt,
  onOpenSettings,
  title = 'Synapse',
  trailingAction,
  lang = 'pl',
  t,
}: DashboardHeaderProps) {
  const mobileSyncLabel = lastSyncedAt ? t.lastSyncedAtLabel(formatSyncTime(lastSyncedAt, lang)) : ''
  const accountInitial = resolveAvatarLetter(profile?.fullName, username)

  return (
    <header
      data-ios-header-for="root"
      style={{ backgroundColor: 'var(--ios-bg)' }}
      className="ios-header sticky top-0 z-20 select-none"
    >
      <div className="relative flex items-center justify-between w-full max-w-[480px] mx-auto h-[44px]">
        <div className="z-10 flex items-center min-w-[64px] h-full" />
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center',
            trailingAction ? 'px-24' : 'px-16'
          )}
        >
          <h2
            key={title}
            className="text-[17px] font-semibold tracking-[-0.4px] leading-[1.28] text-[var(--ios-label)] truncate max-w-full ios-reveal"
          >
            {title}
          </h2>
          {mobileSyncLabel && (
            <span className="text-[10px] font-medium text-[var(--ios-secondary)] leading-[1.3] tabular-nums truncate max-w-full">
              {mobileSyncLabel}
            </span>
          )}
        </div>
        <div className="z-10 min-w-[64px] flex items-center justify-end gap-1.5 h-full">
          {trailingAction}
          <button
            type="button"
            onClick={onOpenSettings}
            title={t.settingsTitle}
            aria-label={t.settingsTitle}
            className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[13px] bg-[var(--ios-blue)] text-white shadow-[var(--ios-primary-pill-shadow)] shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            {accountInitial}
          </button>
        </div>
      </div>
    </header>
  )
}
