/**
 * Feature Sheet: What-If Grade Simulator
 * Modal sheet for adding or editing hypothetical/existing grades and weights against a subject's live weighted average.
 * Uses native `<select>` options (`6`..`1` with `+/-` and weights `1`..`10`) and stays open across multiple edits.
 */

'use client'

import { useMemo } from 'react'
import { Check, ChevronDown, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { UiSheet } from '@/components/ui/ui-sheet'
import { UiButton } from '@/components/ui/ui-button'
import { GradeCalcInput, calculateSubjectWeightedAverage, parseGradeNumericValue } from '@/utils/grade.util'
import { cn } from '@/utils/cn.util'

export const GRADE_SIM_OPTIONS = ['6', '5+', '5', '5-', '4+', '4', '4-', '3+', '3', '3-', '2+', '2', '2-', '1+', '1']
export const WEIGHT_SIM_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export interface SimulatedGradeItem {
  id: string
  subject: string
  grade: string
  weight: number
}

export interface RealGradeOverride {
  key: string
  subject: string
  originalGrade: string
  originalWeight: number
  grade: string
  weight: number
  removed?: boolean
}

export type ActiveGradeEditTarget =
  | {
      kind: 'real'
      key: string
      originalGrade: string
      originalWeight: number
      category?: string
    }
  | {
      kind: 'sim'
      id: string
    }

interface SubjectCalculatorDrawerProps {
  isOpen: boolean
  onClose: () => void
  subject: string
  displaySubjectName: string
  baseRealGrades: GradeCalcInput[]
  effectiveRealGrades: GradeCalcInput[]
  simulatedGrades: SimulatedGradeItem[]
  realOverrides: Record<string, RealGradeOverride>
  editTarget: ActiveGradeEditTarget | null
  simGradeVal: string
  simWeightVal: number
  onChangeSimGrade: (val: string) => void
  onChangeSimWeight: (val: number) => void
  onApplyGradeAction: (subject: string) => void
  onRemoveSimulatedGrade: (subject: string, id: string) => void
  onResetRealOverride: (subject: string, key: string) => void
  onRemoveRealGradeInSim: (subject: string, key: string, originalGrade: string, originalWeight: number) => void
  onSelectSimForEdit: (item: SimulatedGradeItem) => void
  onSwitchToAddMode: () => void
  lang: AppLanguage
  t: AppDictionary
}

export function SubjectCalculatorDrawer({
  isOpen,
  onClose,
  subject,
  displaySubjectName,
  baseRealGrades,
  effectiveRealGrades,
  simulatedGrades,
  realOverrides,
  editTarget,
  simGradeVal,
  simWeightVal,
  onChangeSimGrade,
  onChangeSimWeight,
  onApplyGradeAction,
  onRemoveSimulatedGrade,
  onResetRealOverride,
  onRemoveRealGradeInSim,
  onSelectSimForEdit,
  onSwitchToAddMode,
  lang,
  t
}: SubjectCalculatorDrawerProps) {
  const { originalAverage, currentAverage, previewAverage, delta } = useMemo(() => {
    const origAvg = calculateSubjectWeightedAverage(baseRealGrades)

    const allSimInputs: GradeCalcInput[] = simulatedGrades.map((sg) => ({
      value: sg.grade,
      weight: sg.weight,
      countsToAverage: parseGradeNumericValue(sg.grade) !== null
    }))
    const currAvg = calculateSubjectWeightedAverage([...effectiveRealGrades, ...allSimInputs])

    const candidateInput: GradeCalcInput = {
      value: simGradeVal,
      weight: simWeightVal,
      countsToAverage: parseGradeNumericValue(simGradeVal) !== null
    }

    let previewInputs: GradeCalcInput[]
    if (editTarget?.kind === 'real') {
      const nextReal = effectiveRealGrades.filter((g) => g.id !== editTarget.key)
      previewInputs = [...nextReal, candidateInput, ...allSimInputs]
    } else if (editTarget?.kind === 'sim') {
      const nextSim = simulatedGrades
        .filter((sg) => sg.id !== editTarget.id)
        .map((sg) => ({
          value: sg.grade,
          weight: sg.weight,
          countsToAverage: parseGradeNumericValue(sg.grade) !== null
        }))
      previewInputs = [...effectiveRealGrades, ...nextSim, candidateInput]
    } else {
      previewInputs = [...effectiveRealGrades, ...allSimInputs, candidateInput]
    }

    const nextAvg = calculateSubjectWeightedAverage(previewInputs)
    const refBase = currAvg ?? origAvg
    const diff = refBase !== null && nextAvg !== null ? Math.round((nextAvg - refBase) * 100) / 100 : null

    return {
      originalAverage: origAvg,
      currentAverage: currAvg,
      previewAverage: nextAvg,
      delta: diff
    }
  }, [baseRealGrades, effectiveRealGrades, simulatedGrades, editTarget, simGradeVal, simWeightVal])

  const formattedCurrent = currentAverage !== null ? currentAverage.toFixed(2) : '—'
  const formattedPreview = previewAverage !== null ? previewAverage.toFixed(2) : '—'
  const hasRealChanges = Object.keys(realOverrides).length > 0
  const hasAnyChanges = simulatedGrades.length > 0 || hasRealChanges

  const isEditingReal = editTarget?.kind === 'real'
  const isEditingSim = editTarget?.kind === 'sim'
  const isEditing = isEditingReal || isEditingSim

  return (
    <UiSheet
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t.closeLabel}
      maxWidthClass="md:max-w-[420px]"
      title={
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-blue)] leading-none">
            {isEditing
              ? pickText(lang, { pl: 'Edycja oceny (Co jeśli?)', en: 'Edit grade (What-if)' })
              : pickText(lang, { pl: 'Symulator oceny', en: 'What-if simulator' })}
          </span>
          <span className="text-[16px] font-semibold text-[var(--ios-label)] truncate mt-1 leading-snug">
            {displaySubjectName || subject}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5 select-none">
        <div
          className={cn(
            'p-4 rounded-[20px] flex items-center justify-between gap-3',
            'bg-[var(--ios-card-solid)] border-[0.5px] border-[var(--ios-card-border)] shadow-[var(--ios-card-shadow)]'
          )}
        >
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-[var(--ios-secondary)]">
              {hasAnyChanges
                ? pickText(lang, {
                    pl: `Teraz (oryg. ${originalAverage !== null ? originalAverage.toFixed(2) : '—'})`,
                    en: `Current (orig. ${originalAverage !== null ? originalAverage.toFixed(2) : '—'})`
                  })
                : pickText(lang, { pl: 'Obecna średnia', en: 'Current avg' })}
            </span>
            <span className="text-[22px] font-semibold text-[var(--ios-label)] tabular-nums leading-tight mt-0.5">
              {formattedCurrent}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {delta !== null && (
              <span
                className={cn(
                  'px-2.5 py-1 rounded-full text-[12px] font-semibold tabular-nums ios-tile',
                  delta > 0
                    ? 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)]'
                    : delta < 0
                      ? 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]'
                      : 'bg-[var(--ios-fill-subtle)] text-[var(--ios-secondary)]'
                )}
              >
                {delta > 0 ? `+${delta.toFixed(2)}` : delta < 0 ? delta.toFixed(2) : '0.00'}
              </span>
            )}

            <div className="flex flex-col items-end">
              <span className="text-[11px] font-medium text-[var(--ios-blue)]">
                {isEditing
                  ? pickText(lang, { pl: 'Po zmianie', en: 'After edit' })
                  : pickText(lang, { pl: 'Po dodaniu', en: 'After adding' })}
              </span>
              <span className="text-[24px] font-bold text-[var(--ios-blue)] tabular-nums leading-tight mt-0.5">
                {formattedPreview}
              </span>
            </div>
          </div>
        </div>

        {isEditingReal && editTarget && (
          <div className="px-3.5 py-2.5 rounded-[14px] bg-[var(--ios-blue-subtle)] ios-tile flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ios-blue)]">
                {pickText(lang, { pl: 'Edytujesz ocenę z dziennika', en: 'Editing recorded grade' })}
              </span>
              <span className="text-[12px] text-[var(--ios-secondary)] truncate">
                {pickText(lang, {
                  pl: `Oryginał: ${editTarget.originalGrade} (waga ${editTarget.originalWeight})${editTarget.category ? ` · ${editTarget.category}` : ''}`,
                  en: `Original: ${editTarget.originalGrade} (weight ${editTarget.originalWeight})${editTarget.category ? ` · ${editTarget.category}` : ''}`
                })}
              </span>
            </div>
            <button
              type="button"
              onClick={onSwitchToAddMode}
              className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--ios-card-solid)] text-[11px] font-semibold text-[var(--ios-blue)] shadow-sm cursor-pointer active:scale-95"
            >
              {pickText(lang, { pl: '+ Nowa', en: '+ New' })}
            </button>
          </div>
        )}

        {(simulatedGrades.length > 0 || hasRealChanges) && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-secondary)] px-1">
              {pickText(lang, { pl: 'Aktywne zmiany w tym przedmiocie', en: 'Active changes in this subject' })}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(realOverrides).map((ov) => {
                const isSelected = editTarget?.kind === 'real' && editTarget.key === ov.key
                return (
                  <div
                    key={ov.key}
                    className={cn(
                      'h-[30px] pl-2.5 pr-1.5 rounded-full border flex items-center gap-1.5 text-[12px] font-semibold tabular-nums transition-all ios-tile',
                      isSelected
                        ? 'border-[var(--ios-blue)] bg-[var(--ios-blue)] text-white'
                        : 'border-dashed border-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)]'
                    )}
                  >
                    <span>
                      {ov.removed ? `${ov.originalGrade} → ✕` : `${ov.originalGrade}→${ov.grade}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onResetRealOverride(subject, ov.key)}
                      title={pickText(lang, { pl: 'Przywróć oryginał', en: 'Restore original' })}
                      className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" strokeWidth={2.4} />
                    </button>
                  </div>
                )
              })}

              {simulatedGrades.map((sg) => {
                const isSelected = editTarget?.kind === 'sim' && editTarget.id === sg.id
                return (
                  <div
                    key={sg.id}
                    onClick={() => onSelectSimForEdit(sg)}
                    className={cn(
                      'h-[30px] pl-2.5 pr-1.5 rounded-full border flex items-center gap-1.5 text-[12px] font-semibold tabular-nums cursor-pointer active:scale-95 transition-all ios-tile',
                      isSelected
                        ? 'border-[var(--ios-blue)] bg-[var(--ios-blue)] text-white'
                        : 'border-dashed border-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)]'
                    )}
                  >
                    <span>{sg.grade}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveSimulatedGrade(subject, sg.id)
                      }}
                      className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 cursor-pointer"
                    >
                      <X className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-0.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-[var(--ios-secondary)] px-1">
              {pickText(lang, { pl: 'Ocena', en: 'Grade' })}
            </span>
            <div className="relative">
              <select
                value={simGradeVal}
                onChange={(e) => onChangeSimGrade(e.target.value)}
                className="w-full h-[46px] pl-3.5 pr-9 rounded-[14px] bg-[var(--ios-card-solid)] border-[0.5px] border-[var(--ios-card-border)] shadow-[var(--ios-card-shadow)] text-[16px] font-semibold text-[var(--ios-label)] tabular-nums appearance-none outline-none focus:border-[var(--ios-blue)] cursor-pointer"
              >
                {GRADE_SIM_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ios-secondary)]"
                strokeWidth={2.2}
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-[var(--ios-secondary)] px-1">
              {t.weight}
            </span>
            <div className="relative">
              <select
                value={simWeightVal}
                onChange={(e) => onChangeSimWeight(Number(e.target.value))}
                className="w-full h-[46px] pl-3.5 pr-9 rounded-[14px] bg-[var(--ios-card-solid)] border-[0.5px] border-[var(--ios-card-border)] shadow-[var(--ios-card-shadow)] text-[16px] font-semibold text-[var(--ios-label)] tabular-nums appearance-none outline-none focus:border-[var(--ios-blue)] cursor-pointer"
              >
                {WEIGHT_SIM_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ios-secondary)]"
                strokeWidth={2.2}
              />
            </div>
          </label>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <UiButton
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            icon={
              isEditing ? (
                <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              ) : (
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              )
            }
            onClick={() => onApplyGradeAction(subject)}
          >
            {isEditing
              ? pickText(lang, {
                  pl: `Zapisz zmianę (${simGradeVal}, w.${simWeightVal})`,
                  en: `Apply change (${simGradeVal}, w.${simWeightVal})`
                })
              : pickText(lang, {
                  pl: `Dodaj ocenę (${simGradeVal}, w.${simWeightVal})`,
                  en: `Add grade (${simGradeVal}, w.${simWeightVal})`
                })}
          </UiButton>

          {isEditingReal && editTarget && (
            <div className="flex items-center gap-2">
              <UiButton
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                icon={<Trash2 className="w-3.5 h-3.5 shrink-0 text-[var(--ios-red)]" strokeWidth={2.2} />}
                onClick={() =>
                  onRemoveRealGradeInSim(
                    subject,
                    editTarget.key,
                    editTarget.originalGrade,
                    editTarget.originalWeight
                  )
                }
              >
                <span className="text-[var(--ios-red)]">
                  {pickText(lang, { pl: 'Pomiń w średniej', en: 'Exclude from avg' })}
                </span>
              </UiButton>

              {realOverrides[editTarget.key] && (
                <UiButton
                  type="button"
                  variant="secondary"
                  size="md"
                  fullWidth
                  icon={<RotateCcw className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />}
                  onClick={() => onResetRealOverride(subject, editTarget.key)}
                >
                  {pickText(lang, { pl: 'Przywróć oryginał', en: 'Restore original' })}
                </UiButton>
              )}
            </div>
          )}
        </div>
      </div>
    </UiSheet>
  )
}
