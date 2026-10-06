export type AppLanguage = 'pl' | 'en'
export type AppTheme = 'system' | 'light' | 'dark'

export interface AppDictionary {
    schedule: string
    grades: string
    attendance: string
    messages: string
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
    syncedStatus: string
    updatingStatus: string
    profileTitle: string
    luckyNumber: string
    appLanguage: string
    teacherAbsencesTool: string
    accountSwitcher: string
    studentRole: string
    parentRole: string
    logout: string
    done: string
    messagesInbox: string
    messagesAnnouncements: string
    noMessages: string
    composeMessage: string
    recipientPlaceholder: string
    subjectPlaceholder: string
    messagePlaceholder: string
    searchRecipient: string
    welcomeTitle: string
    loginSubtitle: string
    loginPlaceholder: string
    passwordPlaceholder: string
    verifyButton: string
    verifyingAccount: string
    accountVerified: string
    confirmAndEnter: string
    loginError: string
    changeData: string
    breakLabel: string
    breakCountdownLabel: (m: number) => string
    breakUpcomingLabel: (m: number) => string
    replyAction: string
    searchMessagesPlaceholder: string
    writeNewMessage: string
    newMessageTitle: string
    backToMessages: string
}

export function getDictionary(lang: AppLanguage): AppDictionary {
    if (lang === 'en') {
        return {
            schedule: 'Plan',
            grades: 'Grades',
            attendance: 'Attendance',
            messages: 'Messages',
            teachers: 'Teachers',
            attendanceRate: 'Attendance Rate',
            dangerBadge: 'Critical Risk < 50%',
            warningBadge: 'Sub-optimal < 75%',
            safeBadge: 'Safe',
            missedOf: (m, tot) => `${m} missed of ${tot}`,
            safeToMiss: 'Safe to miss',
            neededToRecover: 'Needed to recover',
            lessons: 'lessons',
            excuseAction: 'Excuse',
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
            settingsTitle: 'Settings',
            refresh: 'Refresh',
            loadingTimetable: 'Loading timetable...',
            syncedStatus: 'Synced',
            updatingStatus: 'Updating...',
            profileTitle: 'Student Profile',
            luckyNumber: 'Lucky number',
            appLanguage: 'Language',
            teacherAbsencesTool: 'Teacher Absences Finder',
            accountSwitcher: 'Account Switcher',
            studentRole: 'Student',
            parentRole: 'Parent',
            logout: 'Sign Out',
            done: 'Done',
            messagesInbox: 'Inbox',
            messagesAnnouncements: 'Announcements',
            noMessages: 'No messages yet',
            composeMessage: 'New Message',
            recipientPlaceholder: 'Select recipient',
            subjectPlaceholder: 'Subject',
            messagePlaceholder: 'Write your message...',
            searchRecipient: 'Search staff...',
            welcomeTitle: 'Welcome to Synapse',
            loginSubtitle: 'Sign in with your Librus Synergia account',
            loginPlaceholder: 'Login / ID',
            passwordPlaceholder: 'Password',
            verifyButton: 'Verify & Connect',
            verifyingAccount: 'Verifying account with Librus...',
            accountVerified: 'Identity Verified',
            confirmAndEnter: 'Confirm & Enter',
            loginError: 'Invalid login or password. Please try again.',
            changeData: 'Change credentials',
            breakLabel: 'Break',
            breakCountdownLabel: (m: number) => `Break • ${m} min left`,
            breakUpcomingLabel: (m: number) => `Next break • ${m} min`,
            replyAction: 'Reply',
            searchMessagesPlaceholder: 'Search messages...',
            writeNewMessage: 'Compose',
            newMessageTitle: 'New Message',
            backToMessages: 'Messages'
        }
    }

    return {
        schedule: 'Plan',
        grades: 'Oceny',
        attendance: 'Frekwencja',
        messages: 'Wiadomości',
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
        settingsTitle: 'Ustawienia',
        refresh: 'Odśwież',
        loadingTimetable: 'Ładowanie planu lekcji...',
        syncedStatus: 'Zsynchronizowano',
        updatingStatus: 'Aktualizowanie...',
        profileTitle: 'Profil ucznia',
        luckyNumber: 'Szczęśliwy numerek',
        appLanguage: 'Język',
        teacherAbsencesTool: 'Nieobecności nauczycieli',
        accountSwitcher: 'Przełącznik kont',
        studentRole: 'Uczeń',
        parentRole: 'Rodzic',
        logout: 'Wyloguj się',
        done: 'Gotowe',
        messagesInbox: 'Odebrane',
        messagesAnnouncements: 'Ogłoszenia',
        noMessages: 'Brak wiadomości',
        composeMessage: 'Nowa wiadomość',
        recipientPlaceholder: 'Wybierz odbiorcę',
        subjectPlaceholder: 'Temat',
        messagePlaceholder: 'Treść wiadomości...',
        searchRecipient: 'Szukaj pracownika...',
        welcomeTitle: 'Witaj w Synapse',
        loginSubtitle: 'Zaloguj się kontem Librus Synergia',
        loginPlaceholder: 'Login / ID',
        passwordPlaceholder: 'Hasło',
        verifyButton: 'Weryfikuj i połącz',
        verifyingAccount: 'Weryfikacja konta w Librus...',
        accountVerified: 'Tożsamość potwierdzona',
        confirmAndEnter: 'Potwierdź i wejdź',
        loginError: 'Nieprawidłowy login lub hasło. Spróbuj ponownie.',
        changeData: 'Zmień dane',
        breakLabel: 'Przerwa',
        breakCountdownLabel: (m: number) => `Przerwa • pozostało ${m} min`,
        breakUpcomingLabel: (m: number) => `Kolejna przerwa • ${m} min`,
        replyAction: 'Odpowiedz',
        searchMessagesPlaceholder: 'Szukaj w wiadomościach...',
        writeNewMessage: 'Napisz',
        newMessageTitle: 'Nowa wiadomość',
        backToMessages: 'Wiadomości'
    }
}