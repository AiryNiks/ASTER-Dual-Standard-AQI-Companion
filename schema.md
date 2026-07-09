# Data Contract — AQI-Based Dynamic Health Advisory API

> **Status:** Binding · **Version:** `3.0-global` · **Spec:** OpenAPI 3.0.3
> **Scope:** Single source of truth for the stateless advisory endpoint shared by the FastAPI backend (Python 3.11+, Pydantic v2) and the React / Three.js frontend (strict TypeScript).
> **Golden rule:** If a type here disagrees with the code, the code is wrong. Field names are `snake_case` on the wire; TypeScript mirrors `snake_case` exactly so JSON deserializes with **zero transformation**.

---

## 1. Endpoint

| Attribute | Value |
| --- | --- |
| Method | `GET` |
| Path | `/v3/advisory` |
| Query params | `lat` (float), `lon` (float) |
| Auth | None (stateless, public) |
| Success | `200 OK` → `GlobalStandardAdvisory` (Template 3) |
| Idempotency | Pure function of `(lat, lon)` + upstream data; no server state |

### 1.1 Request contract

`lat` and `lon` are **required** query parameters. They are the only inputs.

| Param | Type | Constraint | On violation |
| --- | --- | --- | --- |
| `lat` | `float` | `-90.0 ≤ lat ≤ 90.0` | `422 Unprocessable Entity` |
| `lon` | `float` | `-180.0 ≤ lon ≤ 180.0` | `422 Unprocessable Entity` |

### 1.2 HTTP status matrix

| Status | Meaning | Body model | Trigger |
| --- | --- | --- | --- |
| `200 OK` | Advisory resolved | `GlobalStandardAdvisory` | Valid coords + healthy upstream |
| `400 Bad Request` | Semantically invalid request that passed schema validation | `AppError` | e.g. coordinates over open ocean with no station in radius |
| `422 Unprocessable Entity` | Payload failed schema validation (type/bounds) | `HTTPValidationError` | Missing param, non-numeric, out of `[-90,90]` / `[-180,180]` |
| `502 Bad Gateway` | Upstream provider failed / circuit breaker OPEN | `UpstreamError` | Provider timeout, 5xx, or breaker tripped |

> **Why `422` for bounds, not `400`?** Bounds are declared on the Pydantic/FastAPI schema (`ge`/`le`), so FastAPI rejects them during request parsing and emits the standard `RequestValidationError` (`422`) **before** any handler code runs. `400` is reserved for business-rule failures that only our handler can detect.

---

## 2. Enumerations

Severity bands are closed string sets. Any value outside these lists is a contract breach.

### 2.1 `NAQIBand` — India National AQI (CPCB, 0–500 scale)

| Band string | AQI range |
| --- | --- |
| `"Good"` | 0–50 |
| `"Satisfactory"` | 51–100 |
| `"Moderate"` | 101–200 |
| `"Poor"` | 201–300 |
| `"Very Poor"` | 301–400 |
| `"Severe"` | 401–500 |

### 2.2 `EAQIBand` — European AQI (EEA, 6-level scale)

| Band string | Level |
| --- | --- |
| `"Good"` | 1 |
| `"Fair"` | 2 |
| `"Moderate"` | 3 |
| `"Poor"` | 4 |
| `"Very Poor"` | 5 |
| `"Extremely Poor"` | 6 |

> **Do not merge these enums.** `"Satisfactory"`/`"Severe"` exist only in NAQI; `"Fair"`/`"Extremely Poor"` exist only in EAQI. They are distinct types.

---

## 3. Backend — Pydantic v2 models

Canonical Pydantic **v2** definitions. FastAPI reads `Field(description=..., examples=[...])` to auto-populate a professional Swagger UI.

```python
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ─────────────────────────────────────────────────────────────
# Enums (see §2)
# ─────────────────────────────────────────────────────────────
class NAQIBand(str, Enum):
    GOOD = "Good"
    SATISFACTORY = "Satisfactory"
    MODERATE = "Moderate"
    POOR = "Poor"
    VERY_POOR = "Very Poor"
    SEVERE = "Severe"


class EAQIBand(str, Enum):
    GOOD = "Good"
    FAIR = "Fair"
    MODERATE = "Moderate"
    POOR = "Poor"
    VERY_POOR = "Very Poor"
    EXTREMELY_POOR = "Extremely Poor"


# ─────────────────────────────────────────────────────────────
# Request
# ─────────────────────────────────────────────────────────────
class AdvisoryQuery(BaseModel):
    """Inbound query parameters. Bounds are enforced here, producing 422 on violation."""

    model_config = ConfigDict(extra="forbid")

    lat: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Latitude in decimal degrees (WGS84). Must be within [-90, 90].",
        examples=[19.0760],
    )
    lon: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Longitude in decimal degrees (WGS84). Must be within [-180, 180].",
        examples=[72.8777],
    )


# ─────────────────────────────────────────────────────────────
# Response value objects
# ─────────────────────────────────────────────────────────────
class GeoCoordinates(BaseModel):
    """Echo of the resolved request coordinates."""

    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Resolved latitude in decimal degrees (WGS84).",
        examples=[19.0760],
    )
    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Resolved longitude in decimal degrees (WGS84).",
        examples=[72.8777],
    )


class RawPollutants(BaseModel):
    """
    Raw measured surface concentrations. Every field is nullable: a sensor
    that does not report a species yields `null`, NOT `0.0`. Units are
    µg/m³ except CO which is mg/m³.
    """

    pm2_5: float | None = Field(
        None, ge=0.0, description="PM2.5 mass concentration (µg/m³).", examples=[78.4]
    )
    pm10: float | None = Field(
        None, ge=0.0, description="PM10 mass concentration (µg/m³).", examples=[142.6]
    )
    no2: float | None = Field(
        None, ge=0.0, description="Nitrogen dioxide (µg/m³).", examples=[38.1]
    )
    so2: float | None = Field(
        None, ge=0.0, description="Sulphur dioxide (µg/m³).", examples=[12.7]
    )
    o3: float | None = Field(
        None, ge=0.0, description="Ozone (µg/m³).", examples=[55.3]
    )
    co: float | None = Field(
        None, ge=0.0, description="Carbon monoxide (mg/m³).", examples=[1.4]
    )
    nh3: float | None = Field(
        None, ge=0.0, description="Ammonia (µg/m³). NAQI-specific species.", examples=[9.2]
    )
    pb: float | None = Field(
        None, ge=0.0, description="Lead (µg/m³). NAQI-specific species; often unreported.", examples=[None]
    )


class NAQIAssessment(BaseModel):
    """India CPCB National AQI evaluation."""

    aqi: int = Field(
        ...,
        ge=0,
        le=500,
        description="Computed NAQI value on the 0–500 CPCB scale.",
        examples=[168],
    )
    band: NAQIBand = Field(
        ...,
        description="NAQI severity band derived from `aqi`.",
        examples=[NAQIBand.MODERATE],
    )
    dominant_pollutant: str = Field(
        ...,
        description="Species driving the sub-index (e.g. 'pm2_5').",
        examples=["pm2_5"],
    )


class EAQIAssessment(BaseModel):
    """European Environment Agency AQI evaluation."""

    level: int = Field(
        ...,
        ge=1,
        le=6,
        description="EAQI level on the EEA 1–6 scale.",
        examples=[4],
    )
    band: EAQIBand = Field(
        ...,
        description="EAQI severity band derived from `level`.",
        examples=[EAQIBand.POOR],
    )
    dominant_pollutant: str = Field(
        ...,
        description="Species driving the worst EAQI sub-index (e.g. 'pm2_5').",
        examples=["pm2_5"],
    )


class HealthAdvisory(BaseModel):
    """Human-facing guidance + visualization hint for the Three.js scene."""

    general_population: str = Field(
        ...,
        description="Advice for the general public.",
        examples=[
            "Air quality is unhealthy for prolonged outdoor exertion. Limit "
            "extended time outdoors."
        ],
    )
    sensitive_groups: str = Field(
        ...,
        description="Advice for children, elderly, and those with heart or lung conditions.",
        examples=[
            "Avoid outdoor activity. Keep reliever medication accessible and "
            "windows closed."
        ],
    )
    recommended_actions: list[str] = Field(
        ...,
        description="Ordered, actionable steps for the client to render as a checklist.",
        examples=[[
            "Wear an N95/FFP2 mask outdoors",
            "Run an air purifier indoors",
            "Reschedule outdoor exercise",
        ]],
    )
    color_hex: str = Field(
        ...,
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Band color as a #RRGGBB hex string, consumed directly by the Three.js material.",
        examples=["#FF9933"],
    )


# ─────────────────────────────────────────────────────────────
# Template 3 — Global Standard (200 OK body)
# ─────────────────────────────────────────────────────────────
class GlobalStandardAdvisory(BaseModel):
    """Template 3 response: dual-standard (NAQI + EAQI) advisory payload."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "schema_version": "3.0-global",
                    "template": "global_standard",
                    "location": {"latitude": 19.0760, "longitude": 72.8777},
                    "resolved_station": "Mumbai — Bandra Kurla Complex",
                    "observed_at": "2026-07-04T09:30:00Z",
                    "naqi": {
                        "aqi": 168,
                        "band": "Moderate",
                        "dominant_pollutant": "pm2_5",
                    },
                    "eaqi": {
                        "level": 4,
                        "band": "Poor",
                        "dominant_pollutant": "pm2_5",
                    },
                    "raw_pollutants": {
                        "pm2_5": 78.4,
                        "pm10": 142.6,
                        "no2": 38.1,
                        "so2": 12.7,
                        "o3": 55.3,
                        "co": 1.4,
                        "nh3": 9.2,
                        "pb": None,
                    },
                    "advisory": {
                        "general_population": "Air quality is unhealthy for prolonged outdoor exertion. Limit extended time outdoors.",
                        "sensitive_groups": "Avoid outdoor activity. Keep reliever medication accessible and windows closed.",
                        "recommended_actions": [
                            "Wear an N95/FFP2 mask outdoors",
                            "Run an air purifier indoors",
                            "Reschedule outdoor exercise",
                        ],
                        "color_hex": "#FF9933",
                    },
                }
            ]
        }
    )

    schema_version: Literal["3.0-global"] = Field(
        ...,
        description="Contract version. Pinned literal for forward-compat checks.",
        examples=["3.0-global"],
    )
    template: Literal["global_standard"] = Field(
        ...,
        description="Response template discriminator.",
        examples=["global_standard"],
    )
    location: GeoCoordinates = Field(
        ..., description="Resolved coordinates for this advisory."
    )
    resolved_station: str | None = Field(
        None,
        description="Human-readable nearest station name, or null if grid-interpolated.",
        examples=["Mumbai — Bandra Kurla Complex"],
    )
    observed_at: datetime = Field(
        ...,
        description="UTC timestamp of the upstream observation (ISO 8601, 'Z' suffix).",
        examples=["2026-07-04T09:30:00Z"],
    )
    naqi: NAQIAssessment = Field(..., description="India National AQI assessment.")
    eaqi: EAQIAssessment = Field(..., description="European AQI assessment.")
    raw_pollutants: RawPollutants = Field(
        ..., description="Underlying pollutant concentrations (nullable per species)."
    )
    advisory: HealthAdvisory = Field(
        ..., description="Health guidance + visualization color."
    )


# ─────────────────────────────────────────────────────────────
# Error models
# ─────────────────────────────────────────────────────────────
class ValidationErrorItem(BaseModel):
    """One entry inside FastAPI's auto-generated 422 body."""

    loc: list[str | int] = Field(
        ...,
        description="Path to the offending field, e.g. ['query', 'lat'].",
        examples=[["query", "lat"]],
    )
    msg: str = Field(
        ...,
        description="Human-readable validation message.",
        examples=["Input should be less than or equal to 90"],
    )
    type: str = Field(
        ...,
        description="Machine-readable error type.",
        examples=["less_than_equal"],
    )


class HTTPValidationError(BaseModel):
    """Standard FastAPI 422 envelope (RequestValidationError)."""

    detail: list[ValidationErrorItem] = Field(
        ..., description="List of individual validation failures."
    )


class AppError(BaseModel):
    """Custom 400 envelope for business-rule failures."""

    error_code: Literal["NO_STATION_IN_RANGE", "UNSUPPORTED_REGION"] = Field(
        ...,
        description="Stable machine-readable error identifier.",
        examples=["NO_STATION_IN_RANGE"],
    )
    message: str = Field(
        ...,
        description="Human-readable explanation.",
        examples=["No monitoring station within 50 km of the requested coordinates."],
    )
    request_id: str = Field(
        ...,
        description="Correlation id for tracing/log lookup.",
        examples=["req_9f2a1c7b"],
    )


class CircuitBreakerState(BaseModel):
    """Diagnostic breaker telemetry attached to a 502."""

    state: Literal["open", "half_open"] = Field(
        ...,
        description="Breaker state at time of failure.",
        examples=["open"],
    )
    failure_count: int = Field(
        ...,
        ge=0,
        description="Consecutive upstream failures observed.",
        examples=[5],
    )
    opened_at: datetime = Field(
        ...,
        description="UTC time the breaker tripped OPEN (ISO 8601).",
        examples=["2026-07-04T09:29:12Z"],
    )


class UpstreamError(BaseModel):
    """Custom 502 envelope for upstream failure / circuit-breaker trip."""

    error_code: Literal["UPSTREAM_UNAVAILABLE"] = Field(
        ...,
        description="Stable identifier for upstream/gateway failures.",
        examples=["UPSTREAM_UNAVAILABLE"],
    )
    message: str = Field(
        ...,
        description="Human-readable explanation.",
        examples=["Air quality provider is unavailable; circuit breaker is open."],
    )
    upstream_provider: str = Field(
        ...,
        description="Name of the failed upstream data source.",
        examples=["openaq"],
    )
    circuit_breaker: CircuitBreakerState = Field(
        ..., description="Breaker telemetry snapshot."
    )
    retry_after_seconds: int = Field(
        ...,
        ge=0,
        description="Suggested client back-off; mirrors the `Retry-After` header.",
        examples=[30],
    )
    request_id: str = Field(
        ...,
        description="Correlation id for tracing/log lookup.",
        examples=["req_4b8e0d1a"],
    )
```

> **v2 conformance checklist (enforced):** `ConfigDict` + `model_config` (no nested `class Config`); `X | None` unions with explicit `None` defaults for nullable fields; `examples=[...]` as a **list** (v2), never the v1 scalar `example=`; `pattern=` (v2), never the v1 `regex=`; `Literal` discriminators for versioning; `str, Enum` closed sets.

---

## 4. Frontend — TypeScript interfaces

Field names are identical to the JSON wire format (`snake_case`), so `await res.json() as GlobalStandardAdvisory` is safe with **no key remapping**. Nullable pollutants and the optional station are typed with `| null`. Error envelopes are typed too — the client must parse failures, not just successes.

```typescript
// ─────────────────────────────────────────────────────────────
// Enums (string literal unions — mirror §2 exactly)
// ─────────────────────────────────────────────────────────────
export type NAQIBand =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export type EAQIBand =
  | "Good"
  | "Fair"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Extremely Poor";

// ─────────────────────────────────────────────────────────────
// Success payload (Template 3 — Global Standard)
// ─────────────────────────────────────────────────────────────
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Raw surface concentrations. Each species is `number | null`:
 * `null` = not reported by the sensor (distinct from a measured 0).
 */
export interface RawPollutants {
  pm2_5: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  o3: number | null;
  co: number | null;
  nh3: number | null;
  pb: number | null;
}

export interface NAQIAssessment {
  aqi: number; // 0–500
  band: NAQIBand;
  dominant_pollutant: string;
}

export interface EAQIAssessment {
  level: number; // 1–6
  band: EAQIBand;
  dominant_pollutant: string;
}

export interface HealthAdvisory {
  general_population: string;
  sensitive_groups: string;
  recommended_actions: string[];
  /** #RRGGBB — feed straight into a THREE.Color / material. */
  color_hex: string;
}

export interface GlobalStandardAdvisory {
  schema_version: "3.0-global";
  template: "global_standard";
  location: GeoCoordinates;
  /** null when the reading is grid-interpolated rather than station-based. */
  resolved_station: string | null;
  /** ISO 8601 UTC string, e.g. "2026-07-04T09:30:00Z". */
  observed_at: string;
  naqi: NAQIAssessment;
  eaqi: EAQIAssessment;
  raw_pollutants: RawPollutants;
  advisory: HealthAdvisory;
}

// ─────────────────────────────────────────────────────────────
// Error payloads (map 1:1 to §3 error models)
// ─────────────────────────────────────────────────────────────

/** One entry in a FastAPI 422 body. */
export interface ValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/** 422 — schema/bounds validation failure. */
export interface HTTPValidationError {
  detail: ValidationErrorItem[];
}

/** 400 — business-rule failure. */
export interface AppError {
  error_code: "NO_STATION_IN_RANGE" | "UNSUPPORTED_REGION";
  message: string;
  request_id: string;
}

/** Breaker telemetry embedded in a 502. */
export interface CircuitBreakerState {
  state: "open" | "half_open";
  failure_count: number;
  /** ISO 8601 UTC string. */
  opened_at: string;
}

/** 502 — upstream failure / circuit-breaker trip. */
export interface UpstreamError {
  error_code: "UPSTREAM_UNAVAILABLE";
  message: string;
  upstream_provider: string;
  circuit_breaker: CircuitBreakerState;
  retry_after_seconds: number;
  request_id: string;
}

// ─────────────────────────────────────────────────────────────
// Discriminated union for exhaustive client handling
// ─────────────────────────────────────────────────────────────
export type AdvisoryResult =
  | { status: 200; body: GlobalStandardAdvisory }
  | { status: 400; body: AppError }
  | { status: 422; body: HTTPValidationError }
  | { status: 502; body: UpstreamError };
```

---

## 5. Master JSON examples

### 5.1 `200 OK` — Mumbai (`lat=19.0760`, `lon=72.8777`)

`GET /v3/advisory?lat=19.0760&lon=72.8777`

```json
{
  "schema_version": "3.0-global",
  "template": "global_standard",
  "location": {
    "latitude": 19.076,
    "longitude": 72.8777
  },
  "resolved_station": "Mumbai — Bandra Kurla Complex",
  "observed_at": "2026-07-04T09:30:00Z",
  "naqi": {
    "aqi": 168,
    "band": "Moderate",
    "dominant_pollutant": "pm2_5"
  },
  "eaqi": {
    "level": 4,
    "band": "Poor",
    "dominant_pollutant": "pm2_5"
  },
  "raw_pollutants": {
    "pm2_5": 78.4,
    "pm10": 142.6,
    "no2": 38.1,
    "so2": 12.7,
    "o3": 55.3,
    "co": 1.4,
    "nh3": 9.2,
    "pb": null
  },
  "advisory": {
    "general_population": "Air quality is unhealthy for prolonged outdoor exertion. Limit extended time outdoors.",
    "sensitive_groups": "Avoid outdoor activity. Keep reliever medication accessible and windows closed.",
    "recommended_actions": [
      "Wear an N95/FFP2 mask outdoors",
      "Run an air purifier indoors",
      "Reschedule outdoor exercise"
    ],
    "color_hex": "#FF9933"
  }
}
```

### 5.2 `502 Bad Gateway` — circuit-breaker trip

Response headers include `Retry-After: 30`.

```json
{
  "error_code": "UPSTREAM_UNAVAILABLE",
  "message": "Air quality provider is unavailable; circuit breaker is open.",
  "upstream_provider": "openaq",
  "circuit_breaker": {
    "state": "open",
    "failure_count": 5,
    "opened_at": "2026-07-04T09:29:12Z"
  },
  "retry_after_seconds": 30,
  "request_id": "req_4b8e0d1a"
}
```

### 5.3 `422 Unprocessable Entity` — out-of-bounds latitude (reference)

`GET /v3/advisory?lat=118.5&lon=72.8777`

```json
{
  "detail": [
    {
      "loc": ["query", "lat"],
      "msg": "Input should be less than or equal to 90",
      "type": "less_than_equal"
    }
  ]
}
```

### 5.4 `400 Bad Request` — no station in range (reference)

```json
{
  "error_code": "NO_STATION_IN_RANGE",
  "message": "No monitoring station within 50 km of the requested coordinates.",
  "request_id": "req_9f2a1c7b"
}
```

---

## 6. Type-parity map

| JSON field | Pydantic (Python) | TypeScript | Nullable |
| --- | --- | --- | --- |
| `schema_version` | `Literal["3.0-global"]` | `"3.0-global"` | no |
| `template` | `Literal["global_standard"]` | `"global_standard"` | no |
| `location.latitude` | `float` (`-90..90`) | `number` | no |
| `location.longitude` | `float` (`-180..180`) | `number` | no |
| `resolved_station` | `str \| None` | `string \| null` | **yes** |
| `observed_at` | `datetime` | `string` (ISO 8601) | no |
| `naqi.aqi` | `int` (`0..500`) | `number` | no |
| `naqi.band` | `NAQIBand` | `NAQIBand` | no |
| `eaqi.level` | `int` (`1..6`) | `number` | no |
| `eaqi.band` | `EAQIBand` | `EAQIBand` | no |
| `raw_pollutants.*` | `float \| None` | `number \| null` | **yes** |
| `advisory.recommended_actions` | `list[str]` | `string[]` | no |
| `advisory.color_hex` | `str` (`^#[0-9A-Fa-f]{6}$`) | `string` | no |
| `detail[]` (422) | `list[ValidationErrorItem]` | `ValidationErrorItem[]` | no |
| `circuit_breaker` (502) | `CircuitBreakerState` | `CircuitBreakerState` | no |

> **`datetime` → `string`:** Pydantic v2 serializes `datetime` to an ISO 8601 string on the wire, so the frontend types it as `string`. Never type it `Date` — JSON has no Date type and `JSON.parse` will not hydrate one.
