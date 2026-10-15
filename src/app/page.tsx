'use client'

import { useState, useEffect, useCallback } from 'react'
import { LessonItem } from '@/models/timetable.model'
import { getDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
import { CURRENT_APP_VERSION } from '@/config/version.config'

import { useAccountSession } from '@/utils/account.hook'
import { useTimetableSync } from '@/utils/timetable-sync.hook'
import { useBodyScrollLock } from '@/utils/scroll-lock.util'

import { AuthView } from './widgets/auth-view'
import { ScheduleWidget } from './widgets/schedule-widget'
import { LessonDetailModal } from './widgets/lesson-detail-modal'
import { SettingsSheet } from './widgets/settings-sheet'
import { WhatsNewModal } from '@/app/widgets/whats-new-modal'
import { MiniScheduleWidget } from '@/components/dashboard/mini-schedule-widget'
import { WidgetCustomizerSheet, DashboardWidgetId, DEFAULT_WIDGET_CONFIGS } from '@/components/dashboard/widget-customizer-sheet'
import { IosScreen } from '@/components/ios/ios-screen'

export type TextClampOption = 'full' | '1' | '2'

function IosSpinner({ className = 'w-3.5 h-3.5 text-[var(--ios-blue)]' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="1" />
      <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.875" />
      <line x1="22" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
      <line x1="19.07" y1="19.07" x2="16.24" y2="16.24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.625" />
      <line x1="12" y1="22" x2="12" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.375" />
      <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.125" />
    </svg>
  )
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [lang, setLang] = useState<AppLanguage>('pl')
  const [theme, setTheme] = useState<AppTheme>('system')
  const [textClamp, setTextClamp] = useState<TextClampOption>('full')
  const [ignoreGradeModifiers, setIgnoreGradeModifiers] = useState<boolean>(false)
  const [showWhatsNew, setShowWhatsNew] = useState(false)

  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showCustomizer, setShowCustomizer] = useState(false)

  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('synapse_dashboard_widgets')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        } catch { }
      }
    }
    return DEFAULT_WIDGET_CONFIGS.map((w) => w.id)
  })

  const [activeWidgets, setActiveWidgets] = useState<Record<DashboardWidgetId, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('synapse_dashboard_active_widgets')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === 'object') return parsed
        } catch { }
      }
    }
    return {
      mini_schedule: true,
      next_lesson: false,
      attendance: false,
      gpa: false,
      messages: false,
      lucky_number: false,
      changes: false
    }
  })

  const t = getDictionary(lang)

  const applyTheme = useCallback((targetTheme: AppTheme) => {
    const root = document.documentElement
    if (targetTheme === 'dark') {
      root.classList.add('dark')
    } else if (targetTheme === 'light') {
      root.classList.remove('dark')
    } else {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [])

  const account = useAccountSession({ lang, t })

  const timetable = useTimetableSync({
    username: account.username,
    password: account.password,
    lang,
    isConfigured: account.isConfigured
  })

  const isAnyOverlayActive =
    showSettings ||
    showCustomizer ||
    showWhatsNew ||
    showFullSchedule ||
    Boolean(selectedLesson)

  useBodyScrollLock(isAnyOverlayActive)

  useEffect(() => {
    setMounted(true)
    const savedLang = (localStorage.getItem('synapse_lang') as AppLanguage) || 'pl'
    const savedTheme = (localStorage.getItem('synapse_theme') as AppTheme) || 'system'
    const savedClamp = (localStorage.getItem('synapse_text_clamp') as TextClampOption) || 'full'
    const savedIgnore = localStorage.getItem('synapse_ignore_modifiers') === 'true'
    const lastSeenVersion = localStorage.getItem('synapse_seen_version')

    setLang(savedLang)
    setTheme(savedTheme)
    setTextClamp(savedClamp)
    setIgnoreGradeModifiers(savedIgnore)
    applyTheme(savedTheme)

    if (lastSeenVersion !== CURRENT_APP_VERSION) {
      setShowWhatsNew(true)
    }
  }, [applyTheme])

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      if (e.matches) root.classList.add('dark')
      else root.classList.remove('dark')
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

  const handleToggleIgnoreGradeModifiers = (val: boolean) => {
    setIgnoreGradeModifiers(val)
    localStorage.setItem('synapse_ignore_modifiers', String(val))
  }

  const handleDismissWhatsNew = () => {
    localStorage.setItem('synapse_seen_version', CURRENT_APP_VERSION)
    setShowWhatsNew(false)
  }

  const handleSaveWidgetConfig = (newOrder: DashboardWidgetId[], newActive: Record<DashboardWidgetId, boolean>) => {
    setWidgetOrder(newOrder)
    setActiveWidgets(newActive)
    if (typeof window !== 'undefined') {
      localStorage.setItem('synapse_dashboard_widgets', JSON.stringify(newOrder))
      localStorage.setItem('synapse_dashboard_active_widgets', JSON.stringify(newActive))
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
    <div className="w-full min-h-screen bg-[var(--ios-bg)] overflow-hidden relative">
      <div
        style={{
          transform: showFullSchedule ? 'translate3d(-20%, 0, 0)' : 'translate3d(0, 0, 0)',
          opacity: showFullSchedule ? 0.7 : 1,
          transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
        }}
        className="w-full min-h-screen flex flex-col will-change-transform"
      >
        <header className="ios-header">
          <div className="max-w-md mx-auto w-full flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--ios-label)]">Synapse</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                {timetable.isUpdating && <IosSpinner className="w-3 h-3 text-[var(--ios-blue)]" />}
                <p className="text-[11px] font-normal text-[var(--ios-secondary)] tracking-tight">
                  {timetable.isUpdating ? t.updatingStatus : t.syncedStatus}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCustomizer(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:scale-90 transition-transform"
                aria-label="Customize"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:scale-90 transition-transform"
                aria-label="Settings"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="w-full flex-1 pt-4 pb-12 px-4 max-w-md mx-auto flex flex-col gap-4 box-border overflow-x-hidden">
          {timetable.hasNewUpdate && (
            <div
              onClick={timetable.applyPendingUpdates}
              className="bg-[var(--ios-blue)] text-white p-3.5 rounded-[16px] flex items-center justify-between cursor-pointer active:opacity-90 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">✨</span>
                <p className="text-xs font-semibold tracking-tight">{t.newChanges}</p>
              </div>
              <span className="text-xs font-semibold underline bg-white/20 px-2.5 py-1 rounded-[8px]">
                {t.updateNow}
              </span>
            </div>
          )}

          {activeWidgets.mini_schedule && (
            <MiniScheduleWidget
              timetableData={activeTodayData}
              isLoading={timetable.isLoadingWeek && !activeTodayData}
              textClamp={textClamp}
              onOpenFullSchedule={() => setShowFullSchedule(true)}
            />
          )}
        </main>
      </div>

      <IosScreen
        isOpen={showFullSchedule}
        onClose={() => setShowFullSchedule(false)}
        title={t.schedule}
        backLabel={t.backAction}
        isSubView={true}
      >
        {timetable.timetableData && (
          <ScheduleWidget
            timetableData={timetable.timetableData}
            selectedDay={timetable.selectedDay}
            onSelectDay={(day) => timetable.setSelectedDay(day)}
            onSelectLesson={setSelectedLesson}
            currentWeekPivot={timetable.currentWeekPivot}
            onShiftWeek={timetable.shiftWeek}
            onSelectDate={timetable.queueWeekChange}
            isLoadingWeek={timetable.isLoadingWeek}
            textClamp={textClamp}
            lang={lang}
            t={t}
          />
        )}
      </IosScreen>

      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          isToday={Boolean(currentDaySchedule?.isToday)}
          t={t}
        />
      )}

      <WidgetCustomizerSheet
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        currentOrder={widgetOrder}
        activeMap={activeWidgets}
        onSave={handleSaveWidgetConfig}
      />

      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        profile={account.profile}
        savedAccounts={account.savedAccounts}
        onSwitchAccount={account.handleSwitchAccount}
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
        ignoreGradeModifiers={ignoreGradeModifiers}
        onToggleIgnoreGradeModifiers={handleToggleIgnoreGradeModifiers}
        onLogout={account.handleLogout}
        t={t}
      />

      <WhatsNewModal
        isOpen={showWhatsNew}
        onClose={handleDismissWhatsNew}
        lang={lang}
        t={t}
      />
    </div>
  )
}