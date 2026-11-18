'use client'

import React, { useState, useMemo } from 'react'
import { Archive, Calendar, ChevronLeft, ChevronRight, PanelLeft, RefreshCw, Settings, SquarePen } from 'lucide-react'
import { SavedAccount, StudentProfile } from '@/models/account.model'
import { SmartTimetableResult, LessonItem, TimetableEvent } from '@/models/timetable.model'
import { GradesResult, GradeItem } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'
import {
  AnnouncementItem,
  MessageAttachment,
  MessageItem,
  ReceiverItem
} from '@/models/message.model'
import { AppDictionary, AppLanguage, AppTheme, pickText } from '@/config/dictionary.config'
import { ScheduleFeatureController } from '@/features/schedule/schedule-feature'
import { GradesFeatureController } from '@/features/grades/grades-feature'
import { AttendanceFeatureController } from '@/features/attendance/attendance-feature'
import { MessagesFeatureController } from '@/features/messages/messages-feature'
import { computeLiveWeekDays, getTodayIsoString } from '@/utils/date.util'
import { cn } from '@/utils/cn.util'
import {
  MacSearchField,
  MacSegmentedControl,
  MacToolbarButton,
  MacToolbarCapsuleGroup
} from './mac-primitives'
import { DesktopNavSection, DesktopSidebar } from './desktop-sidebar'
import { DesktopOverview } from './desktop-overview'
import { DesktopTimetableView } from './desktop-timetable-view'
import { DesktopDeadlinesView } from './desktop-deadlines-view'
import { DesktopGradesView } from './desktop-grades-view'
import { DesktopAttendanceSubTab, DesktopAttendanceView } from './desktop-attendance-view'
import { DesktopMessagesView } from './desktop-messages-view'
import { DesktopSettingsModal, DesktopSettingsPane } from './desktop-settings-modal'

interface DesktopWorkspaceProps {
  activeSection: DesktopNavSection
  onSelectSection: (section: DesktopNavSection) => void
  profile: StudentProfile | null
  username: string
  savedAccounts: SavedAccount[]
  onSwitchAccount: (account: SavedAccount) => void
  onAddAccount: (e: React.FormEvent) => void
  onConfirmAddAccount: () => boolean
  onResetAddAccount: () => void
  addAccountStep: 'input' | 'verifying' | 'preview'
  setAddAccountStep: (s: 'input' | 'verifying' | 'preview') => void
  addAccountCandidate: StudentProfile | null
  addAccountError: string | null
  setAddAccountError: (err: string | null) => void
  newUsername: string
  setNewUsername: (u: string) => void
  newPassword: string
  setNewPassword: (p: string) => void
  onLogout: () => void
  lang: AppLanguage
  onSelectLang: (lang: AppLanguage) => void
  theme: AppTheme
  onSelectTheme: (theme: AppTheme) => void
  showFullSubjectNames: boolean
  onToggleShowFullSubjectNames: (val: boolean) => void
  enableGradeSimulator: boolean
  onToggleEnableGradeSimulator: (val: boolean) => void
  showHomeworks: boolean
  onToggleShowHomeworks: (val: boolean) => void
  showLuckyNumberBanner: boolean
  onToggleShowLuckyNumberBanner: (val: boolean) => void
  isStudent: boolean
  canSubmitExcuse: boolean
  allowStudentJustifications: boolean
  onToggleAllowStudentJustifications: (val: boolean) => void
  timetableData: SmartTimetableResult | null
  todayTimetableData: SmartTimetableResult | null
  gradesData: GradesResult | null
  attendanceData: AttendanceResult | null
  timetableError: string | null
  gradesError: string | null
  attendanceError: string | null
  isUpdating: boolean
  isLoadingWeek: boolean
  lastSyncedAt: number | null
  selectedDay: string
  onSelectDay: (day: string) => void
  currentWeekPivot: string
  onShiftWeek: (deltaDays: number) => void
  onSelectDate: (dateIso: string) => void
  onRefresh: () => void
  messages: MessageItem[]
  sentMessages: MessageItem[]
  announcements: AnnouncementItem[]
  receivers: ReceiverItem[]
  isLoadingMessages: boolean
  ensureReceivers: () => Promise<ReceiverItem[]>
  onOpenMessage: (
    id: number | string,
    folder?: 'inbox' | 'sent'
  ) => Promise<{ content: string; attachments: MessageAttachment[] }>
  onMarkMessageRead: (
    msgId: number | string,
    folder: 'inbox' | 'sent',
    content?: string,
    attachments?: MessageAttachment[]
  ) => void
  onDownloadAttachment: (att: MessageAttachment) => Promise<boolean>
  onSendMessage: (receiverId: number | number[], title: string, body: string) => Promise<boolean>
  badges: {
    schedule: number
    grades: number
    attendance: number
  }
  scheduleCtrl: ScheduleFeatureController
  gradesCtrl: GradesFeatureController
  attendanceCtrl: AttendanceFeatureController
  messagesCtrl: MessagesFeatureController
  t: AppDictionary
}

export function DesktopWorkspace(props: DesktopWorkspaceProps) {
  const {
    activeSection,
    onSelectSection,
    profile,
    username,
    savedAccounts,
    onSwitchAccount,
    onAddAccount,
    onConfirmAddAccount,
    onResetAddAccount,
    addAccountStep,
    setAddAccountStep,
    addAccountCandidate,
    addAccountError,
    setAddAccountError,
    newUsername,
    setNewUsername,
    newPassword,
    setNewPassword,
    onLogout,
    lang,
    onSelectLang,
    theme,
    onSelectTheme,
    showFullSubjectNames,
    onToggleShowFullSubjectNames,
    enableGradeSimulator,
    onToggleEnableGradeSimulator,
    showHomeworks,
    onToggleShowHomeworks,
    showLuckyNumberBanner,
    onToggleShowLuckyNumberBanner,
    isStudent,
    canSubmitExcuse,
    allowStudentJustifications,
    onToggleAllowStudentJustifications,
    timetableData,
    todayTimetableData,
    gradesData,
    attendanceData,
    timetableError,
    gradesError,
    attendanceError,
    isUpdating,
    isLoadingWeek,
    lastSyncedAt,
    selectedDay,
    onSelectDay,
    currentWeekPivot,
    onShiftWeek,
    onSelectDate,
    onRefresh,
    messages,
    sentMessages,
    announcements,
    receivers,
    isLoadingMessages,
    ensureReceivers,
    onOpenMessage,
    onMarkMessageRead,
    onDownloadAttachment,
    onSendMessage,
    badges,
    attendanceCtrl,
    messagesCtrl,
    t
  } = props

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPane, setSettingsPane] = useState<DesktopSettingsPane>('account')
  const [settingsAddAccount, setSettingsAddAccount] = useState(false)

  // View controls lifted into macOS 27 52px Unified Toolbar
  const [timetableViewMode, setTimetableViewMode] = useState<'week' | 'day'>('week')
  const [deadlinesViewMode, setDeadlinesViewMode] = useState<'list' | 'calendar'>('list')
  const [deadlinesSearchQuery, setDeadlinesSearchQuery] = useState('')
  const [deadlinesShowArchived, setDeadlinesShowArchived] = useState(false)
  const [attendanceSubTab, setAttendanceSubTab] = useState<DesktopAttendanceSubTab>('summary')

  const liveWeekMeta = useMemo(() => computeLiveWeekDays(currentWeekPivot), [currentWeekPivot])
  const allowExcuse = canSubmitExcuse !== undefined ? canSubmitExcuse : !isStudent

  // Deep-jump handoffs from Overview
  const [timetableSelection, setTimetableSelection] = useState<{
    lesson?: LessonItem
    isToday?: boolean
    event?: TimetableEvent
  } | null>(null)
  const [deadlineSelection, setDeadlineSelection] = useState<TimetableEvent | null>(null)
  const [gradeSelection, setGradeSelection] = useState<{ grade: GradeItem; subject: string } | null>(null)
  const [mailSelection, setMailSelection] = useState<MessageItem | null>(null)
  const [noticeSelection, setNoticeSelection] = useState<AnnouncementItem | null>(null)

  const unreadCount = useMemo(() => messages.filter((m) => !m.isRead).length, [messages])

  const formattedSyncTime = useMemo(() => {
    if (!lastSyncedAt) return null
    try {
      const dt = new Date(lastSyncedAt)
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return null
    }
  }, [lastSyncedAt])

  const windowTitle = useMemo(() => {
    switch (activeSection) {
      case 'overview':
        return pickText(lang, { pl: 'Pulpit', en: 'Overview' })
      case 'timetable':
        return t.schedule
      case 'deadlines':
        return pickText(lang, { pl: 'Sprawdziany i terminy', en: 'Tests & Deadlines' })
      case 'grades':
        return t.grades
      case 'attendance':
        return t.attendance
      case 'inbox':
        return t.messagesInbox
      case 'sent':
        return pickText(lang, { pl: 'Wysłane', en: 'Sent' })
      case 'notices':
        return t.messagesAnnouncements
    }
  }, [activeSection, lang, t])

  return (
    <div className="h-dvh w-full overflow-hidden flex bg-[var(--mac-window-bg)] text-[var(--mac-label-1)] mac-desktop-root">
      <DesktopSidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        profile={profile}
        username={username}
        savedAccounts={savedAccounts}
        onSwitchAccount={onSwitchAccount}
        onOpenSettings={() => {
          setSettingsPane('account')
          setSettingsAddAccount(false)
          setSettingsOpen(true)
        }}
        onOpenAddAccount={() => {
          onResetAddAccount()
          setSettingsPane('account')
          setSettingsAddAccount(true)
          setSettingsOpen(true)
        }}
        badges={{
          schedule: badges.schedule,
          grades: badges.grades,
          attendance: badges.attendance,
          inbox: unreadCount,
          notices: announcements.length
        }}
        lang={lang}
        t={t}
      />

      {/* Right Main Window Pane */}
      <div className="flex-1 min-w-0 h-full flex flex-col bg-[var(--mac-window-bg)]">
        {/* 52px Unified macOS 27 Toolbar */}
        <header className="mac-toolbar-surface h-[52px] px-5 border-b border-[var(--mac-row-divider)] flex items-center justify-between gap-4 shrink-0 select-none z-10">
          <div className="flex items-center gap-3 min-w-0">
            {sidebarCollapsed && (
              <MacToolbarButton
                icon={<PanelLeft className="w-4 h-4" strokeWidth={1.9} />}
                onClick={() => setSidebarCollapsed(false)}
                title={pickText(lang, { pl: 'Pokaż pasek boczny', en: 'Show Sidebar' })}
                aria-label={pickText(lang, { pl: 'Pokaż pasek boczny', en: 'Show Sidebar' })}
              />
            )}
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-[15px] font-semibold text-[var(--mac-label-1)] leading-[18px] truncate">
                {windowTitle}
              </h1>
              <span className="text-[11px] text-[var(--mac-label-2)] leading-[14px] tabular-nums truncate">
                {isUpdating
                  ? t.updatingStatus
                  : formattedSyncTime
                    ? t.lastSyncedAtLabel(formattedSyncTime)
                    : t.syncedStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeSection === 'timetable' && (
              <>
                <MacToolbarCapsuleGroup>
                  <button
                    type="button"
                    onClick={() => onShiftWeek(-7)}
                    aria-label={pickText(lang, { pl: 'Poprzedni tydzień', en: 'Previous week' })}
                    className="h-[28px] w-[28px] rounded-full inline-flex items-center justify-center hover:bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectDate(getTodayIsoString())}
                    className="h-[28px] px-2.5 rounded-full text-[12px] font-medium hover:bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] cursor-pointer transition-colors"
                  >
                    {pickText(lang, { pl: 'Dzisiaj', en: 'Today' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => onShiftWeek(7)}
                    aria-label={pickText(lang, { pl: 'Następny tydzień', en: 'Next week' })}
                    className="h-[28px] w-[28px] rounded-full inline-flex items-center justify-center hover:bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </MacToolbarCapsuleGroup>

                <div className="relative h-[36px] rounded-full mac-glass-pill px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--mac-label-1)] tabular-nums shrink-0 hover:brightness-[0.98] dark:hover:brightness-110 transition-all">
                  <Calendar className="w-3.5 h-3.5 text-[var(--mac-label-2)] shrink-0" />
                  <span>{liveWeekMeta.rangeLabel}</span>
                  {isLoadingWeek && <span className="w-1.5 h-1.5 rounded-full bg-[var(--mac-blue)] animate-pulse" />}
                  <input
                    type="date"
                    value={currentWeekPivot}
                    onChange={(e) => {
                      if (e.target.value) onSelectDate(e.target.value)
                    }}
                    aria-label={t.dateLabel}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </div>

                <MacSegmentedControl<'week' | 'day'>
                  surface="toolbar"
                  value={timetableViewMode}
                  onChange={setTimetableViewMode}
                  options={[
                    { id: 'week', label: pickText(lang, { pl: 'Tydzień', en: 'Week' }) },
                    { id: 'day', label: pickText(lang, { pl: 'Dzień', en: 'Day' }) }
                  ]}
                  className="shrink-0"
                />
              </>
            )}

            {activeSection === 'deadlines' && (
              <>
                <MacSearchField
                  surface="toolbar"
                  value={deadlinesSearchQuery}
                  onChange={setDeadlinesSearchQuery}
                  placeholder={pickText(lang, { pl: 'Szukaj terminu...', en: 'Search deadlines...' })}
                  className="w-[190px]"
                />
                <MacToolbarButton
                  active={deadlinesShowArchived}
                  icon={<Archive className="w-3.5 h-3.5" />}
                  label={pickText(lang, { pl: 'Archiwum', en: 'Past' })}
                  onClick={() => setDeadlinesShowArchived((p) => !p)}
                />
                <MacSegmentedControl<'list' | 'calendar'>
                  surface="toolbar"
                  value={deadlinesViewMode}
                  onChange={setDeadlinesViewMode}
                  options={[
                    { id: 'list', label: pickText(lang, { pl: 'Lista', en: 'List' }) },
                    { id: 'calendar', label: pickText(lang, { pl: 'Kalendarz', en: 'Calendar' }) }
                  ]}
                  className="shrink-0"
                />
              </>
            )}

            {activeSection === 'attendance' && (
              <MacSegmentedControl<DesktopAttendanceSubTab>
                surface="toolbar"
                value={!allowExcuse && attendanceSubTab === 'justifications' ? 'summary' : attendanceSubTab}
                onChange={setAttendanceSubTab}
                options={[
                  { id: 'summary', label: pickText(lang, { pl: 'Podsumowanie', en: 'Summary' }) },
                  { id: 'journal', label: pickText(lang, { pl: 'Dziennik', en: 'Journal' }) },
                  ...(allowExcuse
                    ? [{ id: 'justifications' as const, label: pickText(lang, { pl: 'Usprawiedliwienia', en: 'Justifications' }) }]
                    : [])
                ]}
                className="shrink-0"
              />
            )}

            {(activeSection === 'inbox' || activeSection === 'sent') && (
              <MacToolbarButton
                icon={<SquarePen className="w-4 h-4 text-[var(--mac-blue)]" strokeWidth={2} />}
                label={t.writeNewMessage}
                onClick={() => messagesCtrl.setIsComposeOpen(true)}
              />
            )}

            <MacToolbarButton
              icon={
                <RefreshCw
                  className={cn('w-4 h-4', isUpdating && 'animate-spin text-[var(--mac-blue)]')}
                  strokeWidth={1.9}
                />
              }
              label={t.refresh}
              disabled={isUpdating}
              onClick={onRefresh}
            />

            {sidebarCollapsed && (
              <MacToolbarButton
                icon={<Settings className="w-4 h-4" strokeWidth={1.9} />}
                onClick={() => {
                  setSettingsPane('account')
                  setSettingsAddAccount(false)
                  setSettingsOpen(true)
                }}
                aria-label={t.settingsTitle}
              />
            )}
          </div>
        </header>

        {/* Active Desktop Feature Canvas */}
        <main className="flex-1 min-h-0 overflow-hidden bg-[var(--mac-window-bg)]">
          {activeSection === 'overview' && (
            <div className="h-full overflow-y-auto">
              <DesktopOverview
                timetableData={timetableData}
                todayTimetableData={todayTimetableData}
                gradesData={gradesData}
                attendanceData={attendanceData}
                messages={messages}
                isUpdating={isUpdating}
                showFullSubjectNames={showFullSubjectNames}
                showHomeworks={showHomeworks}
                lang={lang}
                t={t}
                onNavigate={onSelectSection}
                onOpenLessonInTimetable={(dayName, lesson) => {
                  onSelectDay(dayName)
                  setTimetableSelection({ lesson, isToday: true })
                  onSelectSection('timetable')
                }}
                onOpenEventInDeadlines={(ev) => {
                  setDeadlineSelection(ev)
                  onSelectSection('deadlines')
                }}
                onOpenGradeInGrades={(grade, subject) => {
                  setGradeSelection({ grade, subject })
                  onSelectSection('grades')
                }}
              />
            </div>
          )}

          {activeSection === 'timetable' && (
            <DesktopTimetableView
              timetableData={timetableData}
              timetableError={timetableError}
              onRetry={onRefresh}
              selectedDay={selectedDay}
              onSelectDay={onSelectDay}
              currentWeekPivot={currentWeekPivot}
              viewMode={timetableViewMode}
              showFullSubjectNames={showFullSubjectNames}
              showHomeworks={showHomeworks}
              lang={lang}
              t={t}
              initialInspectorSelection={timetableSelection}
            />
          )}

          {activeSection === 'deadlines' && (
            <DesktopDeadlinesView
              timetableData={todayTimetableData || timetableData}
              showHomeworks={showHomeworks}
              showFullSubjectNames={showFullSubjectNames}
              lang={lang}
              t={t}
              viewMode={deadlinesViewMode}
              searchQuery={deadlinesSearchQuery}
              showArchived={deadlinesShowArchived}
              initialSelectedEvent={deadlineSelection}
            />
          )}

          {activeSection === 'grades' && (
            <DesktopGradesView
              gradesData={gradesData}
              gradesError={gradesError}
              onRetry={onRefresh}
              showFullSubjectNames={showFullSubjectNames}
              enableGradeSimulator={enableGradeSimulator}
              lang={lang}
              t={t}
              initialSelectedGrade={gradeSelection}
            />
          )}

          {activeSection === 'attendance' && (
            <DesktopAttendanceView
              attendanceData={attendanceData}
              attendanceError={attendanceError}
              onRetry={onRefresh}
              timetableData={timetableData}
              showFullSubjectNames={showFullSubjectNames}
              isStudent={isStudent}
              canSubmitExcuse={canSubmitExcuse}
              liveJustifications={attendanceCtrl.liveJustifications}
              isLoadingLiveJustifications={attendanceCtrl.isLoadingLiveJustifications}
              liveJustificationsFilter={attendanceCtrl.liveJustificationsFilter}
              onChangeLiveFilter={attendanceCtrl.setLiveJustificationsFilter}
              onLoadLiveJustifications={attendanceCtrl.handleOpenLiveJustifications}
              onSubmitJustification={attendanceCtrl.handleSubmitJustifications}
              subTab={attendanceSubTab}
              lang={lang}
              t={t}
            />
          )}

          {(activeSection === 'inbox' || activeSection === 'sent' || activeSection === 'notices') && (
            <DesktopMessagesView
              mode={activeSection}
              messages={messages}
              sentMessages={sentMessages}
              announcements={announcements}
              receivers={receivers}
              isLoadingMessages={isLoadingMessages}
              isComposeOpen={messagesCtrl.isComposeOpen}
              onCloseCompose={() => messagesCtrl.setIsComposeOpen(false)}
              onOpenCompose={() => messagesCtrl.setIsComposeOpen(true)}
              ensureReceivers={ensureReceivers}
              onOpenMessage={onOpenMessage}
              onMarkMessageRead={onMarkMessageRead}
              onDownloadAttachment={onDownloadAttachment}
              onSendMessage={onSendMessage}
              lang={lang}
              t={t}
              initialMessage={mailSelection}
              initialAnnouncement={noticeSelection}
            />
          )}
        </main>
      </div>

      {/* macOS 27 System Settings Dialog Window */}
      <DesktopSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialPane={settingsPane}
        initialShowAddAccount={settingsAddAccount}
        profile={profile}
        savedAccounts={savedAccounts}
        onSwitchAccount={onSwitchAccount}
        onAddAccount={onAddAccount}
        onConfirmAddAccount={onConfirmAddAccount}
        onResetAddAccount={onResetAddAccount}
        addAccountStep={addAccountStep}
        setAddAccountStep={setAddAccountStep}
        addAccountCandidate={addAccountCandidate}
        addAccountError={addAccountError}
        setAddAccountError={setAddAccountError}
        newUsername={newUsername}
        setNewUsername={setNewUsername}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        currentLang={lang}
        onSelectLang={onSelectLang}
        currentTheme={theme}
        onSelectTheme={onSelectTheme}
        showFullSubjectNames={showFullSubjectNames}
        onToggleShowFullSubjectNames={onToggleShowFullSubjectNames}
        showHomeworks={showHomeworks}
        onToggleShowHomeworks={onToggleShowHomeworks}
        enableGradeSimulator={enableGradeSimulator}
        onToggleEnableGradeSimulator={onToggleEnableGradeSimulator}
        showLuckyNumberBanner={showLuckyNumberBanner}
        onToggleShowLuckyNumberBanner={onToggleShowLuckyNumberBanner}
        isStudent={isStudent}
        allowStudentJustifications={allowStudentJustifications}
        onToggleAllowStudentJustifications={onToggleAllowStudentJustifications}
        onLogout={onLogout}
        t={t}
      />
    </div>
  )
}
