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
}

export interface DaySchedule {
    dayName: string
    date?: string
    lessons: LessonItem[]
}

export interface AbsentTeacherItem {
    teacher: string
    date: string
    reason?: string
    isRelevantToStudent: boolean
}

export interface SmartTimetableResult {
    schedule: DaySchedule[]
    allAbsentTeachers: AbsentTeacherItem[]
}