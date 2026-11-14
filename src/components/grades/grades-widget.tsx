'use client'

import { useState, useMemo } from 'react'
import { GraduationCap } from 'lucide-react'
import { GradesResult, GradeItem } from '@/models/grade.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { formatSubjectName } from '@/utils/text.util'
import { IosCard, IosEmptyState, IosSegmentedControl } from '@/components/ios/ios-ui'
import { getGradeBadgeStyle } from '@/utils/badge.util'
import {
  GradeCalcInput,
  GradeModifierMode,
  calculateSubjectWeightedAverage,
  parseGradeNumericValue
} from '@/utils/grade.util'
import { cn } from '@/utils/cn.util'
import { SubjectCalculatorDrawer } from './subject-calculator-drawer'

interface GradesWidgetProps {
  gradesData: GradesResult
  showFullSubjectNames?: boolean
  gradeModifierMode?: GradeModifierMode
  ignoreGradeModifiers?: boolean
  enableGradeSimulator?: boolean
  lang?: AppLanguage
  t: AppDictionary
  onSelectGrade: (grade: GradeItem, subject: string) => void
}

interface SimulatedGrade {
  id: string
  subject: string
  grade: string
  weight: number
}

type SemesterTab = 1 | 2 | 'all'

export function GradesWidget({
  gradesData,
  showFullSubjectNames = false,
  gradeModifierMode,
  ignoreGradeModifiers = false,
  enableGradeSimulator = false,
  lang = 'pl',
  t,
  onSelectGrade
}: GradesWidgetProps) {
  const [selectedSemester, setSelectedSemester] = useState<SemesterTab>('all')
  const [simulatedBySubject, setSimulatedBySubject] = useState<Record<string, SimulatedGrade[]>>({})
  const [activeSubjectDrawer, setActiveSubjectDrawer] = useState<string | null>(null)
  const [simGradeVal, setSimGradeVal] = useState<string>('5')
  const [simWeightVal, setSimWeightVal] = useState<number>(2)

  const activeModifierMode: GradeModifierMode | boolean = gradeModifierMode ?? ignoreGradeModifiers

  const addSimulatedGrade = (subject: string) => {
    const item: SimulatedGrade = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      subject,
      grade: simGradeVal,
      weight: simWeightVal
    }
    setSimulatedBySubject((prev) => ({
      ...prev,
      [subject]: [...(prev[subject] || []), item]
    }))
  }

  const removeSimulatedGrade = (subject: string, id: string) => {
    setSimulatedBySubject((prev) => {
      const next = (prev[subject] || []).filter((x) => x.id !== id)
      return { ...prev, [subject]: next }
    })
  }

  const clearAllSimulated = () => {
    setSimulatedBySubject({})
  }

  const totalSimulatedCount = Object.values(simulatedBySubject).reduce((acc, list) => acc + list.length, 0)

  const subjects = useMemo(() => {
    return [...(gradesData.subjects || [])].sort((a, b) => a.subject.localeCompare(b.subject))
  }, [gradesData.subjects])

  const subjectGradesInputMap = useMemo(() => {
    const map = new Map<string, GradeCalcInput[]>()
    for (const sub of subjects) {
      const realGrades =
        selectedSemester === 1
          ? sub.semester1
          : selectedSemester === 2
            ? sub.semester2
            : [...sub.semester1, ...sub.semester2]

      const simGrades: GradeCalcInput[] = enableGradeSimulator
        ? (simulatedBySubject[sub.subject] || []).map((sg) => ({
            value: sg.grade,
            weight: sg.weight,
            countsToAverage: parseGradeNumericValue(sg.grade, activeModifierMode) !== null
          }))
        : []

      const realInputs: GradeCalcInput[] = realGrades.map((g) => ({
        value: g.grade,
        weight: g.weight,
        countsToAverage: g.numericValue !== null
      }))

      map.set(sub.subject, [...realInputs, ...simGrades])
    }
    return map
  }, [subjects, selectedSemester, enableGradeSimulator, simulatedBySubject, activeModifierMode])

  const subjectAveragesMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const sub of subjects) {
      const inputs = subjectGradesInputMap.get(sub.subject) || []
      map.set(sub.subject, calculateSubjectWeightedAverage(inputs, activeModifierMode))
    }
    return map
  }, [subjects, subjectGradesInputMap, activeModifierMode])

  const overallGpa = useMemo(() => {
    let sum = 0
    let count = 0

    for (const sub of subjects) {
      const avg = subjectAveragesMap.get(sub.subject)
      if (avg !== null && avg !== undefined) {
        sum += avg
        count++
      }
    }

    if (count === 0) return '—'
    return (Math.round((sum / count) * 100) / 100).toFixed(2)
  }, [subjects, subjectAveragesMap])

  const renderGradeButton = (g: GradeItem, subjectName: string, keyPrefix: string) => {
    const style = getGradeBadgeStyle(g.grade)
    return (
      <button
        key={keyPrefix}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSelectGrade(g, subjectName)
        }}
        className={cn(
          'min-w-[28px] h-[28px] px-1.5 rounded-[8px] flex items-center justify-center text-[13px] font-medium tabular-nums active:scale-[0.94] active:opacity-70 transition-all duration-150 cursor-pointer',
          style.bg,
          style.text
        )}
      >
        {g.grade}
      </button>
    )
  }

  return (
    <div className="w-full flex flex-col gap-3.5 pb-16 select-none">
      <IosCard className="p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2.5">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-tight">
                {t.gpaTitle}
              </span>
              {enableGradeSimulator && totalSimulatedCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllSimulated}
                  className="text-[11px] font-semibold text-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] px-2 py-0.5 rounded-full cursor-pointer active:opacity-70"
                >
                  {lang === 'en' ? `Reset sim (${totalSimulatedCount})` : `Resetuj symulację (${totalSimulatedCount})`}
                </button>
              )}
            </div>
            <h2 className="text-[34px] font-semibold tracking-[-0.8px] leading-none text-[var(--ios-label)] mt-0.5 tabular-nums">
              {overallGpa}
            </h2>
          </div>

          {gradesData.recentGrades && gradesData.recentGrades.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
              {gradesData.recentGrades.slice(0, 5).map((g, idx) => {
                const style = getGradeBadgeStyle(g.grade)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectGrade(g, g.subject || '')
                    }}
                    title={(g.subject || '') + ': ' + g.grade + (g.category ? ' (' + g.category + ')' : '')}
                    className={cn(
                      'min-w-[28px] h-[28px] px-1.5 rounded-[8px] flex items-center justify-center text-[13px] font-semibold tabular-nums cursor-pointer hover:opacity-80 active:scale-[0.94] transition-all select-none',
                      style.bg,
                      style.text
                    )}
                  >
                    {g.grade}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </IosCard>

      <IosSegmentedControl<SemesterTab>
        value={selectedSemester}
        onChange={setSelectedSemester}
        options={[
          { id: 1, label: lang === 'en' ? 'Term 1' : 'Semestr 1' },
          { id: 2, label: lang === 'en' ? 'Term 2' : 'Semestr 2' },
          { id: 'all', label: lang === 'en' ? 'Full Year' : 'Cały rok' }
        ]}
        className="w-full"
      />

      <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
        {subjects.length > 0 ? (
          subjects.map((sub, idx) => {
            const sem1Grades = sub.semester1
            const sem2Grades = sub.semester2
            const singleGrades = selectedSemester === 1 ? sem1Grades : sem2Grades
            const totalRealCount =
              selectedSemester === 'all'
                ? sem1Grades.length + sem2Grades.length
                : singleGrades.length

            const simList = enableGradeSimulator ? simulatedBySubject[sub.subject] || [] : []
            const avgNum = subjectAveragesMap.get(sub.subject)
            const avgStr = avgNum !== null && avgNum !== undefined ? avgNum.toFixed(2) : '—'
            const isDanger = typeof avgNum === 'number' && avgNum < 2.0
            const displayTitle = formatSubjectName(sub.subject, showFullSubjectNames)
            const isDrawerOpen = activeSubjectDrawer === sub.subject
            const solverInputs = subjectGradesInputMap.get(sub.subject) || []

            return (
              <div key={sub.subject + '-' + idx} className="p-3.5 px-4 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0 pr-1">
                    <span className="text-[15px] font-medium leading-snug tracking-[-0.2px] text-[var(--ios-label)] truncate block">
                      {displayTitle}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2 min-h-[28px]">
                      {totalRealCount > 0 || simList.length > 0 ? (
                        <>
                          {selectedSemester === 'all' ? (
                            <>
                              {sem1Grades.map((g, gIdx) => renderGradeButton(g, sub.subject, 's1-' + gIdx))}
                              {sem1Grades.length > 0 && sem2Grades.length > 0 && (
                                <span className="w-[1px] h-[16px] bg-[var(--ios-separator)] mx-1 shrink-0" />
                              )}
                              {sem2Grades.map((g, gIdx) => renderGradeButton(g, sub.subject, 's2-' + gIdx))}
                            </>
                          ) : (
                            singleGrades.map((g, gIdx) => renderGradeButton(g, sub.subject, 'single-' + gIdx))
                          )}

                          {simList.map((sg) => (
                            <button
                              key={sg.id}
                              type="button"
                              onClick={() => removeSimulatedGrade(sub.subject, sg.id)}
                              title={lang === 'en' ? 'Tap to remove simulated grade' : 'Kliknij, aby usunąć ocenę symulowaną'}
                              className="min-w-[28px] h-[28px] px-1.5 rounded-[8px] border border-dashed border-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] flex items-center justify-center gap-0.5 text-[13px] font-semibold tabular-nums active:scale-[0.94] cursor-pointer"
                            >
                              <span>{sg.grade}</span>
                              <span className="text-[9px] opacity-75">w{sg.weight}</span>
                            </button>
                          ))}
                        </>
                      ) : (
                        <span className="text-[13px] font-normal text-[var(--ios-secondary)]">
                          {t.noGradesRecorded}
                        </span>
                      )}

                      {enableGradeSimulator && (
                        <button
                          type="button"
                          onClick={() => setActiveSubjectDrawer(isDrawerOpen ? null : sub.subject)}
                          title={lang === 'en' ? 'Simulate grade' : 'Symuluj ocenę'}
                          className={cn(
                            'w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-[15px] font-semibold transition-colors cursor-pointer',
                            isDrawerOpen
                              ? 'bg-[var(--ios-blue)] text-white'
                              : 'bg-[var(--ios-element)] text-[var(--ios-blue)] hover:bg-[var(--ios-blue-subtle)]'
                          )}
                        >
                          +
                        </button>
                      )}
                    </div>

                    {sub.warning && sub.warning.status === 'critical' && (
                      <div className="pt-1.5 text-[12px] font-medium text-[var(--ios-red)]">
                        {sub.warning.message}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSubjectDrawer(isDrawerOpen ? null : sub.subject)}
                    title={t.targetAverageLabel}
                    className={cn(
                      'shrink-0 flex flex-col items-end justify-center min-w-[54px] px-2 py-1 rounded-[12px] transition-colors cursor-pointer active:scale-[0.96]',
                      isDrawerOpen ? 'bg-[var(--ios-blue-subtle)]' : 'hover:bg-[var(--ios-row-hover)]'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[16px] font-medium tabular-nums',
                        simList.length > 0
                          ? 'text-[var(--ios-blue)] font-semibold'
                          : isDanger
                            ? 'text-[var(--ios-red)] font-semibold'
                            : 'text-[var(--ios-label)]'
                      )}
                    >
                      {avgStr}
                    </span>
                    {simList.length > 0 && (
                      <span className="text-[10px] font-medium text-[var(--ios-blue)]">
                        {lang === 'en' ? 'simulated' : 'symulacja'}
                      </span>
                    )}
                  </button>
                </div>

                {isDrawerOpen && (
                  <SubjectCalculatorDrawer
                    subject={sub.subject}
                    grades={solverInputs}
                    modifierMode={activeModifierMode}
                    enableGradeSimulator={enableGradeSimulator}
                    simGradeVal={simGradeVal}
                    simWeightVal={simWeightVal}
                    onChangeSimGrade={setSimGradeVal}
                    onChangeSimWeight={setSimWeightVal}
                    onAddSimulatedGrade={addSimulatedGrade}
                    lang={lang}
                    t={t}
                  />
                )}
              </div>
            )
          })
        ) : (
          <IosEmptyState
            compact
            iconTone="blue"
            icon={<GraduationCap className="w-[20px] h-[20px]" strokeWidth={1.9} />}
            title={t.noGradesRecorded}
          />
        )}
      </IosCard>
    </div>
  )
}
