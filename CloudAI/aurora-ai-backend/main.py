from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio

app = FastAPI(title="Aurora AI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

NOAA_KP_1M      = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
NOAA_MAG_1M     = "https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json"
NOAA_PLASMA_1M  = "https://services.swpc.noaa.gov/json/rtsw/rtsw_plasma_1m.json"
NOAA_KP_HISTORY = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
NOAA_KP_FORECAST= "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json"

KP_PROBABILITY = [5, 8, 12, 25, 45, 65, 78, 88, 94, 98]
G_SCALE        = ["G0","G0","G0","G0","G0","G1","G2","G3","G4","G5"]


def kp_to_prob(kp: float) -> int:
    return KP_PROBABILITY[min(9, max(0, round(kp)))]


def band_pct(kp: float, threshold: int) -> int:
    return min(100, max(0, round((kp - threshold) * 20)))


def parse_last(res: httpx.Response) -> dict | None:
    """Return last element of a NOAA JSON array, or None if empty/invalid."""
    try:
        data = res.json()
        return data[-1] if data else None
    except Exception:
        return None


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/live")
async def get_live():
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            kp_r, mag_r, plasma_r = await asyncio.gather(
                client.get(NOAA_KP_1M),
                client.get(NOAA_MAG_1M),
                client.get(NOAA_PLASMA_1M),
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"NOAA request failed: {exc}")

        kp_data = parse_last(kp_r)
        if kp_data is None:
            raise HTTPException(status_code=502, detail="Kp data unavailable from NOAA")

        return {
            "kp":     kp_data,
            "mag":    parse_last(mag_r),    # None when DSCOVR data is unavailable
            "plasma": parse_last(plasma_r), # None when DSCOVR data is unavailable
        }


@app.get("/api/predict")
async def get_predict():
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res      = await client.get(NOAA_KP_1M)
            kp_data  = res.json()
            kp_val   = kp_data[-1].get("kp_index") or 0
            kp_idx   = min(9, max(0, round(kp_val)))
            return {
                "kp":          kp_val,
                "probability": kp_to_prob(kp_val),
                "g_scale":     G_SCALE[kp_idx],
                "latitude_bands": {
                    "65N": band_pct(kp_val, 3),
                    "60N": band_pct(kp_val, 4),
                    "55N": band_pct(kp_val, 5),
                },
                "model": "kp_threshold_v1",
                "note":  "Placeholder — XGBoost/SageMaker model pending Phase C",
            }
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))


@app.get("/api/history")
async def get_history():
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res  = await client.get(NOAA_KP_HISTORY)
            data = res.json()
            # skip header row, return last 7 days (56 × 3-hour intervals)
            rows = data[1:][-56:]
            return [{"time": r[0], "kp": float(r[1])} for r in rows]
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))


@app.get("/api/forecast")
async def get_forecast():
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res  = await client.get(NOAA_KP_FORECAST)
            data = res.json()
            rows = data[1:]  # skip header
            return [
                {"time": r[0], "kp": float(r[1]), "observed": r[2], "noaa_scale": r[3]}
                for r in rows
            ]
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))
