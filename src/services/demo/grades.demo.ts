import { GradesResult, GradeItem, SubjectGrades } from '@/models/grade.model'

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
        subjects[1].semester1[0],
        subjects[0].semester1[0],
        subjects[2].semester1[0],
        subjects[3].semester1[0]
    ]

    return {
        subjects,
        overallAverage: 4.97,
        recentGrades
    }
}
