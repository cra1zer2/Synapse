'use server'

import { runFullLibrusDiagnostics } from '@/services/librus.service'

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