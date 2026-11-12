export type GradeModifierMode = 'standard' | 'symmetric' | 'quarter' | 'none'

export interface GradeCalcInput {
  value: string
  weight: number
  countsToAverage?: boolean
}

export interface TargetAverageResult {
  possible: boolean
  alreadyMet: boolean
  currentAverage: number | null
  neededCount: number
  neededGradeValue: number
  weightPerGrade: number
  projectedAverage: number | null
}

export function resolveGradeModifierOffsets(mode: GradeModifierMode | boolean): {
  plus: number
  minus: number
} {
  if (mode === true || mode === 'none') {
    return { plus: 0, minus: 0 }
  }
  if (mode === 'symmetric') {
    return { plus: 0.5, minus: -0.5 }
  }
  if (mode === 'quarter') {
    return { plus: 0.25, minus: -0.25 }
  }
  return { plus: 0.5, minus: -0.25 }
}

export function parseGradeNumericValue(
  value: string,
  mode: GradeModifierMode | boolean = 'standard'
): number | null {
  const clean = (value || '').trim().toLowerCase()
  if (!clean) return null

  const offsets = resolveGradeModifierOffsets(mode)
  const hasPlus = clean.includes('+')
  const hasMinus = clean.includes('-')
  const baseStr = clean.replace(/[+\-]/g, '')
  const base = Number(baseStr)

  if (!Number.isFinite(base) || base < 1 || base > 6) {
    return null
  }

  if (hasPlus) return base + offsets.plus
  if (hasMinus) return base + offsets.minus
  return base
}

export function calculateSubjectWeightedAverage(
  grades: GradeCalcInput[],
  mode: GradeModifierMode | boolean = 'standard'
): number | null {
  let weightedSum = 0
  let totalWeight = 0

  for (const g of grades) {
    if (g.countsToAverage === false) continue
    const weight = Number(g.weight)
    if (!Number.isFinite(weight) || weight <= 0) continue
    const num = parseGradeNumericValue(g.value, mode)
    if (num === null) continue
    weightedSum += num * weight
    totalWeight += weight
  }

  if (totalWeight <= 0) return null
  return Math.round((weightedSum / totalWeight) * 100) / 100
}

export function solveTargetAverage(
  grades: GradeCalcInput[],
  targetAvg: number,
  neededGradeValue: number = 5,
  weightPerGrade: number = 1,
  mode: GradeModifierMode | boolean = 'standard'
): TargetAverageResult {
  let weightedSum = 0
  let totalWeight = 0

  for (const g of grades) {
    if (g.countsToAverage === false) continue
    const weight = Number(g.weight)
    if (!Number.isFinite(weight) || weight <= 0) continue
    const num = parseGradeNumericValue(g.value, mode)
    if (num === null) continue
    weightedSum += num * weight
    totalWeight += weight
  }

  const currentAverage =
    totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : null

  if (currentAverage !== null && currentAverage >= targetAvg) {
    return {
      possible: true,
      alreadyMet: true,
      currentAverage,
      neededCount: 0,
      neededGradeValue,
      weightPerGrade,
      projectedAverage: currentAverage
    }
  }

  if (neededGradeValue <= targetAvg || weightPerGrade <= 0) {
    return {
      possible: false,
      alreadyMet: false,
      currentAverage,
      neededCount: 0,
      neededGradeValue,
      weightPerGrade,
      projectedAverage: currentAverage
    }
  }

  for (let count = 1; count <= 30; count++) {
    const nextSum = weightedSum + count * neededGradeValue * weightPerGrade
    const nextWeight = totalWeight + count * weightPerGrade
    const nextAvg = Math.round((nextSum / nextWeight) * 100) / 100
    if (nextAvg >= targetAvg) {
      return {
        possible: true,
        alreadyMet: false,
        currentAverage,
        neededCount: count,
        neededGradeValue,
        weightPerGrade,
        projectedAverage: nextAvg
      }
    }
  }

  return {
    possible: false,
    alreadyMet: false,
    currentAverage,
    neededCount: 30,
    neededGradeValue,
    weightPerGrade,
    projectedAverage: null
  }
}
