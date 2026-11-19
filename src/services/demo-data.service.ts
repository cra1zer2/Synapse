/**
 * Service: Offline & Demo Data Generator
 * Generates realistic Librus timetables, grades, attendance, messages, announcements, and justifications for demo accounts.
 * Mirrors live service schemas across both Polish and non-Polish language modes.
 */

import { StudentProfile } from '@/models/account.model'
import { SmartTimetableResult, DaySchedule, LessonItem, TimetableEvent } from '@/models/timetable.model'
import { GradesResult } from '@/models/grade.model'
import { AttendanceResult, SubjectAttendance, AbsenceDetail, LegacyAttendanceTable } from '@/models/attendance.model'
import { MessagesActionResult, MessageItem, AnnouncementItem, ReceiverItem, MessageAttachment } from '@/models/message.model'
import { LiveJustificationItem } from '@/models/justification.model'
import { isDemoParentAccount } from '@/utils/account.util'
import { getSchoolWeekMondayIso, getTodayIsoString } from '@/utils/date.util'
export { getDemoGrades } from '@/services/demo/grades.demo'

function shiftSchoolDays(baseIso: string, deltaSchoolDays: number) {
    const [y, m, d] = baseIso.split('-').map(Number)
    const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1))
    let remaining = Math.abs(deltaSchoolDays)
    const step = deltaSchoolDays >= 0 ? 1 : -1
    while (remaining > 0) {
        dt.setUTCDate(dt.getUTCDate() + step)
        const dow = dt.getUTCDay()
        if (dow !== 0 && dow !== 6) remaining--
    }
    const isoDate = dt.toISOString().slice(0, 10)
    const [, mm, dd] = isoDate.split('-')
    const yyyy = isoDate.slice(0, 4)
    const weekdaysPl = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
    const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return {
        isoDate,
        displayDate: `${dd}.${mm}`,
        dotDate: `${dd}.${mm}.${yyyy}`,
        weekdayPl: weekdaysPl[dt.getUTCDay()],
        weekdayEn: weekdaysEn[dt.getUTCDay()]
    }
}

export function getDemoStudentProfile(username: string): StudentProfile {
    const isParent = isDemoParentAccount(username)
    return {
        fullName: isParent ? 'Marek Kowalski (Rodzic)' : 'Aleksander Kowalski',
        className: '4T',
        schoolName: 'XIV Liceum Ogólnokształcące im. St. Staszica',
        luckyNumber: 14,
        classNumber: 14,
        role: isParent ? 'parent' : 'student'
    }
}

export function getDemoSmartTimetable(targetDateIso?: string, translate: boolean = false): SmartTimetableResult {
    const mondayIso = getSchoolWeekMondayIso(targetDateIso || getTodayIsoString())
    const parts = mondayIso.split('-').map(Number)
    const mondayDate = new Date(parts[0], parts[1] - 1, parts[2])

    const dayOffsets = [0, 1, 2, 3, 4]
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const dayNamesPl = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek']
    const todayIso = getTodayIsoString()

    const dayDates = dayOffsets.map((offset) => {
        const d = new Date(mondayDate)
        d.setDate(d.getDate() + offset)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return {
            isoDate: `${y}-${m}-${day}`,
            displayDate: `${day}.${m}`
        }
    })

    const fridayIso = dayDates[4].isoDate

    const s = (pl: string, en: string) => (translate ? en : pl)

    const lessonsMon: LessonItem[] = [
        {
            number: 1,
            subject: s('Matematyka', 'Mathematics'),
            teacher: 'dr Jan Nowak',
            room: '204',
            time: '08:00 - 08:45',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Rachunek różniczkowy i badanie przebiegu zmienności funkcji', 'Differential calculus and function analysis')
        },
        {
            number: 2,
            subject: s('Matematyka', 'Mathematics'),
            teacher: 'dr Jan Nowak',
            room: '204',
            time: '08:55 - 09:40',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Zastosowanie pochodnych w zadaniach optymalizacyjnych', 'Applications of derivatives in optimization problems')
        },
        {
            number: 3,
            subject: s('Język angielski', 'English'),
            teacher: 'mgr Anna Wiśniewska',
            room: '108',
            time: '09:50 - 10:35',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Advanced C1 Vocabulary: Technology and Ethics in AI', 'Advanced C1 Vocabulary: Technology and Ethics in AI')
        },
        {
            number: 4,
            subject: s('Informatyka', 'Computer Science'),
            teacher: 'inż. Piotr Kowalczyk',
            room: 'Lab IT 1',
            time: '10:45 - 11:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Algorytmy grafowe — przeszukiwanie wszerz BFS', 'Graph algorithms — Breadth-First Search (BFS)')
        },
        {
            number: 5,
            subject: s('Informatyka', 'Computer Science'),
            teacher: 'inż. Piotr Kowalczyk',
            room: 'Lab IT 1',
            time: '11:45 - 12:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Implementacja algorytmu Dijkstry w C++', 'Implementation of Dijkstra algorithm in C++')
        },
        {
            number: 6,
            subject: s('Język polski', 'Polish'),
            teacher: 'mgr Maria Dąbrowska',
            room: '312',
            time: '12:40 - 13:25',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Motyw vanitas i motywy biblijne w literaturze Młodej Polski', 'Vanitas motif and biblical references in Young Poland literature')
        },
        {
            number: 7,
            subject: s('Fizyka', 'Physics'),
            teacher: 'dr hab. Tomasz Lewandowski',
            room: '201',
            time: '13:35 - 14:20',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Elektrodynamika i pole magnetyczne przewodnika z prądem', 'Electrodynamics and magnetic field of current-carrying conductor')
        }
    ]

    const lessonsTue: LessonItem[] = [
        {
            number: 1,
            subject: s('Język polski', 'Polish'),
            teacher: 'mgr Maria Dąbrowska',
            room: '312',
            time: '08:00 - 08:45',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Analiza porównawcza wybranych wierszy Bolesława Leśmiana', 'Comparative analysis of poems by Boleslaw Lesmian')
        },
        {
            number: 2,
            subject: s('Historia', 'History'),
            teacher: 'mgr Krzysztof Zieliński',
            room: '114',
            time: '08:55 - 09:40',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Geneza i skutki traktatu wersalskiego dla II RP', 'Origins and consequences of the Treaty of Versailles')
        },
        {
            number: 3,
            subject: s('Fizyka', 'Physics'),
            teacher: 'dr hab. Tomasz Lewandowski',
            room: '201',
            time: '09:50 - 10:35',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Indukcja elektromagnetyczna i prawo Faradaya', 'Electromagnetic induction and Faraday law')
        },
        {
            number: 4,
            subject: s('Matematyka', 'Mathematics'),
            teacher: 'dr Jan Nowak',
            room: '204',
            time: '10:45 - 11:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Całki nieoznaczone i podstawowe metody całkowania', 'Indefinite integrals and fundamental integration methods')
        },
        {
            number: 5,
            subject: s('Język angielski', 'English'),
            teacher: 'mgr Anna Wiśniewska',
            room: '108',
            time: '11:45 - 12:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Essay Writing: Argumentative structures and debate prep', 'Essay Writing: Argumentative structures and debate prep')
        },
        {
            number: 6,
            subject: s('Wychowanie fizyczne', 'Physical Education'),
            teacher: 'mgr Robert Kamiński',
            room: s('Hala sportowa', 'Sports Hall'),
            time: '12:40 - 13:25',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Koszykówka — organizacja gry w strefie i szybki atak', 'Basketball — zone defense and fast break tactics')
        },
        {
            number: 7,
            subject: s('Wychowanie fizyczne', 'Physical Education'),
            teacher: 'mgr Robert Kamiński',
            room: s('Hala sportowa', 'Sports Hall'),
            time: '13:35 - 14:20',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Turniej międzyklasowy w koszykówkę', 'Inter-class basketball tournament')
        }
    ]

    const lessonsWed: LessonItem[] = [
        {
            number: 1,
            subject: s('Chemia', 'Chemistry'),
            teacher: 'dr Beata Mazur',
            room: '102',
            time: '08:00 - 08:45',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Reakcje utleniania i redukcji w roztworach wodnych', 'Redox reactions in aqueous solutions')
        },
        {
            number: 2,
            subject: s('Biologia', 'Biology'),
            teacher: 'mgr Ewa Wójcik',
            room: '215',
            time: '08:55 - 09:40',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Struktura DNA i proces replikacji semikonserwatywnej', 'DNA structure and semiconservative replication')
        },
        {
            number: 3,
            subject: s('Matematyka', 'Mathematics'),
            teacher: 'dr Jan Nowak',
            room: '204',
            time: '09:50 - 10:35',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Zadania maturalne z geometrii analitycznej', 'Analytical geometry exam exercises')
        },
        {
            number: 4,
            subject: s('Język niemiecki', 'German'),
            teacher: 'mgr Joanna Kaczmarek',
            room: '205',
            time: '10:45 - 11:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Passiv im Präsens und Präteritum im Kontext der Technologie', 'Passive voice in present and past tense')
        },
        {
            number: 5,
            subject: s('Geografia', 'Geography'),
            teacher: 'mgr Paweł Szymański',
            room: '110',
            time: '11:45 - 12:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Procesy urbanizacji i megamiasta współczesnego świata', 'Urbanization processes and modern megacities')
        },
        {
            number: 6,
            subject: s('Informatyka', 'Computer Science'),
            teacher: 'inż. Piotr Kowalczyk',
            room: 'Lab IT 1',
            time: '12:40 - 13:25',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Bazy danych: relacje, klucze obce i normalizacja tabel', 'Relational databases: foreign keys and normalization')
        },
        {
            number: 7,
            subject: s('Język angielski', 'English'),
            teacher: 'mgr Anna Wiśniewska',
            room: '108',
            time: '13:35 - 14:20',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Debata oksfordzka: etyka sztucznej inteligencji', 'Oxford debate: ethics of artificial intelligence')
        }
    ]

    const lessonsThu: LessonItem[] = [
        {
            number: 1,
            subject: s('Matematyka', 'Mathematics'),
            teacher: 'dr Jan Nowak',
            room: '204',
            time: '08:00 - 08:45',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Kombinatoryka i dwumian Newtona', 'Combinatorics and the Binomial Theorem')
        },
        {
            number: 2,
            subject: s('Fizyka', 'Physics'),
            teacher: 'dr hab. Tomasz Lewandowski',
            room: '201',
            time: '08:55 - 09:40',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Laboratorium: wyznaczanie przyspieszenia ziemskiego', 'Physics lab: measuring gravitational acceleration')
        },
        {
            number: 3,
            subject: s('Język polski', 'Polish'),
            teacher: 'mgr Maria Dąbrowska',
            room: '312',
            time: '09:50 - 10:35',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Dziady cz. III Adama Mickiewicza jako dramat narodowy', 'Forefathers’ Eve Part III as a national drama')
        },
        {
            number: 4,
            subject: s('Język angielski', 'English'),
            teacher: 'mgr Anna Wiśniewska',
            room: '108',
            time: '10:45 - 11:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Listening comprehension & C1 Speaking practice', 'Listening comprehension & C1 Speaking practice')
        },
        {
            number: 5,
            subject: s('Informatyka', 'Computer Science'),
            teacher: 'inż. Piotr Kowalczyk',
            room: 'Lab IT 1',
            time: '11:45 - 12:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: true,
            flag: s('Zastępstwo', 'Substitution'),
            teacherAbsent: false,
            topic: s('Zastępstwo za Godzinę wychowawczą: Struktury grafowe w Pythonie', 'Substitution for Homeroom: Graph structures in Python')
        },
        {
            number: 6,
            subject: s('Wiedza o społeczeństwie', 'Civics'),
            teacher: 'mgr Andrzej Kozłowski',
            room: '115',
            time: '12:40 - 13:25',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Systemy wyborcze i funkcjonowanie parlamentu', 'Electoral systems and parliamentary proceedings')
        },
        {
            number: 7,
            subject: s('Historia', 'History'),
            teacher: 'mgr Krzysztof Zieliński',
            room: '114',
            time: '13:35 - 14:20',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Odbudowa gospodarcza i reforma walutowa Władysława Grabskiego', 'Economic reconstruction and currency reform in interwar Poland')
        },
        {
            number: 8,
            subject: s('Biologia', 'Biology'),
            teacher: 'mgr Ewa Wójcik',
            room: '215',
            time: '14:25 - 15:10',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: true,
            isSubstitution: false,
            flag: s('Odwołana', 'Cancelled'),
            teacherAbsent: true,
            topic: s('Lekcja odwołana — konferencja metodyczna nauczyciela', 'Cancelled — teacher methodological conference')
        }
    ]

    const lessonsFri: LessonItem[] = [
        {
            number: 1,
            subject: s('Informatyka', 'Computer Science'),
            teacher: 'inż. Piotr Kowalczyk',
            room: 'Lab IT 1',
            time: '08:00 - 08:45',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Projekt programistyczny: architektura klient-serwer', 'Software project: Client-server architecture')
        },
        {
            number: 2,
            subject: s('Informatyka', 'Computer Science'),
            teacher: 'inż. Piotr Kowalczyk',
            room: 'Lab IT 1',
            time: '08:55 - 09:40',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Testy jednostkowe i integracyjne w aplikacji', 'Unit and integration testing in applications')
        },
        {
            number: 3,
            subject: s('Fizyka', 'Physics'),
            teacher: 'dr hab. Tomasz Lewandowski',
            room: '201',
            time: '09:50 - 10:35',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: true,
            flag: s('Zastępstwo', 'Substitution'),
            teacherAbsent: false,
            topic: s('Zastępstwo za Matematykę: Rozwiązywanie arkuszy maturalnych', 'Substitution for Math: Solving physics past papers')
        },
        {
            number: 4,
            subject: s('Język polski', 'Polish'),
            teacher: 'mgr Maria Dąbrowska',
            room: '312',
            time: '10:45 - 11:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Poetyka baroku w twórczości Mikołaja Sępa Szarzyńskiego', 'Baroque poetry of Mikołaj Sęp Szarzyński')
        },
        {
            number: 5,
            subject: s('Wychowanie fizyczne', 'Physical Education'),
            teacher: 'mgr Robert Kamiński',
            room: s('Siłownia', 'Gym'),
            time: '11:45 - 12:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Trening obwodowy i ogólnorozwojowy', 'Circuit and conditioning training')
        },
        {
            number: 6,
            subject: s('Chemia', 'Chemistry'),
            teacher: 'dr Beata Mazur',
            room: '102',
            time: '12:40 - 13:25',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Hydroliza soli i skala pH roztworów wodnych', 'Salt hydrolysis and pH scale of aqueous solutions')
        },
        {
            number: 7,
            subject: s('Język angielski', 'English'),
            teacher: 'mgr Anna Wiśniewska',
            room: '108',
            time: '13:35 - 14:20',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Mock Speaking Exam: Part 3 Collaborative Task', 'Mock Speaking Exam: Part 3 Collaborative Task')
        }
    ]

    const eventsMon: TimetableEvent[] = [
        {
            id: 'ev-1',
            title: s('Kartkówka: Pochodne funkcji złożonych', 'Quiz: Derivatives of composite functions'),
            date: dayDates[0].displayDate,
            isoDate: dayDates[0].isoDate,
            isAbsence: false,
            category: 'quiz',
            subjectName: s('Matematyka', 'Mathematics'),
            lessonNumber: 1,
            description: s('Wzory na pochodne i zadania 1-6 ze zbioru Kłaczkowa', 'Derivative formulas and textbook exercises 1-6'),
            teacher: 'dr Jan Nowak'
        }
    ]

    const eventsTue: TimetableEvent[] = [
        {
            id: 'ev-2',
            title: s('Kartkówka: Phrasal verbs Unit 5', 'Quiz: Phrasal verbs Unit 5'),
            date: dayDates[1].displayDate,
            isoDate: dayDates[1].isoDate,
            isAbsence: false,
            category: 'quiz',
            subjectName: s('Język angielski', 'English'),
            lessonNumber: 5,
            description: s('Słownictwo ze stron 64-68 podręcznika', 'Vocabulary from textbook pages 64-68'),
            teacher: 'mgr Anna Wiśniewska'
        }
    ]

    const eventsWed: TimetableEvent[] = [
        {
            id: 'ev-3',
            title: s('Sprawdzian: Elektrostatyka i pole elektryczne', 'Exam: Electrostatics and electric field'),
            date: dayDates[2].displayDate,
            isoDate: dayDates[2].isoDate,
            isAbsence: false,
            category: 'exam',
            subjectName: s('Fizyka', 'Physics'),
            lessonNumber: 3,
            description: s('Dział 3 podręcznika: prawo Coulomba, natężenie pola, potencjał', 'Chapter 3: Coulomb’s law, electric field, potential'),
            teacher: 'dr hab. Tomasz Lewandowski'
        }
    ]

    const eventsThu: TimetableEvent[] = [
        {
            id: 'ev-4',
            title: s('Kartkówka: Dziady cz. III — znajomość lektury', 'Quiz: Forefathers’ Eve Part III'),
            date: dayDates[3].displayDate,
            isoDate: dayDates[3].isoDate,
            isAbsence: false,
            category: 'quiz',
            subjectName: s('Język polski', 'Polish'),
            lessonNumber: 3,
            description: s('Sceny więzienne, Wielka Improwizacja i Widzenie ks. Piotra', 'Prison scenes, Great Improvisation, and Father Piotr’s Vision'),
            teacher: 'mgr Maria Dąbrowska'
        },
        {
            id: 'ev-4b',
            title: s('Oddanie konspektu wypracowania', 'Essay outline submission'),
            date: dayDates[3].displayDate,
            isoDate: dayDates[3].isoDate,
            isAbsence: false,
            category: 'homework',
            subjectName: s('Język polski', 'Polish'),
            description: s('Konspekt pracy na temat motywu samotności w literaturze', 'Outline on the loneliness motif in literature'),
            teacher: 'mgr Maria Dąbrowska'
        }
    ]

    const eventsFri: TimetableEvent[] = [
        {
            id: 'ev-5',
            title: s('Apel okolicznościowy i wręczenie stypendiów', 'School assembly and scholarship awards'),
            date: dayDates[4].displayDate,
            isoDate: dayDates[4].isoDate,
            isAbsence: false,
            category: 'info',
            description: s('Spotkanie w auli głównej o godzinie 12:45', 'Meeting in the main hall at 12:45 PM')
        }
    ]

    const schedule: DaySchedule[] = [
        {
            dayName: dayNames[0],
            date: dayDates[0].displayDate,
            isoDate: dayDates[0].isoDate,
            isToday: dayDates[0].isoDate === todayIso,
            events: eventsMon,
            lessons: lessonsMon
        },
        {
            dayName: dayNames[1],
            date: dayDates[1].displayDate,
            isoDate: dayDates[1].isoDate,
            isToday: dayDates[1].isoDate === todayIso,
            events: eventsTue,
            lessons: lessonsTue
        },
        {
            dayName: dayNames[2],
            date: dayDates[2].displayDate,
            isoDate: dayDates[2].isoDate,
            isToday: dayDates[2].isoDate === todayIso,
            events: eventsWed,
            lessons: lessonsWed
        },
        {
            dayName: dayNames[3],
            date: dayDates[3].displayDate,
            isoDate: dayDates[3].isoDate,
            isToday: dayDates[3].isoDate === todayIso,
            events: eventsThu,
            lessons: lessonsThu
        },
        {
            dayName: dayNames[4],
            date: dayDates[4].displayDate,
            isoDate: dayDates[4].isoDate,
            isToday: dayDates[4].isoDate === todayIso,
            events: eventsFri,
            lessons: lessonsFri
        }
    ]

    const up0 = shiftSchoolDays(todayIso, 0)
    const up1 = shiftSchoolDays(todayIso, 1)
    const up2 = shiftSchoolDays(todayIso, 2)
    const up3 = shiftSchoolDays(todayIso, 3)
    const up5 = shiftSchoolDays(todayIso, 5)
    const up7 = shiftSchoolDays(todayIso, 7)

    const calendarEvents: TimetableEvent[] = [
        ...eventsMon,
        ...eventsTue,
        ...eventsWed,
        ...eventsThu,
        ...eventsFri,
        {
            id: 'ev-cal-today',
            title: s('Sprawdzian: Rachunek różniczkowy i ekstrema', 'Exam: Differential Calculus & Extrema'),
            date: up0.displayDate,
            isoDate: up0.isoDate,
            isAbsence: false,
            category: 'exam',
            subjectName: s('Matematyka', 'Mathematics'),
            lessonNumber: 1,
            description: s('Granice, pochodne, ekstrema lokalne i optymalizacja.', 'Limits, derivatives, local extrema, and optimization.'),
            teacher: 'dr Jan Nowak'
        },
        {
            id: 'ev-cal-next1',
            title: s('Oddanie projektu zespołowego (API + Baza)', 'Team Project Submission (API + DB)'),
            date: up1.displayDate,
            isoDate: up1.isoDate,
            isAbsence: false,
            category: 'homework',
            subjectName: s('Informatyka', 'Computer Science'),
            lessonNumber: 2,
            description: s('Repozytorium GitHub, testy oraz dokumentacja techniczna.', 'GitHub repository, unit tests, and technical docs.'),
            teacher: 'inż. Piotr Kowalczyk'
        },
        {
            id: 'ev-cal-next2',
            title: s('Sprawdzian: II Rzeczpospolita 1918–1939', 'Exam: Second Polish Republic 1918–1939'),
            date: up2.displayDate,
            isoDate: up2.isoDate,
            isAbsence: false,
            category: 'exam',
            subjectName: s('Historia', 'History'),
            lessonNumber: 2,
            description: s('Odbudowa państwa, konstytucja marcowa i polityka zagraniczna.', 'State reconstruction, March Constitution, and foreign policy.'),
            teacher: 'mgr Krzysztof Zieliński'
        },
        {
            id: 'ev-cal-next3',
            title: s('Kartkówka: Słownictwo C1 — Środowisko', 'Quiz: C1 Vocabulary — Environment'),
            date: up3.displayDate,
            isoDate: up3.isoDate,
            isAbsence: false,
            category: 'quiz',
            subjectName: s('Język angielski', 'English'),
            lessonNumber: 4,
            description: s('Unit 6 wordlist + kolokacje egzaminacyjne.', 'Unit 6 wordlist + exam collocations.'),
            teacher: 'mgr Anna Wiśniewska'
        },
        {
            id: 'ev-cal-next5',
            title: s('Próbna matura z chemii (poziom rozszerzony)', 'Mock Chemistry Exam (Extended Level)'),
            date: up5.displayDate,
            isoDate: up5.isoDate,
            isAbsence: false,
            category: 'exam',
            subjectName: s('Chemia', 'Chemistry'),
            lessonNumber: 1,
            description: s('Arkusz CKE w sali gimnastycznej, zbiórka o 08:45.', 'Mock exam in the main sports hall at 08:45.'),
            teacher: 'dr Beata Mazur'
        },
        {
            id: 'ev-cal-next7',
            title: s('Dzień Otwarty Uczelni Technicznych', 'Technical Universities Open Day'),
            date: up7.displayDate,
            isoDate: up7.isoDate,
            isAbsence: false,
            category: 'info',
            description: s('Wyjście zorganizowane dla klas czwartych (9:00–13:00).', 'Organized visit for 4th-year students (9:00 AM–1:00 PM).')
        }
    ]

    return {
        weekStart: mondayIso,
        weekEnd: fridayIso,
        schedule,
        calendarEvents
    }
}

export function getDemoAttendance(translate: boolean = false): AttendanceResult {
    const s = (pl: string, en: string) => (translate ? en : pl)
    const todayIso = getTodayIsoString()
    const d0 = shiftSchoolDays(todayIso, 0)
    const d1 = shiftSchoolDays(todayIso, -1)
    const d2 = shiftSchoolDays(todayIso, -2)
    const d4 = shiftSchoolDays(todayIso, -4)
    const d6 = shiftSchoolDays(todayIso, -6)
    const d9 = shiftSchoolDays(todayIso, -9)
    const d12 = shiftSchoolDays(todayIso, -12)

    const nbType = s('Nieobecność nieusprawiedliwiona', 'Unexcused absence')
    const uType = s('Nieobecność usprawiedliwiona', 'Excused absence')
    const spType = s('Spóźnienie', 'Late arrival')
    const zwType = s('Zwolnienie z zajęć', 'Exempt / Excused release')

    const absPolish: AbsenceDetail[] = [
        {
            id: 101,
            date: d1.dotDate,
            lessonNumber: 1,
            time: '08:00 - 08:45',
            subject: s('Język polski', 'Polish'),
            teacher: 'mgr Maria Dąbrowska',
            type: 'nb',
            typeName: nbType,
            isUnexcused: true
        },
        {
            id: 103,
            date: d2.dotDate,
            lessonNumber: 4,
            time: '10:45 - 11:30',
            subject: s('Język polski', 'Polish'),
            teacher: 'mgr Maria Dąbrowska',
            type: 'nb',
            typeName: nbType,
            isUnexcused: true
        },
        {
            id: 105,
            date: d6.dotDate,
            lessonNumber: 2,
            time: '08:55 - 09:40',
            subject: s('Język polski', 'Polish'),
            teacher: 'mgr Maria Dąbrowska',
            type: 'u',
            typeName: uType,
            isUnexcused: false
        },
        {
            id: 106,
            date: d9.dotDate,
            lessonNumber: 3,
            time: '09:50 - 10:35',
            subject: s('Język polski', 'Polish'),
            teacher: 'mgr Maria Dąbrowska',
            type: 'sp',
            typeName: spType,
            isUnexcused: false
        }
    ]

    const absMath: AbsenceDetail[] = [
        {
            id: 102,
            date: d1.dotDate,
            lessonNumber: 2,
            time: '08:55 - 09:40',
            subject: s('Matematyka', 'Mathematics'),
            teacher: 'dr Jan Nowak',
            type: 'nb',
            typeName: nbType,
            isUnexcused: true
        },
        {
            id: 107,
            date: d6.dotDate,
            lessonNumber: 1,
            time: '08:00 - 08:45',
            subject: s('Matematyka', 'Mathematics'),
            teacher: 'dr Jan Nowak',
            type: 'u',
            typeName: uType,
            isUnexcused: false
        },
        {
            id: 108,
            date: d12.dotDate,
            lessonNumber: 3,
            time: '09:50 - 10:35',
            subject: s('Matematyka', 'Mathematics'),
            teacher: 'dr Jan Nowak',
            type: 'u',
            typeName: uType,
            isUnexcused: false
        }
    ]

    const absPhysics: AbsenceDetail[] = [
        {
            id: 104,
            date: d4.dotDate,
            lessonNumber: 2,
            time: '08:55 - 09:40',
            subject: s('Fizyka', 'Physics'),
            teacher: 'dr hab. Tomasz Lewandowski',
            type: 'nb',
            typeName: nbType,
            isUnexcused: true
        },
        {
            id: 109,
            date: d6.dotDate,
            lessonNumber: 3,
            time: '09:50 - 10:35',
            subject: s('Fizyka', 'Physics'),
            teacher: 'dr hab. Tomasz Lewandowski',
            type: 'u',
            typeName: uType,
            isUnexcused: false
        }
    ]

    const absPe: AbsenceDetail[] = [
        {
            id: 110,
            date: d6.dotDate,
            lessonNumber: 6,
            time: '12:40 - 13:25',
            subject: s('Wychowanie fizyczne', 'Physical Education'),
            teacher: 'mgr Robert Kamiński',
            type: 'zw',
            typeName: zwType,
            isUnexcused: false
        },
        {
            id: 111,
            date: d12.dotDate,
            lessonNumber: 6,
            time: '12:40 - 13:25',
            subject: s('Wychowanie fizyczne', 'Physical Education'),
            teacher: 'mgr Robert Kamiński',
            type: 'u',
            typeName: uType,
            isUnexcused: false
        },
        {
            id: 112,
            date: d12.dotDate,
            lessonNumber: 7,
            time: '13:35 - 14:20',
            subject: s('Wychowanie fizyczne', 'Physical Education'),
            teacher: 'mgr Robert Kamiński',
            type: 'u',
            typeName: uType,
            isUnexcused: false
        }
    ]

    const absChem: AbsenceDetail[] = [
        {
            id: 113,
            date: d9.dotDate,
            lessonNumber: 1,
            time: '08:00 - 08:45',
            subject: s('Chemia', 'Chemistry'),
            teacher: 'dr Beata Mazur',
            type: 'u',
            typeName: uType,
            isUnexcused: false
        },
        {
            id: 114,
            date: d4.dotDate,
            lessonNumber: 5,
            time: '11:45 - 12:30',
            subject: s('Chemia', 'Chemistry'),
            teacher: 'dr Beata Mazur',
            type: 'u',
            typeName: uType,
            isUnexcused: false
        }
    ]

    const absEng: AbsenceDetail[] = [
        {
            id: 115,
            date: d6.dotDate,
            lessonNumber: 4,
            time: '10:45 - 11:30',
            subject: s('Język angielski', 'English'),
            teacher: 'mgr Anna Wiśniewska',
            type: 'u',
            typeName: uType,
            isUnexcused: false
        },
        {
            id: 116,
            date: d9.dotDate,
            lessonNumber: 5,
            time: '11:45 - 12:30',
            subject: s('Język angielski', 'English'),
            teacher: 'mgr Anna Wiśniewska',
            type: 'sp',
            typeName: spType,
            isUnexcused: false
        }
    ]

    const unexcusedAbsences: AbsenceDetail[] = [
        absPolish[0],
        absMath[0],
        absPolish[1],
        absPhysics[0]
    ]

    const subjects: SubjectAttendance[] = [
        {
            subject: s('Język polski', 'Polish'),
            totalLessons: 36,
            absentLessons: 4,
            excusedCount: 2,
            unexcusedCount: 2,
            percentage: 88.9,
            status: 'safe',
            absences: absPolish
        },
        {
            subject: s('Matematyka', 'Mathematics'),
            totalLessons: 44,
            absentLessons: 4,
            excusedCount: 3,
            unexcusedCount: 1,
            percentage: 90.9,
            status: 'safe',
            absences: absMath
        },
        {
            subject: s('Fizyka', 'Physics'),
            totalLessons: 28,
            absentLessons: 3,
            excusedCount: 2,
            unexcusedCount: 1,
            percentage: 89.3,
            status: 'safe',
            absences: absPhysics
        },
        {
            subject: s('Chemia', 'Chemistry'),
            totalLessons: 22,
            absentLessons: 3,
            excusedCount: 3,
            unexcusedCount: 0,
            percentage: 86.4,
            status: 'safe',
            absences: absChem
        },
        {
            subject: s('Wychowanie fizyczne', 'Physical Education'),
            totalLessons: 32,
            absentLessons: 4,
            excusedCount: 4,
            unexcusedCount: 0,
            percentage: 87.5,
            status: 'safe',
            absences: absPe
        },
        {
            subject: s('Język angielski', 'English'),
            totalLessons: 36,
            absentLessons: 2,
            excusedCount: 2,
            unexcusedCount: 0,
            percentage: 94.4,
            status: 'safe',
            absences: absEng
        },
        {
            subject: s('Biologia', 'Biology'),
            totalLessons: 22,
            absentLessons: 1,
            excusedCount: 1,
            unexcusedCount: 0,
            percentage: 95.5,
            status: 'safe',
            absences: [
                {
                    id: 117,
                    date: d12.dotDate,
                    lessonNumber: 2,
                    time: '08:55 - 09:40',
                    subject: s('Biologia', 'Biology'),
                    teacher: 'mgr Ewa Wójcik',
                    type: 'u',
                    typeName: uType,
                    isUnexcused: false
                }
            ]
        },
        {
            subject: s('Geografia', 'Geography'),
            totalLessons: 20,
            absentLessons: 1,
            excusedCount: 1,
            unexcusedCount: 0,
            percentage: 95.0,
            status: 'safe',
            absences: [
                {
                    id: 118,
                    date: d6.dotDate,
                    lessonNumber: 5,
                    time: '11:45 - 12:30',
                    subject: s('Geografia', 'Geography'),
                    teacher: 'mgr Paweł Szymański',
                    type: 'u',
                    typeName: uType,
                    isUnexcused: false
                }
            ]
        },
        {
            subject: s('Informatyka', 'Computer Science'),
            totalLessons: 30,
            absentLessons: 0,
            excusedCount: 0,
            unexcusedCount: 0,
            percentage: 100.0,
            status: 'safe',
            absences: []
        },
        {
            subject: s('Historia', 'History'),
            totalLessons: 20,
            absentLessons: 0,
            excusedCount: 0,
            unexcusedCount: 0,
            percentage: 100.0,
            status: 'safe',
            absences: []
        }
    ]

    const legacyTable: LegacyAttendanceTable = {
        summary: {
            u: 18,
            nu: 4,
            total: 22,
            sp: 2,
            zw: 1,
            sl: 0
        },
        days: [
            {
                date: d0.displayDate,
                isoDate: d0.isoDate,
                weekday: s('Dzisiaj', 'Today'),
                lessons: {
                    1: { symbol: 'OB', type: 'ob' },
                    2: { symbol: 'OB', type: 'ob' },
                    3: { symbol: 'OB', type: 'ob' }
                },
                uCount: 0,
                nuCount: 0,
                totalCount: 0,
                spCount: 0,
                zwCount: 0,
                slCount: 0
            },
            {
                date: d1.displayDate,
                isoDate: d1.isoDate,
                weekday: translate ? d1.weekdayEn : d1.weekdayPl,
                lessons: {
                    1: { symbol: 'nb', type: 'nb' },
                    2: { symbol: 'nb', type: 'nb' },
                    3: { symbol: 'OB', type: 'ob' },
                    4: { symbol: 'OB', type: 'ob' },
                    5: { symbol: 'OB', type: 'ob' }
                },
                uCount: 0,
                nuCount: 2,
                totalCount: 2,
                spCount: 0,
                zwCount: 0,
                slCount: 0
            },
            {
                date: d2.displayDate,
                isoDate: d2.isoDate,
                weekday: translate ? d2.weekdayEn : d2.weekdayPl,
                lessons: {
                    1: { symbol: 'OB', type: 'ob' },
                    2: { symbol: 'OB', type: 'ob' },
                    3: { symbol: 'OB', type: 'ob' },
                    4: { symbol: 'nb', type: 'nb' },
                    5: { symbol: 'OB', type: 'ob' }
                },
                uCount: 0,
                nuCount: 1,
                totalCount: 1,
                spCount: 0,
                zwCount: 0,
                slCount: 0
            },
            {
                date: d4.displayDate,
                isoDate: d4.isoDate,
                weekday: translate ? d4.weekdayEn : d4.weekdayPl,
                lessons: {
                    1: { symbol: 'OB', type: 'ob' },
                    2: { symbol: 'nb', type: 'nb' },
                    3: { symbol: 'OB', type: 'ob' },
                    4: { symbol: 'OB', type: 'ob' },
                    5: { symbol: 'u', type: 'u' }
                },
                uCount: 1,
                nuCount: 1,
                totalCount: 2,
                spCount: 0,
                zwCount: 0,
                slCount: 0
            },
            {
                date: d6.displayDate,
                isoDate: d6.isoDate,
                weekday: translate ? d6.weekdayEn : d6.weekdayPl,
                lessons: {
                    1: { symbol: 'u', type: 'u' },
                    2: { symbol: 'u', type: 'u' },
                    3: { symbol: 'u', type: 'u' },
                    4: { symbol: 'u', type: 'u' },
                    5: { symbol: 'u', type: 'u' },
                    6: { symbol: 'zw', type: 'zw' }
                },
                uCount: 5,
                nuCount: 0,
                totalCount: 5,
                spCount: 0,
                zwCount: 1,
                slCount: 0
            },
            {
                date: d9.displayDate,
                isoDate: d9.isoDate,
                weekday: translate ? d9.weekdayEn : d9.weekdayPl,
                lessons: {
                    1: { symbol: 'u', type: 'u' },
                    2: { symbol: 'OB', type: 'ob' },
                    3: { symbol: 'sp', type: 'sp' },
                    4: { symbol: 'OB', type: 'ob' },
                    5: { symbol: 'sp', type: 'sp' }
                },
                uCount: 1,
                nuCount: 0,
                totalCount: 1,
                spCount: 2,
                zwCount: 0,
                slCount: 0
            },
            {
                date: d12.displayDate,
                isoDate: d12.isoDate,
                weekday: translate ? d12.weekdayEn : d12.weekdayPl,
                lessons: {
                    1: { symbol: 'OB', type: 'ob' },
                    2: { symbol: 'u', type: 'u' },
                    3: { symbol: 'u', type: 'u' },
                    4: { symbol: 'OB', type: 'ob' },
                    5: { symbol: 'OB', type: 'ob' },
                    6: { symbol: 'u', type: 'u' },
                    7: { symbol: 'u', type: 'u' }
                },
                uCount: 4,
                nuCount: 0,
                totalCount: 4,
                spCount: 0,
                zwCount: 0,
                slCount: 0
            }
        ]
    }

    return {
        overallPercentage: 92.4,
        overallStatus: 'safe',
        totalScheduled: 290,
        totalAbsent: 22,
        safeAbsencesRemaining: 123,
        lessonsToRecover: 0,
        subjects,
        unexcusedAbsences,
        legacyTable
    }
}

export function getDemoMessagesBundle(): MessagesActionResult {
    const messages: MessageItem[] = [
        {
            id: 1,
            sender: 'dr Jan Nowak (Wychowawca)',
            subject: 'Organizacja wyjścia do Teatru Narodowego',
            date: '19.11.2026 08:20',
            isRead: false,
            hasAttachments: true,
            folder: 'inbox',
            content: `Drodzy Uczniowie i Rodzice!

W najbliższy piątek o godzinie 17:30 spotykamy się pod pomnikiem Adama Mickiewicza przed Teatrem Narodowym w Warszawie na spektaklu "Kordian".

Bilety zostały opłacone z funduszu klasowego. Zbiórka punktualnie o 17:15. Obowiązuje strój galowy. Po spektaklu (ok. 20:30) powrót do domu we własnym zakresie lub pod opieką rodziców.

W załączniku przesyłam szczegółowy harmonogram wyjścia.

Z poważaniem,
dr Jan Nowak`,
            attachments: [
                {
                    name: 'Harmonogram_wyjscia_teatr.pdf',
                    path: 'demo/harmonogram_teatr.pdf'
                }
            ]
        },
        {
            id: 2,
            sender: 'mgr Anna Wiśniewska (Język angielski)',
            subject: 'Debate motions & preparation guidelines for C1',
            date: '18.11.2026 18:45',
            isRead: false,
            hasAttachments: false,
            folder: 'inbox',
            content: `Hello everyone!

Please find the discussion motions for next Tuesday's Oxford debate:
"This House believes that generative AI and automation will create more fulfilling creative roles than they eliminate."

Guidelines:
1. Prepare at least three distinct arguments supported by verifiable data or case studies.
2. Formulate two potential counter-arguments and rebuttals.
3. Be ready for cross-examination in teams of four.

Best regards,
Anna Wiśniewska`
        },
        {
            id: 3,
            sender: 'inż. Piotr Kowalczyk (Informatyka)',
            subject: 'Kryteria oceny projektu zaliczeniowego i repozytorium GitHub',
            date: '17.11.2026 14:10',
            isRead: false,
            hasAttachments: true,
            folder: 'inbox',
            content: `Dzień dobry,

Przypominam o terminie oddania projektów zespołowych z baz danych i architektury klient-serwer. Repozytoria powinny zawierać plik README, skrypt migracji bazy oraz testy integracyjne.

Prezentacje projektów odbędą się podczas dwóch kolejnych zajęć laboratoryjnych.

Pozdrawiam,
inż. Piotr Kowalczyk`,
            attachments: [
                {
                    name: 'Kryteria_oceny_projektu_4T.pdf',
                    path: 'demo/kryteria_projektu.pdf'
                }
            ]
        },
        {
            id: 4,
            sender: 'dr hab. Tomasz Lewandowski (Fizyka)',
            subject: 'Wyniki I etapu Olimpiady Fizycznej',
            date: '14.11.2026 16:10',
            isRead: true,
            hasAttachments: true,
            folder: 'inbox',
            content: `Gratulacje dla Aleksandra i całej reprezentacji naszej klasy za zakwalifikowanie się do części doświadczalnej zawodów okręgowych Olimpiady Fizycznej!

Spotkanie organizacyjno-laboratoryjne odbędzie się w środę o godzinie 15:30 w sali 201. Proszę o zabranie kalkulatorów naukowych i fartuchów.

Pozdrawiam,
dr hab. Tomasz Lewandowski`,
            attachments: [
                {
                    name: 'Lista_zakwalifikowanych_OF.pdf',
                    path: 'demo/lista_of.pdf'
                }
            ]
        },
        {
            id: 5,
            sender: 'mgr Maria Dąbrowska (Język polski)',
            subject: 'Tematy prac pisemnych z literatury romantycznej',
            date: '11.11.2026 12:30',
            isRead: true,
            hasAttachments: false,
            folder: 'inbox',
            content: `Szanowni Uczniowie,

Proszę o wybranie jednego z tematów konspektów omówionych na lekcji i przesłanie wstępnej bibliografii do czwartku. Prace będą omawiane indywidualnie podczas konsultacji.`
        },
        {
            id: 6,
            sender: 'Sekretariat Szkoły',
            subject: 'Przedłużenie ważności mLegitymacji i legitymacji plastikowych',
            date: '06.11.2026 09:15',
            isRead: true,
            hasAttachments: false,
            folder: 'inbox',
            content: `Przypominamy, że kody QR do aplikacji mObywatel (mLegitymacja) oraz naklejki holograficzne na tradycyjne legitymacje szkolne są wydawane w pokoju nr 12 w godzinach 8:00 - 15:00.

Uczniowie klas IV proszeni są o dopełnienie formalności do końca miesiąca.`
        }
    ]

    const sentMessages: MessageItem[] = [
        {
            id: 10,
            sender: 'Aleksander Kowalski',
            subject: 'Odp: Organizacja wyjścia do Teatru Narodowego',
            date: '19.11.2026 09:05',
            isRead: true,
            hasAttachments: false,
            folder: 'sent',
            content: 'Dziękuję za informację Panie Profesorze. Będę punktualnie na zbiórce o 17:15.'
        },
        {
            id: 11,
            sender: 'Aleksander Kowalski',
            subject: 'Link do repozytorium projektu zespołowego (gr. 2)',
            date: '17.11.2026 15:40',
            isRead: true,
            hasAttachments: false,
            folder: 'sent',
            content: 'Dzień dobry, przesyłam link do naszego repozytorium GitHub oraz dokumentacji API przed jutrzejszym oddaniem projektu.'
        },
        {
            id: 12,
            sender: 'Aleksander Kowalski',
            subject: 'Prośba o konsultacje przed II etapem Olimpiady Fizycznej',
            date: '14.11.2026 17:15',
            isRead: true,
            hasAttachments: false,
            folder: 'sent',
            content: 'Panie Profesorze, dziękuję bardzo za wiadomość! Chciałbym dopytać o zakres doświadczeń z elektromagnetyzmu na zajęciach w środę.'
        }
    ]

    const announcements: AnnouncementItem[] = [
        {
            id: 1,
            author: 'Dyrekcja Szkoły',
            title: 'Harmonogram próbnych egzaminów maturalnych w semestrze zimowym',
            date: '18.11.2026',
            content: 'Informujemy klasy czwarte, że próbne egzaminy maturalne odbędą się zgodnie z harmonogramem opublikowanym w terminarzu szkoły. W dniach egzaminów obowiązuje strój galowy oraz punktualne stawienie się w auli o godz. 08:45.'
        },
        {
            id: 2,
            author: 'Samorząd Uczniowski',
            title: 'Zbiórka charytatywna oraz kiermasz książek w bibliotece',
            date: '14.11.2026',
            content: 'Zapraszamy wszystkich uczniów do udziału w corocznym kiermaszu podręczników i beletrystyki w czytelni szkolnej na parterze podczas długich przerw.'
        },
        {
            id: 3,
            author: 'Dyrekcja Szkoły',
            title: 'Dni wolne od zajęć dydaktyczno-wychowawczych w I semestrze',
            date: '03.11.2026',
            content: 'Informujemy, że zgodnie z Rozporządzeniem MEN oraz uchwałą Rady Pedagogicznej, dniami dodatkowo wolnymi od zajęć dydaktycznych będą: 2 stycznia oraz 4 stycznia. W tych dniach szkoła zapewnia opiekę świetlicową.'
        }
    ]

    const receivers: ReceiverItem[] = [
        { id: 1, name: 'dr Jan Nowak — Matematyka / Wychowawca', group: 'Nauczyciele' },
        { id: 2, name: 'mgr Anna Wiśniewska — Język angielski', group: 'Nauczyciele' },
        { id: 3, name: 'inż. Piotr Kowalczyk — Informatyka', group: 'Nauczyciele' },
        { id: 4, name: 'dr hab. Tomasz Lewandowski — Fizyka', group: 'Nauczyciele' },
        { id: 5, name: 'mgr Maria Dąbrowska — Język polski', group: 'Nauczyciele' },
        { id: 6, name: 'mgr Krzysztof Zieliński — Historia', group: 'Nauczyciele' },
        { id: 7, name: 'mgr Robert Kamiński — Wychowanie fizyczne', group: 'Nauczyciele' },
        { id: 8, name: 'dr Beata Mazur — Chemia', group: 'Nauczyciele' },
        { id: 9, name: 'mgr Ewa Wójcik — Biologia', group: 'Nauczyciele' },
        { id: 10, name: 'mgr Paweł Szymański — Geografia', group: 'Nauczyciele' },
        { id: 11, name: 'Dyrekcja Szkoły', group: 'Dyrekcja' },
        { id: 12, name: 'Sekretariat Uczniowski', group: 'Administracja' }
    ]

    return {
        success: true,
        messages,
        sentMessages,
        announcements,
        receivers,
        serverTimings: {
            totalMs: 12,
            inboxMs: 6,
            previewsMs: 6
        }
    }
}

export function getDemoReceivers(): ReceiverItem[] {
    return getDemoMessagesBundle().receivers
}

export function getDemoMessageContent(messageId: number | string): {
    success: boolean
    content?: string
    attachments?: MessageAttachment[]
    error?: string
} {
    const bundle = getDemoMessagesBundle()
    const all = [...bundle.messages, ...(bundle.sentMessages || [])]
    const found = all.find((m) => String(m.id) === String(messageId))
    if (found?.content) {
        return { success: true, content: found.content, attachments: found.attachments || [] }
    }
    return {
        success: true,
        content: 'Treść wiadomości demonstracyjnej Synapse. Wszystkie funkcje czytnika i załączników działają prawidłowo.',
        attachments: []
    }
}

export function getDemoLiveJustifications(statusFilter: '0' | '1' | '2' | '3' = '0'): LiveJustificationItem[] {
    const all: LiveJustificationItem[] = [
        {
            id: 'demo-just-1',
            periodStr: '04.11.2026 (godz. 1 - 2)',
            dates: ['2026-11-04'],
            lessons: [1, 2],
            count: 2,
            comment: 'Wizyta u lekarza ortodonty',
            teacher: 'dr Jan Nowak',
            sentAt: '2026-11-04 10:15',
            statusRaw: 'Oczekuje',
            statusCode: 'pending'
        },
        {
            id: 'demo-just-2',
            periodStr: '28.10.2026 (cały dzień)',
            dates: ['2026-10-28'],
            lessons: [1, 2, 3, 4, 5, 6, 7],
            count: 7,
            comment: 'Przeziębienie i wysoka gorączka',
            teacher: 'dr Jan Nowak',
            sentAt: '2026-10-29 08:30',
            statusRaw: 'Zaakceptowane',
            statusCode: 'accepted'
        },
        {
            id: 'demo-just-3',
            periodStr: '15.10.2026 (godz. 6 - 7)',
            dates: ['2026-10-15'],
            lessons: [6, 7],
            count: 2,
            comment: 'Udział w zawodach sportowych',
            teacher: 'dr Jan Nowak',
            sentAt: '2026-10-15 16:00',
            statusRaw: 'Zaakceptowane',
            statusCode: 'accepted'
        }
    ]

    if (statusFilter === '0') return all
    if (statusFilter === '1') return all.filter((j) => j.statusCode === 'pending')
    if (statusFilter === '2') return all.filter((j) => j.statusCode === 'accepted')
    if (statusFilter === '3') return all.filter((j) => j.statusCode === 'rejected')
    return all
}
