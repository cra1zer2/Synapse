'use client'

import { useState, useEffect } from 'react'
import {
  getSmartTimetableAction,
  getStudentGradesAction,
  getAttendanceAction
} from './actions'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'
import { GradesResult, GradeItem, SubjectGrades } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'

type MainSection = 'schedule' | 'grades' | 'attendance' | 'absences'

export default function Home() {
  const [mounted, setMounted] = useState(false)
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

  const [selectedDay, setSelectedDay] = useState<string>('Monday')
  const [selectedGrade, setSelectedGrade] = useState<GradeItem | null>(null)
  const [selectedWarningSubject, setSelectedWarningSubject] = useState<SubjectGrades | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    setMounted(true)

    const savedUser = localStorage.getItem('synapse_user') || ''
    const savedPass = localStorage.getItem('synapse_pass') || ''
    const savedLang = localStorage.getItem('synapse_lang') === 'en'

    setUsername(savedUser)
    setPassword(savedPass)
    setTranslate(savedLang)

    const cachedSnapshot = localStorage.getItem('synapse_cache')
    if (cachedSnapshot) {
      try {
        const parsed = JSON.parse(cachedSnapshot)
        if (parsed.t) setTimetableData(parsed.t)
        if (parsed.g) setGradesData(parsed.g)
        if (parsed.a) setAttendanceData(parsed.a)
      } catch { }
    }

    if (savedUser && savedPass) {
      performBackgroundSync(savedUser, savedPass, savedLang)
    }
  }, [])

  const performBackgroundSync = async (u: string, p: string, tr: boolean) => {
    setIsUpdating(true)
    try {
      const [tRes, gRes, aRes] = await Promise.all([
        getSmartTimetableAction(u, p, tr),
        getStudentGradesAction(u, p, tr),
        getAttendanceAction(u, p)
      ])

      if (tRes.success && gRes.success && aRes.success && tRes.data && gRes.data && aRes.data) {
        const newSnapshot = { t: tRes.data, g: gRes.data, a: aRes.data }
        const oldCache = localStorage.getItem('synapse_cache')

        if (!oldCache) {
          setTimetableData(newSnapshot.t)
          setGradesData(newSnapshot.g)
          setAttendanceData(newSnapshot.a)
          localStorage.setItem('synapse_cache', JSON.stringify(newSnapshot))
        } else {
          const oldString = JSON.stringify(JSON.parse(oldCache))
          const newString = JSON.stringify(newSnapshot)

          if (oldString !== newString) {
            setPendingSnapshot(newSnapshot)
            setHasNewUpdate(true)
          }
        }
      }
    } catch { } finally {
      setIsUpdating(false)
    }
  }

  const applyPendingUpdates = () => {
    if (pendingSnapshot) {
      setTimetableData(pendingSnapshot.t)
      setGradesData(pendingSnapshot.g)
      setAttendanceData(pendingSnapshot.a)
      localStorage.setItem('synapse_cache', JSON.stringify(pendingSnapshot))
      setPendingSnapshot(null)
      setHasNewUpdate(false)
    }
  }

  const handleInitialLogin = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('synapse_user', username)
    localStorage.setItem('synapse_pass', password)
    localStorage.setItem('synapse_lang', translate ? 'en' : 'pl')
    setShowSettings(false)
    performBackgroundSync(username, password, translate)
  }

  const handleToggleLanguage = (checked: boolean) => {
    setTranslate(checked)
    localStorage.setItem('synapse_lang', checked ? 'en' : 'pl')
    if (username && password) {
      performBackgroundSync(username, password, checked)
    }
  }

  if (!mounted) {
    return null
  }

  const currentDaySchedule: DaySchedule | undefined = timetableData?.schedule.find(
    (d) => d.dayName === selectedDay
  )

  const getGradeBadgeStyle = (numeric: number | null) => {
    if (numeric === null) {
      return 'bg-gray-100 text-gray-700 border-gray-200'
    }
    if (numeric >= 5) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
    if (numeric >= 4) {
      return 'bg-blue-50 text-blue-700 border-blue-200'
    }
    if (numeric >= 3) {
      return 'bg-amber-50 text-amber-700 border-amber-200'
    }
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }

  return (
    <main className="min-h-screen pb-20 pt-safe px-4 max-w-lg mx-auto flex flex-col gap-4">
      <header className="pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1c1c1e]">Synapse</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
              <p className="text-[11px] text-[#8e8e93]">
                {isUpdating ? 'Refreshing background...' : 'Synced offline-first'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-full shadow-xs border border-[#e5e5ea]">
            <span className="text-xs font-semibold text-[#1c1c1e]">EN</span>
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
          className="bg-[#007aff] text-white p-3 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer active:opacity-90 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">✨</span>
            <p className="text-xs font-semibold">New changes detected on Librus</p>
          </div>
          <span className="text-xs font-bold underline bg-white/20 px-2.5 py-1 rounded-xl">
            Update Now
          </span>
        </div>
      )}

      {gradesData?.globalWarning && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs font-bold text-center">
          💀 {gradesData.globalWarning}
        </div>
      )}

      {showSettings && (
        <section className="bg-white rounded-3xl p-5 shadow-xs border border-[#e5e5ea] flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[#1c1c1e]">Librus Credentials</h2>
          <form onSubmit={handleInitialLogin} className="flex flex-col gap-2.5">
            <input
              type="text"
              placeholder="Login / ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
              required
            />
            <button
              type="submit"
              className="w-full bg-[#1c1c1e] text-white text-xs font-bold py-2.5 rounded-xl active:opacity-80 transition-all"
            >
              Save Credentials
            </button>
          </form>
        </section>
      )}

      {(!timetableData && !gradesData && !username) && (
        <section className="bg-white rounded-3xl p-6 shadow-xs border border-[#e5e5ea] flex flex-col gap-4 text-center">
          <div>
            <h2 className="text-lg font-extrabold text-[#1c1c1e]">Welcome to Synapse</h2>
            <p className="text-xs text-[#8e8e93] mt-1">Enter your account once. Data will be saved locally.</p>
          </div>
          <form onSubmit={handleInitialLogin} className="flex flex-col gap-2.5">
            <input
              type="text"
              placeholder="Login / ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
              required
            />
            <button
              type="submit"
              className="w-full bg-[#007aff] text-white text-xs font-bold py-3 rounded-xl active:opacity-80 transition-all shadow-xs"
            >
              Connect & Save
            </button>
          </form>
        </section>
      )}

      <nav className="bg-[#e5e5ea] p-1 rounded-2xl flex gap-1 shadow-inner">
        <button
          onClick={() => setActiveSection('schedule')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeSection === 'schedule' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          Schedule
        </button>
        <button
          onClick={() => setActiveSection('grades')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeSection === 'grades' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          Grades {gradesData?.overallAverage ? `(${gradesData.overallAverage})` : ''}
        </button>
        <button
          onClick={() => setActiveSection('attendance')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeSection === 'attendance' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          Frekwencja
        </button>
        <button
          onClick={() => setActiveSection('absences')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeSection === 'absences' ? 'bg-white text-[#1c1c1e] shadow-xs' : 'text-[#8e8e93]'
            }`}
        >
          Teachers ({timetableData?.allAbsentTeachers.length || 0})
        </button>
      </nav>

      {activeSection === 'schedule' && timetableData && (
        <section className="flex flex-col gap-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {timetableData.schedule.map((day) => (
              <button
                key={day.dayName}
                onClick={() => setSelectedDay(day.dayName)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedDay === day.dayName
                    ? 'bg-[#1c1c1e] text-white shadow-xs'
                    : 'bg-white text-[#8e8e93] border border-[#e5e5ea]'
                  }`}
              >
                {day.dayName.slice(0, 3)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {currentDaySchedule && currentDaySchedule.lessons.length > 0 ? (
              currentDaySchedule.lessons.map((lesson) => (
                <article
                  key={`${lesson.number}-${lesson.subject}-${lesson.time}`}
                  className="bg-white rounded-2xl p-4 border border-[#e5e5ea] shadow-xs flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#8e8e93] bg-[#f2f2f7] px-2.5 py-1 rounded-lg">
                        {lesson.time}
                      </span>
                      {lesson.lessonCount && lesson.lessonCount > 1 && (
                        <span className="text-[10px] font-bold text-[#007aff] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {lesson.lessonCount}x
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {lesson.isShortened && (
                        <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                          {lesson.durationMinutes} min
                        </span>
                      )}
                      {lesson.isCancelled && (
                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                          Cancelled
                        </span>
                      )}
                      {lesson.isSubstitution && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                          Substitution
                        </span>
                      )}
                      {lesson.teacherAbsent && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                          Teacher Absent
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-[#1c1c1e] leading-snug">
                      {lesson.subject}
                    </h2>
                    {lesson.room && (
                      <span className="text-xs font-semibold text-[#007aff] bg-blue-50 px-2.5 py-1 rounded-lg shrink-0">
                        {lesson.room}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-[#8e8e93]">
                    {lesson.teacher || 'No teacher specified'}
                  </p>
                </article>
              ))
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-[#e5e5ea] text-center text-[#8e8e93] text-sm font-medium">
                No scheduled lessons for this day
              </div>
            )}
          </div>
        </section>
      )}

      {activeSection === 'grades' && gradesData && (
        <section className="flex flex-col gap-3">
          <div className="bg-white rounded-3xl p-5 border border-[#e5e5ea] shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-wider">Overall GPA</p>
              <h2 className="text-3xl font-extrabold text-[#1c1c1e] mt-0.5">
                {gradesData.overallAverage ?? 'N/A'}
              </h2>
            </div>
            <span className="text-xs font-bold text-[#007aff] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
              {gradesData.subjects.length} Subjects
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {gradesData.subjects.map((sub) => (
              <article
                key={sub.subject}
                className="bg-white rounded-2xl p-4 border border-[#e5e5ea] shadow-xs flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#1c1c1e]">{sub.subject}</h3>
                    {sub.warning && (
                      <button
                        onClick={() => setSelectedWarningSubject(sub)}
                        className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse"
                      >
                        Risk &lt; 2.0
                      </button>
                    )}
                  </div>

                  {sub.finalAverage !== null && (
                    <span className="text-xs font-extrabold text-[#1c1c1e] bg-[#f2f2f7] px-2.5 py-1 rounded-lg">
                      {sub.finalAverage}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {sub.semester1.concat(sub.semester2).map((item, idx) => (
                    <button
                      key={`${item.grade}-${item.date}-${idx}`}
                      onClick={() => setSelectedGrade(item)}
                      className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center border transition-transform active:scale-95 ${getGradeBadgeStyle(
                        item.numericValue
                      )}`}
                    >
                      {item.grade}
                    </button>
                  ))}
                  {sub.semester1.length === 0 && sub.semester2.length === 0 && (
                    <span className="text-xs text-[#8e8e93]">No grades recorded</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeSection === 'attendance' && attendanceData && (
        <section className="flex flex-col gap-3">
          <div className="bg-white rounded-3xl p-5 border border-[#e5e5ea] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-wider">Attendance Rate</p>
                <h2 className={`text-3xl font-extrabold mt-0.5 ${attendanceData.overall.isAtRisk ? 'text-rose-600' : 'text-[#1c1c1e]'}`}>
                  {attendanceData.overall.attendancePercentage}%
                </h2>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${attendanceData.overall.isAtRisk
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                {attendanceData.overall.isAtRisk ? 'Risk < 50%' : 'Safe'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e5e5ea] text-xs">
              <div className="bg-[#f2f2f7] p-2.5 rounded-xl">
                <p className="text-[#8e8e93]">Safe to miss</p>
                <p className="font-extrabold text-[#1c1c1e] text-sm mt-0.5">
                  {attendanceData.overall.safeAbsencesRemaining} lessons
                </p>
              </div>
              <div className="bg-[#f2f2f7] p-2.5 rounded-xl">
                <p className="text-[#8e8e93]">Needed to recover</p>
                <p className="font-extrabold text-[#1c1c1e] text-sm mt-0.5">
                  {attendanceData.overall.lessonsToRecover} lessons
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {attendanceData.subjects.map((sub) => (
              <article
                key={sub.subject}
                className="bg-white rounded-2xl p-3.5 border border-[#e5e5ea] shadow-xs flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-[#1c1c1e]">{sub.subject}</h4>
                  <p className="text-[11px] text-[#8e8e93] mt-0.5">
                    {sub.absentLessons} missed of {sub.totalLessons}
                  </p>
                </div>
                <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${sub.isAtRisk
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-[#f2f2f7] text-[#1c1c1e] border-transparent'
                  }`}>
                  {sub.percentage}%
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeSection === 'absences' && timetableData && (
        <section className="flex flex-col gap-2.5">
          {timetableData.allAbsentTeachers.length > 0 ? (
            timetableData.allAbsentTeachers.map((absence, idx) => (
              <article
                key={`${absence.teacher}-${absence.date}-${idx}`}
                className="bg-white rounded-2xl p-4 border border-[#e5e5ea] shadow-xs flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1c1c1e]">{absence.teacher}</h3>
                  {absence.isRelevantToStudent && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                      My Teacher
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[#8e8e93]">
                  <span className="font-semibold bg-[#f2f2f7] px-2 py-0.5 rounded-md text-[#1c1c1e]">
                    {absence.date}
                  </span>
                  <span className="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                    {absence.reason}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-[#e5e5ea] text-center text-[#8e8e93] text-sm font-medium">
              No recorded teacher absences
            </div>
          )}
        </section>
      )}

      {selectedWarningSubject && selectedWarningSubject.warning && (
        <div
          onClick={() => setSelectedWarningSubject(null)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 w-full max-w-sm border border-[#e5e5ea] shadow-xl flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-xl">
                Minimal Effort To Fix
              </span>
              <span className="text-sm font-extrabold text-[#1c1c1e]">
                Current: {selectedWarningSubject.finalAverage}
              </span>
            </div>

            <h3 className="text-base font-extrabold text-[#1c1c1e]">
              {selectedWarningSubject.subject}
            </h3>

            {selectedWarningSubject.warning.status === 'done' ? (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-center">
                <p className="text-lg font-black text-rose-700">You are done</p>
                <p className="text-xs text-rose-600 mt-1">Weighted score too deep to reach 2.0</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-[#8e8e93]">Recommended targets to reach 2.0:</p>
                {selectedWarningSubject.warning.fixOptions.map((opt, i) => (
                  <div key={i} className="bg-[#f2f2f7] p-2.5 rounded-xl text-xs font-medium text-[#1c1c1e] flex items-center gap-2">
                    <span className="text-emerald-600 font-extrabold">✓</span>
                    <span>{opt.description}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedWarningSubject(null)}
              className="mt-2 w-full bg-[#1c1c1e] text-white text-xs font-bold py-2.5 rounded-xl active:opacity-80 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {selectedGrade && (
        <div
          onClick={() => setSelectedGrade(null)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 w-full max-w-sm border border-[#e5e5ea] shadow-xl flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className={`text-xl font-extrabold px-3 py-1 rounded-2xl border ${getGradeBadgeStyle(selectedGrade.numericValue)}`}>
                {selectedGrade.grade}
              </span>
              <span className="text-xs font-semibold text-[#8e8e93] bg-[#f2f2f7] px-2.5 py-1 rounded-lg">
                Weight: {selectedGrade.weight}
              </span>
            </div>

            <div>
              <h4 className="text-base font-bold text-[#1c1c1e]">{selectedGrade.category}</h4>
              {selectedGrade.description && (
                <p className="text-xs text-[#8e8e93] mt-0.5">{selectedGrade.description}</p>
              )}
            </div>

            <div className="border-t border-[#e5e5ea] pt-2 flex flex-col gap-1 text-xs text-[#8e8e93]">
              <div className="flex justify-between">
                <span>Teacher:</span>
                <span className="font-medium text-[#1c1c1e]">{selectedGrade.teacher || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium text-[#1c1c1e]">{selectedGrade.date || 'Not specified'}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedGrade(null)}
              className="mt-2 w-full bg-[#1c1c1e] text-white text-xs font-bold py-2.5 rounded-xl active:opacity-80 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  )
}