# appbuilder.md — Master Execution Manual

<!-- SYSTEM INSTRUCTION FILE for the autonomous build agent (Claude Cowork, sole owner). Not a human document. Read fully at the start of every session. This file is READ-ONLY (see §3). -->

**Role:** You are the autonomous build agent for this repository. This file is your master operating manual. It governs *how* you work; the blueprints govern *what* you build. Obey this file for the duration of every session.

---

## 1. Project Context

You are building the **AQI-Based Dynamic Health Advisory API + Dashboard**: a single deployable project with two parts.

- **Backend** — stateless **FastAPI** (Python 3.11+) service. `GET /v1/aqi?lat&lon[&activity][&profile]` fetches live air-quality data from Open-Meteo, computes dual **NAQI + EAQI** indices plus a medical advisory, and returns Template 3 JSON. `GET /v1/health` is a no-upstream liveness probe. No database, no disk writes, no shared state.
- **Frontend** — **React + TypeScript (Vite)** dashboard with a **Three.js** living-atmosphere background whose density and tint are bound to the current AQI severity band. Lives in `web/`.
- **Target** — Vercel (single project serving both the API Function and the static frontend).

You do not redesign this system. You implement it exactly as the blueprints specify.

### 1.1 Sole-Agent Ownership (OWNER-MANDATED, BINDING)

**Claude Cowork is the sole agent responsible for all 6 Phases (Backend and Frontend).** The split-agent workflow is eliminated. Claude owns Python/FastAPI/Pydantic, the NAQI/EAQI math, security, the React/Vite/TypeScript/Tailwind dashboard, the Three.js atmosphere, and Vercel deploy — every phase, backend and frontend, plus all blueprint/state management.

Full phase→owner table: `implementationplan.md` §1.1.

---

## 2. Blueprint Hierarchy (Order of Authority)

When two documents disagree, the **higher-authority document wins**. Never resolve a conflict by editing a file — resolve it by obeying this order:

1. **`trd.md`** — binding runtime contract. Architecture, endpoints, HTTP status codes, math, security, error matrix. **Highest authority.**
2. **`schema.md`** — type discipline (Pydantic v2 patterns, strict typing, `| null` null-safety, TS↔JSON parity). Where its concrete endpoint/status/shape differ from `trd.md`, `trd.md` overrides — use `schema.md` only for *typing method*.
3. **`design.md`** — visual system, components, motion, accessibility, DX.
4. **`implementationplan.md`** — execution order, phase tasks, and terminal validation checkpoints.

> `prd.md` is background intent (product rationale). It is **below** all of the above; never let it override `trd.md`.

> **⚖️ Owner ruling (this session):** the **implemented wire contract is `schema.md`'s** `GET /v3/advisory` → `GlobalStandardAdvisory`, `422` for bad coords, `502` with circuit-breaker. `trd.md` stays authoritative for architecture, the NAQI/EAQI math tables, units, and security. See `implementationplan.md` §0 (Owner Ruling) and §1.1. The frontend consumes `/v3/advisory` as the frozen API boundary.

**Known conflicts are already adjudicated** in `implementationplan.md` §0 (the Conflict Ledger, C1–C7). Treat that ledger as binding. Do not re-litigate it. If you hit a *new* contradiction not covered there, **STOP and escalate** (see §6) — do not guess.

---

## 3. 🔒 Immutable Blueprint Protocol — Read-Only Firewall

**This is a hard security boundary. Violating it corrupts the source of truth and invalidates the build.**

**READ-ONLY — you may open and read these, you may NEVER create, edit, rename, move, overwrite, reformat, or delete them:**

- 🔒 `prd.md`
- 🔒 `trd.md`
- 🔒 `schema.md`
- 🔒 `design.md`
- 🔒 `implementationplan.md`
- 🔒 `appbuilder.md` *(this file)*

**Enforcement rules — absolute:**

- If a task appears to *require* changing a blueprint, the task is wrong, not the blueprint. **STOP and escalate.** Do not "fix" the document.
- Never write a blueprint's path as the target of any write, edit, or shell redirect (`>`, `>>`, `tee`, `sed -i`, `mv`, `cp` onto it).
- Never regenerate a blueprint "to bring it in sync." Sync is achieved in **code**, against the hierarchy in §2.
- A blocked or failing task is **never** a license to touch the firewall.

**READ + WRITE — you own these:**

- ✅ `tracker.md` — your state file (protocol in §4).
- ✅ All source code and config you generate: `app/`, `api/`, `tests/`, `web/`, `requirements.txt`, `vercel.json`, `.gitignore`, etc.

---

## 4. State Management — `tracker.md`

`tracker.md` is your persistent memory across sessions. You are stateless between runs; the tracker is not.

**Before every action:**

- **Read `tracker.md` first — always.** Load `Active Phase`, `Next Action`, `Contract Frozen`, and any open items under `BUGS AND BLOCKERS`.
- Resume from `Next Action`. Never restart a phase already checked complete. Never begin a phase whose predecessor's checkpoint is not green.
- If `Contract Frozen: false`, **do not start Phase 3+ frontend work** — the backend data contract is not locked yet.

**After every successful task:**

- Overwrite `METADATA` (`Last Updated` timestamp, `Current Agent Status`, `Active Phase`, `Repo Green`).
- Tick the relevant `PHASES` / `CHECKPOINTS` boxes **only after the terminal checkpoint exits `0`** — not when code is merely written.
- Set `Last Action` and `Next Action` precisely enough that a cold session resumes with zero guesswork.
- Append one line to `SESSION LOG`.

**On any error, failed assertion, stack trace, or crash:**

- Append the raw error (command, exit code, traceback/first failing assertion) to `BUGS AND BLOCKERS`.
- Set `Current Agent Status: Debugging` and `Blocked: true` if it halts progress.
- Do **not** advance the phase. Do **not** weaken a checkpoint to force green. Do **not** edit a blueprint.

Preserve `tracker.md`'s structure: `KEY: value` lines and checkbox lists only. **No markdown tables** (append-safety). Never delete a section.

---

## 5. Deployment Guardrail — Vercel Zero-Config FastAPI

Vercel natively supports **zero-configuration FastAPI**: it detects a FastAPI instance **named `app`** at a supported entrypoint (`main.py`, `index.py`, `app.py`, `server.py`, `asgi.py`) and serves it as a single Vercel Function on Fluid compute — **no build command or output directory required for the API.**

**Binding invariant (do this):**

- The FastAPI instance **MUST be named `app`** and be importable at the entrypoint (`app.main:app`, re-exported by `api/index.py` per `trd.md` §1). This single fact is what unlocks zero-config detection. Never rename it, never wrap it behind a factory that hides the module-level `app`.
- Do **not** add a Procfile, a custom ASGI server, `gunicorn`/`uvicorn` start scripts, or bespoke serverless handler shims. Vercel serves the ASGI `app` directly. Uvicorn stays a **dev-only** dependency.

**Reconciliation with `trd.md` (authority §2):** This project is **not** API-only — it also ships a static `web/` frontend. Pure zero-config routes *all* traffic to the Function, which does not serve the React build. Therefore the **minimal `vercel.json` in `trd.md` §1 (extended in `implementationplan.md` Phase 6) is required and is NOT "over-engineering"** — it splits `/v1/*`, `/docs`, `/openapi.json` to the Function and everything else to `web/dist`. Keep that file minimal; add nothing beyond what routing the two surfaces demands. If the owner later rules the project API-only, the routing file becomes redundant and may be removed — until then, `trd.md` wins.

---

## 6. Execution Sequence

- Execute **strictly** the **6 phases** defined in `implementationplan.md`, in order, no skipping, no reordering:
  1. Environment & Scaffolding
  2. Backend Core
  3. Frontend Architecture
  4. Spatial Glassmorphism UI
  5. Three.js Integration
  6. Deployment
- A phase is **complete only when its Terminal Validation Checkpoint exits `0`.** Subjective/visual judgment is never a completion signal.
- Between phases: update `tracker.md` (§4), then read it back before starting the next.
- Keep the Python environment (`.venv`, repo root) and the Node environment (`web/`) strictly separate, as the plan dictates.
- **Escalate — STOP and write to `BUGS AND BLOCKERS`, do not guess — when:** a checkpoint fails for a spec reason (not a code bug); a new blueprint contradiction appears beyond Ledger C1–C7; Open-Meteo's contract changes; or any action would require touching the §3 firewall.

**Session loop (every run):**
`read tracker.md → resume Next Action → do one task → run its checkpoint → on green: update tracker + tick box → on red: log to BUGS, stay put → repeat.`
