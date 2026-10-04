'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getSmartTimetableAction,
  getStudentGradesAction,
  getAttendanceAction,
  getStudentProfileAction,
  createJustificationAction
} from './actions'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'
import { GradesResult, GradeItem, SubjectGrades } from '@/models/grade.model'
import { AttendanceResult, SubjectAttendance } from '@/models/attendance.model'
import { StudentProfile } from '@/models/account.model'
import { getDictionary, AppLanguage } from '@/config/dictionary.config'
import { requestPushPermission, getNotificationPermissionStatus } from '@/services/notification.service'

import { ScheduleWidget } from './widgets/schedule-widget'
import { GradesWidget } from './widgets/grades-widget'
import { AttendanceWidget } from './widgets/attendance-widget'
import { JustificationModal } from './widgets/justification-modal'
import { GradeModal } from './widgets/grade-modal'
import { SettingsSheet } from './widgets/settings-sheet'

type MainSection = 'schedule' | 'grades' | 'attendance' | 'messages'

function getInitialWeekPivot(): string {
  const now = new Date()
  const day = now.getDay()
  const target = new Date(now)

  if (day === 6) {
    target.setDate(now.getDate() + 2)
  } else if (day === 0) {
    target.setDate(now.getDate() + 1)
  } else {
    const diff = 1 - day
    target.setDate(now.getDate() + diff)
  }

  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [lang, setLang] = useState<AppLanguage>('pl')

  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoadingWeek, setIsLoadingWeek] = useState(false)
  const [hasNewUpdate, setHasNewUpdate] = useState(false)
  const [activeSection, setActiveSection] = useState<MainSection>('schedule')

  const [currentWeekPivot, setCurrentWeekPivot] = useState(getInitialWeekPivot)

  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [timetableData, setTimetableData] = useState<SmartTimetableResult | null>(null)
  const [gradesData, setGradesData] = useState<GradesResult | null>(null)
  const [attendanceData, setAttendanceData] = useState<AttendanceResult | null>(null)
  const [pendingSnapshot, setPendingSnapshot] = useState<{
    t: SmartTimetableResult
    g: GradesResult
    a: AttendanceResult
  } | null>(null)

  const [selectedDay, setSelectedDay] = useState<string>('Monday')
  const [selectedGrade, setSelectedGrade] = useState<GradeItem | null>(null)
  const [selectedWarningSubject, setSelectedWarningSubject] = useState<SubjectGrades | null>(null)
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectAttendance | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showExcuseMatrix, setShowExcuseMatrix] = useState(false)
  const [showPushBanner, setShowPushBanner] = useState(false)

  const weekCacheRef = useRef<Record<string, SmartTimetableResult>>({})
  const activeRequestCounter = useRef(0)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const t = getDictionary(lang)

  const resolveSmartDefaultDay = useCallback((schedule: DaySchedule[]): string => {
    if (!Array.isArray(schedule) || schedule.length === 0) return 'Monday'

    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayName = dayMap[new Date().getDay()]

    const todaySchedule = schedule.find((d) => d.dayName === todayName)
    if (todaySchedule && Array.isArray(todaySchedule.lessons) && todaySchedule.lessons.length > 0) {
      return todayName
    }

    const weekdaysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const todayIdx = weekdaysOrder.indexOf(todayName)

    if (todayIdx !== -1) {
      for (let i = todayIdx + 1; i < weekdaysOrder.length; i++) {
        const nextDay = schedule.find((d) => d.dayName === weekdaysOrder[i])
        if (nextDay && Array.isArray(nextDay.lessons) && nextDay.lessons.length > 0) {
          return weekdaysOrder[i]
        }
      }
    }

    for (const day of weekdaysOrder) {
      const match = schedule.find((d) => d.dayName === day)
      if (match && Array.isArray(match.lessons) && match.lessons.length > 0) {
        return day
      }
    }

    return 'Monday'
  }, [])

  const executeSync = useCallback(async (u: string, p: string, currentAppLang: AppLanguage, weekPivot: string, silentUpdate: boolean) => {
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
  }, [resolveSmartDefaultDay])

  useEffect(() => {
    setMounted(true)

    const savedUser = localStorage.getItem('synapse_user') || ''
    const savedPass = localStorage.getItem('synapse_pass') || ''
    const savedLang = (localStorage.getItem('synapse_lang') as AppLanguage) || 'pl'

    setUsername(savedUser)
    setPassword(savedPass)
    setLang(savedLang)
    setIsConfigured(Boolean(savedUser && savedPass))

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
          setSelectedDay(resolveSmartDefaultDay(parsed.t.schedule))
        }
        if (parsed.g) setGradesData(parsed.g)
        if (parsed.a) setAttendanceData(parsed.a)
      } catch { }
    }

    if (savedUser && savedPass) {
      const isAlreadyInCache = Boolean(weekCacheRef.current[currentWeekPivot])
      executeSync(savedUser, savedPass, savedLang, currentWeekPivot, isAlreadyInCache)
    }

    const perm = getNotificationPermissionStatus()
    if (perm === 'default') {
      setShowPushBanner(true)
    }
  }, [])

  const queueWeekChange = (targetPivot: string) => {
    setHasNewUpdate(false)
    setCurrentWeekPivot(targetPivot)

    const cached = weekCacheRef.current[targetPivot]
    if (cached) {
      setTimetableData(cached)
      setSelectedDay((prev) => {
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
    if (username && password) {
      executeSync(username, password, lang, currentWeekPivot, false)
    }
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

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('synapse_user', username)
    localStorage.setItem('synapse_pass', password)
    localStorage.setItem('synapse_lang', lang)
    setIsConfigured(true)
    setShowSettings(false)
    executeSync(username, password, lang, currentWeekPivot, false)
  }

  const handleSelectLanguage = (newLang: AppLanguage) => {
    setLang(newLang)
    localStorage.setItem('synapse_lang', newLang)
    if (username && password) {
      executeSync(username, password, newLang, currentWeekPivot, true)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('synapse_user')
    localStorage.removeItem('synapse_pass')
    localStorage.removeItem('synapse_cache')
    localStorage.removeItem('synapse_week_cache')
    weekCacheRef.current = {}
    setUsername('')
    setPassword('')
    setProfile(null)
    setTimetableData(null)
    setGradesData(null)
    setAttendanceData(null)
    setIsConfigured(false)
    setShowSettings(false)
  }

  const handleActivatePush = async () => {
    await requestPushPermission()
    setShowPushBanner(false)
  }

  const handleSubmitMultipleJustifications = async (payload: { dateIso: string; lessons: number[]; message: string }): Promise<boolean> => {
    try {
      const res = await createJustificationAction(username, password, {
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

  return (
    <main className="w-full min-h-screen pb-20 pt-safe px-4 max-w-xl mx-auto flex flex-col gap-4 box-border">
      <header className="pt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#1c1c1e]">Synapse</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
            <p className="text-[11px] font-medium text-[#8e8e93]">
              {isUpdating ? 'Synchronizing...' : t.syncedStatus}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-2xl bg-white border border-[#e5e5ea] flex items-center justify-center text-[#1c1c1e] shadow-xs active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4 text-[#1c1c1e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {showPushBanner && (
        <div className="bg-white p-4 rounded-3xl border border-[#e5e5ea] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[#1c1c1e]">Włącz powiadomienia</p>
            <p className="text-[11px] text-[#8e8e93] mt-0.5">Otrzymuj alerty o ocenach, dzwonkach i zastępstwach</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowPushBanner(false)}
              className="text-xs font-bold text-[#8e8e93] px-2.5 py-1.5"
            >
              Później
            </button>
            <button
              onClick={handleActivatePush}
              className="text-xs font-bold bg-[#007aff] text-white px-3 py-1.5 rounded-xl shadow-xs"
            >
              Włącz
            </button>
          </div>
        </div>
      )}

      {hasNewUpdate && (
        <div
          onClick={applyPendingUpdates}
          className="bg-[#007aff] text-white p-4 rounded-3xl shadow-md flex items-center justify-between cursor-pointer active:opacity-95 transition-all animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">✨</span>
            <div>
              <p className="text-xs font-extrabold">{t.newChanges}</p>
              <p className="text-[11px] opacity-80 mt-0.5">Tap to apply changes</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              applyPendingUpdates()
            }}
            className="text-xs font-bold bg-white text-[#007aff] px-3.5 py-2 rounded-2xl shadow-xs"
          >
            {t.updateNow}
          </button>
        </div>
      )}

      {!isConfigured && (
        <section className="bg-white rounded-3xl p-6 shadow-xs border border-[#e5e5ea] flex flex-col gap-4 text-center">
          <div>
            <h2 className="text-lg font-black text-[#1c1c1e]">Synapse Gateway</h2>
            <p className="text-xs text-[#8e8e93] mt-1">Configure account once. Data will be saved locally.</p>
          </div>
          <form onSubmit={handleSaveCredentials} className="flex flex-col gap-2.5">
            <input
              type="text"
              placeholder="Login / ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
              required
            />
            <button
              type="submit"
              className="w-full bg-[#007aff] text-white text-xs font-bold py-3 rounded-xl active:opacity-80 transition-all shadow-xs"
            >
              {t.saveCreds}
            </button>
          </form>
        </section>
      )}

      <nav className="bg-[#e5e5ea] p-1 rounded-2xl grid grid-cols-4 gap-1.5 shadow-inner h-11 box-border">
        <button
          onClick={() => setActiveSection('schedule')}
          className={`h-full text-xs font-extrabold rounded-xl transition-all text-center flex items-center justify-center ${activeSection === 'schedule' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          {t.schedule}
        </button>
        <button
          onClick={() => setActiveSection('grades')}
          className={`h-full text-xs font-extrabold rounded-xl transition-all text-center flex items-center justify-center ${activeSection === 'grades' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          {t.grades}
        </button>
        <button
          onClick={() => setActiveSection('attendance')}
          className={`h-full text-xs font-extrabold rounded-xl transition-all text-center flex items-center justify-center ${activeSection === 'attendance' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          {t.attendance}
        </button>
        <button
          onClick={() => setActiveSection('messages')}
          className={`h-full text-xs font-extrabold rounded-xl transition-all text-center flex items-center justify-center ${activeSection === 'messages' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          {t.messages}
        </button>
      </nav>

      {activeSection === 'schedule' && timetableData && (
        <ScheduleWidget
          timetableData={timetableData}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          currentWeekPivot={currentWeekPivot}
          onShiftWeek={shiftWeek}
          onSelectDate={queueWeekChange}
          onManualRefresh={handleManualRefresh}
          isLoadingWeek={isLoadingWeek}
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
        <div className="flex flex-col gap-3">
          {attendanceData.unexcusedAbsences.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-rose-800">Nieusprawiedliwione godziny</p>
                <p className="text-[11px] text-rose-600 mt-0.5">
                  Łącznie: {attendanceData.unexcusedAbsences.length} lekcji
                </p>
              </div>
              <button
                onClick={() => setShowExcuseMatrix(true)}
                className="text-xs font-bold bg-rose-600 text-white px-3.5 py-2 rounded-2xl shadow-xs active:scale-95 transition-transform"
              >
                Usprawiedliw NB
              </button>
            </div>
          )}

          <AttendanceWidget
            attendanceData={attendanceData}
            onSelectSubject={setSelectedSubjectDetail}
            t={t}
          />
        </div>
      )}

      {activeSection === 'messages' && (
        <section className="w-full flex flex-col gap-3 min-h-[540px]">
          <div className="bg-white rounded-3xl p-5 border border-[#e5e5ea] shadow-xs flex flex-col gap-3 text-center items-center justify-center min-h-[360px]">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#007aff] flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1c1c1e]">{t.messages} & {t.messagesAnnouncements}</h3>
              <p className="text-xs text-[#8e8e93] mt-1 max-w-xs">{t.moduleUnderDevelopment}</p>
            </div>
          </div>
        </section>
      )}

      {selectedSubjectDetail && (
        <div
          onClick={() => setSelectedSubjectDetail(null)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 w-full max-w-sm border border-[#e5e5ea] shadow-xl flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#1c1c1e]">{selectedSubjectDetail.subject}</h3>
                <p className="text-xs text-[#8e8e93] mt-0.5">
                  {selectedSubjectDetail.percentage}% attendance ({selectedSubjectDetail.absentLessons} missed)
                </p>
              </div>
              <button
                onClick={() => setSelectedSubjectDetail(null)}
                className="w-7 h-7 rounded-full bg-[#f2f2f7] text-[#8e8e93] text-xs font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {selectedSubjectDetail.absences && selectedSubjectDetail.absences.length > 0 ? (
                selectedSubjectDetail.absences.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#f2f2f7] p-3 rounded-2xl flex flex-col gap-1.5 text-xs text-[#1c1c1e]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{item.date}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${item.isUnexcused
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}>
                        {item.type.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#8e8e93]">
                      <span>Lekcja {item.lessonNumber} {item.time ? `(${item.time})` : ''}</span>
                      <span>{item.typeName}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-[#8e8e93] py-4">{t.noAbsencesRecorded}</div>
              )}
            </div>
          </div>
        </div>
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
        currentLang={lang}
        onSelectLang={handleSelectLanguage}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        onSaveCredentials={handleSaveCredentials}
        onLogout={handleLogout}
        allAbsentTeachers={timetableData?.allAbsentTeachers || []}
        t={t}
      />
    </main>
  )
}