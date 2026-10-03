'use server'

import Librus from 'librus-api'

export async function testLibrusConnection(username: string, password: string) {
    try {
        const client = new Librus()
        await client.authorize(username, password)
        const announcements = await client.inbox.listAnnouncements()

        return {
            success: true,
            data: announcements
        }
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}