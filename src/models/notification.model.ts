export interface ScheduleBellTime {
    lessonNumber: number
    startTime: string
    endTime: string
    checkTimestamp: number
}

export interface PushNotificationPayload {
    title: string
    body: string
    tag: string
    data: {
        url: string
        type: 'absence' | 'grade' | 'substitution' | 'general'
        targetId?: string | number
    }
}

export interface DayMatrixLesson {
    lessonNumber: number
    time: string
    subject: string
    status: 'nb' | 'u' | 'present' | 'cancelled'
    statusLabel: string
    isSelectable: boolean
    isSelected: boolean
}

export interface DayMatrixGroup {
    date: string
    isoDate: string
    dayName: string
    lessons: DayMatrixLesson[]
    hasUnexcused: boolean
}