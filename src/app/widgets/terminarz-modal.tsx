'use client'

import { useState } from 'react'
import { SmartTimetableResult } from '@/models/timetable.model'
import { AppDictionary } from '@/config/dictionary.config'

interface TerminarzModalProps {
    isOpen: boolean
    onClose: () => void
    timetableData: SmartTimetableResult
    t: AppDictionary
}

interface ParsedEventItem {
    id: string
    day: number
    month: number
    year: number
    title: string
    category: 'absence' | 'shortened' | 'exam' | 'meeting' | 'holiday' | 'other'
    time?: string
}

export function TerminarzModal({
    isOpen,
    onClose,
    timetableData,
    t
}: TerminarzModalProps) {
    const [selectedMonth, setSelectedMonth] = useState(9)
    const [selectedYear, setSelectedYear] = useState(2026)
    const [selectedDay, setSelectedDay] = useState<number | null>(null)
    const [teacherSearch, setTeacherSearch] = useState('')

    if (!isOpen) return null

    const monthNames = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ]

    const parseAllEvents = (): ParsedEventItem[] => {
        const list: ParsedEventItem[] = []

        timetableData.allAbsentTeachers.forEach((teacher, idx) => {
            const parts = teacher.date.split('.')
            if (parts.length === 3) {
                const d = parseInt(parts[0], 10)
                const m = parseInt(parts[1], 10) - 1
                const y = parseInt(parts[2], 10)

                list.push({
                    id: `teacher-${idx}`,
                    day: d,
                    month: m,
                    year: y,
                    title: `Nieobecność: ${teacher.teacher}`,
                    category: 'absence',
                    time: teacher.reason && teacher.reason.includes('-') ? teacher.reason : undefined
                })
            }
        })

        timetableData.calendarEvents.forEach((ev, idx) => {
            const parts = ev.date.split('.')
            if (parts.length === 3) {
                const d = parseInt(parts[0], 10)
                const m = parseInt(parts[1], 10) - 1
                const y = parseInt(parts[2], 10)
                const lower = ev.title.toLowerCase()

                let cat: ParsedEventItem['category'] = 'other'
                if (lower.includes('skrócon') || lower.includes('skrocon')) cat = 'shortened'
                else if (lower.includes('sprawdzian') || lower.includes('praca klasowa') || lower.includes('test')) cat = 'exam'
                else if (lower.includes('rodzic') || lower.includes('spotkanie')) cat = 'meeting'
                else if (lower.includes('ferie') || lower.includes('wolne')) cat = 'holiday'

                list.push({
                    id: `cal-${idx}`,
                    day: d,
                    month: m,
                    year: y,
                    title: ev.title,
                    category: cat
                })
            }
        })

        return list
    }

    const allEvents = parseAllEvents()

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const firstDayWeekIndex = (new Date(selectedYear, selectedMonth, 1).getDay() + 6) % 7

    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const paddingArray = Array.from({ length: firstDayWeekIndex }, (_, i) => i)

    const getEventsForDay = (day: number) => {
        return allEvents.filter((ev) =>
            ev.day === day &&
            ev.month === selectedMonth &&
            ev.year === selectedYear &&
            (teacherSearch === '' || ev.title.toLowerCase().includes(teacherSearch.toLowerCase()))
        )
    }

    const shiftMonth = (delta: number) => {
        let nextMonth = selectedMonth + delta
        let nextYear = selectedYear
        if (nextMonth > 11) {
            nextMonth = 0
            nextYear++
        } else if (nextMonth < 0) {
            nextMonth = 11
            nextYear--
        }
        setSelectedMonth(nextMonth)
        setSelectedYear(nextYear)
        setSelectedDay(null)
    }

    const getCategoryColor = (cat: ParsedEventItem['category']) => {
        switch (cat) {
            case 'absence':
                return 'bg-[var(--ios-red)] text-white'
            case 'shortened':
                return 'bg-[var(--ios-orange)] text-white'
            case 'exam':
                return 'bg-[var(--ios-purple)] text-white'
            case 'meeting':
                return 'bg-[var(--ios-green)] text-white'
            case 'holiday':
                return 'bg-[var(--ios-teal)] text-white'
            default:
                return 'bg-[var(--ios-blue)] text-white'
        }
    }

    const activeDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

    return (
        <div className="fixed inset-0 z-50 bg-[var(--ios-bg)] flex flex-col animate-in fade-in duration-200">
            <header className="px-4 pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] pb-2.5 border-b border-[var(--ios-separator)] bg-[var(--ios-card)]/85 backdrop-blur-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => shiftMonth(-1)}
                        className="w-8 h-8 rounded-full bg-[var(--ios-element)]/70 text-[var(--ios-label)] flex items-center justify-center active:scale-95 transition-all"
                        aria-label="Previous month"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <span className="text-sm font-semibold text-[var(--ios-label)] tracking-tight">
                        {monthNames[selectedMonth]} {selectedYear}
                    </span>
                    <button
                        onClick={() => shiftMonth(1)}
                        className="w-8 h-8 rounded-full bg-[var(--ios-element)]/70 text-[var(--ios-label)] flex items-center justify-center active:scale-95 transition-all"
                        aria-label="Next month"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="text-xs font-semibold text-[var(--ios-blue)] active:opacity-70 px-2.5 py-1 rounded-full hover:bg-[var(--ios-blue-subtle)] transition-all"
                >
                    {t.done}
                </button>
            </header>

            <div className="p-3 bg-[var(--ios-bg)] border-b border-[var(--ios-separator)]/60">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        placeholder="Filtruj wydarzenia lub nauczycieli..."
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        className="w-full bg-[var(--ios-card)] text-xs text-[var(--ios-label)] placeholder-[var(--ios-secondary)] rounded-[12px] px-3.5 py-2 outline-none border border-[var(--ios-separator)]/60 focus:border-[var(--ios-blue)] transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 max-w-lg mx-auto w-full">
                <div className="bg-[var(--ios-card)] rounded-[20px] border border-[var(--ios-separator)]/60 overflow-hidden shadow-xs">
                    <div className="grid grid-cols-7 border-b border-[var(--ios-separator)] bg-[var(--ios-element)]/30 text-center py-2">
                        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'N'].map((d) => (
                            <span key={d} className="text-[10px] font-medium text-[var(--ios-secondary)] uppercase">
                                {d}
                            </span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 divide-x divide-y divide-[var(--ios-separator)]">
                        {paddingArray.map((i) => (
                            <div key={`pad-${i}`} className="min-h-[75px] bg-[var(--ios-element)]/15 opacity-40" />
                        ))}

                        {daysArray.map((day) => {
                            const dayEvents = getEventsForDay(day)
                            const isSelected = selectedDay === day

                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`min-h-[75px] p-1 flex flex-col gap-1 cursor-pointer transition-colors ${isSelected ? 'bg-[var(--ios-blue-subtle)]' : 'hover:bg-[var(--ios-element)]/20'
                                        }`}
                                >
                                    <span className={`text-[10px] font-semibold px-1 rounded-[4px] w-fit ${isSelected ? 'bg-[var(--ios-blue)] text-white' : 'text-[var(--ios-label)]'
                                        }`}>
                                        {day}
                                    </span>

                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                        {dayEvents.slice(0, 3).map((ev) => (
                                            <div
                                                key={ev.id}
                                                className={`text-[8px] font-medium px-1 py-0.5 rounded-[3px] truncate leading-tight ${getCategoryColor(ev.category)}`}
                                            >
                                                {ev.title}
                                            </div>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <span className="text-[8px] font-medium text-[var(--ios-secondary)] px-1">
                                                +{dayEvents.length - 3} więcej
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {selectedDay && (
                    <div className="bg-[var(--ios-card)] rounded-[20px] p-4 border border-[var(--ios-separator)]/60 shadow-xs flex flex-col gap-2.5">
                        <h4 className="text-xs font-semibold text-[var(--ios-label)]">
                            Wydarzenia: {selectedDay} {monthNames[selectedMonth]} {selectedYear}
                        </h4>

                        {activeDayEvents.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {activeDayEvents.map((ev) => (
                                    <div
                                        key={ev.id}
                                        className="p-3 rounded-[14px] bg-[var(--ios-element)]/35 border border-[var(--ios-separator)]/40 flex items-start justify-between gap-2.5"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-[var(--ios-label)] leading-snug break-words">{ev.title}</p>
                                            {ev.time && (
                                                <p className="text-[10px] font-normal text-[var(--ios-secondary)] mt-0.5">Godziny: {ev.time}</p>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${getCategoryColor(ev.category)}`}>
                                            {ev.category.toUpperCase()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs font-normal text-[var(--ios-secondary)] py-2">Brak zarejestrowanych wydarzeń w tym dniu</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}