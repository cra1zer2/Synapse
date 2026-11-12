'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertCircle, ArrowDown, X } from 'lucide-react'
import { createJustificationAction, getLiveJustificationsAction } from './actions'
import { LiveJustificationItem } from '@/models/justification.model'
import { LessonItem, TimetableEvent } from '@/models/timetable.model'
import { SubjectAttendance } from '@/models/attendance.model'
import { GradeItem } from '@/models/grade.model'
import { getDictionary, AppLanguage } from '@/config/dictionary.config'

import { useAccountSession } from '@/hooks/account.hook'
import { useTimetableSync } from '@/hooks/timetable-sync.hook'
import { useBodyScrollLock } from '@/hooks/scroll-lock.hook'
import { useMessagesInbox } from '@/hooks/messages.hook'
import { useAppSettings, TextClampOption, DashboardWidgetId } from '@/hooks/settings.hook'
import { isStudentUsername } from '@/utils/account.util'
import { normalizeToMondayIso } from '@/utils/date.util'
import { addRequestLog } from '@/utils/request-logger.util'

import { AuthView } from '@/components/auth/auth-view'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ScheduleWidget } from '@/components/schedule/schedule-widget'
import { UpcomingEventsScreen } from '@/components/schedule/upcoming-events-screen'
import { LessonDetailModal } from '@/components/schedule/lesson-detail-modal'
import { EventDetailModal } from '@/components/schedule/event-detail-modal'
import { AttendanceWidget } from '@/components/attendance/attendance-widget'
import { AttendanceDetailModal } from '@/components/attendance/attendance-detail-modal'
import { LegacyAttendanceView } from '@/components/attendance/legacy-attendance-screen'
import { ManualExcuseScreen } from '@/components/attendance/manual-excuse-screen'
import { LiveJustificationsScreen } from '@/components/attendance/live-justifications-screen'
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
import { IosEmptyState, IosSegmentedControl } from '@/components/ios/ios-ui'

export type { TextClampOption, DashboardWidgetId }

export default function Home() {
  const settings = useAppSettings()
  const {
    mounted,
    isDesktop,
    lang,
    theme,
    textClamp,
    showFullSubjectNames,
    gradeModifierMode,
    allowStudentJustifications,
    enableGradeSimulator,
    showHomeworks,
    showMobileTodayAttendance,
    dashboardOrder,
    dashboardVisible,
    showLuckyNumberBanner,
    luckyDismissedDate,
    todayIsoStr
  } = settings

  const [attendanceViewTab, setAttendanceViewTab] = useState<'summary' | 'table'>('summary')
  const [isLegacyDaySubViewOpen, setIsLegacyDaySubViewOpen] = useState(false)
  const [manualExcuseInitialTab, setManualExcuseInitialTab] = useState<'nb' | 'range' | 'hours'>('range')

  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(null)
  const [selectedGradeDetail, setSelectedGradeDetail] = useState<{ grade: GradeItem; subject: string } | null>(null)
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectAttendance | null>(null)

  const [showSettings, setShowSettings] = useState(false)
  const [showManualExcuse, setShowManualExcuse] = useState(false)
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [showFullUpcoming, setShowFullUpcoming] = useState(false)
  const [showFullAttendance, setShowFullAttendance] = useState(false)
  const [showMessagesScreen, setShowMessagesScreen] = useState(false)
  const [showAnnouncementsScreen, setShowAnnouncementsScreen] = useState(false)
  const [showComposeInHeader, setShowComposeInHeader] = useState(false)
  const [showFullGrades, setShowFullGrades] = useState(false)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [isMessagesSubViewOpen, setIsMessagesSubViewOpen] = useState(false)

  const [showLiveJustifications, setShowLiveJustifications] = useState(false)
  const [liveJustifications, setLiveJustifications] = useState<LiveJustificationItem[]>([])
  const [isLoadingLiveJust, setIsLoadingLiveJust] = useState(false)
  const [liveJustFilter, setLiveJustFilter] = useState<'0' | '1' | '2' | '3'>('0')

  const rootScrollRef = useRef<HTMLDivElement>(null)
  const pullStartRef = useRef<{ x: number; y: number } | null>(null)
  const [pullDistance, setPullDistance] = useState(0)

  const postSubmitSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const t = getDictionary(lang)
  const account = useAccountSession({ lang, t })

  useEffect(() => {
    return () => {
      if (postSubmitSyncTimerRef.current) clearTimeout(postSubmitSyncTimerRef.current)
    }
  }, [])

  useEffect(() => {
    setShowSettings(false)
    setShowFullGrades(false)
    setShowFullSchedule(false)
    setShowFullUpcoming(false)
    setShowFullAttendance(false)
    setShowMessagesScreen(false)
    setShowAnnouncementsScreen(false)
    setShowManualExcuse(false)
    setShowLiveJustifications(false)
    setSelectedLesson(null)
    setSelectedEvent(null)
    setSelectedSubjectDetail(null)
    setSelectedGradeDetail(null)
    setIsMessagesSubViewOpen(false)
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

  const handleOpenLiveJustifications = async (status: '0' | '1' | '2' | '3' = '0') => {
    setLiveJustFilter(status)
    setShowLiveJustifications(true)
    setIsLoadingLiveJust(true)
    const t0 = performance.now()
    const logTitle = lang === 'en' ? 'Load justification statuses' : 'Pobranie statusów usprawiedliwień'
    try {
      const parentAcc = account.savedAccounts.find(
        (a) => a.role === 'parent' || (Boolean(a.username) && !isStudentUsername(a.username))
      )
      const targetUser = parentAcc ? parentAcc.username : account.username
      const targetPass = parentAcc ? parentAcc.password : account.password
      const res = await getLiveJustificationsAction(targetUser, targetPass, status)
      const clientDurationMs = Math.round(performance.now() - t0)
      if (res.success) {
        setLiveJustifications(res.data)
        addRequestLog({
          name: logTitle,
          clientDurationMs,
          status: 'ok',
          details: 'Filter: ' + status + ', Items: ' + res.data.length
        })
      } else {
        addRequestLog({
          name: logTitle,
          clientDurationMs,
          status: 'error',
          error: res.error,
          details: 'Filter: ' + status
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      addRequestLog({
        name: logTitle,
        clientDurationMs: Math.round(performance.now() - t0),
        status: 'error',
        error: msg || (lang === 'en' ? 'Unknown error' : 'Nieznany błąd'),
        details: 'Filter: ' + status
      })
    } finally {
      setIsLoadingLiveJust(false)
    }
  }

  const findSubjectForGrade = useCallback(
    (grade: GradeItem): string => {
      if (grade.subject) return grade.subject
      if (!timetable.gradesData) return ''
      for (const s of timetable.gradesData.subjects) {
        const match = (g: GradeItem) =>
          g.id === grade.id ||
          (g.date === grade.date && g.category === grade.category && g.grade === grade.grade)
        if (s.semester1.some(match) || s.semester2.some(match)) {
          return s.subject
        }
      }
      return ''
    },
    [timetable.gradesData]
  )

  const isAnyOverlayActive = Boolean(
    showFullGrades ||
      showFullSchedule ||
      showFullUpcoming ||
      showFullAttendance ||
      showMessagesScreen ||
      showAnnouncementsScreen ||
      showSettings ||
      showManualExcuse ||
      showLiveJustifications ||
      selectedSubjectDetail ||
      isMessagesSubViewOpen
  )

  const isAnySheetActive = Boolean(selectedLesson || selectedEvent || selectedGradeDetail)

  useBodyScrollLock(isAnyOverlayActive || isAnySheetActive)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleDeepLinking = () => {
      try {
        const tab = new URLSearchParams(window.location.search).get('tab')
        if (tab === 'grades') setShowFullGrades(true)
        else if (tab === 'messages') setShowMessagesScreen(true)
        else if (tab === 'schedule') setShowFullSchedule(true)
        else if (tab === 'upcoming' || tab === 'events') setShowFullUpcoming(true)
        else if (tab === 'attendance') setShowFullAttendance(true)
      } catch {}
    }
    handleDeepLinking()
    window.addEventListener('popstate', handleDeepLinking)
    return () => window.removeEventListener('popstate', handleDeepLinking)
  }, [])

  const onLanguageChange = (newLang: AppLanguage) => {
    settings.handleSelectLanguage(newLang, (l) => {
      if (account.isConfigured && account.username && account.password) {
        timetable.executeSync(account.username, account.password, l, timetable.currentWeekPivot, true)
      }
    })
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

  const handleRootTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDesktop || isAnyOverlayActive || isAnySheetActive || isManualRefreshing || timetable.isUpdating) {
      pullStartRef.current = null
      return
    }
    const scrollTop = isDesktop ? (rootScrollRef.current?.scrollTop ?? 0) : Math.max(0, window.scrollY)
    if (scrollTop <= 0) {
      pullStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else {
      pullStartRef.current = null
    }
  }

  const handleRootTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!pullStartRef.current) return
    const scrollTop = isDesktop ? (rootScrollRef.current?.scrollTop ?? 0) : Math.max(0, window.scrollY)
    if (scrollTop > 0) {
      pullStartRef.current = null
      if (pullDistance > 0) setPullDistance(0)
      return
    }
    const dy = e.touches[0].clientY - pullStartRef.current.y
    const dx = Math.abs(e.touches[0].clientX - pullStartRef.current.x)
    if (dx > dy) {
      pullStartRef.current = null
      if (pullDistance > 0) setPullDistance(0)
      return
    }
    if (dy > 8) {
      setPullDistance(Math.min(78, Math.round((dy - 8) * 0.42)))
    }
  }

  const handleRootTouchEnd = () => {
    if (pullDistance >= 54) {
      handleManualRefresh()
    }
    pullStartRef.current = null
    setPullDistance(0)
  }

  const isCurrentStudent = (() => {
    const role = account.activeAccount?.role || account.profile?.role
    if (role === 'parent') return false
    if (role === 'student') return true
    return isStudentUsername(account.activeAccount?.username || account.username)
  })()

  const canSubmitExcuse = isCurrentStudent ? allowStudentJustifications : true

  const handleSubmitJustifications = async (payload: {
    dateIso?: string
    dateFrom?: string
    dateTo?: string
    lessons: number[]
    message: string
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const parentAcc = account.savedAccounts.find(
        (a) => a.role === 'parent' || (Boolean(a.username) && !isStudentUsername(a.username))
      )
      const targetUser = parentAcc ? parentAcc.username : account.username
      const targetPass = parentAcc ? parentAcc.password : account.password

      const res = await createJustificationAction(targetUser, targetPass, {
        dateFrom: payload.dateFrom || payload.dateIso || '',
        dateTo: payload.dateTo || payload.dateIso || '',
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
      return {
        ok: false,
        error: res.error || (lang === 'en' ? 'Failed to send justification' : 'Błąd wysyłania usprawiedliwienia')
      }
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
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
        onClearError={() => account.setAuthError?.(null)}
        verifiedCandidate={account.verifiedCandidate}
        onStartVerification={account.handleStartVerification}
        onConfirmLogin={account.handleConfirmLogin}
        onBackToInput={() => account.setAuthStep('input')}
        lang={lang}
        onSelectLanguage={onLanguageChange}
        t={t}
      />
    )
  }

  const currentDaySchedule = timetable.timetableData?.schedule.find((d) => d.dayName === timetable.selectedDay)
  const activeTodayData = timetable.todayTimetableData || timetable.timetableData

  const renderWidget = (id: DashboardWidgetId, desktopMode: boolean) => {
    switch (id) {
      case 'schedule':
        return (
          <MiniScheduleWidget
            key="schedule"
            timetableData={activeTodayData}
            isLoading={timetable.isLoadingWeek && !activeTodayData && !timetable.timetableError}
            error={timetable.timetableError}
            onRetry={handleManualRefresh}
            textClamp={textClamp}
            showFullSubjectNames={showFullSubjectNames}
            lang={lang}
            t={t}
            showAllLessons={desktopMode}
            onSelectLesson={setSelectedLesson}
            onOpenFullSchedule={(targetDay, targetIsoDate) => {
              if (targetIsoDate) {
                const targetMonday = normalizeToMondayIso(targetIsoDate)
                if (targetMonday !== timetable.currentWeekPivot) {
                  timetable.queueWeekChange(targetMonday)
                }
              }
              if (targetDay) timetable.setSelectedDay(targetDay)
              setShowFullSchedule(true)
            }}
          />
        )
      case 'grades':
        return (
          <MiniGradesWidget
            key="grades"
            gradesData={timetable.gradesData}
            gradeModifierMode={gradeModifierMode}
            isLoading={!timetable.gradesData && timetable.isUpdating && !timetable.gradesError}
            error={timetable.gradesError}
            onRetry={handleManualRefresh}
            lang={lang}
            t={t}
            isDesktop={desktopMode}
            onOpenGrades={() => setShowFullGrades(true)}
            onSelectGrade={(g) =>
              setSelectedGradeDetail({ grade: g, subject: desktopMode ? findSubjectForGrade(g) : g.subject || '' })
            }
          />
        )
      case 'upcoming':
        return (
          <MiniUpcomingEventsWidget
            key="upcoming"
            timetableData={activeTodayData || timetable.timetableData}
            isLoading={timetable.isLoadingWeek && !activeTodayData && !timetable.timetableError}
            showHomeworks={showHomeworks}
            showFullSubjectNames={showFullSubjectNames}
            lang={lang}
            t={t}
            isDesktop={desktopMode}
            onSelectEvent={setSelectedEvent}
            onOpenCalendar={() => setShowFullUpcoming(true)}
          />
        )
      case 'attendance':
        return (
          <MiniAttendanceWidget
            key="attendance"
            attendanceData={timetable.attendanceData}
            timetableData={activeTodayData}
            isLoading={!timetable.attendanceData && timetable.isUpdating && !timetable.attendanceError}
            error={timetable.attendanceError}
            onRetry={handleManualRefresh}
            lang={lang}
            t={t}
            isDesktop={desktopMode}
            showTodayLine={desktopMode || showMobileTodayAttendance}
            onOpenAttendance={() => {
              setAttendanceViewTab('summary')
              setShowFullAttendance(true)
            }}
            onOpenLegacyAttendance={() => {
              setAttendanceViewTab('table')
              setShowFullAttendance(true)
            }}
          />
        )
      case 'messages':
        return (
          <MiniMessagesWidget
            key="messages"
            unreadCount={messagesInbox.messages.filter((m) => !m.isRead).length}
            announcementsCount={messagesInbox.announcements.length}
            isLoading={
              messagesInbox.isLoadingMessages &&
              messagesInbox.messages.length === 0 &&
              messagesInbox.announcements.length === 0 &&
              !messagesInbox.messagesError
            }
            error={messagesInbox.messagesError}
            onRetry={messagesInbox.reloadMessages}
            lang={lang}
            t={t}
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

  const renderLoadingOrError = (err: string | null) =>
    err ? (
      <IosEmptyState
        iconTone="red"
        icon={<AlertCircle className="w-[22px] h-[22px]" strokeWidth={2} />}
        title={err}
        action={{
          label: t.refresh,
          onClick: handleManualRefresh
        }}
        className="my-12"
      />
    ) : (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <IosSpinner size="large" className="text-[var(--ios-blue)]" />
        <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-tight">
          {t.loadingTimetable}
        </span>
      </div>
    )

  return (
    <div className="w-full min-h-[100lvh] md:min-h-screen bg-[var(--ios-bg)] relative overflow-x-clip">
      <div
        ref={rootScrollRef}
        data-ios-root-panel="true"
        data-ios-receded={!isDesktop && isAnyOverlayActive ? 'true' : 'false'}
        onTouchStart={handleRootTouchStart}
        onTouchMove={handleRootTouchMove}
        onTouchEnd={handleRootTouchEnd}
        className="relative w-full min-h-[100lvh] min-h-[100dvh] block md:inset-auto md:w-full md:h-auto md:min-h-screen md:overflow-visible md:flex md:flex-col bg-[var(--ios-bg)]"
        style={{
          transform: !isDesktop && isAnyOverlayActive ? 'translate3d(-' + IOS_PARALLAX_PERCENT + '%, 0, 0)' : 'none',
          WebkitBackfaceVisibility: !isDesktop && isAnyOverlayActive ? 'hidden' : undefined,
          backfaceVisibility: !isDesktop && isAnyOverlayActive ? 'hidden' : undefined,
          transition: IOS_PANEL_TRANSITION,
          pointerEvents: isAnyOverlayActive ? 'none' : 'auto',
          willChange: !isDesktop && isAnyOverlayActive ? 'transform' : 'auto'
        }}
      >
        <DashboardHeader
          profile={account.profile}
          username={account.username}
          isUpdating={timetable.isUpdating}
          isManualRefreshing={isManualRefreshing}
          lastSyncedAt={timetable.lastSyncedAt}
          onRefresh={handleManualRefresh}
          onOpenSettings={() => setShowSettings(true)}
          isReceded={!isDesktop && isAnyOverlayActive}
          t={t}
        />

        <main className="w-full min-h-full md:min-h-0 md:flex-1 pt-3 md:pt-5 pb-32 px-4 md:px-5 max-w-[480px] md:max-w-[860px] mx-auto flex flex-col gap-3.5 md:gap-4 box-border">
          {(pullDistance > 0 || isManualRefreshing) && !isDesktop && (
            <div
              style={{ height: (isManualRefreshing ? 36 : Math.min(48, pullDistance * 0.65)) + 'px' }}
              className="flex items-center justify-center gap-2 overflow-hidden transition-[height] duration-150 select-none md:hidden"
            >
              {isManualRefreshing ? (
                <IosSpinner size="small" className="text-[var(--ios-blue)]" />
              ) : (
                <ArrowDown
                  className={
                    'w-4 h-4 text-[var(--ios-secondary)] transition-transform duration-150 ' +
                    (pullDistance >= 54 ? 'rotate-180 text-[var(--ios-blue)]' : '')
                  }
                  strokeWidth={2.2}
                />
              )}
              <span className="text-[12px] font-medium text-[var(--ios-secondary)]">
                {isManualRefreshing
                  ? t.updatingStatus
                  : pullDistance >= 54
                    ? t.releaseToRefreshHint
                    : t.pullToRefreshHint}
              </span>
            </div>
          )}

          {showLuckyNumberBanner &&
            account.profile?.luckyNumber !== null &&
            account.profile?.luckyNumber !== undefined &&
            account.profile?.classNumber !== null &&
            account.profile?.classNumber !== undefined &&
            account.profile.classNumber === account.profile.luckyNumber &&
            luckyDismissedDate !== todayIsoStr && (
              <div className="ios-card px-4 py-3 flex items-center justify-between gap-3 select-none">
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
                  onClick={settings.handleDismissLuckyBanner}
                  className="w-7 h-7 rounded-full bg-[var(--ios-element)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)] flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer"
                  aria-label={t.closeLabel}
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.4} />
                </button>
              </div>
            )}

          <div className="hidden md:grid md:grid-cols-2 gap-4 items-start w-full">
            <div className="flex flex-col gap-4 w-full">{leftDesktopIds.map((id) => renderWidget(id, true))}</div>
            <div className="flex flex-col gap-4 w-full">{rightDesktopIds.map((id) => renderWidget(id, true))}</div>
          </div>

          <div className="flex md:hidden flex-col gap-3.5 w-full">
            {visibleMobileIds.map((id) => renderWidget(id, false))}
          </div>
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
            gradeModifierMode={gradeModifierMode}
            enableGradeSimulator={enableGradeSimulator}
            lang={lang}
            t={t}
            onSelectGrade={(grade, subject) => setSelectedGradeDetail({ grade, subject })}
          />
        ) : (
          renderLoadingOrError(timetable.gradesError)
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
            onSelectDay={timetable.setSelectedDay}
            onSelectLesson={setSelectedLesson}
            onSelectEvent={setSelectedEvent}
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
        ) : (
          renderLoadingOrError(timetable.timetableError)
        )}
      </IosScreen>

      <IosScreen
        isOpen={showFullUpcoming}
        onClose={() => {
          setShowFullUpcoming(false)
          if (typeof window !== 'undefined' && (window.location.search.includes('tab=upcoming') || window.location.search.includes('tab=events'))) {
            window.history.replaceState({}, '', window.location.pathname)
          }
        }}
        title={lang === 'en' ? 'Tests & Deadlines' : 'Sprawdziany i terminy'}
        backLabel={t.backAction}
        isSubView={true}
      >
        <UpcomingEventsScreen
          timetableData={timetable.timetableData}
          isLoading={timetable.isLoadingWeek}
          showHomeworks={showHomeworks}
          showFullSubjectNames={showFullSubjectNames}
          lang={lang}
          t={t}
          onSelectEvent={setSelectedEvent}
          onRefresh={handleManualRefresh}
        />
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
        isReceded={Boolean(selectedSubjectDetail || showManualExcuse || showLiveJustifications || isLegacyDaySubViewOpen)}
      >
        {timetable.attendanceData && (
          <div className="w-full flex flex-col gap-3.5">
            <IosSegmentedControl<'summary' | 'table'>
              value={attendanceViewTab}
              onChange={setAttendanceViewTab}
              options={[
                { id: 'summary', label: lang === 'en' ? 'Subjects' : 'Przedmioty' },
                { id: 'table', label: lang === 'en' ? 'Journal' : 'Dziennik' }
              ]}
              className="w-full"
            />

            {attendanceViewTab === 'summary' ? (
              <AttendanceWidget
                attendanceData={timetable.attendanceData}
                lang={lang}
                showFullSubjectNames={showFullSubjectNames}
                onSelectSubject={setSelectedSubjectDetail}
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
        gradeDetail={selectedGradeDetail}
        isOpen={Boolean(selectedGradeDetail)}
        onClose={() => setSelectedGradeDetail(null)}
        lang={lang}
        t={t}
      />

      <LessonDetailModal
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
        isToday={Boolean(currentDaySchedule?.isToday)}
        lang={lang}
        t={t}
      />

      <EventDetailModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        lang={lang}
        t={t}
      />

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

      <AttendanceDetailModal
        subjectDetail={selectedSubjectDetail}
        isOpen={Boolean(selectedSubjectDetail)}
        onClose={() => setSelectedSubjectDetail(null)}
        showFullSubjectNames={showFullSubjectNames}
        t={t}
      />

      <IosScreen
        isOpen={showMessagesScreen}
        onClose={() => {
          setShowMessagesScreen(false)
          setIsMessagesSubViewOpen(false)
          setShowComposeInHeader(false)
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
            onClick={() => setShowComposeInHeader(true)}
            className="text-[var(--ios-blue)] text-[16px] font-normal leading-none active:opacity-60 select-none h-full flex items-center pl-2 cursor-pointer"
          >
            {t.writeNewMessage}
          </button>
        }
      >
        <div className="w-full flex flex-col gap-3.5">
          <IosSegmentedControl
            options={[
              { id: 'inbox', label: t.messagesInbox },
              { id: 'sent', label: lang === 'en' ? 'Sent' : 'Wysłane' }
            ]}
            value={messagesInbox.currentFolder}
            onChange={(val) => messagesInbox.setCurrentFolder(val as 'inbox' | 'sent')}
            className="w-full"
          />

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
            onMarkMessageRead={messagesInbox.markMessageLocal}
            onDownloadAttachment={messagesInbox.handleDownloadAttachment}
            onSendMessage={messagesInbox.handleSendMessage}
            isLoading={messagesInbox.isLoadingMessages}
            lang={lang}
            t={t}
            onSubViewChange={setIsMessagesSubViewOpen}
          />
        </div>
      </IosScreen>

      <IosScreen
        isOpen={showAnnouncementsScreen}
        onClose={() => {
          setShowAnnouncementsScreen(false)
          setIsMessagesSubViewOpen(false)
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
          onMarkMessageRead={messagesInbox.markMessageLocal}
          onSendMessage={messagesInbox.handleSendMessage}
          isLoading={messagesInbox.isLoadingMessages}
          lang={lang}
          t={t}
          onSubViewChange={setIsMessagesSubViewOpen}
        />
      </IosScreen>

      <LiveJustificationsScreen
        isOpen={showLiveJustifications}
        onClose={() => setShowLiveJustifications(false)}
        isLoading={isLoadingLiveJust}
        filter={liveJustFilter}
        onChangeFilter={(id) => handleOpenLiveJustifications(id)}
        onRefresh={() => handleOpenLiveJustifications(liveJustFilter)}
        items={liveJustifications}
        lang={lang}
        t={t}
      />

      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        profile={account.profile}
        savedAccounts={account.savedAccounts}
        onSwitchAccount={account.handleSwitchAccount}
        onAddAccount={account.handleAddSecondaryAccount}
        onConfirmAddAccount={account.handleConfirmAddAccount}
        onResetAddAccount={account.handleResetAddAccount}
        addAccountStep={account.addAccountStep}
        setAddAccountStep={account.setAddAccountStep}
        addAccountCandidate={account.addAccountCandidate}
        addAccountError={account.addAccountError}
        setAddAccountError={account.setAddAccountError}
        newUsername={account.newAccUser}
        setNewUsername={account.setNewAccUser}
        newPassword={account.newAccPass}
        setNewPassword={account.setNewAccPass}
        isAddingAccount={account.isAddingAcc}
        currentLang={lang}
        onSelectLang={onLanguageChange}
        currentTheme={theme}
        onSelectTheme={settings.handleSelectTheme}
        showFullSubjectNames={showFullSubjectNames}
        onToggleShowFullSubjectNames={settings.handleToggleShowFullSubjectNames}
        showMobileTodayAttendance={showMobileTodayAttendance}
        onToggleMobileTodayAttendance={settings.handleToggleMobileTodayAttendance}
        gradeModifierMode={gradeModifierMode}
        onSelectGradeModifierMode={settings.handleSelectGradeModifierMode}
        enableGradeSimulator={enableGradeSimulator}
        onToggleEnableGradeSimulator={settings.handleToggleEnableGradeSimulator}
        showHomeworks={showHomeworks}
        onToggleShowHomeworks={settings.handleToggleShowHomeworks}
        dashboardOrder={dashboardOrder}
        onChangeDashboardOrder={settings.handleChangeDashboardOrder}
        dashboardVisible={dashboardVisible}
        onToggleDashboardWidget={settings.handleToggleDashboardWidget}
        showLuckyNumberBanner={showLuckyNumberBanner}
        onToggleShowLuckyNumberBanner={settings.handleToggleShowLuckyNumberBanner}
        isStudent={isCurrentStudent}
        allowStudentJustifications={allowStudentJustifications}
        onToggleAllowStudentJustifications={settings.handleToggleAllowStudentJustifications}
        onLogout={account.handleLogout}
        t={t}
      />
    </div>
  )
}
