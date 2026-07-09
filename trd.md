# TRD — AQI-Based Dynamic Health Advisory API (V1, Secured & Scalable)

| Field | Value |
|---|---|
| Version | 1.0 (Final, post 3× review loop) |
| Parent doc | `prd.md` v1.0 |
| Executor | Autonomous IDE agent — zero-guess spec |
| Stack | Python 3.11+ · FastAPI · Uvicorn (local) · httpx · Vercel Serverless |

**Deviations from PRD v1.0 (owner-mandated, this TRD wins):** upstream timeout returns `502` (PRD said 504); no-data coordinates return `404` (PRD said 200 + confidence flag); indices computed from `current` instantaneous values, not 24-h rolling averages (documented approximation); cache key rounds to 3 decimals (PRD said 2); default Swagger UI (custom theme deferred). *(PRD v1.1 has since been aligned to all of these decisions; list retained for audit.)*

---

## 1. System Architecture

```
repo/
├── api/
│   └── index.py          # FastAPI app entrypoint (Vercel convention)
├── app/
│   ├── __init__.py
│   ├── main.py           # app factory, middleware, exception handlers
│   ├── routes.py         # GET /v1/aqi, GET /v1/health
│   ├── schemas.py        # Pydantic v2 models (strict)
│   ├── upstream.py       # httpx client, fail-fast wrapper
│   ├── standards.py      # NAQI + EAQI breakpoint tables (frozen)
│   ├── engine.py         # interpolation, banding, advisory logic
│   ├── cache.py          # bounded TTL cache
│   └── ratelimit.py      # sliding-window limiter
├── tests/
├── requirements.txt      # fastapi, httpx, uvicorn (dev only)
└── vercel.json
```

- **Runtime:** Python 3.11+. Uvicorn is a **dev-only** dependency (`uvicorn app.main:app --reload`); Vercel's Python runtime serves the ASGI `app` object directly — do not add a Procfile or custom server.
- **Statelessness (hard constraint):** no database, no Redis, no filesystem writes. All state is per-instance process memory, treated as disposable.

`vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/api/index" }],
  "functions": { "api/index.py": { "maxDuration": 10 } }
}
```

## 2. Upstream Integration & Fail-Fast

- Base URL: `https://air-quality-api.open-meteo.com/v1/air-quality`
- Query: `latitude={lat}&longitude={lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`
- One module-level `httpx.AsyncClient` reused across invocations (connection pooling):

```python
client = httpx.AsyncClient(
    timeout=httpx.Timeout(3.0, connect=1.5),
    limits=httpx.Limits(max_connections=20),
)
```

- **Fail-fast contract:** `httpx.TimeoutException` or upstream 5xx → raise `UpstreamError` → handler returns `502` immediately. No retries in V1 (a retry doubles worst-case latency to 6 s and defeats fail-fast under viral load). Function `maxDuration=10` guarantees Vercel never kills the function mid-response.
- Units returned by Open-Meteo: all pollutants in **µg/m³, including CO**. NAQI's CO breakpoints are in **mg/m³** → divide CO by 1000 before NAQI computation. EAQI does not use CO.

## 3. Mathematical Logic Engine (`engine.py` + `standards.py`)

### 3.1 NAQI (CPCB 2014) — piecewise linear interpolation

```
I = ((I_high − I_low) / (C_high − C_low)) × (C − C_low) + I_low
```

**Division-by-zero guard (mandatory):** if `C_high == C_low`, return `I_low`. Final NAQI = `max(sub_indices)`; dominant pollutant = argmax (ties → higher raw concentration wins, then alphabetical — deterministic).

PM2.5 breakpoints (µg/m³ → sub-index):

| C_low | C_high | I_low | I_high | Category |
|---|---|---|---|---|
| 0 | 30 | 0 | 50 | Good |
| 31 | 60 | 51 | 100 | Satisfactory |
| 61 | 90 | 101 | 200 | Moderate |
| 91 | 120 | 201 | 300 | Poor |
| 121 | 250 | 301 | 400 | Very Poor |
| 251 | 500* | 401 | 500 | Severe |

PM10 breakpoints (µg/m³):

| C_low | C_high | I_low | I_high | Category |
|---|---|---|---|---|
| 0 | 50 | 0 | 50 | Good |
| 51 | 100 | 51 | 100 | Satisfactory |
| 101 | 250 | 101 | 200 | Moderate |
| 251 | 350 | 201 | 300 | Poor |
| 351 | 430 | 301 | 400 | Very Poor |
| 431 | 860* | 401 | 500 | Severe |

Also implement (same formula) NO₂ [0-40, 41-80, 81-180, 181-280, 281-400, 401-800*], O₃ [0-50, 51-100, 101-168, 169-208, 209-748, 749-1000*], SO₂ [0-40, 41-80, 81-380, 381-800, 801-1600, 1601-2000*], CO mg/m³ [0-1, 1.1-2, 2.1-10, 10.1-17, 17.1-34, 34.1-50*].

\* CPCB defines no upper bound for Severe. **Implementation decision (documented, deterministic):** the values marked `*` are the assumed C_high for the Severe band; any concentration above them yields sub-index **clamped to 500**. Sub-index rounding: `round()` to nearest integer, half-up.

- Bracket selection: `C_low ≤ C ≤ C_high` after rounding C to 1 decimal; concentrations falling in gaps between integer brackets (e.g., PM2.5 = 30.5) snap to the nearest bracket boundary below. Negative concentrations → treat as data error → exclude pollutant from index (see §6, 404 rule).

### 3.2 EAQI (EEA) — worst-pollutant banding

Band per pollutant = smallest band whose upper bound ≥ C; overall EAQI = `max(bands)`. Thresholds (µg/m³, band upper bounds):

| Pollutant | 1 Good | 2 Fair | 3 Moderate | 4 Poor | 5 Very Poor | 6 Extremely Poor |
|---|---|---|---|---|---|---|
| PM2.5 | 10 | 20 | 25 | 50 | 75 | 800 |
| PM10 | 20 | 40 | 50 | 100 | 150 | 1200 |
| NO₂ | 40 | 90 | 120 | 230 | 340 | 1000 |
| O₃ | 50 | 100 | 130 | 240 | 380 | 800 |
| SO₂ | 100 | 200 | 350 | 500 | 750 | 1250 |

Concentrations above band-6 upper bound → clamp to band 6. CO is **excluded** from EAQI.

**Accuracy disclosure (both standards):** V1 applies instantaneous `current` values to breakpoints officially defined on averaged data (NAQI: 24-h/8-h; EAQI PM: 24-h running mean). `meta.method = "instantaneous_approximation"` must state this.

### 3.3 Advisory engine

Pure function `advise(severity_1_to_6, activity, profile) -> Advisory`. Severity = NAQI category ordinal or EAQI band, whichever is worse. Multipliers: activity `intense_workout=3.0, delivery=2.0, outdoor_work=2.0, moderate_exercise=1.75, commute=1.25, general=1.0`; profile `respiratory_sensitive=1.5, child=1.3, senior=1.3, adult=1.0`. `risk = min(6, severity × activity_m × profile_m / 3.0)` → verdict: `risk < 1.2 → "safe"`, `1.2 ≤ risk < 3.0 → "caution"`, `≥ 3.0 → "avoid"`. (Calibration: NAQI "Poor" [severity 4] for a general adult yields risk 1.33 → `caution`, never `safe`.) Constants live in `standards.py`; unit-test the full truth table.

## 4. API Contract & Security

### 4.1 Endpoints

- `GET /v1/aqi?lat&lon[&activity][&profile]` — full response (Template 3).
- `GET /v1/health` — `200 {"status": "ok"}`; no upstream call.

### 4.2 Validation (Pydantic v2, strict)

```python
from pydantic import BaseModel, Field, ConfigDict

class Coordinates(BaseModel):
    model_config = ConfigDict(strict=False, extra="forbid")
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False)
```

- `allow_inf_nan=False` is **mandatory** — otherwise `lat=nan` passes range checks (NaN comparisons are false-y) and poisons the cache key and upstream call.
- `activity`/`profile` are `Literal[...]` enums; unknown values → 400.
- Override FastAPI's default 422: register a `RequestValidationError` handler returning **400** with the §6 envelope.

### 4.3 Security middleware (stdlib/FastAPI built-ins only — no third-party)

```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])
```

Custom ASGI middleware appends to every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security: max-age=63072000`, `Cache-Control: public, s-maxage=1800, stale-while-revalidate=600` (2xx only; errors get `Cache-Control: no-store`).

### 4.4 Response schema — Template 3: Global Standard

```json
{
  "meta": {
    "coordinates": { "lat": 28.614, "lon": 77.209 },
    "timestamp_utc": "2026-07-04T09:00:00Z",
    "source": "open-meteo (CAMS)",
    "method": "instantaneous_approximation",
    "cache_hit": true
  },
  "raw_concentrations": {
    "units": "ugm3 (co: reported ugm3, converted to mgm3 for NAQI)",
    "pm2_5": 142.0, "pm10": 297.5, "no2": 51.3, "o3": 44.0, "so2": 11.2, "co": 1810.0
  },
  "indexes": {
    "naqi": { "value": 317, "category": "Very Poor", "dominant_pollutant": "pm2_5",
              "sub_indices": { "pm2_5": 317, "pm10": 248, "no2": 64, "o3": 44, "so2": 14, "co": 90 } },
    "eaqi": { "band": 6, "category": "Extremely Poor", "dominant_pollutant": "pm10",
              "sub_bands": { "pm2_5": 6, "pm10": 6, "no2": 2, "o3": 1, "so2": 1 } }
  },
  "medical_advisory": {
    "verdict": "avoid",
    "risk_score": 4.0,
    "headline": "Air quality is hazardous for the selected activity.",
    "precautions": ["wear_n95", "limit_continuous_exposure_30min"],
    "inputs": { "activity": "delivery", "profile": "adult", "standard_applied": "naqi" }
  }
}
```

## 5. Caching & Rate Limiting (per-instance, bounded)

- **Cache:** hand-rolled TTL dict in `cache.py` — **not** `@lru_cache` (no TTL support; would serve stale data forever). Key: `(round(lat, 3), round(lon, 3))`. TTL: 1800 s. **Bounded:** `maxsize=1000`, evict oldest-inserted on overflow (prevents memory-exhaustion DoS via coordinate scanning). Vercel Python functions are single-threaded per instance → a plain dict is safe; no locks.
- CDN layer: the `s-maxage=1800` header (§4.3) makes Vercel's edge the first shield; the in-process cache is the second.
- **Rate limiter:** sliding window in `ratelimit.py`, 60 req/min per client IP. **IP resolution:** on Vercel, `Request.client.host` is the proxy — use the `x-real-ip` header (set by Vercel, not client-spoofable) and fall back to `request.client.host` locally. Do **not** trust `x-forwarded-for` (client-controlled first hop). Store: bounded dict `{ip: deque[timestamps]}`, `maxsize=10_000`, oldest-evicted. **Documented limitation:** per-instance only; global enforcement is Vercel WAF's job.

## 6. Error Handling Matrix

Single envelope for all errors: `{ "error": { "status": int, "title": str, "detail": str } }`, `Cache-Control: no-store`.

| Status | Trigger | Notes |
|---|---|---|
| `400 Bad Request` | lat/lon out of bounds, non-numeric, NaN/Inf, unknown enum value | via overridden validation handler |
| `404 Not Found` | Upstream 200 but **all** pollutant fields `null`/missing | partial nulls: compute from available pollutants, list omissions in `meta.missing_pollutants`; all-null → 404 |
| `405 Method Not Allowed` | POST/PUT/DELETE/PATCH on any route | FastAPI emits automatically; add handler to wrap in error envelope + `Allow: GET` header |
| `429 Too Many Requests` | > 60 req/min/IP | include `Retry-After: 60` |
| `502 Bad Gateway` | Upstream timeout (3.0 s), connect error, or upstream 5xx | fail-fast, no retry |
| `500 Internal Server Error` | Uncaught exception in math engine | catch-all handler; log traceback server-side, never leak it in the body |

## 7. Swagger UI

Default FastAPI Swagger at `/docs` — **zero custom CSS/JS/themes** in this phase. Set `title`, `version`, `description` (including the instantaneous-approximation disclosure) and per-endpoint response examples via `responses={...}` only.

## 8. Testing Requirements (execution gate)

1. `engine.py`: golden tests at every NAQI bracket boundary (30/31, 250/251, C_high==C_low guard, >C_high* clamp-to-500, CO µg→mg conversion), every EAQI band edge, full advisory truth table.
2. Validation: `lat=900`→400, `lat=abc`→400, `lat=nan`→400, `lat=inf`→400, extra params→400.
3. Upstream (respx fixtures): timeout→502, 500→502, all-null→404, partial-null→200 with `missing_pollutants`.
4. Middleware: security headers on every response; 405 includes `Allow: GET`; 429 after 61st request in a mocked minute; cache hit skips upstream call (assert respx call count).
5. All tests pass with zero network access (fixtures only).

## 9. Vulnerabilities Identified & Closed (review-loop record)

1. **NaN/Infinity bypass** — `float` range checks pass NaN silently → fixed via `allow_inf_nan=False` (§4.2).
2. **X-Forwarded-For spoofing** — naive IP extraction lets clients reset their rate bucket per request → fixed by trusting only Vercel's `x-real-ip` (§5).
3. **Unbounded memory growth** — naive cache/limiter dicts grow forever under coordinate/IP scanning → fixed with hard `maxsize` + eviction on both (§5).
4. **`@lru_cache` staleness** — would cache AQI indefinitely → replaced with TTL structure (§5).
5. **Error responses cacheable at CDN** — a cached 502 would outlive the outage → `no-store` on all non-2xx (§4.3, §6).
