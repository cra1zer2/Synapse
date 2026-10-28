'use client'

import { useState, useMemo } from 'react'
import { GradesResult, GradeItem } from '@/models/grade.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { formatSubjectName } from '@/utils/text.util'
import { IosCard, IosSegmentedControl } from '@/components/ios/ios-ui'

interface GradesWidgetProps {
  gradesData: GradesResult
  showFullSubjectNames?: boolean
  ignoreGradeModifiers?: boolean
  lang?: AppLanguage
  t: AppDictionary
  onSelectGrade: (grade: GradeItem, subject: string) => void
}

function getGradeBadgeStyle(gradeStr: string): string {
  const g = gradeStr.trim().toLowerCase()
  if (g.startsWith('1')) {
    return 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border border-[var(--ios-red)]/20'
  }
  return 'bg-[var(--ios-element)] text-[var(--ios-label)] border border-[var(--ios-separator)]/30'
}

export function GradesWidget({
  gradesData,
  showFullSubjectNames = false,
  ignoreGradeModifiers = false,
  lang = 'pl',
  t,
  onSelectGrade
}: GradesWidgetProps) {
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1)

  const subjects = useMemo(() => {
    return [...(gradesData.subjects || [])].sort((a, b) => a.subject.localeCompare(b.subject))
  }, [gradesData.subjects])

  const calculateSubjectAverage = (grades: GradeItem[]): number | null => {
    let totalScore = 0
    let totalWeight = 0

    for (const g of grades) {
      if (g.numericValue === null || g.weight <= 0) continue

      let val = g.numericValue
      if (ignoreGradeModifiers) {
        val = Math.floor(val)
      }

      totalScore += val * g.weight
      totalWeight += g.weight
    }

    if (totalWeight === 0) return null
    return Math.round((totalScore / totalWeight) * 100) / 100
  }

  const subjectAveragesMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const sub of subjects) {
      const grades = selectedSemester === 1 ? sub.semester1 : sub.semester2
      map.set(sub.subject, calculateSubjectAverage(grades))
    }
    return map
  }, [subjects, selectedSemester, ignoreGradeModifiers])

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

  return (
    <div className="w-full flex flex-col gap-3.5 pb-16 select-none">
      <IosCard className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-tight">
              {t.gpaTitle}
            </span>
            <h2 className="text-[34px] font-semibold tracking-[-0.8px] leading-none text-[var(--ios-label)] mt-0.5 tabular-nums">
              {overallGpa}
            </h2>
          </div>

          <IosSegmentedControl<1 | 2>
            value={selectedSemester}
            onChange={setSelectedSemester}
            options={[
              { id: 1, label: lang === 'en' ? 'Term 1' : 'Semestr 1' },
              { id: 2, label: lang === 'en' ? 'Term 2' : 'Semestr 2' }
            ]}
            className="w-[192px] shrink-0"
          />
        </div>
      </IosCard>

      <IosCard className="overflow-hidden">
        {subjects.length > 0 ? (
          subjects.map((sub, idx) => {
            const grades = selectedSemester === 1 ? sub.semester1 : sub.semester2
            const avgNum = subjectAveragesMap.get(sub.subject)
            const avgStr = avgNum !== null && avgNum !== undefined ? avgNum.toFixed(2) : '—'
            const isDanger = typeof avgNum === 'number' && avgNum < 2.0
            const displayTitle = formatSubjectName(sub.subject, showFullSubjectNames)

            return (
              <div
                key={sub.subject + '-' + idx}
                className="relative p-3.5 px-4 flex items-center justify-between gap-3 after:absolute after:bottom-0 after:right-0 after:left-4 after:h-[0.5px] after:bg-[var(--ios-separator)] last:after:hidden"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <span className="text-[15px] font-medium leading-snug tracking-[-0.2px] text-[var(--ios-label)] truncate block">
                    {displayTitle}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2 min-h-[28px]">
                    {grades.length > 0 ? (
                      grades.map((g, gIdx) => (
                        <button
                          key={gIdx}
                          type="button"
                          onClick={() => onSelectGrade(g, sub.subject)}
                          className={`min-w-[28px] h-[28px] px-1.5 rounded-[8px] flex items-center justify-center text-[13px] font-medium tabular-nums active:scale-[0.94] active:opacity-70 transition-[transform,opacity] duration-150 cursor-pointer ${getGradeBadgeStyle(g.grade)}`}
                        >
                          {g.grade}
                        </button>
                      ))
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

                <div className="shrink-0 flex items-center justify-center min-w-[50px] self-center">
                  <span className={`text-[16px] font-medium tabular-nums ${isDanger ? 'text-[var(--ios-red)]' : 'text-[var(--ios-label)]'}`}>
                    {avgStr}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="p-8 text-center text-[15px] font-normal text-[var(--ios-secondary)]">
            {t.noGradesRecorded}
          </div>
        )}
      </IosCard>
    </div>
  )
}
