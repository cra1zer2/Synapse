'use client'

export interface RequestLogItem {
  id: string
  timestamp: string
  isoTimestamp: string
  name: string
  clientDurationMs: number
  serverDurationMs?: number
  breakdown?: Record<string, number | string>
  status: 'ok' | 'error'
  error?: string
  details?: string
}

const STORAGE_KEY = 'synapse_request_timings_log_v1'
const MAX_LOG_ENTRIES = 50

type LogListener = (logs: RequestLogItem[]) => void
const listeners = new Set<LogListener>()

function notifyListeners(logs: RequestLogItem[]) {
  listeners.forEach((cb) => {
    try {
      cb(logs)
    } catch {}
  })
}

export function getRequestLogs(): RequestLogItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function clearRequestLogs(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
    notifyListeners([])
  } catch {}
}

export function subscribeToLogs(callback: LogListener): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

export function addRequestLog(
  entry: Omit<RequestLogItem, 'id' | 'timestamp' | 'isoTimestamp'>
): RequestLogItem {
  const now = new Date()
  const timeStr = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join(':') + '.' + String(now.getMilliseconds()).padStart(3, '0')

  const newItem: RequestLogItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: timeStr,
    isoTimestamp: now.toISOString(),
    ...entry
  }

  if (typeof window !== 'undefined') {
    try {
      const existing = getRequestLogs()
      const updated = [newItem, ...existing].slice(0, MAX_LOG_ENTRIES)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      notifyListeners(updated)
    } catch {}
  }

  return newItem
}

export function getDeviceInfoSummary(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'SSR / Unknown'
  const ua = navigator.userAgent || ''
  const isIos = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const isMobile = isIos || isAndroid || /Mobile/i.test(ua)

  const screenInfo = typeof window !== 'undefined'
    ? `${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio || 1})`
    : 'Unknown screen'

  let networkInfo = 'unknown'
  const navAny = navigator as any
  if (navAny.connection) {
    const conn = navAny.connection
    networkInfo = [
      conn.effectiveType || conn.type || '',
      conn.rtt ? `RTT: ${conn.rtt}ms` : '',
      conn.downlink ? `Downlink: ${conn.downlink}Mbps` : ''
    ].filter(Boolean).join(', ') || 'available'
  }

  return [
    `Platforma: ${isIos ? 'iOS' : isAndroid ? 'Android' : 'Desktop'} (${isMobile ? 'Mobile' : 'Desktop'})`,
    `Ekran: ${screenInfo}`,
    `Sieć: ${networkInfo}`,
    `UA: ${ua}`
  ].join('\n')
}

export function formatLogsForExport(logs: RequestLogItem[]): string {
  const nowStr = new Date().toLocaleString('pl-PL')
  const deviceInfo = getDeviceInfoSummary()

  const lines: string[] = [
    '==================================================',
    '       SYNAPSE - DIAGNOSTYKA CZASU ZAPYTAŃ        ',
    '==================================================',
    `Data raportu: ${nowStr}`,
    deviceInfo,
    `Liczba zarejestrowanych zapytań: ${logs.length}`,
    '--------------------------------------------------'
  ]

  if (logs.length === 0) {
    lines.push('Brak zarejestrowanych zapytań w pamięci podręcznej.')
  } else {
    logs.forEach((log, idx) => {
      lines.push(`\n[${idx + 1}] [${log.timestamp}] ${log.name}`)
      lines.push(`    Status: ${log.status.toUpperCase()}${log.error ? ` (Błąd: ${log.error})` : ''}`)
      lines.push(`    Czas klienta (Roundtrip): ${log.clientDurationMs} ms`)
      if (log.serverDurationMs !== undefined) {
        lines.push(`    Czas serwera: ${log.serverDurationMs} ms`)
      }
      if (log.breakdown && Object.keys(log.breakdown).length > 0) {
        const bdParts = Object.entries(log.breakdown)
          .map(([k, v]) => `${k}: ${v}ms`)
          .join(' | ')
        lines.push(`    Rozbicie serwera: ${bdParts}`)
      }
      if (log.details) {
        lines.push(`    Szczegóły: ${log.details}`)
      }
    })
  }

  lines.push('\n==================================================')
  return lines.join('\n')
}
