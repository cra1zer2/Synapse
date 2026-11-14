'use client'

import { useState, useMemo } from 'react'
import { Target, Calculator } from 'lucide-react'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosButton } from '@/components/ios/ios-ui'
import { GradeCalcInput, GradeModifierMode, solveTargetAverage } from '@/utils/grade.util'
import { cn } from '@/utils/cn.util'

export const GRADE_SIM_OPTIONS = [
  '6',
  '5+',
  '5',
  '5-',
  '4+',
  '4',
  '4-',
  '3+',
  '3',
  '3-',
  '2+',
  '2',
  '1'
]

const TARGET_PRESETS = [2.0, 3.0, 4.0, 4.75, 5.0]

interface SubjectCalculatorDrawerProps {
  subject: string
  grades: GradeCalcInput[]
  modifierMode: GradeModifierMode | boolean
  enableGradeSimulator: boolean
  simGradeVal: string
  simWeightVal: number
  onChangeSimGrade: (val: string) => void
  onChangeSimWeight: (val: number) => void
  onAddSimulatedGrade: (subject: string) => void
  lang: AppLanguage
  t: AppDictionary
}

export function SubjectCalculatorDrawer({
  subject,
  grades,
  modifierMode,
  enableGradeSimulator,
  simGradeVal,
  simWeightVal,
  onChangeSimGrade,
  onChangeSimWeight,
  onAddSimulatedGrade,
  lang,
  t
}: SubjectCalculatorDrawerProps) {
  const [targetAvg, setTargetAvg] = useState<number>(4.75)
  const [solverGrade, setSolverGrade] = useState<number>(5)
  const [solverWeight, setSolverWeight] = useState<number>(2)

  const solverResult = useMemo(
    () => solveTargetAverage(grades, targetAvg, solverGrade, solverWeight, modifierMode),
    [grades, targetAvg, solverGrade, solverWeight, modifierMode]
  )

  return (
    <div className="p-3 rounded-[16px] bg-[var(--bg-card-secondary)] flex flex-col gap-3 mt-1">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--ios-label)]">
            <Target className="w-3.5 h-3.5 text-[var(--ios-blue)] shrink-0" strokeWidth={2.2} />
            <span>{t.targetAverageLabel}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {TARGET_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTargetAvg(preset)}
                className={cn(
                  'h-[24px] px-2 rounded-full text-[11px] font-semibold tabular-nums cursor-pointer transition-colors',
                  targetAvg === preset
                    ? 'bg-[var(--ios-blue)] text-white'
                    : 'bg-[var(--ios-card-solid)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)]'
                )}
              >
                {preset.toFixed(preset % 1 === 0 ? 1 : 2)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1 text-[11px] text-[var(--ios-secondary)]">
              <span>{lang === 'en' ? 'Grade:' : 'Ocena:'}</span>
              <select
                value={solverGrade}
                onChange={(e) => setSolverGrade(Number(e.target.value))}
                className="h-[26px] px-2 rounded-[8px] bg-[var(--ios-card-solid)] text-[12px] font-semibold text-[var(--ios-label)] outline-none cursor-pointer tabular-nums"
              >
                {[6, 5, 4, 3, 2].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1 text-[11px] text-[var(--ios-secondary)]">
              <span>{lang === 'en' ? 'Weight:' : 'Waga:'}</span>
              <select
                value={solverWeight}
                onChange={(e) => setSolverWeight(Number(e.target.value))}
                className="h-[26px] px-2 rounded-[8px] bg-[var(--ios-card-solid)] text-[12px] font-semibold text-[var(--ios-label)] outline-none cursor-pointer tabular-nums"
              >
                {[1, 2, 3, 4, 5].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <span
            className={cn(
              'text-[12px] font-semibold px-2.5 py-1 rounded-full tabular-nums',
              solverResult.alreadyMet
                ? 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)]'
                : solverResult.possible
                  ? 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)]'
                  : 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]'
            )}
          >
            {solverResult.alreadyMet
              ? t.targetSolverAlreadyMet
              : solverResult.possible && solverResult.projectedAverage !== null
                ? t.targetSolverResult(
                    solverResult.neededCount,
                    solverResult.neededGradeValue,
                    solverResult.weightPerGrade,
                    solverResult.projectedAverage
                  )
                : t.targetSolverImpossible}
          </span>
        </div>
      </div>

      {enableGradeSimulator && (
        <div className="pt-2.5 border-t border-[var(--ios-separator)] flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--ios-label)]">
            <Calculator className="w-3.5 h-3.5 text-[var(--ios-blue)] shrink-0" strokeWidth={2.2} />
            <span>{lang === 'en' ? 'Simulate partial grade' : 'Symuluj ocenę cząstkową'}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 text-[12px] text-[var(--ios-secondary)]">
                <span>{lang === 'en' ? 'Grade:' : 'Ocena:'}</span>
                <select
                  value={simGradeVal}
                  onChange={(e) => onChangeSimGrade(e.target.value)}
                  className="h-[30px] px-2.5 rounded-[8px] bg-[var(--ios-card-solid)] text-[13px] font-semibold text-[var(--ios-label)] outline-none cursor-pointer tabular-nums"
                >
                  {GRADE_SIM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1.5 text-[12px] text-[var(--ios-secondary)]">
                <span>{lang === 'en' ? 'Weight:' : 'Waga:'}</span>
                <select
                  value={simWeightVal}
                  onChange={(e) => onChangeSimWeight(Number(e.target.value))}
                  className="h-[30px] px-2.5 rounded-[8px] bg-[var(--ios-card-solid)] text-[13px] font-semibold text-[var(--ios-label)] outline-none cursor-pointer tabular-nums"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <IosButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onAddSimulatedGrade(subject)}
              className="ml-auto"
            >
              {lang === 'en' ? '+ Add' : '+ Dodaj'}
            </IosButton>
          </div>
        </div>
      )}
    </div>
  )
}
