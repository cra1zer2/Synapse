'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'
import { GradesResult } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'
import { AppLanguage } from '@/config/dictionary.config'
import {
    getSmartTimetableAction,
    getStudentGradesAction,
    getAttendanceAction
} from '@/app/actions'

function getTodayIsoString(): string {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function getTodayDayName(): string {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const name = dayMap[new Date().getDay()]
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(name) ? name : 'Monday'
}

function normalizeToMondayIso(dateStr: string): string {
    const parts = dateStr.split('-').map(Number)
    const date = new Date(parts[0], parts[1] - 1, parts[2])
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    date.setDate(date.getDate() + diff)
    const ny = date.getFullYear()
    const nm = String(date.getMonth() + 1).padStart(2, '0')
    const nd = String(date.getDate()).padStart(2, '0')
    return `${ny}-${nm}-${nd}`
}

function getInitialWeekPivot(): string {
    return normalizeToMondayIso(getTodayIsoString())
}

function recalibrateScheduleToday(schedule: DaySchedule[]): DaySchedule[] {
    const realTodayIso = getTodayIsoString()
    return schedule.map((d) => ({
        ...d,
        isToday: d.isoDate === realTodayIso
    }))
}

function getScheduleFingerprint(timetable: SmartTimetableResult | null): string {
    if (!timetable || !Array.isArray(timetable.schedule)) return ''
    return timetable.schedule.map((day) => {
        const lessons = day.lessons.map((l) => `${l.number}:${l.time}:${l.subject}:${l.room}:${l.teacher}:${l.isCancelled}:${l.isSubstitution}`).join('|')
        const events = (day.events || []).map((e) => `${e.title}:${e.category}`).join('|')
        return `${day.isoDate}-${lessons}-${events}`
    }).join('__')
}

interface UseTimetableSyncOptions {
    username: string
    password: string
    lang: AppLanguage
    isConfigured: boolean
}

export function useTimetableSync({ username, password, lang, isConfigured }: UseTimetableSyncOptions) {
    const [isUpdating, setIsUpdating] = useState(false)
    const [isLoadingWeek, setIsLoadingWeek] = useState(false)
    const [hasNewUpdate, setHasNewUpdate] = useState(false)
    const [currentWeekPivot, setCurrentWeekPivot] = useState(getInitialWeekPivot)

    const [timetableData, setTimetableData] = useState<SmartTimetableResult | null>(null)
    const [todayTimetableData, setTodayTimetableData] = useState<SmartTimetableResult | null>(null)
    const [gradesData, setGradesData] = useState<GradesResult | null>(null)
    const [attendanceData, setAttendanceData] = useState<AttendanceResult | null>(null)
    const [selectedDay, setSelectedDay] = useState<string>(getTodayDayName)

    const [pendingSnapshot, setPendingSnapshot] = useState<{
        t: SmartTimetableResult
        g: GradesResult
        a: AttendanceResult
    } | null>(null)

    const weekCacheRef = useRef<Record<string, SmartTimetableResult>>({})
    const activeRequestCounter = useRef(0)
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const hasInitializedRef = useRef(false)

    const resolveSmartDefaultDay = useCallback((schedule: DaySchedule[]): string => {
        if (!Array.isArray(schedule) || schedule.length === 0) return 'Monday'

        const realTodayIso = getTodayIsoString()
        const todayMatch = schedule.find((d) => d.isoDate === realTodayIso)
        if (todayMatch) return todayMatch.dayName

        const weekdaysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        for (const day of weekdaysOrder) {
            const match = schedule.find((d) => d.dayName === day && d.lessons.length > 0)
            if (match) return day
        }

        return schedule[0]?.dayName || 'Monday'
    }, [])

    const executeSync = useCallback(
        async (u: string, p: string, currentAppLang: AppLanguage, rawPivot: string, silentUpdate: boolean) => {
            const weekPivot = normalizeToMondayIso(rawPivot)
            const todayMonday = normalizeToMondayIso(getTodayIsoString())
            const isTargetTodayWeek = weekPivot === todayMonday
            const requestId = ++activeRequestCounter.current

            if (!silentUpdate) {
                setIsLoadingWeek(true)
            }
            setIsUpdating(true)

            try {
                const shouldTranslate = currentAppLang === 'en'
                const [tRes, gRes, aRes] = await Promise.all([
                    getSmartTimetableAction(u, p, shouldTranslate, weekPivot),
                    getStudentGradesAction(u, p, shouldTranslate),
                    getAttendanceAction(u, p, shouldTranslate)
                ])

                if (requestId !== activeRequestCounter.current) return

                if (tRes.success && gRes.success && aRes.success && tRes.data && gRes.data && aRes.data) {
                    const recalibratedSchedule = recalibrateScheduleToday(tRes.data.schedule)
                    const fetchedData: SmartTimetableResult = {
                        ...tRes.data,
                        schedule: recalibratedSchedule
                    }

                    const previousDataForThisWeek = weekCacheRef.current[weekPivot]
                    const currentFingerprint = getScheduleFingerprint(previousDataForThisWeek)
                    const newFingerprint = getScheduleFingerprint(fetchedData)

                    weekCacheRef.current[weekPivot] = fetchedData
                    if (isTargetTodayWeek) {
                        setTodayTimetableData(fetchedData)
                    }

                    if (typeof window !== 'undefined') {
                        localStorage.setItem('synapse_week_cache', JSON.stringify(weekCacheRef.current))
                    }

                    setGradesData(gRes.data)
                    setAttendanceData(aRes.data)

                    if (hasInitializedRef.current && previousDataForThisWeek && currentFingerprint !== newFingerprint) {
                        setPendingSnapshot({ t: fetchedData, g: gRes.data, a: aRes.data })
                        setHasNewUpdate(true)
                    } else {
                        hasInitializedRef.current = true
                        setTimetableData(fetchedData)
                        setSelectedDay((prev) => {
                            const realTodayIso = getTodayIsoString()
                            const currentToday = fetchedData.schedule.find((d) => d.isoDate === realTodayIso)
                            if (currentToday) return currentToday.dayName
                            const hasPrev = fetchedData.schedule.some((d) => d.dayName === prev && d.lessons.length > 0)
                            return hasPrev ? prev : resolveSmartDefaultDay(fetchedData.schedule)
                        })

                        const newSnapshot = { t: fetchedData, g: gRes.data, a: aRes.data }
                        if (typeof window !== 'undefined') {
                            localStorage.setItem('synapse_cache', JSON.stringify(newSnapshot))
                        }
                    }
                }
            } finally {
                if (requestId === activeRequestCounter.current) {
                    setIsLoadingWeek(false)
                    setIsUpdating(false)
                }
            }
        },
        [resolveSmartDefaultDay]
    )

    useEffect(() => {
        if (!isConfigured || !username || !password) return

        const todayMonday = normalizeToMondayIso(getTodayIsoString())

        if (typeof window !== 'undefined') {
            const storedWeekCache = localStorage.getItem('synapse_week_cache')
            if (storedWeekCache) {
                try {
                    const parsedWeekCache = JSON.parse(storedWeekCache)
                    for (const key of Object.keys(parsedWeekCache)) {
                        if (parsedWeekCache[key]?.schedule) {
                            parsedWeekCache[key].schedule = recalibrateScheduleToday(parsedWeekCache[key].schedule)
                        }
                    }
                    weekCacheRef.current = parsedWeekCache
                    if (parsedWeekCache[todayMonday]) {
                        setTodayTimetableData(parsedWeekCache[todayMonday])
                    }
                } catch { }
            }

            const cachedSnapshot = localStorage.getItem('synapse_cache')
            if (cachedSnapshot) {
                try {
                    const parsed = JSON.parse(cachedSnapshot)
                    if (parsed.t && Array.isArray(parsed.t.schedule)) {
                        const calibratedSchedule = recalibrateScheduleToday(parsed.t.schedule)
                        const calibratedTimetable: SmartTimetableResult = {
                            ...parsed.t,
                            schedule: calibratedSchedule
                        }
                        setTimetableData(calibratedTimetable)

                        const mondayKey = normalizeToMondayIso(calibratedTimetable.weekStart)
                        if (!weekCacheRef.current[mondayKey]) {
                            weekCacheRef.current[mondayKey] = calibratedTimetable
                        }

                        if (mondayKey === todayMonday) {
                            setTodayTimetableData(calibratedTimetable)
                        }

                        const realTodayIso = getTodayIsoString()
                        const currentToday = calibratedSchedule.find((d: DaySchedule) => d.isoDate === realTodayIso)
                        setSelectedDay(currentToday ? currentToday.dayName : resolveSmartDefaultDay(calibratedSchedule))
                    }
                    if (parsed.g) setGradesData(parsed.g)
                    if (parsed.a) setAttendanceData(parsed.a)
                } catch { }
            }
        }

        const normalizedPivot = normalizeToMondayIso(currentWeekPivot)
        const isAlreadyInCache = Boolean(weekCacheRef.current[normalizedPivot])
        executeSync(username, password, lang, normalizedPivot, isAlreadyInCache)
    }, [isConfigured, username, password, lang, currentWeekPivot, executeSync, resolveSmartDefaultDay])

    const queueWeekChange = (targetDateIso: string) => {
        const mondayPivot = normalizeToMondayIso(targetDateIso)
        setHasNewUpdate(false)
        setCurrentWeekPivot(mondayPivot)

        const cached = weekCacheRef.current[mondayPivot]
        if (cached) {
            const calibrated = {
                ...cached,
                schedule: recalibrateScheduleToday(cached.schedule)
            }
            setTimetableData(calibrated)
            setSelectedDay((prev) => {
                const targetMatch = calibrated.schedule.find((d) => d.isoDate === targetDateIso)
                if (targetMatch) return targetMatch.dayName

                const realTodayIso = getTodayIsoString()
                const currentToday = calibrated.schedule.find((d) => d.isoDate === realTodayIso)
                if (currentToday) return currentToday.dayName

                const hasPrev = calibrated.schedule.some((d) => d.dayName === prev && d.lessons.length > 0)
                return hasPrev ? prev : resolveSmartDefaultDay(calibrated.schedule)
            })
            setIsLoadingWeek(false)
        } else {
            setIsLoadingWeek(true)
        }

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
            if (username && password) {
                const isSilent = Boolean(weekCacheRef.current[mondayPivot])
                executeSync(username, password, lang, mondayPivot, isSilent)
            }
        }, 120)
    }

    const shiftWeek = (deltaDays: number) => {
        const parts = currentWeekPivot.split('-').map(Number)
        const current = new Date(parts[0], parts[1] - 1, parts[2])
        current.setDate(current.getDate() + deltaDays)
        const y = current.getFullYear()
        const m = String(current.getMonth() + 1).padStart(2, '0')
        const d = String(current.getDate()).padStart(2, '0')
        queueWeekChange(`${y}-${m}-${d}`)
    }

    const applyPendingUpdates = () => {
        if (pendingSnapshot) {
            const mondayKey = normalizeToMondayIso(pendingSnapshot.t.weekStart)
            const calibratedTimetable: SmartTimetableResult = {
                ...pendingSnapshot.t,
                schedule: recalibrateScheduleToday(pendingSnapshot.t.schedule)
            }
            setTimetableData(calibratedTimetable)
            weekCacheRef.current[mondayKey] = calibratedTimetable
            if (typeof window !== 'undefined') {
                localStorage.setItem('synapse_week_cache', JSON.stringify(weekCacheRef.current))
                localStorage.setItem('synapse_cache', JSON.stringify({
                    t: calibratedTimetable,
                    g: pendingSnapshot.g,
                    a: pendingSnapshot.a
                }))
            }
            setSelectedDay(resolveSmartDefaultDay(calibratedTimetable.schedule))
            setGradesData(pendingSnapshot.g)
            setAttendanceData(pendingSnapshot.a)
            setPendingSnapshot(null)
            setHasNewUpdate(false)
        }
    }

    return {
        isUpdating,
        isLoadingWeek,
        hasNewUpdate,
        currentWeekPivot,
        timetableData,
        todayTimetableData,
        gradesData,
        attendanceData,
        selectedDay,
        setSelectedDay,
        queueWeekChange,
        shiftWeek,
        applyPendingUpdates,
        executeSync
    }
}