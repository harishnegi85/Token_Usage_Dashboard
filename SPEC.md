# Token Utilization Dashboard — Product Specification

**Version:** 0.1 (Draft)  
**Owner:** Harish Negi  
**Audience:** Team leads managing Claude usage at Accenture

---

## 1. Problem Statement

Teams using Claude (via Claude.ai or Claude Code CLI) have no centralized view of:
- How many tokens are being consumed and by whom
- What it's costing the organization
- Whether tokens are being used efficiently (right model, prompt caching, concise prompts)

The result: budget surprises, no optimization feedback loop, and no data to guide model selection decisions.

---

## 2. Goals

| Priority | Goal |
|----------|------|
| P0 | Visibility into token spend per user and team |
| P0 | Trend analysis over time (daily / weekly / monthly) |
| P1 | Model mix breakdown (are expensive models used appropriately?) |
| P1 | Optimization recommendations with estimated savings |
| P2 | Budget alerts and forecasting |

---

## 3. User Personas

### Team Lead (primary)
- Needs a team-level rollup view
- Wants to know which users are driving cost
- Wants actionable recommendations, not raw numbers
- Checks weekly, not daily

### Individual Contributor (secondary, future)
- Wants to see their own usage
- Wants to understand if their prompts are efficient

---

## 4. Data Sources

The dashboard ingests from **Anthropic's admin console**. Two possible formats depending on org plan:

| Format | Granularity | Notes |
|--------|-------------|-------|
| CSV Export (manual) | Daily totals per user per model | Available in Claude.ai admin console |
| Usage API (`/v1/usage`) | Per-request (if available) | More detailed; needs API key with admin scope |

**Design principle:** The backend normalizes both formats into the same internal schema so the UI is data-source agnostic.

### Internal Schema (normalized)

```
usage_record:
  - date          (YYYY-MM-DD)
  - user_id       (email or anonymized ID)
  - model         (claude-haiku-4-5, claude-sonnet-4-6, claude-opus-4-8, etc.)
  - input_tokens  (integer)
  - output_tokens (integer)
  - cache_read_tokens    (integer, optional)
  - cache_write_tokens   (integer, optional)
  - request_count (integer)
  - estimated_cost_usd (float, computed)
```

---

## 5. Features

### 5.1 Overview Dashboard (Home)

**KPI Cards (current period vs. previous period):**
- Total tokens consumed (input + output)
- Estimated cost ($USD)
- Active users
- Cache hit rate (% of input tokens served from cache)
- Avg tokens per request

**Time-series chart:**
- Daily token usage stacked by model over rolling 30 days
- Toggle between tokens and cost view

**Quick insights bar:**
- "3 users account for 60% of spend this week"
- "Cache hit rate dropped 12% vs. last week"

---

### 5.2 User Breakdown View

**Table columns:**
- User email / name
- Total tokens (input + output)
- Estimated cost
- Primary model used
- Cache hit rate
- Requests count
- Trend vs. last period (up/down arrow)

**Drill-down per user:**
- Daily usage chart
- Model mix pie chart
- Top optimization flags (see §5.4)

---

### 5.3 Model Mix Analysis

**Why this matters:** Claude Haiku costs ~20x less than Opus. Teams default to the most capable model even for simple tasks.

**Visualization:**
- Stacked bar: tokens by model per user per week
- Pie chart: % of total cost by model

**Recommendation signal:**
- If a user's output tokens are short (< 200 avg) and requests are high-frequency → likely a Haiku candidate
- If input tokens are consistently > 10k → check for prompt caching eligibility

---

### 5.4 Optimization Recommendations

Each recommendation includes: **finding**, **impact estimate**, **action**.

| Recommendation | Trigger Condition | Estimated Saving |
|---------------|-------------------|-----------------|
| Enable prompt caching | cache_hit_rate < 10% AND input_tokens > 2000 avg | Up to 90% on repeated context |
| Right-size model | avg output < 300 tokens AND using Sonnet/Opus | 10–20x cost reduction |
| Shorten system prompts | avg input_tokens > 8000 with low cache rate | 30–50% input cost |
| Batch similar requests | high request_count with low token-per-request | Reduces per-call overhead |

**Recommendations surface:**
- A dedicated "Optimization" page with ranked recommendations
- Inline flags on user rows in the breakdown table
- A "Potential monthly savings" figure at the top

---

### 5.5 Budget & Forecasting (P2)

- Set a monthly budget per team
- Progress bar showing % consumed
- Linear projection to end-of-month
- Email/webhook alert at 80% and 100% thresholds

---

## 6. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Backend API | Python + FastAPI | Lightweight, async, easy to extend |
| Database | SQLite (prototype) → PostgreSQL (prod) | No-infra start; migrate when needed |
| Frontend | Next.js (React) + Tailwind CSS | Fast iteration, good charting ecosystem |
| Charts | Recharts or Chart.js | Simple, React-native |
| Auth | None (prototype) → NextAuth.js (prod) | Start simple |
| Data sync | Manual CSV upload UI + scheduled cron job | Covers both manual and automated ingest |

---

## 7. Prototype Scope (Phase 1)

The prototype will use **mock data** to demonstrate all views before real data is wired in.

**Included in prototype:**
- [ ] Mock data generator (realistic 30-day usage for 10 users, 3 models)
- [ ] Overview dashboard with KPI cards and time-series chart
- [ ] User breakdown table with drill-down
- [ ] Model mix chart
- [ ] Optimization recommendations page (rule-based)

**Not in prototype:**
- Real data ingestion (CSV upload or API)
- Authentication
- Budget alerts
- Email notifications

---

## 8. Open Questions

1. **Data access:** What granularity does the Anthropic admin console export provide for your org? (Per-request vs. daily aggregates)
2. **User identity:** Are users identified by email or an anonymized ID in exports?
3. **Multi-team:** Is this for one team or multiple teams across the org?
4. **Cost model:** Do you have the exact pricing for the models your team uses, or should we pull from published Anthropic pricing?
5. **Hosting:** Where will this run? Internal server, Azure, or local-only for now?

---

## 9. Success Metrics

- Team leads can answer "who is our top spender this week" in < 30 seconds
- At least one optimization recommendation acted on per team per month
- Monthly token cost growth rate slows after 90 days of dashboard usage

---

*Next step: Review open questions, then build prototype with mock data.*
