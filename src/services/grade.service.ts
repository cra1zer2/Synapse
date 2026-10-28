'use server'

import { GradeItem, SubjectGrades, GradesResult, FixOption, SubjectWarning } from '@/models/grade.model'
import { fetchGatewayEndpoint } from '@/services/gateway.service'
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
    if (!dateStr) return false
    const gradeDate = new Date(dateStr)
    if (isNaN(gradeDate.getTime())) return false

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
            description: `Otrzymaj ocenę co najmniej ${Math.max(2, gradeWeight2)} z kartkówki (waga 2)`
        })
    }

    if (gradeWeight3 <= 6) {
        fixOptions.push({
            gradeNeeded: Math.max(2, gradeWeight3),
            weight: 3,
            count: 1,
            description: `Otrzymaj ocenę co najmniej ${Math.max(2, gradeWeight3)} ze sprawdzianu (waga 3)`
        })
    }

    const doubleGradeNeeded = Math.ceil(((targetAverage * (totalWeight + 4) - totalScore) / 4) * 2) / 2
    if (doubleGradeNeeded <= 6) {
        fixOptions.push({
            gradeNeeded: Math.max(2, doubleGradeNeeded),
            weight: 2,
            count: 2,
            description: `Otrzymaj dwie oceny ${Math.max(2, doubleGradeNeeded)} (waga 2)`
        })
    }

    if (fixOptions.length === 0) {
        return {
            status: 'done',
            message: 'Oceny poprawione',
            fixOptions: []
        }
    }

    return {
        status: 'critical',
        message: 'Średnia poniżej 2.0 — wymagana poprawa',
        fixOptions
    }
}

export async function fetchStudentGrades(
    username: string,
    pass: string,
    translate: boolean = false
): Promise<{ success: boolean; data?: GradesResult; error?: string }> {
    try {
        const [gradesRes, categoriesRes, subjectsRes, usersRes, lessonsRes, commentsRes] = await Promise.all([
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Grades').catch((err) => {
                console.error('[Grades] API error:', err?.message || err)
                return null
            }),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Grades/Categories').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Auth/Subjects').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Users').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Lessons').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Grades/Comments').catch(() => null)
        ])

        if (!gradesRes || typeof gradesRes === 'string') {
            return { success: false, error: 'Nie udało się pobrać ocen z serwera Librus' }
        }

        const rawGrades = Array.isArray(gradesRes?.Grades) ? gradesRes.Grades : []
        const rawCategories = Array.isArray(categoriesRes?.Categories) ? categoriesRes.Categories : []
        const rawSubjects = Array.isArray(subjectsRes?.data) ? subjectsRes.data : Array.isArray(subjectsRes?.Subjects) ? subjectsRes.Subjects : []
        const rawUsers = Array.isArray(usersRes?.Users) ? usersRes.Users : []
        const rawLessons = Array.isArray(lessonsRes?.Lessons) ? lessonsRes.Lessons : []
        const rawComments = Array.isArray(commentsRes?.Comments) ? commentsRes.Comments : []

        const commentMap = new Map<number, string>()
        for (const c of rawComments) {
            const gId = Number(c.Grade?.Id)
            const text = String(c.Text || '').trim()
            if (!isNaN(gId) && text) {
                commentMap.set(gId, text)
            }
        }

        const subjectNames = new Map<number, string>()
        for (const s of rawSubjects) {
            const sId = Number(s.numericIdentifier ?? s.Id)
            const sName = String(s.name ?? s.Name ?? '').trim()
            if (!isNaN(sId) && sName) {
                subjectNames.set(sId, sName)
            }
        }

        const lessonSubjectMap = new Map<number, number>()
        for (const l of rawLessons) {
            const lId = Number(l.Id)
            const subId = Number(l.Subject?.Id)
            if (!isNaN(lId) && !isNaN(subId)) {
                lessonSubjectMap.set(lId, subId)
            }
        }

        const categoryMap = new Map<number, { name: string; weight: number; countToAvg: boolean }>()
        for (const c of rawCategories) {
            const cId = Number(c.Id)
            const name = String(c.Name || 'Ocena').trim()
            const weight = Number(c.Weight) || 1
            const countToAvg = c.CountToTheAverage !== false && c.CountToTheAverage !== '0'
            if (!isNaN(cId)) {
                categoryMap.set(cId, { name, weight, countToAvg })
            }
        }

        const userNames = new Map<number, string>()
        for (const u of rawUsers) {
            const uId = Number(u.Id)
            const first = String(u.FirstName || '').trim()
            const last = String(u.LastName || '').trim()
            const full = [first, last].filter(Boolean).join(' ')
            if (full) {
                userNames.set(uId, full)
            }
        }

        const subjectsMap: Record<string, SubjectGrades> = {}
        const recentGrades: GradeItem[] = []

        for (const g of rawGrades) {
            const gId = Number(g.Id)
            const lessonId = Number(g.Lesson?.Id)
            let subId = Number(g.Subject?.Id)
            if (isNaN(subId) && !isNaN(lessonId)) {
                subId = lessonSubjectMap.get(lessonId) || 0
            }

            const subjectName = subjectNames.get(subId) || 'Inne zajęcia'
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

            const catId = Number(g.Category?.Id)
            const catInfo = categoryMap.get(catId) || { name: 'Ocena', weight: 1, countToAvg: true }

            const gradeStr = String(g.Grade || '').trim()
            const numeric = parseGradeValue(gradeStr)
            const effectiveWeight = catInfo.countToAvg ? catInfo.weight : 0

            const dateStr = String(g.Date || g.AddDate || '').split(' ')[0]
            const teacherId = Number(g.AddedBy?.Id)
            const teacherName = userNames.get(teacherId) || ''
            const teacherComment = commentMap.get(gId) || ''
            const recent = isDateRecent(dateStr)

            const gradeItem: GradeItem = {
                id: g.Id,
                grade: gradeStr,
                numericValue: numeric,
                weight: effectiveWeight,
                category: catInfo.name,
                date: dateStr,
                teacher: teacherName,
                description: teacherComment,
                isRecent: recent
            }

            const sem = Number(g.Semester) || 1
            if (sem === 1) {
                subjectsMap[subjectName].semester1.push(gradeItem)
            } else {
                subjectsMap[subjectName].semester2.push(gradeItem)
            }

            if (recent) {
                recentGrades.push(gradeItem)
            }
        }

        const subjectsList = Object.values(subjectsMap)
        let sumOfSubjectAverages = 0
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
                sumOfSubjectAverages += sub.finalAverage
                evaluatedSubjectsCount++

                if (sub.finalAverage < 2.0) {
                    failingSubjectsCount++
                    const relevantGrades = sub.semester2.length > 0 ? sub.semester2 : sub.semester1
                    sub.warning = generateFixOptions(relevantGrades, sub.finalAverage)
                }
            }
        }

        const overallAverage = evaluatedSubjectsCount > 0
            ? Math.round((sumOfSubjectAverages / evaluatedSubjectsCount) * 100) / 100
            : null

        let globalWarning: string | undefined = undefined
        if (evaluatedSubjectsCount > 0 && failingSubjectsCount === evaluatedSubjectsCount) {
            globalWarning = 'Wszystkie średnie wymagają uwagi'
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
                recentGrades: recentGrades.sort((a, b) => b.date.localeCompare(a.date)),
                globalWarning
            }
        }
    } catch (error: any) {
        return {
            success: false,
            error: String(error?.message || error)
        }
    }
}
