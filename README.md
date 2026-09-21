# Token Utilization Dashboard

A local dashboard for visualizing Claude API token usage, cost breakdown, and optimization recommendations — built for team leads managing Claude usage across their organization.

## What it does

- **Overview KPIs** — total tokens, estimated cost, active users, cache hit rate, and avg tokens per request vs. the previous period
- **Time-series chart** — daily token usage stacked by model (Haiku / Sonnet / Opus) over a rolling 30-day window
- **User breakdown** — per-user token consumption, cost, model preference, and trend vs. last period
- **Model mix analysis** — see if expensive models (Opus/Sonnet) are being used for tasks that Haiku could handle
- **Optimization recommendations** — rule-based flags for prompt caching, model right-sizing, and prompt length

## Data source

The backend reads your **local Claude Code usage logs** from `~/.claude/projects`. Each person who runs this app sees their own data. If no Claude Code logs are found, the app falls back to realistic mock data so all views are still functional.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python + FastAPI |
| Frontend | Next.js 14 + Tailwind CSS + Recharts |
| Data | Claude Code local logs (`~/.claude/projects`) or mock data |

## Prerequisites

- Python 3.8+
- Node.js 18+
- Claude Code CLI (optional — for real usage data)

## Setup & running

### Option 1 — One-command start (PowerShell)

```powershell
.\start.ps1
```

This opens two PowerShell windows: one for the backend, one for the frontend.

### Option 2 — Manual start

**Backend** (port 8080):

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

**Frontend** (port 3000):

```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser.

## API reference

The FastAPI backend auto-generates interactive docs at **http://localhost:8080/docs** once running.

Key endpoints:

| Endpoint | Description |
|---|---|
| `GET /api/overview?period=30d` | KPI cards + daily time-series |
| `GET /api/users?period=30d` | Per-user breakdown table |
| `GET /api/models?period=30d` | Model mix analysis |
| `GET /api/recommendations` | Optimization recommendations |

## Privacy note

This is a **local-only** app. The backend only accepts requests from `localhost:3000` and reads data from your own machine. No data is sent externally.

If you share this repo with a colleague, they will see their own Claude Code usage when they run it — not yours.

## Project structure

```
Token_Usage_Dashboard/
├── backend/
│   ├── main.py              # FastAPI app + all API routes
│   ├── claude_code_data.py  # Reads real usage from ~/.claude/projects
│   ├── mock_data.py         # Fallback mock data (10 users, 3 models, 30 days)
│   └── requirements.txt
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable UI components (charts, tables, cards)
│   └── package.json
├── start.ps1                # One-command startup script (Windows)
└── SPEC.md                  # Full product specification
```
