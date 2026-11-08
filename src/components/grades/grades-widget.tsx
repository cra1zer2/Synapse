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
  enableGradeSimulator?: boolean
  lang?: AppLanguage
  t: AppDictionary
  onSelectGrade: (grade: GradeItem, subject: string) => void
}

interface SimulatedGrade {
  id: string
  subject: string
  grade: string
  numericValue: number
  weight: number
}

function getGradeBadgeStyle(gradeStr: string): string {
  const g = gradeStr.trim().toLowerCase()
  if (g.startsWith('0') || g.startsWith('1') || g === 'nb' || g === 'np') {
    return 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] font-semibold'
  }
  return 'bg-[var(--ios-element)]/65 text-[var(--ios-label)]'
}

export function GradesWidget({
  gradesData,
  showFullSubjectNames = false,
  ignoreGradeModifiers = false,
  enableGradeSimulator = false,
  lang = 'pl',
  t,
  onSelectGrade
}: GradesWidgetProps) {
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1)
  const [simulatedBySubject, setSimulatedBySubject] = useState<Record<string, SimulatedGrade[]>>({})
  const [activeSimSubject, setActiveSimSubject] = useState<string | null>(null)
  const [simGradeVal, setSimGradeVal] = useState<string>('5')
  const [simWeightVal, setSimWeightVal] = useState<number>(2)

  const gradeOptions = [
    { label: '6', val: 6 },
    { label: '5+', val: 5.5 },
    { label: '5', val: 5 },
    { label: '5-', val: 4.75 },
    { label: '4+', val: 4.5 },
    { label: '4', val: 4 },
    { label: '4-', val: 3.75 },
    { label: '3+', val: 3.5 },
    { label: '3', val: 3 },
    { label: '3-', val: 2.75 },
    { label: '2+', val: 2.5 },
    { label: '2', val: 2 },
    { label: '1', val: 1 }
  ]

  const addSimulatedGrade = (subject: string) => {
    const matched = gradeOptions.find((o) => o.label === simGradeVal) || gradeOptions[2]
    const item: SimulatedGrade = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      subject,
      grade: matched.label,
      numericValue: matched.val,
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
    setActiveSimSubject(null)
  }

  const totalSimulatedCount = Object.values(simulatedBySubject).reduce((acc, list) => acc + list.length, 0)

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
      const realGrades = selectedSemester === 1 ? sub.semester1 : sub.semester2
      const simGrades: GradeItem[] = enableGradeSimulator
        ? (simulatedBySubject[sub.subject] || []).map((sg) => ({
            id: sg.id,
            grade: sg.grade,
            numericValue: sg.numericValue,
            weight: sg.weight,
            category: 'Symulacja',
            date: '',
            teacher: '',
            comment: '',
            isRecent: false
          }))
        : []
      map.set(sub.subject, calculateSubjectAverage([...realGrades, ...simGrades]))
    }
    return map
  }, [subjects, selectedSemester, ignoreGradeModifiers, enableGradeSimulator, simulatedBySubject])

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
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-1.5 pb-0.5">
              {gradesData.recentGrades.slice(0, 5).map((g, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectGrade(g, g.subject || '')
                  }}
                  title={`${g.subject || ''}: ${g.grade}${g.category ? ` (${g.category})` : ''}`}
                  className={`min-w-[28px] h-[28px] px-1.5 rounded-[8px] flex items-center justify-center text-[13px] font-medium tabular-nums cursor-pointer hover:opacity-80 active:scale-[0.94] transition-all select-none ${getGradeBadgeStyle(g.grade)}`}
                >
                  {g.grade}
                </button>
              ))}
            </div>
          )}
        </div>
      </IosCard>

      <div className="w-full flex justify-center">
        <IosSegmentedControl<1 | 2>
          value={selectedSemester}
          onChange={setSelectedSemester}
          options={[
            { id: 1, label: lang === 'en' ? 'Term 1' : 'Semestr 1' },
            { id: 2, label: lang === 'en' ? 'Term 2' : 'Semestr 2' }
          ]}
          className="w-full max-w-sm"
        />
      </div>

      <IosCard className="overflow-hidden">
        {subjects.length > 0 ? (
          subjects.map((sub, idx) => {
            const grades = selectedSemester === 1 ? sub.semester1 : sub.semester2
            const simList = enableGradeSimulator ? (simulatedBySubject[sub.subject] || []) : []
            const avgNum = subjectAveragesMap.get(sub.subject)
            const avgStr = avgNum !== null && avgNum !== undefined ? avgNum.toFixed(2) : '—'
            const isDanger = typeof avgNum === 'number' && avgNum < 2.0
            const displayTitle = formatSubjectName(sub.subject, showFullSubjectNames)
            const isSimExpanded = enableGradeSimulator && activeSimSubject === sub.subject

            return (
              <div
                key={sub.subject + '-' + idx}
                className="relative p-3.5 px-4 flex flex-col gap-2.5 after:absolute after:bottom-0 after:right-0 after:left-4 after:h-[1px] after:bg-[var(--ios-separator)] last:after:hidden"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 pr-3">
                    <span className="text-[15px] font-medium leading-snug tracking-[-0.2px] text-[var(--ios-label)] truncate block">
                      {displayTitle}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2 min-h-[28px]">
                      {grades.length > 0 || simList.length > 0 ? (
                        <>
                          {grades.map((g, gIdx) => (
                            <button
                              key={gIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectGrade(g, sub.subject)
                              }}
                              className={`min-w-[28px] h-[28px] px-1.5 rounded-[8px] flex items-center justify-center text-[13px] font-medium tabular-nums active:scale-[0.94] active:opacity-70 transition-[transform,opacity] duration-150 cursor-pointer ${getGradeBadgeStyle(g.grade)}`}
                            >
                              {g.grade}
                            </button>
                          ))}
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
                          onClick={() => setActiveSimSubject(isSimExpanded ? null : sub.subject)}
                          title={lang === 'en' ? 'Simulate grade' : 'Symuluj ocenę'}
                          className={
                            'w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-[15px] font-semibold transition-colors cursor-pointer ' +
                            (isSimExpanded
                              ? 'bg-[var(--ios-blue)] text-white'
                              : 'bg-[var(--ios-element)]/55 text-[var(--ios-blue)] hover:bg-[var(--ios-blue-subtle)]')
                          }
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

                  <div className="shrink-0 flex flex-col items-end justify-center min-w-[50px] self-center">
                    <span className={`text-[16px] font-medium tabular-nums ${simList.length > 0 ? 'text-[var(--ios-blue)] font-semibold' : isDanger ? 'text-[var(--ios-red)]' : 'text-[var(--ios-label)]'}`}>
                      {avgStr}
                    </span>
                    {simList.length > 0 && (
                      <span className="text-[10px] font-medium text-[var(--ios-blue)]">
                        symulacja
                      </span>
                    )}
                  </div>
                </div>

                {isSimExpanded && (
                  <div className="p-2.5 rounded-[14px] bg-[var(--ios-element)]/45 flex flex-wrap items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center gap-1.5 text-[12px] text-[var(--ios-secondary)]">
                        <span>{lang === 'en' ? 'Grade:' : 'Ocena:'}</span>
                        <select
                          value={simGradeVal}
                          onChange={(e) => setSimGradeVal(e.target.value)}
                          className="h-[30px] px-2.5 rounded-[10px] bg-[var(--ios-card-solid)] text-[13px] font-semibold text-[var(--ios-label)] outline-none border border-[var(--ios-separator)] cursor-pointer tabular-nums"
                        >
                          {gradeOptions.map((opt) => (
                            <option key={opt.label} value={opt.label}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-center gap-1.5 text-[12px] text-[var(--ios-secondary)]">
                        <span>{lang === 'en' ? 'Weight:' : 'Waga:'}</span>
                        <select
                          value={simWeightVal}
                          onChange={(e) => setSimWeightVal(Number(e.target.value))}
                          className="h-[30px] px-2.5 rounded-[10px] bg-[var(--ios-card-solid)] text-[13px] font-semibold text-[var(--ios-label)] outline-none border border-[var(--ios-separator)] cursor-pointer tabular-nums"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => addSimulatedGrade(sub.subject)}
                      className="h-[30px] px-3.5 rounded-full bg-[var(--ios-blue)] text-white text-[12px] font-semibold active:scale-[0.96] transition-transform cursor-pointer shrink-0 ml-auto"
                    >
                      {lang === 'en' ? '+ Add' : '+ Dodaj'}
                    </button>
                  </div>
                )}
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
