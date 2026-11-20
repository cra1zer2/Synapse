/**
 * Feature Controller & View Host: Schedule & Calendar Events
 * Encapsulates timetable sub-navigation, lesson/event detail modal state, and weekly or event views.
 * Handles loading and retry fallbacks cleanly across both `tabs` mode and push subviews.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { LessonItem, SmartTimetableResult, TimetableEvent } from '@/models/timetable.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { useSubTabMotion } from '@/hooks/subtab-motion.hook'
import { UiScreen } from '@/components/ui/ui-screen'
import { UiSegmentedControl } from '@/components/ui/ui-controls'
import { UiEmptyState } from '@/components/ui/ui-empty-state'
import { UiSpinner } from '@/components/ui/ui-spinner'
import { ScheduleView } from './schedule-view'
import { UpcomingEventsScreen } from './upcoming-events-screen'
import { LessonDetailModal } from './lesson-detail-modal'
import { EventDetailModal } from './event-detail-modal'

interface UseScheduleFeatureOptions {
  timetableData: SmartTimetableResult | null
  todayTimetableData: SmartTimetableResult | null
  selectedDay: string
  setSelectedDay: (day: string) => void
  queueWeekChange: (dateIso: string) => void
  onOpenScheduleScreen: () => void
  onOpenEventsScreen: () => void
}

export type ScheduleSubTab = 'timetable' | 'events' | 'calendar'

const SCHEDULE_SUBTAB_ORDER: Record<ScheduleSubTab, number> = {
  timetable: 0,
  events: 1,
  calendar: 2
}

export function useScheduleFeature({
  timetableData,
  todayTimetableData,
  selectedDay,
  setSelectedDay,
  queueWeekChange,
  onOpenScheduleScreen,
  onOpenEventsScreen
}: UseScheduleFeatureOptions) {
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: LessonItem; isToday: boolean } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(null)
  const [scheduleSubTab, setScheduleSubTab] = useState<ScheduleSubTab>('timetable')
  const { animClass: subTabAnimClass, trigger: triggerSubTabMotion } = useSubTabMotion(230)

  const openLesson = useCallback((lesson: LessonItem, isToday: boolean) => {
    setSelectedLesson({ lesson, isToday })
  }, [])

  const openLessonFromMini = useCallback(
    (lesson: LessonItem) => {
      const source = timetableData || todayTimetableData
      const todayDay = source?.schedule?.find((d) =>
        d.lessons?.some((l) => l.number === lesson.number && l.time === lesson.time && l.subject === lesson.subject)
      )
      setSelectedLesson({ lesson, isToday: Boolean(todayDay?.isToday) })
    },
    [timetableData, todayTimetableData]
  )

  const openEvent = useCallback((ev: TimetableEvent) => {
    setSelectedEvent(ev)
  }, [])

  const openFullSchedule = useCallback(
    (targetDay?: string, targetIsoDate?: string) => {
      if (targetDay) setSelectedDay(targetDay)
      if (targetIsoDate) queueWeekChange(targetIsoDate)
      setScheduleSubTab('timetable')
      onOpenScheduleScreen()
    },
    [setSelectedDay, queueWeekChange, onOpenScheduleScreen]
  )

  const openEvents = useCallback(() => {
    setScheduleSubTab('events')
    onOpenEventsScreen()
  }, [onOpenEventsScreen])

  const changeSubTab = useCallback(
    (next: ScheduleSubTab) => {
      if (next === scheduleSubTab) return
      triggerSubTabMotion(SCHEDULE_SUBTAB_ORDER[next] >= SCHEDULE_SUBTAB_ORDER[scheduleSubTab] ? 1 : -1)
      setScheduleSubTab(next)
    },
    [scheduleSubTab, triggerSubTabMotion]
  )

  return {
    selectedLesson,
    setSelectedLesson,
    selectedEvent,
    setSelectedEvent,
    scheduleSubTab,
    subTabAnimClass,
    changeSubTab,
    setScheduleSubTab,
    openLesson,
    openLessonFromMini,
    openEvent,
    openFullSchedule,
    openEvents
  }
}

export type ScheduleFeatureController = ReturnType<typeof useScheduleFeature>

interface ScheduleFeatureProps {
  controller: ScheduleFeatureController
  mode: 'tab' | 'subview-schedule' | 'subview-upcoming' | 'hidden'
  onCloseSubview: () => void
  onSheetChange?: (isOpen: boolean) => void
  timetableData: SmartTimetableResult | null
  todayTimetableData: SmartTimetableResult | null
  timetableError: string | null
  onRetry: () => void
  selectedDay: string
  onSelectDay: (day: string) => void
  currentWeekPivot: string
  onShiftWeek: (deltaDays: number) => void
  onSelectDate: (dateIso: string) => void
  isLoadingWeek: boolean
  isUpdating: boolean
  showFullSubjectNames: boolean
  showHomeworks: boolean
  lang: AppLanguage
  t: AppDictionary
}

export function ScheduleFeature({
  controller,
  mode,
  onCloseSubview,
  onSheetChange,
  timetableData,
  todayTimetableData,
  timetableError,
  onRetry,
  selectedDay,
  onSelectDay,
  currentWeekPivot,
  onShiftWeek,
  onSelectDate,
  isLoadingWeek,
  isUpdating,
  showFullSubjectNames,
  showHomeworks,
  lang,
  t
}: ScheduleFeatureProps) {
  const isSheetOpen = Boolean(controller.selectedLesson || controller.selectedEvent)

  useEffect(() => {
    onSheetChange?.(isSheetOpen)
  }, [isSheetOpen, onSheetChange])

  const eventsTitle = pickText(lang, { pl: 'Sprawdziany i terminy', en: 'Tests & Deadlines' })
  const isSelectedDayToday = Boolean(
    timetableData?.schedule?.find((d) => d.dayName === selectedDay)?.isToday
  )

  const renderFallback = () =>
    timetableError ? (
      <UiEmptyState
        iconTone="red"
        icon={<AlertCircle className="w-[22px] h-[22px]" strokeWidth={2} />}
        title={timetableError}
        action={{ label: t.refresh, onClick: onRetry }}
        className="my-12"
      />
    ) : (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <UiSpinner size="large" className="text-[var(--ios-blue)]" />
        <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-tight">
          {t.loadingTimetable}
        </span>
      </div>
    )

  const renderSegmentedBody = (includeEventsTab: boolean) => (
    <div className="flex flex-col gap-3.5">
      {includeEventsTab && (
        <UiSegmentedControl<ScheduleSubTab>
          value={controller.scheduleSubTab}
          onChange={controller.changeSubTab}
          options={[
            { id: 'timetable', label: pickText(lang, { pl: 'Lekcje', en: 'Lessons' }) },
            { id: 'events', label: pickText(lang, { pl: 'Terminy', en: 'Deadlines' }) },
            { id: 'calendar', label: pickText(lang, { pl: 'Kalendarz', en: 'Calendar' }) }
          ]}
          className="w-full"
        />
      )}
      <div
        key={includeEventsTab ? controller.scheduleSubTab : 'subview-timetable'}
        className={includeEventsTab ? controller.subTabAnimClass : undefined}
      >
        {!includeEventsTab || controller.scheduleSubTab === 'timetable' ? (
          timetableData ? (
            <ScheduleView
              timetableData={timetableData}
              selectedDay={selectedDay}
              onSelectDay={onSelectDay}
              onSelectLesson={(lesson) => controller.openLesson(lesson, isSelectedDayToday)}
              onSelectEvent={controller.openEvent}
              currentWeekPivot={currentWeekPivot}
              onShiftWeek={onShiftWeek}
              onSelectDate={onSelectDate}
              isLoadingWeek={isLoadingWeek}
              showFullSubjectNames={showFullSubjectNames}
              showHomeworks={showHomeworks}
              lang={lang}
              t={t}
            />
          ) : (
            renderFallback()
          )
        ) : (
          <UpcomingEventsScreen
            timetableData={todayTimetableData || timetableData}
            isLoading={isLoadingWeek}
            showHomeworks={showHomeworks}
            showFullSubjectNames={showFullSubjectNames}
            lang={lang}
            viewMode={controller.scheduleSubTab === 'calendar' ? 'calendar' : 'list'}
            hideViewSwitcher
            onSelectEvent={controller.openEvent}
          />
        )}
      </div>
    </div>
  )

  return (
    <>
      {mode === 'tab' && renderSegmentedBody(true)}

      <UiScreen
        isSubView
        isOpen={mode === 'subview-schedule'}
        onClose={onCloseSubview}
        title={t.schedule}
        backLabel={t.backAction}
      >
        {renderSegmentedBody(false)}
      </UiScreen>

      <UiScreen
        isSubView
        isOpen={mode === 'subview-upcoming'}
        onClose={onCloseSubview}
        title={eventsTitle}
        backLabel={t.backAction}
      >
        <UpcomingEventsScreen
          timetableData={todayTimetableData || timetableData}
          isLoading={isUpdating}
          showHomeworks={showHomeworks}
          showFullSubjectNames={showFullSubjectNames}
          lang={lang}
          onSelectEvent={controller.openEvent}
        />
      </UiScreen>

      <LessonDetailModal
        lesson={controller.selectedLesson?.lesson || null}
        isToday={Boolean(controller.selectedLesson?.isToday)}
        onClose={() => controller.setSelectedLesson(null)}
        lang={lang}
        t={t}
      />

      <EventDetailModal
        event={controller.selectedEvent}
        isOpen={Boolean(controller.selectedEvent)}
        onClose={() => controller.setSelectedEvent(null)}
        lang={lang}
        t={t}
      />
    </>
  )
}
