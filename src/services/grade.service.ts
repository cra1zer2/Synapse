import Librus from 'librus-api'
import { GradeItem, SubjectGrades, GradesResult, FixOption, SubjectWarning } from '@/models/grade.model'
import { translateBatch } from '@/services/translation.service'

function parseGradeValue(gradeStr: string): number | null {
    const clean = gradeStr.trim().toLowerCase()
    if (!clean || clean === 'np' || clean === 'bz' || clean === '+' || clean === '-') {
        return null
    }

    const baseValues: Record<string, number> = {
        '6': 6,
        '5': 5,
        '4': 4,
        '3': 3,
        '2': 2,
        '1': 1
    }

    const baseChar = clean[0]
    if (!(baseChar in baseValues)) {
        return null
    }

    let value = baseValues[baseChar]
    if (clean.includes('+')) {
        value += 0.5
    } else if (clean.includes('-')) {
        value -= 0.25
    }

    return value
}

function calculateWeightedAverage(grades: GradeItem[]): number | null {
    let totalScore = 0
    let totalWeight = 0

    for (const item of grades) {
        if (item.numericValue !== null && item.weight > 0) {
            totalScore += item.numericValue * item.weight
            totalWeight += item.weight
        }
    }

    if (totalWeight === 0) {
        return null
    }

    return Math.round((totalScore / totalWeight) * 100) / 100
}

function isDateRecent(dateStr: string, daysThreshold: number = 14): boolean {
    if (!dateStr) {
        return false
    }

    const gradeDate = new Date(dateStr)
    if (isNaN(gradeDate.getTime())) {
        return false
    }

    const now = new Date()
    const diffTime = Math.abs(now.getTime() - gradeDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays <= daysThreshold
}

function generateFixOptions(grades: GradeItem[], currentAverage: number): SubjectWarning {
    let totalScore = 0
    let totalWeight = 0

    for (const g of grades) {
        if (g.numericValue !== null && g.weight > 0) {
            totalScore += g.numericValue * g.weight
            totalWeight += g.weight
        }
    }

    const targetAverage = 2.0
    const solveForGrade = (addedWeight: number): number => {
        const needed = (targetAverage * (totalWeight + addedWeight) - totalScore) / addedWeight
        return Math.ceil(needed * 2) / 2
    }

    const gradeWeight2 = solveForGrade(2)
    const gradeWeight3 = solveForGrade(3)

    const fixOptions: FixOption[] = []

    if (gradeWeight2 <= 6) {
        fixOptions.push({
            gradeNeeded: Math.max(2, gradeWeight2),
            weight: 2,
            count: 1,
            description: `Get at least ${Math.max(2, gradeWeight2)} on a quiz (weight 2)`
        })
    }

    if (gradeWeight3 <= 6) {
        fixOptions.push({
            gradeNeeded: Math.max(2, gradeWeight3),
            weight: 3,
            count: 1,
            description: `Get at least ${Math.max(2, gradeWeight3)} on an exam (weight 3)`
        })
    }

    const doubleGradeNeeded = Math.ceil(((targetAverage * (totalWeight + 4) - totalScore) / 4) * 2) / 2
    if (doubleGradeNeeded <= 6) {
        fixOptions.push({
            gradeNeeded: Math.max(2, doubleGradeNeeded),
            weight: 2,
            count: 2,
            description: `Get two ${Math.max(2, doubleGradeNeeded)} grades (weight 2 each)`
        })
    }

    if (fixOptions.length === 0) {
        return {
            status: 'done',
            message: 'You are done',
            fixOptions: []
        }
    }

    return {
        status: 'critical',
        message: 'Average below 2.0 — action required',
        fixOptions
    }
}

export async function fetchStudentGrades(
    username: string,
    pass: string,
    translate: boolean = false
): Promise<{ success: boolean; data?: GradesResult; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const rawGrades = await client.info.getGrades()
        const subjectsMap: Record<string, SubjectGrades> = {}
        const recentGrades: GradeItem[] = []

        const processRawArray = (items: any[], semesterNum: 1 | 2) => {
            if (!Array.isArray(items)) {
                return
            }

            for (const entry of items) {
                const subjectName = (entry.subject || entry.name || 'General').trim()
                if (!subjectsMap[subjectName]) {
                    subjectsMap[subjectName] = {
                        subject: subjectName,
                        semester1: [],
                        semester2: [],
                        average1: null,
                        average2: null,
                        finalAverage: null
                    }
                }

                const gradeStr = String(entry.grade || entry.value || '').trim()
                const numeric = parseGradeValue(gradeStr)
                const weight = typeof entry.weight === 'number' ? entry.weight : parseInt(entry.weight, 10) || 1
                const dateStr = entry.date || ''
                const categoryStr = entry.category || entry.title || 'Grade'
                const recent = isDateRecent(dateStr)

                const gradeItem: GradeItem = {
                    id: entry.id,
                    grade: gradeStr,
                    numericValue: numeric,
                    weight,
                    category: categoryStr,
                    date: dateStr,
                    teacher: entry.teacher || '',
                    description: entry.description || '',
                    isRecent: recent
                }

                if (semesterNum === 1) {
                    subjectsMap[subjectName].semester1.push(gradeItem)
                } else {
                    subjectsMap[subjectName].semester2.push(gradeItem)
                }

                if (recent) {
                    recentGrades.push(gradeItem)
                }
            }
        }

        if (Array.isArray(rawGrades)) {
            processRawArray(rawGrades, 1)
        } else if (rawGrades && typeof rawGrades === 'object') {
            if (Array.isArray(rawGrades.firstSemester)) {
                processRawArray(rawGrades.firstSemester, 1)
            }
            if (Array.isArray(rawGrades.secondSemester)) {
                processRawArray(rawGrades.secondSemester, 2)
            }
            if (Array.isArray(rawGrades.grades)) {
                processRawArray(rawGrades.grades, 1)
            }
        }

        const subjectsList = Object.values(subjectsMap)
        let totalSubjectAverages = 0
        let evaluatedSubjectsCount = 0
        let failingSubjectsCount = 0

        for (const sub of subjectsList) {
            sub.average1 = calculateWeightedAverage(sub.semester1)
            sub.average2 = calculateWeightedAverage(sub.semester2)

            if (sub.average2 !== null && sub.average1 !== null) {
                sub.finalAverage = Math.round(((sub.average1 + sub.average2) / 2) * 100) / 100
            } else {
                sub.finalAverage = sub.average2 ?? sub.average1
            }

            if (sub.finalAverage !== null) {
                totalSubjectAverages += sub.finalAverage
                evaluatedSubjectsCount++

                if (sub.finalAverage < 2.0) {
                    failingSubjectsCount++
                    const relevantGrades = sub.semester2.length > 0 ? sub.semester2 : sub.semester1
                    sub.warning = generateFixOptions(relevantGrades, sub.finalAverage)
                }
            }
        }

        const overallAverage =
            evaluatedSubjectsCount > 0
                ? Math.round((totalSubjectAverages / evaluatedSubjectsCount) * 100) / 100
                : null

        let globalWarning: string | undefined = undefined
        if (evaluatedSubjectsCount > 0 && failingSubjectsCount === evaluatedSubjectsCount) {
            globalWarning = 'Too late to be worried'
        }

        if (translate) {
            const textsToTranslate = new Set<string>()
            subjectsList.forEach((s) => textsToTranslate.add(s.subject))
            recentGrades.forEach((g) => textsToTranslate.add(g.category))

            const translationMap = await translateBatch(Array.from(textsToTranslate))

            subjectsList.forEach((s) => {
                if (translationMap[s.subject]) {
                    s.subject = translationMap[s.subject]
                }
                s.semester1.forEach((g) => {
                    if (translationMap[g.category]) {
                        g.category = translationMap[g.category]
                    }
                })
                s.semester2.forEach((g) => {
                    if (translationMap[g.category]) {
                        g.category = translationMap[g.category]
                    }
                })
            })

            recentGrades.forEach((g) => {
                if (translationMap[g.category]) {
                    g.category = translationMap[g.category]
                }
            })
        }

        return {
            success: true,
            data: {
                subjects: subjectsList,
                overallAverage,
                recentGrades,
                globalWarning
            }
        }
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}