'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLanguage, AppTheme, NavMode, normalizeLanguage } from '@/config/dictionary.config'
import { getTodayIsoString } from '@/utils/date.util'

export type { NavMode }
export type DashboardWidgetId = 'grades' | 'schedule' | 'upcoming' | 'messages' | 'attendance'

export const DEFAULT_DASHBOARD_ORDER: DashboardWidgetId[] = [
  'grades',
  'schedule',
  'upcoming',
  'messages',
  'attendance',
]
export const DEFAULT_DASHBOARD_VISIBLE: Record<DashboardWidgetId, boolean> = {
  grades: true,
  schedule: true,
  upcoming: false,
  messages: true,
  attendance: true,
}

function resolveCanvasBgHex(isDark: boolean): string {
  return isDark ? '#000000' : '#f2f2f7'
}

function syncMetaThemeColor(isDark: boolean) {
  if (typeof document === 'undefined') return
  let meta = document.querySelector('meta[name="theme-color"]')
  const targetColor = resolveCanvasBgHex(isDark)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', targetColor)
}

export function useAppSettings() {
  const [mounted, setMounted] = useState(false)
  const [lang, setLang] = useState<AppLanguage>('pl')
  const [theme, setTheme] = useState<AppTheme>('system')
  const [navMode, setNavMode] = useState<NavMode>('widgets')
  const [showFullSubjectNames, setShowFullSubjectNames] = useState(false)
  const [allowStudentJustifications, setAllowStudentJustifications] = useState(false)
  const [enableGradeSimulator, setEnableGradeSimulator] = useState(true)
  const [showHomeworks, setShowHomeworks] = useState(false)
  const [showTeacherAbsences, setShowTeacherAbsences] = useState(false)
  const [vocationalSubjects, setVocationalSubjects] = useState<string[]>([])
  const [showMobileTodayAttendance, setShowMobileTodayAttendance] = useState(false)
  const [dashboardOrder, setDashboardOrder] = useState<DashboardWidgetId[]>(DEFAULT_DASHBOARD_ORDER)
  const [dashboardVisible, setDashboardVisible] =
    useState<Record<DashboardWidgetId, boolean>>(DEFAULT_DASHBOARD_VISIBLE)
  const [showLuckyNumberBanner, setShowLuckyNumberBanner] = useState(false)
  const [luckyDismissedDate, setLuckyDismissedDate] = useState('')

  const applyAppearance = useCallback((targetTheme: AppTheme) => {
    const root = document.documentElement
    root.classList.remove('dark', 'light', 'ui-m3')
    const isDark =
      targetTheme === 'dark' ||
      (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.add('light')
    }
    const bgHex = resolveCanvasBgHex(isDark)
    root.style.backgroundColor = bgHex
    if (document.body) {
      document.body.style.backgroundColor = bgHex
    }
    syncMetaThemeColor(isDark)
  }, [])

  useEffect(() => {
    setMounted(true)
    const savedLang = normalizeLanguage(localStorage.getItem('synapse_lang'))
    const rawTheme = localStorage.getItem('synapse_theme')
    const savedTheme: AppTheme =
      rawTheme === 'dark' || rawTheme === 'light' || rawTheme === 'system' ? rawTheme : 'system'
    const savedNavMode: NavMode = localStorage.getItem('synapse_nav_mode') === 'tabs' ? 'tabs' : 'widgets'
    const savedFull = localStorage.getItem('synapse_full_names') === 'true'
    const savedStudentJust = localStorage.getItem('synapse_allow_student_justifications') === 'true'
    const rawSim = localStorage.getItem('synapse_grade_simulator')
    const savedSim = rawSim === null ? true : rawSim === 'true'
    const savedHw = localStorage.getItem('synapse_show_homeworks') === 'true'
    const savedTeacherAbsences = localStorage.getItem('synapse_show_teacher_absences') === 'true'
    const savedMobileTodayAtt = localStorage.getItem('synapse_mobile_today_attendance') === 'true'
    const savedLuckyBanner = localStorage.getItem('synapse_show_lucky_banner') === 'true'
    const savedLuckyDismissed = localStorage.getItem('synapse_lucky_dismissed_date') || ''

    setLang(savedLang)
    document.documentElement.lang = savedLang
    setTheme(savedTheme)
    setNavMode(savedNavMode)
    setShowFullSubjectNames(savedFull)
    setAllowStudentJustifications(savedStudentJust)
    setEnableGradeSimulator(savedSim)
    setShowHomeworks(savedHw)
    setShowTeacherAbsences(savedTeacherAbsences)
    setShowMobileTodayAttendance(savedMobileTodayAtt)
    setShowLuckyNumberBanner(savedLuckyBanner)
    setLuckyDismissedDate(savedLuckyDismissed)

    try {
      const rawOrder = localStorage.getItem('synapse_dashboard_order_v1')
      if (rawOrder) {
        const parsed = JSON.parse(rawOrder) as DashboardWidgetId[]
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((k) => DEFAULT_DASHBOARD_ORDER.includes(k))
          const missing = DEFAULT_DASHBOARD_ORDER.filter((k) => !valid.includes(k))
          setDashboardOrder([...valid, ...missing])
        }
      }
    } catch {}
    try {
      const rawVis = localStorage.getItem('synapse_dashboard_visible_v1')
      if (rawVis) {
        const parsed = JSON.parse(rawVis) as Partial<Record<DashboardWidgetId, boolean>>
        setDashboardVisible({ ...DEFAULT_DASHBOARD_VISIBLE, ...parsed })
      }
    } catch {}
    try {
      const rawVoc = localStorage.getItem('synapse_vocational_subjects_v1')
      if (rawVoc) {
        const parsed = JSON.parse(rawVoc)
        if (Array.isArray(parsed)) {
          setVocationalSubjects(parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0))
        }
      }
    } catch {}

    applyAppearance(savedTheme)
  }, [applyAppearance])

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyAppearance('system')
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme, applyAppearance])

  const handleSelectLanguage = (newLang: AppLanguage, onAfterChange?: (l: AppLanguage) => void) => {
    const normalized = normalizeLanguage(newLang)
    setLang(normalized)
    localStorage.setItem('synapse_lang', normalized)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalized
    }
    if (onAfterChange) onAfterChange(normalized)
  }

  const handleSelectTheme = (newTheme: AppTheme) => {
    setTheme(newTheme)
    localStorage.setItem('synapse_theme', newTheme)
    applyAppearance(newTheme)
  }

  const handleSelectNavMode = (nextMode: NavMode) => {
    setNavMode(nextMode)
    localStorage.setItem('synapse_nav_mode', nextMode)
  }

  const handleToggleShowFullSubjectNames = (val: boolean) => {
    setShowFullSubjectNames(val)
    localStorage.setItem('synapse_full_names', String(val))
  }

  const handleToggleAllowStudentJustifications = (val: boolean) => {
    setAllowStudentJustifications(val)
    localStorage.setItem('synapse_allow_student_justifications', String(val))
  }

  const handleToggleEnableGradeSimulator = (val: boolean) => {
    setEnableGradeSimulator(val)
    localStorage.setItem('synapse_grade_simulator', String(val))
  }

  const handleToggleShowHomeworks = (val: boolean) => {
    setShowHomeworks(val)
    localStorage.setItem('synapse_show_homeworks', String(val))
  }

  const handleToggleShowTeacherAbsences = (val: boolean) => {
    setShowTeacherAbsences(val)
    localStorage.setItem('synapse_show_teacher_absences', String(val))
  }

  const handleToggleVocationalSubject = (subject: string) => {
    const clean = subject.trim()
    if (!clean) return
    setVocationalSubjects((prev) => {
      const exists = prev.includes(clean)
      const next = exists ? prev.filter((s) => s !== clean) : [...prev, clean]
      localStorage.setItem('synapse_vocational_subjects_v1', JSON.stringify(next))
      return next
    })
  }

  const handleToggleMobileTodayAttendance = (val: boolean) => {
    setShowMobileTodayAttendance(val)
    localStorage.setItem('synapse_mobile_today_attendance', String(val))
  }

  const handleChangeDashboardOrder = (newOrder: DashboardWidgetId[]) => {
    setDashboardOrder(newOrder)
    localStorage.setItem('synapse_dashboard_order_v1', JSON.stringify(newOrder))
  }

  const handleToggleDashboardWidget = (id: DashboardWidgetId, val: boolean) => {
    setDashboardVisible((prev) => {
      const next = { ...prev, [id]: val }
      localStorage.setItem('synapse_dashboard_visible_v1', JSON.stringify(next))
      return next
    })
  }

  const handleToggleShowLuckyNumberBanner = (val: boolean) => {
    setShowLuckyNumberBanner(val)
    localStorage.setItem('synapse_show_lucky_banner', String(val))
  }

  const todayIsoStr = getTodayIsoString()
  const handleDismissLuckyBanner = () => {
    setLuckyDismissedDate(todayIsoStr)
    localStorage.setItem('synapse_lucky_dismissed_date', todayIsoStr)
  }

  return {
    mounted,
    lang,
    theme,
    navMode,
    showFullSubjectNames,
    allowStudentJustifications,
    enableGradeSimulator,
    showHomeworks,
    showTeacherAbsences,
    vocationalSubjects,
    showMobileTodayAttendance,
    dashboardOrder,
    dashboardVisible,
    showLuckyNumberBanner,
    luckyDismissedDate,
    todayIsoStr,
    handleSelectLanguage,
    handleSelectTheme,
    handleSelectNavMode,
    handleToggleShowFullSubjectNames,
    handleToggleAllowStudentJustifications,
    handleToggleEnableGradeSimulator,
    handleToggleShowHomeworks,
    handleToggleShowTeacherAbsences,
    handleToggleVocationalSubject,
    handleToggleMobileTodayAttendance,
    handleChangeDashboardOrder,
    handleToggleDashboardWidget,
    handleToggleShowLuckyNumberBanner,
    handleDismissLuckyBanner,
  }
}
