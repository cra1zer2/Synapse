'use client'

import { MessageItem, AnnouncementItem } from '@/models/message.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard } from '@/components/ios/ios-ui'
import { cleanSenderName } from '@/utils/text.util'

interface MiniMessagesWidgetProps {
  unreadCount: number
  announcementsCount: number
  latestMessage?: MessageItem | null
  latestAnnouncement?: AnnouncementItem | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  lang?: AppLanguage
  t: AppDictionary
  onOpenMessages: () => void
  onOpenAnnouncements: () => void
  onOpenMessageDetail?: (msg: MessageItem) => void
  onOpenAnnouncementDetail?: (ann: AnnouncementItem) => void
}

export function MiniMessagesWidget({
  unreadCount,
  announcementsCount,
  latestMessage = null,
  latestAnnouncement = null,
  isLoading = false,
  error = null,
  onRetry,
  lang = 'pl',
  t,
  onOpenMessages,
  onOpenAnnouncements,
  onOpenMessageDetail,
  onOpenAnnouncementDetail
}: MiniMessagesWidgetProps) {
  const isEn = lang === 'en'

  return (
    <IosCard className="overflow-hidden flex flex-col select-none">
      <div className="px-4 pt-3.5 pb-2.5 flex items-center gap-2 border-b border-[var(--ios-separator)]">
        <span className="text-[16px] font-semibold text-[var(--ios-label)] tracking-[-0.2px]">
          {t.messages}
        </span>
      </div>

      <div className="flex flex-col">
        {/* Odebrane Row */}
        <div
          onClick={onOpenMessages}
          className="w-full py-3 px-4 flex items-center justify-between gap-3 transition-colors duration-150 cursor-pointer select-none hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--ios-blue)] text-white flex items-center justify-center shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="15" height="15" className="text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* Desktop Latest Message Sub-Row */}
        {latestMessage && (
          <div
            onClick={(e) => {
              e.stopPropagation()
              if (onOpenMessageDetail) {
                onOpenMessageDetail(latestMessage)
              } else {
                onOpenMessages()
              }
            }}
            className="hidden md:flex flex-col gap-0.5 pl-[62px] pr-4 py-2.5 relative transition-colors duration-150 cursor-pointer select-none hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]"
            title={lang === 'en' ? 'Click to open message' : 'Kliknij, aby otworzyć wiadomość'}
          >
            <div className="absolute top-0 left-[62px] right-0 h-[0.5px] bg-[var(--ios-separator)] pointer-events-none" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {!latestMessage.isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ios-blue)] shrink-0" />
                )}
                <span className="text-[12px] font-semibold text-[var(--ios-blue)] truncate">
                  {cleanSenderName(latestMessage.sender)}
                </span>
              </div>
              <span className="text-[11px] tabular-nums shrink-0 text-[var(--ios-tertiary)]">
                {latestMessage.date}
              </span>
            </div>
            <p className="text-[12px] font-normal text-[var(--ios-secondary)] line-clamp-1 truncate leading-tight mt-0.5">
              {latestMessage.subject || latestMessage.content || '—'}
            </p>
          </div>
        )}

        <div className="h-[0.5px] bg-[var(--ios-separator)] ml-4 pointer-events-none" />

        {/* Ogłoszenia Row */}
        <div
          onClick={onOpenAnnouncements}
          className="w-full py-3 px-4 flex items-center justify-between gap-3 transition-colors duration-150 cursor-pointer select-none hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--ios-purple)] text-white flex items-center justify-center shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="15" height="15" className="text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* Desktop Latest Announcement Sub-Row */}
        {latestAnnouncement && (
          <div
            onClick={(e) => {
              e.stopPropagation()
              if (onOpenAnnouncementDetail) {
                onOpenAnnouncementDetail(latestAnnouncement)
              } else {
                onOpenAnnouncements()
              }
            }}
            className="hidden md:flex flex-col gap-0.5 pl-[62px] pr-4 py-2.5 relative transition-colors duration-150 cursor-pointer select-none hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]"
            title={lang === 'en' ? 'Click to open announcement' : 'Kliknij, aby otworzyć ogłoszenie'}
          >
            <div className="absolute top-0 left-[62px] right-0 h-[0.5px] bg-[var(--ios-separator)] pointer-events-none" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[var(--ios-purple)] truncate">
                {cleanSenderName(latestAnnouncement.author)}
              </span>
              <span className="text-[11px] tabular-nums shrink-0 text-[var(--ios-tertiary)]">
                {latestAnnouncement.date}
              </span>
            </div>
            <p className="text-[12px] font-normal text-[var(--ios-secondary)] line-clamp-1 truncate leading-tight mt-0.5">
              {latestAnnouncement.title || latestAnnouncement.content || '—'}
            </p>
          </div>
        )}
      </div>

      {!isLoading && error && unreadCount === 0 && announcementsCount === 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--ios-separator)] flex items-center justify-between gap-2">
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
