'use client'

import { ReactNode, useState } from 'react'
import { Download, Paperclip, Reply } from 'lucide-react'
import { MessageItem, MessageAttachment } from '@/models/message.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'
import { formatHumanPolishDate } from '@/utils/date.util'
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
  lang?: AppLanguage
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
  lang = 'pl',
  t
}: MessageReaderScreenProps) {
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null)
  const isEn = lang === 'en'

  const isNoReply = Boolean(
    message &&
      (/e-usprawiedliwienia|system|powiadomienie|no-reply|noreply|librus/i.test(message.sender) ||
        /prosimy na nią nie odpowiadać|nie odpowiadaj|do not reply/i.test(content))
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
            className="flex items-center gap-1 text-[16px] font-normal leading-none text-[var(--ios-blue)] active:opacity-60 transition-opacity select-none h-full cursor-pointer"
          >
            <Reply className="w-[18px] h-[18px]" strokeWidth={2.2} />
            <span>{t.replyAction}</span>
          </button>
        ) : null
      }
    >
      <div className="flex flex-col gap-3.5 pb-16 select-none max-w-3xl mx-auto w-full">
        {message ? (
          <>
            <IosCard className="p-4 sm:p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--ios-blue)] uppercase tracking-wider truncate">
                  {cleanSenderName(message.sender)}
                </span>
                <span className="text-[11px] font-normal text-[var(--ios-secondary)] tabular-nums shrink-0">
                  {formatHumanPolishDate(message.date, true, lang)}
                </span>
              </div>

              <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--ios-label)] tracking-tight leading-snug break-words mt-0.5">
                {message.subject}
              </h2>
            </IosCard>

            {isLoadingContent ? (
              <IosCard className="p-4 sm:p-5 flex flex-col gap-4 select-none" aria-busy="true">
                <div className="w-36 h-[13px] rounded-full ios-skeleton" />
                <div className="flex flex-col gap-2.5">
                  <div className="w-full h-[13px] rounded-full ios-skeleton" />
                  <div className="w-[94%] h-[13px] rounded-full ios-skeleton" />
                  <div className="w-[88%] h-[13px] rounded-full ios-skeleton" />
                  <div className="w-[62%] h-[13px] rounded-full ios-skeleton" />
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="w-[92%] h-[13px] rounded-full ios-skeleton" />
                  <div className="w-[78%] h-[13px] rounded-full ios-skeleton" />
                </div>
              </IosCard>
            ) : (
              <>
                {attachments.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-semibold uppercase text-[var(--ios-secondary)] tracking-[0.03em] px-4">
                      {isEn ? `Attachments (${attachments.length})` : `Załączniki (${attachments.length})`}
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
                              <div className="w-8 h-8 rounded-[8px] bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] flex items-center justify-center shrink-0">
                                <Paperclip className="w-4 h-4" strokeWidth={2.2} />
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
                                  <span>{isEn ? 'Download' : 'Pobierz'}</span>
                                  <Download className="w-[15px] h-[15px]" strokeWidth={2.2} />
                                </>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </IosCard>
                  </div>
                )}

                <IosCard className="p-4 sm:p-5">
                  <div className="text-[15px] font-normal text-[var(--ios-label)] leading-[1.65] whitespace-pre-wrap select-text">
                    {renderContent(content || t.emptyMessageContent)}
                  </div>
                </IosCard>
              </>
            )}
          </>
        ) : null}
      </div>
    </IosScreen>
  )
}
