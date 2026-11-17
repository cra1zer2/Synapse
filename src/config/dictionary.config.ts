/**
 * Config: Bilingual & Extensible i18n Registry
 * Defines the scalable language registry, metadata lookup, fallback-safe text picker, and shared UI dictionaries.
 * Add new languages by extending LANGUAGE_REGISTRY and DICTIONARIES without altering selection or date logic.
 */

import { formatPolishPlural } from '@/utils/text.util'

export type AppTheme = 'system' | 'light' | 'dark'
export type NavMode = 'widgets' | 'tabs'

export interface LanguageMeta {
  id: AppLanguage
  shortCode: string
  nativeName: string
  intlLocale: string
  googleTranslateCode: string | null
}

export const LANGUAGE_REGISTRY = {
  pl: {
    id: 'pl',
    shortCode: 'PL',
    nativeName: 'Polski',
    intlLocale: 'pl-PL',
    googleTranslateCode: null
  },
  en: {
    id: 'en',
    shortCode: 'EN',
    nativeName: 'English',
    intlLocale: 'en-US',
    googleTranslateCode: 'en'
  }
} as const

export type AppLanguage = keyof typeof LANGUAGE_REGISTRY
export const DEFAULT_LANGUAGE: AppLanguage = 'pl'

export const SUPPORTED_LANGUAGES: LanguageMeta[] = Object.values(LANGUAGE_REGISTRY)

export function isSupportedLanguage(value: string | null | undefined): value is AppLanguage {
  return Boolean(value && Object.prototype.hasOwnProperty.call(LANGUAGE_REGISTRY, value))
}

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  if (isSupportedLanguage(value)) return value
  const normalized = (value || '').trim().toLowerCase().split(/[-_]/)[0]
  return isSupportedLanguage(normalized) ? normalized : DEFAULT_LANGUAGE
}

export function getLanguageMeta(lang: AppLanguage): LanguageMeta {
  return LANGUAGE_REGISTRY[lang] || LANGUAGE_REGISTRY[DEFAULT_LANGUAGE]
}

export function getTranslationTargetCode(lang: AppLanguage): string | null {
  return getLanguageMeta(lang).googleTranslateCode
}

export function pickText(
  lang: AppLanguage,
  variants: { pl: string; en: string } & Partial<Record<AppLanguage, string>>
): string {
  return variants[lang] ?? (lang === 'pl' ? variants.pl : variants.en) ?? variants.en ?? variants.pl
}

/* === Shared Dictionary Schema === */

export interface AppDictionary {
  schedule: string
  grades: string
  attendance: string
  messages: string
  attendanceRate: string
  lessons: string
  noLessonsDay: string
  pendingJustification: string
  onlyParentCanExcuse: string
  cancel: string
  send: string
  sending: string
  commentPlaceholder: string
  noGradesRecorded: string
  noAbsencesRecorded: string
  weight: string
  teacherLabel: string
  dateLabel: string
  notSpecified: string
  settingsTitle: string
  refresh: string
  loadingTimetable: string
  syncedStatus: string
  updatingStatus: string
  luckyNumber: string
  appLanguage: string
  appTheme: string
  themeSystem: string
  themeLight: string
  themeDark: string
  studentRole: string
  parentRole: string
  studentRoleTitle: string
  parentRoleTitle: string
  switchAccount: string
  addAccount: string
  preferences: string
  advancedTitle: string
  systemSection: string
  studentJustificationsSection: string
  studentJustificationsTitle: string
  studentJustificationsDescription: string
  displaySectionTitle: string
  gradesCalcSectionTitle: string
  logout: string
  done: string
  backAction: string
  messagesInbox: string
  messagesAnnouncements: string
  noMessages: string
  subjectPlaceholder: string
  messagePlaceholder: string
  accountVerified: string
  loginError: string
  breakCountdownLabel: (m: number) => string
  replyAction: string
  searchMessagesPlaceholder: string
  writeNewMessage: string
  newMessageTitle: string
  messageSent: string
  emptyMessageContent: string
  subjectsSection: string
  subjectAttendance: string
  missedLessonsCount: (count: number) => string
  ofScheduled: (total: number) => string
  recordedAbsencesTitle: string
  lessonNumberLabel: (num: number) => string
  gpaTitle: string
  terminarzButton: string
  lessonDetails: string
  lessonTopic: string
  noTopicRecorded: string
  roomLabel: string
  durationLabel: string
  breakWord: string
  justStatusPending: string
  justStatusAccepted: string
  justStatusRejected: string
  justStatusPartial: string
  liveJustificationsTitle: string
  liveJustificationsEmpty: string
  mobileTodayAttendanceTitle: string
  mobileTodayAttendanceDesc: string
  laterStartLabel: string
  earlierFinishLabel: string
  exportCalendarIcs: string
  pullToRefreshHint: string
  releaseToRefreshHint: string
  lastSyncedAtLabel: (timeStr: string) => string
  closeLabel: string
  backLabel: string
  navModeTitle: string
  navModeDesc: string
  navModeWidgets: string
  navModeTabs: string
}

const EN_DICTIONARY: AppDictionary = {
  schedule: 'Schedule',
  grades: 'Grades',
  attendance: 'Attendance',
  messages: 'Messages',
  attendanceRate: 'Attendance Rate',
  lessons: 'lessons',
  noLessonsDay: 'No scheduled lessons for this day',
  pendingJustification: 'Pending',
  onlyParentCanExcuse: 'Only parent accounts can submit absence justifications.',
  cancel: 'Cancel',
  send: 'Submit',
  sending: 'Submitting...',
  commentPlaceholder: 'Optional message to teacher...',
  noGradesRecorded: 'No grades recorded',
  noAbsencesRecorded: 'No absences recorded',
  weight: 'Weight',
  teacherLabel: 'Teacher',
  dateLabel: 'Date',
  notSpecified: 'Not specified',
  settingsTitle: 'Settings',
  refresh: 'Refresh',
  loadingTimetable: 'Loading timetable...',
  syncedStatus: 'Synced',
  updatingStatus: 'Updating...',
  luckyNumber: 'Lucky number',
  appLanguage: 'Language',
  appTheme: 'Theme',
  themeSystem: 'Auto',
  themeLight: 'Light',
  themeDark: 'Dark',
  studentRole: 'Student',
  parentRole: 'Parent',
  studentRoleTitle: 'Student Account',
  parentRoleTitle: 'Parent Account',
  switchAccount: 'Switch',
  addAccount: 'Add another account',
  preferences: 'Preferences',
  advancedTitle: 'Advanced',
  systemSection: 'System',
  studentJustificationsSection: 'Excuses & Justifications',
  studentJustificationsTitle: 'Allow student justifications',
  studentJustificationsDescription: 'Enable submitting absence excuses from student accounts',
  displaySectionTitle: 'Display & Layout',
  gradesCalcSectionTitle: 'Grade Calculations',
  logout: 'Sign Out',
  done: 'Done',
  backAction: 'Back',
  messagesInbox: 'Inbox',
  messagesAnnouncements: 'Announcements',
  noMessages: 'No messages yet',
  subjectPlaceholder: 'Subject',
  messagePlaceholder: 'Write your message...',
  accountVerified: 'Identity Verified',
  loginError: 'Invalid login or password. Please try again.',
  breakCountdownLabel: (m: number) => `Break • ${m} min left`,
  replyAction: 'Reply',
  searchMessagesPlaceholder: 'Search messages...',
  writeNewMessage: 'Compose',
  newMessageTitle: 'New Message',
  messageSent: 'Message sent successfully',
  emptyMessageContent: 'No message content available',
  subjectsSection: 'Subjects',
  subjectAttendance: 'Subject Attendance',
  missedLessonsCount: (count: number) => `${count} missed`,
  ofScheduled: (total: number) => `of ${total} scheduled`,
  recordedAbsencesTitle: 'Recorded Absences',
  lessonNumberLabel: (num: number) => `Lesson ${num}`,
  gpaTitle: 'Grade Point Average (GPA)',
  terminarzButton: 'Calendar',
  lessonDetails: 'Lesson Details',
  lessonTopic: 'Lesson Topic',
  noTopicRecorded: 'No topic recorded',
  roomLabel: 'Classroom',
  durationLabel: 'Duration',
  breakWord: 'Break',
  justStatusPending: 'Pending',
  justStatusAccepted: 'Accepted',
  justStatusRejected: 'Rejected',
  justStatusPartial: 'Partial',
  liveJustificationsTitle: 'Librus Justifications',
  liveJustificationsEmpty: 'No requests found in this status',
  mobileTodayAttendanceTitle: "Show today's attendance on phone",
  mobileTodayAttendanceDesc: "Adds today's lesson dots row to the compact dashboard widget",
  laterStartLabel: 'Later start',
  earlierFinishLabel: 'Earlier finish',
  exportCalendarIcs: 'Add to Calendar (.ics)',
  pullToRefreshHint: 'Pull to refresh',
  releaseToRefreshHint: 'Release to sync',
  lastSyncedAtLabel: (timeStr) => `Synced at ${timeStr}`,
  closeLabel: 'Close',
  backLabel: 'Back',
  navModeTitle: 'Bottom navigation bar',
  navModeDesc: 'Replace home screen widgets with native bottom tabs',
  navModeWidgets: 'Widgets',
  navModeTabs: 'Tab bar'
}

const PL_DICTIONARY: AppDictionary = {
  schedule: 'Plan',
  grades: 'Oceny',
  attendance: 'Frekwencja',
  messages: 'Wiadomości',
  attendanceRate: 'Wskaźnik frekwencji',
  lessons: 'lekcji',
  noLessonsDay: 'Brak zaplanowanych lekcji w tym dniu',
  pendingJustification: 'Oczekuje',
  onlyParentCanExcuse: 'Tylko z konta rodzica można przesyłać usprawiedliwienia nieobecności.',
  cancel: 'Anuluj',
  send: 'Wyślij',
  sending: 'Wysyłanie...',
  commentPlaceholder: 'Komentarz do wychowawcy (opcjonalnie)...',
  noGradesRecorded: 'Brak wpisanych ocen',
  noAbsencesRecorded: 'Brak zarejestrowanych nieobecności',
  weight: 'Waga',
  teacherLabel: 'Nauczyciel',
  dateLabel: 'Data',
  notSpecified: 'Nie podano',
  settingsTitle: 'Ustawienia',
  refresh: 'Odśwież',
  loadingTimetable: 'Ładowanie planu lekcji...',
  syncedStatus: 'Zsynchronizowano',
  updatingStatus: 'Aktualizowanie...',
  luckyNumber: 'Szczęśliwy numerek',
  appLanguage: 'Język',
  appTheme: 'Motyw',
  themeSystem: 'Auto',
  themeLight: 'Jasny',
  themeDark: 'Ciemny',
  studentRole: 'Uczeń',
  parentRole: 'Rodzic',
  studentRoleTitle: 'Konto ucznia',
  parentRoleTitle: 'Konto rodzica',
  switchAccount: 'Przełącz',
  addAccount: 'Dodaj kolejne konto',
  preferences: 'Preferencje',
  advancedTitle: 'Zaawansowane',
  systemSection: 'System',
  studentJustificationsSection: 'e-Usprawiedliwienia',
  studentJustificationsTitle: 'Usprawiedliwienia dla uczniów',
  studentJustificationsDescription: 'Pozwól na przesyłanie usprawiedliwień z konta ucznia',
  displaySectionTitle: 'Ekran i układ',
  gradesCalcSectionTitle: 'Kalkulator ocen',
  logout: 'Wyloguj się',
  done: 'Gotowe',
  backAction: 'Wróć',
  messagesInbox: 'Odebrane',
  messagesAnnouncements: 'Ogłoszenia',
  noMessages: 'Brak wiadomości',
  subjectPlaceholder: 'Temat',
  messagePlaceholder: 'Treść wiadomości...',
  accountVerified: 'Tożsamość potwierdzona',
  loginError: 'Nieprawidłowy login lub hasło. Spróbuj ponownie.',
  breakCountdownLabel: (m: number) => `Przerwa • pozostało ${m} min`,
  replyAction: 'Odpowiedz',
  searchMessagesPlaceholder: 'Szukaj w wiadomościach...',
  writeNewMessage: 'Napisz',
  newMessageTitle: 'Nowa wiadomość',
  messageSent: 'Wysłano wiadomość',
  emptyMessageContent: 'Brak treści wiadomości',
  subjectsSection: 'Przedmioty',
  subjectAttendance: 'Frekwencja z przedmiotu',
  missedLessonsCount: (count: number) =>
    `${count} ${formatPolishPlural(count, 'opuszczona', 'opuszczone', 'opuszczonych')}`,
  ofScheduled: (total: number) => `z ${total} zaplanowanych`,
  recordedAbsencesTitle: 'Zarejestrowane nieobecności',
  lessonNumberLabel: (num: number) => `Lekcja ${num}`,
  gpaTitle: 'Średnia ocen (GPA)',
  terminarzButton: 'Terminarz',
  lessonDetails: 'Szczegóły lekcji',
  lessonTopic: 'Temat lekcji',
  noTopicRecorded: 'Brak wpisanego tematu',
  roomLabel: 'Sala / Gabinet',
  durationLabel: 'Czas trwania',
  breakWord: 'Przerwa',
  justStatusPending: 'Oczekujące',
  justStatusAccepted: 'Zaakceptowane',
  justStatusRejected: 'Odrzucone',
  justStatusPartial: 'Częściowe',
  liveJustificationsTitle: 'Wnioski w Librusie',
  liveJustificationsEmpty: 'Brak wniosków w tym statusie',
  mobileTodayAttendanceTitle: 'Dzisiejsza obecność na telefonie',
  mobileTodayAttendanceDesc: 'Pokazuje pasek lekcji z dzisiaj na karcie frekwencji',
  laterStartLabel: 'Późniejszy początek',
  earlierFinishLabel: 'Wcześniejszy koniec',
  exportCalendarIcs: 'Dodaj do Kalendarza (.ics)',
  pullToRefreshHint: 'Pociągnij, aby odświeżyć',
  releaseToRefreshHint: 'Puść, aby zsynchronizować',
  lastSyncedAtLabel: (timeStr) => `Zsynchronizowano ${timeStr}`,
  closeLabel: 'Zamknij',
  backLabel: 'Wróć',
  navModeTitle: 'Dolny pasek nawigacji',
  navModeDesc: 'Zastąp widżety ekranu głównego dolnymi zakładkami',
  navModeWidgets: 'Widżety',
  navModeTabs: 'Pasek dolny'
}

const DICTIONARIES: Record<AppLanguage, AppDictionary> = {
  pl: PL_DICTIONARY,
  en: EN_DICTIONARY
}

export function getDictionary(lang: AppLanguage): AppDictionary {
  return DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANGUAGE]
}
