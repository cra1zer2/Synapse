export type WidgetType = 'next_lesson' | 'frekwencja_ring' | 'lucky_number' | 'recent_grades' | 'risk_alert'

export type WidgetSize = 'small' | 'medium' | 'large'

export interface DashboardWidgetConfig {
    id: string
    type: WidgetType
    size: WidgetSize
    order: number
    isEnabled: boolean
}