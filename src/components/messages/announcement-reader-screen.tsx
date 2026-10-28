'use client'

import { ReactNode } from 'react'
import { AnnouncementItem } from '@/models/message.model'
import { AppDictionary } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'
import { IosScreen } from '@/components/ios/ios-screen'

interface AnnouncementReaderScreenProps {
  announcement: AnnouncementItem | null
  isOpen: boolean
  onClose: () => void
  renderContent: (text: string) => ReactNode
  t: AppDictionary
}

export function AnnouncementReaderScreen({
  announcement,
  isOpen,
  onClose,
  renderContent,
  t
}: AnnouncementReaderScreenProps) {
  return (
    <IosScreen
      isOpen={isOpen}
      onClose={onClose}
      title={t.messagesAnnouncements}
      backLabel={t.backAction}
      isSubView={true}
      className="z-[60]"
    >
      <div className="flex flex-col gap-4 pb-16 select-none max-w-[402px] mx-auto w-full">
        {announcement ? (
          <>
            <div className="flex flex-col gap-2 pb-3 border-b border-[var(--ios-separator)]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[var(--ios-purple)] uppercase tracking-wider">
                  {cleanSenderName(announcement.author)}
                </span>
                <span className="text-[11px] font-normal text-[var(--ios-secondary)] tabular-nums">
                  {announcement.date}
                </span>
              </div>

              <h2 className="text-[20px] font-bold text-[var(--ios-label)] tracking-tight leading-snug mt-1">
                {announcement.title}
              </h2>
            </div>

            <div className="text-[15px] font-normal text-[var(--ios-label)] leading-[1.65] whitespace-pre-wrap select-text pt-1">
              {renderContent(announcement.content)}
            </div>
          </>
        ) : null}
      </div>
    </IosScreen>
  )
}
