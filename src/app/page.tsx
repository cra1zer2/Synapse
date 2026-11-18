'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowDown, SquarePen } from 'lucide-react'
import { getDictionary } from '@/config/dictionary.config'
import { isStudentUsername } from '@/utils/account.util'
import { useAppSettings } from '@/hooks/settings.hook'
import { useAccountSession } from '@/hooks/account.hook'
import { useMessagesInbox } from '@/hooks/messages.hook'
import { useTimetableSync } from '@/hooks/timetable-sync.hook'
import { useBodyScrollLock } from '@/hooks/scroll-lock.hook'
import { useSectionBadges, TrackedBadgeSection } from '@/hooks/section-badges.hook'
import { IOS_PANEL_TRANSITION, IOS_PARALLAX_PERCENT } from '@/components/ui/ui-screen'
import { UiIconButton } from '@/components/ui/ui-button'
import { UiSpinner } from '@/components/ui/ui-spinner'
import { AuthView } from '@/features/auth/auth-view'
import { DashboardHeader } from '@/features/dashboard/dashboard-header'
import { LuckyNumberBanner } from '@/features/dashboard/lucky-number-banner'
import { BottomNavBar, PrimaryTabId, PRIMARY_TAB_ORDER } from '@/features/dashboard/bottom-nav-bar'
import { renderDashboardWidget, DashboardWidgetRenderContext } from '@/features/dashboard/widget-registry'
import { ScheduleFeature, useScheduleFeature } from '@/features/schedule/schedule-feature'
import { GradesFeature, GradesSimToggleButton, useGradesFeature } from '@/features/grades/grades-feature'
import { AttendanceFeature, useAttendanceFeature } from '@/features/attendance/attendance-feature'
import { MessagesFeature, useMessagesFeature } from '@/features/messages/messages-feature'
import { SettingsSheet } from '@/features/settings/settings-sheet'
import { DesktopWorkspace } from '@/features/desktop/desktop-workspace'
import type { DesktopNavSection } from '@/features/desktop/desktop-sidebar'

type DashboardSubview = 'schedule' | 'upcoming' | 'grades' | 'attendance' | 'messages' | 'announcements' | null

export default function Home() {
  const settings = useAppSettings()
  const {
    mounted,
    lang,
    theme,
    navMode,
    showFullSubjectNames,
    allowStudentJustifications,
    enableGradeSimulator,
    showHomeworks,
    showMobileTodayAttendance,
    dashboardOrder,
    dashboardVisible,
    showLuckyNumberBanner,
    luckyDismissedDate,
    todayIsoStr,
  } = settings
  const t = getDictionary(lang)
  const account = useAccountSession({ lang, t })
  const messagesInbox = useMessagesInbox({
    username: account.username,
    password: account.password,
    lang,
  })
  const timetable = useTimetableSync({
    username: account.username,
    password: account.password,
    lang,
    isConfigured: account.isConfigured,
  })

  const [activeSubview, setActiveSubview] = useState<DashboardSubview>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [hasScheduleSheet, setHasScheduleSheet] = useState(false)
  const [hasGradesSheet, setHasGradesSheet] = useState(false)
  const [hasAttendanceOverlay, setHasAttendanceOverlay] = useState(false)
  const [hasMessagesOverlay, setHasMessagesOverlay] = useState(false)
  const [activeTab, setActiveTab] = useState<PrimaryTabId>('schedule')
  const [exitingTab, setExitingTab] = useState<PrimaryTabId | null>(null)
  const [tabDirection, setTabDirection] = useState<1 | -1>(1)
  const [tabTransitionId, setTabTransitionId] = useState(0)
  const [visitedTabs, setVisitedTabs] = useState<PrimaryTabId[]>(['schedule'])
  const tabExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [activeDesktopSection, setActiveDesktopSection] = useState<DesktopNavSection>('overview')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const activeBadgeSection: TrackedBadgeSection | null = !account.isConfigured
    ? null
    : isDesktop
      ? activeDesktopSection === 'timetable'
        ? 'schedule'
        : activeDesktopSection === 'grades' || activeDesktopSection === 'attendance'
          ? activeDesktopSection
          : null
      : navMode === 'tabs'
        ? activeTab === 'schedule' || activeTab === 'grades' || activeTab === 'attendance'
          ? activeTab
          : null
        : activeSubview === 'schedule' || activeSubview === 'grades' || activeSubview === 'attendance'
          ? activeSubview
          : null

  const { badges: sectionBadges } = useSectionBadges({
    username: account.username,
    timetableData: timetable.timetableData,
    todayTimetableData: timetable.todayTimetableData,
    gradesData: timetable.gradesData,
    attendanceData: timetable.attendanceData,
    activeSection: activeBadgeSection,
  })

  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [isPullRefreshing, setIsPullRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPullDragging, setIsPullDragging] = useState(false)
  const pullStartRef = useRef<{ x: number; y: number } | null>(null)
  const pullDistanceRef = useRef(0)
  const isPullDraggingRef = useRef(false)
  const rootScrollRef = useRef<HTMLDivElement | null>(null)

  const openScheduleScreen = useCallback(() => setActiveSubview('schedule'), [])
  const openEventsScreen = useCallback(() => setActiveSubview('upcoming'), [])
  const openGradesScreen = useCallback(() => setActiveSubview('grades'), [])
  const openAttendanceScreen = useCallback(() => setActiveSubview('attendance'), [])
  const openMessagesScreen = useCallback(() => setActiveSubview('messages'), [])
  const openAnnouncementsScreen = useCallback(() => setActiveSubview('announcements'), [])

  const scheduleCtrl = useScheduleFeature({
    timetableData: timetable.timetableData,
    todayTimetableData: timetable.todayTimetableData,
    selectedDay: timetable.selectedDay,
    setSelectedDay: timetable.setSelectedDay,
    queueWeekChange: timetable.queueWeekChange,
    onOpenScheduleScreen: openScheduleScreen,
    onOpenEventsScreen: openEventsScreen,
  })
  const gradesCtrl = useGradesFeature({
    gradesData: timetable.gradesData,
    onOpenGradesScreen: openGradesScreen,
  })
  const attendanceCtrl = useAttendanceFeature({
    username: account.username,
    password: account.password,
    savedAccounts: account.savedAccounts,
    lang,
    onOpenAttendanceScreen: openAttendanceScreen,
    onJustificationSubmitted: () =>
      timetable.executeSync(account.username, account.password, lang, timetable.currentWeekPivot, true),
  })
  const messagesCtrl = useMessagesFeature({
    currentFolder: messagesInbox.currentFolder,
    setCurrentFolder: messagesInbox.setCurrentFolder,
    onOpenMessagesScreen: openMessagesScreen,
    onOpenAnnouncementsScreen: openAnnouncementsScreen,
  })

  useEffect(() => {
    return () => {
      if (tabExitTimerRef.current) clearTimeout(tabExitTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleDeepLinking = () => {
      try {
        const tab = new URLSearchParams(window.location.search).get('tab')
        if (tab === 'grades') setActiveDesktopSection('grades')
        else if (tab === 'messages') setActiveDesktopSection('inbox')
        else if (tab === 'schedule') setActiveDesktopSection('timetable')
        else if (tab === 'upcoming' || tab === 'events') setActiveDesktopSection('deadlines')
        else if (tab === 'attendance') setActiveDesktopSection('attendance')

        if (navMode === 'tabs') {
          if (tab === 'grades') setActiveTab('grades')
          else if (tab === 'messages') setActiveTab('messages')
          else if (tab === 'schedule') {
            setActiveTab('schedule')
            scheduleCtrl.setScheduleSubTab('timetable')
          } else if (tab === 'upcoming' || tab === 'events') {
            setActiveTab('schedule')
            scheduleCtrl.setScheduleSubTab('events')
          } else if (tab === 'attendance') setActiveTab('attendance')
        } else {
          if (tab === 'grades') setActiveSubview('grades')
          else if (tab === 'messages') setActiveSubview('messages')
          else if (tab === 'schedule') setActiveSubview('schedule')
          else if (tab === 'upcoming' || tab === 'events') setActiveSubview('upcoming')
          else if (tab === 'attendance') setActiveSubview('attendance')
        }
      } catch {}
    }
    handleDeepLinking()
    window.addEventListener('popstate', handleDeepLinking)
    return () => window.removeEventListener('popstate', handleDeepLinking)
  }, [navMode, scheduleCtrl.setScheduleSubTab])

  const isPanelOverlayActive = Boolean(activeSubview || showSettings || hasAttendanceOverlay || hasMessagesOverlay)
  const isSheetOverlayActive = Boolean(hasScheduleSheet || hasGradesSheet)
  useBodyScrollLock(!isDesktop && (isPanelOverlayActive || isSheetOverlayActive))

  const runRefresh = async (fromPull: boolean) => {
    if (
      (!fromPull && (timetable.isUpdating || isManualRefreshing)) ||
      isPullRefreshing ||
      !account.username ||
      !account.password
    ) {
      return
    }
    setIsManualRefreshing(true)
    if (fromPull) setIsPullRefreshing(true)
    try {
      await Promise.all([
        timetable.executeSync(
          account.username,
          account.password,
          lang,
          timetable.currentWeekPivot,
          Boolean(timetable.timetableData)
        ),
        messagesInbox.reloadMessages(),
      ])
    } finally {
      setIsManualRefreshing(false)
      setIsPullRefreshing(false)
    }
  }

  const handleManualRefresh = () => runRefresh(false)

  const resetPullState = () => {
    pullStartRef.current = null
    if (isPullDraggingRef.current) {
      isPullDraggingRef.current = false
      setIsPullDragging(false)
    }
    if (pullDistanceRef.current > 0) {
      pullDistanceRef.current = 0
      setPullDistance(0)
    }
  }

  const handleRootTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isPanelOverlayActive || isSheetOverlayActive || isPullRefreshing) {
      resetPullState()
      return
    }
    const scrollTop = Math.max(0, window.scrollY)
    if (scrollTop <= 0) {
      pullStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else {
      resetPullState()
    }
  }

  const handleRootTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!pullStartRef.current) return
    const scrollTop = Math.max(0, window.scrollY)
    if (scrollTop > 0) {
      resetPullState()
      return
    }
    const dy = e.touches[0].clientY - pullStartRef.current.y
    const dx = Math.abs(e.touches[0].clientX - pullStartRef.current.x)
    if (dy < 0 || dx > dy) {
      resetPullState()
      return
    }
    if (dy > 8) {
      if (!isPullDraggingRef.current) {
        isPullDraggingRef.current = true
        setIsPullDragging(true)
      }
      const nextPull = Math.min(78, Math.round((dy - 8) * 0.42))
      if (nextPull !== pullDistanceRef.current) {
        pullDistanceRef.current = nextPull
        setPullDistance(nextPull)
      }
    }
  }

  const handleRootTouchEnd = () => {
    const shouldRefresh = pullDistanceRef.current >= 54
    resetPullState()
    if (shouldRefresh) runRefresh(true)
  }

  const handleSelectPrimaryTab = (tab: PrimaryTabId) => {
    if (tab === activeTab) {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
      }
      return
    }
    const prevIdx = PRIMARY_TAB_ORDER.indexOf(activeTab)
    const nextIdx = PRIMARY_TAB_ORDER.indexOf(tab)
    const dir: 1 | -1 = nextIdx >= prevIdx ? 1 : -1
    if (tabExitTimerRef.current) clearTimeout(tabExitTimerRef.current)
    setTabDirection(dir)
    setExitingTab(activeTab)
    setActiveTab(tab)
    setTabTransitionId((n) => n + 1)
    setVisitedTabs((prev) => (prev.includes(tab) ? prev : [...prev, tab]))
    tabExitTimerRef.current = setTimeout(() => {
      setExitingTab(null)
    }, 190)
    if (tab !== 'messages') messagesCtrl.setIsComposeOpen(false)
    if (tab !== 'grades') gradesCtrl.setIsSimSelecting(false)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }

  const getTabContainerClass = (tabId: PrimaryTabId) => {
    if (tabId === activeTab) {
      if (tabTransitionId === 0) return 'relative w-full'
      return 'relative w-full ' + (tabDirection >= 0 ? 'tab-enter-right' : 'tab-enter-left')
    }
    if (tabId === exitingTab) {
      return (
        'absolute top-0 left-0 right-0 pointer-events-none ' +
        (tabDirection >= 0 ? 'tab-exit-left' : 'tab-exit-right')
      )
    }
    return 'hidden'
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
        onClearError={() => account.setAuthError(null)}
        verifiedCandidate={account.verifiedCandidate}
        onStartVerification={account.handleStartVerification}
        onConfirmLogin={account.handleConfirmLogin}
        onBackToInput={() => account.setAuthStep('input')}
        lang={lang}
        onSelectLanguage={settings.handleSelectLanguage}
        t={t}
      />
    )
  }

  const activeRole = account.activeAccount?.role || account.profile?.role || 'student'
  const isStudentUser = activeRole === 'student' || isStudentUsername(account.username)
  const canSubmitExcuse = !isStudentUser || allowStudentJustifications
  const unreadCount = messagesInbox.messages.filter((m) => !m.isRead).length

  if (isDesktop) {
    return (
      <DesktopWorkspace
        activeSection={activeDesktopSection}
        onSelectSection={setActiveDesktopSection}
        profile={account.profile}
        username={account.username}
        savedAccounts={account.savedAccounts}
        onSwitchAccount={(acc) => {
          account.handleSwitchAccount(acc)
          setActiveDesktopSection('overview')
        }}
        onAddAccount={account.handleStartAddAccountVerification}
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
        onLogout={() => {
          setActiveDesktopSection('overview')
          account.handleLogout()
        }}
        lang={lang}
        onSelectLang={settings.handleSelectLanguage}
        theme={theme}
        onSelectTheme={settings.handleSelectTheme}
        showFullSubjectNames={showFullSubjectNames}
        onToggleShowFullSubjectNames={settings.handleToggleShowFullSubjectNames}
        enableGradeSimulator={enableGradeSimulator}
        onToggleEnableGradeSimulator={settings.handleToggleEnableGradeSimulator}
        showHomeworks={showHomeworks}
        onToggleShowHomeworks={settings.handleToggleShowHomeworks}
        showLuckyNumberBanner={showLuckyNumberBanner}
        onToggleShowLuckyNumberBanner={settings.handleToggleShowLuckyNumberBanner}
        isStudent={isStudentUser}
        canSubmitExcuse={canSubmitExcuse}
        allowStudentJustifications={allowStudentJustifications}
        onToggleAllowStudentJustifications={settings.handleToggleAllowStudentJustifications}
        timetableData={timetable.timetableData}
        todayTimetableData={timetable.todayTimetableData}
        gradesData={timetable.gradesData}
        attendanceData={timetable.attendanceData}
        timetableError={timetable.timetableError}
        gradesError={timetable.gradesError}
        attendanceError={timetable.attendanceError}
        isUpdating={timetable.isUpdating}
        isLoadingWeek={timetable.isLoadingWeek}
        lastSyncedAt={timetable.lastSyncedAt}
        selectedDay={timetable.selectedDay}
        onSelectDay={timetable.setSelectedDay}
        currentWeekPivot={timetable.currentWeekPivot}
        onShiftWeek={timetable.shiftWeek}
        onSelectDate={timetable.queueWeekChange}
        onRefresh={handleManualRefresh}
        messages={messagesInbox.messages}
        sentMessages={messagesInbox.sentMessages}
        announcements={messagesInbox.announcements}
        receivers={messagesInbox.receivers}
        isLoadingMessages={
          messagesInbox.isLoadingMessages &&
          messagesInbox.messages.length === 0 &&
          messagesInbox.announcements.length === 0 &&
          !messagesInbox.messagesError
        }
        ensureReceivers={messagesInbox.ensureReceivers}
        onOpenMessage={messagesInbox.handleOpenMessage}
        onMarkMessageRead={messagesInbox.markMessageLocal}
        onDownloadAttachment={messagesInbox.handleDownloadAttachment}
        onSendMessage={messagesInbox.handleSendMessage}
        badges={{
          schedule: sectionBadges.schedule,
          grades: sectionBadges.grades,
          attendance: sectionBadges.attendance,
        }}
        scheduleCtrl={scheduleCtrl}
        gradesCtrl={gradesCtrl}
        attendanceCtrl={attendanceCtrl}
        messagesCtrl={messagesCtrl}
        t={t}
      />
    )
  }

  const widgetCtx: DashboardWidgetRenderContext = {
    lang,
    t,
    timetableData: timetable.timetableData,
    todayTimetableData: timetable.todayTimetableData,
    gradesData: timetable.gradesData,
    attendanceData: timetable.attendanceData,
    isUpdating: timetable.isUpdating,
    isLoadingMessages:
      messagesInbox.isLoadingMessages &&
      messagesInbox.messages.length === 0 &&
      messagesInbox.announcements.length === 0 &&
      !messagesInbox.messagesError,
    timetableError: timetable.timetableError,
    gradesError: timetable.gradesError,
    attendanceError: timetable.attendanceError,
    messagesError: messagesInbox.messagesError,
    unreadCount,
    announcementsCount: messagesInbox.announcements.length,
    showFullSubjectNames,
    showHomeworks,
    showMobileTodayAttendance,
    scheduleCtrl,
    gradesCtrl,
    attendanceCtrl,
    messagesCtrl,
    onRetryMain: handleManualRefresh,
    onRetryMessages: messagesInbox.reloadMessages,
  }

  const visibleMobileIds = dashboardOrder.filter((id) => dashboardVisible[id])
  const pullSlotHeight = isPullRefreshing
    ? 36
    : pullDistance > 0
      ? Math.min(48, Math.round(pullDistance * 0.65))
      : 0
  const isPullSlotVisible = pullSlotHeight > 0
  const activeTabTitle =
    navMode === 'tabs'
      ? activeTab === 'schedule'
        ? t.schedule
        : activeTab === 'grades'
          ? t.grades
          : activeTab === 'attendance'
            ? t.attendance
            : t.messages
      : 'Synapse'

  const closeSubview = () => {
    gradesCtrl.setIsSimSelecting(false)
    setActiveSubview(null)
  }

  return (
    <div className="w-full min-h-[100lvh] bg-[var(--ios-bg)] relative overflow-x-clip">
      <div
        ref={rootScrollRef}
        data-ios-root-panel="true"
        data-ios-receded={isPanelOverlayActive ? 'true' : 'false'}
        onTouchStart={handleRootTouchStart}
        onTouchMove={handleRootTouchMove}
        onTouchEnd={handleRootTouchEnd}
        onTouchCancel={handleRootTouchEnd}
        className="relative w-full min-h-[100lvh] min-h-[100dvh] block bg-[var(--ios-bg)]"
        style={{
          transform: isPanelOverlayActive ? 'translate3d(-' + IOS_PARALLAX_PERCENT + '%, 0, 0)' : 'none',
          WebkitBackfaceVisibility: isPanelOverlayActive ? 'hidden' : undefined,
          backfaceVisibility: isPanelOverlayActive ? 'hidden' : undefined,
          transition: IOS_PANEL_TRANSITION,
          pointerEvents: isPanelOverlayActive ? 'none' : 'auto',
          willChange: isPanelOverlayActive ? 'transform' : 'auto',
        }}
      >
        <DashboardHeader
          profile={account.profile}
          username={account.username}
          isUpdating={timetable.isUpdating}
          isManualRefreshing={isManualRefreshing}
          isPullRefreshing={isPullRefreshing}
          lastSyncedAt={timetable.lastSyncedAt}
          onRefresh={handleManualRefresh}
          onOpenSettings={() => setShowSettings(true)}
          title={activeTabTitle}
          lang={lang}
          trailingAction={
            navMode === 'tabs' && activeTab === 'messages' && messagesCtrl.messagesSubTab !== 'notices' ? (
              <UiIconButton
                size="sm"
                variant="subtle"
                onClick={() => messagesCtrl.setIsComposeOpen(true)}
                title={t.writeNewMessage}
                aria-label={t.writeNewMessage}
                icon={<SquarePen className="w-[16px] h-[16px] text-[var(--ios-blue)]" strokeWidth={2.2} />}
              />
            ) : navMode === 'tabs' && activeTab === 'grades' && enableGradeSimulator ? (
              <GradesSimToggleButton
                active={gradesCtrl.isSimSelecting}
                onClick={gradesCtrl.toggleSimSelecting}
                lang={lang}
              />
            ) : undefined
          }
          t={t}
        />

        <main className="w-full min-h-full pt-2 pb-32 px-4 mx-auto flex flex-col box-border max-w-[480px]">
          <div
            aria-hidden={!isPullSlotVisible}
            style={{
              height: pullSlotHeight + 'px',
              marginBottom: isPullSlotVisible ? '10px' : '0px',
              opacity: isPullSlotVisible ? 1 : 0,
              pointerEvents: isPullSlotVisible ? 'auto' : 'none',
              transition: isPullDragging
                ? 'none'
                : 'height 320ms cubic-bezier(0.32, 0.72, 0, 1), margin-bottom 320ms cubic-bezier(0.32, 0.72, 0, 1), opacity 220ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
            className="flex items-center justify-center gap-2 overflow-hidden select-none shrink-0"
          >
            {isPullRefreshing ? (
              <UiSpinner size="small" className="text-[var(--ios-blue)]" />
            ) : (
              <>
                <ArrowDown
                  className={
                    'w-4 h-4 text-[var(--ios-secondary)] transition-transform duration-150 ' +
                    (pullDistance >= 54 ? 'rotate-180 text-[var(--ios-blue)]' : '')
                  }
                  strokeWidth={2.2}
                />
                <span className="text-[12px] font-medium text-[var(--ios-secondary)]">
                  {pullDistance >= 54 ? t.releaseToRefreshHint : t.pullToRefreshHint}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3.5 w-full">
            <LuckyNumberBanner
              profile={account.profile}
              lang={lang}
              visible={showLuckyNumberBanner && luckyDismissedDate !== todayIsoStr}
              closeLabel={t.closeLabel}
              onDismiss={settings.handleDismissLuckyBanner}
            />
            {navMode === 'tabs' ? (
              <div className="relative w-full overflow-x-clip">
                {visitedTabs.includes('schedule') && (
                  <div key="schedule" className={getTabContainerClass('schedule')}>
                    <ScheduleFeature
                      controller={scheduleCtrl}
                      mode="tab"
                      onCloseSubview={closeSubview}
                      onSheetChange={setHasScheduleSheet}
                      timetableData={timetable.timetableData}
                      todayTimetableData={timetable.todayTimetableData}
                      timetableError={timetable.timetableError}
                      onRetry={handleManualRefresh}
                      selectedDay={timetable.selectedDay}
                      onSelectDay={timetable.setSelectedDay}
                      currentWeekPivot={timetable.currentWeekPivot}
                      onShiftWeek={timetable.shiftWeek}
                      onSelectDate={timetable.queueWeekChange}
                      isLoadingWeek={timetable.isLoadingWeek}
                      isUpdating={timetable.isUpdating}
                      showFullSubjectNames={showFullSubjectNames}
                      showHomeworks={showHomeworks}
                      lang={lang}
                      t={t}
                    />
                  </div>
                )}
                {visitedTabs.includes('grades') && (
                  <div key="grades" className={getTabContainerClass('grades')}>
                    <GradesFeature
                      controller={gradesCtrl}
                      mode="tab"
                      onCloseSubview={closeSubview}
                      onSheetChange={setHasGradesSheet}
                      gradesData={timetable.gradesData}
                      gradesError={timetable.gradesError}
                      onRetry={handleManualRefresh}
                      showFullSubjectNames={showFullSubjectNames}
                      enableGradeSimulator={enableGradeSimulator}
                      lang={lang}
                      t={t}
                    />
                  </div>
                )}
                {visitedTabs.includes('attendance') && (
                  <div key="attendance" className={getTabContainerClass('attendance')}>
                    <AttendanceFeature
                      controller={attendanceCtrl}
                      mode="tab"
                      onCloseSubview={closeSubview}
                      onNestedOverlayChange={setHasAttendanceOverlay}
                      attendanceData={timetable.attendanceData}
                      attendanceError={timetable.attendanceError}
                      onRetry={handleManualRefresh}
                      timetableData={timetable.timetableData}
                      showFullSubjectNames={showFullSubjectNames}
                      isStudent={isStudentUser}
                      canSubmitExcuse={canSubmitExcuse}
                      lang={lang}
                      t={t}
                    />
                  </div>
                )}
                {visitedTabs.includes('messages') && (
                  <div key="messages" className={getTabContainerClass('messages')}>
                    <MessagesFeature
                      controller={messagesCtrl}
                      mode="tab"
                      onCloseSubview={closeSubview}
                      onNestedOverlayChange={setHasMessagesOverlay}
                      currentFolder={messagesInbox.currentFolder}
                      setCurrentFolder={messagesInbox.setCurrentFolder}
                      messages={messagesInbox.messages}
                      sentMessages={messagesInbox.sentMessages}
                      announcements={messagesInbox.announcements}
                      receivers={messagesInbox.receivers}
                      isLoadingMessages={messagesInbox.isLoadingMessages}
                      ensureReceivers={messagesInbox.ensureReceivers}
                      onOpenMessage={messagesInbox.handleOpenMessage}
                      onMarkMessageRead={messagesInbox.markMessageLocal}
                      onDownloadAttachment={messagesInbox.handleDownloadAttachment}
                      onSendMessage={messagesInbox.handleSendMessage}
                      lang={lang}
                      t={t}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 w-full">
                {visibleMobileIds.map((id) => (
                  <div key={id}>{renderDashboardWidget(id, widgetCtx)}</div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {navMode === 'tabs' && (
        <BottomNavBar
          activeTab={activeTab}
          onSelectTab={handleSelectPrimaryTab}
          unreadMessagesCount={unreadCount}
          badges={{
            schedule: sectionBadges.schedule,
            grades: sectionBadges.grades,
            attendance: sectionBadges.attendance,
            messages: unreadCount,
          }}
          isReceded={isPanelOverlayActive}
          t={t}
        />
      )}

      {navMode !== 'tabs' && (
        <>
          <ScheduleFeature
            controller={scheduleCtrl}
            mode={
              activeSubview === 'schedule'
                ? 'subview-schedule'
                : activeSubview === 'upcoming'
                  ? 'subview-upcoming'
                  : 'hidden'
            }
            onCloseSubview={closeSubview}
            onSheetChange={setHasScheduleSheet}
            timetableData={timetable.timetableData}
            todayTimetableData={timetable.todayTimetableData}
            timetableError={timetable.timetableError}
            onRetry={handleManualRefresh}
            selectedDay={timetable.selectedDay}
            onSelectDay={timetable.setSelectedDay}
            currentWeekPivot={timetable.currentWeekPivot}
            onShiftWeek={timetable.shiftWeek}
            onSelectDate={timetable.queueWeekChange}
            isLoadingWeek={timetable.isLoadingWeek}
            isUpdating={timetable.isUpdating}
            showFullSubjectNames={showFullSubjectNames}
            showHomeworks={showHomeworks}
            lang={lang}
            t={t}
          />
          <GradesFeature
            controller={gradesCtrl}
            mode={activeSubview === 'grades' ? 'subview' : 'hidden'}
            onCloseSubview={closeSubview}
            onSheetChange={setHasGradesSheet}
            gradesData={timetable.gradesData}
            gradesError={timetable.gradesError}
            onRetry={handleManualRefresh}
            showFullSubjectNames={showFullSubjectNames}
            enableGradeSimulator={enableGradeSimulator}
            lang={lang}
            t={t}
          />
          <AttendanceFeature
            controller={attendanceCtrl}
            mode={activeSubview === 'attendance' ? 'subview' : 'hidden'}
            onCloseSubview={closeSubview}
            onNestedOverlayChange={setHasAttendanceOverlay}
            attendanceData={timetable.attendanceData}
            attendanceError={timetable.attendanceError}
            onRetry={handleManualRefresh}
            timetableData={timetable.timetableData}
            showFullSubjectNames={showFullSubjectNames}
            isStudent={isStudentUser}
            canSubmitExcuse={canSubmitExcuse}
            lang={lang}
            t={t}
          />
          <MessagesFeature
            controller={messagesCtrl}
            mode={
              activeSubview === 'messages'
                ? 'subview-messages'
                : activeSubview === 'announcements'
                  ? 'subview-announcements'
                  : 'hidden'
            }
            onCloseSubview={closeSubview}
            onNestedOverlayChange={setHasMessagesOverlay}
            currentFolder={messagesInbox.currentFolder}
            setCurrentFolder={messagesInbox.setCurrentFolder}
            messages={messagesInbox.messages}
            sentMessages={messagesInbox.sentMessages}
            announcements={messagesInbox.announcements}
            receivers={messagesInbox.receivers}
            isLoadingMessages={messagesInbox.isLoadingMessages}
            ensureReceivers={messagesInbox.ensureReceivers}
            onOpenMessage={messagesInbox.handleOpenMessage}
            onMarkMessageRead={messagesInbox.markMessageLocal}
            onDownloadAttachment={messagesInbox.handleDownloadAttachment}
            onSendMessage={messagesInbox.handleSendMessage}
            lang={lang}
            t={t}
          />
        </>
      )}

      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        profile={account.profile}
        savedAccounts={account.savedAccounts}
        onSwitchAccount={(acc) => {
          account.handleSwitchAccount(acc)
          setActiveSubview(null)
        }}
        onAddAccount={account.handleStartAddAccountVerification}
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
        currentLang={lang}
        onSelectLang={settings.handleSelectLanguage}
        currentTheme={theme}
        onSelectTheme={settings.handleSelectTheme}
        navMode={navMode}
        onSelectNavMode={settings.handleSelectNavMode}
        showFullSubjectNames={showFullSubjectNames}
        onToggleShowFullSubjectNames={settings.handleToggleShowFullSubjectNames}
        showMobileTodayAttendance={showMobileTodayAttendance}
        onToggleMobileTodayAttendance={settings.handleToggleMobileTodayAttendance}
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
        isStudent={isStudentUser}
        allowStudentJustifications={allowStudentJustifications}
        onToggleAllowStudentJustifications={settings.handleToggleAllowStudentJustifications}
        onLogout={() => {
          setShowSettings(false)
          setActiveSubview(null)
          account.handleLogout()
        }}
        t={t}
      />
    </div>
  )
}
