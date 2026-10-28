export interface BenchmarkItem {
    endpoint: string
    durationMs: number
    success: boolean
    payloadBytes: number
    error?: string
}

export interface BenchmarkReport {
    timestamp: string
    authorizationDurationMs: number
    totalDurationMs: number
    slowestEndpoint: string
    fastestEndpoint: string
    items: BenchmarkItem[]
}