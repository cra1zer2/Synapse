export interface AttendanceStats {
    totalLessons: number
    presences: number
    absences: number
    excused: number
    unexcused: number
    lateness: number
    latenessOverLimit: number
    attendancePercentage: number
    isAtRisk: boolean
    safeAbsencesRemaining: number
    lessonsToRecover: number
}

export interface SubjectAttendance {
    subject: string
    totalLessons: number
    absentLessons: number
    percentage: number
    isAtRisk: boolean
}

export interface AttendanceResult {
    overall: AttendanceStats
    subjects: SubjectAttendance[]
}