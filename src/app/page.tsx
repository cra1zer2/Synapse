'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createJustificationAction, getLiveJustificationsAction } from './actions'
import { LiveJustificationItem } from '@/models/justification.model'
import { LessonItem } from '@/models/timetable.model'
import { SubjectAttendance } from '@/models/attendance.model'
import { MessageItem, AnnouncementItem } from '@/models/message.model'
import { GradeItem } from '@/models/grade.model'
import { getDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'

import { useAccountSession } from '@/hooks/account.hook'
import { useTimetableSync } from '@/hooks/timetable-sync.hook'
import { useBodyScrollLock } from '@/hooks/scroll-lock.hook'
import { useMessagesInbox } from '@/hooks/messages.hook'
import { getTodayIsoString, normalizeToMondayIso, formatHumanPolishDate } from '@/utils/date.util'
import { addRequestLog } from '@/utils/request-logger.util'

import { AuthView } from '@/components/auth/auth-view'
import { ScheduleWidget } from '@/components/schedule/schedule-widget'
import { LessonDetailModal } from '@/components/schedule/lesson-detail-modal'
import { EventDetailModal } from '@/components/schedule/event-detail-modal'
import { AttendanceWidget } from '@/components/attendance/attendance-widget'
import { AttendanceDetailModal } from '@/components/attendance/attendance-detail-modal'
import { QuickNbScreen } from '@/components/attendance/quick-nb-screen'
import { LegacyAttendanceScreen, LegacyAttendanceView } from '@/components/attendance/legacy-attendance-screen'
import { ManualExcuseScreen } from '@/components/attendance/manual-excuse-screen'
import { JustificationModal } from '@/components/attendance/justification-modal'
import { GradesWidget } from '@/components/grades/grades-widget'
import { GradeDetailModal } from '@/components/grades/grade-detail-modal'
import { MessagesWidget } from '@/components/messages/messages-widget'
import { SettingsSheet } from '@/components/settings/settings-sheet'
import { MiniGradesWidget } from '@/components/dashboard/mini-grades-widget'
import { MiniScheduleWidget } from '@/components/dashboard/mini-schedule-widget'
import { MiniAttendanceWidget } from '@/components/dashboard/mini-attendance-widget'
import { MiniMessagesWidget } from '@/components/dashboard/mini-messages-widget'
import { MiniUpcomingEventsWidget } from '@/components/dashboard/mini-upcoming-events-widget'
import { IosScreen, IOS_PARALLAX_PERCENT, IOS_PANEL_TRANSITION } from '@/components/ios/ios-screen'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { IosCard, IosSegmentedControl } from '@/components/ios/ios-ui'
import { cn } from '@/utils/cn.util'

export type TextClampOption = 'full' | '1' | '2'
export type DashboardWidgetId = 'grades' | 'schedule' | 'upcoming' | 'messages' | 'attendance'

const DEFAULT_DASHBOARD_ORDER: DashboardWidgetId[] = [
  'grades',
  'schedule',
  'upcoming',
  'messages',
  'attendance'
]

const DEFAULT_DASHBOARD_VISIBLE: Record<DashboardWidgetId, boolean> = {
  grades: true,
  schedule: true,
  upcoming: false,
  messages: true,
  attendance: true
}

function syncMetaThemeColor(isDark: boolean) {
  if (typeof document === 'undefined') return
  let meta = document.querySelector('meta[name="theme-color"]')
  const targetColor = isDark ? '#000000' : '#f2f2f7'
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', targetColor)
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [lang, setLang] = useState<AppLanguage>('pl')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const [theme, setTheme] = useState<AppTheme>('system')
  const [textClamp, setTextClamp] = useState<TextClampOption>('full')
  const [showFullSubjectNames, setShowFullSubjectNames] = useState<boolean>(false)
  const [ignoreGradeModifiers, setIgnoreGradeModifiers] = useState<boolean>(false)
  const [allowStudentJustifications, setAllowStudentJustifications] = useState<boolean>(false)
  const [enableGradeSimulator, setEnableGradeSimulator] = useState<boolean>(false)
  const [showHomeworks, setShowHomeworks] = useState<boolean>(false)
  const [showUpcomingEventsWidget, setShowUpcomingEventsWidget] = useState<boolean>(false)
  const [dashboardOrder, setDashboardOrder] = useState<DashboardWidgetId[]>(DEFAULT_DASHBOARD_ORDER)
  const [dashboardVisible, setDashboardVisible] = useState<Record<DashboardWidgetId, boolean>>(DEFAULT_DASHBOARD_VISIBLE)
  const [showLuckyNumberBanner, setShowLuckyNumberBanner] = useState<boolean>(false)
  const [luckyDismissedDate, setLuckyDismissedDate] = useState<string>('')
  const [attendanceViewTab, setAttendanceViewTab] = useState<'summary' | 'table'>('summary')
  const [isLegacyDaySubViewOpen, setIsLegacyDaySubViewOpen] = useState<boolean>(false)
  const [manualExcuseInitialTab, setManualExcuseInitialTab] = useState<'nb' | 'range' | 'hours'>('range')

  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null)
  const [cachedLesson, setCachedLesson] = useState<LessonItem | null>(null)
  
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  const [cachedEvent, setCachedEvent] = useState<any | null>(null)
  const [selectedGradeDetail, setSelectedGradeDetail] = useState<{ grade: any; subject: string } | null>(null)
  const [cachedGradeDetail, setCachedGradeDetail] = useState<{ grade: any; subject: string } | null>(null)

  const handleSelectGrade = (grade: any, subject: string) => {
    setCachedGradeDetail({ grade, subject })
    setSelectedGradeDetail({ grade, subject })
  }

  const handleCloseGrade = () => {
    setSelectedGradeDetail(null)
    setTimeout(() => {
      setCachedGradeDetail(null)
    }, 320)
  }

  const handleSelectLesson = (lesson: LessonItem) => {
    setCachedLesson(lesson)
    setSelectedLesson(lesson)
  }

  const handleSelectEvent = (event: any) => {
    setCachedEvent(event)
    setSelectedEvent(event)
  }

  const handleCloseEvent = () => {
    setSelectedEvent(null)
    setTimeout(() => {
      setCachedEvent(null)
    }, 320)
  }

  const handleCloseLesson = () => {
    setSelectedLesson(null)
    setTimeout(() => {
      setCachedLesson(null)
    }, 320)
  }

  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectAttendance | null>(null)
  const [cachedDetailItem, setCachedDetailItem] = useState<SubjectAttendance | null>(null)

  const handleOpenSubjectDetail = (sub: SubjectAttendance) => {
    setCachedDetailItem(sub)
    setSelectedSubjectDetail(sub)
  }

  const handleCloseSubjectDetail = () => {
    setSelectedSubjectDetail(null)
    setTimeout(() => {
      setCachedDetailItem(null)
    }, 350)
  }

  const [showSettings, setShowSettings] = useState(false)
  const [showExcuseMatrix, setShowExcuseMatrix] = useState(false)
  const [showQuickNb, setShowQuickNb] = useState(false)
  const [showManualExcuse, setShowManualExcuse] = useState(false)
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [showFullAttendance, setShowFullAttendance] = useState(false)
  const [showMessagesScreen, setShowMessagesScreen] = useState(false)
  const [showAnnouncementsScreen, setShowAnnouncementsScreen] = useState(false)
  const [showComposeInHeader, setShowComposeInHeader] = useState(false)
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false)
  const [showLegacyAttendance, setShowLegacyAttendance] = useState(false)
  const [showFullGrades, setShowFullGrades] = useState(false)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  const [directMessageToOpen, setDirectMessageToOpen] = useState<MessageItem | null>(null)
  const [directAnnouncementToOpen, setDirectAnnouncementToOpen] = useState<AnnouncementItem | null>(null)

  const handleOpenDirectMessage = (msg: MessageItem) => {
    setDirectMessageToOpen(msg)
    setShowMessagesScreen(true)
  }

  const handleOpenDirectAnnouncement = (ann: AnnouncementItem) => {
    setDirectAnnouncementToOpen(ann)
    setShowAnnouncementsScreen(true)
  }

  const [isMessagesSubViewOpen, setIsMessagesSubViewOpen] = useState(false)
  const [showLiveJustifications, setShowLiveJustifications] = useState(false)
  const [liveJustifications, setLiveJustifications] = useState<LiveJustificationItem[]>([])
  const [isLoadingLiveJust, setIsLoadingLiveJust] = useState(false)
  const [liveJustFilter, setLiveJustFilter] = useState<'0' | '1' | '2' | '3'>('0')

  const handleOpenLiveJustifications = async (status: '0' | '1' | '2' | '3' = '0') => {
    setLiveJustFilter(status)
    setShowLiveJustifications(true)
    setIsLoadingLiveJust(true)
    const t0 = performance.now()
    try {
      const parentAcc = account.savedAccounts.find(
        (a) => a.role === 'parent' || (Boolean(a.username) && !a.username.trim().toLowerCase().endsWith('u'))
      )
      const targetUser = parentAcc ? parentAcc.username : account.username
      const targetPass = parentAcc ? parentAcc.password : account.password
      const res = await getLiveJustificationsAction(targetUser, targetPass, status)
      const clientDurationMs = Math.round(performance.now() - t0)
      if (res.success) {
        setLiveJustifications(res.data)
        addRequestLog({
          name: 'Pobranie statusów usprawiedliwień',
          clientDurationMs,
          status: 'ok',
          details: `Filtr: ${status}, Elementy: ${res.data.length}`
        })
      } else {
        addRequestLog({
          name: 'Pobranie statusów usprawiedliwień',
          clientDurationMs,
          status: 'error',
          error: res.error,
          details: `Filtr: ${status}`
        })
      }
    } catch (err: any) {
      const clientDurationMs = Math.round(performance.now() - t0)
      addRequestLog({
        name: 'Pobranie statusów usprawiedliwień',
        clientDurationMs,
        status: 'error',
        error: err?.message || 'Nieznany błąd',
        details: `Filtr: ${status}`
      })
    } finally {
      setIsLoadingLiveJust(false)
    }
  }

  const t = getDictionary(lang)

  const applyTheme = useCallback((targetTheme: AppTheme) => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    const isDark =
      targetTheme === 'dark' ||
      (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.add('light')
    }
    syncMetaThemeColor(isDark)
  }, [])

  const account = useAccountSession({ lang, t })

  useEffect(() => {
    setShowSettings(false)
    setShowFullGrades(false)
    setShowFullSchedule(false)
    setShowFullAttendance(false)
    setShowMessagesScreen(false)
    setShowAnnouncementsScreen(false)
    setShowQuickNb(false)
    setShowManualExcuse(false)
    setShowLegacyAttendance(false)
    setShowLiveJustifications(false)
    setSelectedLesson(null)
    setSelectedEvent(null)
    setSelectedSubjectDetail(null)
    setSelectedGradeDetail(null)
    setDirectMessageToOpen(null)
    setDirectAnnouncementToOpen(null)
    setIsMessagesSubViewOpen(false)
    setIsFolderMenuOpen(false)
  }, [account.username])

  const messagesInbox = useMessagesInbox({
    username: account.username,
    password: account.password
  })

  const timetable = useTimetableSync({
    username: account.username,
    password: account.password,
    lang,
    isConfigured: account.isConfigured
  })

  const findSubjectForGrade = useCallback((grade: GradeItem): string => {
    if (grade.subject) return grade.subject
    if (!timetable.gradesData) return ''
    for (const s of timetable.gradesData.subjects) {
      if (s.semester1.some((g) => g.id === grade.id || (g.date === grade.date && g.category === grade.category && g.grade === grade.grade))) {
        return s.subject
      }
      if (s.semester2.some((g) => g.id === grade.id || (g.date === grade.date && g.category === grade.category && g.grade === grade.grade))) {
        return s.subject
      }
    }
    return ''
  }, [timetable.gradesData])

  const isLevel1Active = Boolean(
    showFullGrades ||
    showFullSchedule ||
    showFullAttendance ||
    showMessagesScreen ||
    showAnnouncementsScreen ||
    showSettings ||
    showExcuseMatrix
  )

  const isLevel2Active = Boolean(
    showQuickNb ||
    showManualExcuse ||
    showLegacyAttendance ||
    showLiveJustifications ||
    selectedSubjectDetail ||
    isMessagesSubViewOpen
  )

  const isAnyOverlayActive = isLevel1Active || isLevel2Active

  useBodyScrollLock(isAnyOverlayActive)

  useEffect(() => {
    setMounted(true)
    const savedLang = (localStorage.getItem('synapse_lang') as AppLanguage) || 'pl'
    const savedTheme = (localStorage.getItem('synapse_theme') as AppTheme) || 'system'
    const savedClamp = (localStorage.getItem('synapse_text_clamp') as TextClampOption) || 'full'
    const savedFull = localStorage.getItem('synapse_full_names') === 'true'
    const savedIgnore = localStorage.getItem('synapse_ignore_modifiers') === 'true'
    const savedStudentJust = localStorage.getItem('synapse_allow_student_justifications') === 'true'
    const savedSim = localStorage.getItem('synapse_grade_simulator') === 'true'
    const savedHw = localStorage.getItem('synapse_show_homeworks') === 'true'
    const savedEvents = localStorage.getItem('synapse_show_upcoming_events') === 'true'
    const savedLuckyBanner = localStorage.getItem('synapse_show_lucky_banner') === 'true'
    const savedLuckyDismissed = localStorage.getItem('synapse_lucky_dismissed_date') || ''

    setLang(savedLang)
    setTheme(savedTheme)
    setTextClamp(savedClamp)
    setShowFullSubjectNames(savedFull)
    setIgnoreGradeModifiers(savedIgnore)
    setAllowStudentJustifications(savedStudentJust)
    setEnableGradeSimulator(savedSim)
    setShowHomeworks(savedHw)
    setShowUpcomingEventsWidget(savedEvents)
    setShowLuckyNumberBanner(savedLuckyBanner)
    setLuckyDismissedDate(savedLuckyDismissed)

    try {
      const rawOrder = localStorage.getItem('synapse_dashboard_order_v1')
      if (rawOrder) {
        const parsed = JSON.parse(rawOrder) as DashboardWidgetId[]
        if (Array.isArray(parsed) && DEFAULT_DASHBOARD_ORDER.every((k) => parsed.includes(k))) {
          setDashboardOrder(parsed)
        }
      }
    } catch {}

    try {
      const rawVis = localStorage.getItem('synapse_dashboard_visible_v1')
      if (rawVis) {
        const parsed = JSON.parse(rawVis) as Partial<Record<DashboardWidgetId, boolean>>
        const merged: Record<DashboardWidgetId, boolean> = {
          ...DEFAULT_DASHBOARD_VISIBLE,
          ...parsed
        }
        setDashboardVisible(merged)
        setShowUpcomingEventsWidget(Boolean(merged.upcoming))
      } else {
        setDashboardVisible({
          ...DEFAULT_DASHBOARD_VISIBLE,
          upcoming: savedEvents
        })
      }
    } catch {}

    applyTheme(savedTheme)
  }, [applyTheme])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleDeepLinking = () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const tab = params.get('tab')
        if (tab === 'grades') {
          setShowFullGrades(true)
        } else if (tab === 'messages') {
          setShowMessagesScreen(true)
        } else if (tab === 'schedule') {
          setShowFullSchedule(true)
        } else if (tab === 'attendance') {
          setShowFullAttendance(true)
        }
      } catch {}
    }

    handleDeepLinking()
    window.addEventListener('popstate', handleDeepLinking)
    return () => window.removeEventListener('popstate', handleDeepLinking)
  }, [])

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      root.classList.remove('dark', 'light')
      if (e.matches) root.classList.add('dark')
      else root.classList.add('light')
      syncMetaThemeColor(e.matches)
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const handleSelectLanguage = (newLang: AppLanguage) => {
    setLang(newLang)
    localStorage.setItem('synapse_lang', newLang)
    if (account.isConfigured && account.username && account.password) {
      timetable.executeSync(account.username, account.password, newLang, timetable.currentWeekPivot, true)
    }
  }

  const handleSelectTheme = (newTheme: AppTheme) => {
    setTheme(newTheme)
    localStorage.setItem('synapse_theme', newTheme)
    applyTheme(newTheme)
  }

  const handleSelectTextClamp = (clamp: TextClampOption) => {
    setTextClamp(clamp)
    localStorage.setItem('synapse_text_clamp', clamp)
  }

  const handleToggleShowFullSubjectNames = (val: boolean) => {
    setShowFullSubjectNames(val)
    localStorage.setItem('synapse_full_names', String(val))
  }

  const handleToggleIgnoreGradeModifiers = (val: boolean) => {
    setIgnoreGradeModifiers(val)
    localStorage.setItem('synapse_ignore_modifiers', String(val))
  }

  const handleToggleAllowStudentJustifications = (val: boolean) => {
    setAllowStudentJustifications(val)
    localStorage.setItem('synapse_allow_student_justifications', String(val))
  }

  const handleToggleEnableGradeSimulator = (val: boolean) => {
    setEnableGradeSimulator(val)
    localStorage.setItem('synapse_grade_simulator', String(val))
  }

  const handleToggleShowHomeworks = (val: boolean) => {
    setShowHomeworks(val)
    localStorage.setItem('synapse_show_homeworks', String(val))
  }

  const handleToggleShowUpcomingEventsWidget = (val: boolean) => {
    setShowUpcomingEventsWidget(val)
    localStorage.setItem('synapse_show_upcoming_events', String(val))
    setDashboardVisible((prev) => {
      const next = { ...prev, upcoming: val }
      localStorage.setItem('synapse_dashboard_visible_v1', JSON.stringify(next))
      return next
    })
  }

  const handleChangeDashboardOrder = (newOrder: DashboardWidgetId[]) => {
    setDashboardOrder(newOrder)
    localStorage.setItem('synapse_dashboard_order_v1', JSON.stringify(newOrder))
  }

  const handleToggleDashboardWidget = (id: DashboardWidgetId, val: boolean) => {
    setDashboardVisible((prev) => {
      const next = { ...prev, [id]: val }
      localStorage.setItem('synapse_dashboard_visible_v1', JSON.stringify(next))
      return next
    })
    if (id === 'upcoming') {
      setShowUpcomingEventsWidget(val)
      localStorage.setItem('synapse_show_upcoming_events', String(val))
    }
  }

  const handleToggleShowLuckyNumberBanner = (val: boolean) => {
    setShowLuckyNumberBanner(val)
    localStorage.setItem('synapse_show_lucky_banner', String(val))
  }

  const todayIsoStr = getTodayIsoString()
  const handleDismissLuckyBanner = () => {
    setLuckyDismissedDate(todayIsoStr)
    localStorage.setItem('synapse_lucky_dismissed_date', todayIsoStr)
  }

  const handleManualRefresh = async () => {
    if (timetable.isUpdating || isManualRefreshing || !account.username || !account.password) return
    setIsManualRefreshing(true)
    try {
      await Promise.all([
        timetable.executeSync(account.username, account.password, lang, timetable.currentWeekPivot, false),
        messagesInbox.reloadMessages()
      ])
    } finally {
      setIsManualRefreshing(false)
    }
  }

  const postSubmitSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isCurrentStudent = (() => {
    const role = account.activeAccount?.role || account.profile?.role
    if (role === 'parent') return false
    if (role === 'student') return true
    const user = String(account.activeAccount?.username || account.username || '').trim().toLowerCase()
    return user.endsWith('u') || user.includes('u')
  })()

  const canSubmitExcuse = isCurrentStudent ? allowStudentJustifications : true
  const hasParentAccess = canSubmitExcuse

  const handleSubmitJustifications = async (payload: {
    dateIso?: string
    dateFrom?: string
    dateTo?: string
    lessons: number[]
    message: string
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const parentAcc = account.savedAccounts.find(
        (a) => a.role === 'parent' || (Boolean(a.username) && !a.username.trim().toLowerCase().endsWith('u'))
      )
      const targetUser = parentAcc ? parentAcc.username : account.username
      const targetPass = parentAcc ? parentAcc.password : account.password

      const from = payload.dateFrom || payload.dateIso || ''
      const to = payload.dateTo || payload.dateIso || ''

      const res = await createJustificationAction(targetUser, targetPass, {
        dateFrom: from,
        dateTo: to,
        lessons: payload.lessons,
        messageFromParent: payload.message,
        sendNotify: false
      })

      if (res.success) {
        if (postSubmitSyncTimerRef.current) clearTimeout(postSubmitSyncTimerRef.current)
        postSubmitSyncTimerRef.current = setTimeout(() => {
          timetable.executeSync(account.username, account.password, lang, timetable.currentWeekPivot, true)
        }, 800)
        return { ok: true }
      }
      console.warn('[e-usprawiedliwienia] submit failed', { from, to, lessons: payload.lessons, error: res.error })
      return { ok: false, error: res.error || 'Błąd wysyłania usprawiedliwienia' }
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) }
    }
  }

  if (!mounted) return null

  if (!account.isConfigured) {
    return (
      <AuthView
        authStep={account.authStep}
        username={account.username}
        setUsername={account.setUsername}
        password={account.password}
        setPassword={account.setPassword}
        authError={account.authError}
        verifiedCandidate={account.verifiedCandidate}
        onStartVerification={account.handleStartVerification}
        onConfirmLogin={account.handleConfirmLogin}
        onBackToInput={() => account.setAuthStep('input')}
        lang={lang}
        onSelectLanguage={handleSelectLanguage}
        t={t}
      />
    )
  }

  const currentDaySchedule = timetable.timetableData?.schedule.find((d) => d.dayName === timetable.selectedDay)
  const activeTodayData = timetable.todayTimetableData || timetable.timetableData

  return (
    <div className="w-full min-h-screen bg-[var(--ios-bg)] dark:bg-black relative overflow-x-hidden">
      <div
        data-ios-root-panel="true"
        className="w-full min-h-screen flex flex-col bg-[var(--ios-bg)]"
        style={{
          transform: (!isDesktop && isAnyOverlayActive) ? `translate3d(-${IOS_PARALLAX_PERCENT}%, 0, 0)` : 'translate3d(0, 0, 0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          transition: IOS_PANEL_TRANSITION,
          pointerEvents: isAnyOverlayActive ? 'none' : 'auto',
          willChange: 'transform'
        }}
      >
        {/* Mobile Header */}
        <header className="ios-header md:hidden">
          <div className="relative flex items-center justify-between w-full max-w-[402px] mx-auto h-[44px]">
            <div className="z-10 flex items-center min-w-[70px] h-full">
              <div className="relative w-9 h-9 flex items-center justify-center">
                <div className={"absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none " + ((timetable.isUpdating || isManualRefreshing) ? "opacity-100" : "opacity-0")}>
                  <IosSpinner size="small" className="text-[var(--ios-secondary)]" />
                </div>

                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={timetable.isUpdating || isManualRefreshing}
                  className={"w-9 h-9 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:opacity-60 transition-all duration-300 select-none " + ((timetable.isUpdating || isManualRefreshing) ? "opacity-0 pointer-events-none scale-90" : "opacity-100 scale-100 cursor-pointer")}
                  aria-label="Refresh"
                >
                  <svg width="17" height="17" className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                </button>
              </div>
            </div>

            <h2 className="absolute inset-0 flex items-center justify-center text-[17px] font-semibold tracking-[-0.4px] leading-none text-[var(--ios-label)] pointer-events-none px-20 truncate text-center">
              Synapse
            </h2>

            <div className="z-10 min-w-[70px] flex items-center justify-end h-full">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:opacity-60 transition-opacity cursor-pointer"
                aria-label="Settings"
              >
                <svg width="19" height="19" className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Unified Toolbar */}
        <header className="hidden md:block sticky top-0 z-30 w-full bg-[var(--ios-nav-bg)]/85 backdrop-blur-xl border-b border-[var(--ios-separator)] select-none">
          <div className="relative flex items-center justify-between w-full max-w-[860px] mx-auto px-5 h-[52px]">
            <div className="flex items-center gap-2 min-w-0 z-10">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ios-card-solid)] hover:opacity-85 active:scale-[0.97] transition-all cursor-pointer"
                title={t.settingsTitle}
              >
                <span className="text-[13px] font-medium text-[var(--ios-label)] truncate max-w-[180px]">
                  {account.profile?.fullName && account.profile.fullName !== 'Konto Librus'
                    ? account.profile.fullName
                    : (account.username || t.settingsTitle)}
                </span>
                {account.profile?.className && (
                  <span className="text-[12px] font-normal text-[var(--ios-secondary)]">
                    {account.profile.className}
                  </span>
                )}
                {account.profile?.luckyNumber !== null && account.profile?.luckyNumber !== undefined && (
                  <span className="text-[11px] font-semibold text-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] px-2 py-0.5 rounded-full tabular-nums" title={t.luckyNumber}>
                    #{account.profile.luckyNumber}
                  </span>
                )}
              </button>
            </div>

            <h1 className="absolute inset-0 flex items-center justify-center text-[17px] font-semibold tracking-[-0.4px] text-[var(--ios-label)] pointer-events-none">
              Synapse
            </h1>

            <div className="flex items-center gap-2 z-10">
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--ios-secondary)] font-normal pr-1">
                <div className={"w-3.5 h-3.5 flex items-center justify-center transition-opacity duration-300 " + ((timetable.isUpdating || isManualRefreshing) ? "opacity-100" : "opacity-0")}>
                  <IosSpinner size="small" className="text-[var(--ios-secondary)]" />
                </div>
                <span className="tabular-nums hidden lg:inline">
                  {timetable.isUpdating || isManualRefreshing ? t.updatingStatus : t.syncedStatus}
                </span>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={timetable.isUpdating || isManualRefreshing}
                className="w-8 h-8 rounded-full bg-[var(--ios-element)] hover:opacity-80 text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:scale-[0.94] transition-all flex items-center justify-center cursor-pointer select-none"
                title={t.refresh}
                aria-label="Refresh"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="w-full flex-1 pt-4 md:pt-5 pb-32 px-4 md:px-5 max-w-[402px] md:max-w-[860px] mx-auto flex flex-col gap-4 box-border">
          {showLuckyNumberBanner &&
            account.profile?.luckyNumber !== null &&
            account.profile?.luckyNumber !== undefined &&
            account.profile?.classNumber !== null &&
            account.profile?.classNumber !== undefined &&
            account.profile.classNumber === account.profile.luckyNumber &&
            luckyDismissedDate !== todayIsoStr && (
              <div className="bg-[var(--ios-card-solid)] px-4 py-3 rounded-[22px] flex items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--ios-green-subtle)] text-[var(--ios-green)] flex items-center justify-center font-semibold text-[13px] shrink-0 tabular-nums">
                    #{account.profile.luckyNumber}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] font-semibold text-[var(--ios-label)] tracking-[-0.15px] truncate leading-tight">
                      {lang === 'en' ? 'Your lucky number today!' : 'Twój szczęśliwy numerek dzisiaj!'}
                    </span>
                    <span className="text-[12px] font-normal text-[var(--ios-secondary)] truncate leading-tight mt-0.5">
                      {lang === 'en' ? 'You are exempt from unannounced quizzes' : 'Zwolnienie z niezapowiedzianych odpowiedzi'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDismissLuckyBanner}
                  className="w-7 h-7 rounded-full bg-[var(--ios-element)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)] flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer"
                  aria-label="Zamknij"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

          {timetable.hasNewUpdate && (
            <div
              onClick={timetable.applyPendingUpdates}
              className="bg-[var(--ios-blue)] text-white px-4 py-3 rounded-full flex items-center justify-between cursor-pointer active:scale-[0.985] active:opacity-90 transition-all"
            >
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <p className="text-[13px] font-semibold tracking-tight">{t.newChanges}</p>
              </div>
              <span className="text-[12px] font-semibold bg-white/20 px-2.5 py-0.5 rounded-full">
                {t.updateNow}
              </span>
            </div>
          )}

          {/* DESKTOP LAYOUT (md:grid md:grid-cols-2) */}
          {(() => {
            const renderWidget = (id: DashboardWidgetId, desktopMode: boolean) => {
              switch (id) {
                case 'schedule':
                  return (
                    <MiniScheduleWidget
                      key="schedule"
                      timetableData={isManualRefreshing ? null : activeTodayData}
                      isLoading={isManualRefreshing || (timetable.isLoadingWeek && !activeTodayData && !timetable.timetableError)}
                      error={timetable.timetableError}
                      onRetry={handleManualRefresh}
                      textClamp={textClamp}
                      showFullSubjectNames={showFullSubjectNames}
                      lang={lang}
                      t={t}
                      showAllLessons={desktopMode}
                      onSelectLesson={handleSelectLesson}
                      onOpenFullSchedule={(targetDay, targetIsoDate) => {
                        if (targetIsoDate) {
                          const targetMonday = normalizeToMondayIso(targetIsoDate)
                          if (targetMonday !== timetable.currentWeekPivot) {
                            timetable.queueWeekChange(targetMonday)
                          }
                        }
                        if (targetDay) {
                          timetable.setSelectedDay(targetDay)
                        }
                        setShowFullSchedule(true)
                      }}
                    />
                  )
                case 'grades':
                  return (
                    <MiniGradesWidget
                      key="grades"
                      gradesData={isManualRefreshing ? null : timetable.gradesData}
                      isLoading={isManualRefreshing || (!timetable.gradesData && timetable.isUpdating && !timetable.gradesError)}
                      error={timetable.gradesError}
                      onRetry={handleManualRefresh}
                      t={t}
                      isDesktop={desktopMode}
                      onOpenGrades={() => setShowFullGrades(true)}
                      onSelectGrade={(g) => handleSelectGrade(g, desktopMode ? findSubjectForGrade(g) : (g.subject || ''))}
                    />
                  )
                case 'upcoming':
                  return (
                    <MiniUpcomingEventsWidget
                      key="upcoming"
                      timetableData={isManualRefreshing ? null : (activeTodayData || timetable.timetableData)}
                      isLoading={isManualRefreshing || (timetable.isLoadingWeek && !activeTodayData && !timetable.timetableError)}
                      showHomeworks={showHomeworks}
                      showFullSubjectNames={showFullSubjectNames}
                      lang={lang}
                      t={t}
                      isDesktop={desktopMode}
                      onSelectEvent={handleSelectEvent}
                      onOpenCalendar={() => setShowFullSchedule(true)}
                    />
                  )
                case 'attendance':
                  return (
                    <MiniAttendanceWidget
                      key="attendance"
                      attendanceData={isManualRefreshing ? null : timetable.attendanceData}
                      timetableData={isManualRefreshing ? null : activeTodayData}
                      isLoading={isManualRefreshing || (!timetable.attendanceData && timetable.isUpdating && !timetable.attendanceError)}
                      error={timetable.attendanceError}
                      onRetry={handleManualRefresh}
                      lang={lang}
                      t={t}
                      isDesktop={desktopMode}
                      onOpenAttendance={() => setShowFullAttendance(true)}
                      onOpenLegacyAttendance={() => setShowLegacyAttendance(true)}
                    />
                  )
                case 'messages':
                  return (
                    <MiniMessagesWidget
                      key="messages"
                      unreadCount={messagesInbox.messages.filter((m) => !m.isRead).length}
                      announcementsCount={messagesInbox.announcements.length}
                      isLoading={isManualRefreshing || (messagesInbox.isLoadingMessages && messagesInbox.messages.length === 0 && messagesInbox.announcements.length === 0 && !messagesInbox.messagesError)}
                      error={messagesInbox.messagesError}
                      onRetry={messagesInbox.reloadMessages}
                      lang={lang}
                      t={t}
                      latestMessage={messagesInbox.messages[0] || null}
                      latestAnnouncement={messagesInbox.announcements[0] || null}
                      onOpenMessageDetail={handleOpenDirectMessage}
                      onOpenAnnouncementDetail={handleOpenDirectAnnouncement}
                      onOpenMessages={() => setShowMessagesScreen(true)}
                      onOpenAnnouncements={() => setShowAnnouncementsScreen(true)}
                    />
                  )
              }
            }

            const visibleMobileIds = dashboardOrder.filter((id) => dashboardVisible[id])
            const nonScheduleDesktopIds = dashboardOrder.filter((id) => id !== 'schedule' && dashboardVisible[id])
            const leftDesktopIds: DashboardWidgetId[] = dashboardVisible.schedule
              ? ['schedule']
              : nonScheduleDesktopIds.filter((_, idx) => idx % 2 === 0)
            const rightDesktopIds: DashboardWidgetId[] = dashboardVisible.schedule
              ? nonScheduleDesktopIds
              : nonScheduleDesktopIds.filter((_, idx) => idx % 2 === 1)

            return (
              <>
                <div className="hidden md:grid md:grid-cols-2 gap-4 items-start w-full">
                  <div className="flex flex-col gap-4 w-full">
                    {leftDesktopIds.map((id) => renderWidget(id, true))}
                  </div>
                  <div className="flex flex-col gap-4 w-full">
                    {rightDesktopIds.map((id) => renderWidget(id, true))}
                  </div>
                </div>

                {/* MOBILE LAYOUT (md:hidden) */}
                <div className="flex md:hidden flex-col gap-3.5 w-full">
                  {visibleMobileIds.map((id) => renderWidget(id, false))}
                </div>
              </>
            )
          })()}
        </main>
      </div>

      <IosScreen
        isOpen={showFullGrades}
        onClose={() => {
          setShowFullGrades(false)
          if (typeof window !== 'undefined' && window.location.search.includes('tab=grades')) {
            window.history.replaceState({}, '', window.location.pathname)
          }
        }}
        title={t.grades}
        backLabel={t.backAction}
        isSubView={true}
      >
        {timetable.gradesData ? (
          <GradesWidget
            gradesData={timetable.gradesData}
            showFullSubjectNames={showFullSubjectNames}
            ignoreGradeModifiers={ignoreGradeModifiers}
            enableGradeSimulator={enableGradeSimulator}
            lang={lang}
            t={t}
            onSelectGrade={handleSelectGrade}
          />
        ) : timetable.gradesError ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-[15px] font-normal text-[var(--ios-red)] tracking-tight">
              {timetable.gradesError}
            </span>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="text-[14px] font-medium text-[var(--ios-blue)] active:opacity-60 cursor-pointer"
            >
              {t.refresh}
            </button>
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <IosSpinner size="large" className="text-[var(--ios-blue)]" />
            <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-tight">
              {t.loadingTimetable}
            </span>
          </div>
        )}
      </IosScreen>

      <IosScreen
        isOpen={showFullSchedule}
        onClose={() => setShowFullSchedule(false)}
        title={t.schedule}
        backLabel={t.backAction}
        isSubView={true}
      >
        {timetable.timetableData ? (
          <ScheduleWidget
            timetableData={timetable.timetableData}
            selectedDay={timetable.selectedDay}
            onSelectDay={(day) => timetable.setSelectedDay(day)}
            onSelectLesson={handleSelectLesson}
            onSelectEvent={handleSelectEvent}
            currentWeekPivot={timetable.currentWeekPivot}
            onShiftWeek={timetable.shiftWeek}
            onSelectDate={timetable.queueWeekChange}
            isLoadingWeek={timetable.isLoadingWeek}
            textClamp={textClamp}
            showFullSubjectNames={showFullSubjectNames}
            showHomeworks={showHomeworks}
            lang={lang}
            t={t}
          />
        ) : timetable.timetableError ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-[15px] font-normal text-[var(--ios-red)] tracking-tight">
              {timetable.timetableError}
            </span>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="text-[14px] font-medium text-[var(--ios-blue)] active:opacity-60 cursor-pointer"
            >
              {t.refresh}
            </button>
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <IosSpinner size="large" className="text-[var(--ios-blue)]" />
            <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-tight">
              {t.loadingTimetable}
            </span>
          </div>
        )}
      </IosScreen>

      <IosScreen
        isOpen={showFullAttendance}
        onClose={() => {
          setShowFullAttendance(false)
          setAttendanceViewTab('summary')
          setIsLegacyDaySubViewOpen(false)
        }}
        title={t.attendance}
        backLabel={t.backAction}
        isSubView={true}
        isReceded={Boolean(selectedSubjectDetail || showQuickNb || showManualExcuse || showLegacyAttendance || showLiveJustifications || isLegacyDaySubViewOpen)}
      >
        {timetable.attendanceData && (
          <div className="w-full flex flex-col gap-3.5">
            <div className="w-full flex justify-center">
              <IosSegmentedControl<'summary' | 'table'>
                value={attendanceViewTab}
                onChange={(val) => setAttendanceViewTab(val)}
                options={[
                  { id: 'summary', label: lang === 'en' ? 'Subjects' : 'Przedmioty' },
                  { id: 'table', label: lang === 'en' ? 'Journal' : 'Dziennik' }
                ]}
                className="w-full max-w-sm"
              />
            </div>

            {attendanceViewTab === 'summary' ? (
              <AttendanceWidget
                attendanceData={timetable.attendanceData}
                lang={lang}
                showFullSubjectNames={showFullSubjectNames}
                onSelectSubject={handleOpenSubjectDetail}
                isStudent={isCurrentStudent}
                canSubmitExcuse={canSubmitExcuse}
                onOpenManualExcuse={() => {
                  setManualExcuseInitialTab('range')
                  setShowManualExcuse(true)
                }}
                onOpenQuickNb={() => {
                  setManualExcuseInitialTab('nb')
                  setShowManualExcuse(true)
                }}
                onOpenLiveJustifications={() => handleOpenLiveJustifications('0')}
                t={t}
              />
            ) : (
              <LegacyAttendanceView
                attendanceData={timetable.attendanceData}
                showFullSubjectNames={showFullSubjectNames}
                lang={lang}
                t={t}
                onSubViewChange={setIsLegacyDaySubViewOpen}
              />
            )}
          </div>
        )}
      </IosScreen>

      <GradeDetailModal
        gradeDetail={selectedGradeDetail || cachedGradeDetail}
        isOpen={Boolean(selectedGradeDetail)}
        onClose={handleCloseGrade}
        t={t}
      />

      <LessonDetailModal
        lesson={selectedLesson || cachedLesson}
        onClose={handleCloseLesson}
        isToday={Boolean(currentDaySchedule?.isToday)}
        t={t}
      />

      <EventDetailModal
        event={selectedEvent || cachedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={handleCloseEvent}
        t={t}
      />

      {timetable.attendanceData && (
        <QuickNbScreen
          isOpen={showQuickNb}
          onClose={() => setShowQuickNb(false)}
          attendanceData={timetable.attendanceData}
          canSubmitExcuse={canSubmitExcuse}
          showFullSubjectNames={showFullSubjectNames}
          onSubmitMultiple={handleSubmitJustifications}
          lang={lang}
          t={t}
        />
      )}

      {timetable.attendanceData && (
        <ManualExcuseScreen
          isOpen={showManualExcuse}
          onClose={() => setShowManualExcuse(false)}
          attendanceData={timetable.attendanceData}
          timetableData={timetable.timetableData}
          canSubmitExcuse={canSubmitExcuse}
          showFullSubjectNames={showFullSubjectNames}
          onSubmitJustification={handleSubmitJustifications}
          initialModeTab={manualExcuseInitialTab}
          lang={lang}
          t={t}
        />
      )}

      {timetable.attendanceData && (
        <LegacyAttendanceScreen
          isOpen={showLegacyAttendance}
          onClose={() => setShowLegacyAttendance(false)}
          attendanceData={timetable.attendanceData}
          showFullSubjectNames={showFullSubjectNames}
          lang={lang}
          t={t}
        />
      )}

      <AttendanceDetailModal
        subjectDetail={selectedSubjectDetail || cachedDetailItem}
        isOpen={Boolean(selectedSubjectDetail)}
        onClose={handleCloseSubjectDetail}
        showFullSubjectNames={showFullSubjectNames}
        t={t}
      />

      {showExcuseMatrix && timetable.attendanceData && (
        <JustificationModal
          attendanceData={timetable.attendanceData}
          timetableData={timetable.timetableData}
          canSubmitExcuse={canSubmitExcuse}
          onClose={() => setShowExcuseMatrix(false)}
          onSubmitMultiple={handleSubmitJustifications}
          t={t}
        />
      )}

      <IosScreen
        isOpen={showMessagesScreen}
        onClose={() => {
          setShowMessagesScreen(false)
          setIsMessagesSubViewOpen(false)
          setShowComposeInHeader(false)
          setIsFolderMenuOpen(false)
          setDirectMessageToOpen(null)
          if (typeof window !== 'undefined' && window.location.search.includes('tab=messages')) {
            window.history.replaceState({}, '', window.location.pathname)
          }
        }}
        title={t.messages}
        backLabel={t.backAction}
        isSubView={true}
        isReceded={isMessagesSubViewOpen || showComposeInHeader}
        trailing={
          <button
            type="button"
            onClick={() => {
              setIsFolderMenuOpen(false)
              setShowComposeInHeader(true)
            }}
            className="text-[var(--ios-blue)] text-[17px] font-normal leading-none active:opacity-60 select-none h-full flex items-center pl-2 cursor-pointer"
          >
            {t.writeNewMessage || 'Napisz'}
          </button>
        }
      >
        <div className="w-full flex flex-col gap-3.5">
          <div className="w-full flex justify-center">
            <IosSegmentedControl
              options={[
                { id: 'inbox', label: t.messagesInbox },
                { id: 'sent', label: lang === 'en' ? 'Sent' : 'Wysłane' }
              ]}
              value={messagesInbox.currentFolder}
              onChange={(val) => messagesInbox.setCurrentFolder(val as 'inbox' | 'sent')}
              className="w-full max-w-sm"
            />
          </div>

          <MessagesWidget
          mode="messages"
          folder={messagesInbox.currentFolder}
          messages={messagesInbox.currentFolder === 'sent' ? messagesInbox.sentMessages : messagesInbox.messages}
          announcements={messagesInbox.announcements}
          receivers={messagesInbox.receivers}
          isComposeOpen={showComposeInHeader}
          onCloseCompose={() => setShowComposeInHeader(false)}
          onLoadReceivers={messagesInbox.ensureReceivers}
          onOpenMessage={messagesInbox.handleOpenMessage}
          onDownloadAttachment={messagesInbox.handleDownloadAttachment}
          onSendMessage={messagesInbox.handleSendMessage}
          isLoading={messagesInbox.isLoadingMessages}
          lang={lang}
          t={t}
          initialSelectedMessage={directMessageToOpen}
          onSubViewChange={(isOpen) => {
            setIsMessagesSubViewOpen(isOpen)
            if (isOpen) setIsFolderMenuOpen(false)
          }}
        />
        </div>
      </IosScreen>

      <IosScreen
        isOpen={showAnnouncementsScreen}
        onClose={() => {
          setShowAnnouncementsScreen(false)
          setIsMessagesSubViewOpen(false)
          setDirectAnnouncementToOpen(null)
        }}
        title={t.messagesAnnouncements}
        backLabel={t.backAction}
        isSubView={true}
        isReceded={isMessagesSubViewOpen}
      >
        <MessagesWidget
          mode="announcements"
          messages={messagesInbox.messages}
          announcements={messagesInbox.announcements}
          receivers={messagesInbox.receivers}
          onOpenMessage={messagesInbox.handleOpenMessage}
          onSendMessage={messagesInbox.handleSendMessage}
          isLoading={messagesInbox.isLoadingMessages}
          lang={lang}
          t={t}
          initialSelectedAnnouncement={directAnnouncementToOpen}
          onSubViewChange={setIsMessagesSubViewOpen}
        />
      </IosScreen>

      <IosScreen
        isOpen={showLiveJustifications}
        onClose={() => setShowLiveJustifications(false)}
        title={lang === 'en' ? 'Justification statuses' : 'Statusy usprawiedliwień'}
        backLabel={t.backAction}
        showBackButton={true}
        isSubView={true}
        className="z-[75]"
        trailing={
          <button
            type="button"
            onClick={() => handleOpenLiveJustifications(liveJustFilter)}
            className="text-[var(--ios-blue)] text-[17px] font-normal leading-none active:opacity-60 select-none h-full flex items-center cursor-pointer"
          >
            {t.refresh}
          </button>
        }
      >
        <div className="flex flex-col gap-3.5 pb-16 select-none max-w-2xl mx-auto w-full">
          <IosSegmentedControl<'0' | '1' | '2' | '3'>
            value={liveJustFilter}
            onChange={(id) => handleOpenLiveJustifications(id)}
            options={[
              { id: '0', label: lang === 'en' ? 'All' : 'Wszystkie' },
              { id: '1', label: lang === 'en' ? 'Sent' : 'Wysłane' },
              { id: '2', label: lang === 'en' ? 'Accepted' : 'Przyjęte' },
              { id: '3', label: lang === 'en' ? 'Rejected' : 'Odrzucone' }
            ]}
          />

          {isLoadingLiveJust ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <IosSpinner size="large" className="text-[var(--ios-blue)]" />
              <span className="text-[13px] font-normal text-[var(--ios-secondary)]">Wczytywanie historii z Synergii...</span>
            </div>
          ) : liveJustifications.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {liveJustifications.map((item) => (
                <IosCard key={item.id} className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-semibold text-[var(--ios-label)] leading-snug">
                        {item.periodStr}
                      </span>
                      <span className="text-[12px] font-normal text-[var(--ios-secondary)] mt-0.5">
                        {item.count} {item.count === 1 ? 'nieobecność' : 'nieobecności'} • Wysłano: {formatHumanPolishDate(item.sentAt, true)}
                      </span>
                    </div>

                    <span className={"text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 " + (
                      item.statusCode === 'accepted'
                        ? "bg-[var(--ios-green-subtle)] text-[var(--ios-green)]"
                        : item.statusCode === 'rejected'
                        ? "bg-[var(--ios-red-subtle)] text-[var(--ios-red)]"
                        : "bg-[var(--ios-yellow)]/15 text-[var(--ios-yellow)] dark:text-[#ffd60a]"
                    )}>
                      {item.statusCode === 'accepted' ? 'Przyjęte' : item.statusCode === 'rejected' ? 'Odrzucone' : 'Oczekuje'}
                    </span>
                  </div>

                  {item.comment && (
                    <div className="bg-[var(--bg-card-secondary)] p-3 rounded-[14px] text-[13px] text-[var(--ios-label)] border-none">
                      <span className="text-[var(--ios-secondary)]">Uzasadnienie: </span>{item.comment}
                    </div>
                  )}

                  {item.teacher && (
                    <div className="text-[12px] text-[var(--ios-secondary)] flex items-center justify-between pt-1.5 border-t border-[var(--ios-separator)]">
                      <span>Wychowawca:</span>
                      <span className="text-[var(--ios-label)] font-medium">{item.teacher}</span>
                    </div>
                  )}
                </IosCard>
              ))}
            </div>
          ) : (
            <IosCard className="p-8 text-center text-[15px] font-normal text-[var(--ios-secondary)]">
              Brak wpisów dla wybranego filtra
            </IosCard>
          )}
        </div>
      </IosScreen>

      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        profile={account.profile}
        savedAccounts={account.savedAccounts}
        onSwitchAccount={(acc) => {
          account.handleSwitchAccount(acc)
        }}
        onAddAccount={account.handleAddSecondaryAccount}
        onConfirmAddAccount={account.handleConfirmAddAccount}
        onResetAddAccount={account.handleResetAddAccount}
        addAccountStep={account.addAccountStep}
        setAddAccountStep={account.setAddAccountStep}
        addAccountCandidate={account.addAccountCandidate}
        addAccountError={account.addAccountError}
        newUsername={account.newAccUser}
        setNewUsername={account.setNewAccUser}
        newPassword={account.newAccPass}
        setNewPassword={account.setNewAccPass}
        isAddingAccount={account.isAddingAcc}
        currentLang={lang}
        onSelectLang={handleSelectLanguage}
        currentTheme={theme}
        onSelectTheme={handleSelectTheme}
        textClamp={textClamp}
        onSelectTextClamp={handleSelectTextClamp}
        showFullSubjectNames={showFullSubjectNames}
        onToggleShowFullSubjectNames={handleToggleShowFullSubjectNames}
        ignoreGradeModifiers={ignoreGradeModifiers}
        onToggleIgnoreGradeModifiers={handleToggleIgnoreGradeModifiers}
        enableGradeSimulator={enableGradeSimulator}
        onToggleEnableGradeSimulator={handleToggleEnableGradeSimulator}
        showHomeworks={showHomeworks}
        onToggleShowHomeworks={handleToggleShowHomeworks}
        showUpcomingEventsWidget={showUpcomingEventsWidget}
        onToggleShowUpcomingEventsWidget={handleToggleShowUpcomingEventsWidget}
        dashboardOrder={dashboardOrder}
        onChangeDashboardOrder={handleChangeDashboardOrder}
        dashboardVisible={dashboardVisible}
        onToggleDashboardWidget={handleToggleDashboardWidget}
        showLuckyNumberBanner={showLuckyNumberBanner}
        onToggleShowLuckyNumberBanner={handleToggleShowLuckyNumberBanner}
        isStudent={isCurrentStudent}
        allowStudentJustifications={allowStudentJustifications}
        onToggleAllowStudentJustifications={handleToggleAllowStudentJustifications}
        onLogout={account.handleLogout}
        t={t}
      />
    </div>
  )
}
