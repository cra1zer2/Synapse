export interface AppDictionary {
    schedule: string
    grades: string
    attendance: string
    teachers: string
    attendanceRate: string
    dangerBadge: string
    warningBadge: string
    safeBadge: string
    missedOf: (m: number, tot: number) => string
    safeToMiss: string
    neededToRecover: string
    lessons: string
    excuseAction: string
    searchTeacher: string
    allDates: string
    today: string
    myTeacher: string
    saveCreds: string
    updateNow: string
    newChanges: string
    noAbsencesToday: string
    noLessonsDay: string
    vacationDay: string
    subjectDetails: string
    justificationSent: string
    cancel: string
    send: string
    sending: string
    commentPlaceholder: string
    close: string
    gotIt: string
    minimalEffortToFix: string
    currentAverage: (avg: number | null) => string
    recommendedTargets: string
    youAreDone: string
    scoreTooDeep: string
    noGradesRecorded: string
    noAbsencesRecorded: string
    weight: string
    teacherLabel: string
    dateLabel: string
    notSpecified: string
    settingsTitle: string
    refresh: string
    loadingTimetable: string
}

export function getDictionary(translate: boolean): AppDictionary {
    if (translate) {
        return {
            schedule: 'Schedule',
            grades: 'Grades',
            attendance: 'Attendance',
            teachers: 'Teachers',
            attendanceRate: 'Attendance Rate',
            dangerBadge: 'Critical Risk < 50%',
            warningBadge: 'Sub-optimal < 75%',
            safeBadge: 'Safe',
            missedOf: (m, tot) => `${m} missed of ${tot}`,
            safeToMiss: 'Safe to miss',
            neededToRecover: 'Needed to recover',
            lessons: 'lessons',
            excuseAction: 'Excuse Absences',
            searchTeacher: 'Search teacher...',
            allDates: 'All dates',
            today: 'Today',
            myTeacher: 'My Teacher',
            saveCreds: 'Save Credentials',
            updateNow: 'Update Now',
            newChanges: 'New changes detected on Librus',
            noAbsencesToday: 'No teacher absences recorded for this date',
            noLessonsDay: 'No scheduled lessons for this day',
            vacationDay: 'School holiday or break',
            subjectDetails: 'Attendance Details',
            justificationSent: 'Justification submitted successfully',
            cancel: 'Cancel',
            send: 'Submit',
            sending: 'Submitting...',
            commentPlaceholder: 'Optional message to teacher...',
            close: 'Close',
            gotIt: 'Got it',
            minimalEffortToFix: 'Minimal Effort To Fix',
            currentAverage: (avg) => `Current: ${avg ?? 'N/A'}`,
            recommendedTargets: 'Recommended targets to reach 2.0:',
            youAreDone: 'You are done',
            scoreTooDeep: 'Weighted score too deep to reach 2.0',
            noGradesRecorded: 'No grades recorded',
            noAbsencesRecorded: 'No absences recorded',
            weight: 'Weight',
            teacherLabel: 'Teacher',
            dateLabel: 'Date',
            notSpecified: 'Not specified',
            settingsTitle: 'Librus Credentials',
            refresh: 'Refresh',
            loadingTimetable: 'Loading timetable...'
        }
    }

    return {
        schedule: 'Plan',
        grades: 'Oceny',
        attendance: 'Frekwencja',
        teachers: 'Nauczyciele',
        attendanceRate: 'Wskaźnik frekwencji',
        dangerBadge: 'Zagrożenie < 50%',
        warningBadge: 'Nierekomendowana < 75%',
        safeBadge: 'Bezpiecznie',
        missedOf: (m, tot) => `${m} opuszczonych z ${tot}`,
        safeToMiss: 'Bezpieczny zapas',
        neededToRecover: 'Wymagane do 50%',
        lessons: 'lekcji',
        excuseAction: 'Usprawiedliw',
        searchTeacher: 'Szukaj nauczyciela...',
        allDates: 'Wszystkie daty',
        today: 'Dzisiaj',
        myTeacher: 'Mój nauczyciel',
        saveCreds: 'Zapisz dane',
        updateNow: 'Zaktualizuj',
        newChanges: 'Wykryto zmiany w Librusie',
        noAbsencesToday: 'Brak nieobecności nauczycieli w tym dniu',
        noLessonsDay: 'Brak zaplanowanych lekcji w tym dniu',
        vacationDay: 'Dzień wolny od zajęć dydaktycznych',
        subjectDetails: 'Szczegóły frekwencji',
        justificationSent: 'Usprawiedliwienie wysłane pomyślnie',
        cancel: 'Anuluj',
        send: 'Wyślij',
        sending: 'Wysyłanie...',
        commentPlaceholder: 'Komentarz do wychowawcy (opcjonalnie)...',
        close: 'Zamknij',
        gotIt: 'Rozumiem',
        minimalEffortToFix: 'Minimal Effort To Fix',
        currentAverage: (avg) => `Aktualna: ${avg ?? 'Brak'}`,
        recommendedTargets: 'Rekomendowane cele aby osiągnąć 2.0:',
        youAreDone: 'You are done',
        scoreTooDeep: 'Średnia ważona zbyt niska aby osiągnąć 2.0',
        noGradesRecorded: 'Brak wpisanych ocen',
        noAbsencesRecorded: 'Brak zarejestrowanych nieobecności',
        weight: 'Waga',
        teacherLabel: 'Nauczyciel',
        dateLabel: 'Data',
        notSpecified: 'Nie podano',
        settingsTitle: 'Dane logowania Librus',
        refresh: 'Odśwież',
        loadingTimetable: 'Ładowanie planu lekcji...'
    }
}