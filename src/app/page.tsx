'use client'

import { useState, useEffect } from 'react'
import { getSmartTimetableAction, getStudentGradesAction } from './actions'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'
import { GradesResult, GradeItem } from '@/models/grade.model'

type MainSection = 'schedule' | 'grades' | 'absences'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [translate, setTranslate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<MainSection>('schedule')

  const [timetableData, setTimetableData] = useState<SmartTimetableResult | null>(null)
  const [gradesData, setGradesData] = useState<GradesResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>('Monday')
  const [selectedGrade, setSelectedGrade] = useState<GradeItem | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleSyncAll = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const [timetableRes, gradesRes] = await Promise.all([
        getSmartTimetableAction(username, password, translate),
        getStudentGradesAction(username, password, translate)
      ])

      if (timetableRes.success && timetableRes.data) {
        setTimetableData(timetableRes.data)
      }
      if (gradesRes.success && gradesRes.data) {
        setGradesData(gradesRes.data)
      }
      if (!timetableRes.success && !gradesRes.success) {
        setError(timetableRes.error || gradesRes.error || 'Failed to sync data')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
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
    <main className="min-h-screen pb-16 pt-safe px-4 max-w-lg mx-auto flex flex-col gap-5">
      <header className="pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1c1c1e]">Synapse</h1>
          <p className="text-xs text-[#8e8e93]">Librus Native Client</p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full shadow-xs border border-[#e5e5ea]">
          <span className="text-xs font-semibold text-[#1c1c1e]">EN</span>
          <input
            type="checkbox"
            {...{ switch: '' }}
            checked={translate}
            onChange={(e) => setTranslate(e.target.checked)}
            className="w-8 h-4 cursor-pointer"
          />
        </label>
      </header>

      <section className="bg-white rounded-2xl p-4 shadow-xs border border-[#e5e5ea]">
        <form onSubmit={handleSyncAll} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Login / ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#007aff]"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#007aff]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#007aff] text-white text-sm font-semibold py-2.5 rounded-xl active:opacity-80 disabled:opacity-50 transition-all shadow-xs"
          >
            {loading ? 'Synchronizing Synapse...' : 'Sync All Data'}
          </button>
        </form>

        {error && (
          <div className="mt-3 bg-red-50 text-red-600 p-2.5 rounded-xl text-xs font-medium border border-red-200">
            {error}
          </div>
        )}
      </section>

      {(timetableData || gradesData) && (
        <nav className="bg-[#e5e5ea] p-1 rounded-2xl flex gap-1 shadow-inner">
          <button
            onClick={() => setActiveSection('schedule')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeSection === 'schedule'
                ? 'bg-white text-[#1c1c1e] shadow-xs'
                : 'text-[#8e8e93]'
              }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveSection('grades')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeSection === 'grades'
                ? 'bg-white text-[#1c1c1e] shadow-xs'
                : 'text-[#8e8e93]'
              }`}
          >
            Grades {gradesData?.overallAverage ? `(${gradesData.overallAverage})` : ''}
          </button>
          <button
            onClick={() => setActiveSection('absences')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeSection === 'absences'
                ? 'bg-white text-[#1c1c1e] shadow-xs'
                : 'text-[#8e8e93]'
              }`}
          >
            Absences ({timetableData?.allAbsentTeachers.length || 0})
          </button>
        </nav>
      )}

      {activeSection === 'schedule' && timetableData && (
        <section className="flex flex-col gap-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {timetableData.schedule.map((day) => (
              <button
                key={day.dayName}
                onClick={() => setSelectedDay(day.dayName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedDay === day.dayName
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
                      <span className="text-xs font-semibold text-[#8e8e93] bg-[#f2f2f7] px-2 py-0.5 rounded-md">
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
                      <span className="text-xs font-semibold text-[#007aff] bg-blue-50 px-2 py-0.5 rounded-md shrink-0">
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
        <section className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
                Average GPA
              </p>
              <h2 className="text-3xl font-extrabold text-[#1c1c1e] tracking-tight mt-0.5">
                {gradesData.overallAverage ?? 'N/A'}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#007aff] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                {gradesData.subjects.length} Subjects
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {gradesData.subjects.map((sub) => (
              <article
                key={sub.subject}
                className="bg-white rounded-2xl p-4 border border-[#e5e5ea] shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#1c1c1e]">
                    {sub.subject}
                  </h3>
                  {sub.finalAverage !== null && (
                    <span className="text-xs font-bold text-[#1c1c1e] bg-[#f2f2f7] px-2 py-0.5 rounded-md">
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
                    <span className="text-xs text-[#8e8e93]">No grades</span>
                  )}
                </div>
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
                className="bg-white rounded-2xl p-4 border border-[#e5e5ea] shadow-xs flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1c1c1e]">
                    {absence.teacher}
                  </h3>
                  {absence.isRelevantToStudent && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                      My Teacher
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[#8e8e93]">
                  <span>{absence.date}</span>
                  <span>{absence.reason}</span>
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

      {selectedGrade && (
        <div
          onClick={() => setSelectedGrade(null)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in duration-150"
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