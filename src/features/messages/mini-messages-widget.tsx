/**
 * Feature Widget: Mini Messages & Announcements Card
 * Summarizes unread inbox messages and total school notices on the main dashboard.
 * Uses `formatPolishPlural` for Polish grammar and `pickText` fallback for international languages.
 */

'use client'

import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { UiCard } from '@/components/ui/ui-controls'
import { cn } from '@/utils/cn.util'
import { formatPolishPlural } from '@/utils/text.util'

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
  return (
    <UiCard className="overflow-hidden flex flex-col select-none">
      <div
        className={cn(
          'flex items-center justify-between',
          'px-4 h-[46px] [border-bottom-width:0.5px] border-b border-[var(--ios-separator)]'
        )}
      >
        <span
          className={cn(
            'text-[var(--ios-label)]',
            'text-[15px] font-semibold tracking-[-0.2px]'
          )}
        >
          {t.messages}
        </span>
      </div>

      <div className={cn('flex flex-col', '')}>
        <div
          onClick={onOpenMessages}
          className={cn(
            'w-full flex items-center justify-between gap-3 cursor-pointer select-none',
            'py-3 px-4 transition-colors duration-150 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]'
          )}
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div
              className={cn(
                'flex items-center justify-center shrink-0',
                'w-[32px] h-[32px] rounded-[9px] bg-[var(--ios-blue)] text-white ios-pill-raised'
              )}
            >
              <svg width={'16'} height={'16'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                    ? pickText(lang, {
                        pl: `${unreadCount} ${formatPolishPlural(unreadCount, 'nieprzeczytana', 'nieprzeczytane', 'nieprzeczytanych')}`,
                        en: `${unreadCount} unread`
                      })
                    : pickText(lang, { pl: 'Brak nowych wiadomości', en: 'No new messages' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLoading ? (
              <div className="w-6 h-[18px] rounded-full ios-skeleton" />
            ) : (
              unreadCount > 0 && (
                <span
                  className={cn(
                    'rounded-full text-[11px] font-semibold tabular-nums',
                    'px-2 py-0.5 bg-[var(--ios-blue)] text-white ios-pill-raised'
                  )}
                >
                  {unreadCount}
                </span>
              )
            )}
            <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {<div className="h-[0.5px] bg-[var(--ios-separator)] ml-[60px] mr-4 pointer-events-none" />}

        <div
          onClick={onOpenAnnouncements}
          className={cn(
            'w-full flex items-center justify-between gap-3 cursor-pointer select-none',
            'py-3 px-4 transition-colors duration-150 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]'
          )}
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div
              className={cn(
                'flex items-center justify-center shrink-0',
                'w-[32px] h-[32px] rounded-[9px] bg-[var(--ios-purple)] text-white ios-pill-raised'
              )}
            >
              <svg width={'16'} height={'16'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                  {announcementsCount}{' '}
                  {pickText(lang, {
                    pl: formatPolishPlural(
                      announcementsCount,
                      'ogłoszenie szkoły',
                      'ogłoszenia szkoły',
                      'ogłoszeń szkoły'
                    ),
                    en: announcementsCount === 1 ? 'school notice' : 'school notices'
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLoading ? (
              <div className="w-6 h-[18px] rounded-full ios-skeleton" />
            ) : (
              announcementsCount > 0 && (
                <span
                  className={cn(
                    'rounded-full text-[11px] font-semibold tabular-nums',
                    'px-2 py-0.5 bg-[var(--ios-purple)] text-white ios-pill-raised'
                  )}
                >
                  {announcementsCount}
                </span>
              )
            )}
            <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>

      {!isLoading && error && unreadCount === 0 && announcementsCount === 0 && (
        <div
          className={cn(
            'px-4 py-2.5 flex items-center justify-between gap-2',
            '[border-top-width:0.5px] border-t border-[var(--ios-separator)]'
          )}
        >
          <span className="text-[12px] font-normal text-[var(--ios-secondary)] truncate">{error}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="text-[12px] font-medium text-[var(--ios-blue)] active:opacity-60 cursor-pointer shrink-0">
              {t.refresh}
            </button>
          )}
        </div>
      )}
    </UiCard>
  )
}
