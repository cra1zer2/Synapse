export interface GradeItem {
    id?: string | number
    grade: string
    numericValue: number | null
    weight: number
    category: string
    date: string
    teacher: string
    description?: string
    isRecent: boolean
}

export interface FixOption {
    gradeNeeded: number
    weight: number
    count: number
    description: string
}

export interface SubjectWarning {
    status: 'critical' | 'done' | 'too_late'
    message: string
    fixOptions: FixOption[]
}

export interface SubjectGrades {
    subject: string
    semester1: GradeItem[]
    semester2: GradeItem[]
    average1: number | null
    average2: number | null
    finalAverage: number | null
    warning?: SubjectWarning
}

export interface GradesResult {
    subjects: SubjectGrades[]
    overallAverage: number | null
    recentGrades: GradeItem[]
    globalWarning?: string
}