'use client'

import { useState, useEffect } from 'react'
import { getSmartTimetableAction } from './actions'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [translate, setTranslate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [timetableData, setTimetableData] = useState<SmartTimetableResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'schedule' | 'absences'>('schedule')
  const [selectedDay, setSelectedDay] = useState<string>('Monday')

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleFetchTimetable = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await getSmartTimetableAction(username, password, translate)
      if (res.success && res.data) {
        setTimetableData(res.data)
      } else {
        setError(res.error || 'Failed to fetch timetable')
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

  return (
    <main className="min-h-screen pb-12 pt-safe px-4 max-w-lg mx-auto flex flex-col gap-5">
      <header className="pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1c1c1e]">Synapse</h1>
          <p className="text-xs text-[#8e8e93]">Smart Timetable & Gateway</p>
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
        <form onSubmit={handleFetchTimetable} className="flex flex-col gap-3">
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
            {loading ? 'Updating Schedule...' : 'Sync Timetable'}
          </button>
        </form>

        {error && (
          <div className="mt-3 bg-red-50 text-red-600 p-2.5 rounded-xl text-xs font-medium border border-red-200">
            {error}
          </div>
        )}
      </section>

      {timetableData && (
        <section className="flex flex-col gap-4">
          <div className="bg-[#e5e5ea] p-0.5 rounded-xl flex">
            <button
              onClick={() => setViewMode('schedule')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'schedule'
                  ? 'bg-white text-[#1c1c1e] shadow-xs'
                  : 'text-[#8e8e93]'
                }`}
            >
              My Lessons
            </button>
            <button
              onClick={() => setViewMode('absences')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'absences'
                  ? 'bg-white text-[#1c1c1e] shadow-xs'
                  : 'text-[#8e8e93]'
                }`}
            >
              All Absent Teachers ({timetableData.allAbsentTeachers.length})
            </button>
          </div>

          {viewMode === 'schedule' && (
            <div className="flex flex-col gap-3">
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
                        <span className="text-xs font-semibold text-[#8e8e93] bg-[#f2f2f7] px-2 py-0.5 rounded-md">
                          {lesson.time}
                        </span>

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
            </div>
          )}

          {viewMode === 'absences' && (
            <div className="flex flex-col gap-2.5">
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
                  No recorded teacher absences in school calendar
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}