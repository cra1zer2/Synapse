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

export interface PendingJustificationRecord {
    id: string
    dateIso: string
    dateDisplay?: string
    lessons: number[]
    message: string
    submittedAt: string
    status: 'pending'
}

export interface LiveJustificationItem {
    id: string
    periodStr: string
    dates: string[]
    lessons: number[]
    count: number
    comment: string
    teacher: string
    sentAt: string
    statusRaw: string
    statusCode: 'accepted' | 'pending' | 'rejected' | 'unknown'
}

export interface GatewayResponse<T> {
    success: boolean
    data?: T
    error?: string
}

export type DayMatrixLessonStatus = 'nb' | 'u' | 'sl' | 'sp' | 'zw' | 'present' | 'cancelled' | 'pending'

export interface DayMatrixLesson {
    lessonNumber: number
    time: string
    subject: string
    status: DayMatrixLessonStatus
    statusLabel: string
    isSelectable: boolean
    isSelected: boolean
    isPending?: boolean
}

export interface DayMatrixGroup {
    date: string
    isoDate: string
    dayName: string
    lessons: DayMatrixLesson[]
    hasUnexcused: boolean
}
