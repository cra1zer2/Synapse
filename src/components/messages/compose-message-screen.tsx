'use client'

import { useState, FormEvent } from 'react'
import { ReceiverItem } from '@/models/message.model'
import { AppDictionary } from '@/config/dictionary.config'
import { IosCard } from '@/components/ios/ios-ui'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { RecipientPickerScreen } from './recipient-picker-screen'

interface ComposeMessageScreenProps {
  isOpen: boolean
  receivers: ReceiverItem[]
  initialRecipients?: ReceiverItem[]
  initialTitle?: string
  onClose: () => void
  onSend: (receiverIds: number[], title: string, body: string) => Promise<boolean>
  t: AppDictionary
}

export function ComposeMessageScreen({
  isOpen,
  receivers,
  initialRecipients = [],
  initialTitle = '',
  onClose,
  onSend,
  t
}: ComposeMessageScreenProps) {
  const [recipients, setRecipients] = useState<ReceiverItem[]>(initialRecipients)
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const handleToggleRecipient = (r: ReceiverItem) => {
    setRecipients((prev) => {
      const exists = prev.some((x) => x.id === r.id)
      return exists ? prev.filter((x) => x.id !== r.id) : [...prev, r]
    })
  }

  const handleRemove = (id: number) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id))
  }

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (recipients.length === 0 || !title.trim() || !body.trim() || isSending) return

    setIsSending(true)
    const ids = recipients.map((r) => r.id)
    const success = await onSend(ids, title, body)
    setIsSending(false)

    if (success) {
      setIsSent(true)
      setTimeout(() => {
        setIsSent(false)
        onClose()
      }, 650)
    }
  }

  return (
    <>
      <IosScreen
        isOpen={isOpen}
        onClose={onClose}
        title={t.newMessageTitle}
        backLabel={t.cancel}
        isSubView={true}
        isReceded={showPicker}
        className="z-[70]"
        trailing={
          <button
            type="button"
            disabled={isSending || recipients.length === 0 || !title.trim() || !body.trim()}
            onClick={() => handleSubmit()}
            className="text-[17px] font-semibold text-[var(--ios-blue)] disabled:opacity-40 active:opacity-60 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isSending && <IosSpinner size="small" className="text-[var(--ios-blue)]" />}
            <span>{isSending ? t.sending : t.send}</span>
          </button>
        }
      >
        <div className="flex flex-col gap-4 pb-16 select-none max-w-[402px] mx-auto w-full">
          {isSent ? (
            <IosCard className="p-8 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--ios-green-subtle)] text-[var(--ios-green)] flex items-center justify-center text-[22px] font-bold">
                ✓
              </div>
              <h3 className="text-[17px] font-bold text-[var(--ios-label)]">{t.messageSent}</h3>
            </IosCard>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
                <div className="p-3 px-4 flex items-center gap-3 min-h-[50px]">
                  <span className="w-14 text-[15px] font-normal text-[var(--ios-secondary)] shrink-0">
                    Do:
                  </span>
                  <div className="flex-1 flex flex-wrap items-center gap-1.5">
                    {recipients.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] text-[13px] font-medium"
                      >
                        <span>{r.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemove(r.id)}
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold active:opacity-60 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}

                    <button
                      type="button"
                      onClick={() => setShowPicker(true)}
                      className="text-[15px] text-[var(--ios-blue)] font-normal px-1 py-1 active:opacity-60 cursor-pointer"
                    >
                      {recipients.length === 0 ? '+ Wybierz odbiorców...' : '+ Dodaj'}
                    </button>
                  </div>
                </div>

                <div className="p-3 px-4 flex items-center gap-3 min-h-[50px]">
                  <span className="w-14 text-[15px] font-normal text-[var(--ios-secondary)] shrink-0">
                    Temat:
                  </span>
                  <input
                    type="text"
                    placeholder={t.subjectPlaceholder}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent text-[15px] text-[var(--ios-label)] placeholder-[var(--ios-secondary)]/50 font-normal outline-none"
                    required
                  />
                </div>
              </IosCard>

              <div className="pt-2 px-1">
                <textarea
                  placeholder={t.messagePlaceholder}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-transparent text-[15px] text-[var(--ios-label)] placeholder-[var(--ios-secondary)]/50 font-normal outline-none resize-none min-h-[300px] leading-relaxed"
                  required
                />
              </div>
            </form>
          )}
        </div>
      </IosScreen>

      <RecipientPickerScreen
        isOpen={showPicker}
        receivers={receivers}
        selectedRecipients={recipients}
        onToggleRecipient={handleToggleRecipient}
        onClose={() => setShowPicker(false)}
        t={t}
      />
    </>
  )
}
