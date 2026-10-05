'use client'

import { useState } from 'react'
import { SmartTimetableResult, AbsentTeacherItem } from '@/models/timetable.model'
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
                return 'bg-[#ff3b30] text-white'
            case 'shortened':
                return 'bg-[#ff2d55] text-white'
            case 'exam':
                return 'bg-[#a30029] text-white'
            case 'meeting':
                return 'bg-[#30d158] text-black font-bold'
            case 'holiday':
                return 'bg-[#ff9500] text-white'
            default:
                return 'bg-[var(--ios-blue)] text-white'
        }
    }

    const activeDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

    return (
        <div className="fixed inset-0 z-50 bg-[var(--ios-bg)] flex flex-col animate-in fade-in">
            <header className="px-4 pt-safe pt-3 pb-3 border-b border-[var(--ios-separator)]/20 bg-[var(--ios-card)]/80 backdrop-blur-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => shiftMonth(-1)}
                        className="w-8 h-8 rounded-full bg-[var(--ios-element)]/60 text-[var(--ios-label)] flex items-center justify-center font-bold text-xs active:scale-95"
                    >
                        ‹
                    </button>
                    <span className="text-sm font-extrabold text-[var(--ios-label)]">
                        {monthNames[selectedMonth]} {selectedYear}
                    </span>
                    <button
                        onClick={() => shiftMonth(1)}
                        className="w-8 h-8 rounded-full bg-[var(--ios-element)]/60 text-[var(--ios-label)] flex items-center justify-center font-bold text-xs active:scale-95"
                    >
                        ›
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="text-xs font-bold text-[var(--ios-blue)] active:opacity-70 px-2 py-1"
                >
                    {t.done}
                </button>
            </header>

            <div className="p-3 bg-[var(--ios-bg)] border-b border-[var(--ios-separator)]/20">
                <input
                    type="text"
                    placeholder="Filtruj wydarzenia lub nauczycieli..."
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    className="w-full bg-[var(--ios-card)] text-xs text-[var(--ios-label)] rounded-xl px-3.5 py-2 outline-none border border-[var(--ios-separator)]/30"
                />
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)]/20 overflow-hidden shadow-xs">
                    <div className="grid grid-cols-7 border-b border-[var(--ios-separator)]/20 bg-[var(--ios-element)]/30 text-center py-2">
                        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'N'].map((d) => (
                            <span key={d} className="text-[10px] font-bold text-[var(--ios-secondary)] uppercase">
                                {d}
                            </span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 divide-x divide-y divide-[var(--ios-separator)]/20">
                        {paddingArray.map((i) => (
                            <div key={`pad-${i}`} className="min-h-[75px] bg-[var(--ios-bg)]/40 opacity-30" />
                        ))}

                        {daysArray.map((day) => {
                            const dayEvents = getEventsForDay(day)
                            const isSelected = selectedDay === day

                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`min-h-[75px] p-1 flex flex-col gap-1 cursor-pointer transition-colors ${isSelected ? 'bg-[var(--ios-blue)]/10' : 'hover:bg-[var(--ios-element)]/20'
                                        }`}
                                >
                                    <span className={`text-[10px] font-black px-1 rounded-sm w-fit ${isSelected ? 'bg-[var(--ios-blue)] text-white' : 'text-[var(--ios-label)]'
                                        }`}>
                                        {day}
                                    </span>

                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                        {dayEvents.slice(0, 3).map((ev) => (
                                            <div
                                                key={ev.id}
                                                className={`text-[8px] font-bold px-1 py-0.5 rounded-xs truncate leading-tight ${getCategoryColor(ev.category)}`}
                                            >
                                                {ev.title}
                                            </div>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <span className="text-[8px] font-bold text-[var(--ios-secondary)] px-1">
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
                    <div className="bg-[var(--ios-card)] rounded-2xl p-4 border border-[var(--ios-separator)]/20 shadow-xs flex flex-col gap-2">
                        <h4 className="text-xs font-black text-[var(--ios-label)]">
                            Wydarzenia: {selectedDay} {monthNames[selectedMonth]} {selectedYear}
                        </h4>

                        {activeDayEvents.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {activeDayEvents.map((ev) => (
                                    <div
                                        key={ev.id}
                                        className="p-2.5 rounded-xl bg-[var(--ios-bg)] flex items-start justify-between gap-2"
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-[var(--ios-label)] leading-snug">{ev.title}</p>
                                            {ev.time && (
                                                <p className="text-[10px] text-[var(--ios-secondary)] mt-0.5">Godziny: {ev.time}</p>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getCategoryColor(ev.category)}`}>
                                            {ev.category.toUpperCase()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--ios-secondary)]">Brak zarejestrowanych wydarzeń w tym dniu</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}