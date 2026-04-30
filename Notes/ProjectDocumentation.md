# AuroraAI — Full Project Documentation

**Author:** Deydeepya (GitHub: codingsanji)
**Last updated:** 2026-04-29
**Status:** Early Prototype — Frontend live, ML pipeline not yet implemented

---

## Table of Contents

1. [What Is This Project](#1-what-is-this-project)
2. [Repository Structure](#2-repository-structure)
3. [Data Sources & Key Variables](#3-data-sources--key-variables)
4. [Phase I — Binary Classification](#4-phase-i--binary-classification)
5. [Phase II — Temporal Kp Regression](#5-phase-ii--temporal-kp-regression)
6. [Phase III — CloudAI Dashboard](#6-phase-iii--cloudai-dashboard)
7. [Full Pipeline Architecture](#7-full-pipeline-architecture)
8. [Tech Stack](#8-tech-stack)
9. [How Each Part Connects](#9-how-each-part-connects)
10. [Current Plan Status](#10-current-plan-status)
11. [Recommendations](#11-recommendations)

---

## 1. What Is This Project

AuroraAI is a multi-phase machine learning project for **geomagnetic storm and aurora forecasting**. It bridges heliophysics data (solar wind, magnetic field measurements from NASA/NOAA satellites) with predictive analytics to answer two questions:

- **Will a storm happen?** (binary: Kp ≥ 5 threshold)
- **How intense will it be?** (regression: exact Kp value at t+1h, t+3h, t+6h)

The end goal is a real-time web dashboard that ingests live NOAA space weather data, runs trained ML models, and displays aurora visibility predictions by latitude band — eventually backed by AWS SageMaker for model inference.

---

## 2. Repository Structure

```
AuroraAI/
├── README.md                          — Top-level project overview
├── Notes/
│   ├── Aurora.md                      — Background: what aurora/geomagnetic storms are
│   ├── Requirements.md                — (empty placeholder)
│   └── ProjectDocumentation.md        — This file
├── BinaryClassification/
│   └── README.MD                      — Phase I specification (no code yet)
├── Time_SeriesRegression/
│   └── README.MD                      — Phase II specification (no code yet)
└── CloudAI/
    ├── README.md                      — (empty)
    ├── temp_data/                     — Sample NOAA data files for development
    │   ├── 3-day-geomag-forecast-2742026.txt
    │   ├── noaa-planetary-k-index-forecast-2742026.json
    │   └── ovation_aurora_2742026.json   (900 KB spatial grid)
    └── aurora-ai-frontend/            — React/Vite web app (implemented)
        ├── package.json
        ├── vite.config.js
        ├── index.html
        └── src/
            ├── main.jsx
            ├── App.jsx                — Main dashboard component
            ├── App.css                — Dashboard styles + aurora animations
            └── index.css              — Global CSS variables and theming
```

---

## 3. Data Sources & Key Variables

### Live API Endpoints (NOAA SWPC)

| Endpoint | What it provides | Update frequency |
|---|---|---|
| `planetary_k_index_1m.json` | Kp index (planetary disturbance 0–9 scale) | 1-minute |
| `rtsw_mag_1m.json` | Magnetometer data — Bz component | 1-minute |
| `rtsw_plasma_1m.json` | Solar wind speed, proton density | 1-minute |

### Sample Data (temp_data/)

| File | Content |
|---|---|
| `3-day-geomag-forecast-*.txt` | NOAA text forecast: Ap index, storm probabilities, 3-hour Kp forecasts |
| `noaa-planetary-k-index-forecast-*.json` | 97 data points across observed/estimated/predicted windows (2026-04-20 to 2026-04-30) |
| `ovation_aurora_*.json` | 900 KB spatial probability grid — aurora visibility by geographic coordinates |

### Key Physical Variables

| Variable | Meaning | Why it matters |
|---|---|---|
| **Kp Index** | Planetary geomagnetic disturbance, scale 0–9 | Primary target variable; Kp ≥ 5 = storm |
| **Bz (GSM)** | Z-component of interplanetary magnetic field | When Bz turns strongly negative (southward), it couples with Earth's magnetosphere and drives storms |
| **Solar wind speed** | Velocity of charged particles from the Sun (km/s) | Higher speed → stronger energy transfer |
| **Proton density** | Number of protons per cm³ | Dense solar wind compresses magnetosphere |
| **Ap index** | Daily averaged version of Kp | Used in 3-day forecast text files |
| **NOAA G-Scale** | G1 (Kp 5–6) through G5 (Kp 9) | Public-facing storm severity classification |
| **Dst index** | Disturbance storm-time index | Measures ring current intensity; companion metric to Kp |

### Forecast Thresholds

- **Kp ≥ 5** → Binary storm label (Phase I)
- **Kp 5–6** → NOAA G1 (minor storm, aurora visible at ≥ 65°N)
- **Kp 7–8** → NOAA G3 (aurora visible as far south as ≥ 50°N)
- **Kp 9** → NOAA G5 (extreme, aurora visible at mid-latitudes)

---

## 4. Phase I — Binary Classification

**Goal:** Predict whether a geomagnetic storm will occur — specifically whether Kp will cross **Kp ≥ 5** within the next observation window.

### Data Pipeline (Planned)

```
NOAA SWPC 1-minute solar wind data
        ↓
  Data Ingestion
  (Bz, Speed, Density at 1-min cadence)
        ↓
  Feature Engineering
  - Rolling mean / rolling std over windows (e.g., 30-min, 1-hr, 3-hr)
  - Momentum features (rate of change of Bz, speed)
  - Lag features
        ↓
  Labeling
  - 0: Kp < 5  (quiet / unsettled)
  - 1: Kp ≥ 5  (storm / aurora likely)
        ↓
  Class Imbalance Handling
  (storms are rare events → SMOTE or class weights)
        ↓
  Train / Validate / Test Split
        ↓
  Model Training
        ↓
  Evaluation
```

### Planned Models

| Model | Why it's included |
|---|---|
| **Logistic Regression** | Interpretable baseline; coefficient magnitudes reveal feature importance |
| **Random Forest** | Captures non-linear interactions between Density and Speed; robust to outliers |
| **XGBoost** | Highest precision for rare event detection; gradient boosting handles imbalanced data well |

### Evaluation Metrics

- **F1-Score** (primary) — balances precision and recall for the rare storm class
- **Precision-Recall Curve** — more informative than ROC-AUC when positive class is rare
- Accuracy intentionally deprioritized (a model predicting "no storm" always would score ~95%+ accuracy but be useless)

---

## 5. Phase II — Temporal Kp Regression

**Goal:** Move beyond binary classification to quantitative forecasting — predict the exact Kp index magnitude at **t+1h, t+3h, and t+6h** ahead.

### Why LSTM

The Kp index exhibits **temporal dependencies** that simple regression can't capture:

- A solar flare's effect on Earth's magnetosphere can take 1–3 days to arrive
- The magnetosphere has "hysteresis" — its response depends on cumulative solar wind history, not just the current instant
- Short bursts of southward Bz are more dangerous than prolonged moderate values

LSTMs address all of this: gated memory cells preserve long-range dependencies while forgetting irrelevant history, solving the vanishing gradient problem that plagues vanilla RNNs.

### Architecture (Planned)

```
Input: 3D tensor  →  [samples, time_steps, features]
                       features = [Bz, Speed, Density, ...]

        ↓
  LSTM Layer(s)
  - Hidden state carries magnetospheric "memory"
  - Cell state preserves long-term solar context (48+ hours)

        ↓
  Attention Mechanism
  - Learns to weight sudden Bz spikes more than steady background wind
  - Produces a context vector highlighting the most predictive timesteps

        ↓
  Dense Output Layer
  - 3 outputs: Kp(t+1h), Kp(t+3h), Kp(t+6h)

        ↓
  Custom Loss Function
  - Base: Mean Squared Error
  - Penalty: additional cost for under-predicting high-intensity events
    (a model that misses a G4 storm is worse than one that false-alarms)
```

### Preprocessing Steps

- **StandardScaler** applied to all inputs (handles wide variance: density ranges 1–100 particles/cm³, speed ranges 300–900 km/s)
- Sequence windowing: slide a fixed-length window across the time series to create training samples
- Train/val/test split respecting temporal order (no data leakage by shuffling)

---

## 6. Phase III — CloudAI Dashboard

This is the only implemented component. It is a React/Vite single-page application that connects to live NOAA APIs and renders a real-time space weather dashboard.

### What It Does Today

1. On load, fetches three NOAA endpoints in parallel (`Promise.all`)
2. Extracts the latest Kp, Bz, solar wind speed, and proton density
3. Applies a **hardcoded threshold rule** (`kpVal > 4 ? 78 : 12`) to display a "storm probability" percentage
4. Renders a dark-mode dashboard with:
   - Current Kp Index and STORM/QUIET status badge
   - Solar wind metrics panel (Bz, Speed, Density)
   - Animated probability ring (conic-gradient CSS)
   - Aurora latitude bands at 65°N, 60°N, 55°N (widths scaled to Kp × 10%)
   - Placeholder sections for 7-day history and Dst Index

### What Is Placeholder / Not Wired Up

- **SageMaker inference** — mentioned in the UI text but no backend call exists
- **7-Day History chart** — marked "Next" in the code (line 89, App.jsx)
- **Dst Index** — hardcoded `— nT`
- **Ovation aurora spatial data** — the 900 KB JSON file is not consumed anywhere
- **Auto-refresh** — data loads once on mount; no polling interval set
- **Error handling UI** — errors are silently swallowed (`console.log` only)

### Design System

| CSS Variable | Value | Role |
|---|---|---|
| `--bg` | `#0b1020` | Page background (deep space navy) |
| `--panel` | `#131a33` | Card background |
| `--accent` | `#7bd3ff` | Primary accent (cyan) |
| `--aurora-1` | `#3ddc84` | Aurora green |
| `--aurora-2` | `#7bd3ff` | Aurora blue |
| `--aurora-3` | `#bc7fff` | Aurora purple |

Responsive: 12-column CSS grid, collapses to single column at < 900px.

---

## 7. Full Pipeline Architecture

### Current (Implemented)

```
NOAA SWPC Live APIs
        ↓
  Browser fetch (App.jsx useEffect, Promise.all)
        ↓
  React state update (useState → setMetrics)
        ↓
  Hardcoded threshold rule
        ↓
  Dashboard render (Chart.js + CSS animations)
```

### Planned (End State)

```
NOAA SWPC 1-minute solar wind streams
        ↓
  Python ingestion script
  (poll APIs, store to time-series DB or S3)
        ↓
  Feature Engineering module
  (rolling windows, lag features, StandardScaler)
        ↓
  ┌─────────────────────┐    ┌────────────────────────────┐
  │ Phase I: XGBoost    │    │ Phase II: LSTM + Attention  │
  │ Binary Kp ≥ 5 flag  │    │ Kp forecast: t+1h/t+3h/t+6h│
  └─────────────────────┘    └────────────────────────────┘
              ↓                          ↓
         AWS SageMaker endpoint (REST inference API)
                          ↓
            Backend API server (not yet designed)
                          ↓
            CloudAI React Dashboard
            - Real predictions replacing hardcoded values
            - 7-day Kp history chart
            - Dst Index panel
            - Ovation aurora spatial map
            - Auto-refresh every 60 seconds
```

---

## 8. Tech Stack

### Implemented (Frontend)

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.5 | UI component framework |
| Vite | 8.0.10 | Dev server and build tool |
| Chart.js | 4.5.1 | Time-series and metric charts |
| react-chartjs-2 | 5.3.1 | React bindings for Chart.js |
| chartjs-adapter-date-fns | 3.0.0 | Date axis formatting |
| date-fns | 4.1.0 | Date manipulation utilities |
| Axios | 1.15.2 | HTTP client for NOAA API calls |
| Lucide React | 1.11.0 | Icon library |
| ESLint | 10.2.1 | Code quality linting |

### Planned (ML Pipeline)

| Technology | Purpose |
|---|---|
| Python 3.9+ | Core language |
| Pandas / NumPy | Data ingestion, feature engineering |
| Scikit-learn | Phase I models (Logistic Regression, Random Forest), preprocessing (StandardScaler), metrics |
| XGBoost | Phase I high-precision classifier |
| PyTorch | Phase II LSTM + Attention model |
| AWS SageMaker | Model hosting and real-time inference endpoint |
| Matplotlib / Seaborn | Training diagnostics and exploratory plots |

### Data Infrastructure

| Component | Status |
|---|---|
| NOAA SWPC live APIs | Connected (frontend fetches directly) |
| Historical data archive | Not yet collected |
| Feature store / time-series DB | Not designed |
| Model registry | Not set up |

---

## 9. How Each Part Connects

```
┌────────────────────────────────────────────────────────────┐
│  NOAA SWPC  →  planetary K-index, magnetometer, plasma     │
│  (free public REST APIs, 1-minute cadence)                 │
└────────────────┬───────────────────────────────────────────┘
                 │ same data, two consumers
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
 BinaryClassification  Time_SeriesRegression
 (Phase I)             (Phase II)
 XGBoost / RF          LSTM + Attention
 → P(storm)            → Kp(t+1h, t+3h, t+6h)
        │                 │
        └────────┬────────┘
                 │ predictions sent to
                 ▼
          CloudAI Dashboard  (Phase III)
          React frontend
          - Displays Kp, Bz, Speed, Density
          - Shows storm probability ring
          - Shows aurora latitude bands
          - (future) 7-day history chart
          - (future) Dst Index panel
          - (future) Ovation spatial aurora map
```

The three phases share the same raw data inputs. Phase I and Phase II are independent models that produce different outputs (class label vs. regression value), both of which feed the same dashboard. Phase I is a fast sanity check ("is anything happening?"); Phase II provides the quantitative detail needed for forecasting and display.

---

## 10. Current Plan Status

| Component | Planned | Implemented | Notes |
|---|---|---|---|
| Project documentation | ✅ | ✅ | READMEs in each phase folder |
| Aurora background notes | ✅ | ✅ | Notes/Aurora.md |
| Phase I: data ingestion | ✅ | ❌ | No Python code yet |
| Phase I: feature engineering | ✅ | ❌ | Specified in README only |
| Phase I: model training | ✅ | ❌ | No code |
| Phase I: evaluation | ✅ | ❌ | No code |
| Phase II: LSTM architecture | ✅ | ❌ | No code |
| Phase II: attention layer | ✅ | ❌ | No code |
| Phase II: custom loss | ✅ | ❌ | No code |
| CloudAI: live API fetch | ✅ | ✅ | App.jsx useEffect |
| CloudAI: Kp + solar wind display | ✅ | ✅ | Functional |
| CloudAI: probability ring | ✅ | ⚠️ | Hardcoded threshold, not real ML |
| CloudAI: aurora latitude bands | ✅ | ⚠️ | Scaled to Kp but rough |
| CloudAI: 7-day history chart | ✅ | ❌ | Marked "Next" in code |
| CloudAI: Dst Index panel | ✅ | ❌ | Placeholder `— nT` |
| CloudAI: Ovation spatial map | ✅ | ❌ | 900KB data file unused |
| CloudAI: auto-refresh | ✅ | ❌ | Loads once on mount only |
| CloudAI: error handling UI | ✅ | ❌ | Silent console.log |
| AWS SageMaker endpoint | ✅ | ❌ | Referenced in UI, not wired |
| Backend API server | ✅ | ❌ | No backend designed yet |
| Unit/integration tests | — | ❌ | None exist |

**Overall completion estimate:**

- Planning & documentation: ~85%
- Frontend dashboard: ~40%
- ML pipeline (Phase I + II): ~0%
- Deployment infrastructure: ~0%

---

## 11. Recommendations

### Immediate (Before Building More Frontend)

**1. Start Phase I data collection now.**
You need historical data to train on. NOAA SWPC provides archives going back years. Write a simple Python script to download and store historical Kp, Bz, speed, and density data into CSV or a local SQLite database. Even a few months of data (thousands of 1-minute rows) is enough to prototype Phase I.

**2. Write the Phase I pipeline end-to-end before Phase II.**
Don't jump to LSTM until you have a working baseline. Logistic Regression → Random Forest → XGBoost is a natural ladder. Each step gives you a concrete performance baseline and reveals whether your features have real predictive signal. LSTM is harder to debug and train; knowing "Random Forest gets F1=0.72" gives you a target to beat.

**3. Fix the hardcoded prediction in App.jsx.**
The current `kpVal > 4 ? 78 : 12` is not a model — it's a guess. Even before SageMaker, you could expose a tiny FastAPI or Flask endpoint locally that runs a trained scikit-learn model and returns a real probability. This would make the dashboard genuinely useful for development.

### Short-Term (While Building ML)

**4. Add auto-refresh to the frontend.**
Space weather changes every minute. Add a `setInterval` in the useEffect to re-fetch every 60 seconds. This is a two-line change and makes the dashboard actually "live."

**5. Wire up the Ovation aurora spatial data.**
The 900 KB `ovation_aurora` JSON is already in `temp_data/` and contains a geographic probability grid. Rendering this as a world map overlay (e.g., using Leaflet.js or a canvas heatmap) would be the most visually striking dashboard feature and would differentiate AuroraAI from simply reading NOAA's own site.

**6. Build the 7-day Kp history chart.**
The NOAA K-index forecast JSON already contains observed + predicted data across a 10-day window. Connecting this to Chart.js is straightforward and was already planned as "Next" in the code.

**7. Add proper error handling.**
When NOAA APIs are down (they go down occasionally), the dashboard should show a graceful "Data unavailable" state, not silently display zeros or throw uncaught promise rejections.

### Architecture Decisions to Make

**8. Decide on the backend strategy.**
Right now the frontend calls NOAA directly from the browser. This works for open NOAA endpoints, but once you add ML inference, you need a backend. Two realistic options:

- **Lightweight:** FastAPI (Python) — one codebase for both ML inference and API serving; easy to run locally and deploy to a single AWS EC2 instance or Lambda.
- **Managed:** AWS SageMaker endpoint + AWS API Gateway — more scalable and what the project already mentions, but requires more AWS configuration.

For a solo research project, FastAPI is the faster path. SageMaker makes sense once you have a trained model worth serving at scale.

**9. Handle class imbalance explicitly in Phase I.**
Geomagnetic storms are rare (Kp ≥ 5 occurs roughly 5–10% of the time historically). If you train without addressing this, your models will learn to always predict "no storm" and score high accuracy. Use `class_weight='balanced'` in scikit-learn models, or SMOTE for oversampling before training.

**10. Respect temporal order in train/test splits.**
Do NOT use random shuffling to create your train/val/test splits. Time-series data has temporal dependencies — shuffling causes data leakage (the model sees future solar wind data while predicting the past). Split chronologically: e.g., 2020–2023 for training, 2024 for validation, 2025 for test.

### Longer-Term

**11. Add GOES X-ray flux as an additional input feature.**
Solar flares (detectable via X-ray flux) often precede geomagnetic storms by hours. Adding GOES satellite data as an input feature to both Phase I and Phase II models could significantly improve forecast lead time.

**12. Consider multi-output regression for Phase II.**
Instead of training separate models for t+1h, t+3h, and t+6h, a single LSTM with a 3-neuron output layer can learn to forecast all three horizons simultaneously, leveraging shared representations in the hidden state.

**13. Version your models.**
Once you have trained models, use MLflow or even just timestamped pickle files so you can track which model version is deployed and roll back if a new model performs worse.

---

*Generated from full codebase + data file analysis. Last updated 2026-04-29.*
