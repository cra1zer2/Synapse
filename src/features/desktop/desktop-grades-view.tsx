'use client'

import React, { useMemo, useState, useEffect } from 'react'
import {
  AlertCircle,
  Calculator,
  GraduationCap,
  Plus,
  RotateCcw,
  Trash2,
  X
} from 'lucide-react'
import { GradeItem, GradesResult } from '@/models/grade.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { formatSubjectName } from '@/utils/text.util'
import { formatHumanDate } from '@/utils/date.util'
import { getGradeBadgeStyle } from '@/utils/badge.util'
import {
  GradeCalcInput,
  calculateSubjectWeightedAverage,
  parseGradeNumericValue
} from '@/utils/grade.util'
import {
  ActiveGradeEditTarget,
  GRADE_SIM_OPTIONS,
  RealGradeOverride,
  SimulatedGradeItem,
  WEIGHT_SIM_OPTIONS
} from '@/features/grades/subject-calculator-drawer'
import { UiSpinner } from '@/components/ui/ui-spinner'
import { cn } from '@/utils/cn.util'
import {
  MacGroupBox,
  MacPushButton,
  MacSegmentedControl
} from './mac-primitives'

interface DesktopGradesViewProps {
  gradesData: GradesResult | null
  gradesError: string | null
  onRetry: () => void
  showFullSubjectNames: boolean
  enableGradeSimulator: boolean
  lang: AppLanguage
  t: AppDictionary
  initialSelectedGrade?: { grade: GradeItem; subject: string } | null
}

function normalizeInitialGrade(raw: string): string {
  const trimmed = (raw || '').trim()
  if (GRADE_SIM_OPTIONS.includes(trimmed)) return trimmed
  const num = parseGradeNumericValue(trimmed)
  if (num !== null) {
    const rounded = String(Math.min(6, Math.max(1, Math.round(num))))
    if (GRADE_SIM_OPTIONS.includes(rounded)) return rounded
  }
  return '5'
}

function normalizeInitialWeight(raw: number): number {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.round(n) : 2
}

export function DesktopGradesView({
  gradesData,
  gradesError,
  onRetry,
  showFullSubjectNames,
  enableGradeSimulator,
  lang,
  t,
  initialSelectedGrade
}: DesktopGradesViewProps) {
  const [inspectorTab, setInspectorTab] = useState<'details' | 'simulator'>('details')
  const [selectedDetail, setSelectedDetail] = useState<{
    grade: GradeItem
    subject: string
    key: string
  } | null>(null)

  const [simSubject, setSimSubject] = useState<string | null>(null)
  const [simulatedBySubject, setSimulatedBySubject] = useState<Record<string, SimulatedGradeItem[]>>({})
  const [realOverridesBySubject, setRealOverridesBySubject] = useState<
    Record<string, Record<string, RealGradeOverride>>
  >({})
  const [editTarget, setEditTarget] = useState<ActiveGradeEditTarget | null>(null)
  const [simGradeVal, setSimGradeVal] = useState<string>('5')
  const [simWeightVal, setSimWeightVal] = useState<number>(2)

  const subjects = useMemo(() => {
    return [...(gradesData?.subjects || [])].sort((a, b) => a.subject.localeCompare(b.subject))
  }, [gradesData?.subjects])

  useEffect(() => {
    if (initialSelectedGrade) {
      setSelectedDetail({
        grade: initialSelectedGrade.grade,
        subject: initialSelectedGrade.subject,
        key: ''
      })
      setInspectorTab('details')
    }
  }, [initialSelectedGrade])

  useEffect(() => {
    if (!simSubject && subjects.length > 0) {
      setSimSubject(subjects[0].subject)
    }
  }, [subjects, simSubject])

  useEffect(() => {
    if (!selectedDetail && subjects.length > 0) {
      for (const s of subjects) {
        const g = s.semester2[0] || s.semester1[0]
        if (g) {
          setSelectedDetail({
            grade: g,
            subject: s.subject,
            key: s.semester2[0] ? 's2-0' : 's1-0'
          })
          break
        }
      }
    }
  }, [subjects, selectedDetail])

  // Compute averages (base and effective with simulation) per semester & full year
  const metrics = useMemo(() => {
    const bySubject = new Map<
      string,
      {
        baseInputs: GradeCalcInput[]
        effectiveInputs: GradeCalcInput[]
        baseAvg: number | null
        effectiveAvg: number | null
        sem1BaseAvg: number | null
        sem2BaseAvg: number | null
        sem1EffAvg: number | null
        sem2EffAvg: number | null
      }
    >()

    let s1Sum = 0
    let s1Count = 0
    let s2Sum = 0
    let s2Count = 0
    let allBaseSum = 0
    let allBaseCount = 0
    let allEffSum = 0
    let allEffCount = 0

    for (const sub of subjects) {
      const s1Entries = sub.semester1.map((g, i) => ({ g, key: `s1-${i}` }))
      const s2Entries = sub.semester2.map((g, i) => ({ g, key: `s2-${i}` }))
      const overrides = enableGradeSimulator ? realOverridesBySubject[sub.subject] || {} : {}
      const simGrades: GradeCalcInput[] = enableGradeSimulator
        ? (simulatedBySubject[sub.subject] || []).map((sg) => ({
            id: sg.id,
            value: sg.grade,
            weight: sg.weight,
            countsToAverage: parseGradeNumericValue(sg.grade) !== null
          }))
        : []

      const mapList = (entries: Array<{ g: GradeItem; key: string }>, isBase: boolean): GradeCalcInput[] => {
        const out: GradeCalcInput[] = []
        for (const { g, key } of entries) {
          if (isBase) {
            out.push({ id: key, value: g.grade, weight: g.weight, countsToAverage: g.numericValue !== null })
          } else {
            const ov = overrides[key]
            if (ov?.removed) continue
            if (ov) {
              out.push({
                id: key,
                value: ov.grade,
                weight: ov.weight,
                countsToAverage: parseGradeNumericValue(ov.grade) !== null
              })
            } else {
              out.push({ id: key, value: g.grade, weight: g.weight, countsToAverage: g.numericValue !== null })
            }
          }
        }
        return out
      }

      const s1Base = mapList(s1Entries, true)
      const s2Base = mapList(s2Entries, true)
      const s1Eff = mapList(s1Entries, false)
      const s2Eff = mapList(s2Entries, false)

      const baseInputs = [...s1Base, ...s2Base]
      const effectiveInputs = [...s1Eff, ...s2Eff, ...simGrades]

      const sem1BaseAvg = calculateSubjectWeightedAverage(s1Base)
      const sem2BaseAvg = calculateSubjectWeightedAverage(s2Base)
      const sem1EffAvg = calculateSubjectWeightedAverage(s1Eff)
      const sem2EffAvg = calculateSubjectWeightedAverage([...s2Eff, ...simGrades])
      const baseAvg = calculateSubjectWeightedAverage(baseInputs)
      const effectiveAvg = calculateSubjectWeightedAverage(effectiveInputs)

      if (sem1EffAvg !== null) {
        s1Sum += sem1EffAvg
        s1Count++
      }
      if (sem2EffAvg !== null) {
        s2Sum += sem2EffAvg
        s2Count++
      }
      if (baseAvg !== null) {
        allBaseSum += baseAvg
        allBaseCount++
      }
      if (effectiveAvg !== null) {
        allEffSum += effectiveAvg
        allEffCount++
      }

      bySubject.set(sub.subject, {
        baseInputs,
        effectiveInputs,
        baseAvg,
        effectiveAvg,
        sem1BaseAvg,
        sem2BaseAvg,
        sem1EffAvg,
        sem2EffAvg
      })
    }

    const fmt = (s: number, c: number) => (c > 0 ? (Math.round((s / c) * 100) / 100).toFixed(2) : '—')
    const baseGpaNum = allBaseCount > 0 ? Math.round((allBaseSum / allBaseCount) * 100) / 100 : null
    const effGpaNum = allEffCount > 0 ? Math.round((allEffSum / allEffCount) * 100) / 100 : null

    return {
      bySubject,
      sem1Gpa: fmt(s1Sum, s1Count),
      sem2Gpa: fmt(s2Sum, s2Count),
      baseGpaNum,
      effGpaNum,
      fullGpaStr: effGpaNum !== null ? effGpaNum.toFixed(2) : '—'
    }
  }, [subjects, enableGradeSimulator, realOverridesBySubject, simulatedBySubject])

  const totalSimCount = useMemo(() => {
    const added = Object.values(simulatedBySubject).reduce((acc, l) => acc + l.length, 0)
    const edited = Object.values(realOverridesBySubject).reduce((acc, m) => acc + Object.keys(m).length, 0)
    return added + edited
  }, [simulatedBySubject, realOverridesBySubject])

  const openSimForSubject = (subjectName: string, target?: ActiveGradeEditTarget | null, gradeVal?: string, weightVal?: number) => {
    setSimSubject(subjectName)
    setEditTarget(target || null)
    if (gradeVal) setSimGradeVal(gradeVal)
    if (weightVal) setSimWeightVal(weightVal)
    setInspectorTab('simulator')
  }

  const handleApplySimAction = () => {
    if (!simSubject) return
    if (editTarget?.kind === 'real') {
      const { key, originalGrade, originalWeight } = editTarget
      setRealOverridesBySubject((prev) => {
        const subMap = { ...(prev[simSubject] || {}) }
        if (simGradeVal === originalGrade && simWeightVal === originalWeight) {
          delete subMap[key]
        } else {
          subMap[key] = {
            key,
            subject: simSubject,
            originalGrade,
            originalWeight,
            grade: simGradeVal,
            weight: simWeightVal,
            removed: false
          }
        }
        return { ...prev, [simSubject]: subMap }
      })
      setEditTarget(null)
      return
    }

    if (editTarget?.kind === 'sim') {
      const targetId = editTarget.id
      setSimulatedBySubject((prev) => ({
        ...prev,
        [simSubject]: (prev[simSubject] || []).map((item) =>
          item.id === targetId ? { ...item, grade: simGradeVal, weight: simWeightVal } : item
        )
      }))
      setEditTarget(null)
      return
    }

    const newItem: SimulatedGradeItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subject: simSubject,
      grade: simGradeVal,
      weight: simWeightVal
    }
    setSimulatedBySubject((prev) => ({
      ...prev,
      [simSubject]: [...(prev[simSubject] || []), newItem]
    }))
  }

  const renderGradeChip = (g: GradeItem, subjectName: string, gradeKey: string) => {
    const ov = enableGradeSimulator ? realOverridesBySubject[subjectName]?.[gradeKey] : undefined
    const displayed = ov ? ov.grade : g.grade
    const st = getGradeBadgeStyle(displayed)
    const isSelected =
      inspectorTab === 'details' && selectedDetail?.grade === g && selectedDetail?.subject === subjectName

    return (
      <button
        key={gradeKey}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setSelectedDetail({ grade: g, subject: subjectName, key: gradeKey })
          if (ov && enableGradeSimulator) {
            openSimForSubject(
              subjectName,
              {
                kind: 'real',
                key: gradeKey,
                originalGrade: g.grade,
                originalWeight: g.weight || 1,
                category: g.category
              },
              ov.grade,
              ov.weight
            )
          } else {
            setInspectorTab('details')
          }
        }}
        title={`${g.category || t.grades} · ${t.weight} ${g.weight}`}
        className={cn(
          'min-w-[26px] h-[26px] px-1.5 rounded-[7px] text-[12px] font-semibold flex items-center justify-center cursor-pointer tabular-nums transition-all',
          ov
            ? ov.removed
              ? 'border border-dashed border-[var(--mac-red)] bg-[var(--ios-red-subtle)] text-[var(--mac-red)] line-through opacity-75'
              : 'border border-dashed border-[var(--mac-blue)] bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)]'
            : cn(st.bg, st.text),
          isSelected && 'ring-2 ring-[var(--mac-blue)]'
        )}
      >
        {displayed}
      </button>
    )
  }

  const activeSimMetrics = simSubject ? metrics.bySubject.get(simSubject) : undefined
  const activeSimList = simSubject ? simulatedBySubject[simSubject] || [] : []
  const activeOverridesMap = simSubject ? realOverridesBySubject[simSubject] || {} : {}

  const previewAverage = useMemo(() => {
    if (!activeSimMetrics) return null
    const candidate: GradeCalcInput = {
      value: simGradeVal,
      weight: simWeightVal,
      countsToAverage: parseGradeNumericValue(simGradeVal) !== null
    }
    const baseWithoutTarget =
      editTarget?.kind === 'real'
        ? activeSimMetrics.effectiveInputs.filter((x) => x.id !== editTarget.key)
        : editTarget?.kind === 'sim'
          ? activeSimMetrics.effectiveInputs.filter((x) => x.id !== editTarget.id)
          : activeSimMetrics.effectiveInputs
    return calculateSubjectWeightedAverage([...baseWithoutTarget, candidate])
  }, [activeSimMetrics, simGradeVal, simWeightVal, editTarget])

  return (
    <div className="h-full flex min-h-0 select-none">
      {/* Main Grades Table Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-y-auto p-5 gap-4">
        {/* GPA Summary Strip */}
        <div className="grid grid-cols-3 gap-3">
          <MacGroupBox>
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)]">
              {pickText(lang, { pl: 'Średnia · Semestr 1', en: 'Term 1 GPA' })}
            </div>
            <div className="text-[24px] font-bold text-[var(--mac-label-1)] mt-1 tabular-nums">
              {metrics.sem1Gpa}
            </div>
          </MacGroupBox>
          <MacGroupBox>
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)]">
              {pickText(lang, { pl: 'Średnia · Semestr 2', en: 'Term 2 GPA' })}
            </div>
            <div className="text-[24px] font-bold text-[var(--mac-label-1)] mt-1 tabular-nums">
              {metrics.sem2Gpa}
            </div>
          </MacGroupBox>
          <MacGroupBox>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)]">
                {pickText(lang, { pl: 'Średnia roczna', en: 'Full Year GPA' })}
              </span>
              {enableGradeSimulator && totalSimCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedBySubject({})
                    setRealOverridesBySubject({})
                    setEditTarget(null)
                  }}
                  className="text-[11px] font-semibold text-[var(--mac-blue)] hover:underline cursor-pointer"
                >
                  {pickText(lang, { pl: `Reset (${totalSimCount})`, en: `Reset (${totalSimCount})` })}
                </button>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={cn(
                  'text-[24px] font-bold tabular-nums',
                  totalSimCount > 0 ? 'text-[var(--mac-blue)]' : 'text-[var(--mac-label-1)]'
                )}
              >
                {metrics.fullGpaStr}
              </span>
              {totalSimCount > 0 && metrics.baseGpaNum !== null && metrics.effGpaNum !== null && (
                <span className="text-[11px] font-semibold text-[var(--mac-label-2)] tabular-nums">
                  ({metrics.effGpaNum >= metrics.baseGpaNum ? '+' : ''}
                  {(metrics.effGpaNum - metrics.baseGpaNum).toFixed(2)})
                </span>
              )}
            </div>
          </MacGroupBox>
        </div>

        {/* Grades Data Table */}
        {gradesError && !gradesData ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-[var(--mac-red)]" />
            <p className="text-[14px] font-medium text-[var(--mac-label-1)]">{gradesError}</p>
            <MacPushButton variant="prominent" size="lg" onClick={onRetry}>
              {t.refresh}
            </MacPushButton>
          </div>
        ) : !gradesData ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <UiSpinner size="large" className="text-[var(--mac-blue)]" />
            <span className="text-[13px] text-[var(--mac-label-2)]">{t.loadingTimetable}</span>
          </div>
        ) : subjects.length > 0 ? (
          <MacGroupBox noPadding>
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--mac-row-divider)] bg-[var(--mac-fill-5)] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)]">
                    <th className="py-2.5 px-4 w-[240px]">
                      {pickText(lang, { pl: 'Przedmiot', en: 'Subject' })}
                    </th>
                    <th className="py-2.5 px-3">
                      {pickText(lang, { pl: 'Semestr 1', en: 'Term 1' })}
                    </th>
                    <th className="py-2.5 px-3">
                      {pickText(lang, { pl: 'Semestr 2', en: 'Term 2' })}
                    </th>
                    <th className="py-2.5 px-3 text-right w-[90px]">
                      {pickText(lang, { pl: 'Średnia', en: 'Average' })}
                    </th>
                    {enableGradeSimulator && (
                      <th className="py-2.5 px-3 text-right w-[56px]">
                        <span className="sr-only">What-If</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mac-row-divider)]">
                  {subjects.map((sub) => {
                    const m = metrics.bySubject.get(sub.subject)
                    const simList = enableGradeSimulator ? simulatedBySubject[sub.subject] || [] : []
                    const ovMap = enableGradeSimulator ? realOverridesBySubject[sub.subject] || {} : {}
                    const hasSim = simList.length > 0 || Object.keys(ovMap).length > 0
                    const avgNum = m?.effectiveAvg
                    const avgStr = avgNum !== null && avgNum !== undefined ? avgNum.toFixed(2) : '—'
                    const isDanger = typeof avgNum === 'number' && avgNum < 2.0
                    const isActiveRow = inspectorTab === 'simulator' && simSubject === sub.subject

                    return (
                      <tr
                        key={sub.subject}
                        className={cn(
                          'transition-colors',
                          isActiveRow ? 'bg-[var(--ios-blue-subtle)]/30' : 'hover:bg-[var(--mac-fill-4)]'
                        )}
                      >
                        <td className="py-3 px-4 align-top">
                          <div className="text-[13px] font-semibold text-[var(--mac-label-1)] leading-snug">
                            {formatSubjectName(sub.subject, showFullSubjectNames)}
                          </div>
                          {sub.warning?.status === 'critical' && (
                            <div className="text-[11px] font-medium text-[var(--mac-red)] mt-0.5">
                              {sub.warning.message}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 align-middle">
                          <div className="flex flex-wrap items-center gap-1">
                            {sub.semester1.length > 0 ? (
                              sub.semester1.map((g, idx) => renderGradeChip(g, sub.subject, `s1-${idx}`))
                            ) : (
                              <span className="text-[11px] text-[var(--mac-label-3)]">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 align-middle">
                          <div className="flex flex-wrap items-center gap-1">
                            {sub.semester2.map((g, idx) => renderGradeChip(g, sub.subject, `s2-${idx}`))}
                            {simList.map((sg) => (
                              <button
                                key={sg.id}
                                type="button"
                                onClick={() =>
                                  openSimForSubject(
                                    sub.subject,
                                    { kind: 'sim', id: sg.id },
                                    normalizeInitialGrade(sg.grade),
                                    normalizeInitialWeight(sg.weight)
                                  )
                                }
                                className="min-w-[26px] h-[26px] px-1.5 rounded-[7px] border border-dashed border-[var(--mac-blue)] bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] text-[12px] font-semibold flex items-center justify-center cursor-pointer tabular-nums"
                              >
                                {sg.grade}
                              </button>
                            ))}
                            {sub.semester2.length === 0 && simList.length === 0 && (
                              <span className="text-[11px] text-[var(--mac-label-3)]">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right align-middle">
                          <span
                            className={cn(
                              'text-[14px] font-semibold tabular-nums',
                              hasSim
                                ? 'text-[var(--mac-blue)]'
                                : isDanger
                                  ? 'text-[var(--mac-red)]'
                                  : 'text-[var(--mac-label-1)]'
                            )}
                          >
                            {avgStr}
                          </span>
                          {hasSim && (
                            <div className="text-[10px] text-[var(--mac-blue)]">
                              {pickText(lang, { pl: 'symulacja', en: 'sim' })}
                            </div>
                          )}
                        </td>

                        {enableGradeSimulator && (
                          <td className="py-2.5 px-3 text-right align-middle">
                            <button
                              type="button"
                              onClick={() => openSimForSubject(sub.subject, null)}
                              title={pickText(lang, { pl: 'Symuluj ocenę', en: 'Simulate grade' })}
                              className="w-7 h-7 rounded-[7px] bg-[var(--mac-fill-3)] hover:bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] inline-flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </MacGroupBox>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-[var(--mac-label-2)]">
            <GraduationCap className="w-8 h-8 text-[var(--mac-label-3)]" />
            <span className="text-[14px] font-medium">{t.noGradesRecorded}</span>
          </div>
        )}
      </div>

      {/* Right Docked Inspector Pane (350px) */}
      <aside className="w-[350px] shrink-0 border-l border-[var(--mac-row-divider)] bg-[var(--mac-window-bg)] p-4 overflow-y-auto flex flex-col gap-4">
        {enableGradeSimulator && (
          <MacSegmentedControl<'details' | 'simulator'>
            value={inspectorTab}
            onChange={setInspectorTab}
            options={[
              { id: 'details', label: pickText(lang, { pl: 'Szczegóły oceny', en: 'Grade Info' }) },
              { id: 'simulator', label: pickText(lang, { pl: 'Symulator What-If', en: 'What-If Sim' }) }
            ]}
          />
        )}

        {inspectorTab === 'details' || !enableGradeSimulator ? (
          selectedDetail ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const st = getGradeBadgeStyle(selectedDetail.grade.grade)
                  return (
                    <div
                      className={cn(
                        'min-w-[46px] h-[46px] px-2.5 rounded-[12px] flex items-center justify-center text-[20px] font-bold tabular-nums shrink-0',
                        st.bg,
                        st.text
                      )}
                    >
                      {selectedDetail.grade.grade}
                    </div>
                  )
                })()}
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-blue)] truncate">
                    {formatSubjectName(selectedDetail.subject, showFullSubjectNames)}
                  </div>
                  <h3 className="text-[15px] font-bold text-[var(--mac-label-1)] leading-snug break-words">
                    {selectedDetail.grade.category || pickText(lang, { pl: 'Ocena cząstkowa', en: 'Partial grade' })}
                  </h3>
                </div>
              </div>

              {selectedDetail.grade.description && (
                <MacGroupBox title={pickText(lang, { pl: 'Komentarz', en: 'Comment' })}>
                  <p className="text-[12.5px] text-[var(--mac-label-1)] leading-relaxed whitespace-pre-wrap select-text">
                    {selectedDetail.grade.description}
                  </p>
                </MacGroupBox>
              )}

              <MacGroupBox noPadding>
                <div className="divide-y divide-[var(--mac-row-divider)] text-[12px]">
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-[var(--mac-label-2)]">{t.weight}</span>
                    <span className="font-semibold text-[var(--mac-label-1)] tabular-nums">
                      {selectedDetail.grade.weight}
                    </span>
                  </div>
                  {selectedDetail.grade.date && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between">
                      <span className="text-[var(--mac-label-2)]">{t.dateLabel}</span>
                      <span className="font-medium text-[var(--mac-label-1)] tabular-nums">
                        {formatHumanDate(selectedDetail.grade.date, false, lang)}
                      </span>
                    </div>
                  )}
                  {selectedDetail.grade.teacher && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-[var(--mac-label-2)] shrink-0">{t.teacherLabel}</span>
                      <span className="font-medium text-[var(--mac-label-1)] truncate text-right">
                        {selectedDetail.grade.teacher}
                      </span>
                    </div>
                  )}
                </div>
              </MacGroupBox>

              {enableGradeSimulator && selectedDetail.subject && selectedDetail.key && (
                <MacPushButton
                  variant="tinted"
                  size="lg"
                  onClick={() =>
                    openSimForSubject(
                      selectedDetail.subject,
                      {
                        kind: 'real',
                        key: selectedDetail.key,
                        originalGrade: selectedDetail.grade.grade,
                        originalWeight: selectedDetail.grade.weight || 1,
                        category: selectedDetail.grade.category
                      },
                      normalizeInitialGrade(selectedDetail.grade.grade),
                      normalizeInitialWeight(selectedDetail.grade.weight)
                    )
                  }
                  icon={<Calculator className="w-3.5 h-3.5" />}
                  className="w-full"
                >
                  {pickText(lang, { pl: 'Symuluj zmianę tej oceny', en: 'Simulate editing this grade' })}
                </MacPushButton>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-[12px] text-[var(--mac-label-2)]">
              {pickText(lang, { pl: 'Kliknij ocenę w tabeli, aby zobaczyć szczegóły.', en: 'Click any grade to inspect details.' })}
            </div>
          )
        ) : (
          /* Docked What-If Grade Calculator */
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)] block mb-1">
                {pickText(lang, { pl: 'Przedmiot', en: 'Subject' })}
              </label>
              <select
                value={simSubject || ''}
                onChange={(e) => {
                  setSimSubject(e.target.value)
                  setEditTarget(null)
                }}
                className="w-full h-[32px] px-2.5 rounded-[8px] bg-[var(--mac-fill-3)] border border-[var(--mac-group-border)] text-[12.5px] font-medium text-[var(--mac-label-1)] outline-none"
              >
                {subjects.map((s) => (
                  <option key={s.subject} value={s.subject}>
                    {formatSubjectName(s.subject, showFullSubjectNames)}
                  </option>
                ))}
              </select>
            </div>

            {activeSimMetrics && (
              <div className="grid grid-cols-3 gap-2">
                <div className="mac-group-box p-2.5 text-center">
                  <div className="text-[10px] text-[var(--mac-label-2)]">
                    {pickText(lang, { pl: 'Było', en: 'Orig' })}
                  </div>
                  <div className="text-[16px] font-bold tabular-nums text-[var(--mac-label-1)]">
                    {activeSimMetrics.baseAvg !== null ? activeSimMetrics.baseAvg.toFixed(2) : '—'}
                  </div>
                </div>
                <div className="mac-group-box p-2.5 text-center">
                  <div className="text-[10px] text-[var(--mac-label-2)]">
                    {pickText(lang, { pl: 'Teraz', en: 'Curr' })}
                  </div>
                  <div className="text-[16px] font-bold tabular-nums text-[var(--mac-blue)]">
                    {activeSimMetrics.effectiveAvg !== null ? activeSimMetrics.effectiveAvg.toFixed(2) : '—'}
                  </div>
                </div>
                <div className="mac-group-box p-2.5 text-center">
                  <div className="text-[10px] text-[var(--mac-label-2)]">
                    {pickText(lang, { pl: 'Podgląd', en: 'Next' })}
                  </div>
                  <div className="text-[16px] font-bold tabular-nums text-[var(--mac-green)]">
                    {previewAverage !== null ? previewAverage.toFixed(2) : '—'}
                  </div>
                </div>
              </div>
            )}

            <MacGroupBox
              title={
                editTarget
                  ? pickText(lang, { pl: 'Edycja wybranej oceny', en: 'Editing selected grade' })
                  : pickText(lang, { pl: 'Dodaj hipotezę oceny', en: 'Add hypothetical grade' })
              }
              trailing={
                editTarget && (
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    className="text-[11px] text-[var(--mac-blue)] hover:underline cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                )
              }
            >
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-[var(--mac-label-2)] block mb-1">
                      {pickText(lang, { pl: 'Ocena', en: 'Grade' })}
                    </span>
                    <select
                      value={simGradeVal}
                      onChange={(e) => setSimGradeVal(e.target.value)}
                      className="w-full h-[30px] px-2 rounded-[7px] bg-[var(--mac-window-bg)] border border-[var(--mac-group-border)] text-[13px] font-semibold text-[var(--mac-label-1)] outline-none"
                    >
                      {GRADE_SIM_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--mac-label-2)] block mb-1">{t.weight}</span>
                    <select
                      value={simWeightVal}
                      onChange={(e) => setSimWeightVal(Number(e.target.value))}
                      className="w-full h-[30px] px-2 rounded-[7px] bg-[var(--mac-window-bg)] border border-[var(--mac-group-border)] text-[13px] font-semibold text-[var(--mac-label-1)] outline-none"
                    >
                      {WEIGHT_SIM_OPTIONS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MacPushButton
                    variant="prominent"
                    size="lg"
                    onClick={handleApplySimAction}
                    className="flex-1"
                  >
                    {editTarget
                      ? pickText(lang, { pl: 'Zastosuj zmianę', en: 'Apply change' })
                      : pickText(lang, { pl: 'Dodaj ocenę', en: 'Add grade' })}
                  </MacPushButton>

                  {editTarget?.kind === 'real' && simSubject && (
                    <MacPushButton
                      variant="destructive"
                      size="lg"
                      onClick={() => {
                        setRealOverridesBySubject((prev) => ({
                          ...prev,
                          [simSubject]: {
                            ...(prev[simSubject] || {}),
                            [editTarget.key]: {
                              key: editTarget.key,
                              subject: simSubject,
                              originalGrade: editTarget.originalGrade,
                              originalWeight: editTarget.originalWeight,
                              grade: editTarget.originalGrade,
                              weight: editTarget.originalWeight,
                              removed: true
                            }
                          }
                        }))
                        setEditTarget(null)
                      }}
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      title={pickText(lang, { pl: 'Wyklucz ze średniej', en: 'Exclude from GPA' })}
                    />
                  )}
                </div>
              </div>
            </MacGroupBox>

            {(activeSimList.length > 0 || Object.keys(activeOverridesMap).length > 0) && simSubject && (
              <MacGroupBox
                title={pickText(lang, { pl: 'Aktywne zmiany What-If', en: 'Active What-If changes' })}
                noPadding
              >
                <div className="divide-y divide-[var(--mac-row-divider)] text-[12px]">
                  {activeSimList.map((sg) => (
                    <div key={sg.id} className="px-3 py-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditTarget({ kind: 'sim', id: sg.id })
                          setSimGradeVal(normalizeInitialGrade(sg.grade))
                          setSimWeightVal(normalizeInitialWeight(sg.weight))
                        }}
                        className="text-left flex-1 cursor-pointer hover:underline"
                      >
                        <span className="font-semibold text-[var(--mac-blue)]">+{sg.grade}</span>{' '}
                        <span className="text-[var(--mac-label-2)]">({t.weight} {sg.weight})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSimulatedBySubject((prev) => ({
                            ...prev,
                            [simSubject]: (prev[simSubject] || []).filter((x) => x.id !== sg.id)
                          }))
                        }
                        className="text-[var(--mac-label-3)] hover:text-[var(--mac-red)] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {Object.values(activeOverridesMap).map((ov) => (
                    <div key={ov.key} className="px-3 py-2 flex items-center justify-between gap-2">
                      <span className="text-[var(--mac-label-1)]">
                        {ov.removed ? (
                          <span className="text-[var(--mac-red)] line-through">
                            {ov.originalGrade} ({pickText(lang, { pl: 'usunięta', en: 'excluded' })})
                          </span>
                        ) : (
                          <>
                            <span className="text-[var(--mac-label-2)] line-through">{ov.originalGrade}</span> →{' '}
                            <span className="font-semibold text-[var(--mac-blue)]">{ov.grade}</span>{' '}
                            <span className="text-[var(--mac-label-2)]">({t.weight} {ov.weight})</span>
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRealOverridesBySubject((prev) => {
                            const nextMap = { ...(prev[simSubject] || {}) }
                            delete nextMap[ov.key]
                            return { ...prev, [simSubject]: nextMap }
                          })
                        }
                        className="text-[var(--mac-label-3)] hover:text-[var(--mac-blue)] cursor-pointer"
                        title={pickText(lang, { pl: 'Przywróć', en: 'Restore' })}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </MacGroupBox>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
