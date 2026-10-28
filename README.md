# Synapse

**Synapse** is an independent, high-performance web client for the Polish **Librus Synergia** electronic gradebook, built with native iOS design language, 120 FPS hardware-accelerated transitions, and a local-first architecture.

---

## Why Synapse?

Official school portals are often weighed down by advertisements, slow page reloads, and paywalled utilities such as weighted grade averages, multi-account switching, and instant attendance excuse workflows. Synapse replaces the legacy portal experience with a clean, glanceable interface:

- **Glanceable Dashboard**: Real-time overview of current & upcoming lessons, recent grades, attendance rate, and unread messages/announcements in one unified view.
- **Smart Timetable**: Automatically merges consecutive block lessons, tracks live bell/break countdowns, highlights substitutions, cancellations, exams/quizzes, and realized lesson topics.
- **Weighted Grades & GPA Engine**: Full semester and yearly weighted GPA calculations with an optional modifier filter (`+` / `-` stripping) and instant grade detail sheets.
- **Attendance & Native e-Usprawiedliwienia**: Subject-level absence breakdown, full chronological attendance history, quick `NB` excuse selection, manual date-range justifications, and live excuse status tracking (`Pending` / `Accepted` / `Rejected`) with duplicate-submission protection.
- **Full Inbox & Announcements**: Native HTML-parsed Synergia inbox and school announcements reader, plus direct message composition with grouped teacher/staff recipient picker.
- **Multi-Account & Bilingual Support**: Seamless switching between Student and Parent accounts, full Polish (`PL`) and English (`EN`) localization with automatic subject/content translation, and Light / Dark / System themes.
- **Privacy First, Zero Paywalls**: Credentials and cached data remain on-device (`localStorage`), requests are proxied directly to Librus Synergia via stateless Server Actions with in-memory session pooling, and there is zero third-party analytics or tracking.

---

## Project Structure

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

---

## Tech Stack

- **Framework**: Next.js 15 (App Router & Server Actions)
- **UI & Runtime**: React 19, TypeScript 5
- **Styling**: Tailwind CSS 4 + CSS custom properties for native iOS Light/Dark tokens
- **PWA**: Web App Manifest & Service Worker for standalone iOS Home Screen installation

---

## Getting Started

### Prerequisites
- Node.js `>= 20.9.0`
- npm

### Installation & Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and sign in with your Librus Synergia (`Rodzic` or `Uczeń`) credentials.

### Production Build

```bash
npm run build
npm start
```
