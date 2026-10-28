'use client'

import { ReactNode } from 'react'
import { MessageItem } from '@/models/message.model'
import { AppDictionary } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosSpinner } from '@/components/ios/ios-spinner'

interface MessageReaderScreenProps {
  message: MessageItem | null
  isOpen: boolean
  isReceded: boolean
  isLoadingContent: boolean
  content: string
  onClose: () => void
  onReply: (message: MessageItem) => void
  renderContent: (text: string) => ReactNode
  t: AppDictionary
}

export function MessageReaderScreen({
  message,
  isOpen,
  isReceded,
  isLoadingContent,
  content,
  onClose,
  onReply,
  renderContent,
  t
}: MessageReaderScreenProps) {
  return (
    <IosScreen
      isOpen={isOpen}
      onClose={onClose}
      title={t.messages}
      backLabel={t.backAction}
      isSubView={true}
      isReceded={isReceded}
      className="z-[60]"
      trailing={
        message ? (
          <button
            type="button"
            onClick={() => onReply(message)}
            className="flex items-center gap-1 text-[17px] font-normal text-[var(--ios-blue)] active:opacity-60 transition-opacity select-none cursor-pointer"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
            <span>{t.replyAction}</span>
          </button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4 pb-16 select-none max-w-[402px] mx-auto w-full">
        {message ? (
          <>
            <div className="flex flex-col gap-3 pb-3 border-b border-[var(--ios-separator)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--ios-blue)] text-white flex items-center justify-center font-semibold text-[15px] shrink-0">
                  {cleanSenderName(message.sender).slice(0, 2).toUpperCase()}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[16px] font-semibold text-[var(--ios-label)] truncate leading-tight">
                    {cleanSenderName(message.sender)}
                  </span>
                  <div className="flex items-center justify-between text-[12px] text-[var(--ios-secondary)] mt-0.5">
                    <span>Do: Mnie</span>
                    <span className="tabular-nums">{message.date}</span>
                  </div>
                </div>
              </div>

              <h2 className="text-[20px] font-bold text-[var(--ios-label)] tracking-tight leading-snug break-words mt-1">
                {message.subject}
              </h2>
            </div>

            {isLoadingContent ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <IosSpinner size="large" className="text-[var(--ios-blue)]" />
                <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-tight">
                  {t.loadingMessages}
                </span>
              </div>
            ) : (
              <div className="text-[15px] font-normal text-[var(--ios-label)] leading-[1.65] whitespace-pre-wrap select-text pt-1">
                {renderContent(content || t.emptyMessageContent)}
              </div>
            )}
          </>
        ) : null}
      </div>
    </IosScreen>
  )
}
