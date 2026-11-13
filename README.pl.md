# Synapse

**[🇬🇧 English](README.md)** · **[🇵🇱 Polski](README.pl.md)**

**Szybki, prywatny i pozbawiony reklam klient dziennika Librus Synergia** — stworzony, by zastąpić przeładowany portal webowy oraz płatne aplikacje mobilne lekkim, czytelnym widokiem na telefon i komputer.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcra1zer2%2FSynapse)

> Subtelnie inspirowany nowoczesnym wzornictwem mobilnym, Synapse działa jako responsywna hybryda aplikacji webowej i PWA: wygodne karty dotykowe na smartfonie oraz dwukolumnowy układ na szerokim ekranie — bez reklam, śledzenia i zewnętrznych serwerów.

---

## Podgląd interfejsu

<table>
  <tr>
    <td align="center" width="25%">
      <a href="docs/screenshots/dashboard-dark.png">
        <img src="docs/screenshots/dashboard-dark.png" width="190" alt="Pulpit Synapse w trybie mobilnym (Dark Mode)" />
      </a>
      <br /><sub><b>Pulpit na co dzień</b><br />Lekcja na żywo, średnia, poczta i obecność</sub>
    </td>
    <td align="center" width="25%">
      <a href="docs/screenshots/schedule-dark.png">
        <img src="docs/screenshots/schedule-dark.png" width="190" alt="Plan lekcji Synapse" />
      </a>
      <br /><sub><b>Plan lekcji</b><br />Zmiany sal, sprawdziany i przerwy</sub>
    </td>
    <td align="center" width="25%">
      <a href="docs/screenshots/grades-dark.png">
        <img src="docs/screenshots/grades-dark.png" width="190" alt="Oceny i kalkulator GPA Synapse" />
      </a>
      <br /><sub><b>Oceny i średnia</b><br />Średnia ważona i symulator „co jeśli”</sub>
    </td>
    <td align="center" width="25%">
      <a href="docs/screenshots/attendance-dark.png">
        <img src="docs/screenshots/attendance-dark.png" width="190" alt="Frekwencja Synapse" />
      </a>
      <br /><sub><b>Frekwencja</b><br />Progi przedmiotowe i nieobecności</sub>
    </td>
  </tr>
</table>

<p align="center">
  <a href="docs/screenshots/desktop-light.png">
    <img src="docs/screenshots/desktop-light.png" width="760" alt="Układ desktopowy Synapse (Tryb jasny)" />
  </a>
  <br /><sub><b>Responsywny widok desktopowy (Tryb jasny)</b> — pełny plan dnia obok podsumowania ocen, wiadomości i frekwencji</sub>
</p>

---

## Dlaczego powstał Synapse

Po zakończeniu wsparcia dla popularnych open-source’owych aplikacji mobilnych na Androida, uczniowie i rodzice zostali skazani na oficjalny portal przepełniony reklamami, wielostopniową nawigacją oraz płatnymi dodatkami blokującymi podstawowe udogodnienia.

**Synapse** rozwiązuje ten codzienny problem:
- **Błyskawiczne działanie na co dzień** — otwiera się natychmiast z lokalnej pamięci podręcznej i dyskretnie synchronizuje zmiany w tle zamiast za każdym razem przeładowywać ciężkie tabele HTML.
- **Własna, prywatna instancja za darmo** — żaden wspólny serwer osób trzecich nie przechowuje Twojego hasła. W minutę stawiasz własną kopię na Vercel (albo lokalnie) i dodajesz ją do ekranu głównego telefonu.
- **Dla ucznia i dla rodzica** — szybkie przełączanie między kontami, czytelne odchylenia frekwencji i wygodne wysyłanie e-usprawiedliwień.

---

## Główne możliwości

- **Dzień szkolny w jednym spojrzeniu**: Status trwającej lekcji, odliczanie do końca przerwy, wyróżnione zmiany sal, ostatnie oceny i nieprzeczytane wiadomości na konfigurowalnym pulpicie.
- **Plan lekcji, terminarz i eksport `.ics`**: Automatyczne łączenie lekcji dwugodzinnych, czytelne oznaczenia zastępstw i odwołań, lista sprawdzianów i zadań domowych oraz eksport do kalendarza systemowego.
- **Spokojny widok ocen i symulator średniej**: Natychmiastowa średnia ważona za okres i cały rok, konfiguracja wag `+`/`-`, stonowana kolorystyka wyróżniająca na czerwono wyłącznie oceny alarmowe (`nb`, `0`, `1`) oraz planowanie oceny docelowej.
- **Frekwencja, dziennik odchyleń i e-Usprawiedliwienia**: Dzisiejsze obecności (`OB`) oddzielone od dziennika odchyleń (`nb`, `usp`, `sp`, `sL`, `zw`), progi ostrzegawcze (`50%` / `75%`) oraz wysyłanie i śledzenie e-usprawiedliwień z konta rodzica.
- **Wiadomości i Ogłoszenia**: Czysta skrzynka odbiorcza i wysłane, wygodne wyszukiwanie nauczycieli, pobieranie załączników oraz ogłoszenia szkolne.
- **Dwujęzyczność i motywy systemu**: Pełny interfejs **Polski / English (`PL / EN`)** oraz tryb jasny, ciemny i systemowy.

---

## Tryb demonstracyjny (bez własnego konta)

Wszystkie widoki, kalkulator średniej, plan lekcji i obieg e-usprawiedliwień możesz sprawdzić od razu dzięki wbudowanemu trybowi demo:

| Rola | Login | Hasło | Zakres danych |
| :--- | :--- | :--- | :--- |
| **Uczeń** | `demo` *(lub `demou`)* | `demo` | Aktywny plan dnia, oceny ze średnią ważoną, frekwencja (`4T`, `#14`) |
| **Rodzic** | `demor` *(lub `demoparent`)* | `demo` | Widok rodzica z formularzami e-usprawiedliwień |

---

## Prywatne uruchomienie w minutę

1. **Postaw własną kopię na Vercel**:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcra1zer2%2FSynapse)

   Zaloguj się kontem GitHub i kliknij **Deploy** (bez konfiguracji zmiennych środowiskowych), aby otrzymać swój prywatny adres URL.
2. **Dodaj do ekranu początkowego** (opcjonalny tryb pełnoekranowy):
   - **Safari (iPhone)**: **Udostępnij** → **Dodaj do ekranu początkowego**
   - **Chrome (Android)**: **⋮** → **Dodaj do ekranu głównego** / **Zainstaluj aplikację**
3. **Zaloguj się** swoimi danymi Librus Synergia lub sprawdź tryb `demo` / `demo`.

---

## Architektura i szczegóły techniczne

Od strony inżynierskiej Synapse pełni rolę **bezstanowego proxy BFF (Backend-for-Frontend) i adaptera protokołu** ponad mieszaną infrastrukturą JSON/HTML systemu Librus Synergia — zaprojektowanego tak, aby zapewnić minimalne opóźnienia przy zachowaniu pełnej prywatności bez centralnej bazy danych.

### Kluczowe elementy rozwiązania

- **Bezstanowy pośrednik Server Actions (`src/app/actions.ts`)**: Cała komunikacja z serwerami szkoły zachodzi wyłącznie w ramach Next.js Server Actions na prywatnej instancji użytkownika. `syncAllUserDataAction` równolegle pobiera plan lekcji, oceny i frekwencję przez `Promise.all` oraz mierzy czasy poszczególnych endpointów (`serverTimings`).
- **Własny silnik sesji i ciasteczek (`src/services/session.service.ts`)**: Klasy `NativeCookieJar` i `NativeLibrusSession` deterministycznie obsługują wieloetapowe przekierowania logowania oraz cykl życia ciasteczek bez narzutu przeglądarek headless.
- **Hybrydowa agregacja API Gateway + HTML (`src/services/`)**: Warstwa serwisów łączy zasoby Gateway API v2 (`gateway.service.ts`, `justification.service.ts`) z precyzyjnym parsowaniem HTML tam, gdzie brakuje kompletnego JSON API (m.in. treści wiadomości w `message-parser.service.ts`, metadane planu lekcji, statusy wniosków e-usprawiedliwień), wraz z automatycznym odzyskiwaniem sesji po wygaśnięciu (`401` / przekierowanie logowania).
- **Grupowanie zapytań i bufor słowników z TTL (`src/services/gateway.service.ts`)**: Mapa `inFlightRequests` deduplikuje równoległe zapytania o ten sam zasób, a `catalogCache` buforuje w pamięci rzadko zmieniające się słowniki (`Schools`, `Classes`, `Subjects`, `Lessons`, `Attendances/Types`, `Grades/Categories`, `Grades/Comments`, `Me`, `Realizations`).
- **Hydracja Local-First (`src/hooks/`)**: Znormalizowane dane kont i ustawienia interfejsu są utrwalane wyłącznie w `localStorage` przeglądarki, gwarantując natychmiastowy start widoku oraz ciche dociąganie aktualizacji w tle.

### Stos technologiczny i struktura projektu

Zbudowano przy użyciu **Next.js 15** (App Router i Server Actions), **React 19**, **TypeScript 5**, **Tailwind CSS 4**, **Lucide Icons** oraz **Node.js `>= 20.9.0`**.

```text
src/
├── app/            # Punkty wejścia Next.js i bezstanowe Server Actions (actions.ts)
├── components/     # Moduły interfejsu (pulpit, plan, oceny, frekwencja, wiadomości, ustawienia)
├── config/         # Słowniki dwujęzyczne (PL / EN)
├── hooks/          # Synchronizacja local-first, obsługa wielu kont, ustawienia i fizyka przewijania
├── models/         # Typowane modele domenowe planu, ocen, frekwencji i wiadomości
├── services/       # Silnik sesji/cookie jar, klient Gateway, parsery, tłumaczenia i generator demo
└── utils/          # Obliczenia średniej ważonej, okna czasowe lekcji, eksport .ics i formatowanie
```

### Uruchomienie lokalne

```bash
npm install
npm run dev       # http://localhost:3000
```

Weryfikacja produkcyjna:

```bash
npx tsc --noEmit
npm run build
npm run start
```

---

## Nota prawna i prywatność

- **Niezależny projekt open-source**: Synapse nie jest powiązany, autoryzowany ani wspierany przez **Librus sp. z o.o.** (*Librus* oraz *Librus Synergia* są znakami towarowymi ich prawnych właścicieli). Projekt przeznaczony jest wyłącznie do użytku osobistego i edukacyjnego.
- **Zero telemetrii i zero centralnego przechowywania danych**: Autor repozytorium **nie utrzymuje** żadnego centralnego serwera ani bazy danych i nie ma dostępu do Twoich poświadczeń, ocen, frekwencji ani wiadomości. Dane pozostają wyłącznie na Twoim urządzeniu (`localStorage`).
- **Brak gwarancji**: Oprogramowanie udostępniane jest w stanie *„takim, jakim jest” (as is)* bez jakichkolwiek gwarancji.
