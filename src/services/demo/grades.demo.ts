/**
 * Service: Demo Grades Provider
 * Supplies bilingual sample grades and GPA summaries for built-in demo student and parent sessions.
 * Re-exported by demo-data.service.ts.
 */

import { GradesResult, GradeItem, SubjectGrades } from '@/models/grade.model'

function toIsoAddDate(dotDate: string): string {
  const m = dotDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]} 12:00:00` : dotDate
}

function calcWeightedAvg(items: GradeItem[]): number | null {
  let num = 0
  let den = 0
  for (const g of items) {
    if (g.numericValue !== null && g.weight > 0) {
      num += g.numericValue * g.weight
      den += g.weight
    }
  }
  return den > 0 ? Math.round((num / den) * 100) / 100 : null
}

export function getDemoGrades(translate: boolean = false): GradesResult {
  const s = (pl: string, en: string) => (translate ? en : pl)

  const rawSubjects: Array<{ subject: string; semester1: Omit<GradeItem, 'subject'>[] }> = [
    {
      subject: s('Informatyka', 'Computer Science'),
      semester1: [
        { id: 'g1', grade: '6', numericValue: 6, weight: 3, category: s('Projekt', 'Project'), date: '17.11.2026', teacher: 'inż. Piotr Kowalczyk', description: s('Implementacja drzew AVL i B-drzew', 'AVL and B-Tree implementation'), isRecent: true },
        { id: 'g2', grade: '6', numericValue: 6, weight: 3, category: s('Sprawdzian', 'Exam'), date: '04.11.2026', teacher: 'inż. Piotr Kowalczyk', description: s('Programowanie obiektowe w C++', 'Object-oriented programming in C++'), isRecent: false },
        { id: 'g3', grade: '5', numericValue: 5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '19.10.2026', teacher: 'inż. Piotr Kowalczyk', description: s('Złożoność obliczeniowa O(n)', 'Algorithmic complexity O(n)'), isRecent: false },
        { id: 'g3b', grade: '5+', numericValue: 5.5, weight: 1, category: s('Aktywność', 'Activity'), date: '07.10.2026', teacher: 'inż. Piotr Kowalczyk', description: s('Zadania algorytmiczne przy tablicy', 'Algorithm tasks on the board'), isRecent: false }
      ]
    },
    {
      subject: s('Matematyka', 'Mathematics'),
      semester1: [
        { id: 'g4', grade: '6', numericValue: 6, weight: 3, category: s('Olimpiada', 'Olympiad'), date: '18.11.2026', teacher: 'dr Jan Nowak', description: s('I etap Olimpiady Matematycznej', '1st round of Math Olympiad'), isRecent: true },
        { id: 'g5', grade: '5+', numericValue: 5.5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '06.11.2026', teacher: 'dr Jan Nowak', description: s('Geometria analityczna na płaszczyźnie', 'Analytical geometry on plane'), isRecent: false },
        { id: 'g6', grade: '5', numericValue: 5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '22.10.2026', teacher: 'dr Jan Nowak', description: s('Wielomiany i pierwiastki całkowite', 'Polynomials and integer roots'), isRecent: false },
        { id: 'g7', grade: '4+', numericValue: 4.5, weight: 1, category: s('Odpowiedź', 'Oral test'), date: '11.10.2026', teacher: 'dr Jan Nowak', description: s('Wzory Viète’a i równania kwadratowe', 'Vieta’s formulas and quadratic equations'), isRecent: false },
        { id: 'g7b', grade: '4', numericValue: 4, weight: 2, category: s('Kartkówka', 'Quiz'), date: '29.09.2026', teacher: 'dr Jan Nowak', description: s('Ciągi arytmetyczne i geometryczne', 'Arithmetic and geometric sequences'), isRecent: false }
      ]
    },
    {
      subject: s('Język angielski', 'English'),
      semester1: [
        { id: 'g8', grade: '5+', numericValue: 5.5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '16.11.2026', teacher: 'mgr Anna Wiśniewska', description: s('Reading & Writing C1 Cambridge', 'Reading & Writing C1 Cambridge'), isRecent: true },
        { id: 'g9', grade: '5', numericValue: 5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '30.10.2026', teacher: 'mgr Anna Wiśniewska', description: s('Collocations & Idioms in Context', 'Collocations & Idioms in Context'), isRecent: false },
        { id: 'g10', grade: '5', numericValue: 5, weight: 1, category: s('Aktywność', 'Activity'), date: '15.10.2026', teacher: 'mgr Anna Wiśniewska', description: s('Debata oksfordzka', 'Oxford debate'), isRecent: false },
        { id: 'g10b', grade: '4+', numericValue: 4.5, weight: 2, category: s('Wypracowanie', 'Essay'), date: '02.10.2026', teacher: 'mgr Anna Wiśniewska', description: s('Essay: Technology in Education', 'Essay: Technology in Education'), isRecent: false }
      ]
    },
    {
      subject: s('Fizyka', 'Physics'),
      semester1: [
        { id: 'g11', grade: '5', numericValue: 5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '14.11.2026', teacher: 'dr hab. Tomasz Lewandowski', description: s('Dynamika bryły sztywnej', 'Rigid body dynamics'), isRecent: true },
        { id: 'g12', grade: '4+', numericValue: 4.5, weight: 2, category: s('Laboratorium', 'Lab'), date: '29.10.2026', teacher: 'dr hab. Tomasz Lewandowski', description: s('Wahadło fizyczne i moment bezwładności', 'Physical pendulum and moment of inertia'), isRecent: false },
        { id: 'g13', grade: '4', numericValue: 4, weight: 1, category: s('Kartkówka', 'Quiz'), date: '14.10.2026', teacher: 'dr hab. Tomasz Lewandowski', description: s('Prawa Keplera i grawitacja', 'Kepler’s laws and gravitation'), isRecent: false },
        { id: 'g13b', grade: '3+', numericValue: 3.5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '30.09.2026', teacher: 'dr hab. Tomasz Lewandowski', description: s('Ruch harmoniczny i fale', 'Harmonic motion and waves'), isRecent: false }
      ]
    },
    {
      subject: s('Historia', 'History'),
      semester1: [
        { id: 'g14', grade: '5', numericValue: 5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '13.11.2026', teacher: 'mgr Krzysztof Zieliński', description: s('I Wojna Światowa i sprawa polska', 'WWI and the Polish question'), isRecent: true },
        { id: 'g15', grade: '5', numericValue: 5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '27.10.2026', teacher: 'mgr Krzysztof Zieliński', description: s('Wojna polsko-bolszewicka 1920', 'Polish-Soviet War 1920'), isRecent: false },
        { id: 'g16', grade: '4', numericValue: 4, weight: 1, category: s('Odpowiedź', 'Oral test'), date: '09.10.2026', teacher: 'mgr Krzysztof Zieliński', description: s('Konferencja pokojowa w Paryżu', 'Paris Peace Conference'), isRecent: false }
      ]
    },
    {
      subject: s('Język polski', 'Polish'),
      semester1: [
        { id: 'g17', grade: '4+', numericValue: 4.5, weight: 3, category: s('Wypracowanie', 'Essay'), date: '12.11.2026', teacher: 'mgr Maria Dąbrowska', description: s('Portret bohatera romantycznego', 'Portrait of a romantic hero'), isRecent: true },
        { id: 'g18', grade: '4+', numericValue: 4.5, weight: 2, category: s('Sprawdzian', 'Exam'), date: '25.10.2026', teacher: 'mgr Maria Dąbrowska', description: s('Mickiewicz — Dziady cz. III', 'Mickiewicz — Forefathers’ Eve Part III'), isRecent: false },
        { id: 'g19', grade: '4', numericValue: 4, weight: 1, category: s('Kartkówka', 'Quiz'), date: '08.10.2026', teacher: 'mgr Maria Dąbrowska', description: s('Znajomość lektury Kordian', 'Knowledge of Kordian'), isRecent: false },
        { id: 'g19b', grade: '5', numericValue: 5, weight: 1, category: s('Recytacja', 'Recitation'), date: '28.09.2026', teacher: 'mgr Maria Dąbrowska', description: s('Interpretacja Wielkiej Improwizacji', 'Interpretation of the Great Improvisation'), isRecent: false }
      ]
    },
    {
      subject: s('Geografia', 'Geography'),
      semester1: [
        { id: 'g20', grade: '5', numericValue: 5, weight: 2, category: s('Sprawdzian', 'Exam'), date: '05.11.2026', teacher: 'mgr Paweł Szymański', description: s('Demografia i migracje ludności', 'Demographics and human migration'), isRecent: false },
        { id: 'g21', grade: '5', numericValue: 5, weight: 1, category: s('Kartkówka', 'Quiz'), date: '20.10.2026', teacher: 'mgr Paweł Szymański', description: s('Wskaźnik HDI na świecie', 'Global HDI indicators'), isRecent: false },
        { id: 'g21b', grade: '4', numericValue: 4, weight: 1, category: s('Mapa', 'Map quiz'), date: '03.10.2026', teacher: 'mgr Paweł Szymański', description: s('Metropolie i aglomeracje Europy', 'European metropolises and agglomerations'), isRecent: false }
      ]
    },
    {
      subject: s('Chemia', 'Chemistry'),
      semester1: [
        { id: 'g22', grade: '5', numericValue: 5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '03.11.2026', teacher: 'dr Beata Mazur', description: s('Kinetyka i równowaga chemiczna', 'Chemical kinetics and equilibrium'), isRecent: false },
        { id: 'g23', grade: '4', numericValue: 4, weight: 2, category: s('Kartkówka', 'Quiz'), date: '18.10.2026', teacher: 'dr Beata Mazur', description: s('Reguła przekory Le Chateliera', 'Le Chatelier’s principle'), isRecent: false },
        { id: 'g23b', grade: '4+', numericValue: 4.5, weight: 1, category: s('Laboratorium', 'Lab'), date: '01.10.2026', teacher: 'dr Beata Mazur', description: s('Miareczkowanie alkacymetryczne', 'Acid-base titration lab'), isRecent: false }
      ]
    },
    {
      subject: s('Biologia', 'Biology'),
      semester1: [
        { id: 'g24', grade: '5', numericValue: 5, weight: 3, category: s('Sprawdzian', 'Exam'), date: '02.11.2026', teacher: 'mgr Ewa Wójcik', description: s('Genetyka klasyczna i prawa Mendla', 'Classical genetics and Mendelian laws'), isRecent: false },
        { id: 'g25', grade: '4+', numericValue: 4.5, weight: 2, category: s('Kartkówka', 'Quiz'), date: '16.10.2026', teacher: 'mgr Ewa Wójcik', description: s('Dziedziczenie cech sprzężonych z płcią', 'Sex-linked inheritance'), isRecent: false },
        { id: 'g25b', grade: '5', numericValue: 5, weight: 1, category: s('Aktywność', 'Activity'), date: '04.10.2026', teacher: 'mgr Ewa Wójcik', description: s('Krzyżówki genetyczne i rodowody', 'Genetic crosses and pedigrees'), isRecent: false }
      ]
    },
    {
      subject: s('Wychowanie fizyczne', 'Physical Education'),
      semester1: [
        { id: 'g26', grade: '6', numericValue: 6, weight: 2, category: s('Sprawność', 'Fitness'), date: '28.10.2026', teacher: 'mgr Robert Kamiński', description: s('Bieg na 1000m — czas 3:05', '1000m run — 3:05'), isRecent: false },
        { id: 'g27', grade: '6', numericValue: 6, weight: 1, category: s('Aktywność', 'Activity'), date: '10.10.2026', teacher: 'mgr Robert Kamiński', description: s('Wzorowa postawa na lekcjach', 'Exemplary attitude and sportsmanship'), isRecent: false },
        { id: 'g28', grade: '5+', numericValue: 5.5, weight: 2, category: s('Gry zespołowe', 'Team sports'), date: '01.10.2026', teacher: 'mgr Robert Kamiński', description: s('Turniej koszykówki międzyklasowej', 'Inter-class basketball tournament'), isRecent: false }
      ]
    }
  ]

  const subjects: SubjectGrades[] = rawSubjects.map((raw) => {
    const sem1: GradeItem[] = raw.semester1.map((g) => ({
      ...g,
      subject: raw.subject,
      addDate: toIsoAddDate(g.date)
    }))
    const avg = calcWeightedAvg(sem1)
    return {
      subject: raw.subject,
      semester1: sem1,
      semester2: [],
      average1: avg,
      average2: null,
      finalAverage: avg
    }
  })

  const validAvgs = subjects.map((sub) => sub.finalAverage).filter((v): v is number => v !== null)
  const overallAverage =
    validAvgs.length > 0
      ? Math.round((validAvgs.reduce((acc, v) => acc + v, 0) / validAvgs.length) * 100) / 100
      : null

  const recentGrades: GradeItem[] = [
    subjects[1].semester1[0],
    subjects[0].semester1[0],
    subjects[2].semester1[0],
    subjects[3].semester1[0],
    subjects[4].semester1[0],
    subjects[5].semester1[0]
  ]

  return {
    subjects,
    overallAverage,
    recentGrades
  }
}
