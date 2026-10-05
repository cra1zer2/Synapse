export interface TerminarzEvent {
    id: string | number
    title: string
    date: string
    isoDate: string
    day: number
    month: number
    year: number
    category: 'absence' | 'shortened' | 'exam' | 'meeting' | 'holiday' | 'other'
    time?: string
    teacher?: string
    description?: string
}