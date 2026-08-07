# Office Quiz — Live Real-time Trivia (Kahoot-style)

A production-ready, real-time quiz web application for an office event with ~250 participants.
Built with **Next.js + React + Supabase**, with a dark-blue modern UI, mobile-first design,
realtime sync, server-validated answers, and a full admin dashboard.

## Features

### Participant flow
- Scan a QR code on the landing page → taken to the registration page
- Register with **Full Name**, **Team** (dropdown, 10 teams), **Roll Number**
- Roll number must be **unique within each team** (enforced by a DB unique constraint)
- After registering → **Waiting Room** ("Please wait. Quiz will begin shortly.")
- When the admin starts the quiz, participants are **automatically moved** to the quiz screen via Supabase Realtime (no refresh)

### Quiz screen
- One question active at a time, with **5 options (A–E)**
- Participants can answer **only once** (enforced server-side via a unique constraint + RPC)
- Question timer is **exactly 5 seconds**, counted down from a server timestamp
- When the timer hits zero, all buttons disable and the participant waits for the next question (no page refresh)

### Admin dashboard (`/admin`, password protected)
- **Participants Registered** count + **team-wise registration count**
- **Current Question** and **Current Timer**
- Control buttons: Start Registration · Close Registration · Start Quiz · Pause · Resume · Next · Previous · End Quiz · Reset Quiz
- **Question Manager**: add / edit / delete / reorder questions
- **Live Analytics** per question: total responses, correct, incorrect, no response, and A–E distribution
- **Leaderboards**: team + individual, descending
- **Export**: Participants, Answers, Individual leaderboard, Team leaderboard — as **CSV** or **Excel**

### Scoring
- Correct answer → individual +1 and team +1 (atomic, server-side)
- Incorrect → 0 points

### Security
- Duplicate registrations prevented (DB unique constraint on `team + roll_number`)
- Multiple answers prevented (DB unique constraint on `participant + question` + `submit_answer` RPC)
- Answers validated on the server by a `SECURITY DEFINER` RPC (`submit_answer`) that checks phase, active question, timer, and option validity
- Admin password stored in a server-only env var (`QUIZ_ADMIN_PASSWORD`), never shipped to the browser
- Supabase anon key is public by design; the service-role key is never used in client code

### Realtime
- All participants instantly receive: current question, timer, leaderboard updates, phase changes
- Uses Supabase Realtime (postgres_changes) — no manual refresh

## Database (Supabase)

Tables: `participants`, `questions`, `answers`, `quiz_state`, `team_scores`, `individual_scores`.
Row Level Security is enabled on every table. RPCs: `submit_answer`, `reset_quiz`.
Full schema is applied automatically as a Supabase migration via the MCP tooling during build.

## Admin access

The default admin password is `admin123` (set in `.env` as `QUIZ_ADMIN_PASSWORD`).
**Change it** before the event by editing `.env`:

```
QUIZ_ADMIN_PASSWORD=your-strong-password
```

## Pages

| Route | Purpose |
|------|--------|
| `/` | Landing page with the join QR code |
| `/register` | Participant registration |
| `/play` | Waiting room → live quiz screen (realtime) |
| `/leaderboard` | Public team + individual leaderboards (realtime) |
| `/admin` | Admin login |
| `/admin/dashboard` | Admin dashboard (controls, analytics, questions, leaderboard, export) |

## API routes

| Route | Purpose |
|------|--------|
| `POST /api/admin/login` | Verify admin password, set auth cookie |
| `POST /api/admin/logout` | Clear auth cookie |
| `POST /api/admin/action` | Run a quiz control action (start/pause/next/…) |
| `GET/POST /api/admin/questions` | List / create / update / delete / reorder questions |
| `GET /api/admin/export` | Export participants / answers / leaderboards as CSV or Excel |
| `GET /api/qr?url=…` | Generate a QR code SVG for a URL |

## Deployment (Netlify)

This project is configured for Netlify (`netlify.toml` + `@netlify/plugin-nextjs`).

1. Push the repository to GitHub.
2. Import the repo into Netlify.
3. Add these environment variables in Netlify (Site settings → Environment):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `QUIZ_ADMIN_PASSWORD` (choose a strong password)
4. Deploy. The build runs `next build` automatically.
5. Open the deployed URL — the landing page shows a QR code pointing to `/register`.

> The Supabase schema is already applied to the provisioned project. If you point the app at a
> fresh Supabase project, re-apply the migration in `app/…` (the SQL lives in the migration applied
> via the Supabase MCP tool). The schema is idempotent and safe to re-run.

## Local development

```bash
npm install
npm run dev
```

The dev server runs automatically in this environment — do not start it manually.

## Tech stack

- Next.js 13 (App Router) + React 18 + TypeScript
- Tailwind CSS + shadcn/ui + lucide-react icons
- Supabase (Postgres + Realtime + RPCs)
- Sonner for toasts
- Self-contained QR code generator (no external dependency)
