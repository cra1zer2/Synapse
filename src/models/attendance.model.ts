export interface AbsenceDetail {
    id?: number | string
    date: string
    lessonNumber: number
    time: string
    subject: string
    teacher: string
    type: 'nb' | 'u' | 'sl' | 'sp' | 'zw'
    typeName: string
    isUnexcused: boolean
}

export interface SubjectAttendance {
    subject: string
    totalLessons: number
    absentLessons: number
    excusedCount: number
    unexcusedCount: number
    percentage: number
    status: 'danger' | 'warning' | 'safe'
    absences: AbsenceDetail[]
}

export interface AttendanceResult {
    overallPercentage: number
    overallStatus: 'danger' | 'warning' | 'safe'
    totalScheduled: number
    totalAbsent: number
    safeAbsencesRemaining: number
    lessonsToRecover: number
    subjects: SubjectAttendance[]
    unexcusedAbsences: AbsenceDetail[]
}