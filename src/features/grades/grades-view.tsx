/**
 * Feature View: Grades Overview & Simulation Table
 * Displays overall GPA, recent grades, semester tabs, and subject rows with a clean right-aligned `+` trigger and modal simulator.
 * In simulation mode (`+` toggled in top bar), tapping `+` adds a grade while tapping an existing grade badge edits it ("What-If").
 */

'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { GraduationCap, Plus } from 'lucide-react'
import { GradesResult, GradeItem } from '@/models/grade.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { formatSubjectName } from '@/utils/text.util'
import { UiCard, UiSegmentedControl } from '@/components/ui/ui-controls'
import { UiEmptyState } from '@/components/ui/ui-empty-state'
import { getGradeBadgeStyle } from '@/utils/badge.util'
import {
  GradeCalcInput,
  calculateSubjectWeightedAverage,
  getCurrentSchoolSemester,
  parseGradeNumericValue
} from '@/utils/grade.util'
import { cn } from '@/utils/cn.util'
import {
  SubjectCalculatorDrawer,
  SimulatedGradeItem,
  RealGradeOverride,
  ActiveGradeEditTarget,
  GRADE_SIM_OPTIONS
} from './subject-calculator-drawer'

interface GradesViewProps {
  gradesData: GradesResult
  showFullSubjectNames?: boolean
  enableGradeSimulator?: boolean
  isSimSelecting?: boolean
  activeSimSubject?: string | null
  onSelectSimSubject?: (subject: string) => void
  onCloseSimSubject?: () => void
  lang?: AppLanguage
  t: AppDictionary
  onSelectGrade: (grade: GradeItem, subject: string) => void
}

type SemesterTab = 1 | 2 | 'all'

function normalizeInitialSimGrade(raw: string): string {
  const trimmed = (raw || '').trim()
  if (GRADE_SIM_OPTIONS.includes(trimmed)) return trimmed
  const num = parseGradeNumericValue(trimmed)
  if (num !== null) {
    const rounded = String(Math.min(6, Math.max(1, Math.round(num))))
    if (GRADE_SIM_OPTIONS.includes(rounded)) return rounded
  }
  return '5'
}

function normalizeInitialSimWeight(raw: number): number {
  const num = Number(raw)
  if (Number.isFinite(num) && num >= 1 && num <= 10) return Math.round(num)
  return 2
}

export function GradesView({
  gradesData,
  showFullSubjectNames = false,
  enableGradeSimulator = false,
  isSimSelecting = false,
  activeSimSubject = null,
  onSelectSimSubject,
  onCloseSimSubject,
  lang = 'pl',
  t,
  onSelectGrade
}: GradesViewProps) {
  const [selectedSemester, setSelectedSemester] = useState<SemesterTab>(() =>
    getCurrentSchoolSemester(gradesData?.subjects)
  )
  const [simulatedBySubject, setSimulatedBySubject] = useState<Record<string, SimulatedGradeItem[]>>({})
  const [realOverridesBySubject, setRealOverridesBySubject] = useState<
    Record<string, Record<string, RealGradeOverride>>
  >({})
  const [editTarget, setEditTarget] = useState<ActiveGradeEditTarget | null>(null)
  const [simGradeVal, setSimGradeVal] = useState<string>('5')
  const [simWeightVal, setSimWeightVal] = useState<number>(2)

  const handleOpenAddModal = (subject: string) => {
    setEditTarget(null)
    onSelectSimSubject?.(subject)
  }

  const handleOpenEditRealGrade = (subject: string, g: GradeItem, gradeKey: string) => {
    const existingOverride = realOverridesBySubject[subject]?.[gradeKey]
    const initialGrade = existingOverride ? existingOverride.grade : normalizeInitialSimGrade(g.grade)
    const initialWeight = existingOverride ? existingOverride.weight : normalizeInitialSimWeight(g.weight)
    setSimGradeVal(initialGrade)
    setSimWeightVal(initialWeight)
    setEditTarget({
      kind: 'real',
      key: gradeKey,
      originalGrade: g.grade,
      originalWeight: g.weight || 1,
      category: g.category
    })
    onSelectSimSubject?.(subject)
  }

  const handleOpenEditSimGrade = (subject: string, sg: SimulatedGradeItem) => {
    setSimGradeVal(normalizeInitialSimGrade(sg.grade))
    setSimWeightVal(normalizeInitialSimWeight(sg.weight))
    setEditTarget({
      kind: 'sim',
      id: sg.id
    })
    onSelectSimSubject?.(subject)
  }

  const applyGradeAction = (subject: string) => {
    if (editTarget?.kind === 'real') {
      const { key, originalGrade, originalWeight } = editTarget
      setRealOverridesBySubject((prev) => {
        const subMap = { ...(prev[subject] || {}) }
        if (simGradeVal === originalGrade && simWeightVal === originalWeight) {
          delete subMap[key]
        } else {
          subMap[key] = {
            key,
            subject,
            originalGrade,
            originalWeight,
            grade: simGradeVal,
            weight: simWeightVal,
            removed: false
          }
        }
        return { ...prev, [subject]: subMap }
      })
      setEditTarget(null)
      return
    }

    if (editTarget?.kind === 'sim') {
      const targetId = editTarget.id
      setSimulatedBySubject((prev) => ({
        ...prev,
        [subject]: (prev[subject] || []).map((item) =>
          item.id === targetId ? { ...item, grade: simGradeVal, weight: simWeightVal } : item
        )
      }))
      setEditTarget(null)
      return
    }

    const item: SimulatedGradeItem = {
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
    if (editTarget?.kind === 'sim' && editTarget.id === id) {
      setEditTarget(null)
    }
  }

  const resetRealOverride = (subject: string, key: string) => {
    setRealOverridesBySubject((prev) => {
      const subMap = { ...(prev[subject] || {}) }
      delete subMap[key]
      return { ...prev, [subject]: subMap }
    })
    if (editTarget?.kind === 'real' && editTarget.key === key) {
      setEditTarget(null)
    }
  }

  const removeRealGradeInSim = (
    subject: string,
    key: string,
    originalGrade: string,
    originalWeight: number
  ) => {
    setRealOverridesBySubject((prev) => ({
      ...prev,
      [subject]: {
        ...(prev[subject] || {}),
        [key]: {
          key,
          subject,
          originalGrade,
          originalWeight,
          grade: originalGrade,
          weight: originalWeight,
          removed: true
        }
      }
    }))
    setEditTarget(null)
  }

  const clearAllSimulated = () => {
    setSimulatedBySubject({})
    setRealOverridesBySubject({})
    setEditTarget(null)
  }

  const prevSimSelectingRef = useRef(isSimSelecting)
  useEffect(() => {
    if (prevSimSelectingRef.current && !isSimSelecting) {
      setSimulatedBySubject({})
      setRealOverridesBySubject({})
      setEditTarget(null)
      onCloseSimSubject?.()
    }
    prevSimSelectingRef.current = isSimSelecting
  }, [isSimSelecting, onCloseSimSubject])

  const totalSimulatedCount = useMemo(() => {
    const addedCount = Object.values(simulatedBySubject).reduce((acc, list) => acc + list.length, 0)
    const editedCount = Object.values(realOverridesBySubject).reduce(
      (acc, map) => acc + Object.keys(map).length,
      0
    )
    return addedCount + editedCount
  }, [simulatedBySubject, realOverridesBySubject])

  const subjects = useMemo(() => {
    return [...(gradesData.subjects || [])].sort((a, b) => a.subject.localeCompare(b.subject))
  }, [gradesData.subjects])

  const { baseInputsBySubject, effectiveInputsBySubject } = useMemo(() => {
    const baseMap = new Map<string, GradeCalcInput[]>()
    const effectiveMap = new Map<string, GradeCalcInput[]>()

    for (const sub of subjects) {
      const entries: Array<{ g: GradeItem; key: string }> =
        selectedSemester === 1
          ? sub.semester1.map((g, idx) => ({ g, key: 's1-' + idx }))
          : selectedSemester === 2
            ? sub.semester2.map((g, idx) => ({ g, key: 's2-' + idx }))
            : [
                ...sub.semester1.map((g, idx) => ({ g, key: 's1-' + idx })),
                ...sub.semester2.map((g, idx) => ({ g, key: 's2-' + idx }))
              ]

      const baseList: GradeCalcInput[] = entries.map(({ g, key }) => ({
        id: key,
        value: g.grade,
        weight: g.weight,
        countsToAverage: g.numericValue !== null
      }))
      baseMap.set(sub.subject, baseList)

      const overrides = enableGradeSimulator ? realOverridesBySubject[sub.subject] || {} : {}
      const effectiveList: GradeCalcInput[] = []
      for (const { g, key } of entries) {
        const ov = overrides[key]
        if (ov?.removed) continue
        if (ov) {
          effectiveList.push({
            id: key,
            value: ov.grade,
            weight: ov.weight,
            countsToAverage: parseGradeNumericValue(ov.grade) !== null
          })
        } else {
          effectiveList.push({
            id: key,
            value: g.grade,
            weight: g.weight,
            countsToAverage: g.numericValue !== null
          })
        }
      }
      effectiveMap.set(sub.subject, effectiveList)
    }

    return { baseInputsBySubject: baseMap, effectiveInputsBySubject: effectiveMap }
  }, [subjects, selectedSemester, enableGradeSimulator, realOverridesBySubject])

  const subjectAveragesMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const sub of subjects) {
      const effectiveInputs = effectiveInputsBySubject.get(sub.subject) || []
      const simGrades: GradeCalcInput[] = enableGradeSimulator
        ? (simulatedBySubject[sub.subject] || []).map((sg) => ({
            id: sg.id,
            value: sg.grade,
            weight: sg.weight,
            countsToAverage: parseGradeNumericValue(sg.grade) !== null
          }))
        : []
      map.set(sub.subject, calculateSubjectWeightedAverage([...effectiveInputs, ...simGrades]))
    }
    return map
  }, [subjects, effectiveInputsBySubject, enableGradeSimulator, simulatedBySubject])

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

  const renderGradeButton = (g: GradeItem, subjectName: string, gradeKey: string) => {
    const ov = enableGradeSimulator ? realOverridesBySubject[subjectName]?.[gradeKey] : undefined
    const displayedGrade = ov ? ov.grade : g.grade
    const style = getGradeBadgeStyle(displayedGrade)

    return (
      <button
        key={gradeKey}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (isSimSelecting && enableGradeSimulator && onSelectSimSubject) {
            handleOpenEditRealGrade(subjectName, g, gradeKey)
            return
          }
          if (ov && enableGradeSimulator && onSelectSimSubject) {
            handleOpenEditRealGrade(subjectName, g, gradeKey)
            return
          }
          onSelectGrade(g, subjectName)
        }}
        title={
          ov
            ? pickText(lang, {
                pl: `Zmieniono z ${ov.originalGrade} (w.${ov.originalWeight}) — kliknij, aby edytować`,
                en: `Changed from ${ov.originalGrade} (w.${ov.originalWeight}) — tap to edit`
              })
            : undefined
        }
        className={cn(
          'flex items-center justify-center text-[13px] font-medium tabular-nums active:scale-[0.94] active:opacity-70 transition-all duration-150 cursor-pointer',
          'min-w-[28px] h-[28px] px-1.5 rounded-[8px] ios-tile',
          ov
            ? ov.removed
              ? 'border border-dashed border-[var(--ios-red)] bg-[var(--ios-red-subtle)] text-[var(--ios-red)] line-through opacity-75'
              : 'border border-dashed border-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] font-semibold'
            : cn(style.bg, style.text)
        )}
      >
        <span>{displayedGrade}</span>
      </button>
    )
  }

  const activeSimSubObj = activeSimSubject
    ? subjects.find((s) => s.subject === activeSimSubject) || null
    : null

  return (
    <>
      <div className="w-full flex flex-col pb-16 select-none">
        <div
          aria-hidden={isSimSelecting}
          className={cn(
            'grid transition-[grid-template-rows,opacity,transform,margin-bottom] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            isSimSelecting
              ? 'grid-rows-[0fr] opacity-0 -translate-y-2 scale-[0.985] mb-0 pointer-events-none'
              : 'grid-rows-[1fr] opacity-100 translate-y-0 scale-100 mb-3.5'
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-3.5 pb-0.5">
              <UiCard className="p-4 flex flex-col gap-3">
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
                          className="text-[11px] font-semibold text-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] ios-tile px-2 py-0.5 rounded-full cursor-pointer active:opacity-70"
                        >
                          {pickText(lang, {
                            pl: `Resetuj symulację (${totalSimulatedCount})`,
                            en: `Reset sim (${totalSimulatedCount})`
                          })}
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
                              'flex items-center justify-center text-[13px] font-semibold tabular-nums cursor-pointer hover:opacity-80 active:scale-[0.94] transition-all select-none',
                              'min-w-[28px] h-[28px] px-1.5 rounded-[8px] ios-tile',
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
              </UiCard>

              <UiSegmentedControl<SemesterTab>
                value={selectedSemester}
                onChange={setSelectedSemester}
                options={[
                  { id: 1, label: pickText(lang, { pl: 'Semestr 1', en: 'Term 1' }) },
                  { id: 2, label: pickText(lang, { pl: 'Semestr 2', en: 'Term 2' }) },
                  { id: 'all', label: pickText(lang, { pl: 'Cały rok', en: 'Full Year' }) }
                ]}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div
          aria-hidden={!isSimSelecting}
          className={cn(
            'grid transition-[grid-template-rows,opacity,transform,margin-bottom] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            isSimSelecting
              ? 'grid-rows-[1fr] opacity-100 translate-y-0 scale-100 mb-3.5'
              : 'grid-rows-[0fr] opacity-0 -translate-y-1.5 scale-[0.985] mb-0 pointer-events-none'
          )}
        >
          <div className="overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-center text-center text-[13px] font-medium leading-snug text-balance rounded-[16px] bg-[var(--ios-blue-subtle)] ios-tile text-[var(--ios-blue)]">
              <span className="text-balance">
                {pickText(lang, {
                  pl: 'Kliknij + przy przedmiocie, aby dodać ocenę, lub kliknij ocenę, aby ją zmienić',
                  en: 'Tap + on a subject to add a grade, or tap an existing grade to edit it'
                })}
              </span>
            </div>
          </div>
        </div>

        <UiCard
          className={cn(
            'overflow-hidden divide-y divide-[var(--ios-separator)]',
            isSimSelecting && enableGradeSimulator && 'sim-block-shimmer'
          )}
        >
          {subjects.length > 0 ? (
            subjects.map((sub, idx) => {
              const sem1Grades = sub.semester1
              const sem2Grades = sub.semester2
              const singleGrades = selectedSemester === 1 ? sem1Grades : sem2Grades
              const singleKeyPrefix = selectedSemester === 1 ? 's1-' : 's2-'
              const totalRealCount =
                selectedSemester === 'all'
                  ? sem1Grades.length + sem2Grades.length
                  : singleGrades.length

              const simList = enableGradeSimulator ? simulatedBySubject[sub.subject] || [] : []
              const subOverrides = enableGradeSimulator ? realOverridesBySubject[sub.subject] || {} : {}
              const hasSubSimChanges = simList.length > 0 || Object.keys(subOverrides).length > 0
              const avgNum = subjectAveragesMap.get(sub.subject)
              const avgStr = avgNum !== null && avgNum !== undefined ? avgNum.toFixed(2) : '—'
              const isDanger = typeof avgNum === 'number' && avgNum < 2.0
              const displayTitle = formatSubjectName(sub.subject, showFullSubjectNames)
              const isModalActive = activeSimSubject === sub.subject
              const showSimTrigger = enableGradeSimulator && Boolean(onSelectSimSubject) && (isSimSelecting || isModalActive)

              return (
                <div
                  key={sub.subject + '-' + idx}
                  className="relative z-[2] p-3.5 px-4 flex items-center justify-between gap-2.5 transition-colors duration-150"
                >
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
                                <span
                                  className={cn(
                                    'mx-1 shrink-0',
                                    'w-[0.5px] h-[16px] bg-[var(--ios-separator)]'
                                  )}
                                />
                              )}
                              {sem2Grades.map((g, gIdx) => renderGradeButton(g, sub.subject, 's2-' + gIdx))}
                            </>
                          ) : (
                            singleGrades.map((g, gIdx) => renderGradeButton(g, sub.subject, singleKeyPrefix + gIdx))
                          )}

                          {simList.map((sg) => (
                            <button
                              key={sg.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (enableGradeSimulator && onSelectSimSubject) {
                                  handleOpenEditSimGrade(sub.subject, sg)
                                } else {
                                  removeSimulatedGrade(sub.subject, sg.id)
                                }
                              }}
                              title={pickText(lang, {
                                pl: 'Kliknij, aby edytować lub usunąć ocenę symulowaną',
                                en: 'Tap to edit or remove simulated grade'
                              })}
                              className="min-w-[28px] h-[28px] px-1.5 rounded-[8px] border border-dashed border-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] ios-tile text-[var(--ios-blue)] flex items-center justify-center text-[13px] font-semibold tabular-nums active:scale-[0.94] cursor-pointer"
                            >
                              <span>{sg.grade}</span>
                            </button>
                          ))}
                        </>
                      ) : (
                        <span className="text-[13px] font-normal text-[var(--ios-secondary)]">
                          {t.noGradesRecorded}
                        </span>
                      )}
                    </div>

                    {sub.warning && sub.warning.status === 'critical' && (
                      <div className="pt-1.5 text-[12px] font-medium text-[var(--ios-red)]">
                        {sub.warning.message}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center">
                    <div className="flex flex-col items-end justify-center min-w-[44px] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                      <span
                        className={cn(
                          'text-[16px] font-medium tabular-nums',
                          hasSubSimChanges
                            ? 'text-[var(--ios-blue)] font-semibold'
                            : isDanger
                              ? 'text-[var(--ios-red)] font-semibold'
                              : 'text-[var(--ios-label)]'
                        )}
                      >
                        {avgStr}
                      </span>
                      {hasSubSimChanges && (
                        <span className="text-[10px] font-medium text-[var(--ios-blue)]">
                          {pickText(lang, { pl: 'symulacja', en: 'simulated' })}
                        </span>
                      )}
                    </div>

                    {enableGradeSimulator && onSelectSimSubject && (
                      <div
                        className={cn(
                          'overflow-hidden flex items-center justify-end transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                          showSimTrigger
                            ? 'w-[30px] ml-2.5 opacity-100 scale-100'
                            : 'w-0 ml-0 opacity-0 scale-75 pointer-events-none'
                        )}
                      >
                        <button
                          type="button"
                          tabIndex={showSimTrigger ? 0 : -1}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenAddModal(sub.subject)
                          }}
                          title={pickText(lang, { pl: 'Dodaj ocenę symulowaną', en: 'Add simulated grade' })}
                          aria-label={pickText(lang, { pl: 'Dodaj ocenę symulowaną', en: 'Add simulated grade' })}
                          className="w-[30px] h-[30px] rounded-[9px] bg-[var(--ios-blue)] text-white shadow-[var(--ios-primary-pill-shadow)] flex items-center justify-center shrink-0 transition-transform cursor-pointer active:scale-90"
                        >
                          <Plus className="w-4 h-4" strokeWidth={2.4} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <UiEmptyState
              compact
              iconTone="blue"
              icon={<GraduationCap className="w-[20px] h-[20px]" strokeWidth={1.9} />}
              title={t.noGradesRecorded}
            />
          )}
        </UiCard>
      </div>

      {enableGradeSimulator && onCloseSimSubject && (
        <SubjectCalculatorDrawer
          isOpen={Boolean(activeSimSubObj)}
          onClose={() => {
            setEditTarget(null)
            onCloseSimSubject()
          }}
          subject={activeSimSubObj?.subject || ''}
          displaySubjectName={
            activeSimSubObj ? formatSubjectName(activeSimSubObj.subject, showFullSubjectNames) : ''
          }
          baseRealGrades={activeSimSubObj ? baseInputsBySubject.get(activeSimSubObj.subject) || [] : []}
          effectiveRealGrades={activeSimSubObj ? effectiveInputsBySubject.get(activeSimSubObj.subject) || [] : []}
          simulatedGrades={activeSimSubObj ? simulatedBySubject[activeSimSubObj.subject] || [] : []}
          realOverrides={activeSimSubObj ? realOverridesBySubject[activeSimSubObj.subject] || {} : {}}
          editTarget={editTarget}
          simGradeVal={simGradeVal}
          simWeightVal={simWeightVal}
          onChangeSimGrade={setSimGradeVal}
          onChangeSimWeight={setSimWeightVal}
          onApplyGradeAction={applyGradeAction}
          onRemoveSimulatedGrade={removeSimulatedGrade}
          onResetRealOverride={resetRealOverride}
          onRemoveRealGradeInSim={removeRealGradeInSim}
          onSelectSimForEdit={(sg) => handleOpenEditSimGrade(activeSimSubObj?.subject || '', sg)}
          onSwitchToAddMode={() => setEditTarget(null)}
          lang={lang}
          t={t}
        />
      )}
    </>
  )
}
