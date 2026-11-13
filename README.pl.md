# Synapse `v1.0.0`

**[🇬🇧 English](README.md)** | **🇵🇱 Polski**

**Synapse** to szybka, przejrzysta i pozbawiona reklam aplikacja webowa oraz PWA dla dziennika **Librus Synergia** — zaprojektowana w stylu **natywnym dla iOS** na **iPhone'a (iOS)**, **Androida** i przeglądarki desktopowe.

> **Nota prawna**: Synapse to niezależny, nieoficjalny projekt open-source i **nie jest** powiązany ani wspierany przez firmę Librus sp. z o.o. Autor nie prowadzi żadnych wspólnych serwerów ani nie zbiera danych — Twoja instancja i dane logowania należą w 100% do Ciebie i są zapisywane wyłącznie lokalnie na Twoim urządzeniu. Zobacz sekcję [Nota prawna i prywatność](#nota-prawna-i-prywatność) poniżej.

---

### Dlaczego powstał ten projekt

Po zakończeniu wsparcia dla mobilnych alternatyw — które i tak działały wyłącznie na Androidzie — użytkownicy iPhone'ów oraz komputerów zostali z powolnym, przepełnionym reklamami oficjalnym portalem z funkcjami zablokowanymi za mikropłatnościami.

**Synapse** rozwiązuje ten problem. Możesz uruchomić aplikację lokalnie albo postawić własną, prywatną kopię za darmo na **Vercel**. Po dodaniu do **Ekranu początkowego na iOS lub Androidzie** otwiera się w trybie pełnoekranowym z płynnymi animacjami iOS, gestem pociągnięcia w dół w celu odświeżenia oraz automatycznym motywem jasnym i ciemnym.

Aplikacja dba także o minimalne obciążenie serwerów — grupuje zapytania i buforuje lokalnie zasoby bramki (`Schools`, `Classes`, `Subjects`, `Teachers`, `Me`), zamiast stale odpytywać API w tle (np. 5-krotnie mniej zapytań przy pobieraniu tematów lekcji z całego tygodnia).

---

## Tryb demonstracyjny (bez konta Librus)

Możesz od razu sprawdzić interfejs, animacje i wszystkie widoki w wbudowanym **trybie demonstracyjnym** z realistycznymi danymi przykładowymi (plan lekcji z zastępstwami, sprawdziany, oceny ze średnią ważoną, frekwencja i e-usprawiedliwienia, wiadomości):

| Rola | Login | Hasło | Zakres |
| :--- | :--- | :--- | :--- |
| **Uczeń** | `demo` *(lub `demou`)* | `demo` | Klasa `4T`, szczęśliwy numerek `#14` |
| **Rodzic** | `demor` *(lub `demoparent`)* | `demo` | Widok rodzica z szybkimi e-usprawiedliwieniami |

Wpisz powyższy login i hasło `demo` w formularzu logowania, aby przejść do podglądu konta i pełnego dashboardu.

---

## Instalacja na telefonie (bez programowania)

1. **Uruchom własną darmową kopię na Vercel**:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcra1zer2%2FSynapse)

   Zaloguj się przez GitHub i kliknij **Create / Deploy** (bez dodatkowych kluczy). Po około minucie otrzymasz swój prywatny adres URL (np. `https://my-synapse.vercel.app`).
2. **Dodaj do ekranu początkowego** (tryb pełnoekranowy):
   - **iOS (Safari)**: Kliknij **Udostępnij** → **Dodaj do ekranu początkowego**.
   - **Android (Chrome)**: Kliknij **⋮** → **Dodaj do ekranu głównego** / **Zainstaluj aplikację**.
3. **Zaloguj się** swoimi danymi Librus Synergia (`Uczeń` lub `Rodzic`) albo użyj konta `demo` / `demo`.

---

## Główne funkcje (`v1.0.0` Stable)

- **Logowanie w stylu iCloud i podgląd konta**: Pływające etykiety pól logowania, płynne przełączanie języka **PL / EN**, weryfikacja klasy i szkoły przed zapisaniem oraz przełączanie wielu kont Ucznia i Rodzica jednym tapnięciem.
- **Konfigurowalny ekran główny iOS**: Dowolna kolejność i widoczność kart (**Plan**, **Oceny**, **Sprawdziany i terminy**, **Frekwencja**, **Wiadomości**), odliczanie do dzwonka na żywo, baner szczęśliwego numerka oraz płynny gest pull-to-refresh.
- **Inteligentny plan lekcji i kalendarz**: Łączenie podwójnych lekcji, numery sal, wyróżnianie zastępstw, odwołań i tematów oraz osobny widok sprawdzianów, zadań domowych i dni wolnych (lista i kalendarz + eksport `.ics`).
- **Spokojna prezentacja ocen i kalkulator GPA**: Przejrzyste kafelki ocen, w których na czerwono wyróżniane są wyłącznie oceny alarmowe (`nb`, `0`, `1`), a pozostałe utrzymane są w stonowanej szarości; błyskawiczne wyliczanie średniej ważonej (semestralnej/rocznej), obsługa `+`/`-` i symulator oceny docelowej.
- **Frekwencja, dziennik odchyleń i e-Usprawiedliwienia**: Wskaźnik `OB` pojawia się wyłącznie w pasku **Dzisiejszej obecności**, natomiast **Dziennik** skupia się na odchyleniach od normy (`nb`, `usp`, `sp`, `sL`, `zw`). Rodzic może jednym kliknięciem wysyłać e-usprawiedliwienia wybranych lekcji lub całych dni i śledzić ich status na żywo.
- **Wiadomości i Ogłoszenia**: Czytelna skrzynka odbiorcza i wysłane, wybierak nauczycieli, obsługa załączników oraz ogłoszenia szkolne.
- **Dwujęzyczność i motywy systemu**: Pełny interfejs **PL / EN**, automatyczny tryb jasny/ciemny oraz diagnostyka zapytań API w Ustawieniach.

---

## Uruchomienie lokalne (dla programistów)

Wymagany **Node.js `>= 20.9.0`**. Zbudowano z użyciem **Next.js 15**, **React 19**, **TypeScript 5** oraz **Tailwind CSS 4**.

```bash
npm install
npm run dev     # http://localhost:3000
```

Weryfikacja produkcyjna:

```bash
npx tsc --noEmit
npm run build
npm run start
```

---

## Nota prawna i prywatność

- **Projekt nieoficjalny i niezależny**: **Synapse** jest niezależnym projektem open-source przeznaczonym wyłącznie do użytku osobistego i edukacyjnego. **Nie jest** powiązany, autoryzowany ani wspierany przez **Librus sp. z o.o.** (*Librus* oraz *Librus Synergia* są znakami towarowymi ich prawnych właścicieli).
- **Zero zbierania danych (100% lokalnie)**: Autor **nie prowadzi** żadnego centralnego serwera i **nie gromadzi** ani nie ma dostępu do Twoich danych logowania, ocen, frekwencji czy wiadomości. Dane logowania pozostają wyłącznie w pamięci Twojego urządzenia (`localStorage`).
- **Otwarty kod źródłowy**: Brak trackerów i ukrytej analityki — cały kod źródłowy jest publiczny w tym repozytorium.
- **Brak gwarancji**: Oprogramowanie jest udostępniane w stanie **„takim, jakim jest” (*as is*)** bez jakichkolwiek gwarancji; korzystasz z niego wyłącznie na własną odpowiedzialność.
