/**
 * Utils: Grade Calculation
 * Parses Polish school grades with standard +/- modifiers (+0.5 / -0.25) and computes weighted averages.
 * Used by grades views and the mini grades dashboard card.
 */

export interface GradeCalcInput {
  id?: string
  value: string
  weight: number
  countsToAverage?: boolean
}

export function parseGradeNumericValue(value: string): number | null {
  const clean = (value || '').trim().toLowerCase()
  if (!clean) return null

  const hasPlus = clean.includes('+')
  const hasMinus = clean.includes('-')
  const baseStr = clean.replace(/[+\-]/g, '')
  const base = Number(baseStr)

  if (!Number.isFinite(base) || base < 1 || base > 6) {
    return null
  }

  if (hasPlus) return base + 0.5
  if (hasMinus) return base - 0.25
  return base
}

export function getCurrentSchoolSemester(subjects?: Array<{ semester2?: unknown[] }>): 1 | 2 {
  if (subjects && subjects.some((s) => (s.semester2?.length || 0) > 0)) {
    return 2
  }
  const month = new Date().getMonth()
  return month >= 1 && month <= 7 ? 2 : 1
}

export function calculateSubjectWeightedAverage(grades: GradeCalcInput[]): number | null {
  let weightedSum = 0
  let totalWeight = 0

  for (const g of grades) {
    if (g.countsToAverage === false) continue
    const weight = Number(g.weight)
    if (!Number.isFinite(weight) || weight <= 0) continue
    const num = parseGradeNumericValue(g.value)
    if (num === null) continue
    weightedSum += num * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : null
}
