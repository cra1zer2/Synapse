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

export interface LegacyAttendanceSummary {
    u: number
    nu: number
    total: number
    sp: number
    zw: number
    sl: number
}

export interface LegacyAttendanceDay {
    date: string
    isoDate: string
    weekday: string
    lessons: Record<number, { symbol: string; type: 'nb' | 'u' | 'sp' | 'zw' | 'sl' | 'other' }>
    uCount: number
    nuCount: number
    totalCount: number
    spCount: number
    zwCount: number
    slCount: number
}

export interface LegacyAttendanceTable {
    summary: LegacyAttendanceSummary
    days: LegacyAttendanceDay[]
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
    legacyTable?: LegacyAttendanceTable
}