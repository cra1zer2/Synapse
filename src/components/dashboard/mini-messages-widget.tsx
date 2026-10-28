'use client'

import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard } from '@/components/ios/ios-ui'

interface MiniMessagesWidgetProps {
  unreadCount: number
  announcementsCount: number
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  lang?: AppLanguage
  t: AppDictionary
  onOpenMessages: () => void
  onOpenAnnouncements: () => void
}

export function MiniMessagesWidget({
  unreadCount,
  announcementsCount,
  isLoading = false,
  error = null,
  onRetry,
  lang = 'pl',
  t,
  onOpenMessages,
  onOpenAnnouncements
}: MiniMessagesWidgetProps) {
  const isEn = lang === 'en'

  return (
    <IosCard className="p-4 flex flex-col gap-3 select-none">
      <div
        onClick={onOpenMessages}
        className="flex items-center gap-2 pb-2.5 border-b border-[var(--ios-separator)] cursor-pointer active:opacity-70 transition-opacity"
      >
        <span className="text-[16px] font-semibold text-[var(--ios-label)] tracking-[-0.2px]">
          {t.messages}
        </span>
        <svg
          width="16"
          height="16"
          className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0 ml-auto"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      <div className="flex flex-col gap-2.5 mt-0.5">
        <div
          onClick={onOpenMessages}
          className="w-full bg-[var(--ios-element)]/35 hover:bg-[var(--ios-element)]/50 rounded-[16px] p-3.5 flex items-center justify-between gap-3 transition-[background-color,transform] duration-150 border border-[var(--ios-border)] cursor-pointer active:scale-[0.985] active:bg-[var(--ios-element)]/60"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-[36px] h-[36px] rounded-[10px] bg-[var(--ios-blue)] text-white flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="3" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] truncate leading-tight">
                {t.messagesInbox}
              </span>
              {isLoading ? (
                <div className="w-28 h-[12px] rounded-full ios-skeleton mt-1.5 mb-0.5" />
              ) : (
                <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] truncate mt-0.5 tabular-nums">
                  {unreadCount > 0
                    ? isEn
                      ? `${unreadCount} unread`
                      : `${unreadCount} nieprzeczytanych`
                    : isEn
                      ? 'No new messages'
                      : 'Brak nowych wiadomości'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLoading ? (
              <div className="w-6 h-[18px] rounded-full ios-skeleton" />
            ) : (
              unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--ios-blue)] text-white text-[11px] font-semibold tabular-nums">
                  {unreadCount}
                </span>
              )
            )}
            <svg width="14" height="14" className="text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        <div
          onClick={onOpenAnnouncements}
          className="w-full bg-[var(--ios-element)]/35 hover:bg-[var(--ios-element)]/50 rounded-[16px] p-3.5 flex items-center justify-between gap-3 transition-[background-color,transform] duration-150 border border-[var(--ios-border)] cursor-pointer active:scale-[0.985] active:bg-[var(--ios-element)]/60"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-[36px] h-[36px] rounded-[10px] bg-[var(--ios-purple)] text-white flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 11 18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] truncate leading-tight">
                {t.messagesAnnouncements}
              </span>
              {isLoading ? (
                <div className="w-24 h-[12px] rounded-full ios-skeleton mt-1.5 mb-0.5" />
              ) : (
                <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] truncate mt-0.5 tabular-nums">
                  {announcementsCount} {isEn ? 'school notices' : 'ogłoszeń szkoły'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLoading ? (
              <div className="w-6 h-[18px] rounded-full ios-skeleton" />
            ) : (
              announcementsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--ios-purple)] text-white text-[11px] font-semibold tabular-nums">
                  {announcementsCount}
                </span>
              )
            )}
            <svg width="14" height="14" className="text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>

      {!isLoading && error && unreadCount === 0 && announcementsCount === 0 && (
        <div className="pt-1 flex items-center justify-between gap-2 px-1">
          <span className="text-[12px] font-normal text-[var(--ios-secondary)] truncate">
            {error}
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[12px] font-medium text-[var(--ios-blue)] active:opacity-60 cursor-pointer shrink-0"
            >
              {t.refresh || 'Odśwież'}
            </button>
          )}
        </div>
      )}
    </IosCard>
  )
}
