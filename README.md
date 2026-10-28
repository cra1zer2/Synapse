# Synapse

**Synapse** is a fast, clean, ad-free personal web app for the Polish **Librus Synergia** gradebook — built for **iPhone (iOS)**, **Android**, and desktop.

> **Disclaimer**: Synapse is an independent, unofficial open-source project and is **not** affiliated with or endorsed by Librus sp. z o.o. The author does not run any shared servers or collect any user data — your instance and credentials are 100% yours and local to your device. See the [Disclaimer & Privacy Notice](#disclaimer--privacy-notice) below.

### Why I Built This
After **Szkolny.eu** ended support — and was only ever on Android — iPhone users (and now everyone else) were left with a slow, ad-heavy official portal that locks basic features behind paywalls.

**Synapse** solves this. You can run it locally or host your own private copy for free on **Vercel**. Added to your **Home Screen on iOS or Android**, it runs in **fullscreen mode** like a native app.

Unlike **Szkolny.eu**, Synapse is also **extremely light on API requests** — often lighter than the official portal itself (for example, it uses **5x fewer requests** than the official website to fetch the week's *Lesson Topics / Zrealizowane lekcje*).

---

## Use on Your Phone (No Coding Required)

1. **Deploy your free private copy on Vercel**:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcra1zer2%2FSynapse)

   Sign in with GitHub and click **Create / Deploy** (no extra keys or settings needed). Vercel will give you your own private URL in ~1 minute.
2. **Add to Home Screen** (for fullscreen native look):
   - **iOS (Safari)**: Tap **Share** → **Add to Home Screen** (*Dodaj do ekranu początkowego*).
   - **Android (Chrome)**: Tap **⋮** → **Add to Home screen** / **Install app**.
3. **Log in** with your Librus Synergia (`Uczeń` or `Rodzic`) credentials.

---

## Features

- **Home Dashboard**: Current/next lesson, live bell countdowns, recent grades, attendance %, and unread messages.
- **Smart Timetable**: Merges double lessons, shows classrooms, and highlights substitutions, cancellations, and tests.
- **Weighted Averages (GPA)**: Instant semester/yearly weighted averages with a `+`/`-` modifier toggle — no paywalls.
- **Attendance & 1-Tap Excuses (*e-Usprawiedliwienia*)**: Excuse selected `NB` hours or full date ranges in one tap.
- **Messages (*Wiadomości*) & Announcements**: Read and send messages to teachers with a clean recipient picker.
- **Multi-Account & Bilingual**: 1-tap switch between Student/Parent accounts, **PL / EN** languages, and Light/Dark mode.
- **Ultra-Low Server Load**: Batch-fetches and caches locally instead of spamming background requests (e.g., 5x fewer requests for weekly lesson topics than the official portal).

---

## Running Locally (For Developers)

Requires **Node.js `>= 20.9.0`**. Built with **Next.js 15**, **React 19**, **TypeScript 5**, and **Tailwind CSS 4**.

```bash
npm install
npm run dev     # http://localhost:3000
```

---

## Disclaimer & Privacy Notice

- **Unofficial & Independent**: **Synapse** is an independent open-source project for personal and educational use. It is **not** affiliated with, endorsed by, or connected with **Librus sp. z o.o.** (*Librus* and *Librus Synergia* are trademarks of their respective holders).
- **Zero Data Collection (100% Yours & Local)**: The author does **not** run a central server and does **not** collect, store, or have access to your credentials or personal data. Your login details stay exclusively on your device (`localStorage`) and communicate only through your own local or Vercel instance.
- **Fully Open Source & Auditable**: No hidden trackers or analytics — the entire codebase is right here in this repository for anyone to inspect and verify.
- **No Liability**: Provided **"as is"**, without warranty of any kind. The author takes no responsibility or liability for any issues arising from the use of this software; you use it entirely at your own risk.
