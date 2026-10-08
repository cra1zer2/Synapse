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
        type: 'absence' | 'grade' | 'substitution' | 'calendar' | 'message' | 'general'
        targetId?: string | number
    }
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

export interface NotificationPreferences {
    enabled: boolean
    grades: boolean
    timetableChanges: boolean
    absences: boolean
    messages: boolean
    announcements: boolean
    calendarEvents: boolean
}