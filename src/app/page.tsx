'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createJustificationAction, getLiveJustificationsAction } from './actions'
import { LiveJustificationItem } from '@/models/justification.model'
import { LessonItem } from '@/models/timetable.model'
import { SubjectAttendance } from '@/models/attendance.model'
import { getDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'

import { useAccountSession } from '@/hooks/account.hook'
import { useTimetableSync } from '@/hooks/timetable-sync.hook'
import { useBodyScrollLock } from '@/hooks/scroll-lock.hook'
import { useMessagesInbox } from '@/hooks/messages.hook'
import { normalizeToMondayIso } from '@/utils/date.util'

import { AuthView } from '@/components/auth/auth-view'
import { ScheduleWidget } from '@/components/schedule/schedule-widget'
import { LessonDetailModal } from '@/components/schedule/lesson-detail-modal'
import { EventDetailModal } from '@/components/schedule/event-detail-modal'
import { AttendanceWidget } from '@/components/attendance/attendance-widget'
import { AttendanceDetailModal } from '@/components/attendance/attendance-detail-modal'
import { QuickNbScreen } from '@/components/attendance/quick-nb-screen'
import { LegacyAttendanceScreen } from '@/components/attendance/legacy-attendance-screen'
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
import { IosScreen, IOS_PARALLAX_PERCENT, IOS_PANEL_TRANSITION } from '@/components/ios/ios-screen'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { IosCard, IosSegmentedControl } from '@/components/ios/ios-ui'

export type TextClampOption = 'full' | '1' | '2'

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
  const [lang, setLang] = useState<AppLanguage>('pl')
  const [theme, setTheme] = useState<AppTheme>('system')
  const [textClamp, setTextClamp] = useState<TextClampOption>('full')
  const [showFullSubjectNames, setShowFullSubjectNames] = useState<boolean>(false)
  const [ignoreGradeModifiers, setIgnoreGradeModifiers] = useState<boolean>(false)

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
  const [showLegacyAttendance, setShowLegacyAttendance] = useState(false)
  const [showFullGrades, setShowFullGrades] = useState(false)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  const [isMessagesSubViewOpen, setIsMessagesSubViewOpen] = useState(false)
  const [showLiveJustifications, setShowLiveJustifications] = useState(false)
  const [liveJustifications, setLiveJustifications] = useState<LiveJustificationItem[]>([])
  const [isLoadingLiveJust, setIsLoadingLiveJust] = useState(false)
  const [liveJustFilter, setLiveJustFilter] = useState<'0' | '1' | '2' | '3'>('0')

  const handleOpenLiveJustifications = async (status: '0' | '1' | '2' | '3' = '0') => {
    setLiveJustFilter(status)
    setShowLiveJustifications(true)
    setIsLoadingLiveJust(true)
    try {
      const parentAcc = account.savedAccounts.find(
        (a) => a.role === 'parent' || (Boolean(a.username) && !a.username.trim().toLowerCase().endsWith('u'))
      )
      const targetUser = parentAcc ? parentAcc.username : account.username
      const targetPass = parentAcc ? parentAcc.password : account.password
      const res = await getLiveJustificationsAction(targetUser, targetPass, status)
      if (res.success) {
        setLiveJustifications(res.data)
      }
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

    setLang(savedLang)
    setTheme(savedTheme)
    setTextClamp(savedClamp)
    setShowFullSubjectNames(savedFull)
    setIgnoreGradeModifiers(savedIgnore)
    applyTheme(savedTheme)
  }, [applyTheme])

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      root.classList.remove('dark', 'light')
      if (e.matches) root.classList.add('dark')
      else root.classList.add('light')
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

  const hasParentAccess = Boolean(
    account.activeAccount?.role === 'parent' ||
    account.profile?.role === 'parent' ||
    (account.username && !account.username.trim().toLowerCase().endsWith('u')) ||
    account.savedAccounts.some(
      (a) => a.role === 'parent' || (Boolean(a.username) && !a.username.trim().toLowerCase().endsWith('u'))
    )
  )

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
          transform: isAnyOverlayActive ? `translate3d(-${IOS_PARALLAX_PERCENT}%, 0, 0)` : 'translate3d(0, 0, 0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          transition: IOS_PANEL_TRANSITION,
          pointerEvents: isAnyOverlayActive ? 'none' : 'auto',
          willChange: 'transform'
        }}
      >
        <header className="ios-header">
          <div className="relative flex items-center justify-between w-full max-w-[402px] mx-auto h-[44px]">
            <div className="z-10 flex items-center min-w-[70px]">
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

            <h2 className="absolute inset-0 flex items-center justify-center text-[17px] font-semibold tracking-[-0.4px] text-[var(--ios-label)] pointer-events-none px-20 truncate text-center">
              Synapse
            </h2>

            <div className="z-10 min-w-[70px] flex items-center justify-end">
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

        <main className="w-full flex-1 pt-6 pb-32 px-4 max-w-[402px] mx-auto flex flex-col gap-3.5 box-border">
          {timetable.hasNewUpdate && (
            <div
              onClick={timetable.applyPendingUpdates}
              className="bg-[var(--ios-blue)] text-white p-3 rounded-[16px] flex items-center justify-between cursor-pointer active:scale-[0.985] active:opacity-90 transition-all shadow-xs"
            >
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <p className="text-[13px] font-semibold tracking-tight">{t.newChanges}</p>
              </div>
              <span className="text-[12px] font-semibold underline bg-white/20 px-2 py-0.5 rounded-full">
                {t.updateNow}
              </span>
            </div>
          )}

          <div className="w-full flex flex-col gap-3.5">
            <MiniGradesWidget
              gradesData={isManualRefreshing ? null : timetable.gradesData}
              isLoading={isManualRefreshing || (!timetable.gradesData && timetable.isUpdating && !timetable.gradesError)}
              error={timetable.gradesError}
              onRetry={handleManualRefresh}
              t={t}
              onOpenGrades={() => setShowFullGrades(true)}
            />

            <MiniScheduleWidget
              timetableData={isManualRefreshing ? null : activeTodayData}
              isLoading={isManualRefreshing || (timetable.isLoadingWeek && !activeTodayData && !timetable.timetableError)}
              error={timetable.timetableError}
              onRetry={handleManualRefresh}
              textClamp={textClamp}
              showFullSubjectNames={showFullSubjectNames}
              lang={lang}
              t={t}
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

            <MiniMessagesWidget
              unreadCount={messagesInbox.messages.filter((m) => !m.isRead).length}
              announcementsCount={messagesInbox.announcements.length}
              isLoading={isManualRefreshing || (messagesInbox.isLoadingMessages && messagesInbox.messages.length === 0 && messagesInbox.announcements.length === 0 && !messagesInbox.messagesError)}
              error={messagesInbox.messagesError}
              onRetry={messagesInbox.reloadMessages}
              lang={lang}
              t={t}
              onOpenMessages={() => setShowMessagesScreen(true)}
              onOpenAnnouncements={() => setShowAnnouncementsScreen(true)}
            />

            <MiniAttendanceWidget
              attendanceData={isManualRefreshing ? null : timetable.attendanceData}
              isLoading={isManualRefreshing || (!timetable.attendanceData && timetable.isUpdating && !timetable.attendanceError)}
              error={timetable.attendanceError}
              onRetry={handleManualRefresh}
              lang={lang}
              t={t}
              onOpenAttendance={() => setShowFullAttendance(true)}
            />
          </div>
        </main>
      </div>

      <IosScreen
        isOpen={showFullGrades}
        onClose={() => setShowFullGrades(false)}
        title={t.grades}
        backLabel={t.backAction}
        isSubView={true}
        isReceded={false}
      >
        {timetable.gradesData ? (
          <GradesWidget
            gradesData={timetable.gradesData}
            showFullSubjectNames={showFullSubjectNames}
            ignoreGradeModifiers={ignoreGradeModifiers}
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
        isReceded={false}
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
        onClose={() => setShowFullAttendance(false)}
        title={t.attendance}
        backLabel={t.backAction}
        isSubView={true}
        trailing={
          <button
            type="button"
            onClick={() => setShowLegacyAttendance(true)}
            className="text-[var(--ios-blue)] text-[17px] font-normal active:opacity-60 select-none py-1 pl-2 cursor-pointer"
          >
            Legacy
          </button>
        }
        isReceded={Boolean(selectedSubjectDetail || showQuickNb || showManualExcuse || showLegacyAttendance || showLiveJustifications)}
      >
        {timetable.attendanceData && (
          <AttendanceWidget
            attendanceData={timetable.attendanceData}
            lang={lang}
            showFullSubjectNames={showFullSubjectNames}
            onSelectSubject={handleOpenSubjectDetail}
            isStudent={!hasParentAccess}
            onOpenManualExcuse={() => setShowManualExcuse(true)}
            onOpenQuickNb={() => setShowQuickNb(true)}
            onOpenLiveJustifications={() => handleOpenLiveJustifications('0')}
            t={t}
          />
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
          canSubmitExcuse={hasParentAccess}
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
          canSubmitExcuse={hasParentAccess}
          showFullSubjectNames={showFullSubjectNames}
          onSubmitJustification={handleSubmitJustifications}
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
        }}
        title={t.messagesInbox}
        backLabel={t.backAction}
        isSubView={true}
        isReceded={isMessagesSubViewOpen || showComposeInHeader}
        trailing={
          <button
            type="button"
            onClick={() => setShowComposeInHeader(true)}
            className="text-[var(--ios-blue)] text-[17px] font-normal active:opacity-60 select-none py-1 pl-2 cursor-pointer"
          >
            {t.writeNewMessage || 'Napisz'}
          </button>
        }
      >
        <MessagesWidget
          mode="messages"
          messages={messagesInbox.messages}
          announcements={messagesInbox.announcements}
          receivers={messagesInbox.receivers}
          isComposeOpen={showComposeInHeader}
          onCloseCompose={() => setShowComposeInHeader(false)}
          onOpenMessage={messagesInbox.handleOpenMessage}
          onSendMessage={messagesInbox.handleSendMessage}
          isLoading={messagesInbox.isLoadingMessages}
          lang={lang}
          t={t}
          onSubViewChange={setIsMessagesSubViewOpen}
        />
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
          onSendMessage={messagesInbox.handleSendMessage}
          isLoading={messagesInbox.isLoadingMessages}
          lang={lang}
          t={t}
          onSubViewChange={setIsMessagesSubViewOpen}
        />
      </IosScreen>

      <IosScreen
        isOpen={showLiveJustifications}
        onClose={() => setShowLiveJustifications(false)}
        title={lang === 'en' ? 'Justification statuses' : 'Statusy usprawiedliwień'}
        backLabel={t.backAction}
        isSubView={true}
        className="z-[75]"
        trailing={
          <button
            type="button"
            onClick={() => handleOpenLiveJustifications(liveJustFilter)}
            className="text-[var(--ios-blue)] text-[17px] font-normal active:opacity-60 cursor-pointer"
          >
            {t.refresh}
          </button>
        }
      >
        <div className="flex flex-col gap-3.5 pb-16 select-none max-w-[402px] mx-auto w-full">
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
                        {item.count} {item.count === 1 ? 'nieobecność' : 'nieobecności'} • Wysłano: {item.sentAt}
                      </span>
                    </div>

                    <span className={"text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 " + (
                      item.statusCode === 'accepted'
                        ? "bg-[var(--ios-green-subtle)] text-[var(--ios-green)] border-[var(--ios-green)]/30"
                        : item.statusCode === 'rejected'
                        ? "bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border-[var(--ios-red)]/30"
                        : "bg-[var(--ios-yellow)]/15 text-[var(--ios-yellow)] dark:text-[#ffd60a] border-[var(--ios-yellow)]/30"
                    )}>
                      {item.statusCode === 'accepted' ? 'Przyjęte' : item.statusCode === 'rejected' ? 'Odrzucone' : 'Oczekuje'}
                    </span>
                  </div>

                  {item.comment && (
                    <div className="bg-[var(--ios-element)]/30 p-3 rounded-[14px] text-[13px] text-[var(--ios-label)]">
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
        onLogout={account.handleLogout}
        t={t}
      />
    </div>
  )
}
