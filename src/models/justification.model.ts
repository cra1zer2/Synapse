export interface JustificationPayload {
    dateFrom: string
    dateTo: string
    messageFromParent: string
    lessons: number[]
    sendNotify: boolean
}

export interface JustificationRecord {
    id?: number | string
    dateFrom: string
    dateTo: string
    messageFromParent?: string
    lessons?: number[]
    status?: string
    statusName?: string
    [key: string]: any
}

export interface GatewayResponse<T> {
    success: boolean
    data?: T
    error?: string
}