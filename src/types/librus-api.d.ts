declare module 'librus-api' {
    export default class Librus {
        authorize(login: string, pass: string): Promise<any>
        inbox: {
            listAnnouncements(): Promise<any>
            sendMessage(userId: number, title: string, body: string): Promise<any>
            removeMessage(id: number): Promise<any>
            listReceivers(): Promise<any>
            listInbox(folder: number): Promise<any>
            getMessage(folder: number, id: number): Promise<any>
        }
    }
}