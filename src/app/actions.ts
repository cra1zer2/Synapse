'use server'

import { runFullLibrusDiagnostics, testGatewayRequest } from '@/services/librus.service'
import { fetchJustificationsHistory, submitJustification } from '@/services/justification.service'
import { JustificationPayload } from '@/models/justification.model'

export async function executeLibrusDiagnostics(username: string, pass: string) {
    try {
        const results = await runFullLibrusDiagnostics(username, pass)
        return {
            success: true,
            data: results
        }
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}

export async function executeGatewayProbe(username: string, pass: string, targetPath: string) {
    try {
        const result = await testGatewayRequest(username, pass, targetPath)
        return result
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}

export async function getJustificationsAction(username: string, pass: string, dateFrom: string, dateTo: string) {
    try {
        const result = await fetchJustificationsHistory(username, pass, dateFrom, dateTo)
        return result
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}

export async function createJustificationAction(username: string, pass: string, payload: JustificationPayload) {
    try {
        const result = await submitJustification(username, pass, payload)
        return result
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}