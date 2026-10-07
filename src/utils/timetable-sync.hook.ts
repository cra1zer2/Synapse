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
                const [tRes, gRes, aRes] = await Promise.all([
                    getSmartTimetableAction(u, p, shouldTranslate, weekPivot),
                    getStudentGradesAction(u, p, shouldTranslate),
                    getAttendanceAction(u, p, shouldTranslate)
                ])

                if (requestId !== activeRequestCounter.current) return

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
        executeSync(username, password, lang, currentWeekPivot, isAlreadyInCache)
    }, [isConfigured, username, password, lang, currentWeekPivot, executeSync, resolveSmartDefaultDay])

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

    return {
        isUpdating,
        isLoadingWeek,
        hasNewUpdate,
        currentWeekPivot,
        timetableData,
        gradesData,
        attendanceData,
        selectedDay,
        setSelectedDay,
        queueWeekChange,
        shiftWeek,
        handleManualRefresh,
        applyPendingUpdates,
        executeSync
    }
}