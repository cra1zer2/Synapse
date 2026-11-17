/**
 * Models: Account & Profile
 * Defines normalized Librus student/parent profile metadata and locally stored account records.
 * Used by account session hooks, server profile actions, auth views, and settings.
 */

export interface StudentProfile {
  fullName: string
  className: string
  schoolName: string
  luckyNumber: number | null
  classNumber?: number | null
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
