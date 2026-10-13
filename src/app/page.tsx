'use client'

import { useState, useEffect, useCallback } from 'react'
import { createJustificationAction } from './actions'
import { DaySchedule, LessonItem } from '@/models/timetable.model'
import { GradeItem, SubjectGrades } from '@/models/grade.model'
import { SubjectAttendance } from '@/models/attendance.model'
import { getDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
import { CURRENT_APP_VERSION } from '@/config/version.config'

import { useAccountSession } from '@/utils/account.hook'
import { useTimetableSync } from '@/utils/timetable-sync.hook'
import { useMessagesInbox, MainSection } from '@/utils/messages.hook'
import { useBodyScrollLock } from '@/utils/scroll-lock.util'

import { AuthView } from './widgets/auth-view'
import { ScheduleWidget } from './widgets/schedule-widget'
import { GradesWidget } from './widgets/grades-widget'
import { AttendanceWidget } from './widgets/attendance-widget'
import { MessagesWidget } from './widgets/messages-widget'
import { AttendanceDetailModal } from './widgets/attendance-detail-modal'
import { JustificationModal } from './widgets/justification-modal'
import { GradeModal } from './widgets/grade-modal'
import { LessonDetailModal } from './widgets/lesson-detail-modal'
import { SettingsSheet } from './widgets/settings-sheet'
import { TerminarzModal } from './widgets/terminarz-modal'
import { WhatsNewModal } from '@/app/widgets/whats-new-modal'
import { HomeDashboard } from '@/components/dashboard/home-dashboard'

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
  const [activeSection, setActiveSection] = useState<MainSection>('schedule')
  const [showWhatsNew, setShowWhatsNew] = useState(false)

  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<GradeItem | null>(null)
  const [selectedWarningSubject, setSelectedWarningSubject] = useState<SubjectGrades | null>(null)
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectAttendance | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showExcuseMatrix, setShowExcuseMatrix] = useState(false)
  const [showTerminarz, setShowTerminarz] = useState(false)

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

  const messagesInbox = useMessagesInbox({
    username: account.username,
    password: account.password,
    activeSection
  })

  const isAnyOverlayActive =
    showSettings ||
    showExcuseMatrix ||
    showTerminarz ||
    showWhatsNew ||
    Boolean(selectedLesson) ||
    Boolean(selectedSubjectDetail) ||
    Boolean(selectedGrade) ||
    Boolean(selectedWarningSubject)

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

  const handleSelectDay = (dayName: string) => {
    timetable.setSelectedDay(dayName)
  }

  const handleTabChange = (targetTab: MainSection) => {
    setActiveSection(targetTab)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  const canSubmitExcuse = Boolean(
    account.profile?.role === 'parent' ||
    account.savedAccounts.some((a) => a.role === 'parent')
  )

  const handleSubmitJustifications = async (payload: {
    dateIso: string
    lessons: number[]
    message: string
  }): Promise<boolean> => {
    try {
      const parentAcc = account.savedAccounts.find((a) => a.role === 'parent')
      const targetUser = parentAcc ? parentAcc.username : account.username
      const targetPass = parentAcc ? parentAcc.password : account.password

      const res = await createJustificationAction(targetUser, targetPass, {
        dateFrom: payload.dateIso,
        dateTo: payload.dateIso,
        lessons: payload.lessons,
        messageFromParent: payload.message,
        sendNotify: false
      })

      if (res.success) {
        timetable.executeSync(account.username, account.password, lang, timetable.currentWeekPivot, true)
        return true
      }
      return false
    } catch {
      return false
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
  const unreadMessagesCount = messagesInbox.messages.filter((m) => !m.isRead).length

  return (
    <div className="w-full min-h-screen bg-[var(--ios-bg)] flex flex-col">
      <header className="sticky top-0 z-30 w-full pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] px-4 bg-[var(--ios-bg)]/90 backdrop-blur-xl border-b border-[var(--ios-separator)] transition-all">
        <div className="max-w-md mx-auto flex items-center justify-between pb-2.5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--ios-label)]">Synapse</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {timetable.isUpdating && <IosSpinner className="w-3 h-3 text-[var(--ios-blue)]" />}
              <p className="text-[11px] font-normal text-[var(--ios-secondary)] tracking-tight">
                {timetable.isUpdating ? t.updatingStatus : t.syncedStatus}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:scale-95 transition-transform"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="w-full flex-1 pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] pt-3 px-4 max-w-md mx-auto flex flex-col gap-3 box-border overflow-x-hidden">
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

        <HomeDashboard
          profile={account.profile}
          timetableData={timetable.timetableData}
          gradesData={timetable.gradesData}
          attendanceData={timetable.attendanceData}
          unreadMessagesCount={unreadMessagesCount}
          onNavigateTab={handleTabChange}
        />

        <div className="w-full flex-1 flex flex-col gap-3">
          <div className={activeSection === 'schedule' ? 'w-full flex flex-col gap-3' : 'hidden'}>
            {timetable.timetableData && (
              <ScheduleWidget
                timetableData={timetable.timetableData}
                selectedDay={timetable.selectedDay}
                onSelectDay={handleSelectDay}
                onSelectLesson={setSelectedLesson}
                currentWeekPivot={timetable.currentWeekPivot}
                onShiftWeek={timetable.shiftWeek}
                isLoadingWeek={timetable.isLoadingWeek}
                textClamp={textClamp}
                lang={lang}
                t={t}
              />
            )}
          </div>

          <div className={activeSection === 'grades' ? 'w-full flex flex-col gap-3' : 'hidden'}>
            {timetable.gradesData && (
              <GradesWidget
                gradesData={timetable.gradesData}
                ignoreGradeModifiers={ignoreGradeModifiers}
                onSelectGrade={setSelectedGrade}
                onSelectWarning={setSelectedWarningSubject}
                t={t}
              />
            )}
          </div>

          <div className={activeSection === 'attendance' ? 'w-full flex flex-col gap-3' : 'hidden'}>
            {timetable.attendanceData && (
              <AttendanceWidget
                attendanceData={timetable.attendanceData}
                onSelectSubject={setSelectedSubjectDetail}
                onOpenExcuseModal={() => setShowExcuseMatrix(true)}
                t={t}
              />
            )}
          </div>

          <div className={activeSection === 'messages' ? 'w-full flex flex-col gap-3' : 'hidden'}>
            <MessagesWidget
              messages={messagesInbox.messages}
              announcements={messagesInbox.announcements}
              receivers={messagesInbox.receivers}
              onOpenMessage={messagesInbox.handleOpenMessage}
              onSendMessage={messagesInbox.handleSendMessage}
              isLoading={messagesInbox.isLoadingMessages}
              t={t}
            />
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--ios-separator)] bg-[var(--ios-card)]/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-md mx-auto grid grid-cols-4 h-12">
          {[
            {
              id: 'schedule' as MainSection,
              label: t.schedule,
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              )
            },
            {
              id: 'grades' as MainSection,
              label: t.grades,
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
                  <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor" stroke="none">5</text>
                </svg>
              )
            },
            {
              id: 'attendance' as MainSection,
              label: t.attendance,
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              )
            },
            {
              id: 'messages' as MainSection,
              label: t.messages,
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              )
            }
          ].map((tab) => {
            const isActive = activeSection === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center justify-center transition-colors ${isActive ? 'text-[var(--ios-blue)]' : 'text-[var(--ios-secondary)]'
                  }`}
              >
                {tab.icon}
                <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-semibold' : 'font-normal'}`}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          isToday={Boolean(currentDaySchedule?.isToday)}
          t={t}
        />
      )}

      {selectedSubjectDetail && (
        <AttendanceDetailModal
          subjectDetail={selectedSubjectDetail}
          onClose={() => setSelectedSubjectDetail(null)}
          onSelectAbsenceForExcuse={() => setShowExcuseMatrix(true)}
          t={t}
        />
      )}

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

      <GradeModal
        selectedGrade={selectedGrade}
        selectedWarningSubject={selectedWarningSubject}
        onCloseGrade={() => setSelectedGrade(null)}
        onCloseWarning={() => setSelectedWarningSubject(null)}
        t={t}
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

      {timetable.timetableData && (
        <TerminarzModal
          isOpen={showTerminarz}
          onClose={() => setShowTerminarz(false)}
          timetableData={timetable.timetableData}
          t={t}
        />
      )}

      <WhatsNewModal
        isOpen={showWhatsNew}
        onClose={handleDismissWhatsNew}
        lang={lang}
        t={t}
      />
    </div>
  )
}