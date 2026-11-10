'use client'

import { useState, useEffect, useCallback } from 'react'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosCard, IosSegmentedControl } from '@/components/ios/ios-ui'
import { IosSpinner } from '@/components/ios/ios-spinner'
import {
  RequestLogItem,
  getRequestLogs,
  clearRequestLogs,
  subscribeToLogs,
  addRequestLog,
  formatLogsForExport
} from '@/utils/request-logger.util'
import { runDisplayDiagnosticsAction } from '@/app/actions'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
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
  const isEn = lang === 'en'
  const [logs, setLogs] = useState<RequestLogItem[]>([])
  const [activeTab, setActiveTab] = useState<'cards' | 'raw'>('cards')
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

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
    try {
      const res = await runDisplayDiagnosticsAction(username, password, true)
      const clientDurationMs = Math.round(performance.now() - t0)

      const breakdown: Record<string, number> = {}
      if (res.items && res.items.length > 0) {
        res.items.forEach((item) => {
          breakdown[item.category || item.name] = item.durationMs
        })
      }

      addRequestLog({
        name: 'Test diagnostyczny (Wszystkie odczyty)',
        clientDurationMs,
        serverDurationMs: res.totalDurationMs,
        breakdown,
        status: res.success ? 'ok' : 'error',
        error: res.error,
        details: res.items ? 'Przetestowano ' + res.items.length + ' punktów końcowych' : undefined
      })
    } catch (err: any) {
      const clientDurationMs = Math.round(performance.now() - t0)
      addRequestLog({
        name: 'Test diagnostyczny (Wszystkie odczyty)',
        clientDurationMs,
        status: 'error',
        error: err?.message || 'Nieznany błąd',
        details: 'Błąd podczas wykonywania testu'
      })
    } finally {
      setIsRunningTest(false)
    }
  }, [username, password, isRunningTest])

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
      setTimeout(() => setCopySuccess(false), 2200)
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
      <span className={cn('text-[12px] font-semibold px-2.5 py-0.5 rounded-full tracking-tight shrink-0 tabular-nums', colorClass)}>
        {ms} ms
      </span>
    )
  }

  const totalLogs = logs.length
  const avgDuration = totalLogs > 0
    ? Math.round(logs.reduce((sum, item) => sum + item.clientDurationMs, 0) / totalLogs)
    : 0

  return (
    <IosScreen
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? 'Request Timings (Debug)' : 'Czas zapytań (Debug)'}
      backLabel={t?.settingsTitle || (isEn ? 'Settings' : 'Ustawienia')}
      showBackButton={true}
      isSubView={true}
      zIndex={65}
    >
      <div className="flex flex-col gap-4 pb-16 select-none">
        <IosCard className="p-4 flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                disabled={isRunningTest || !username || !password}
                onClick={handleRunDiagnostics}
                className={cn(
                  'flex-1 sm:flex-initial h-10 px-4 rounded-full text-[14px] font-semibold tracking-[-0.2px] flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-95',
                  isRunningTest
                    ? 'bg-[var(--ios-element)] text-[var(--ios-secondary)] opacity-70 cursor-not-allowed'
                    : 'bg-[var(--ios-blue)] text-white'
                )}
              >
                {isRunningTest ? (
                  <>
                    <IosSpinner size="small" />
                    <span>{isEn ? 'Testing endpoints...' : 'Testowanie zapytań...'}</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>{isEn ? 'Run latency test' : 'Uruchom test'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyLogs}
                className={cn(
                  'flex-1 sm:flex-initial h-10 px-4 rounded-full text-[14px] font-semibold tracking-[-0.2px] flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-95',
                  copySuccess
                    ? 'bg-[var(--ios-green)] text-white'
                    : 'bg-[var(--ios-element)] text-[var(--ios-label)] hover:opacity-85'
                )}
              >
                {copySuccess ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{isEn ? 'Copied!' : 'Skopiowano!'}</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{isEn ? 'Copy log' : 'Kopiuj log'}</span>
                  </>
                )}
              </button>
            </div>

            {totalLogs > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="h-10 px-3 rounded-full text-[13px] font-medium text-[var(--ios-secondary)] hover:text-[var(--ios-red)] transition-colors flex items-center justify-center gap-1 cursor-pointer select-none active:scale-95"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>{isEn ? 'Clear' : 'Wyczyść'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-[var(--ios-separator)]">
            <div className="bg-[var(--bg-card-secondary)] rounded-[14px] p-2.5 flex flex-col">
              <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider">
                {isEn ? 'Requests' : 'Zapytań'}
              </span>
              <span className="text-[16px] font-bold text-[var(--ios-label)] mt-0.5 tabular-nums">
                {totalLogs}
              </span>
            </div>

            <div className="bg-[var(--bg-card-secondary)] rounded-[14px] p-2.5 flex flex-col">
              <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider">
                {isEn ? 'Average roundtrip' : 'Średni czas'}
              </span>
              <span className="text-[16px] font-bold text-[var(--ios-label)] mt-0.5 tabular-nums">
                {avgDuration > 0 ? avgDuration + ' ms' : '—'}
              </span>
            </div>

            <div className="bg-[var(--bg-card-secondary)] rounded-[14px] p-2.5 flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider">
                {isEn ? 'Latest request' : 'Ostatnie zapytanie'}
              </span>
              <span className="text-[13px] font-semibold text-[var(--ios-label)] mt-0.5 truncate tabular-nums">
                {logs[0]?.timestamp || '—'}
              </span>
            </div>
          </div>
        </IosCard>

        <div className="flex justify-center">
          <IosSegmentedControl
            options={[
              { id: 'cards', label: isEn ? 'Cards view' : 'Karty zapytań' },
              { id: 'raw', label: isEn ? 'Raw export' : 'Tekst raportu' }
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'cards' | 'raw')}
            className="w-full max-w-xs"
          />
        </div>

        {activeTab === 'cards' && (
          <div className="flex flex-col gap-2.5">
            {logs.length === 0 ? (
              <IosCard className="p-8 text-center flex flex-col items-center justify-center gap-2 text-[var(--ios-secondary)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 mb-1">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-[15px] font-medium text-[var(--ios-label)]">
                  {isEn ? 'No requests recorded yet' : 'Brak zarejestrowanych zapytań'}
                </span>
                <p className="text-[13px] text-[var(--ios-secondary)] max-w-sm">
                  {isEn
                    ? 'Perform navigation, sync data or click "Run test" to benchmark all read endpoints.'
                    : 'Przejdź po aplikacji, odśwież plan/oceny lub kliknij "Uruchom test", aby zmierzyć czas odpowiedzi.'}
                </p>
              </IosCard>
            ) : (
              logs.map((item) => {
                const isError = item.status === 'error'
                return (
                  <IosCard key={item.id} className="p-3.5 flex flex-col gap-2">
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

                      <div className="flex items-center gap-1.5 shrink-0">
                        {renderTimingBadge(item.clientDurationMs)}
                      </div>
                    </div>

                    {(item.serverDurationMs !== undefined || item.breakdown || item.details || item.error) && (
                      <div className="pt-2 border-t border-[var(--ios-separator)] flex flex-col gap-1.5 text-[12px]">
                        {item.serverDurationMs !== undefined && (
                          <div className="flex items-center justify-between text-[var(--ios-secondary)]">
                            <span>{isEn ? 'Server processing time:' : 'Czas przetwarzania serwera:'}</span>
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
                                className="bg-[var(--bg-card-secondary)] text-[var(--ios-label)] px-2 py-0.5 rounded-[8px] text-[11px] font-medium font-mono"
                              >
                                {k}: {v}ms
                              </span>
                            ))}
                          </div>
                        )}

                        {item.details && (
                          <div className="text-[11px] text-[var(--ios-secondary)] truncate">
                            {item.details}
                          </div>
                        )}

                        {item.error && (
                          <div className="text-[11px] text-[var(--ios-red)] bg-[var(--ios-red-subtle)] px-2.5 py-1 rounded-[8px] font-mono">
                            {item.error}
                          </div>
                        )}
                      </div>
                    )}
                  </IosCard>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <IosCard className="p-4 flex flex-col gap-2.5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase text-[var(--ios-secondary)] tracking-wider">
                {isEn ? 'Raw diagnostic output' : 'Tekst wyjściowy dla wsparcia'}
              </span>
              <button
                type="button"
                onClick={handleCopyLogs}
                className="text-[12px] font-semibold text-[var(--ios-blue)] hover:underline cursor-pointer"
              >
                {copySuccess ? (isEn ? 'Copied!' : 'Skopiowano!') : (isEn ? 'Copy text' : 'Kopiuj tekst')}
              </button>
            </div>
            <pre className="w-full bg-[var(--bg-card-secondary)] p-3.5 rounded-[14px] text-[11px] leading-relaxed font-mono text-[var(--ios-label)] overflow-x-auto whitespace-pre-wrap select-text max-h-[380px] overflow-y-auto border border-[var(--ios-separator)]">
              {formatLogsForExport(logs)}
            </pre>
          </IosCard>
        )}
      </div>
    </IosScreen>
  )
}
