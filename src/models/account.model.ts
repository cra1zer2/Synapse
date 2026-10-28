export interface StudentProfile {
    fullName: string
    className: string
    schoolName: string
    luckyNumber: number | null
    role: 'student' | 'parent'
}

export interface SavedAccount {
    id: string
    username: string
    password: string
    role: 'student' | 'parent'
    profile: StudentProfile
    isActive: boolean
}