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

export interface SubjectGrades {
    subject: string
    semester1: GradeItem[]
    semester2: GradeItem[]
    average1: number | null
    average2: number | null
    finalAverage: number | null
}

export interface GradesResult {
    subjects: SubjectGrades[]
    overallAverage: number | null
    recentGrades: GradeItem[]
}