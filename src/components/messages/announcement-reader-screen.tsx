'use client'

import { ReactNode } from 'react'
import { AnnouncementItem } from '@/models/message.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'
import { formatHumanPolishDate } from '@/utils/date.util'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosCard } from '@/components/ios/ios-ui'

interface AnnouncementReaderScreenProps {
  announcement: AnnouncementItem | null
  isOpen: boolean
  onClose: () => void
  renderContent: (text: string) => ReactNode
  lang?: AppLanguage
  t: AppDictionary
}

export function AnnouncementReaderScreen({
  announcement,
  isOpen,
  onClose,
  renderContent,
  lang = 'pl',
  t
}: AnnouncementReaderScreenProps) {
  const hasTime = Boolean(announcement?.date && /\d{1,2}:\d{2}/.test(announcement.date))

  return (
    <IosScreen
      isOpen={isOpen}
      onClose={onClose}
      title={t.messagesAnnouncements}
      backLabel={t.messagesAnnouncements || t.backAction}
      showBackButton={true}
      isSubView={true}
      className="z-[60]"
    >
      <div className="flex flex-col gap-3.5 pb-16 select-none max-w-3xl mx-auto w-full">
        {announcement ? (
          <>
            <IosCard className="p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--ios-purple)] tracking-tight truncate">
                  {cleanSenderName(announcement.author)}
                </span>
                <span className="text-[12px] font-normal text-[var(--ios-secondary)] tabular-nums shrink-0">
                  {formatHumanPolishDate(announcement.date, hasTime, lang)}
                </span>
              </div>

              <h2 className="text-[19px] sm:text-[20px] font-bold text-[var(--ios-label)] tracking-tight leading-snug mt-0.5 break-words">
                {announcement.title}
              </h2>
            </IosCard>

            <IosCard className="p-5">
              <div className="text-[15px] font-normal text-[var(--ios-label)] leading-[1.65] whitespace-pre-wrap select-text">
                {renderContent(announcement.content)}
              </div>
            </IosCard>
          </>
        ) : null}
      </div>
    </IosScreen>
  )
}
