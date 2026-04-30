# AuroraAI — Frontend & Backend Plan

## Current State Assessment

### Frontend — What actually exists

**Working:**
- 3 NOAA API fetches on mount (Kp, magnetometer, plasma)
- Kp display + STORM/QUIET badge
- Solar wind panel (Bz, Speed, Density)
- Probability ring + aurora latitude bands render

**Broken / Fake:**
- `prediction = kpVal > 4 ? 78 : 12` — not AI, just an if-statement. The UI lies and says "AWS SageMaker XGBoost"
- Latitude band math `kpVal * 10%` is wrong — each latitude has a different Kp threshold, not a linear scale
- `[cite: 13, 16, 41]` artifacts sitting raw in the JSX text (line 72) — visible to users
- `app-container` class on the outer div doesn't exist in App.css — no styling applied to root wrapper
- `index.css` is the Vite default template (light theme, `text-align: center`, `width: 1126px` on `#root`) — directly conflicts with App.css dark theme; cards have centered text because of this
- NOAA Scales section: hardcoded `—`
- 7-Day History: placeholder text
- Dst Index: placeholder `— nT`
- No auto-refresh — data loads once and goes stale
- Errors silently swallowed — blank values with no UI indication

**Backend:** Does not exist. Zero files.

---

## The Plan

### Phase A — Fix the Frontend (what's already there)

These are bugs and broken things, fix before adding anything new.

**A1. CSS conflict fix**
`index.css` `#root` has `text-align: center` and `width: 1126px` from the Vite template. Override it in `App.css` or clean `index.css` so card contents aren't center-aligned.

**A2. Remove [cite: ...] artifacts**
Line 72 in App.jsx — leftover AI citation markers visible in the UI.

**A3. Add `.app-container` style**
The outer `<div className="app-container">` has no CSS rule. Add it (full width, `background: var(--bg)`, `min-height: 100vh`).

**A4. Fix auto-refresh**
Add `setInterval(loadData, 60000)` inside `useEffect` with proper cleanup. Space weather changes every minute — loading once on mount is useless.

**A5. Add error state**
Instead of `catch(e) { console.error(e) }`, set an error flag in state and show a "Data unavailable" message in the UI.

**A6. Fix latitude band thresholds**
The real Kp–latitude mapping from NOAA:

| Latitude | Kp threshold |
|---|---|
| 65°N | Kp ≥ 3 |
| 60°N | Kp ≥ 4 |
| 55°N | Kp ≥ 5 |

Replace `kpVal * 10%` with `Math.min(100, Math.max(0, (kpVal - threshold) * 20))%` per band.

**A7. Wire up NOAA Scales**
The Kp value maps directly to NOAA G-scale. The data is already fetched — just derive the label client-side:

```
Kp 0–4   → "G0 (None)"
Kp 5–5.9 → "G1"
Kp 6–6.9 → "G2"
Kp 7–7.9 → "G3"
Kp 8–8.9 → "G4"
Kp 9     → "G5"
```

**A8. Wire up 7-day Kp history chart**
NOAA already provides this at `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json` (same endpoint, just use the full array not the last element). Chart.js and react-chartjs-2 are already installed — render a time-series line chart. Sample data available locally in `temp_data/noaa-planetary-k-index-forecast-*.json` to develop against.

---

### Phase B — Build the Backend

A backend is needed for two reasons: (1) to run real ML inference, (2) to avoid CORS issues and hide API orchestration from the browser.

**Stack: FastAPI (Python)**
One language for both the API server and ML models. Simple to run locally, straightforward to deploy to any cloud.

**B1. Project structure**

```
CloudAI/
├── aurora-ai-frontend/     (existing)
└── aurora-ai-backend/
    ├── main.py             (FastAPI app)
    ├── routes/
    │   ├── live.py         (current solar wind data)
    │   ├── history.py      (7-day Kp history)
    │   └── predict.py      (ML inference endpoint)
    ├── services/
    │   ├── noaa.py         (NOAA API client, shared fetch logic)
    │   └── model.py        (load + run ML model)
    ├── models/             (trained .pkl / .pt files go here)
    └── requirements.txt
```

**B2. Endpoints**

| Endpoint | Returns | Notes |
|---|---|---|
| `GET /api/live` | `{kp, bz, speed, density, noaa_scale, timestamp}` | Proxies NOAA, normalizes fields |
| `GET /api/history` | Array of `{time_tag, kp, observed}` | Last 7 days from NOAA forecast JSON |
| `GET /api/predict` | `{probability, storm_class, horizon_1h, horizon_3h, horizon_6h}` | Runs model; returns placeholder until Phase I/II are trained |
| `GET /api/forecast` | 3-day Ap + Kp outlook | Parses the NOAA text forecast file |
| `GET /health` | `{status: "ok"}` | Uptime check |

**B3. Frontend → Backend wiring**
Replace the three direct NOAA fetches in App.jsx with a single `fetch('/api/live')`. Vite proxy (`vite.config.js`) routes `/api/*` to `localhost:8000` during dev — no CORS issues, no URL changes in prod.

**B4. Placeholder predict endpoint**
Before models exist, `/api/predict` returns a rules-based response (same `kpVal > 4` logic, but honest about it being a placeholder). This lets the frontend be wired end-to-end now so that dropping in a real model later is just swapping `model.py`.

---

### Phase C — ML Models (the real work)

**C1. Data collection script** (do this first, it runs while you build B)

```python
# services/collect.py
# Polls NOAA every 5 min, appends to data/solar_wind.csv
# Columns: timestamp, bz, speed, density, kp
```

Backfill using NOAA's historical archive at `https://www.ngdc.noaa.gov/geomag/data/` — years of data available.

**C2. Phase I — Binary classifier**

```
data/solar_wind.csv
        ↓
feature_engineering.py
  - 30-min rolling mean/std of Bz, speed, density
  - Rate of change (delta) features
  - Label: kp >= 5 → 1, else 0
        ↓
train_classifier.py
  - Logistic Regression (baseline)
  - Random Forest
  - XGBoost  ← likely winner
  - class_weight='balanced' on all
  - Temporal train/val/test split (no shuffle)
  - Metric: F1 on storm class
        ↓
models/classifier.pkl
```

**C3. Phase II — LSTM regressor**

```
Same features, sequence format
        ↓
train_lstm.py (PyTorch)
  - Input: [batch, 60 timesteps, 5 features]
  - LSTM(hidden=128, layers=2)
  - Attention layer
  - Output: [Kp_t+1, Kp_t+3, Kp_t+6]
  - Custom loss: MSE + 2× penalty for under-predicting Kp > 5
        ↓
models/lstm.pt
```

**C4. Wire models to `/api/predict`**
Load models once on startup in `model.py`. Endpoint fetches latest 60 minutes of solar wind from NOAA, runs features, returns predictions. Replace the placeholder.

---

### Phase D — Remaining Dashboard Features

Only tackle these once Phase B is live (backend wired):

| Feature | Source | Complexity |
|---|---|---|
| Dst Index panel | `https://services.swpc.noaa.gov/json/geospace/geospace_dst_7_day.json` | Low — add endpoint + render |
| Ovation aurora spatial map | `ovation_aurora_*.json` (900KB grid) | Medium — needs Leaflet.js or canvas heatmap |
| 3-day outlook section | NOAA text forecast (already in temp_data) | Medium — parse Ap + probabilities |
| Alert system | Compare Kp to threshold | Low — show banner when Kp ≥ 5 |

---

## Priority Order

```
A1–A5  Fix current bugs           (1–2 hours, do now)
A6–A8  Extend what's working      (2–3 hours)
B1–B4  Build FastAPI backend      (4–6 hours)
C1     Start data collection      (1 hour to set up, runs passively)
C2     Phase I classifier         (after ~2 weeks of data, or use NOAA archive)
C3     Phase II LSTM              (after Phase I working)
C4     Wire real models to API    (few hours)
D      Remaining dashboard panels (parallel with C, low priority)
```

The most important thing right now: **fix the lying UI** (remove the SageMaker claim + fake prediction) and **build the backend skeleton** so everything has a real data contract before model training starts.
