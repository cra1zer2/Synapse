/**
 * Feature Controller & View Host: Grades Module
 * Manages full-screen gradebook display, top-bar simulation toggle, loading/error states, and modal detail sheets.
 * Resolves missing subject names on recent-grade taps directly from the loaded subject list.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { AlertCircle, Plus } from 'lucide-react'
import { GradeItem, GradesResult } from '@/models/grade.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { cn } from '@/utils/cn.util'
import { UiScreen } from '@/components/ui/ui-screen'
import { UiEmptyState } from '@/components/ui/ui-empty-state'
import { UiSpinner } from '@/components/ui/ui-spinner'
import { GradesView } from './grades-view'
import { GradeDetailModal } from './grade-detail-modal'

interface UseGradesFeatureOptions {
  gradesData: GradesResult | null
  onOpenGradesScreen: () => void
}

function findSubjectForGrade(gradesData: GradesResult | null, g: GradeItem): string {
  if (g.subject) return g.subject
  if (!gradesData?.subjects) return ''
  const matched = gradesData.subjects.find(
    (s) =>
      s.semester1.some((x) => x.grade === g.grade && x.date === g.date && x.category === g.category) ||
      s.semester2.some((x) => x.grade === g.grade && x.date === g.date && x.category === g.category)
  )
  return matched ? matched.subject : ''
}

export function useGradesFeature({ gradesData, onOpenGradesScreen }: UseGradesFeatureOptions) {
  const [selectedGradeDetail, setSelectedGradeDetail] = useState<{ grade: GradeItem; subject: string } | null>(null)
  const [isSimSelecting, setIsSimSelecting] = useState(false)
  const [activeSimSubject, setActiveSimSubject] = useState<string | null>(null)

  const toggleSimSelecting = useCallback(() => {
    setIsSimSelecting((prev) => !prev)
  }, [])

  const openGrade = useCallback((grade: GradeItem, subject: string) => {
    setSelectedGradeDetail({ grade, subject })
  }, [])

  const openRecentGrade = useCallback(
    (grade: GradeItem) => {
      setSelectedGradeDetail({
        grade,
        subject: findSubjectForGrade(gradesData, grade)
      })
    },
    [gradesData]
  )

  return {
    selectedGradeDetail,
    setSelectedGradeDetail,
    isSimSelecting,
    setIsSimSelecting,
    toggleSimSelecting,
    activeSimSubject,
    setActiveSimSubject,
    openGrade,
    openRecentGrade,
    openFullGrades: onOpenGradesScreen
  }
}

export type GradesFeatureController = ReturnType<typeof useGradesFeature>

export function GradesSimToggleButton({
  active,
  onClick,
  lang
}: {
  active: boolean
  onClick: () => void
  lang: AppLanguage
}) {
  const label = active
    ? pickText(lang, { pl: 'Zakończ symulację', en: 'Exit simulation' })
    : pickText(lang, { pl: 'Symuluj ocenę', en: 'Simulate grade' })

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'w-[34px] h-[34px] flex items-center justify-center shrink-0 cursor-pointer select-none transition-all duration-200 active:scale-90',
        active
          ? 'rounded-full bg-[var(--ios-blue)] text-white shadow-[var(--ios-primary-pill-shadow)]'
          : 'rounded-full ios-glass-control text-[var(--ios-blue)]'
      )}
    >
      <Plus
        className={cn('w-[17px] h-[17px] transition-transform duration-200', active && 'rotate-45')}
        strokeWidth={2.4}
      />
    </button>
  )
}

interface GradesFeatureProps {
  controller: GradesFeatureController
  mode: 'tab' | 'subview' | 'hidden'
  onCloseSubview: () => void
  onSheetChange?: (isOpen: boolean) => void
  gradesData: GradesResult | null
  gradesError: string | null
  onRetry: () => void
  showFullSubjectNames: boolean
  enableGradeSimulator: boolean
  lang: AppLanguage
  t: AppDictionary
}

export function GradesFeature({
  controller,
  mode,
  onCloseSubview,
  onSheetChange,
  gradesData,
  gradesError,
  onRetry,
  showFullSubjectNames,
  enableGradeSimulator,
  lang,
  t
}: GradesFeatureProps) {
  const isSheetOpen = Boolean(controller.selectedGradeDetail || controller.activeSimSubject)

  useEffect(() => {
    onSheetChange?.(isSheetOpen)
  }, [isSheetOpen, onSheetChange])

  useEffect(() => {
    if (!enableGradeSimulator && controller.isSimSelecting) {
      controller.setIsSimSelecting(false)
    }
  }, [enableGradeSimulator, controller])

  const content = gradesData ? (
    <GradesView
      gradesData={gradesData}
      showFullSubjectNames={showFullSubjectNames}
      enableGradeSimulator={enableGradeSimulator}
      isSimSelecting={controller.isSimSelecting}
      activeSimSubject={controller.activeSimSubject}
      onSelectSimSubject={(subject) => {
        controller.setActiveSimSubject(subject)
      }}
      onCloseSimSubject={() => controller.setActiveSimSubject(null)}
      lang={lang}
      t={t}
      onSelectGrade={controller.openGrade}
    />
  ) : gradesError ? (
    <UiEmptyState
      iconTone="red"
      icon={<AlertCircle className="w-[22px] h-[22px]" strokeWidth={2} />}
      title={gradesError}
      action={{ label: t.refresh, onClick: onRetry }}
      className="my-12"
    />
  ) : (
    <div className="py-24 flex flex-col items-center justify-center gap-3">
      <UiSpinner size="large" className="text-[var(--ios-blue)]" />
      <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-tight">
        {t.loadingTimetable}
      </span>
    </div>
  )

  const handleCloseScreen = () => {
    controller.setIsSimSelecting(false)
    controller.setActiveSimSubject(null)
    onCloseSubview()
  }

  return (
    <>
      {mode === 'tab' && content}

      <UiScreen
        isSubView
        isOpen={mode === 'subview'}
        onClose={handleCloseScreen}
        title={t.grades}
        backLabel={t.backAction}
        trailing={
          enableGradeSimulator ? (
            <GradesSimToggleButton
              active={controller.isSimSelecting}
              onClick={controller.toggleSimSelecting}
              lang={lang}
            />
          ) : undefined
        }
      >
        {content}
      </UiScreen>

      <GradeDetailModal
        gradeDetail={controller.selectedGradeDetail}
        isOpen={Boolean(controller.selectedGradeDetail)}
        onClose={() => controller.setSelectedGradeDetail(null)}
        lang={lang}
        t={t}
      />
    </>
  )
}
