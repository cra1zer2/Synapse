import { StudentProfile } from '@/models/account.model'
import { SmartTimetableResult, DaySchedule, LessonItem, TimetableEvent } from '@/models/timetable.model'
import { GradesResult, SubjectGrades, GradeItem } from '@/models/grade.model'
import { AttendanceResult, SubjectAttendance, AbsenceDetail, LegacyAttendanceTable } from '@/models/attendance.model'
import { MessagesActionResult, MessageItem, AnnouncementItem, ReceiverItem, UnreadCounters, MessageAttachment } from '@/models/message.model'
import { LiveJustificationItem } from '@/models/justification.model'
import { getSchoolWeekMondayIso, getTodayIsoString } from '@/utils/date.util'

export function isDemoAccount(username?: string): boolean {
    if (!username) return false
    const u = username.trim().toLowerCase()
    return (
        u === 'demo' ||
        u === 'demou' ||
        u === 'demor' ||
        u === 'demoparent' ||
        u === 'test' ||
        u === 'testu' ||
        u.startsWith('demo_') ||
        u.startsWith('test_')
    )
}

export function isDemoParent(username?: string): boolean {
    if (!username) return false
    const u = username.trim().toLowerCase()
    return u === 'demor' || u === 'demoparent'
}

export function getDemoStudentProfile(username: string): StudentProfile {
    const isParent = isDemoParent(username)
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
            topic: s('Dziady cz. III Adama Mickiewicza jako dramat narodowy', 'Forefathers Eve Part III as a national drama')
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
            subject: s('Godzina wychowawcza', 'Homeroom Class'),
            teacher: 'dr Jan Nowak',
            room: '204',
            time: '11:45 - 12:30',
            durationMinutes: 45,
            isShortened: false,
            isCancelled: false,
            isSubstitution: false,
            flag: null,
            teacherAbsent: false,
            topic: s('Organizacja próbnego egzaminu maturalnego i sprawy bieżące', 'Organization of mock exams and class matters')
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
            topic: s('Poetyka baroku w twórczości Mikołaja Sępa Szarzyńskiego', 'Baroque poetry of Mikolaj Sep Szarzynski')
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
        }
    ]

    const eventsMon: TimetableEvent[] = [
        {
            id: 'ev-1',
            title: s('Praca domowa: Zadania z pochodnych', 'Homework: Derivative exercises'),
            date: dayDates[0].displayDate,
            isoDate: dayDates[0].isoDate,
            isAbsence: false,
            category: 'homework',
            subjectName: s('Matematyka', 'Mathematics'),
            description: s('Zadania 1-6 ze zbioru Kłaczkowa, str. 142', 'Exercises 1-6 from textbook, page 142'),
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
            description: s('Dział 3 podręcznika: prawo Coulomba, natężenie pola, potencjał', 'Chapter 3: Coulombs law, electric field, potential'),
            teacher: 'dr hab. Tomasz Lewandowski'
        }
    ]

    const eventsThu: TimetableEvent[] = [
        {
            id: 'ev-4',
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

    const calendarEvents: TimetableEvent[] = [
        ...eventsMon,
        ...eventsTue,
        ...eventsWed,
        ...eventsThu,
        ...eventsFri,
        {
            id: 'ev-cal-1',
            title: s('Sprawdzian: Rachunek różniczkowy', 'Exam: Differential Calculus'),
            date: dayDates[2].displayDate,
            isoDate: dayDates[2].isoDate,
            isAbsence: false,
            category: 'exam',
            subjectName: s('Matematyka', 'Mathematics'),
            description: s('Granice, pochodne, ekstrema lokalne, optymalizacja.', 'Limits, derivatives, local extrema, optimization.'),
            teacher: 'dr Jan Nowak'
        },
        {
            id: 'ev-cal-2',
            title: s('Oddanie projektu zespołowego', 'Team Project Submission'),
            date: dayDates[4].displayDate,
            isoDate: dayDates[4].isoDate,
            isAbsence: false,
            category: 'homework',
            subjectName: s('Informatyka', 'Computer Science'),
            description: s('Repozytorium GitHub i dokumentacja techniczna.', 'GitHub repository and technical documentation.'),
            teacher: 'inż. Piotr Kowalczyk'
        }
    ]

    return {
        weekStart: mondayIso,
        weekEnd: fridayIso,
        schedule,
        allAbsentTeachers: [
            {
                teacher: 'dr Jan Nowak',
                date: dayDates[4].displayDate,
                isoDate: dayDates[4].isoDate,
                reason: s('Udział w konferencji naukowej', 'Attending academic conference'),
                isRelevantToStudent: true
            }
        ],
        calendarEvents
    }
}

export function getDemoGrades(translate: boolean = false): GradesResult {
    const s = (pl: string, en: string) => (translate ? en : pl)

    const subjects: SubjectGrades[] = [
        {
            subject: s('Informatyka', 'Computer Science'),
            semester1: [
                { id: 'g1', grade: '6', numericValue: 6, weight: 3, category: s('Projekt', 'Project'), date: '05.11.2026', teacher: 'inż. Piotr Kowalczyk', description: s('Implementacja drzew AVL i B-drzew', 'AVL and B-Tree implementation'), isRecent: true },
                { id: 'g2', grade: '6', numericValue: 6, weight: 3, category: s('Sprawdzian', 'Exam'), date: '18.10.2026', teacher: 'inż. Piotr Kowalczyk', description: s('Programowanie obiektowe w C++', 'Object-oriented programming in C++'), isRecent: false },
                { id: 'g3', grade: '5', numericValue: 5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '09.10.2026', teacher: 'inż. Piotr Kowalczyk', description: s('Złożoność obliczeniowa O(n)', 'Algorithmic complexity O(n)'), isRecent: false }
            ],
            semester2: [],
            average1: 5.75,
            average2: null,
            finalAverage: 5.75
        },
        {
            subject: s('Matematyka', 'Mathematics'),
            semester1: [
                { id: 'g4', grade: '6', numericValue: 6, weight: 3, category: s('Olimpiada', 'Olympiad'), date: '08.11.2026', teacher: 'dr Jan Nowak', description: s('I etap Olimpiady Matematycznej', '1st round of Math Olympiad'), isRecent: true },
                { id: 'g5', grade: '5+', numericValue: 5.5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '24.10.2026', teacher: 'dr Jan Nowak', description: s('Geometria analityczna na płaszczyźnie', 'Analytical geometry on plane'), isRecent: false },
                { id: 'g6', grade: '5', numericValue: 5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '15.10.2026', teacher: 'dr Jan Nowak', description: s('Wielomiany i pierwiastki całkowite', 'Polynomials and integer roots'), isRecent: false },
                { id: 'g7', grade: '4+', numericValue: 4.5, weight: 1, category: s('Odpowiedź', 'Oral test'), date: '02.10.2026', teacher: 'dr Jan Nowak', description: s('Wzory Vietea i równania kwadratowe', 'Vietas formulas and quadratic equations'), isRecent: false }
            ],
            semester2: [],
            average1: 5.39,
            average2: null,
            finalAverage: 5.39
        },
        {
            subject: s('Język angielski', 'English'),
            semester1: [
                { id: 'g8', grade: '5', numericValue: 5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '30.10.2026', teacher: 'mgr Anna Wiśniewska', description: s('Reading & Writing C1 Cambridge', 'Reading & Writing C1 Cambridge'), isRecent: false },
                { id: 'g9', grade: '5', numericValue: 5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '12.10.2026', teacher: 'mgr Anna Wiśniewska', description: s('Collocations & Idioms in Context', 'Collocations & Idioms in Context'), isRecent: false },
                { id: 'g10', grade: '5', numericValue: 5, weight: 1, category: s('Aktywność', 'Activity'), date: '04.10.2026', teacher: 'mgr Anna Wiśniewska', description: s('Debata oksfordzka', 'Oxford debate'), isRecent: false }
            ],
            semester2: [],
            average1: 5.00,
            average2: null,
            finalAverage: 5.00
        },
        {
            subject: s('Fizyka', 'Physics'),
            semester1: [
                { id: 'g11', grade: '5', numericValue: 5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '28.10.2026', teacher: 'dr hab. Tomasz Lewandowski', description: s('Dynamika bryły sztywnej', 'Rigid body dynamics'), isRecent: false },
                { id: 'g12', grade: '4+', numericValue: 4.5, weight: 2, category: s('Laboratorium', 'Lab'), date: '14.10.2026', teacher: 'dr hab. Tomasz Lewandowski', description: s('Wahadło fizyczne i moment bezwładności', 'Physical pendulum and moment of inertia'), isRecent: false },
                { id: 'g13', grade: '4', numericValue: 4, weight: 1, category: s('Kartkówka', 'Quiz'), date: '01.10.2026', teacher: 'dr hab. Tomasz Lewandowski', description: s('Prawa Keplera i grawitacja', 'Keplers laws and gravitation'), isRecent: false }
            ],
            semester2: [],
            average1: 4.67,
            average2: null,
            finalAverage: 4.67
        },
        {
            subject: s('Historia', 'History'),
            semester1: [
                { id: 'g14', grade: '5', numericValue: 5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '26.10.2026', teacher: 'mgr Krzysztof Zieliński', description: s('I Wojna Światowa i sprawa polska', 'WWI and Polish question'), isRecent: false },
                { id: 'g15', grade: '5', numericValue: 5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '11.10.2026', teacher: 'mgr Krzysztof Zieliński', description: s('Wojna polsko-bolszewicka 1920', 'Polish-Soviet War 1920'), isRecent: false },
                { id: 'g16', grade: '4', numericValue: 4, weight: 1, category: s('Odpowiedź', 'Oral test'), date: '05.10.2026', teacher: 'mgr Krzysztof Zieliński', description: s('Konferencja pokojowa w Paryżu', 'Paris Peace Conference'), isRecent: false }
            ],
            semester2: [],
            average1: 4.83,
            average2: null,
            finalAverage: 4.83
        },
        {
            subject: s('Język polski', 'Polish'),
            semester1: [
                { id: 'g17', grade: '5', numericValue: 5, weight: 3, category: s('Wypracowanie', 'Essay'), date: '22.10.2026', teacher: 'mgr Maria Dąbrowska', description: s('Portret bohatera romantycznego', 'Portrait of a romantic hero'), isRecent: false },
                { id: 'g18', grade: '4+', numericValue: 4.5, weight: 2, category: s('Sprawdzian', 'Exam'), date: '10.10.2026', teacher: 'mgr Maria Dąbrowska', description: s('Mickiewicz — Dziady cz. III', 'Mickiewicz — Forefathers Eve Part III'), isRecent: false },
                { id: 'g19', grade: '4', numericValue: 4, weight: 1, category: s('Kartkówka', 'Quiz'), date: '03.10.2026', teacher: 'mgr Maria Dąbrowska', description: s('Znajomość lektury Kordian', 'Knowledge of Kordian'), isRecent: false }
            ],
            semester2: [],
            average1: 4.67,
            average2: null,
            finalAverage: 4.67
        },
        {
            subject: s('Geografia', 'Geography'),
            semester1: [
                { id: 'g20', grade: '5', numericValue: 5, weight: 2, category: s('Sprawdzian', 'Exam'), date: '19.10.2026', teacher: 'mgr Paweł Szymański', description: s('Demografia i migracje ludności', 'Demographics and human migration'), isRecent: false },
                { id: 'g21', grade: '5', numericValue: 5, weight: 1, category: s('Kartkówka', 'Quiz'), date: '07.10.2026', teacher: 'mgr Paweł Szymański', description: s('Wskaźnik HDI na świecie', 'Global HDI indicators'), isRecent: false }
            ],
            semester2: [],
            average1: 5.00,
            average2: null,
            finalAverage: 5.00
        },
        {
            subject: s('Chemia', 'Chemistry'),
            semester1: [
                { id: 'g22', grade: '5', numericValue: 5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '20.10.2026', teacher: 'dr Beata Mazur', description: s('Kinetyka i równowaga chemiczna', 'Chemical kinetics and equilibrium'), isRecent: false },
                { id: 'g23', grade: '4', numericValue: 4, weight: 2, category: s('Kartkówka', 'Quiz'), date: '08.10.2026', teacher: 'dr Beata Mazur', description: s('Reguła przekory Le Chateliera', 'Le Chateliers principle'), isRecent: false }
            ],
            semester2: [],
            average1: 4.60,
            average2: null,
            finalAverage: 4.60
        },
        {
            subject: s('Biologia', 'Biology'),
            semester1: [
                { id: 'g24', grade: '5', numericValue: 5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '25.10.2026', teacher: 'mgr Ewa Wójcik', description: s('Genetyka klasyczna i prawa Mendla', 'Classical genetics and Mendelian laws'), isRecent: false },
                { id: 'g25', grade: '4+', numericValue: 4.5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '13.10.2026', teacher: 'mgr Ewa Wójcik', description: s('Dziedziczenie cech sprzężonych z płcią', 'Sex-linked inheritance'), isRecent: false }
            ],
            semester2: [],
            average1: 4.80,
            average2: null,
            finalAverage: 4.80
        },
        {
            subject: s('Wychowanie fizyczne', 'Physical Education'),
            semester1: [
                { id: 'g26', grade: '6', numericValue: 6, weight: 2, category: s('Sprawność', 'Fitness'), date: '21.10.2026', teacher: 'mgr Robert Kamiński', description: s('Bieg na 1000m — czas 3:05', '1000m run — 3:05'), isRecent: false },
                { id: 'g27', grade: '6', numericValue: 6, weight: 1, category: s('Aktywność', 'Activity'), date: '06.10.2026', teacher: 'mgr Robert Kamiński', description: s('Wzorowa postawa na lekcjach', 'Exemplary attitude and sportsmanship'), isRecent: false }
            ],
            semester2: [],
            average1: 6.00,
            average2: null,
            finalAverage: 6.00
        }
    ]

    const recentGrades: GradeItem[] = [
        subjects[1].semester1[0], // Matematyka 6
        subjects[0].semester1[0], // Informatyka 6
        subjects[2].semester1[0], // Język angielski 5
        subjects[3].semester1[0]  // Fizyka 5
    ]

    return {
        subjects,
        overallAverage: 4.97,
        recentGrades
    }
}

export function getDemoAttendance(translate: boolean = false): AttendanceResult {
    const s = (pl: string, en: string) => (translate ? en : pl)

    const unexcusedAbsences: AbsenceDetail[] = [
        {
            id: 101,
            date: '04.11.2026',
            lessonNumber: 1,
            time: '08:00 - 08:45',
            subject: s('Język polski', 'Polish'),
            teacher: 'mgr Maria Dąbrowska',
            type: 'nb',
            typeName: s('Nieobecność nieusprawiedliwiona', 'Unexcused absence'),
            isUnexcused: true
        },
        {
            id: 102,
            date: '04.11.2026',
            lessonNumber: 2,
            time: '08:55 - 09:40',
            subject: s('Matematyka', 'Mathematics'),
            teacher: 'dr Jan Nowak',
            type: 'nb',
            typeName: s('Nieobecność nieusprawiedliwiona', 'Unexcused absence'),
            isUnexcused: true
        }
    ]

    const subjects: SubjectAttendance[] = [
        {
            subject: s('Matematyka', 'Mathematics'),
            totalLessons: 42,
            absentLessons: 2,
            excusedCount: 1,
            unexcusedCount: 1,
            percentage: 95.2,
            status: 'safe',
            absences: [unexcusedAbsences[1]]
        },
        {
            subject: s('Język polski', 'Polish'),
            totalLessons: 36,
            absentLessons: 2,
            excusedCount: 1,
            unexcusedCount: 1,
            percentage: 94.4,
            status: 'safe',
            absences: [unexcusedAbsences[0]]
        },
        {
            subject: s('Informatyka', 'Computer Science'),
            totalLessons: 38,
            absentLessons: 0,
            excusedCount: 0,
            unexcusedCount: 0,
            percentage: 100.0,
            status: 'safe',
            absences: []
        },
        {
            subject: s('Język angielski', 'English'),
            totalLessons: 34,
            absentLessons: 1,
            excusedCount: 1,
            unexcusedCount: 0,
            percentage: 97.1,
            status: 'safe',
            absences: []
        },
        {
            subject: s('Fizyka', 'Physics'),
            totalLessons: 28,
            absentLessons: 1,
            excusedCount: 1,
            unexcusedCount: 0,
            percentage: 96.4,
            status: 'safe',
            absences: []
        },
        {
            subject: s('Historia', 'History'),
            totalLessons: 22,
            absentLessons: 0,
            excusedCount: 0,
            unexcusedCount: 0,
            percentage: 100.0,
            status: 'safe',
            absences: []
        },
        {
            subject: s('Wychowanie fizyczne', 'Physical Education'),
            totalLessons: 30,
            absentLessons: 2,
            excusedCount: 2,
            unexcusedCount: 0,
            percentage: 93.3,
            status: 'safe',
            absences: []
        }
    ]

    const legacyTable: LegacyAttendanceTable = {
        summary: {
            u: 6,
            nu: 2,
            total: 8,
            sp: 1,
            zw: 0,
            sl: 0
        },
        days: [
            {
                date: '04.11',
                isoDate: '2026-11-04',
                weekday: s('Środa', 'Wednesday'),
                lessons: {
                    1: { symbol: 'nb', type: 'nb' },
                    2: { symbol: 'nb', type: 'nb' },
                    3: { symbol: '•', type: 'other' },
                    4: { symbol: '•', type: 'other' }
                },
                uCount: 0,
                nuCount: 2,
                totalCount: 2,
                spCount: 0,
                zwCount: 0,
                slCount: 0
            },
            {
                date: '28.10',
                isoDate: '2026-10-28',
                weekday: s('Środa', 'Wednesday'),
                lessons: {
                    1: { symbol: 'u', type: 'u' },
                    2: { symbol: 'u', type: 'u' },
                    3: { symbol: 'u', type: 'u' },
                    4: { symbol: 'u', type: 'u' },
                    5: { symbol: 'u', type: 'u' },
                    6: { symbol: 'u', type: 'u' }
                },
                uCount: 6,
                nuCount: 0,
                totalCount: 6,
                spCount: 0,
                zwCount: 0,
                slCount: 0
            }
        ]
    }

    return {
        overallPercentage: 96.8,
        overallStatus: 'safe',
        totalScheduled: 250,
        totalAbsent: 8,
        safeAbsencesRemaining: 117,
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
            date: '11.11.2026 14:20',
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
            date: '10.11.2026 18:45',
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
            sender: 'dr hab. Tomasz Lewandowski (Fizyka)',
            subject: 'Wyniki I etapu Olimpiady Fizycznej',
            date: '06.11.2026 16:10',
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
            id: 4,
            sender: 'Sekretariat Szkoły',
            subject: 'Przedłużenie ważności mLegitymacji i legitymacji plastikowych',
            date: '02.11.2026 09:15',
            isRead: true,
            hasAttachments: false,
            folder: 'inbox',
            content: `Przypominamy, że kody QR do aplikacji mObywatel (mLegitymacja) oraz naklejki holograficzne na tradycyjne legitymacje szkolne są wydawane w pokoju nr 12 w godzinach 8:00 - 15:00.

Uczniowie klas IV proszeni są o dopełnienie formalności do 20 listopada.`
        }
    ]

    const sentMessages: MessageItem[] = [
        {
            id: 10,
            sender: 'Aleksander Kowalski',
            subject: 'Odp: Organizacja wyjścia do Teatru Narodowego',
            date: '11.11.2026 15:00',
            isRead: true,
            hasAttachments: false,
            folder: 'sent',
            content: 'Dziękuję za informację Panie Profesorze. Będę punktualnie na zbiórce o 17:15.'
        }
    ]

    const announcements: AnnouncementItem[] = [
        {
            id: 1,
            author: 'Dyrekcja Szkoły',
            title: 'Dni wolne od zajęć dydaktyczno-wychowawczych w I semestrze',
            date: '03.11.2026',
            content: 'Informujemy, że zgodnie z Rozporządzeniem MEN oraz uchwałą Rady Pedagogicznej, dniami dodatkowo wolnymi od zajęć dydaktycznych będą: 10 listopada oraz 2 stycznia. W tych dniach szkoła zapewnia opiekę świetlicową na pisemny wniosek rodziców złożony w sekretariacie najpóźniej na 3 dni przed dniem wolnym.'
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

export function getDemoUnreadCounters(): UnreadCounters {
    return {
        unreadMessages: 2,
        announcementsCount: 1
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
