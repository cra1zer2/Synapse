'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Archive, Calendar, ChevronLeft, ChevronRight, PanelLeft, Pencil, RefreshCw, Settings, SquarePen } from 'lucide-react'
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
import {
  computeLiveWeekDays,
  getDayAbbr,
  getMonthNames,
  getSchoolWeekMondayIso,
  getTodayDayName,
  getTodayIsoString,
  getWeekdayHeaders
} from '@/utils/date.util'
import { cn } from '@/utils/cn.util'
import {
  MacSegmentedControl,
  MacToolbarButton,
  MacToolbarCapsuleGroup
} from './mac-primitives'
import { DesktopNavSection, DesktopSidebar } from './desktop-sidebar'
import { DesktopOverview } from './desktop-overview'
import { DesktopTimetableView } from './desktop-timetable-view'
import { DesktopDeadlinesView } from './desktop-deadlines-view'
import { DesktopGradesTermFilter, DesktopGradesView } from './desktop-grades-view'
import { DesktopAttendanceView } from './desktop-attendance-view'
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
  const [deadlinesShowArchived, setDeadlinesShowArchived] = useState(false)
  const [gradesTermFilter, setGradesTermFilter] = useState<DesktopGradesTermFilter>('s1')
  const [gradesEditMode, setGradesEditMode] = useState(false)

  const liveWeekMeta = useMemo(() => computeLiveWeekDays(currentWeekPivot), [currentWeekPivot])
  const allowExcuse = canSubmitExcuse !== undefined ? canSubmitExcuse : !isStudent

  // Interactive macOS 27 Timetable Calendar Popover state
  const [calendarOpen, setCalendarOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement | null>(null)
  const todayIso = useMemo(() => getTodayIsoString(), [])
  const monthNames = useMemo(() => getMonthNames(lang), [lang])
  const weekdayHeaders = useMemo(() => getWeekdayHeaders(lang), [lang])

  const activeDaySlot = useMemo(
    () => liveWeekMeta.days.find((d) => d.dayName === selectedDay) || liveWeekMeta.days[0],
    [liveWeekMeta, selectedDay]
  )

  const [calYear, setCalYear] = useState(() => {
    const parts = (currentWeekPivot || getTodayIsoString()).split('-').map(Number)
    return parts[0] || new Date().getFullYear()
  })
  const [calMonth, setCalMonth] = useState(() => {
    const parts = (currentWeekPivot || getTodayIsoString()).split('-').map(Number)
    return (parts[1] || 1) - 1
  })

  useEffect(() => {
    if (!calendarOpen) return
    const targetIso =
      timetableViewMode === 'day' && activeDaySlot?.isoDate
        ? activeDaySlot.isoDate
        : currentWeekPivot
    const parts = (targetIso || todayIso).split('-').map(Number)
    if (parts[0] && parts[1]) {
      setCalYear(parts[0])
      setCalMonth(parts[1] - 1)
    }
  }, [calendarOpen, timetableViewMode, activeDaySlot?.isoDate, currentWeekPivot, todayIso])

  useEffect(() => {
    if (activeSection !== 'timetable') setCalendarOpen(false)
  }, [activeSection])

  useEffect(() => {
    if (!calendarOpen) return
    const handleMouseDown = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCalendarOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [calendarOpen])

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(Date.UTC(calYear, calMonth, 1))
    const startDow = firstDay.getUTCDay()
    const leadingEmpties = startDow === 0 ? 6 : startDow - 1
    const daysInMonth = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate()
    const cells: Array<{ dayNum: number | null; iso: string | null }> = []
    for (let i = 0; i < leadingEmpties; i++) cells.push({ dayNum: null, iso: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(calMonth + 1).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      cells.push({ dayNum: d, iso: `${calYear}-${mm}-${dd}` })
    }
    return cells
  }, [calYear, calMonth])

  const activeWeekIsoSet = useMemo(
    () => new Set(liveWeekMeta.days.map((d) => d.isoDate)),
    [liveWeekMeta]
  )

  const shiftCalMonth = (delta: number) => {
    const next = new Date(Date.UTC(calYear, calMonth + delta, 1))
    setCalYear(next.getUTCFullYear())
    setCalMonth(next.getUTCMonth())
  }

  // Deep-jump handoffs from Overview
  const [timetableSelection, setTimetableSelection] = useState<{
    lesson?: LessonItem
    isToday?: boolean
    event?: TimetableEvent
  } | null>(null)

  const handlePickCalendarDate = (isoDate: string) => {
    const parts = isoDate.split('-').map(Number)
    if (parts.length !== 3 || parts.some(Number.isNaN)) return
    const utcDay = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay()
    const dayMap: Record<number, string> = {
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday'
    }
    const targetDayName = dayMap[utcDay] || 'Monday'
    const targetWeekMonday = getSchoolWeekMondayIso(isoDate)
    onSelectDate(targetWeekMonday)
    onSelectDay(targetDayName)
    setTimetableSelection(null)
    setCalendarOpen(false)
  }

  const handleShiftTimetable = (direction: -1 | 1) => {
    if (timetableViewMode === 'week') {
      onShiftWeek(direction * 7)
      return
    }
    const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const idx = order.indexOf(selectedDay)
    if (direction === 1) {
      if (idx >= 0 && idx < 4) {
        onSelectDay(order[idx + 1])
      } else {
        onShiftWeek(7)
        onSelectDay('Monday')
      }
    } else {
      if (idx > 0) {
        onSelectDay(order[idx - 1])
      } else {
        onShiftWeek(-7)
        onSelectDay('Friday')
      }
    }
    setTimetableSelection(null)
  }

  const handleJumpToday = () => {
    const today = getTodayIsoString()
    onSelectDate(getSchoolWeekMondayIso(today))
    onSelectDay(getTodayDayName())
    setTimetableSelection(null)
    setCalendarOpen(false)
  }
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
        return `${t.attendance} · ${pickText(lang, { pl: 'Podsumowanie', en: 'Summary' })}`
      case 'attendance-journal':
        return `${t.attendance} · ${pickText(lang, { pl: 'Dziennik obecności', en: 'Journal' })}`
      case 'attendance-justifications':
        return `${t.attendance} · ${pickText(lang, { pl: 'Usprawiedliwienia', en: 'Justifications' })}`
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
        canSubmitExcuse={allowExcuse}
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
      <div className="flex-1 min-w-0 h-full flex flex-col bg-[var(--mac-canvas-bg)]">
        {/* 52px Unified macOS 27 Toolbar */}
        <header className="mac-toolbar-surface h-[52px] px-5 border-b border-[var(--mac-row-divider)] flex items-center justify-between gap-4 shrink-0 select-none z-20 relative">
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
                    onClick={() => handleShiftTimetable(-1)}
                    aria-label={
                      timetableViewMode === 'day'
                        ? pickText(lang, { pl: 'Poprzedni dzień', en: 'Previous day' })
                        : pickText(lang, { pl: 'Poprzedni tydzień', en: 'Previous week' })
                    }
                    className="h-[28px] w-[28px] rounded-full inline-flex items-center justify-center hover:bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleJumpToday}
                    className="h-[28px] px-2.5 rounded-full text-[12px] font-medium hover:bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] cursor-pointer transition-colors"
                  >
                    {pickText(lang, { pl: 'Dzisiaj', en: 'Today' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftTimetable(1)}
                    aria-label={
                      timetableViewMode === 'day'
                        ? pickText(lang, { pl: 'Następny dzień', en: 'Next day' })
                        : pickText(lang, { pl: 'Następny tydzień', en: 'Next week' })
                    }
                    className="h-[28px] w-[28px] rounded-full inline-flex items-center justify-center hover:bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </MacToolbarCapsuleGroup>

                <div ref={calendarRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((o) => !o)}
                    aria-label={t.dateLabel}
                    aria-expanded={calendarOpen}
                    className={cn(
                      'h-[36px] w-[136px] justify-center rounded-full px-3 inline-flex items-center gap-1.5 text-[12px] font-medium tabular-nums cursor-pointer transition-all outline-none mac-focus-ring',
                      calendarOpen
                        ? 'bg-[var(--mac-blue)] text-white shadow-[0_2px_10px_rgba(0,136,255,0.28)]'
                        : 'mac-glass-pill text-[var(--mac-label-1)] hover:brightness-[0.98] dark:hover:brightness-110'
                    )}
                  >
                    <Calendar
                      className={cn(
                        'w-3.5 h-3.5 shrink-0',
                        calendarOpen ? 'text-white' : 'text-[var(--mac-label-2)]'
                      )}
                    />
                    <span>
                      {timetableViewMode === 'day' && activeDaySlot
                        ? `${getDayAbbr(activeDaySlot.dayName, lang)}, ${activeDaySlot.dateDot.slice(0, 5)}`
                        : liveWeekMeta.rangeLabel}
                    </span>
                    {isLoadingWeek && (
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full animate-pulse',
                          calendarOpen ? 'bg-white' : 'bg-[var(--mac-blue)]'
                        )}
                      />
                    )}
                  </button>

                  {calendarOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-[276px] p-3.5 mac-popover-surface border border-[var(--mac-glass-pill-border)] z-50 select-none">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[13px] font-semibold text-[var(--mac-label-1)] truncate">
                          {monthNames[calMonth]} {calYear}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => shiftCalMonth(-1)}
                            aria-label={pickText(lang, { pl: 'Poprzedni miesiąc', en: 'Previous month' })}
                            className="w-6 h-6 rounded-full hover:bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] inline-flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleJumpToday}
                            className="h-6 px-2 rounded-full bg-[var(--mac-fill-3)] hover:bg-[var(--mac-fill-2)] text-[11px] font-medium text-[var(--mac-label-1)] inline-flex items-center justify-center cursor-pointer transition-colors"
                          >
                            {pickText(lang, { pl: 'Dzisiaj', en: 'Today' })}
                          </button>
                          <button
                            type="button"
                            onClick={() => shiftCalMonth(1)}
                            aria-label={pickText(lang, { pl: 'Następny miesiąc', en: 'Next month' })}
                            className="w-6 h-6 rounded-full hover:bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] inline-flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-[var(--mac-label-2)] mb-2.5 leading-snug">
                        {timetableViewMode === 'week'
                          ? pickText(lang, {
                              pl: 'Wybierz dzień, aby przejść do tygodnia i dnia',
                              en: 'Pick a day to jump to its week & day'
                            })
                          : pickText(lang, { pl: 'Wybierz dzień zajęć', en: 'Pick a school day' })}
                      </p>

                      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-[var(--mac-label-3)] mb-1">
                        {weekdayHeaders.map((w, i) => (
                          <span key={i}>{w}</span>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-0.5">
                        {calendarGrid.map((cell, idx) => {
                          if (!cell.dayNum || !cell.iso) {
                            return <div key={`empty-${idx}`} className="h-8" />
                          }
                          const isSelectedCell = activeDaySlot?.isoDate === cell.iso
                          const isTodayCell = cell.iso === todayIso
                          const isInWeekCell = activeWeekIsoSet.has(cell.iso)
                          const isWeekend = idx % 7 === 5 || idx % 7 === 6

                          return (
                            <button
                              key={cell.iso}
                              type="button"
                              onClick={() => handlePickCalendarDate(cell.iso!)}
                              className={cn(
                                'h-8 rounded-full text-[12px] font-medium flex items-center justify-center cursor-pointer tabular-nums transition-all',
                                isSelectedCell
                                  ? 'bg-[var(--mac-blue)] text-white font-bold shadow-[0_1px_4px_rgba(0,136,255,0.35)]'
                                  : isInWeekCell
                                    ? 'bg-[var(--ios-blue-subtle)]/55 text-[var(--mac-label-1)] font-semibold hover:bg-[var(--ios-blue-subtle)]'
                                    : isWeekend
                                      ? 'text-[var(--mac-label-3)] hover:bg-[var(--mac-fill-3)] hover:text-[var(--mac-label-2)]'
                                      : 'text-[var(--mac-label-1)] hover:bg-[var(--mac-fill-3)]',
                                isTodayCell && !isSelectedCell && 'ring-1 ring-[var(--mac-blue)] text-[var(--mac-blue)] font-semibold'
                              )}
                            >
                              {cell.dayNum}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
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
              <MacToolbarButton
                active={deadlinesShowArchived}
                icon={<Archive className="w-3.5 h-3.5" />}
                label={pickText(lang, { pl: 'Archiwum', en: 'Past' })}
                onClick={() => setDeadlinesShowArchived((p) => !p)}
              />
            )}

            {activeSection === 'grades' && (
              <>
                {enableGradeSimulator && (
                  <MacToolbarButton
                    active={gradesEditMode}
                    icon={<Pencil className="w-3.5 h-3.5" />}
                    label={pickText(lang, { pl: 'Symulator', en: 'What-If' })}
                    onClick={() => setGradesEditMode((e) => !e)}
                  />
                )}
                <MacSegmentedControl<DesktopGradesTermFilter>
                  surface="toolbar"
                  value={gradesTermFilter}
                  onChange={setGradesTermFilter}
                  options={[
                    { id: 's1', label: pickText(lang, { pl: 'Semestr 1', en: 'Term 1' }) },
                    { id: 's2', label: pickText(lang, { pl: 'Semestr 2', en: 'Term 2' }) },
                    { id: 'all', label: pickText(lang, { pl: 'Oba', en: 'Both' }) }
                  ]}
                  className="shrink-0"
                />
              </>
            )}

            {activeSection === 'attendance-justifications' && allowExcuse && (
              <MacSegmentedControl<'0' | '1' | '2' | '3'>
                surface="toolbar"
                value={attendanceCtrl.liveJustificationsFilter}
                onChange={(f) => {
                  attendanceCtrl.setLiveJustificationsFilter(f)
                  attendanceCtrl.handleOpenLiveJustifications(f)
                }}
                options={[
                  { id: '0', label: pickText(lang, { pl: 'Wszystkie', en: 'All' }) },
                  { id: '1', label: pickText(lang, { pl: 'Wysłane', en: 'Sent' }) },
                  { id: '2', label: pickText(lang, { pl: 'Przyjęte', en: 'Accepted' }) },
                  { id: '3', label: pickText(lang, { pl: 'Odrzucone', en: 'Rejected' }) }
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
                  className={cn(
                    'w-4 h-4',
                    (isUpdating ||
                      (activeSection === 'attendance-justifications' &&
                        attendanceCtrl.isLoadingLiveJustifications)) &&
                      'animate-spin text-[var(--mac-blue)]'
                  )}
                  strokeWidth={1.9}
                />
              }
              label={t.refresh}
              disabled={
                isUpdating ||
                (activeSection === 'attendance-justifications' &&
                  attendanceCtrl.isLoadingLiveJustifications)
              }
              onClick={() => {
                onRefresh()
                if (activeSection === 'attendance-justifications' && allowExcuse) {
                  attendanceCtrl.handleOpenLiveJustifications(attendanceCtrl.liveJustificationsFilter)
                }
              }}
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
        <main className="flex-1 min-h-0 overflow-hidden bg-[var(--mac-canvas-bg)]">
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
              termFilter={gradesTermFilter}
              isEditMode={gradesEditMode}
              onToggleEditMode={setGradesEditMode}
              lang={lang}
              t={t}
              initialSelectedGrade={gradeSelection}
            />
          )}

          {(activeSection === 'attendance' ||
            activeSection === 'attendance-journal' ||
            activeSection === 'attendance-justifications') && (
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
              subTab={
                activeSection === 'attendance-journal'
                  ? 'journal'
                  : activeSection === 'attendance-justifications'
                    ? 'justifications'
                    : 'summary'
              }
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
