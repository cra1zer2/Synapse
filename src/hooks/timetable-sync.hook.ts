'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'
import { GradesResult } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'
import { AppLanguage } from '@/config/dictionary.config'
import { syncAllUserDataAction } from '@/app/actions'
import { getTodayIsoString, getTodayDayName, normalizeToMondayIso, getSchoolWeekMondayIso } from '@/utils/date.util'

function getInitialWeekPivot(): string {
  return getSchoolWeekMondayIso(getTodayIsoString())
}

function recalibrateScheduleToday(schedule: DaySchedule[]): DaySchedule[] {
  const realTodayIso = getTodayIsoString()
  return schedule.map((d) => ({
    ...d,
    isToday: d.isoDate === realTodayIso
  }))
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

  const [timetableError, setTimetableError] = useState<string | null>(null)
  const [gradesError, setGradesError] = useState<string | null>(null)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)

  const weekCacheRef = useRef<Record<string, SmartTimetableResult>>({})
  const activeRequestCounter = useRef(0)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastUsernameRef = useRef<string>('')
  const pivotRef = useRef<string>(currentWeekPivot)

  useEffect(() => {
    pivotRef.current = currentWeekPivot
  }, [currentWeekPivot])

  const executeSync = useCallback(
    async (u: string, p: string, currentAppLang: AppLanguage, rawPivot: string, silentUpdate: boolean) => {
      const weekPivot = normalizeToMondayIso(rawPivot)
      const currentSchoolWeekMonday = getSchoolWeekMondayIso(getTodayIsoString())
      const isTargetTodayWeek = weekPivot === currentSchoolWeekMonday
      const requestId = ++activeRequestCounter.current

      if (!silentUpdate) {
        setIsLoadingWeek(true)
      }
      setIsUpdating(true)
      setTimetableError(null)
      setGradesError(null)
      setAttendanceError(null)

      try {
        const shouldTranslate = currentAppLang === 'en'
        const res = await syncAllUserDataAction(u, p, shouldTranslate, weekPivot)

        if (requestId !== activeRequestCounter.current) return

        if (!res.success) {
          setTimetableError(res.error || 'Błąd połączenia')
          setGradesError(res.error || 'Błąd połączenia')
          setAttendanceError(res.error || 'Błąd połączenia')
          return
        }

        const tRes = res.timetable
        const gRes = res.grades
        const aRes = res.attendance

        if (aRes?.success && 'data' in aRes && aRes.data) {
          setAttendanceData(aRes.data)
          setAttendanceError(null)
        } else if (aRes && !aRes.success) {
          setAttendanceError(aRes.error || 'Błąd ładowania frekwencji')
        }

        if (gRes?.success && 'data' in gRes && gRes.data) {
          setGradesData(gRes.data)
          setGradesError(null)
        } else if (gRes && !gRes.success) {
          setGradesError(gRes.error || 'Błąd ładowania ocen')
        }

        if (tRes?.success && 'data' in tRes && tRes.data) {
          const recalibratedSchedule = recalibrateScheduleToday(tRes.data.schedule)
          const fetchedData: SmartTimetableResult = {
            ...tRes.data,
            schedule: recalibratedSchedule
          }
          weekCacheRef.current[`${u}_${weekPivot}`] = fetchedData
          if (isTargetTodayWeek) {
            setTodayTimetableData(fetchedData)
          }
          setTimetableData(fetchedData)
          setTimetableError(null)
        } else if (tRes && !tRes.success) {
          setTimetableError(tRes.error || 'Błąd ładowania planu lekcji')
        }

        if (typeof window !== 'undefined' && isTargetTodayWeek && (tRes?.data || gRes?.data || aRes?.data)) {
          localStorage.setItem(
            `synapse_cache_${u}`,
            JSON.stringify({
              t: tRes?.data,
              g: gRes?.data,
              a: aRes?.data
            })
          )
        }
      } finally {
        if (requestId === activeRequestCounter.current) {
          setIsLoadingWeek(false)
          setIsUpdating(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    if (!isConfigured || !username || !password) return

    let hasWarmCache = false
    const isAccountSwitch = lastUsernameRef.current !== username
    lastUsernameRef.current = username

    const targetMonday = getSchoolWeekMondayIso(getTodayIsoString())
    if (isAccountSwitch) {
      setCurrentWeekPivot(targetMonday)
      pivotRef.current = targetMonday
    }

    if (typeof window !== 'undefined') {
      const cachedSnapshot = localStorage.getItem(`synapse_cache_${username}`)
      if (cachedSnapshot) {
        try {
          const parsed = JSON.parse(cachedSnapshot)
          const cachedWeekMonday = parsed.t?.weekStart ? normalizeToMondayIso(parsed.t.weekStart) : null
          if (parsed.t && Array.isArray(parsed.t.schedule) && (!cachedWeekMonday || cachedWeekMonday === targetMonday)) {
            const cal = { ...parsed.t, schedule: recalibrateScheduleToday(parsed.t.schedule) }
            setTimetableData(cal)
            setTodayTimetableData(cal)
            weekCacheRef.current[`${username}_${targetMonday}`] = cal
            hasWarmCache = true
          } else if (isAccountSwitch) {
            setTimetableData(null)
            setTodayTimetableData(null)
          }
          if (parsed.g) setGradesData(parsed.g)
          else if (isAccountSwitch) setGradesData(null)

          if (parsed.a) setAttendanceData(parsed.a)
          else if (isAccountSwitch) setAttendanceData(null)
        } catch {
          if (isAccountSwitch) {
            setTimetableData(null)
            setTodayTimetableData(null)
            setGradesData(null)
            setAttendanceData(null)
          }
        }
      } else if (isAccountSwitch) {
        setTimetableData(null)
        setTodayTimetableData(null)
        setGradesData(null)
        setAttendanceData(null)
      }
    }

    const normalizedPivot = normalizeToMondayIso(pivotRef.current)
    executeSync(username, password, lang, normalizedPivot, hasWarmCache)
  }, [isConfigured, username, password, lang, executeSync])

  const queueWeekChange = (targetDateIso: string) => {
    const mondayPivot = normalizeToMondayIso(targetDateIso)
    setCurrentWeekPivot(mondayPivot)
    pivotRef.current = mondayPivot

    const cachedWeek = weekCacheRef.current[`${username}_${mondayPivot}`]
    if (cachedWeek) {
      setTimetableData(cachedWeek)
      setIsLoadingWeek(false)
    } else {
      setIsLoadingWeek(true)
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      if (username && password) {
        executeSync(username, password, lang, mondayPivot, Boolean(cachedWeek))
      }
    }, 80)
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

  return {
    isUpdating,
    isLoadingWeek,
    hasNewUpdate,
    currentWeekPivot,
    timetableData,
    todayTimetableData,
    gradesData,
    attendanceData,
    timetableError,
    gradesError,
    attendanceError,
    selectedDay,
    setSelectedDay,
    queueWeekChange,
    shiftWeek,
    applyPendingUpdates: () => {},
    executeSync
  }
}
