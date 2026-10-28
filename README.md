# Synapse

**🇵🇱 Polski** | **[🇬🇧 English](README.en.md)**

**Synapse** to szybka, przejrzysta i pozbawiona reklam osobista aplikacja webowa dla dziennika **Librus Synergia** — stworzona na **iPhone'a (iOS)**, **Androida** oraz komputer.

> **Nota prawna**: Synapse to niezależny, nieoficjalny projekt open-source i **nie jest** powiązany ani wspierany przez firmę Librus sp. z o.o. Autor nie prowadzi żadnych wspólnych serwerów ani nie zbiera żadnych danych użytkowników — Twoja instancja i dane logowania należą w 100% do Ciebie i są przechowywane lokalnie na Twoim urządzeniu. Zobacz pełną sekcję [Nota prawna i prywatność](#nota-prawna-i-prywatność) poniżej.

### Dlaczego powstał ten projekt
Po tym, jak **Szkolny.eu** zakończył wsparcie — a i tak był dostępny wyłącznie na Androida — użytkownicy iPhone'ów (a teraz wszyscy) zostali z powolnym, pełnym reklam oficjalnym portalem, w którym podstawowe funkcje są zablokowane za mikropłatnościami.

**Synapse** rozwiązuje ten problem. Możesz uruchomić aplikację lokalnie na komputerze albo postawić własną, prywatną kopię za darmo na **Vercel**. Po dodaniu do **Ekranu początkowego na iOS lub Androidzie** otwiera się na **pełnym ekranie** (bez pasków przeglądarki) i działa jak natywna aplikacja.

W przeciwieństwie do **Szkolny.eu**, Synapse generuje **minimalną liczbę zapytań (API requests)** — często mniejszą niż sam oficjalny portal (np. pobranie *Zrealizowanych lekcji* z całego tygodnia wymaga **5-krotnie mniej zapytań** niż na oficjalnej stronie).

---

## Jak zainstalować na telefonie (bez programowania)

1. **Uruchom własną darmową kopię na Vercel**:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcra1zer2%2FSynapse)

   Zaloguj się przez GitHub i kliknij **Create / Deploy** (nie trzeba ustawiać żadnych kluczy ani opcji). Po około minucie otrzymasz własny prywatny link (np. `https://my-synapse.vercel.app`).
2. **Dodaj do ekranu głównego** (tryb pełnoekranowy jak zwykła aplikacja):
   - **iOS (Safari)**: Kliknij **Udostępnij** → **Dodaj do ekranu początkowego**.
   - **Android (Chrome)**: Kliknij **⋮** → **Dodaj do ekranu głównego** / **Zainstaluj aplikację**.
3. **Zaloguj się** swoimi danymi do Librus Synergia (`Uczeń` lub `Rodzic`).

---

## Główne funkcje

- **Ekran główny**: Aktualna lub następna lekcja, odliczanie do dzwonka na żywo, najnowsze oceny, frekwencja % i nieprzeczytane wiadomości.
- **Inteligentny plan lekcji**: Automatycznie łączy podwójne lekcje, pokazuje numery sal oraz wyróżnia zastępstwa, odwołane lekcje i sprawdziany.
- **Średnie ważone**: Natychmiastowe wyliczanie średniej ważonej (semestralnej i rocznej) z przełącznikiem liczenia `+`/`-` — całkowicie za darmo.
- **Frekwencja i szybkie *e-Usprawiedliwienia***: Usprawiedliwianie wybranych godzin `NB` lub całych zakresów dni jednym kliknięciem.
- **Wiadomości i Ogłoszenia**: Odczytywanie i wysyłanie wiadomości do nauczycieli z wygodnym wyborem odbiorców.
- **Wiele kont i języków**: Przełączanie między kontami Ucznia i Rodzica jednym tapnięciem, język **PL / EN** oraz tryb jasny i ciemny.
- **Minimalne obciążenie serwerów**: Grupowanie zapytań i lokalny cache zamiast ciągłego odpytywania w tle (np. 5x mniej zapytań przy pobieraniu tematów lekcji niż w oficjalnym portalu).

---

## Uruchomienie lokalne (dla programistów)

Wymagany **Node.js `>= 20.9.0`**. Zbudowane w oparciu o **Next.js 15**, **React 19**, **TypeScript 5** oraz **Tailwind CSS 4**.

```bash
npm install
npm run dev     # http://localhost:3000
```

---

## Nota prawna i prywatność

- **Projekt nieoficjalny i niezależny**: **Synapse** to niezależny projekt open-source stworzony wyłącznie do użytku osobistego i edukacyjnego. **Nie jest** w żaden sposób powiązany, autoryzowany ani wspierany przez **Librus sp. z o.o.** (nazwy *Librus* oraz *Librus Synergia* są znakami towarowymi ich prawnych właścicieli).
- **Zero zbierania danych (w 100% Twoje i lokalne)**: Autor tego repozytorium **nie prowadzi** żadnego centralnego serwera i **nie zbiera**, nie przechowuje ani nie ma dostępu do Twoich danych logowania, ocen, wiadomości ani żadnych innych danych osobowych. Twoje dane logowania zostają wyłącznie na Twoim urządzeniu (`localStorage`) i są używane tylko przez Twoją własną instancję aplikacji.
- **W pełni otwarty kod (Open Source)**: Brak ukrytych trackerów czy analityki — cały kod źródłowy jest publicznie dostępny w tym repozytorium, więc każdy może go samodzielnie przejrzeć i zweryfikować.
- **Wyłączenie odpowiedzialności**: Oprogramowanie jest udostępniane w stanie **„takim, w jakim jest" (*as is*)**, bez żadnych gwarancji. Autor nie ponosi żadnej odpowiedzialności za jakiekolwiek szkody, problemy z kontem czy konsekwencje wynikające z korzystania z tego oprogramowania; korzystasz z niego wyłącznie na własną odpowiedzialność.
