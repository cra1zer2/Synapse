'use client'
import { ReactNode } from 'react'
import { Star, Calendar, Clock, UserCheck, Mail } from 'lucide-react'
import { DashboardWidgetId } from '@/hooks/settings.hook'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { SmartTimetableResult } from '@/models/timetable.model'
import { GradesResult } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'
import { MiniScheduleWidget } from '@/features/schedule/mini-schedule-widget'
import { MiniEventsWidget } from '@/features/schedule/mini-events-widget'
import { MiniGradesWidget } from '@/features/grades/mini-grades-widget'
import { MiniAttendanceWidget } from '@/features/attendance/mini-attendance-widget'
import { MiniMessagesWidget } from '@/features/messages/mini-messages-widget'
import type { ScheduleFeatureController } from '@/features/schedule/schedule-feature'
import type { GradesFeatureController } from '@/features/grades/grades-feature'
import type { AttendanceFeatureController } from '@/features/attendance/attendance-feature'
import type { MessagesFeatureController } from '@/features/messages/messages-feature'

export interface DashboardWidgetMeta {
  title: string
  subtitle: string
  color: string
  icon: ReactNode
}

export interface DashboardWidgetRenderContext {
  lang: AppLanguage
  t: AppDictionary
  timetableData: SmartTimetableResult | null
  todayTimetableData: SmartTimetableResult | null
  gradesData: GradesResult | null
  attendanceData: AttendanceResult | null
  isUpdating: boolean
  isLoadingMessages: boolean
  timetableError: string | null
  gradesError: string | null
  attendanceError: string | null
  messagesError: string | null
  unreadCount: number
  announcementsCount: number
  showFullSubjectNames: boolean
  showHomeworks: boolean
  showMobileTodayAttendance: boolean
  scheduleCtrl: ScheduleFeatureController
  gradesCtrl: GradesFeatureController
  attendanceCtrl: AttendanceFeatureController
  messagesCtrl: MessagesFeatureController
  onRetryMain: () => void
  onRetryMessages: () => void
}

interface DashboardWidgetDefinition {
  getMeta: (lang: AppLanguage, t: AppDictionary) => DashboardWidgetMeta
  render: (ctx: DashboardWidgetRenderContext) => ReactNode
}

const WIDGET_DEFINITIONS: Record<DashboardWidgetId, DashboardWidgetDefinition> = {
  grades: {
    getMeta: (lang, t) => ({
      title: t.grades,
      subtitle: pickText(lang, { pl: 'Ostatnie oceny i średnia', en: 'Recent grades and average' }),
      color: 'bg-[var(--ios-blue)]',
      icon: <Star className="w-4 h-4" strokeWidth={2.2} />,
    }),
    render: (ctx) => (
      <MiniGradesWidget
        gradesData={ctx.gradesData}
        isLoading={ctx.isUpdating && !ctx.gradesData}
        error={ctx.gradesError}
        onRetry={ctx.onRetryMain}
        lang={ctx.lang}
        t={ctx.t}
        onOpenGrades={ctx.gradesCtrl.openFullGrades}
        onSelectGrade={ctx.gradesCtrl.openRecentGrade}
      />
    ),
  },
  schedule: {
    getMeta: (lang) => ({
      title: pickText(lang, { pl: 'Plan lekcji', en: 'Lesson Plan' }),
      subtitle: pickText(lang, { pl: 'Dzisiejsze lekcje i sale', en: 'Daily classes and rooms' }),
      color: 'bg-[var(--ios-green)]',
      icon: <Calendar className="w-4 h-4" strokeWidth={2.2} />,
    }),
    render: (ctx) => (
      <MiniScheduleWidget
        timetableData={ctx.todayTimetableData || ctx.timetableData}
        isLoading={ctx.isUpdating && !ctx.todayTimetableData && !ctx.timetableData}
        error={ctx.timetableError}
        onRetry={ctx.onRetryMain}
        showFullSubjectNames={ctx.showFullSubjectNames}
        lang={ctx.lang}
        t={ctx.t}
        showAllLessons={false}
        onSelectLesson={ctx.scheduleCtrl.openLessonFromMini}
        onOpenFullSchedule={ctx.scheduleCtrl.openFullSchedule}
      />
    ),
  },
  upcoming: {
    getMeta: (lang) => ({
      title: pickText(lang, { pl: 'Sprawdziany i terminy', en: 'Tests & Deadlines' }),
      subtitle: pickText(lang, { pl: 'Nadchodzące sprawdziany i kartkówki', en: 'Upcoming exams and quizzes' }),
      color: 'bg-[var(--ios-orange)]',
      icon: <Clock className="w-4 h-4" strokeWidth={2.2} />,
    }),
    render: (ctx) => (
      <MiniEventsWidget
        timetableData={ctx.todayTimetableData || ctx.timetableData}
        isLoading={ctx.isUpdating && !ctx.todayTimetableData && !ctx.timetableData}
        showHomeworks={ctx.showHomeworks}
        showFullSubjectNames={ctx.showFullSubjectNames}
        lang={ctx.lang}
        onSelectEvent={ctx.scheduleCtrl.openEvent}
        onOpenCalendar={ctx.scheduleCtrl.openEvents}
      />
    ),
  },
  attendance: {
    getMeta: (lang, t) => ({
      title: t.attendance,
      subtitle: pickText(lang, { pl: 'Frekwencja i dzisiejsza obecność', en: 'Attendance rate and today timeline' }),
      color: 'bg-[var(--ios-purple)]',
      icon: <UserCheck className="w-4 h-4" strokeWidth={2.2} />,
    }),
    render: (ctx) => (
      <MiniAttendanceWidget
        attendanceData={ctx.attendanceData}
        timetableData={ctx.todayTimetableData || ctx.timetableData}
        isLoading={ctx.isUpdating && !ctx.attendanceData}
        error={ctx.attendanceError}
        onRetry={ctx.onRetryMain}
        lang={ctx.lang}
        t={ctx.t}
        onOpenAttendance={ctx.attendanceCtrl.openAttendance}
        onOpenLegacyAttendance={ctx.attendanceCtrl.openJournal}
        showTodayLine={ctx.showMobileTodayAttendance}
      />
    ),
  },
  messages: {
    getMeta: (lang, t) => ({
      title: t.messages,
      subtitle: pickText(lang, { pl: 'Odebrane wiadomości i ogłoszenia', en: 'Inbox and school announcements' }),
      color: 'bg-[var(--ios-blue)]',
      icon: <Mail className="w-4 h-4" strokeWidth={2.2} />,
    }),
    render: (ctx) => (
      <MiniMessagesWidget
        unreadCount={ctx.unreadCount}
        announcementsCount={ctx.announcementsCount}
        isLoading={ctx.isLoadingMessages}
        error={ctx.messagesError}
        onRetry={ctx.onRetryMessages}
        lang={ctx.lang}
        t={ctx.t}
        onOpenMessages={ctx.messagesCtrl.openMessages}
        onOpenAnnouncements={ctx.messagesCtrl.openAnnouncements}
      />
    ),
  },
}

export function getDashboardWidgetMeta(id: DashboardWidgetId, lang: AppLanguage, t: AppDictionary): DashboardWidgetMeta {
  return WIDGET_DEFINITIONS[id].getMeta(lang, t)
}

export function renderDashboardWidget(id: DashboardWidgetId, ctx: DashboardWidgetRenderContext): ReactNode {
  return WIDGET_DEFINITIONS[id]?.render(ctx) ?? null
}
