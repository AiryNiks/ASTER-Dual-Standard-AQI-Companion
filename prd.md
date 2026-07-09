# PRD — AQI-Based Dynamic Health Advisory API

| Field | Value |
|---|---|
| Version | 1.1 (aligned with trd.md v1.0) |
| Author | Aryan Arnav |
| Date | 2026-07-04 |
| Status | Approved for implementation planning |
| Stack | Python 3.12 · FastAPI · Vercel Serverless (Fluid Compute) |

---

## 1. Problem & Objective

Public AQI sources expose raw pollutant concentrations or a single-standard index. Developers building consumer apps in India and Europe need: (a) **dual-standard scores** (Indian NAQI and European EAQI) from one call, and (b) **actionable advisories** tuned to activity and demographic — not a generic "air is bad" string.

**Objective:** a high-performance, **stateless** REST API that converts `(lat, lon)` into dual-standard AQI scores, dominant-pollutant transparency, and activity/profile-specific health verdicts.

**Non-goal:** this is not a monitoring dashboard, alerting service, or data warehouse.

## 2. Target Audience

1. Frontend/mobile developers embedding air-quality UX.
2. Fitness and quick-commerce/logistics platforms (automated operational decisions).
3. Technical recruiters evaluating backend engineering craft (API design, error semantics, docs).

## 3. User Stories

- **Fitness app:** "As a developer, I need an endpoint that tells me whether current AQI is safe for intense outdoor bodyweight workouts, so my app can advise users to train indoors." → `GET /v1/aqi?lat=…&lon=…&activity=intense_workout`
- **Quick-commerce (Zepto/Blinkit-style):** "As a platform engineer, I want hyper-local AQI so our system auto-notifies delivery riders to wear N95 masks during severe spikes." → `GET /v1/aqi?lat=…&lon=…&activity=delivery&profile=adult`; verdict `avoid` + `precautions[]` includes `wear_n95`.
- **Recruiter:** "As a reviewer, I want to open `/docs` and understand the API's capability and rigor in under two minutes."

## 4. Scope

**In scope (V1)**

- Open-Meteo Air Quality API integration (keyless, free tier).
- `GET /v1/aqi` — single endpoint: dual-standard scores, sub-index breakdown, dominant pollutant, and activity/profile-aware `medical_advisory` block (Template 3 contract; binding spec in `trd.md`).
- `GET /v1/health` — liveness probe.
- NAQI piecewise linear interpolation (CPCB 2014 breakpoints); EAQI banding (EEA 2019 bands).
- Custom-themed Swagger UI at `/docs` (visual direction: separate design brief from project owner — pending).
- Per-instance response caching + CDN `Cache-Control` headers; best-effort rate limiting.
- Vercel serverless deployment.

**Out of scope (V1)**

- Authentication/API keys, any database or persistent state, end-user GUIs, push notifications, historical data, multi-region sensor fusion.

## 5. API Design

### 5.1 `GET /v1/aqi`

Query params: `lat` (float, −90…90, required), `lon` (float, −180…180, required); optional `activity`, `profile`, `standard` (§5.2). Response follows Template 3 (`meta`, `raw_concentrations`, `indexes`, `medical_advisory`).

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
    "units": "ugm3",
    "pm2_5": 142.0, "pm10": 297.5, "no2": 51.3, "o3": 44.0, "so2": 11.2, "co": 1810.0
  },
  "indexes": {
    "naqi": {
      "value": 317,
      "category": "Very Poor",
      "dominant_pollutant": "pm2_5",
      "sub_indices": { "pm2_5": 317, "pm10": 248, "no2": 64, "o3": 44, "so2": 14, "co": 90 }
    },
    "eaqi": {
      "band": 6,
      "category": "Extremely Poor",
      "dominant_pollutant": "pm10",
      "sub_bands": { "pm2_5": 6, "pm10": 6, "no2": 2, "o3": 1, "so2": 1 }
    }
  },
  "medical_advisory": { "note": "see §5.2 for the full block" }
}
```

Design notes:

- **Dominant-pollutant transparency (Feature B):** both standards report which pollutant drove the index, plus every sub-index/sub-band, plus raw µg/m³ concentrations. This is nearly free — sub-indices must be computed anyway (overall index = worst sub-index in both standards).
- CO is included in NAQI (mg/m³ basis) but excluded from EAQI (EAQI does not use CO).

### 5.2 `medical_advisory` block (Feature A — the differentiator)

Optional `/v1/aqi` params: `activity` ∈ `intense_workout | moderate_exercise | delivery | outdoor_work | commute | general` (default `general`); `profile` ∈ `adult | child | senior | respiratory_sensitive` (default `adult`); `standard` ∈ `naqi | eaqi | strictest` (default `strictest`).

```json
{
  "verdict": "avoid",
  "risk_score": 4.0,
  "headline": "Air quality is unsafe for delivery work in this area.",
  "reasoning": "EAQI band 6 (Extremely Poor) — strictest of the two standards — driven by particulate matter (PM2.5 142, PM10 297.5 µg/m³). Sustained outdoor exposure at elevated respiration rates multiplies inhaled dose.",
  "precautions": ["wear_n95", "limit_continuous_exposure_30min", "prefer_vehicle_with_cabin_filter"],
  "safe_alternative": "Reassess after 18:00 local time if conditions improve.",
  "inputs": { "activity": "delivery", "profile": "adult", "standard_applied": "eaqi", "severity_band": 6 }
}
```

Verdict engine (pure function — no state):

1. Compute both indices; select per `standard` (`strictest` = worse of the two, normalized to category severity 1–6).
2. Apply an **exposure multiplier matrix**: activity intensity (breathing rate proxy: `intense_workout`=3.0, `delivery`/`outdoor_work`=2.0, `moderate_exercise`=1.75, `commute`=1.25, `general`=1.0) × profile sensitivity (`respiratory_sensitive`=1.5, `child`/`senior`=1.3, `adult`=1.0).
3. Map risk to verdict: `safe` (risk < 1.2), `caution` (1.2 ≤ risk < 3.0), `avoid` (risk ≥ 3.0) — documented in `/docs`.

The matrix and thresholds are versioned constants in code, unit-tested against a published truth table — reviewable domain logic, not vibes.

### 5.3 `GET /v1/health`

Returns `200 {"status":"ok"}`. Liveness only — no upstream call.

## 6. Index Computation (Correctness Requirements)

- **NAQI (CPCB 2014):** sub-index per pollutant via piecewise linear interpolation `I = ((I_hi − I_lo)/(BP_hi − BP_lo)) × (C − BP_lo) + I_lo`; overall = max sub-index. Official NAQI uses **24-h averages** (8-h for CO/O₃). V1 applies **instantaneous `current` values** to these breakpoints (owner decision, binding in `trd.md`); the deviation is disclosed via `meta.method: "instantaneous_approximation"` and in `/docs`. *Silently applying instantaneous values to 24-h breakpoints would be a correctness bug.*
- **EAQI (EEA):** band lookup (1–6) on hourly concentrations for PM2.5, PM10, NO₂, O₃, SO₂; overall = worst band. EAQI is defined on hourly values, so no averaging caveat applies.
- Both breakpoint tables live in one `standards.py` module as frozen dataclasses with source citations — single point of audit.

## 7. Architecture

```
Client → Vercel Edge/CDN (Cache-Control) → FastAPI (ASGI, Vercel Python fn)
             │                                   │
             │                       TTLCache (per-instance, 30 min)
             │                                   │
             └───────────────← httpx (async, 3.0 s timeout, no retry) → Open-Meteo
```

- **Caching (two layers):** (1) `Cache-Control: public, s-maxage=1800, stale-while-revalidate=600` — Vercel's CDN serves repeat queries without invoking the function; (2) in-function `cachetools.TTLCache` keyed on coordinates rounded to 3 decimals (~110 m). **Honest constraint:** serverless instances don't share memory; the in-function cache is per-instance best-effort. The CDN layer is the primary shield. No Redis/KV in V1 — statelessness is a feature, not a gap.
- **Rate limiting:** target 60 req/min/IP. The in-memory limiter (hand-rolled, no third-party dependency — `trd.md` §5) is per-instance and therefore **best-effort under horizontal scale** — documented as such. Hard enforcement is delegated to Vercel's platform firewall/WAF rules. The PRD explicitly rejects pretending in-memory limiting is globally accurate.
- **Upstream discipline:** 3.0-s timeout, no retry (fail-fast); all pollutants fetched in **one** Open-Meteo `current` call per cache miss.

## 8. Error Handling & Edge Cases

| Case | Behavior |
|---|---|
| `lat=900` / malformed params | **`400 Bad Request`** — RFC 9457 problem-details body. Note: FastAPI emits `422` by default; a custom `RequestValidationError` handler downgrades to `400` to match REST convention. |
| Missing required param | `400`, same envelope, `errors[]` lists each field |
| Upstream timeout | **`502 Bad Gateway`** — fail-fast at 3.0 s (owner decision, binding in `trd.md`) |
| Upstream 5xx / malformed payload | **`502 Bad Gateway`** |
| Remote ocean / no-data coordinates | `200` with modeled values when CAMS returns data; **`404`** when all pollutant fields are null (per `trd.md` §6) |
| Rate limit exceeded | `429 Too Many Requests` + `Retry-After` |
| Unknown route | `404` problem-details |

All error bodies share one schema: `{ "type", "title", "status", "detail", "instance" }` (RFC 9457).

## 9. Success Metrics (KPIs)

- p95 latency **< 250 ms** on cache hit (CDN or instance); p95 < 1.2 s on cold cache miss (upstream-bound, tracked separately — collapsing the two into one number would hide the truth).
- 99.9% availability (excludes upstream outages surfaced as 502, tracked as a separate upstream-health metric).
- 500+ external requests/week within 30 days of launch (measured via Vercel analytics, self-traffic excluded).

## 10. Go-To-Market

- **`/docs` as the product demo:** custom-themed Swagger UI (design brief to be supplied by project owner before implementation of the docs skin) with pre-filled examples for Delhi, Milan, and a mid-Pacific coordinate to showcase modeled-data behavior.
- Launch posts on r/Python, r/FastAPI, r/SideProject, r/developersIndia — each anchored on one concrete story ("your fitness app can decide *for* the user").
- README with architecture diagram, verdict-matrix table, and a 3-line `curl` quickstart.

## 11. Testing Strategy

- Unit: golden-value tests for every NAQI breakpoint boundary (incl. exact-boundary values), EAQI band edges, verdict truth table (all activity × profile × severity combinations).
- Contract: recorded Open-Meteo fixtures (respx) — timeouts, 5xx, partial pollutant sets.
- Integration: FastAPI `TestClient` for every error row in §8, verifying both status code and RFC 9457 body.
- Load: `locust` smoke — confirms cache-hit p95 target pre-launch.

## 12. V2 Roadmap (explicitly deferred)

- `GET /v1/historical` — 7-day trend (Open-Meteo supports `past_days=7`; still stateless).
- Real-time severe-pollution alerts. **Correction:** long-lived WebSockets are incompatible with Vercel Python serverless functions. V2 will use either (a) client polling with `ETag`/304, or (b) webhook callbacks triggered by Vercel Cron — decision deferred to V2 design.
- Optional API-key tier if free-tier abuse materializes.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Open-Meteo free-tier throttling | CDN caching collapses demand; circuit breaker fails gracefully (503) |
| NAQI approximation questioned | Deviation disclosed in `/docs` + `meta.method` field; method documented |
| Per-instance rate limiting bypassed | Vercel WAF platform rules as the enforcement backstop |
| Cold-start latency vs 250 ms KPI | KPI scoped to cache-hit path; Fluid Compute reduces cold starts |
