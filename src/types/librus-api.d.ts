/**
 * Types: librus-api
 * Ambient TypeScript declarations for the upstream `librus-api` client package.
 * Used as an HTML/inbox fallback in message services.
 */

declare module 'librus-api' {
  export default class Librus {
    authorize(login: string, pass: string): Promise<unknown>
    calendar: {
      getTimetable(from?: string, to?: string): Promise<unknown>
      getCalendar(month?: number, year?: number): Promise<unknown>
      getEvent(eventId: number, isAbsence?: boolean): Promise<unknown>
    }
    absence: {
      getAbsences(): Promise<unknown>
      getAbsence(absenceId: number): Promise<unknown>
    }
    inbox: {
      listAnnouncements(): Promise<unknown>
      sendMessage(userId: number, title: string, body: string): Promise<unknown>
      removeMessage(id: number): Promise<unknown>
      listReceivers(group?: unknown): Promise<unknown>
      listInbox(folder?: number, page?: number): Promise<unknown>
      getMessage(folder: number, id: number): Promise<unknown>
      getFile(path: string): Promise<unknown>
    }
    homework: {
      listSubjects(): Promise<unknown>
      listHomework(subjectId?: number, from?: string, to?: string): Promise<unknown>
      getHomework(homeworkId: number): Promise<unknown>
    }
    info: {
      getGrades(): Promise<unknown>
      getGrade(gradeId: number): Promise<unknown>
      getPointGrade(gradeId: number): Promise<unknown>
      getNotifications(): Promise<unknown>
      getLuckyNumber(): Promise<unknown>
      getAccountInfo(): Promise<unknown>
    }
  }
}
