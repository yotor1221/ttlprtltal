# VortexPower UK — Day-Ahead Wind & Procurement Portal

**Client context.** A UK energy utility day-ahead trading desk buying from wholesale power markets (EPEX SPOT / N2EX) must balance volatile renewable wind generation against a consumer demand baseline. Mistimed or overstated wind forecasts force inefficient thermal peaking buys and raise imbalance cash-out exposure.

**What this portal does.** VortexPower UK ingests official Elexon Insights (BMRS) wind actuals and day-ahead forecasts for January 2026, matches them under a strict Day-Ahead Market (DAM) gate-closure cutoff (zero look-ahead leakage), and surfaces quantified forecast-error analytics plus implied thermal procurement for every half-hour settlement period.

| Resource | Link |
| --- | --- |
| Live application | [Live App URL](https://vortex-theta-eight.vercel.app/) |
| Walkthrough | [10-Minute Demo Video](https://youtu.be/sJTphhhxDB0) |

> **Reviewer note:** Open the live demo in an **incognito / private** window so cached sessions, extensions, or prior auth state do not affect verification.

---

## Domain Architecture & Business Logic

### Market timing — DAM gate closure

For delivery on day **D**, day-ahead positions lock by **11:00 UTC on day D−1**. Any forecast published after that cutoff was not available to the desk at decision time and must not enter the matched series.

### Zero data-leakage matching

For each half-hour actual from `FUELHH`:

1. Set delivery date \(D\) from the period’s `startTime`.
2. Compute cutoff = **D−1 at 11:00:00 UTC**.
3. Filter `WINDFOR` rows where `startTime == target_time` **and** `publishTime <= cutoff`.
4. Select the forecast with the **latest** `publishTime` among those eligible (freshest pre-gate information).
5. Persist `error_mw = forecast_mw − actual_mw` (positive ⇒ over-forecast).

This logic lives in `backend/app/services/processor.py` and is covered by unit tests for cutoff boundaries, post-cutoff exclusion, and January 1 edge cases.

### Data source

Official **Elexon Insights Solution (BMRS)** streams for **January 2026**:

| Stream | Role |
| --- | --- |
| `FUELHH` | Half-hourly wind generation **actuals** |
| `WINDFOR` | Day-ahead wind **forecasts** (with publish timestamps) |

Live ingestion uses `https://data.elexon.co.uk/bmrs/api/v1`. Offline or CI-friendly runs can seed from an embedded mock fixture (`--mock`) with the same settlement-period shape.

### Quantified error analytics

Across all **48 half-hour settlement periods** (and the full January cohort where applicable):

| Metric | Definition |
| --- | --- |
| Error | \(\text{Error} = \text{Forecast} - \text{Actual}\) |
| MAE | Mean Absolute Error |
| RMSE | Root Mean Squared Error |
| Mean bias | Mean signed error (systemic directional skew) |
| Over- / under-forecast % | Share of periods with \(\text{Error} > 0\) vs \(\text{Error} < 0\) |
| Implied net thermal procurement | \(\max(0,\ \text{Demand Baseline} - \text{Forecasted Wind})\) |

Default demand baseline is **25,000 MW** (overridable per daily API request). Implied thermal and “actual thermal needed” are computed period-by-period so traders can compare procurement intent vs realised wind shortfall.

---

## Directory & File Structure

```text
forcast/
├── docker-compose.yml          # Orchestrates API (:8000) + Nginx UI (:3000)
├── .gitignore
├── README.md                   # This document
│
├── backend/
│   ├── Dockerfile              # Multi-stage Python 3.11 image; uvicorn entrypoint
│   ├── docker-compose.yml      # Backend-only Compose helper (optional)
│   ├── requirements.txt        # FastAPI, SQLAlchemy, pandas, httpx, …
│   ├── seed_data.py            # CLI: live BMRS or --mock seed into SQLite
│   ├── data/
│   │   └── wind_analytics.db   # Local SQLite store (settlement_records)
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, lifespan auto-seed, /health
│   │   ├── config.py           # Settings (DB URL, Elexon base, baseline MW)
│   │   ├── database.py         # Engine, sessions, init_db
│   │   ├── models.py           # SQLAlchemy SettlementRecord ORM
│   │   ├── schemas.py          # Pydantic response / request models
│   │   ├── fixtures/
│   │   │   ├── __init__.py
│   │   │   └── mock_data.py    # Deterministic Jan 2026 mock settlement rows
│   │   ├── routers/
│   │   │   ├── daily.py        # GET /api/v1/daily/{date}
│   │   │   └── metrics.py      # GET overview + error-profile
│   │   └── services/
│   │       ├── elexon_client.py  # Async BMRS FUELHH / WINDFOR client
│   │       ├── processor.py      # Gate-closure matching (zero leakage)
│   │       └── analytics.py      # MAE/RMSE/bias, diurnal & histogram profiles
│   └── tests/
│       ├── conftest.py         # Test DB + TestClient fixtures
│       ├── test_matching.py    # Unit tests: cutoff, selection, error signs
│       └── test_api.py         # Integration tests: health, daily, analytics
│
└── frontend/
    ├── Dockerfile              # Vite build → Nginx static serve
    ├── nginx.conf              # SPA routing + /api proxy to backend
    ├── package.json            # React 19, Recharts, Tailwind 4, Vite
    ├── vite.config.ts          # Dev server :3000 with /api → :8000 proxy
    ├── index.html
    ├── public/                 # Favicon / static icons
    └── src/
        ├── main.tsx            # React bootstrap
        ├── App.tsx             # Shell: Procurement Desk + Accuracy Lab
        ├── index.css           # Global + Tailwind entry
        ├── api/
        │   ├── client.ts       # Typed fetch helpers for /api/v1/*
        │   └── types.ts        # Shared TS interfaces mirroring API schemas
        └── components/
            ├── Header.tsx
            ├── MetricCard.tsx
            ├── ProcurementDesk/   # Date controls, dispatch & imbalance charts, table
            └── AccuracyLab/       # Monthly KPIs, diurnal chart, error histogram
```

---

## Getting Started & How to Run

### Prerequisites

- **Python** 3.11+
- **Node.js** 18+
- **Docker** & **Docker Compose** (for the recommended path)

### Option 1 — Docker Compose (recommended)

From the repository root:

```bash
docker compose up --build
```

This builds and starts:

| Service | Host access | Role |
| --- | --- | --- |
| `backend` | http://localhost:8000 | FastAPI + SQLite; OpenAPI at `/docs` |
| `frontend` | http://localhost:3000 | React SPA served by Nginx (proxies `/api` to the backend) |

On first start with an empty database, the API lifespan task seeds from live BMRS and falls back to mock data if the network call fails.

### Option 2 — Local development

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install pytest                 # test runner (dev)

# Seed January 2026 data
python seed_data.py --mock         # offline / reproducible
# or: python seed_data.py          # live Elexon BMRS (falls back to mock on failure)
# or: python seed_data.py --force --mock   # wipe & re-seed

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                        # http://localhost:3000 (Vite proxies /api → :8000)
```

### Running the test suite

```bash
cd backend
pytest tests/ -v
```

**12 automated tests** (unit + integration) verify gate-closure matching, post-cutoff exclusion, January 1 boundary behaviour, error sign conventions, and API schemas for health, overview, daily (including custom demand baseline), and error-profile endpoints.

---

## API Reference

Base URL (local): `http://localhost:8000`

| Method | Endpoint | Query params | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | — | Liveness, total settlement records, period covered (`2026-01`), data completeness % |
| `GET` | `/api/v1/metrics/overview` | — | Month-level MAE, RMSE, mean bias, MWh totals, over-/under-forecast %, extrema, completeness |
| `GET` | `/api/v1/daily/{date}` | `demand_baseline_mw` (default `25000`) | 48 half-hour rows for a date in `2026-01-01`…`2026-01-31`, daily MAE/RMSE/bias, implied vs actual thermal MW |
| `GET` | `/api/v1/analytics/error-profile` | — | Diurnal mean error by settlement period + error distribution histogram |

Interactive docs: http://localhost:8000/docs

---

## AI Tools Disclosure

This submission used AI assistance transparently:

| Tool | Role |
| --- | --- |
| **GitHub Copilot** | Inline completion while iterating on services and UI |
| **Gemini / Claude** | Broader drafting of schemas, FastAPI scaffolding, and Tailwind layouts |

**Scope of assistance**

- Accelerating BMRS-oriented data schema modelling
- Drafting boilerplate FastAPI endpoints and Pydantic models
- Formulating Tailwind / React component layouts (Procurement Desk, Accuracy Lab)
- Helping author and verify edge-case matching unit tests

**Human oversight**

Domain gate-closure cutoff logic, zero-leakage forecast selection, and quantitative error / thermal-procurement modelling were designed, verified, and reviewed directly by the engineering team. Automated tests lock those invariants for regression safety.

---

## Anonymity & Submission Compliance

- Author identity is withheld per assessment anonymity requirements; do not infer personal details from tooling metadata or commit history for scoring.
- Prefer verifying the **live demo** and **unlisted demo video** links in the header once populated.
- When scoring the deployed UI, use an **incognito / private** browser session and a clean cache.
- Reproduce analytics locally with `docker compose up --build` or the seed + test commands above if the hosted environment is unavailable.
