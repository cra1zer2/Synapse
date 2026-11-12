'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLanguage, AppTheme } from '@/config/dictionary.config'
import { getTodayIsoString } from '@/utils/date.util'
import { GradeModifierMode } from '@/utils/grade.util'

export type { GradeModifierMode }
export type TextClampOption = 'full' | '1' | '2'
export type DashboardWidgetId = 'grades' | 'schedule' | 'upcoming' | 'messages' | 'attendance'

export const DEFAULT_DASHBOARD_ORDER: DashboardWidgetId[] = [
  'grades',
  'schedule',
  'upcoming',
  'messages',
  'attendance'
]

export const DEFAULT_DASHBOARD_VISIBLE: Record<DashboardWidgetId, boolean> = {
  grades: true,
  schedule: true,
  upcoming: false,
  messages: true,
  attendance: true
}

export function syncMetaThemeColor(isDark: boolean) {
  if (typeof document === 'undefined') return
  let meta = document.querySelector('meta[name="theme-color"]')
  const targetColor = isDark ? '#000000' : '#f2f2f7'
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', targetColor)
}

export function useAppSettings() {
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [lang, setLang] = useState<AppLanguage>('pl')
  const [theme, setTheme] = useState<AppTheme>('system')
  const [textClamp, setTextClamp] = useState<TextClampOption>('full')
  const [showFullSubjectNames, setShowFullSubjectNames] = useState(false)
  const [ignoreGradeModifiers, setIgnoreGradeModifiers] = useState(false)
  const [gradeModifierMode, setGradeModifierMode] = useState<GradeModifierMode>('standard')
  const [allowStudentJustifications, setAllowStudentJustifications] = useState(false)
  const [enableGradeSimulator, setEnableGradeSimulator] = useState(false)
  const [showHomeworks, setShowHomeworks] = useState(false)
  const [showMobileTodayAttendance, setShowMobileTodayAttendance] = useState(false)
  const [dashboardOrder, setDashboardOrder] = useState<DashboardWidgetId[]>(DEFAULT_DASHBOARD_ORDER)
  const [dashboardVisible, setDashboardVisible] = useState<Record<DashboardWidgetId, boolean>>(DEFAULT_DASHBOARD_VISIBLE)
  const [showLuckyNumberBanner, setShowLuckyNumberBanner] = useState(false)
  const [luckyDismissedDate, setLuckyDismissedDate] = useState('')

  const applyTheme = useCallback((targetTheme: AppTheme) => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    const isDark =
      targetTheme === 'dark' ||
      (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.add('light')
    }
    syncMetaThemeColor(isDark)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 768px)')
    const updateDesktop = () => setIsDesktop(mq.matches)
    updateDesktop()
    mq.addEventListener('change', updateDesktop)
    return () => mq.removeEventListener('change', updateDesktop)
  }, [])

  useEffect(() => {
    setMounted(true)
    const savedLang = (localStorage.getItem('synapse_lang') as AppLanguage) || 'pl'
    const savedTheme = (localStorage.getItem('synapse_theme') as AppTheme) || 'system'
    const savedClamp = (localStorage.getItem('synapse_text_clamp') as TextClampOption) || 'full'
    const savedFull = localStorage.getItem('synapse_full_names') === 'true'
    const savedIgnore = localStorage.getItem('synapse_ignore_modifiers') === 'true'
    const savedModMode = localStorage.getItem('synapse_grade_modifier_mode') as GradeModifierMode | null
    const resolvedModMode: GradeModifierMode =
      savedModMode && ['standard', 'symmetric', 'quarter', 'none'].includes(savedModMode)
        ? savedModMode
        : savedIgnore
          ? 'none'
          : 'standard'
    const savedStudentJust = localStorage.getItem('synapse_allow_student_justifications') === 'true'
    const savedSim = localStorage.getItem('synapse_grade_simulator') === 'true'
    const savedHw = localStorage.getItem('synapse_show_homeworks') === 'true'
    const savedMobileTodayAtt = localStorage.getItem('synapse_mobile_today_attendance') === 'true'
    const savedLuckyBanner = localStorage.getItem('synapse_show_lucky_banner') === 'true'
    const savedLuckyDismissed = localStorage.getItem('synapse_lucky_dismissed_date') || ''

    setLang(savedLang)
    setTheme(savedTheme)
    setTextClamp(savedClamp)
    setShowFullSubjectNames(savedFull)
    setGradeModifierMode(resolvedModMode)
    setIgnoreGradeModifiers(resolvedModMode === 'none')
    setAllowStudentJustifications(savedStudentJust)
    setEnableGradeSimulator(savedSim)
    setShowHomeworks(savedHw)
    setShowMobileTodayAttendance(savedMobileTodayAtt)
    setShowLuckyNumberBanner(savedLuckyBanner)
    setLuckyDismissedDate(savedLuckyDismissed)

    try {
      const rawOrder = localStorage.getItem('synapse_dashboard_order_v1')
      if (rawOrder) {
        const parsed = JSON.parse(rawOrder) as DashboardWidgetId[]
        if (Array.isArray(parsed) && DEFAULT_DASHBOARD_ORDER.every((k) => parsed.includes(k))) {
          setDashboardOrder(parsed)
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

    applyTheme(savedTheme)
  }, [applyTheme])

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      root.classList.remove('dark', 'light')
      if (e.matches) root.classList.add('dark')
      else root.classList.add('light')
      syncMetaThemeColor(e.matches)
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const handleSelectLanguage = (newLang: AppLanguage, onAfterChange?: (l: AppLanguage) => void) => {
    setLang(newLang)
    localStorage.setItem('synapse_lang', newLang)
    if (onAfterChange) onAfterChange(newLang)
  }

  const handleSelectTheme = (newTheme: AppTheme) => {
    setTheme(newTheme)
    localStorage.setItem('synapse_theme', newTheme)
    applyTheme(newTheme)
  }

  const handleSelectTextClamp = (clamp: TextClampOption) => {
    setTextClamp(clamp)
    localStorage.setItem('synapse_text_clamp', clamp)
  }

  const handleToggleShowFullSubjectNames = (val: boolean) => {
    setShowFullSubjectNames(val)
    localStorage.setItem('synapse_full_names', String(val))
  }

  const handleToggleIgnoreGradeModifiers = (val: boolean) => {
    const nextMode: GradeModifierMode = val ? 'none' : 'standard'
    setIgnoreGradeModifiers(val)
    setGradeModifierMode(nextMode)
    localStorage.setItem('synapse_ignore_modifiers', String(val))
    localStorage.setItem('synapse_grade_modifier_mode', nextMode)
  }

  const handleSelectGradeModifierMode = (mode: GradeModifierMode) => {
    setGradeModifierMode(mode)
    const ignore = mode === 'none'
    setIgnoreGradeModifiers(ignore)
    localStorage.setItem('synapse_grade_modifier_mode', mode)
    localStorage.setItem('synapse_ignore_modifiers', String(ignore))
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
    isDesktop,
    lang,
    theme,
    textClamp,
    showFullSubjectNames,
    ignoreGradeModifiers,
    gradeModifierMode,
    allowStudentJustifications,
    enableGradeSimulator,
    showHomeworks,
    showMobileTodayAttendance,
    dashboardOrder,
    dashboardVisible,
    showLuckyNumberBanner,
    luckyDismissedDate,
    todayIsoStr,
    handleSelectLanguage,
    handleSelectTheme,
    handleSelectTextClamp,
    handleToggleShowFullSubjectNames,
    handleToggleIgnoreGradeModifiers,
    handleSelectGradeModifierMode,
    handleToggleAllowStudentJustifications,
    handleToggleEnableGradeSimulator,
    handleToggleShowHomeworks,
    handleToggleMobileTodayAttendance,
    handleChangeDashboardOrder,
    handleToggleDashboardWidget,
    handleToggleShowLuckyNumberBanner,
    handleDismissLuckyBanner
  }
}
