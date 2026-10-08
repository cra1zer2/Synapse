export const CURRENT_APP_VERSION = '3.0.3'

export interface ChangelogItem {
    id: string
    icon: string
    weight: number
    title: Record<'pl' | 'en', string>
    description: Record<'pl' | 'en', string>
}

export interface VersionRelease {
    version: string
    releaseDate: string
    items: ChangelogItem[]
}

export function compareSemver(v1: string, v2: string): number {
    const p1 = v1.split('.').map((n) => parseInt(n, 10) || 0)
    const p2 = v2.split('.').map((n) => parseInt(n, 10) || 0)
    const maxLen = Math.max(p1.length, p2.length)

    for (let i = 0; i < maxLen; i++) {
        const num1 = p1[i] || 0
        const num2 = p2[i] || 0
        if (num1 > num2) return 1
        if (num1 < num2) return -1
    }
    return 0
}

export const APP_CHANGELOG: VersionRelease[] = [
    {
        version: '3.0.3',
        releaseDate: '08.10.2026',
        items: [
            {
                id: '303-anti-spam',
                icon: '🛡️',
                weight: 10,
                title: {
                    pl: 'Rejestr e-Usprawiedliwień',
                    en: 'e-Justification Anti-Spam'
                },
                description: {
                    pl: 'Lokalna ochrona przed duplikatami i status Oczekuje dla wysłanych usprawiedliwień.',
                    en: 'Anti-spam protection with Pending status indicator for submitted excuses.'
                }
            }
        ]
    },
    {
        version: '3.0.2',
        releaseDate: '08.10.2026',
        items: [
            {
                id: '302-live-date',
                icon: '🗓️',
                weight: 10,
                title: {
                    pl: 'Synchronizacja bieżącego dnia',
                    en: 'Live Current Day Synchronization'
                },
                description: {
                    pl: 'Kalendarz precyzyjnie wykrywa dzisiejszą datę lokalną bez dryfu pamięci podręcznej.',
                    en: 'Schedule accurately highlights today in real time without stale cached date drift.'
                }
            },
            {
                id: '302-swipe-lag',
                icon: '⚡',
                weight: 9,
                title: {
                    pl: 'Płynne gesty 120 FPS bez zacięć',
                    en: 'Fluid 120 FPS Lag-Free Gestures'
                },
                description: {
                    pl: 'Bezpośrednia akceleracja DOM eliminuje mikroopóźnienia na starcie gestu powrotu.',
                    en: 'Hardware DOM transformation eliminates touch-start latency on back swipe gestures.'
                }
            },
            {
                id: '302-localization',
                icon: '🌐',
                weight: 8,
                title: {
                    pl: 'Kompletna dwujęzyczność',
                    en: 'Comprehensive Localization'
                },
                description: {
                    pl: 'Wszystkie moduły, nagłówki ocen i etykiety frekwencji w pełni przetłumaczone na EN i PL.',
                    en: 'All subject cards, grade GPA titles, and attendance counts fully translated to EN and PL.'
                }
            },
            {
                id: '302-excuse-policy',
                icon: '🛡️',
                weight: 7,
                title: {
                    pl: 'Optymalizacja profilu ucznia',
                    en: 'Student Profile Streamlining'
                },
                description: {
                    pl: 'Wyłączono nieobsługiwane akcje usprawiedliwień dla kont uczniowskich (z końcówką u).',
                    en: 'Suppressed unsupported self-excuse actions for student login profiles.'
                }
            }
        ]
    },
    {
        version: '3.0.1',
        releaseDate: '07.10.2026',
        items: [
            {
                id: '301-message-cascade',
                icon: '💬',
                weight: 6,
                title: {
                    pl: 'Kaskadowy widok wiadomości',
                    en: 'Cascading Message Drop Animation'
                },
                description: {
                    pl: 'Nowa animacja opadania wiadomości od góry z miękkim gradientem przezroczystości.',
                    en: 'Gentle top-to-bottom opacity fade for incoming messages without layout shifting.'
                }
            },
            {
                id: '301-spinner',
                icon: '⏱️',
                weight: 5,
                title: {
                    pl: 'Wycentrowany wskaźnik Apple',
                    en: 'Centered Activity Indicator'
                },
                description: {
                    pl: 'Symetryczny, precyzyjnie wyśrodkowany wskaźnik ładowania w stylu iOS Activity Indicator.',
                    en: 'Balanced, perfectly centered iOS-style activity indicator for smoother loading.'
                }
            },
            {
                id: '301-viewport-layout',
                icon: '📱',
                weight: 4,
                title: {
                    pl: 'Kalibracja dużych ekranów Max',
                    en: 'Pro Max Viewport Calibration'
                },
                description: {
                    pl: 'Tymczasowo zwolniono górny pasek nawigacji dla maksymalnej płynności przewijania.',
                    en: 'Temporarily paused pinned bar to maximize scrolling performance on large displays.'
                }
            }
        ]
    },
    {
        version: '3.0.0',
        releaseDate: '06.10.2026',
        items: [
            {
                id: '300-attendance-revamp',
                icon: '🩺',
                weight: 8,
                title: {
                    pl: 'Nowy moduł frekwencji',
                    en: 'Revamped Attendance Engine'
                },
                description: {
                    pl: 'Scalone przedmioty, eliminacja lekcji widm i pełnoekranowy widok historii opuszczeń.',
                    en: 'Merged subjects, zero phantom entries, and native fullscreen absence breakdown.'
                }
            },
            {
                id: '300-benchmark',
                icon: '⚡',
                weight: 7,
                title: {
                    pl: 'Diagnostyka opóźnień Librus',
                    en: 'Librus Latency Benchmark'
                },
                description: {
                    pl: 'Pomiar czasu odpowiedzi punktów końcowych Synergii bezpośrednio z menu zaawansowanego.',
                    en: 'Direct latency measurement across all Synergia endpoints in advanced settings.'
                }
            },
            {
                id: '300-gpa-calc',
                icon: '📊',
                weight: 6,
                title: {
                    pl: 'Kalkulator GPA bez +/-',
                    en: 'Grade Average Filter'
                },
                description: {
                    pl: 'Opcja wyliczania średniej ważonej z ocen bazowych bez modyfikatorów plusów i minusów.',
                    en: 'Calculate weighted GPA from base grade values without plus and minus penalties.'
                }
            }
        ]
    }
]

export function getSmartChangelog(lastSeenVersion: string | null, lang: 'pl' | 'en') {
    const unreadReleases = !lastSeenVersion
        ? APP_CHANGELOG
        : APP_CHANGELOG.filter((r) => compareSemver(r.version, lastSeenVersion) > 0)

    const effectiveReleases = unreadReleases.length > 0 ? unreadReleases : [APP_CHANGELOG[0]]

    const allUnreadItems: ChangelogItem[] = []
    effectiveReleases.forEach((r) => {
        allUnreadItems.push(...r.items)
    })

    const sortedByWeight = [...allUnreadItems].sort((a, b) => b.weight - a.weight)
    const topHighlights = sortedByWeight.slice(0, 4)

    return {
        topHighlights,
        fullReleases: effectiveReleases,
        hasMultipleVersions: effectiveReleases.length > 1,
        totalNewItemsCount: allUnreadItems.length
    }
}