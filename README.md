# Progress Tracker

Next.js app to track daily progress with scheduled routine tasks, per-day extra tasks, scoring, and charts.

## Features

- Progress grid (day / week / month) with checkboxes
- Scheduled tasks (daily routine) + extra tasks (bonus, 2pts)
- Dashboard with timeline and pie charts
- Settings tab — demo data on by default, toggle to use MongoDB
- MongoDB via Mongoose (collections + indexes auto-created)
- Vercel-ready

## MongoDB schema (auto-created)

| Collection | Fields |
|------------|--------|
| `scheduledtasks` | name, sortOrder, isActive, createdAt, updatedAt |
| `completions` | scheduledTaskId, date (YYYY-MM-DD), completed |
| `extratasks` | name, date, completed, createdAt, updatedAt |

Indexes are synced on first database connection — no manual schema setup needed.

## Local setup

```bash
npm install
copy .env.example .env
# Edit .env — add MONGODB_URI with /daily-scheduler database name
npm run dev
```

Open http://localhost:3000

**Demo data is ON by default.** Go to **Settings** → **Turn off demo — use real database** when ready.

## Vercel deployment

1. Push repo to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGODB_URI` | Yes (for live data) | Include `/daily-scheduler` in URI |
| `CLOUDINARY_*` | No | Optional, for future uploads |

4. MongoDB Atlas → **Network Access** → allow `0.0.0.0/0` (serverless IPs)
5. Deploy

Health check: `GET /api/health` (send `x-demo-mode: false` header to test DB)

## Scoring

| Type | Points |
|------|--------|
| Scheduled | 1 pt |
| Extra | 2 pts |

## Tech stack

- Next.js 15, TypeScript, Tailwind CSS
- MongoDB + Mongoose
- Recharts, date-fns
- Cloudinary SDK (optional)
