'use server'

import { runFullLibrusDiagnostics, testGatewayRequest } from '@/services/librus.service'

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