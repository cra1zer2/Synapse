'use client'

import { ReactNode, useState } from 'react'
import { MessageItem, MessageAttachment } from '@/models/message.model'
import { AppDictionary } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosCard } from '@/components/ios/ios-ui'
import { IosSpinner } from '@/components/ios/ios-spinner'

interface MessageReaderScreenProps {
  message: MessageItem | null
  isOpen: boolean
  isReceded: boolean
  isLoadingContent: boolean
  content: string
  attachments?: MessageAttachment[]
  onDownloadAttachment?: (att: MessageAttachment) => Promise<boolean>
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
  attachments = [],
  onDownloadAttachment,
  onClose,
  onReply,
  renderContent,
  t
}: MessageReaderScreenProps) {
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null)

  const isNoReply = Boolean(
    message && (
      /e-usprawiedliwienia|system|powiadomienie|no-reply|noreply|librus/i.test(message.sender) ||
      /prosimy na nią nie odpowiadać|nie odpowiadaj/i.test(content)
    )
  )

  const handleDownload = async (att: MessageAttachment) => {
    if (!onDownloadAttachment || downloadingPath) return
    setDownloadingPath(att.path)
    try {
      await onDownloadAttachment(att)
    } finally {
      setDownloadingPath(null)
    }
  }

  return (
    <IosScreen
      isOpen={isOpen}
      onClose={onClose}
      title={t.messages}
      backLabel={t.messagesInbox || t.backAction}
      showBackButton={true}
      isSubView={true}
      isReceded={isReceded}
      className="z-[60]"
      trailing={
        message && !isNoReply ? (
          <button
            type="button"
            onClick={() => onReply(message)}
            className="flex items-center gap-1 text-[17px] font-normal leading-none text-[var(--ios-blue)] active:opacity-60 transition-opacity select-none h-full cursor-pointer"
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
      <div className="flex flex-col gap-4 pb-16 select-none max-w-3xl mx-auto w-full">
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
              <>
                {attachments.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] font-normal uppercase text-[var(--ios-secondary)] tracking-[-0.08px] px-1">
                      Załączniki ({attachments.length})
                    </span>
                    <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
                      {attachments.map((att, idx) => {
                        const isBusy = downloadingPath === att.path
                        return (
                          <button
                            key={att.path + '-' + idx}
                            type="button"
                            onClick={() => handleDownload(att)}
                            disabled={Boolean(downloadingPath)}
                            className="w-full p-3 px-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors cursor-pointer disabled:opacity-60"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-[10px] bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] flex items-center justify-center shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                              </div>
                              <span className="text-[14px] font-medium text-[var(--ios-label)] truncate">
                                {att.name}
                              </span>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ios-blue)]">
                              {isBusy ? (
                                <IosSpinner size="small" className="text-[var(--ios-blue)]" />
                              ) : (
                                <>
                                  <span>Pobierz</span>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" x2="12" y1="15" y2="3" />
                                  </svg>
                                </>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </IosCard>
                  </div>
                )}

                <div className="text-[15px] font-normal text-[var(--ios-label)] leading-[1.65] whitespace-pre-wrap select-text pt-1">
                  {renderContent(content || t.emptyMessageContent)}
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </IosScreen>
  )
}
