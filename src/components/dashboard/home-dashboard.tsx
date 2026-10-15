'use client'

import { SmartTimetableResult } from '@/models/timetable.model'
import { MiniScheduleWidget } from './mini-schedule-widget'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { TextClampOption } from '@/app/page'

interface HomeDashboardProps {
    timetableData: SmartTimetableResult | null
    isLoading?: boolean
    textClamp?: TextClampOption
    lang?: AppLanguage
    t: AppDictionary
    onOpenFullSchedule: () => void
}

export function HomeDashboard({
    timetableData,
    isLoading = false,
    textClamp = 'full',
    lang = 'pl',
    t,
    onOpenFullSchedule
}: HomeDashboardProps) {
    return (
        <MiniScheduleWidget
            timetableData={timetableData}
            isLoading={isLoading}
            textClamp={textClamp}
            lang={lang}
            t={t}
            onOpenFullSchedule={onOpenFullSchedule}
        />
    )
}