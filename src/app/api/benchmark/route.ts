import { NextResponse } from 'next/server'
import { runLibrusBenchmark } from '@/services/benchmark.service'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { username, password } = body

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: 'Username and password are required' },
                { status: 400 }
            )
        }

        const report = await runLibrusBenchmark(username, password)
        return NextResponse.json({ success: true, report })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        )
    }
}