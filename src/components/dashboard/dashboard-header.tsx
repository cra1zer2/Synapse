'use client'

import { RefreshCw, Settings } from 'lucide-react'
import { StudentProfile } from '@/models/account.model'
import { AppDictionary } from '@/config/dictionary.config'
import { IosIconButton } from '@/components/ios/ios-ui'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { cn } from '@/utils/cn.util'

interface DashboardHeaderProps {
  profile: StudentProfile | null
  username: string
  isUpdating: boolean
  isManualRefreshing: boolean
  lastSyncedAt: number | null
  onRefresh: () => void
  onOpenSettings: () => void
  t: AppDictionary
}

function formatSyncTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    })
  } catch {
    return ''
  }
}

export function DashboardHeader({
  profile,
  username,
  isUpdating,
  isManualRefreshing,
  lastSyncedAt,
  onRefresh,
  onOpenSettings,
  t
}: DashboardHeaderProps) {
  const isBusy = isUpdating || isManualRefreshing
  const syncLabel = isBusy
    ? t.updatingStatus
    : lastSyncedAt
      ? t.lastSyncedAtLabel(formatSyncTime(lastSyncedAt))
      : t.syncedStatus

  const accountDisplayName =
    profile?.fullName && profile.fullName !== 'Konto Librus'
      ? profile.fullName
      : username || t.settingsTitle

  return (
    <>
      <header className="ios-header md:hidden">
        <div className="relative flex items-center justify-between w-full max-w-[480px] mx-auto h-[44px]">
          <div className="z-10 flex items-center min-w-[64px] h-full">
            <IosIconButton
              size="sm"
              variant="subtle"
              onClick={onRefresh}
              disabled={isBusy}
              aria-label={t.refresh}
              icon={
                isBusy ? (
                  <IosSpinner size="small" className="text-[var(--ios-secondary)]" />
                ) : (
                  <RefreshCw className="w-[16px] h-[16px] text-[var(--ios-secondary)]" strokeWidth={2.2} />
                )
              }
            />
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-14 text-center">
            <h2 className="text-[17px] font-semibold tracking-[-0.4px] leading-[1.28] text-[var(--ios-label)] truncate max-w-full">
              Synapse
            </h2>
            {(isBusy || lastSyncedAt) && (
              <span className="text-[10px] font-medium text-[var(--ios-secondary)] leading-[1.3] tabular-nums truncate max-w-full">
                {syncLabel}
              </span>
            )}
          </div>

          <div className="z-10 min-w-[64px] flex items-center justify-end h-full">
            <IosIconButton
              size="sm"
              variant="subtle"
              onClick={onOpenSettings}
              aria-label={t.settingsTitle}
              icon={<Settings className="w-[17px] h-[17px] text-[var(--ios-secondary)]" strokeWidth={2.2} />}
            />
          </div>
        </div>
      </header>

      <header
        style={{
          backgroundColor: 'var(--ios-header-bg)',
          WebkitBackdropFilter: 'saturate(190%) blur(24px)',
          backdropFilter: 'saturate(190%) blur(24px)'
        }}
        className="hidden md:block sticky top-0 z-30 w-full border-b border-[var(--ios-separator)] select-none"
      >
        <div className="relative flex items-center justify-between w-full max-w-[860px] mx-auto px-5 h-[52px]">
          <div className="flex items-center gap-2 min-w-0 z-10">
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ios-card-solid)] hover:opacity-85 active:scale-[0.97] transition-all cursor-pointer"
              title={t.settingsTitle}
            >
              <span className="text-[13px] font-medium text-[var(--ios-label)] truncate max-w-[180px]">
                {accountDisplayName}
              </span>
              {profile?.className && (
                <span className="text-[12px] font-normal text-[var(--ios-secondary)]">
                  {profile.className}
                </span>
              )}
              {profile?.luckyNumber !== null && profile?.luckyNumber !== undefined && (
                <span
                  className="text-[11px] font-semibold text-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] px-2 py-0.5 rounded-full tabular-nums"
                  title={t.luckyNumber}
                >
                  #{profile.luckyNumber}
                </span>
              )}
            </button>
          </div>

          <h1 className="absolute inset-0 flex items-center justify-center text-[17px] font-semibold tracking-[-0.4px] text-[var(--ios-label)] pointer-events-none">
            Synapse
          </h1>

          <div className="flex items-center gap-2 z-10">
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--ios-secondary)] font-normal pr-1">
              <div
                className={cn(
                  'w-3.5 h-3.5 flex items-center justify-center transition-opacity duration-300',
                  isBusy ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                )}
              >
                <IosSpinner size="small" className="text-[var(--ios-secondary)]" />
              </div>
              <span className="tabular-nums hidden lg:inline">{syncLabel}</span>
            </div>

            <IosIconButton
              size="sm"
              variant="subtle"
              onClick={onRefresh}
              disabled={isBusy}
              title={t.refresh}
              aria-label={t.refresh}
              icon={<RefreshCw className="w-[15px] h-[15px] text-[var(--ios-secondary)]" strokeWidth={2.2} />}
            />

            <IosIconButton
              size="sm"
              variant="subtle"
              onClick={onOpenSettings}
              title={t.settingsTitle}
              aria-label={t.settingsTitle}
              icon={<Settings className="w-[15px] h-[15px] text-[var(--ios-secondary)]" strokeWidth={2.2} />}
            />
          </div>
        </div>
      </header>
    </>
  )
}
