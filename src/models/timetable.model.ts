export interface LessonItem {
    number: number
    subject: string
    teacher: string
    room: string
    time: string
    durationMinutes: number
    isShortened: boolean
    isCancelled: boolean
    isSubstitution: boolean
    flag: string | null
    teacherAbsent: boolean
    teacherAbsenceReason?: string
    lessonCount?: number
    topic?: string
}

export interface TimetableEvent {
    id?: string | number
    title: string
    date: string
    isoDate: string
    isAbsence: boolean
    category: 'holiday' | 'exam' | 'info'
}

export interface DaySchedule {
    dayName: string
    date: string
    isoDate: string
    isToday: boolean
    events: TimetableEvent[]
    lessons: LessonItem[]
}

export interface AbsentTeacherItem {
    teacher: string
    date: string
    isoDate: string
    reason?: string
    isRelevantToStudent: boolean
}

export interface SmartTimetableResult {
    weekStart: string
    weekEnd: string
    schedule: DaySchedule[]
    allAbsentTeachers: AbsentTeacherItem[]
    calendarEvents: TimetableEvent[]
}