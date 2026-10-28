# Synapse

**Synapse** is a fast, clean, ad-free personal app for the Polish **Librus Synergia** electronic gradebook — designed to work on **any phone** (both **iPhone / iOS** and **Android**) as well as on your computer.

### Why I Built This
After one of the most popular community gradebook apps recently ended support — and was only ever available on Android — iPhone users (and now everyone else) were left with the slow, ad-heavy official portal where basic features are locked behind paywalls.

**Synapse is my solution.** It works not only locally on a computer, but can also be hosted for free on **Vercel** as your own personal web app. When you add it to your **Home Screen on iOS** (or Android), it opens in **fullscreen mode** without any browser bars — looking, feeling, and running completely like a real native app.

---

## How to Use Synapse on Your Phone (No Coding Required)

You don't need to know how to code or run servers to use Synapse on your phone. You can launch your own personal copy for free in about 2 minutes:

### 1. Deploy Your Own Copy for Free (with Vercel)
1. Click the button below (or create a free account at [vercel.com](https://vercel.com)):

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcra1zer2%2FSynapse)

2. Sign in with GitHub and click **Create / Deploy** — no extra settings or keys are needed.
3. In about a minute, Vercel will give you your own private link (for example, `https://my-synapse.vercel.app`).

### 2. Add It to Your Home Screen as a Fullscreen App
- **On iPhone (iOS)**:
  1. Open your Vercel link in **Safari**.
  2. Tap the **Share** button at the bottom of the screen (the square with an upward arrow).
  3. Scroll down and tap **"Add to Home Screen"** (*Dodaj do ekranu początkowego*).
  4. Tap **Add**. Synapse will now appear on your Home Screen and launch in fullscreen just like an App Store app!
- **On Android**:
  1. Open your Vercel link in **Chrome**.
  2. Tap the three-dot menu (`⋮`) in the corner and tap **"Add to Home screen"** or **"Install app"**.

### 3. Log In & Use
Open **Synapse** from your Home Screen and sign in with your Librus Synergia (`Uczeń` or `Rodzic`) login and password. Your credentials stay saved privately on your device.

---

## Features at a Glance

- **Home Dashboard**: See your current or next lesson, live bell/break countdowns, newest grades, attendance percentage, and unread messages on one clean screen.
- **Smart Timetable**: Automatically merges double lessons, shows classroom numbers, and highlights substitutions, cancelled classes, and upcoming tests/quizzes.
- **Automatic Weighted Averages (GPA)**: Instant semester and yearly weighted grade averages with a toggle to ignore `+`/`-` modifiers — completely free, no paywalls.
- **Attendance & 1-Tap Excuses (*e-Usprawiedliwienia*)**: View absences by subject, select unexcused hours (`NB`), or excuse full date ranges directly from the app.
- **Full Messages (*Wiadomości*) & Announcements**: Read and send messages to teachers with clean formatting and an easy recipient list.
- **Multiple Accounts & Languages**: Switch between Student and Parent accounts in one tap, choose between **Polish (`PL`)** and **English (`EN`)**, and use Light or Dark mode.
- **100% Private & Ad-Free**: Zero ads, zero subscriptions, and no tracking. Your login details are stored only on your own device (`localStorage`).

---

## Technical Details (For Developers)

If you want to run Synapse locally on your computer, inspect the code, or customize it yourself, everything below covers the technical setup.

### Running Locally

#### Prerequisites
- Node.js `>= 20.9.0`
- npm

#### Installation & Development Server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and sign in with your Librus Synergia (`Rodzic` or `Uczeń`) credentials.

#### Production Build

```bash
npm run build
npm start
```

### Tech Stack

- **Framework**: Next.js 15 (App Router & stateless Server Actions)
- **UI & Runtime**: React 19, TypeScript 5
- **Styling**: Tailwind CSS 4 + CSS custom properties for native iOS Light/Dark tokens and 120 FPS hardware-accelerated transitions
- **PWA**: Web App Manifest & Service Worker configured for standalone iOS/Android Home Screen installation

### Project Structure

```text
src/
├── app/                  # Next.js App Router entrypoints, layout, global styles & Server Actions
├── components/
│   ├── attendance/       # Attendance views, quick NB excuse flow, manual excuse & history screens
│   ├── auth/             # Login & account onboarding view
│   ├── dashboard/        # Glanceable mini-widgets for the Home tab
│   ├── grades/           # Subject grades list, GPA summary & grade detail modal
│   ├── ios/              # Reusable iOS primitives (sheets, lists, switches, segmented controls)
│   ├── messages/         # Inbox, announcements reader, message composer & recipient picker
│   ├── schedule/         # Weekly smart timetable, lesson details & calendar event modals
│   └── settings/         # Account switcher, preferences, push notifications & latency benchmark
├── config/               # Localization dictionaries (PL / EN) & app configuration
├── hooks/                # React hooks for account sessions, background sync, inbox & scroll lock
├── models/               # TypeScript domain interfaces (timetable, grades, attendance, messages)
├── services/             # Librus Synergia native session engine, Gateway 2.0 & HTML parsers
├── types/                # Ambient type definitions
└── utils/                # Date, time, text formatting & justification helper utilities
```
