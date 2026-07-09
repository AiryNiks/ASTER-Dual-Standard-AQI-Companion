# implementationplan.md — AQI Dynamic Health Advisory API + Dashboard

| Field | Value |
|---|---|
| Version | 1.0 (Final, post 3× sequencing review) |
| Executor | Claude Cowork — sole agent, all 6 phases, strict chronological execution |
| Authoring | Claude (Cowork) — blueprints, math verification, reconciliation, golden vectors |
| Blueprints | `prd.md` · `trd.md` · `design.md` · `schema.md` |
| Hard rule | **Do not start a phase until the previous phase's Terminal Validation Checkpoint exits `0`.** No subjective/visual sign-off anywhere. |

---

## 0. Read-Me-First — Authority & Conflict Ledger

The blueprints were written at different times and **disagree**. This plan resolves every conflict once, here. The agent obeys this ledger over any single document.

**Precedence:** `trd.md` (binding runtime contract) → `schema.md` (typing *discipline* only) → `design.md` (visual/DX) → `prd.md` (intent).

| # | Conflict | `schema.md` says | `trd.md` says | **Binding resolution** |
|---|---|---|---|---|
| C1 | Endpoint | `GET /v3/advisory` | `GET /v1/aqi` (+ `GET /v1/health`) | **Use `/v1/aqi` + `/v1/health`.** |
| C2 | Bad coords | `422` | `400` (RequestValidationError handler overridden) | **Return `400`** via the overridden handler. |
| C3 | Upstream failure | `502` with `circuit_breaker` object | `502` fail-fast, **no breaker**, 3.0 s timeout, no retry | **Fail-fast `502`.** No circuit-breaker fields. |
| C4 | No data | (not covered) | `404` when **all** pollutants null | **`404`** per `trd.md` §6. |
| C5 | Response body | `GlobalStandardAdvisory` (flat) | `meta` / `raw_concentrations` / `indexes` / `medical_advisory` | **Use `trd.md` §4.4 Template 3 shape.** |
| C6 | Error envelope | typed per-status models | single `{ "error": {status,title,detail} }` | **Single envelope** per `trd.md` §6. |
| C7 | Swagger skin | — | §7 locks V1 to **stock** Swagger; `design.md` §9 defers skin to "Phase 2" | Skin is **gated** (see Phase 4, Task 4.5) — build behind the reconciliation flag, do not let it block V1. |

> **`schema.md` is NOT deleted.** It is retained as the *methodology* reference (Pydantic v2 patterns, strict typing, `| null` null-safety, TS↔JSON parity).

> **⚖️ OWNER RULING (this session) — supersedes rows C1, C2, C3, C5 above.** The owner has designated **`schema.md` as the implemented V1 wire contract**: endpoint **`GET /v3/advisory`**, response **`GlobalStandardAdvisory`**, bad-coord → **`422`** (`HTTPValidationError`), upstream failure → **`502`** with the **`circuit_breaker`** object (an Open-Meteo circuit breaker *is* implemented). `trd.md` remains authoritative for **architecture, the NAQI/EAQI math tables (§3), units, and security posture**, which `schema.md` does not redefine. Where only the *shape/endpoint/status* differ, **`schema.md` now wins** by this ruling. `trd.md` itself is not editable under this session's authorization; a later reconciliation of `trd.md` §4.4 to `/v3` is recommended.

---

## 1. Ownership — Claude Cowork (sole agent)

**Claude Cowork is the sole agent responsible for all 6 Phases (Backend and Frontend).** The split-agent workflow is eliminated. Claude authors the blueprints, derives the math, writes and verifies both the Python backend and the React/Three.js frontend, runs the terminal build/test loops, and wires Vercel.

| Owner | Responsibilities | Status |
|---|---|---|
| **Claude (Cowork)** | Everything: author `prd/trd/design/schema`; verify NAQI/EAQI breakpoint tables + golden vectors; resolve the conflict ledger; build & verify the FastAPI backend; build & verify the Vite/React/TS/Tailwind/Three.js frontend; run all terminal checkpoints; wire Vercel deploy. **Deterministic reasoning, code, and command execution.** | ⏳ In progress |

Claude never re-derives math or re-litigates the frozen contract mid-build — it consumes the frozen tables in `trd.md` §3 and the golden vectors. If a checkpoint fails for a *spec* reason (not a code bug), it **stops and escalates**, it does not invent values.

### 1.1 Phase Ownership (OWNER-MANDATED, BINDING)

Codified per owner ruling this session: a single agent owns the full stack.

- **Claude (Cowork) — ALL PHASES.** Sole owner of **Phases 1–6**: the Python backend (`app/`, `api/`, `tests/`), the frontend (`web/`), security, and Vercel deploy, plus all blueprint/state management.
- **Handoff gate (self):** Frontend phases (3–5) begin **only after** `tracker.md` records Phases 1 & 2 complete and the backend is QA-verified (`Contract Frozen: true`) — the contract must be frozen before the UI binds to it.

| Phase | Owner | Domain |
|---|---|---|
| 1 Environment & Scaffolding | **Claude** | Python |
| 2 Backend Core | **Claude** | Python |
| 3 Frontend Architecture | **Claude** | Node/TS |
| 4 Spatial Glassmorphism UI | **Claude** | Node/TS |
| 5 Three.js Integration | **Claude** | Node/TS |
| 6 Deployment | **Claude** | Vercel |

---

## 2. Global Execution Rules

- [ ] Two isolated environments: **Python** (`.venv`, repo root, per `trd.md` §1) and **Node** (`web/`, Vite React-TS). Never install npm packages into the Python env or pip packages into Node.
- [ ] Every checkpoint command must be **non-interactive and headless** (exit code is the gate). No browser, no visual check.
- [ ] All Python tests run with **zero network** (`respx` fixtures, `trd.md` §8.5). Upstream is never hit in CI.
- [ ] Statelessness is a hard constraint: no DB, no Redis, no disk writes (`trd.md` §1).
- [ ] Frontend field names mirror the JSON wire format exactly (`schema.md` golden rule) — zero key remapping.
- [ ] Commit at each green checkpoint with message `phase-N: <name> green`.

Assumed final layout:

```
repo/
├── .venv/                 # Python env (git-ignored)
├── api/index.py           # Vercel entrypoint → app.main:app
├── app/                   # backend (trd.md §1)
├── tests/                 # pytest + respx
├── requirements.txt
├── vercel.json
└── web/                   # Vite React-TS dashboard (frontend)
    ├── src/
    └── package.json
```

---

## Phase 1 — Environment & Scaffolding

**Objective:** Stand up both toolchains and empty scaffolds. No business logic.
**Read:** `trd.md` §1 (repo layout, runtime, `vercel.json`).
**Environment:** Python **and** Node (separation established here).

- [ ] Verify interpreters: Python ≥ 3.11, Node ≥ 18, npm present.
- [ ] Create `.venv`; write `requirements.txt` = `fastapi`, `httpx`, `uvicorn`, `pytest`, `respx`; `pip install -r requirements.txt`.
- [ ] Create backend skeleton: `api/index.py`, `app/__init__.py`, `app/main.py` (app factory returning `app`), empty `app/{routes,schemas,upstream,standards,engine,cache,ratelimit}.py`, `tests/`.
- [ ] `app/main.py` exposes a minimal `app = create_app()` with `GET /v1/health → {"status":"ok"}` only (no upstream).
- [ ] Scaffold frontend: `npm create vite@latest web -- --template react-ts`, then `npm --prefix web install`.
- [ ] Write `vercel.json` exactly per `trd.md` §1 (routing extended in Phase 6, not now).

### Terminal Validation Checkpoint 1

```bash
# Python toolchain + backend import
python3 -c "import sys; assert sys.version_info >= (3,11), sys.version; print('py-ok', sys.version.split()[0])"
. .venv/bin/activate && pip install -q -r requirements.txt \
  && python -c "import fastapi, httpx, uvicorn, pytest, respx; print('deps-ok')" \
  && python -c "from app.main import app; print('app-ok', type(app).__name__)"

# Node toolchain + frontend default build compiles
node --version && npm --prefix web ci \
  && npm --prefix web run build \
  && test -d web/dist && echo "web-build-ok"
```

**Exit gate:** all three blocks print their `*-ok` line and exit `0`.

---

## Phase 2 — Backend Core

**Objective:** Full stateless API: models, Open-Meteo fetcher, math engine, caching/limiting, error matrix.
**Read:** `trd.md` §2–§8 (upstream, engine, contract, cache, errors, tests) **and** `schema.md` (Pydantic v2 discipline, null-safety). **Apply the Conflict Ledger §0.**
**Environment:** Python only.

- [ ] **Task 2.0 — Reconcile the contract (do this first).** Regenerate `app/schemas.py` (Pydantic v2) to the **`trd.md` §4.4 Template 3** shape: `meta`, `raw_concentrations`, `indexes.{naqi,eaqi}`, `medical_advisory`. Endpoint `/v1/aqi`; single error envelope (§6). Carry over `schema.md`'s v2 patterns: `ConfigDict`, `X | None` for nullable pollutants, `Field(description=…, examples=[…])`, `allow_inf_nan=False`. **Ignore** `schema.md`'s `/v3`, `422`, and circuit-breaker fields.
- [ ] **Task 2.1 — Standards tables.** `app/standards.py`: freeze NAQI breakpoints (`trd.md` §3.1) + EAQI band bounds (§3.2) + advisory multipliers/thresholds (§3.3). No magic numbers elsewhere.
- [ ] **Task 2.2 — Engine.** `app/engine.py`: piecewise-linear NAQI with the mandatory `C_high==C_low` guard, CO µg→mg (÷1000), clamp-to-500, deterministic dominant-pollutant tiebreak; EAQI worst-band; `advise()` pure function. Feed Claude's golden vectors as the test oracle.
- [ ] **Task 2.3 — Upstream.** `app/upstream.py`: one module-level `httpx.AsyncClient` (timeout 3.0/connect 1.5); timeout/5xx → raise `UpstreamError` → `502`, no retry.
- [ ] **Task 2.4 — Cache + limiter.** Bounded TTL dict (key `round(lat,3),round(lon,3)`, TTL 1800, maxsize 1000, oldest-evict); sliding-window limiter (60/min, `x-real-ip`, maxsize 10 000).
- [ ] **Task 2.5 — Routes + middleware + errors.** `GET /v1/aqi`, `GET /v1/health`; security-headers middleware (§4.3); override RequestValidationError → `400`; wire `400/404/405/429/502/500` to the single envelope (§6); stock Swagger metadata only (§7).
- [ ] **Task 2.6 — Tests.** Implement the full `trd.md` §8 suite in `tests/` with `respx` (timeout→502, 500→502, all-null→404, partial-null→200+`missing_pollutants`, headers, 405 `Allow: GET`, 429, cache-hit skips upstream).

### Terminal Validation Checkpoint 2

```bash
. .venv/bin/activate

# 1) Contract + engine + full suite, zero network (trd.md §8.5)
python -m pytest -q

# 2) App imports and OpenAPI advertises the ruled /v3 contract (Owner Ruling §0)
python -c "
from app.main import app
paths = app.openapi()['paths']
assert '/v3/advisory' in paths, list(paths)
print('contract-ok', sorted(paths))
"

# 3) Live health check against the running server (no upstream call)
. .venv/bin/activate && (uvicorn app.main:app --port 8000 & echo $! > /tmp/uv.pid) && sleep 3
curl -fs -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/health | grep -qx 200 && echo "health-200-ok"
curl -s http://127.0.0.1:8000/v3/advisory?lat=900\&lon=0 -o /dev/null -w '%{http_code}\n' | grep -qx 422 && echo "bounds-422-ok"
kill "$(cat /tmp/uv.pid)"
```

**Exit gate:** `pytest` reports `0` failures; `contract-ok` lists only `/v1/*`; `health-200-ok` and `bounds-400-ok` both print. **The data contract is now frozen — frontend work may begin.**

---

## Phase 3 — Frontend Architecture

**Objective:** Type-safe data layer: interfaces, fetch hook, loading-state machine. **No visual styling yet.**
**Read:** `schema.md` (typing discipline) **reconciled to the frozen `trd.md` §4.4 body** — i.e. the types produced in Task 2.0. **This phase is deliberately sequenced after the contract is frozen (Checkpoint 2).**
**Environment:** Node only.

- [ ] **Task 3.1 — Interfaces.** `web/src/types/api.ts`: `snake_case` interfaces mirroring the Template 3 body (`meta`, `raw_concentrations` with `number | null` per pollutant, `indexes.naqi/eaqi`, `medical_advisory`) + the single `{ error: {status,title,detail} }` envelope. Enums as string-literal unions matching the 6 severity bands.
- [ ] **Task 3.2 — Fetch hook.** `web/src/hooks/useAdvisory.ts`: calls `/v1/aqi?lat&lon[&activity][&profile]`; returns a discriminated state `idle | loading | success | error`; maps non-2xx JSON to the typed error envelope (400/404/429/502 handled distinctly).
- [ ] **Task 3.3 — Loading state logic.** Skeleton/shimmer **state machine only** (data + timing, not CSS): fixed-dimension placeholders, ≥300 ms shimmer threshold, resolve→payload transition flags (`design.md` §7 behavior, styled in Phase 4).
- [ ] **Task 3.4 — API base URL config** via Vite env (`VITE_API_BASE`), defaulting to same-origin for Vercel.

### Terminal Validation Checkpoint 3

```bash
# Strict typecheck — the contract must compile with no implicit any / no missing null-handling
npm --prefix web run build   # vite build runs tsc under the hood
npx --prefix web tsc --noEmit --strict
echo "types-and-build-ok"
```

**Exit gate:** `tsc --noEmit --strict` and `vite build` both exit `0`.

---

## Phase 4 — Spatial Glassmorphism UI

**Objective:** Tailwind theme + glass components + (gated) Swagger skin. Static/2D only — no Three.js yet.
**Read:** `design.md` §1–§9, §11 (tokens, layout, components, loading, errors, a11y, Swagger skin).
**Environment:** Node (components) + Python (only for the gated Swagger route).

- [ ] **Task 4.1 — Tailwind.** Install + configure; encode `design.md` §2 tokens (foundation + 6-band severity ramp) as theme vars; 24–28 px radii scale (26 default); elevation shadows L1–L3.
- [ ] **Task 4.2 — Core glass components.** `.card-glass` (§5.1), pill toggle (§5.2), arc gauges (§5.3), verdict pill (§5.4), live-demo card (§5.5) — bound to the Phase 3 hook/state. Enforce a11y: focus rings 3 px Ice Blue, triple-encoded severity (color+icon+label), touch targets ≥44 px.
- [ ] **Task 4.3 — Loading skin.** Style the Phase 3 shimmer machine (§7): glass shimmer, no opaque grey skeletons, CLS < 0.1.
- [ ] **Task 4.4 — Error skin.** 400 inline field errors / 404 empty-state / 429 countdown / 502 envelope render (§8) — atmosphere effects deferred to Phase 5.
- [ ] **Task 4.5 — Swagger skin (GATED — Conflict C7).** `trd.md` §7 locks V1 to **stock** Swagger. Build the `design.md` §9 skin (custom `/docs` route + injected `<style>`) **behind a flag**; do **not** replace stock docs in V1 unless the owner lifts the gate. If built, verify server-side only (below).

### Terminal Validation Checkpoint 4

```bash
# Frontend still type-clean and builds with the full UI layer
npm --prefix web run build && npx --prefix web tsc --noEmit --strict && echo "ui-build-ok"

# GATED: only if Task 4.5 skin was enabled — assert the injected theme reaches /docs
. .venv/bin/activate && (uvicorn app.main:app --port 8000 & echo $! > /tmp/uv.pid) && sleep 3
if curl -fs http://127.0.0.1:8000/docs | grep -q "101211"; then echo "swagger-skin-ok"; else echo "swagger-skin-stock (V1 default — expected)"; fi
kill "$(cat /tmp/uv.pid)"
```

**Exit gate:** `ui-build-ok` prints and exits `0`. Swagger line reports either `swagger-skin-ok` (gate lifted) or `swagger-skin-stock` (V1 default) — both are acceptable, neither is a failure.

---

## Phase 5 — Three.js Integration

**Objective:** Living-atmosphere particle field bound to severity band; performance fallback ladder.
**Read:** `design.md` §6 (Living Atmosphere), §2.2 (severity ramp), §10 (Full/Lite/Static tiers), §11 (reduced-motion, `aria-hidden` canvas).
**Environment:** Node only.

- [ ] **Task 5.1 — Scene.** Cosmos→Navy gradient dome + instanced particle field (40k desktop / 12k mobile, additive, DPR ≤ 1.5), lazy-loaded below the fold; hero stays static HTML/CSS (LCP independent).
- [ ] **Task 5.2 — Severity binding (pure fn).** `web/src/three/severityToScene.ts`: `band(1..6) → {density, driftSpeed, tint}` per §6 (density ×1→×3.2, drift slows as severity rises, tint = band color @18% sat). Keep the mapping a **pure, unit-testable** function.
- [ ] **Task 5.3 — State wiring.** Bind scene params to the strictest-standard band from the hook; 900 ms hue crossfade on change; 502 → freeze+grayscale (§8); pause RAF on `document.hidden`.
- [ ] **Task 5.4 — Fallback ladder + a11y.** Full/Lite/Static tiers (§10); honor `prefers-reduced-motion` (Static); canvas `aria-hidden="true"` with adjacent text equivalent.
- [ ] **Task 5.5 — Unit test** the `severityToScene` truth table (band 1 and band 6 endpoints, monotonic drift) with Vitest.

### Terminal Validation Checkpoint 5

```bash
# Pure severity→scene mapping is correct, and the WebGL bundle compiles & tree-shakes
npx --prefix web vitest run src/three/severityToScene.test.ts
npm --prefix web run build && npx --prefix web tsc --noEmit --strict
test -d web/dist && echo "three-integration-ok"
```

**Exit gate:** Vitest passes, build + strict typecheck exit `0`, `three-integration-ok` prints.

---

## Phase 6 — Deployment

**Objective:** Vercel serverless config serving **both** the Python API and the static dashboard; production builds verified headlessly. **No live deploy from this plan.**
**Read:** `trd.md` §1 (`vercel.json`, ASGI-direct, `maxDuration`), §4.3 (headers), §5 (CDN `s-maxage`).
**Environment:** Python + Node (both build here).

- [ ] **Task 6.1 — Entry.** `api/index.py` imports and re-exports `app.main:app` (no custom server, no Procfile — `trd.md` §1).
- [ ] **Task 6.2 — Routing (extends `trd.md` §1).** Update `vercel.json` so `/v1/*` and `/docs`,`/openapi.json` route to `api/index.py` (`maxDuration: 10`) while everything else serves `web/dist` static output. Add the frontend build to Vercel's build step.
- [ ] **Task 6.3 — Prod builds.** Run backend import + frontend production build exactly as Vercel will.
- [ ] **Task 6.4 — Config lint.** `vercel.json` is valid JSON; required keys present; `.venv`, `web/node_modules`, `web/dist` git-ignored.

### Terminal Validation Checkpoint 6

```bash
# 1) vercel.json is valid and wired
python3 -c "
import json
cfg = json.load(open('vercel.json'))
assert cfg.get('functions',{}).get('api/index.py',{}).get('maxDuration')==10, cfg
print('vercel-config-ok')
"

# 2) Serverless entrypoint imports the ASGI app
. .venv/bin/activate && python -c "from api.index import app; print('entry-ok', type(app).__name__)"

# 3) Both production builds succeed exactly as the platform runs them
python -m pytest -q
npm --prefix web run build && test -d web/dist && echo "prod-builds-ok"

# 4) Offline build dry-run (no deploy, no network mutation). Skip cleanly if CLI absent.
command -v vercel >/dev/null && vercel build --yes >/dev/null 2>&1 && echo "vercel-build-ok" || echo "vercel-cli-skip"
```

**Exit gate:** `vercel-config-ok`, `entry-ok`, `pytest` clean, and `prod-builds-ok` all print and exit `0`. `vercel build` prints `vercel-build-ok` when the CLI is installed (`vercel-cli-skip` is acceptable if it is not).

---

## Appendix A — Phase → Environment → Checkpoint quick map

| Phase | Env | Reads | Checkpoint gate (exit 0) |
|---|---|---|---|
| 1 Scaffolding | Py + Node | `trd §1` | deps import · `app` import · `web` builds |
| 2 Backend Core | Python | `trd §2–8`, `schema` | `pytest` · `/v1/*` in OpenAPI · health 200 / bounds 400 |
| 3 Frontend Arch | Node | `schema` (reconciled) | `tsc --noEmit --strict` · `vite build` |
| 4 Glass UI | Node (+Py gate) | `design §1–9,11` | `ui-build-ok` · swagger stock-or-skin |
| 5 Three.js | Node | `design §6,10,11` | Vitest · build · strict typecheck |
| 6 Deploy | Py + Node | `trd §1,4.3,5` | config · entry · `pytest` · both builds |

## Appendix B — Escalation triggers (agent must STOP, not guess)

- A checkpoint fails because a blueprint is internally contradictory beyond Ledger §0.
- Open-Meteo changes response units/fields (breaks `trd.md` §2 assumptions).
- The owner has not ruled on the Swagger-skin gate (C7) and a decision is required to proceed.
- Any temptation to weaken a checkpoint (e.g. drop `--strict`, add network to tests) to force a green — forbidden.
