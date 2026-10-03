'use client'

import { useState, useEffect } from 'react'
import {
  getSmartTimetableAction,
  getStudentGradesAction,
  getAttendanceAction,
  createJustificationAction
} from './actions'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'
import { GradesResult, GradeItem, SubjectGrades } from '@/models/grade.model'
import { AttendanceResult, SubjectAttendance, AbsenceDetail } from '@/models/attendance.model'
import { getDictionary } from '@/config/dictionary.config'

import { ScheduleWidget } from './schedule-widget'
import { GradesWidget } from './grades-widget'
import { AttendanceWidget } from './attendance-widget'
import { TeachersWidget } from './teachers-widget'
import { JustificationModal } from './justification-modal'
import { GradeModal } from './grade-modal'

type MainSection = 'schedule' | 'grades' | 'attendance' | 'teachers'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [translate, setTranslate] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [hasNewUpdate, setHasNewUpdate] = useState(false)
  const [activeSection, setActiveSection] = useState<MainSection>('schedule')

  const [timetableData, setTimetableData] = useState<SmartTimetableResult | null>(null)
  const [gradesData, setGradesData] = useState<GradesResult | null>(null)
  const [attendanceData, setAttendanceData] = useState<AttendanceResult | null>(null)

  const [pendingSnapshot, setPendingSnapshot] = useState<{
    t: SmartTimetableResult
    g: GradesResult
    a: AttendanceResult
  } | null>(null)

  const [currentWeekPivot, setCurrentWeekPivot] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const [selectedDay, setSelectedDay] = useState<string>('Monday')
  const [selectedGrade, setSelectedGrade] = useState<GradeItem | null>(null)
  const [selectedWarningSubject, setSelectedWarningSubject] = useState<SubjectGrades | null>(null)
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectAttendance | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [teacherSearch, setTeacherSearch] = useState('')
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [showAllDates, setShowAllDates] = useState(false)
  const [justifyingAbsence, setJustifyingAbsence] = useState<AbsenceDetail | null>(null)

  const t = getDictionary(translate)

  const resolveSmartDefaultDay = (schedule: DaySchedule[]): string => {
    if (!Array.isArray(schedule) || schedule.length === 0) {
      return 'Monday'
    }

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
  }

  useEffect(() => {
    setMounted(true)

    const savedUser = localStorage.getItem('synapse_user') || ''
    const savedPass = localStorage.getItem('synapse_pass') || ''
    const savedLang = localStorage.getItem('synapse_lang') === 'en'

    setUsername(savedUser)
    setPassword(savedPass)
    setTranslate(savedLang)
    setIsConfigured(Boolean(savedUser && savedPass))

    const cachedSnapshot = localStorage.getItem('synapse_cache')
    if (cachedSnapshot) {
      try {
        const parsed = JSON.parse(cachedSnapshot)
        if (parsed.t && Array.isArray(parsed.t.schedule)) {
          const sanitizedSchedule = parsed.t.schedule.map((d: any) => ({
            ...d,
            date: d.date || '',
            isoDate: d.isoDate || '',
            events: Array.isArray(d.events) ? d.events : [],
            lessons: Array.isArray(d.lessons) ? d.lessons : []
          }))

          const sanitizedTimetable: SmartTimetableResult = {
            ...parsed.t,
            schedule: sanitizedSchedule,
            allAbsentTeachers: Array.isArray(parsed.t.allAbsentTeachers) ? parsed.t.allAbsentTeachers : [],
            calendarEvents: Array.isArray(parsed.t.calendarEvents) ? parsed.t.calendarEvents : []
          }

          setTimetableData(sanitizedTimetable)
          setSelectedDay(resolveSmartDefaultDay(sanitizedSchedule))
        }
        if (parsed.g) setGradesData(parsed.g)
        if (parsed.a) setAttendanceData(parsed.a)
      } catch { }
    }

    if (savedUser && savedPass) {
      performBackgroundSync(savedUser, savedPass, savedLang, currentWeekPivot)
    }
  }, [])

  const performBackgroundSync = async (u: string, p: string, tr: boolean, weekPivot: string) => {
    setIsUpdating(true)
    try {
      const [tRes, gRes, aRes] = await Promise.all([
        getSmartTimetableAction(u, p, tr, weekPivot),
        getStudentGradesAction(u, p, tr),
        getAttendanceAction(u, p, tr)
      ])

      if (tRes.success && gRes.success && aRes.success && tRes.data && gRes.data && aRes.data) {
        const newSnapshot = { t: tRes.data, g: gRes.data, a: aRes.data }
        const oldCache = localStorage.getItem('synapse_cache')

        if (!oldCache) {
          setTimetableData(newSnapshot.t)
          setSelectedDay(resolveSmartDefaultDay(newSnapshot.t.schedule))
          setGradesData(newSnapshot.g)
          setAttendanceData(newSnapshot.a)
          localStorage.setItem('synapse_cache', JSON.stringify(newSnapshot))
        } else {
          const oldString = JSON.stringify(JSON.parse(oldCache))
          const newString = JSON.stringify(newSnapshot)

          if (oldString !== newString) {
            setPendingSnapshot(newSnapshot)
            setHasNewUpdate(true)
          } else {
            setTimetableData(newSnapshot.t)
          }
        }
      }
    } catch { } finally {
      setIsUpdating(false)
    }
  }

  const shiftWeek = (deltaDays: number) => {
    const current = new Date(currentWeekPivot)
    current.setDate(current.getDate() + deltaDays)
    const newPivot = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
    setCurrentWeekPivot(newPivot)
    if (username && password) {
      performBackgroundSync(username, password, translate, newPivot)
    }
  }

  const applyPendingUpdates = () => {
    if (pendingSnapshot) {
      setTimetableData(pendingSnapshot.t)
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
    localStorage.setItem('synapse_lang', translate ? 'en' : 'pl')
    setIsConfigured(true)
    setShowSettings(false)
    performBackgroundSync(username, password, translate, currentWeekPivot)
  }

  const handleToggleLanguage = (checked: boolean) => {
    setTranslate(checked)
    localStorage.setItem('synapse_lang', checked ? 'en' : 'pl')
    if (username && password) {
      performBackgroundSync(username, password, checked, currentWeekPivot)
    }
  }

  const handleSubmitJustification = async (parentMsg: string): Promise<boolean> => {
    if (!justifyingAbsence) return false
    try {
      const isoDate = justifyingAbsence.date.includes('.')
        ? justifyingAbsence.date.split('.').reverse().join('-')
        : justifyingAbsence.date

      const res = await createJustificationAction(username, password, {
        dateFrom: isoDate,
        dateTo: isoDate,
        lessons: [justifyingAbsence.lessonNumber],
        messageFromParent: parentMsg,
        sendNotify: false
      })

      if (res.success) {
        performBackgroundSync(username, password, translate, currentWeekPivot)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <main className="min-h-screen pb-20 pt-safe px-4 max-w-xl mx-auto flex flex-col gap-4">
      <header className="pt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#1c1c1e]">Synapse</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
            <p className="text-[11px] font-medium text-[#8e8e93]">
              {isUpdating ? 'Synchronizing...' : 'Synced offline-first'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-full shadow-xs border border-[#e5e5ea]">
            <span className="text-xs font-bold text-[#1c1c1e]">EN</span>
            <input
              type="checkbox"
              {...{ switch: '' }}
              checked={translate}
              onChange={(e) => handleToggleLanguage(e.target.checked)}
              className="w-8 h-4 cursor-pointer"
            />
          </label>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-8 h-8 rounded-full bg-white border border-[#e5e5ea] flex items-center justify-center text-[#1c1c1e] text-xs font-bold shadow-xs active:scale-95"
          >
            ⚙
          </button>
        </div>
      </header>

      {hasNewUpdate && (
        <div
          onClick={applyPendingUpdates}
          className="bg-[#007aff] text-white p-4 rounded-3xl shadow-md flex items-center justify-between cursor-pointer active:opacity-95 transition-all animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">✨</span>
            <div>
              <p className="text-xs font-extrabold">{t.newChanges}</p>
              <p className="text-[11px] opacity-80 mt-0.5">Click to load fresh timetable and grades</p>
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

      {showSettings && (
        <section className="bg-white rounded-3xl p-5 shadow-xs border border-[#e5e5ea] flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[#1c1c1e]">{t.settingsTitle}</h2>
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
              className="w-full bg-[#1c1c1e] text-white text-xs font-bold py-3 rounded-xl active:opacity-80 transition-all shadow-xs"
            >
              {t.saveCreds}
            </button>
          </form>
        </section>
      )}

      {!isConfigured && !showSettings && (
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

      <nav className="bg-[#e5e5ea] p-1 rounded-2xl grid grid-cols-4 gap-1.5 shadow-inner">
        <button
          onClick={() => setActiveSection('schedule')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all text-center ${activeSection === 'schedule' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          {t.schedule}
        </button>
        <button
          onClick={() => setActiveSection('grades')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all text-center ${activeSection === 'grades' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          {t.grades}
        </button>
        <button
          onClick={() => setActiveSection('attendance')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all text-center ${activeSection === 'attendance' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          {t.attendance}
        </button>
        <button
          onClick={() => setActiveSection('teachers')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all text-center ${activeSection === 'teachers' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          {t.teachers}
        </button>
      </nav>

      {activeSection === 'schedule' && timetableData && (
        <ScheduleWidget
          timetableData={timetableData}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          currentWeekPivot={currentWeekPivot}
          onShiftWeek={shiftWeek}
          onSelectDate={(iso) => {
            setCurrentWeekPivot(iso)
            if (username && password) {
              performBackgroundSync(username, password, translate, iso)
            }
          }}
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
          t={t}
        />
      )}

      {activeSection === 'teachers' && timetableData && (
        <TeachersWidget
          allAbsentTeachers={timetableData.allAbsentTeachers}
          teacherSearch={teacherSearch}
          onSearchChange={setTeacherSearch}
          selectedCalendarDate={selectedCalendarDate}
          onDateChange={(val) => {
            setSelectedCalendarDate(val)
            setShowAllDates(false)
          }}
          showAllDates={showAllDates}
          onToggleShowAllDates={() => setShowAllDates(!showAllDates)}
          t={t}
        />
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

                    {item.isUnexcused && (
                      <button
                        onClick={() => {
                          setSelectedSubjectDetail(null)
                          setJustifyingAbsence(item)
                        }}
                        className="mt-1 w-full bg-[#007aff] text-white text-xs font-bold py-2 rounded-xl active:opacity-80 transition-all shadow-xs"
                      >
                        {t.excuseAction}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-[#8e8e93] py-4">{t.noAbsencesRecorded}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {justifyingAbsence && (
        <JustificationModal
          absence={justifyingAbsence}
          onClose={() => setJustifyingAbsence(null)}
          onSubmit={handleSubmitJustification}
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
    </main>
  )
}