/**
 * Feature Screen: Request Latency Diagnostics Modal
 * Displays recorded client/server timing breakdowns, triggers end-to-end benchmarks, and exports anonymized reports.
 * Passes the user's selected `AppLanguage` to live diagnostics so translated endpoints match runtime usage.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Copy, Check, Trash2, Clock } from 'lucide-react'
import { UiScreen } from '@/components/ui/ui-screen'
import { UiButton } from '@/components/ui/ui-button'
import { UiCard, UiSegmentedControl } from '@/components/ui/ui-controls'
import { UiEmptyState } from '@/components/ui/ui-empty-state'
import {
  RequestLogItem,
  getRequestLogs,
  clearRequestLogs,
  subscribeToLogs,
  addRequestLog,
  formatLogsForExport
} from '@/utils/request-logger.util'
import { runDisplayDiagnosticsAction } from '@/app/actions'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { cn } from '@/utils/cn.util'

interface RequestTimingsModalProps {
  isOpen: boolean
  onClose: () => void
  username?: string
  password?: string
  lang?: AppLanguage
  t?: AppDictionary
}

export function RequestTimingsModal({
  isOpen,
  onClose,
  username,
  password,
  lang = 'pl',
  t
}: RequestTimingsModalProps) {
  const [logs, setLogs] = useState<RequestLogItem[]>([])
  const [activeTab, setActiveTab] = useState<'cards' | 'raw'>('cards')
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setLogs(getRequestLogs())
    const unsubscribe = subscribeToLogs((updatedLogs) => {
      setLogs([...updatedLogs])
    })
    return () => unsubscribe()
  }, [isOpen])

  const handleRunDiagnostics = useCallback(async () => {
    if (!username || !password || isRunningTest) return
    setIsRunningTest(true)
    const t0 = performance.now()
    const testLabel = pickText(lang, {
      pl: 'Test diagnostyczny (Wszystkie odczyty)',
      en: 'Diagnostic benchmark (all endpoints)'
    })
    try {
      const res = await runDisplayDiagnosticsAction(username, password, lang)
      const clientDurationMs = Math.round(performance.now() - t0)

      const breakdown: Record<string, number> = {}
      if (res.items && res.items.length > 0) {
        res.items.forEach((item) => {
          breakdown[item.category || item.name] = item.durationMs
        })
      }

      addRequestLog({
        name: testLabel,
        clientDurationMs,
        serverDurationMs: res.totalDurationMs,
        breakdown,
        status: res.success ? 'ok' : 'error',
        error: res.error,
        details: res.items
          ? pickText(lang, {
              pl: `Przetestowano ${res.items.length} punktów końcowych`,
              en: `Tested ${res.items.length} endpoints`
            })
          : undefined
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      const clientDurationMs = Math.round(performance.now() - t0)
      addRequestLog({
        name: testLabel,
        clientDurationMs,
        status: 'error',
        error: message || pickText(lang, { pl: 'Nieznany błąd', en: 'Unknown error' }),
        details: pickText(lang, { pl: 'Błąd podczas wykonywania testu', en: 'Diagnostic request failed' })
      })
    } finally {
      setIsRunningTest(false)
    }
  }, [username, password, isRunningTest, lang])

  const handleCopyLogs = useCallback(async () => {
    const textToCopy = formatLogsForExport(logs)
    let copied = false

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy)
        copied = true
      } catch {
        copied = false
      }
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = textToCopy
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '0'
        textarea.setAttribute('readonly', '')
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        copied = document.execCommand('copy')
        document.body.removeChild(textarea)
      } catch {
        copied = false
      }
    }

    if (copied) {
      setCopySuccess(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopySuccess(false), 2200)
    }
  }, [logs])

  const handleClearLogs = useCallback(() => {
    clearRequestLogs()
    setLogs([])
  }, [])

  const renderTimingBadge = (ms: number) => {
    let colorClass = 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)]'
    if (ms >= 3000) {
      colorClass = 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]'
    } else if (ms >= 1200) {
      colorClass = 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)]'
    }

    return (
      <span
        className={cn(
          'text-[12px] font-semibold px-2.5 py-0.5 rounded-full ios-tile tracking-tight shrink-0 tabular-nums',
          colorClass
        )}
      >
        {ms} ms
      </span>
    )
  }

  const totalLogs = logs.length
  const avgDuration =
    totalLogs > 0 ? Math.round(logs.reduce((sum, item) => sum + item.clientDurationMs, 0) / totalLogs) : 0

  return (
    <UiScreen
      isOpen={isOpen}
      onClose={onClose}
      title={pickText(lang, { pl: 'Czas zapytań', en: 'Request Timings' })}
      backLabel={t?.advancedTitle || pickText(lang, { pl: 'Zaawansowane', en: 'Advanced' })}
      isSubView={true}
      zIndex={65}
    >
      <div className="flex flex-col gap-4 pb-16 select-none">
        <UiCard className="p-4 flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <UiButton
                type="button"
                variant="primary"
                size="md"
                disabled={isRunningTest || !username || !password}
                onClick={handleRunDiagnostics}
                loading={isRunningTest}
                icon={!isRunningTest ? <Play className="w-3.5 h-3.5" strokeWidth={2.4} /> : undefined}
                className="flex-1 sm:flex-initial"
              >
                {isRunningTest
                  ? pickText(lang, { pl: 'Testowanie zapytań...', en: 'Testing endpoints...' })
                  : pickText(lang, { pl: 'Uruchom test', en: 'Run latency test' })}
              </UiButton>

              <UiButton
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCopyLogs}
                icon={
                  copySuccess ? (
                    <Check className="w-4 h-4 text-[var(--ios-green)]" strokeWidth={2.5} />
                  ) : (
                    <Copy className="w-4 h-4" strokeWidth={2.2} />
                  )
                }
                className={cn(
                  'flex-1 sm:flex-initial',
                  copySuccess && 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)]'
                )}
              >
                {copySuccess
                  ? pickText(lang, { pl: 'Skopiowano!', en: 'Copied!' })
                  : pickText(lang, { pl: 'Kopiuj log', en: 'Copy log' })}
              </UiButton>
            </div>

            {totalLogs > 0 && (
              <UiButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearLogs}
                icon={<Trash2 className="w-3.5 h-3.5" strokeWidth={2} />}
                className="text-[var(--ios-secondary)] hover:text-[var(--ios-red)]"
              >
                {pickText(lang, { pl: 'Wyczyść', en: 'Clear' })}
              </UiButton>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t [border-top-width:0.5px] border-[var(--ios-separator)]">
            <div className="ios-well rounded-[14px] p-2.5 flex flex-col">
              <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider">
                {pickText(lang, { pl: 'Zapytań', en: 'Requests' })}
              </span>
              <span className="text-[16px] font-bold text-[var(--ios-label)] mt-0.5 tabular-nums">
                {totalLogs}
              </span>
            </div>

            <div className="ios-well rounded-[14px] p-2.5 flex flex-col">
              <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider">
                {pickText(lang, { pl: 'Średni czas', en: 'Average roundtrip' })}
              </span>
              <span className="text-[16px] font-bold text-[var(--ios-label)] mt-0.5 tabular-nums">
                {avgDuration > 0 ? avgDuration + ' ms' : '—'}
              </span>
            </div>

            <div className="ios-well rounded-[14px] p-2.5 flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider">
                {pickText(lang, { pl: 'Ostatnie zapytanie', en: 'Latest request' })}
              </span>
              <span className="text-[13px] font-semibold text-[var(--ios-label)] mt-0.5 truncate tabular-nums">
                {logs[0]?.timestamp || '—'}
              </span>
            </div>
          </div>
        </UiCard>

        <div className="flex justify-center">
          <UiSegmentedControl<'cards' | 'raw'>
            options={[
              { id: 'cards', label: pickText(lang, { pl: 'Karty zapytań', en: 'Cards view' }) },
              { id: 'raw', label: pickText(lang, { pl: 'Tekst raportu', en: 'Raw export' }) }
            ]}
            value={activeTab}
            onChange={setActiveTab}
            className="w-full max-w-xs"
          />
        </div>

        {activeTab === 'cards' && (
          <div className="flex flex-col gap-2.5">
            {logs.length === 0 ? (
              <UiEmptyState
                inCard
                iconTone="neutral"
                icon={<Clock className="w-[22px] h-[22px]" strokeWidth={1.9} />}
                title={pickText(lang, { pl: 'Brak zarejestrowanych zapytań', en: 'No requests recorded yet' })}
                subtitle={pickText(lang, {
                  pl: 'Przejdź po aplikacji, odśwież dane lub kliknij "Uruchom test", aby zmierzyć czas odpowiedzi.',
                  en: 'Navigate the app, sync data, or click "Run latency test" to measure response times.'
                })}
              />
            ) : (
              logs.map((item) => {
                const isError = item.status === 'error'
                return (
                  <UiCard key={item.id} className="p-3.5 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              isError ? 'bg-[var(--ios-red)]' : 'bg-[var(--ios-green)]'
                            )}
                          />
                          <span className="text-[14px] font-semibold text-[var(--ios-label)] truncate leading-tight">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--ios-secondary)] font-mono mt-0.5 pl-4">
                          {item.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">{renderTimingBadge(item.clientDurationMs)}</div>
                    </div>

                    {(item.serverDurationMs !== undefined || item.breakdown || item.details || item.error) && (
                      <div className="pt-2 border-t [border-top-width:0.5px] border-[var(--ios-separator)] flex flex-col gap-1.5 text-[12px]">
                        {item.serverDurationMs !== undefined && (
                          <div className="flex items-center justify-between text-[var(--ios-secondary)]">
                            <span>
                              {pickText(lang, { pl: 'Czas przetwarzania serwera:', en: 'Server processing time:' })}
                            </span>
                            <span className="font-mono font-medium text-[var(--ios-label)]">
                              {item.serverDurationMs} ms
                            </span>
                          </div>
                        )}

                        {item.breakdown && Object.keys(item.breakdown).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {Object.entries(item.breakdown).map(([k, v]) => (
                              <span
                                key={k}
                                className="ios-well text-[var(--ios-label)] px-2 py-0.5 rounded-[8px] text-[11px] font-medium font-mono"
                              >
                                {k}: {v}ms
                              </span>
                            ))}
                          </div>
                        )}

                        {item.details && (
                          <div className="text-[11px] text-[var(--ios-secondary)] truncate">{item.details}</div>
                        )}

                        {item.error && (
                          <div className="text-[11px] text-[var(--ios-red)] bg-[var(--ios-red-subtle)] ios-tile px-2.5 py-1 rounded-[8px] font-mono">
                            {item.error}
                          </div>
                        )}
                      </div>
                    )}
                  </UiCard>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <UiCard className="p-4 flex flex-col gap-2.5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase text-[var(--ios-secondary)] tracking-wider">
                {pickText(lang, { pl: 'Tekst wyjściowy dla wsparcia', en: 'Raw diagnostic output' })}
              </span>
              <button
                type="button"
                onClick={handleCopyLogs}
                className="text-[12px] font-semibold text-[var(--ios-blue)] hover:underline cursor-pointer"
              >
                {copySuccess
                  ? pickText(lang, { pl: 'Skopiowano!', en: 'Copied!' })
                  : pickText(lang, { pl: 'Kopiuj tekst', en: 'Copy text' })}
              </button>
            </div>
            <pre className="w-full ios-well p-3.5 rounded-[14px] text-[11px] leading-relaxed font-mono text-[var(--ios-label)] overflow-x-auto whitespace-pre-wrap select-text max-h-[380px] overflow-y-auto">
              {formatLogsForExport(logs)}
            </pre>
          </UiCard>
        )}
      </div>
    </UiScreen>
  )
}
