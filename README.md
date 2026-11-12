# Synapse

**🇵🇱 Polski** | **[🇬🇧 English](README.en.md)**

**Synapse** to szybka, przejrzysta i pozbawiona reklam osobista aplikacja webowa dla dziennika **Librus Synergia** — stworzona na **iPhone'a (iOS)**, **Androida** oraz komputer.

> **Nota prawna**: Synapse to niezależny, nieoficjalny projekt open-source i **nie jest** powiązany ani wspierany przez firmę Librus sp. z o.o. Autor nie prowadzi żadnych wspólnych serwerów ani nie zbiera żadnych danych użytkowników — Twoja instancja i dane logowania należą w 100% do Ciebie i są przechowywane lokalnie na Twoim urządzeniu. Zobacz pełną sekcję [Nota prawna i prywatność](#nota-prawna-i-prywatność) poniżej.

### Dlaczego powstał ten projekt
Po tym, jak **Szkolny.eu** zakończył wsparcie — a i tak był dostępny wyłącznie na Androida — użytkownicy iPhone'ów (a teraz wszyscy) zostali z powolnym, pełnym reklam oficjalnym portalem, w którym podstawowe funkcje są zablokowane za mikropłatnościami.

**Synapse** rozwiązuje ten problem. Możesz uruchomić aplikację lokalnie na komputerze albo postawić własną, prywatną kopię za darmo na **Vercel**. Po dodaniu do **Ekranu początkowego na iOS lub Androidzie** otwiera się na **pełnym ekranie** (bez pasków przeglądarki) i działa jak natywna aplikacja.

W przeciwieństwie do **Szkolny.eu**, Synapse generuje **minimalną liczbę zapytań (API requests)** — często mniejszą niż sam oficjalny portal (np. pobranie *Zrealizowanych lekcji* z całego tygodnia wymaga **5-krotnie mniej zapytań** niż na oficjalnej stronie).

---

## 📱 Wypróbuj bez konta Librus (Konto demonstracyjne / UI Preview)

Nie musisz podawać prawdziwych danych logowania, aby sprawdzić interfejs i przetestować działanie aplikacji! W Synapse wbudowany jest **tryb demonstracyjny** z pełnym zestawem realistycznych danych (plan lekcji z zastępstwami, sprawdziany i terminy, oceny ze średnią ważoną, frekwencja z e-usprawiedliwieniami, wiadomości i ogłoszenia):

| Rola | Login | Hasło | Opis |
| :--- | :--- | :--- | :--- |
| **Uczeń** *(domyślne)* | `demo` *(lub `demou`)* | `demo` | Pełny widok ucznia (Klasa 4T, szczęśliwy numerek #14) |
| **Rodzic** | `demor` | `demo` | Widok rodzica (z możliwością usprawiedliwiania nieobecności) |

Na ekranie logowania znajduje się także przycisk szybkiego wypełnienia **„Wypróbuj konto demo”**. Konto demonstracyjne idealnie nadaje się do przetestowania projektu UI, animacji gestów iOS oraz do **wykonywania zrzutów ekranu**.

---

## Jak zainstalować na telefonie (bez programowania)

1. **Uruchom własną darmową kopię na Vercel**:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcra1zer2%2FSynapse)

   Zaloguj się przez GitHub i kliknij **Create / Deploy** (nie trzeba ustawiać żadnych kluczy ani opcji). Po około minucie otrzymasz własny prywatny link (np. `https://my-synapse.vercel.app`).
2. **Dodaj do ekranu głównego** (tryb pełnoekranowy jak zwykła aplikacja):
   - **iOS (Safari)**: Kliknij **Udostępnij** → **Dodaj do ekranu początkowego**.
   - **Android (Chrome)**: Kliknij **⋮** → **Dodaj do ekranu głównego** / **Zainstaluj aplikację**.
3. **Zaloguj się** swoimi danymi do Librus Synergia (`Uczeń` lub `Rodzic`) albo skorzystaj z konta `demo` / `demo`.

---

## Główne funkcje

- **Ekran główny w stylu iOS**: Aktualna lub następna lekcja, odliczanie do dzwonka na żywo, najnowsze oceny, frekwencja % i nieprzeczytane wiadomości. Płynne natywne animacje i gesty przesunięcia wstecz.
- **Inteligentny plan lekcji**: Automatycznie łączy podwójne lekcje, pokazuje numery sal oraz wyróżnia zastępstwa, odwołane lekcje i tematy.
- **Sprawdziany i terminy**: Dedykowany ekran nadchodzących sprawdzianów, kartkówek, zadań domowych i dni wolnych w widoku chronologicznym oraz kalendarza.
- **Średnie ważone (GPA) i symulator ocen**: Natychmiastowe wyliczanie średniej ważonej (semestralnej i rocznej) z przełącznikiem liczenia `+`/`-`, a także symulator pozwalający sprawdzić, jakie oceny są potrzebne do osiągnięcia pożądanej średniej.
- **Frekwencja i szybkie *e-Usprawiedliwienia***: Usprawiedliwianie wybranych godzin `NB` lub całych zakresów dni jednym kliknięciem z podglądem statusów na żywo.
- **Wiadomości i Ogłoszenia**: Odczytywanie i wysyłanie wiadomości do nauczycieli z wygodnym wyborem odbiorców i obsługą załączników.
- **Wiele kont i języków**: Przełączanie między kontami Ucznia i Rodzica jednym tapnięciem, pełne wsparcie dla języków **PL / EN** oraz tryb jasny i ciemny dopasowany do motywu systemu.
- **Minimalne obciążenie serwerów**: Grupowanie zapytań i inteligentny lokalny cache zamiast ciągłego odpytywania w tle (np. 5x mniej zapytań przy pobieraniu tematów lekcji niż w oficjalnym portalu).

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
