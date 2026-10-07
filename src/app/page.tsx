'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getSmartTimetableAction,
  getStudentGradesAction,
  getAttendanceAction,
  getStudentProfileAction,
  getMessagesAndAnnouncementsAction,
  readMessageAction,
  sendMessageAction,
  createJustificationAction
} from './actions'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'
import { GradesResult, GradeItem, SubjectGrades } from '@/models/grade.model'
import { AttendanceResult, SubjectAttendance } from '@/models/attendance.model'
import { MessageItem, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { getDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'

import { AuthView } from './widgets/auth-view'
import { ScheduleWidget } from './widgets/schedule-widget'
import { GradesWidget } from './widgets/grades-widget'
import { AttendanceWidget } from './widgets/attendance-widget'
import { MessagesWidget } from './widgets/messages-widget'
import { AttendanceDetailModal } from './widgets/attendance-detail-modal'
import { JustificationModal } from './widgets/justification-modal'
import { GradeModal } from './widgets/grade-modal'
import { SettingsSheet } from './widgets/settings-sheet'
import { TerminarzModal } from './widgets/terminarz-modal'

export type MainSection = 'schedule' | 'grades' | 'attendance' | 'messages'
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

function getTodayDayName(): string {
  const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const name = dayMap[new Date().getDay()]
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(name) ? name : 'Monday'
}

function getInitialWeekPivot(): string {
  const now = new Date()
  const day = now.getDay()
  const target = new Date(now)

  if (day === 6) target.setDate(now.getDate() + 2)
  else if (day === 0) target.setDate(now.getDate() + 1)
  else target.setDate(now.getDate() + (1 - day))

  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDayIndicatorColor(day: DaySchedule): string | null {
  const hasCancelled = day.lessons.some((l) => l.isCancelled)
  const hasHoliday = day.events && day.events.some((e) => e.category === 'holiday')
  if (hasCancelled || hasHoliday) return 'bg-[#ff3b30]'

  const hasSubstitution = day.lessons.some((l) => l.isSubstitution)
  if (hasSubstitution) return 'bg-[#af52de]'

  const hasShortened = day.lessons.some((l) => l.isShortened)
  if (hasShortened) return 'bg-[#ff9500]'

  return null
}

function getDayAbbr(dayName: string, lang: AppLanguage): string {
  const mapPl: Record<string, string> = {
    Monday: 'Pn',
    Tuesday: 'Wt',
    Wednesday: 'Śr',
    Thursday: 'Cz',
    Friday: 'Pt',
    Saturday: 'So',
    Sunday: 'Nd'
  }
  const mapEn: Record<string, string> = {
    Monday: 'Mo',
    Tuesday: 'Tu',
    Wednesday: 'We',
    Thursday: 'Th',
    Friday: 'Fr',
    Saturday: 'Sa',
    Sunday: 'Su'
  }
  return (lang === 'en' ? mapEn[dayName] : mapPl[dayName]) || dayName.slice(0, 2)
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [lang, setLang] = useState<AppLanguage>('pl')
  const [theme, setTheme] = useState<AppTheme>('system')
  const [textClamp, setTextClamp] = useState<TextClampOption>('full')

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [newAccUser, setNewAccUser] = useState('')
  const [newAccPass, setNewAccPass] = useState('')
  const [isAddingAcc, setIsAddingAcc] = useState(false)

  const [authStep, setAuthStep] = useState<'input' | 'verifying' | 'preview'>('input')
  const [verifiedCandidate, setVerifiedCandidate] = useState<StudentProfile | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoadingWeek, setIsLoadingWeek] = useState(false)
  const [hasNewUpdate, setHasNewUpdate] = useState(false)
  const [activeSection, setActiveSection] = useState<MainSection>('schedule')
  const [isCalendarPinned, setIsCalendarPinned] = useState(false)

  const [currentWeekPivot, setCurrentWeekPivot] = useState(getInitialWeekPivot)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [timetableData, setTimetableData] = useState<SmartTimetableResult | null>(null)
  const [gradesData, setGradesData] = useState<GradesResult | null>(null)
  const [attendanceData, setAttendanceData] = useState<AttendanceResult | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [receivers, setReceivers] = useState<ReceiverItem[]>([])
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const [pendingSnapshot, setPendingSnapshot] = useState<{
    t: SmartTimetableResult
    g: GradesResult
    a: AttendanceResult
  } | null>(null)

  const [selectedDay, setSelectedDay] = useState<string>(getTodayDayName)
  const [selectedGrade, setSelectedGrade] = useState<GradeItem | null>(null)
  const [selectedWarningSubject, setSelectedWarningSubject] = useState<SubjectGrades | null>(null)
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectAttendance | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showExcuseMatrix, setShowExcuseMatrix] = useState(false)
  const [showTerminarz, setShowTerminarz] = useState(false)

  const weekCacheRef = useRef<Record<string, SmartTimetableResult>>({})
  const activeRequestCounter = useRef(0)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const t = getDictionary(lang)

  const currentDaySchedule = timetableData?.schedule.find((d) => d.dayName === selectedDay)
  const currentDayLessonCount = currentDaySchedule?.lessons.length || 0
  const canPinCalendar = currentDayLessonCount >= 5

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

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      if (e.matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  useEffect(() => {
    let isPinned = false
    const handleScroll = () => {
      const y = window.scrollY
      if (!isPinned && y > 105) {
        isPinned = true
        setIsCalendarPinned(true)
      } else if (isPinned && y <= 90) {
        isPinned = false
        setIsCalendarPinned(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const resolveSmartDefaultDay = useCallback((schedule: DaySchedule[]): string => {
    if (!Array.isArray(schedule) || schedule.length === 0) return 'Monday'

    const todayMatch = schedule.find((d) => d.isToday)
    if (todayMatch) return todayMatch.dayName

    const weekdaysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    for (const day of weekdaysOrder) {
      const match = schedule.find((d) => d.dayName === day && d.lessons.length > 0)
      if (match) return day
    }

    return schedule[0]?.dayName || 'Monday'
  }, [])

  const executeSync = useCallback(
    async (u: string, p: string, currentAppLang: AppLanguage, weekPivot: string, silentUpdate: boolean) => {
      const requestId = ++activeRequestCounter.current
      if (!silentUpdate) setIsLoadingWeek(true)
      setIsUpdating(true)

      try {
        const shouldTranslate = currentAppLang === 'en'
        const [tRes, gRes, aRes, pRes] = await Promise.all([
          getSmartTimetableAction(u, p, shouldTranslate, weekPivot),
          getStudentGradesAction(u, p, shouldTranslate),
          getAttendanceAction(u, p, shouldTranslate),
          getStudentProfileAction(u, p)
        ])

        if (requestId !== activeRequestCounter.current) return

        if (pRes.success && pRes.data) setProfile(pRes.data)

        if (tRes.success && gRes.success && aRes.success && tRes.data && gRes.data && aRes.data) {
          const fetchedData = tRes.data
          const previousDataForThisWeek = weekCacheRef.current[weekPivot]
          weekCacheRef.current[weekPivot] = fetchedData
          localStorage.setItem('synapse_week_cache', JSON.stringify(weekCacheRef.current))

          setGradesData(gRes.data)
          setAttendanceData(aRes.data)

          if (previousDataForThisWeek) {
            const isIdentical = JSON.stringify(previousDataForThisWeek) === JSON.stringify(fetchedData)
            if (!isIdentical) {
              setPendingSnapshot({ t: fetchedData, g: gRes.data, a: aRes.data })
              setHasNewUpdate(true)
            }
          } else {
            setTimetableData(fetchedData)
            setSelectedDay((prev) => {
              const currentToday = fetchedData.schedule.find((d) => d.isToday)
              if (currentToday) return currentToday.dayName
              const hasPrev = fetchedData.schedule.some((d) => d.dayName === prev && d.lessons.length > 0)
              return hasPrev ? prev : resolveSmartDefaultDay(fetchedData.schedule)
            })

            const newSnapshot = { t: fetchedData, g: gRes.data, a: aRes.data }
            localStorage.setItem('synapse_cache', JSON.stringify(newSnapshot))
          }
        }
      } catch {
      } finally {
        if (requestId === activeRequestCounter.current) {
          setIsLoadingWeek(false)
          setIsUpdating(false)
        }
      }
    },
    [resolveSmartDefaultDay]
  )

  const loadMessagesIfActive = useCallback(async () => {
    if (!username || !password || hasLoadedMessages) return
    setIsLoadingMessages(true)
    const mRes = await getMessagesAndAnnouncementsAction(username, password)
    setIsLoadingMessages(false)
    if (mRes.success) {
      setMessages(mRes.messages)
      setAnnouncements(mRes.announcements)
      setReceivers(mRes.receivers)
      setHasLoadedMessages(true)
    }
  }, [username, password, hasLoadedMessages])

  useEffect(() => {
    if (activeSection === 'messages') {
      loadMessagesIfActive()
    }
  }, [activeSection, loadMessagesIfActive])

  useEffect(() => {
    setMounted(true)

    const savedAccountsJson = localStorage.getItem('synapse_accounts')
    let loadedAccounts: SavedAccount[] = []
    if (savedAccountsJson) {
      try {
        loadedAccounts = JSON.parse(savedAccountsJson)
      } catch { }
    }

    const savedUser = localStorage.getItem('synapse_user') || ''
    const savedPass = localStorage.getItem('synapse_pass') || ''
    const savedLang = (localStorage.getItem('synapse_lang') as AppLanguage) || 'pl'
    const savedTheme = (localStorage.getItem('synapse_theme') as AppTheme) || 'system'
    const savedClamp = (localStorage.getItem('synapse_text_clamp') as TextClampOption) || 'full'

    if (loadedAccounts.length === 0 && savedUser && savedPass) {
      const isStudent = savedUser.trim().toLowerCase().endsWith('u')
      const initialAccount: SavedAccount = {
        id: savedUser,
        username: savedUser,
        password: savedPass,
        role: isStudent ? 'student' : 'parent',
        profile: {
          fullName: savedUser,
          className: '4 Tsa Technikum',
          schoolName: 'TEB Edukacja',
          luckyNumber: null,
          role: isStudent ? 'student' : 'parent'
        },
        isActive: true
      }
      loadedAccounts = [initialAccount]
      localStorage.setItem('synapse_accounts', JSON.stringify([initialAccount]))
    }

    setSavedAccounts(loadedAccounts)

    const activeAcc = loadedAccounts.find((a) => a.isActive) || loadedAccounts[0]
    const effectiveUser = activeAcc ? activeAcc.username : savedUser
    const effectivePass = activeAcc ? activeAcc.password : savedPass

    setUsername(effectiveUser)
    setPassword(effectivePass)
    setLang(savedLang === 'en' ? 'en' : 'pl')
    setTheme(savedTheme)
    setTextClamp(savedClamp)
    applyTheme(savedTheme)

    const hasAccount = Boolean(effectiveUser && effectivePass)
    setIsConfigured(hasAccount)

    if (!hasAccount) return

    const storedWeekCache = localStorage.getItem('synapse_week_cache')
    if (storedWeekCache) {
      try {
        weekCacheRef.current = JSON.parse(storedWeekCache)
      } catch { }
    }

    const cachedSnapshot = localStorage.getItem('synapse_cache')
    if (cachedSnapshot) {
      try {
        const parsed = JSON.parse(cachedSnapshot)
        if (parsed.t && Array.isArray(parsed.t.schedule)) {
          setTimetableData(parsed.t)
          if (!weekCacheRef.current[parsed.t.weekStart]) {
            weekCacheRef.current[parsed.t.weekStart] = parsed.t
          }
          const currentToday = parsed.t.schedule.find((d: DaySchedule) => d.isToday)
          setSelectedDay(currentToday ? currentToday.dayName : resolveSmartDefaultDay(parsed.t.schedule))
        }
        if (parsed.g) setGradesData(parsed.g)
        if (parsed.a) setAttendanceData(parsed.a)
      } catch { }
    }

    const isAlreadyInCache = Boolean(weekCacheRef.current[currentWeekPivot])
    executeSync(effectiveUser, effectivePass, savedLang, currentWeekPivot, isAlreadyInCache)

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab') as MainSection
      const dayParam = params.get('day')
      const excuseParam = params.get('excuse')

      if (tabParam) setActiveSection(tabParam)
      if (dayParam) setSelectedDay(dayParam)
      if (excuseParam === '1') setShowExcuseMatrix(true)
    }
  }, [applyTheme, resolveSmartDefaultDay, executeSync, currentWeekPivot])

  const queueWeekChange = (targetPivot: string) => {
    setHasNewUpdate(false)
    setCurrentWeekPivot(targetPivot)

    const cached = weekCacheRef.current[targetPivot]
    if (cached) {
      setTimetableData(cached)
      setSelectedDay((prev) => {
        const currentToday = cached.schedule.find((d) => d.isToday)
        if (currentToday) return currentToday.dayName
        const hasPrev = cached.schedule.some((d) => d.dayName === prev && d.lessons.length > 0)
        return hasPrev ? prev : resolveSmartDefaultDay(cached.schedule)
      })
      setIsLoadingWeek(false)
    } else {
      setIsLoadingWeek(true)
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(() => {
      if (username && password) {
        const isSilent = Boolean(weekCacheRef.current[targetPivot])
        executeSync(username, password, lang, targetPivot, isSilent)
      }
    }, 400)
  }

  const shiftWeek = (deltaDays: number) => {
    const current = new Date(currentWeekPivot)
    current.setDate(current.getDate() + deltaDays)
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    queueWeekChange(`${y}-${m}-${d}`)
  }

  const handleManualRefresh = () => {
    if (username && password) executeSync(username, password, lang, currentWeekPivot, false)
  }

  const applyPendingUpdates = () => {
    if (pendingSnapshot) {
      setTimetableData(pendingSnapshot.t)
      weekCacheRef.current[currentWeekPivot] = pendingSnapshot.t
      localStorage.setItem('synapse_week_cache', JSON.stringify(weekCacheRef.current))
      setSelectedDay(resolveSmartDefaultDay(pendingSnapshot.t.schedule))
      setGradesData(pendingSnapshot.g)
      setAttendanceData(pendingSnapshot.a)
      localStorage.setItem('synapse_cache', JSON.stringify(pendingSnapshot))
      setPendingSnapshot(null)
      setHasNewUpdate(false)
    }
  }

  const handleStartVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthStep('verifying')

    const res = await getStudentProfileAction(username, password)
    if (res.success && res.data) {
      setVerifiedCandidate(res.data)
      setAuthStep('preview')
    } else {
      setAuthError(res.error || t.loginError)
      setAuthStep('input')
    }
  }

  const handleConfirmLogin = () => {
    if (!verifiedCandidate) return
    localStorage.setItem('synapse_user', username)
    localStorage.setItem('synapse_pass', password)
    localStorage.setItem('synapse_lang', lang)

    const newAcc: SavedAccount = {
      id: username,
      username,
      password,
      role: verifiedCandidate.role,
      profile: verifiedCandidate,
      isActive: true
    }

    const updated = [newAcc]
    setSavedAccounts(updated)
    localStorage.setItem('synapse_accounts', JSON.stringify(updated))

    setProfile(verifiedCandidate)
    setIsConfigured(true)
    setAuthStep('input')
    executeSync(username, password, lang, currentWeekPivot, false)
  }

  const handleSwitchAccount = (acc: SavedAccount) => {
    const updated = savedAccounts.map((a) => ({
      ...a,
      isActive: a.id === acc.id
    }))
    setSavedAccounts(updated)
    localStorage.setItem('synapse_accounts', JSON.stringify(updated))
    localStorage.setItem('synapse_user', acc.username)
    localStorage.setItem('synapse_pass', acc.password)
    setUsername(acc.username)
    setPassword(acc.password)
    setProfile(acc.profile)
    setHasLoadedMessages(false)
    executeSync(acc.username, acc.password, lang, currentWeekPivot, false)
  }

  const handleAddSecondaryAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingAcc(true)
    const res = await getStudentProfileAction(newAccUser, newAccPass)
    setIsAddingAcc(false)

    if (res.success && res.data) {
      const newAcc: SavedAccount = {
        id: newAccUser,
        username: newAccUser,
        password: newAccPass,
        role: res.data.role,
        profile: res.data,
        isActive: false
      }
      const updated = [...savedAccounts, newAcc]
      setSavedAccounts(updated)
      localStorage.setItem('synapse_accounts', JSON.stringify(updated))
      setNewAccUser('')
      setNewAccPass('')
    }
  }

  const handleSelectLanguage = (newLang: AppLanguage) => {
    setLang(newLang)
    localStorage.setItem('synapse_lang', newLang)
    if (isConfigured && username && password) {
      executeSync(username, password, newLang, currentWeekPivot, true)
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

  const handleSelectDay = (dayName: string) => {
    setSelectedDay(dayName)
    setIsCalendarPinned(false)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('synapse_user')
    localStorage.removeItem('synapse_pass')
    localStorage.removeItem('synapse_accounts')
    localStorage.removeItem('synapse_cache')
    localStorage.removeItem('synapse_week_cache')
    localStorage.removeItem('synapse_theme')
    localStorage.removeItem('synapse_text_clamp')
    weekCacheRef.current = {}
    setUsername('')
    setPassword('')
    setProfile(null)
    setSavedAccounts([])
    setTimetableData(null)
    setGradesData(null)
    setAttendanceData(null)
    setMessages([])
    setAnnouncements([])
    setReceivers([])
    setHasLoadedMessages(false)
    setIsConfigured(false)
    setShowSettings(false)
    setAuthStep('input')
    setVerifiedCandidate(null)
  }

  const handleTabChange = (targetTab: MainSection) => {
    setActiveSection(targetTab)
    setIsCalendarPinned(false)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  const handleOpenMessage = async (msgId: number | string): Promise<string> => {
    const res = await readMessageAction(username, password, Number(msgId))
    return res.content || ''
  }

  const handleSendMessage = async (receiverId: number, title: string, body: string): Promise<boolean> => {
    const res = await sendMessageAction(username, password, receiverId, title, body)
    if (res.success) {
      executeSync(username, password, lang, currentWeekPivot, true)
      return true
    }
    return false
  }

  const handleSubmitMultipleJustifications = async (payload: {
    dateIso: string
    lessons: number[]
    message: string
  }): Promise<boolean> => {
    try {
      const parentAcc = savedAccounts.find((a) => a.role === 'parent')
      const targetUser = parentAcc ? parentAcc.username : username
      const targetPass = parentAcc ? parentAcc.password : password

      const res = await createJustificationAction(targetUser, targetPass, {
        dateFrom: payload.dateIso,
        dateTo: payload.dateIso,
        lessons: payload.lessons,
        messageFromParent: payload.message,
        sendNotify: false
      })

      if (res.success) {
        executeSync(username, password, lang, currentWeekPivot, true)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  if (!mounted) return null

  if (!isConfigured) {
    return (
      <AuthView
        authStep={authStep}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        authError={authError}
        verifiedCandidate={verifiedCandidate}
        onStartVerification={handleStartVerification}
        onConfirmLogin={handleConfirmLogin}
        onBackToInput={() => setAuthStep('input')}
        lang={lang}
        onSelectLanguage={handleSelectLanguage}
        t={t}
      />
    )
  }

  const shouldShowPinnedBar = isCalendarPinned && activeSection === 'schedule' && timetableData && canPinCalendar

  return (
    <div className="w-full min-h-screen bg-[var(--ios-bg)] flex flex-col">
      <header className="sticky top-0 z-30 w-full pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] px-4 bg-[var(--ios-bg)]/90 backdrop-blur-xl border-b border-[var(--ios-separator)] transition-all duration-300 ease-[var(--ease-out-cubic)]">
        <div className="max-w-md mx-auto flex flex-col pb-2">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--ios-label)]">Synapse</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isUpdating && <IosSpinner className="w-3 h-3 text-[var(--ios-blue)]" />}
                <p className="text-[11px] font-normal text-[var(--ios-secondary)] tracking-tight">
                  {isUpdating ? t.updatingStatus : t.syncedStatus}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:scale-95 transition-all"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>

          <div
            className={`grid transition-all duration-300 ease-[var(--ease-out-cubic)] ${shouldShowPinnedBar
                ? 'grid-rows-[1fr] opacity-100 pt-1.5'
                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              }`}
          >
            <div className="overflow-hidden">
              <div className="flex items-center justify-between gap-1 border-t border-[var(--ios-separator)]/60 pt-1.5">
                <button
                  onClick={() => shiftWeek(-7)}
                  className="w-7 h-7 flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:scale-95 transition-all shrink-0"
                  aria-label="Previous week"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                <div className="flex items-center justify-between flex-1 px-1">
                  {timetableData?.schedule.map((day) => {
                    const dotColor = getDayIndicatorColor(day)
                    const isSelected = selectedDay === day.dayName

                    return (
                      <button
                        key={day.dayName}
                        onClick={() => handleSelectDay(day.dayName)}
                        className={`py-1 flex-1 flex flex-col items-center justify-center transition-colors ${isSelected
                            ? 'text-[var(--ios-blue)]'
                            : 'text-[var(--ios-secondary)] hover:text-[var(--ios-label)]'
                          }`}
                      >
                        <span className={`text-[10px] uppercase tracking-tight ${isSelected ? 'font-semibold' : 'font-normal opacity-70'}`}>
                          {getDayAbbr(day.dayName, lang)}
                        </span>
                        <span className={`relative text-[13px] tracking-tight mt-0.5 ${isSelected ? 'font-semibold' : 'font-medium opacity-80'}`}>
                          {day.date ? day.date.split('.')[0] : ''}
                          {dotColor && (
                            <span className={`absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => shiftWeek(7)}
                  className="w-7 h-7 flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:scale-95 transition-all shrink-0"
                  aria-label="Next week"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] pt-3 px-4 max-w-md mx-auto flex flex-col gap-3 box-border">
        {hasNewUpdate && (
          <div
            onClick={applyPendingUpdates}
            className="bg-[var(--ios-blue)] text-white p-3 rounded-2xl flex items-center justify-between cursor-pointer active:opacity-90 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">✨</span>
              <p className="text-xs font-semibold tracking-tight">{t.newChanges}</p>
            </div>
            <span className="text-xs font-semibold underline bg-white/20 px-2 py-0.5 rounded-lg">
              {t.updateNow}
            </span>
          </div>
        )}

        {activeSection === 'schedule' && timetableData && (
          <ScheduleWidget
            timetableData={timetableData}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            currentWeekPivot={currentWeekPivot}
            onShiftWeek={shiftWeek}
            onSelectDate={queueWeekChange}
            onManualRefresh={handleManualRefresh}
            onOpenTerminarz={() => setShowTerminarz(true)}
            isLoadingWeek={isLoadingWeek}
            textClamp={textClamp}
            lang={lang}
            t={t}
          />
        )}

        {activeSection === 'grades' && gradesData && (
          <GradesWidget
            gradesData={gradesData}
            onSelectGrade={setSelectedGrade}
            onSelectWarning={setSelectedWarningSubject}
            t={t}
          />
        )}

        {activeSection === 'attendance' && attendanceData && (
          <AttendanceWidget
            attendanceData={attendanceData}
            onSelectSubject={setSelectedSubjectDetail}
            onOpenExcuseModal={() => setShowExcuseMatrix(true)}
            t={t}
          />
        )}

        {activeSection === 'messages' && (
          <MessagesWidget
            messages={messages}
            announcements={announcements}
            receivers={receivers}
            onOpenMessage={handleOpenMessage}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingMessages}
            t={t}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--ios-separator)] bg-[var(--ios-card)] backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]">
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
                  <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" stroke="none">5</text>
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
                <span className="text-[10px] font-medium tracking-tight mt-0.5">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {selectedSubjectDetail && (
        <AttendanceDetailModal
          subjectDetail={selectedSubjectDetail}
          onClose={() => setSelectedSubjectDetail(null)}
          onSelectAbsenceForExcuse={() => setShowExcuseMatrix(true)}
          t={t}
        />
      )}

      {showExcuseMatrix && attendanceData && (
        <JustificationModal
          attendanceData={attendanceData}
          timetableData={timetableData}
          onClose={() => setShowExcuseMatrix(false)}
          onSubmitMultiple={handleSubmitMultipleJustifications}
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
        profile={profile}
        savedAccounts={savedAccounts}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={handleAddSecondaryAccount}
        newUsername={newAccUser}
        setNewUsername={setNewAccUser}
        newPassword={newAccPass}
        setNewPassword={setNewAccPass}
        isAddingAccount={isAddingAcc}
        currentLang={lang}
        onSelectLang={handleSelectLanguage}
        currentTheme={theme}
        onSelectTheme={handleSelectTheme}
        textClamp={textClamp}
        onSelectTextClamp={handleSelectTextClamp}
        onLogout={handleLogout}
        t={t}
      />

      {timetableData && (
        <TerminarzModal
          isOpen={showTerminarz}
          onClose={() => setShowTerminarz(false)}
          timetableData={timetableData}
          t={t}
        />
      )}
    </div>
  )
}