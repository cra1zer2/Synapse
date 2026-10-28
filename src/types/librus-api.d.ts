declare module 'librus-api' {
    export default class Librus {
        authorize(login: string, pass: string): Promise<any>
        calendar: {
            getTimetable(from?: string, to?: string): Promise<any>
            getCalendar(month?: number, year?: number): Promise<any>
            getEvent(eventId: number, isAbsence?: boolean): Promise<any>
        }
        absence: {
            getAbsences(): Promise<any>
            getAbsence(absenceId: number): Promise<any>
        }
        inbox: {
            listAnnouncements(): Promise<any>
            sendMessage(userId: number, title: string, body: string): Promise<any>
            removeMessage(id: number): Promise<any>
            listReceivers(group?: any): Promise<any>
            listInbox(folder?: number, page?: number): Promise<any>
            getMessage(folder: number, id: number): Promise<any>
            getFile(path: string): Promise<any>
        }
        homework: {
            listSubjects(): Promise<any>
            listHomework(subjectId?: number, from?: string, to?: string): Promise<any>
            getHomework(homeworkId: number): Promise<any>
        }
        info: {
            getGrades(): Promise<any>
            getGrade(gradeId: number): Promise<any>
            getPointGrade(gradeId: number): Promise<any>
            getNotifications(): Promise<any>
            getLuckyNumber(): Promise<any>
            getAccountInfo(): Promise<any>
        }
    }
}