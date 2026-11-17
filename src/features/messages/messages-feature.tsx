/**
 * Feature Controller & View Host: Messages & Notices Module
 * Coordinates inbox/sent/announcements sub-tabs, message composition state, and reader overlays.
 * Supports both bottom-tab mode and standalone widget-driven subviews.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { SquarePen } from 'lucide-react'
import { MessageItem, MessageAttachment, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { UiScreen } from '@/components/ui/ui-screen'
import { UiIconButton } from '@/components/ui/ui-button'
import { UiSegmentedControl } from '@/components/ui/ui-controls'
import { MessagesView } from './messages-view'

interface UseMessagesFeatureOptions {
  currentFolder: 'inbox' | 'sent'
  setCurrentFolder: (folder: 'inbox' | 'sent') => void
  onOpenMessagesScreen: () => void
  onOpenAnnouncementsScreen: () => void
}

export function useMessagesFeature({
  currentFolder,
  setCurrentFolder,
  onOpenMessagesScreen,
  onOpenAnnouncementsScreen
}: UseMessagesFeatureOptions) {
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [messagesSubTab, setMessagesSubTab] = useState<'inbox' | 'sent' | 'notices'>('inbox')
  const [messagesSubDir, setMessagesSubDir] = useState<1 | -1>(1)
  const [isReaderOverlayOpen, setIsReaderOverlayOpen] = useState(false)

  const openMessages = useCallback(() => {
    setMessagesSubTab(currentFolder === 'sent' ? 'sent' : 'inbox')
    onOpenMessagesScreen()
  }, [currentFolder, onOpenMessagesScreen])

  const openAnnouncements = useCallback(() => {
    setMessagesSubTab('notices')
    onOpenAnnouncementsScreen()
  }, [onOpenAnnouncementsScreen])

  const handleSelectMessagesSubTab = useCallback(
    (tab: 'inbox' | 'sent' | 'notices') => {
      const order = { inbox: 0, sent: 1, notices: 2 } as const
      setMessagesSubDir(order[tab] >= order[messagesSubTab] ? 1 : -1)
      setMessagesSubTab(tab)
      if (tab === 'inbox' || tab === 'sent') {
        setCurrentFolder(tab)
      }
    },
    [setCurrentFolder, messagesSubTab]
  )

  return {
    isComposeOpen,
    setIsComposeOpen,
    messagesSubTab,
    messagesSubDir,
    isReaderOverlayOpen,
    setIsReaderOverlayOpen,
    openMessages,
    openAnnouncements,
    handleSelectMessagesSubTab
  }
}

export type MessagesFeatureController = ReturnType<typeof useMessagesFeature>

interface MessagesFeatureProps {
  controller: MessagesFeatureController
  mode: 'tab' | 'subview-messages' | 'subview-announcements' | 'hidden'
  onCloseSubview: () => void
  onNestedOverlayChange?: (isOpen: boolean) => void
  currentFolder: 'inbox' | 'sent'
  setCurrentFolder: (folder: 'inbox' | 'sent') => void
  messages: MessageItem[]
  sentMessages: MessageItem[]
  announcements: AnnouncementItem[]
  receivers: ReceiverItem[]
  isLoadingMessages: boolean
  ensureReceivers: () => Promise<ReceiverItem[]>
  onOpenMessage: (id: number | string, folder?: 'inbox' | 'sent') => Promise<{ content: string; attachments: MessageAttachment[] }>
  onMarkMessageRead: (
    msgId: number | string,
    folder: 'inbox' | 'sent',
    content?: string,
    attachments?: MessageAttachment[]
  ) => void
  onDownloadAttachment: (att: MessageAttachment) => Promise<boolean>
  onSendMessage: (receiverId: number | number[], title: string, body: string) => Promise<boolean>
  lang: AppLanguage
  t: AppDictionary
}

export function MessagesFeature({
  controller,
  mode,
  onCloseSubview,
  onNestedOverlayChange,
  currentFolder,
  setCurrentFolder,
  messages,
  sentMessages,
  announcements,
  receivers,
  isLoadingMessages,
  ensureReceivers,
  onOpenMessage,
  onMarkMessageRead,
  onDownloadAttachment,
  onSendMessage,
  lang,
  t
}: MessagesFeatureProps) {
  const hasOverlay = controller.isReaderOverlayOpen || controller.isComposeOpen

  useEffect(() => {
    onNestedOverlayChange?.(hasOverlay)
  }, [hasOverlay, onNestedOverlayChange])

  const renderComposeButton = () => (
    <UiIconButton
      size="sm"
      variant="subtle"
      onClick={() => controller.setIsComposeOpen(true)}
      aria-label={t.newMessageTitle}
      icon={<SquarePen className="w-[16px] h-[16px] text-[var(--ios-blue)]" strokeWidth={2.2} />}
    />
  )

  const composePropForView = (activeContext: boolean) => (activeContext ? controller.isComposeOpen : false)

  return (
    <>
      {mode === 'tab' && (
        <div className="flex flex-col gap-3">
          <UiSegmentedControl<'inbox' | 'sent' | 'notices'>
            value={controller.messagesSubTab}
            onChange={controller.handleSelectMessagesSubTab}
            options={[
              { id: 'inbox', label: t.messagesInbox },
              { id: 'sent', label: pickText(lang, { pl: 'Wysłane', en: 'Sent' }) },
              { id: 'notices', label: t.messagesAnnouncements }
            ]}
          />
          <div
            key={controller.messagesSubTab}
            className={controller.messagesSubDir >= 0 ? 'tab-enter-right' : 'tab-enter-left'}
          >
            <MessagesView
              mode={controller.messagesSubTab === 'notices' ? 'announcements' : 'messages'}
              folder={controller.messagesSubTab === 'sent' ? 'sent' : 'inbox'}
              messages={controller.messagesSubTab === 'sent' ? sentMessages : messages}
              announcements={announcements}
              receivers={receivers}
              isComposeOpen={composePropForView(true)}
              onCloseCompose={() => controller.setIsComposeOpen(false)}
              onLoadReceivers={ensureReceivers}
              onOpenMessage={onOpenMessage}
              onMarkMessageRead={onMarkMessageRead}
              onDownloadAttachment={onDownloadAttachment}
              onSendMessage={onSendMessage}
              isLoading={isLoadingMessages}
              lang={lang}
              t={t}
              onSubViewChange={controller.setIsReaderOverlayOpen}
            />
          </div>
        </div>
      )}

      <UiScreen
        isSubView
        isOpen={mode === 'subview-messages'}
        onClose={onCloseSubview}
        title={t.messagesInbox}
        backLabel={t.backAction}
        isReceded={hasOverlay}
        trailing={renderComposeButton()}
      >
        <div className="flex flex-col gap-3">
          <UiSegmentedControl<'inbox' | 'sent'>
            value={currentFolder}
            onChange={setCurrentFolder}
            options={[
              { id: 'inbox', label: t.messagesInbox },
              { id: 'sent', label: pickText(lang, { pl: 'Wysłane', en: 'Sent' }) }
            ]}
          />
          <MessagesView
            mode="messages"
            folder={currentFolder}
            messages={currentFolder === 'sent' ? sentMessages : messages}
            announcements={announcements}
            receivers={receivers}
            isComposeOpen={composePropForView(mode === 'subview-messages')}
            onCloseCompose={() => controller.setIsComposeOpen(false)}
            onLoadReceivers={ensureReceivers}
            onOpenMessage={onOpenMessage}
            onMarkMessageRead={onMarkMessageRead}
            onDownloadAttachment={onDownloadAttachment}
            onSendMessage={onSendMessage}
            isLoading={isLoadingMessages}
            lang={lang}
            t={t}
            onSubViewChange={controller.setIsReaderOverlayOpen}
          />
        </div>
      </UiScreen>

      <UiScreen
        isSubView
        isOpen={mode === 'subview-announcements'}
        onClose={onCloseSubview}
        title={t.messagesAnnouncements}
        backLabel={t.backAction}
        isReceded={hasOverlay}
      >
        <MessagesView
          mode="announcements"
          messages={messages}
          announcements={announcements}
          receivers={receivers}
          isComposeOpen={false}
          onOpenMessage={onOpenMessage}
          onMarkMessageRead={onMarkMessageRead}
          onDownloadAttachment={onDownloadAttachment}
          onSendMessage={onSendMessage}
          isLoading={isLoadingMessages}
          lang={lang}
          t={t}
          onSubViewChange={controller.setIsReaderOverlayOpen}
        />
      </UiScreen>
    </>
  )
}
