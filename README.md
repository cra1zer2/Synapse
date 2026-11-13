# Synapse `v1.0.0`

**🇬🇧 English** | **[🇵🇱 Polski](README.pl.md)**

**Synapse** is a fast, clean, ad-free web & PWA client for the Polish **Librus Synergia** gradebook — designed with an **iOS-native feel** for **iPhone (iOS)**, **Android**, and desktop browsers.

> **Disclaimer**: Synapse is an independent, unofficial open-source project and is **not** affiliated with or endorsed by Librus sp. z o.o. There are no central Synapse servers and no telemetry or data collection — your deployment and credentials remain 100% yours and are stored locally on your device. See the [Disclaimer & Privacy Notice](#disclaimer--privacy-notice) below.

---

### Why Synapse

Following the shutdown of third-party mobile alternatives — which were already Android-only — students and parents on iOS and desktop were left with an official portal crowded with ads, microtransactions, and multi-step navigation.

**Synapse** gives you a clean, distraction-free experience in a personal Next.js app that you can run locally or host privately for free on **Vercel**. When added to your **Home Screen on iOS or Android**, it runs as a full-screen standalone app with native-style spring transitions, pull-to-refresh, and automatic Light / Dark themes.

It is also designed to keep server traffic minimal: Synapse batches requests and caches static gateway data (`Schools`, `Classes`, `Subjects`, `Teachers`, `Me`) locally instead of polling in the background — for instance, fetching a full week's lesson topics with **5x fewer requests** than the official web portal.

---

## Demo Mode (No Librus Account Required)

Explore the UI, animations, and all views immediately using built-in **Demo Mode** — populated with realistic student and parent sample data (smart timetable with substitutions, exams & deadlines, weighted GPA grades, attendance & deviations journal, e-excuses, and messages):

| Role | Username | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Student** | `demo` *(or `demou`)* | `demo` | Class `4T`, lucky number `#14` |
| **Parent** | `demor` *(or `demoparent`)* | `demo` | Parent view with one-tap e-excuses |

Simply enter any demo username above and password `demo` on the sign-in screen to preview your account details before entering the dashboard.

---

## Install on Your Phone (No Coding Required)

1. **Deploy your free private instance on Vercel**:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcra1zer2%2FSynapse)

   Sign in with GitHub and click **Create / Deploy** (no environment variables required). Within a minute you will have your private URL (e.g., `https://my-synapse.vercel.app`).
2. **Add to Home Screen** (standalone fullscreen mode):
   - **iOS (Safari)**: Tap **Share** → **Add to Home Screen**.
   - **Android (Chrome)**: Tap **⋮** → **Add to Home screen** / **Install app**.
3. **Sign in** with your Librus Synergia (`Student` or `Parent`) credentials, or use `demo` / `demo`.

---

## Features (`v1.0.0` Stable)

- **iCloud-Inspired Sign-In & Account Preview**: Fixed-height floating-label inputs, bilingual **PL / EN** cross-fade, verified class/school preview card before saving, and one-tap switching between multiple Student and Parent accounts.
- **Customizable iOS Dashboard**: Reorder or toggle home widgets (**Schedule**, **Grades**, **Upcoming Events**, **Attendance**, **Messages**), live current/next lesson countdown, lucky number banner, and smooth pull-to-refresh.
- **Smart Timetable & Calendar**: Automatically merges double lessons, highlights substitutions, cancellations, classrooms, and lesson topics, plus dedicated Exams, Homework, & Holidays views in list or calendar format with `.ics` export.
- **Calm Grades & GPA Calculator**: Focused grade badges where only alert/failing marks (`nb`, `0`, `1`) are highlighted in red while other grades stay neutral grey; instant weighted semester/yearly GPA calculation, `+`/`-` modifier modes, and a target grade simulator.
- **Attendance, Deviations Journal & e-Excuses**: Daily presence dots (`OB`) are kept cleanly on Today's Attendance, while the **Journal** (*Dziennik*) filters out `OB` clutter to spotlight deviations (`nb`, `usp`, `sp`, `sL`, `zw`). Parent accounts can submit one-tap e-Excuses for unexcused lessons or date ranges and track approval statuses live.
- **Messages & Announcements**: Clean inbox/sent viewer, teacher recipient picker, file attachment support, and school announcements.
- **Bilingual & Adaptive Themes**: Full **English / Polish** (`EN / PL`) interface with automatic Light & Dark mode support, plus built-in request timing diagnostics in Settings.

---

## Running Locally (Development)

Requires **Node.js `>= 20.9.0`**. Built with **Next.js 15**, **React 19**, **TypeScript 5**, and **Tailwind CSS 4**.

```bash
npm install
npm run dev     # http://localhost:3000
```

Production check:

```bash
npx tsc --noEmit
npm run build
npm run start
```

---

## Disclaimer & Privacy Notice

- **Unofficial & Independent**: **Synapse** is an independent open-source project intended strictly for personal and educational use. It is **not** affiliated with, authorized, or endorsed by **Librus sp. z o.o.** (*Librus* and *Librus Synergia* are trademarks of their respective owners).
- **Zero Data Collection (100% Local)**: The author does **not** operate any central server and does **not** collect, store, or access your credentials, grades, attendance, or messages. Credentials stay locally in your browser (`localStorage`) and are sent only through your own local or Vercel instance when syncing with Librus.
- **Open Source & Auditable**: No trackers or hidden analytics — the entire source code is public in this repository.
- **As-Is Software**: Provided **"as is"** without warranties of any kind. The author assumes no liability for any issues arising from the use of this software.
