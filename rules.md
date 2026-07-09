# rules.md — Coding Standards, Security Protocol & Agent Behavior

<!-- SYSTEM CONSTRAINT FILE for the autonomous IDE agent. Read-only (governed by appbuilder.md §3). Non-negotiable. Every rule is a hard gate: a violation is a build failure, not a warning. Subordinate to trd.md on architecture; where a rule hardens beyond trd.md, see the flagged reconciliations. -->

**Zero-trust posture.** Assume every input is hostile, every secret is one mistake from leaking, and every "temporary" shortcut ships to production. These are commands, not guidelines. If a rule cannot be satisfied, **STOP and escalate to `tracker.md → BUGS AND BLOCKERS`** — never weaken the rule.

---

## 0. Agent Scope & Ownership (OWNER-MANDATED, BINDING)

- **Claude Cowork is the sole agent responsible for all 6 Phases (Backend and Frontend).** The split-agent workflow is eliminated; there is no separate frontend agent. Claude owns backend (`app/`, `api/`, `tests/`) and frontend (`web/`) alike, and must uphold every rule in this document across both.
- **Implemented wire contract = `schema.md`** (`/v3/advisory` → `GlobalStandardAdvisory`, `422` bad coords, `502` circuit-breaker) per the owner ruling in `implementationplan.md` §0. The frontend consumes `GET /v3/advisory` as its fixed HTTP boundary.

---

## 1. Code Completeness & Quality

- **You MUST ship fully implemented, production-grade code.** Every function has a complete body and a real return value.
- **FORBIDDEN in committed code:** `// TODO`, `# TODO`, `FIXME`, `XXX`, placeholder `pass` bodies, `raise NotImplementedError`, `throw new Error("not implemented")`, stubbed returns, commented-out code, and `console.log`/`print` debug residue.
- **NO mocked or hardcoded data in application code.** Real data comes from the Open-Meteo upstream (`trd.md` §2). Fixtures (`respx`, Vitest mocks) are permitted **only** inside `tests/` and `web/src/**/*.test.ts(x)`.
- `pass` is allowed **only** as the body of a deliberately empty `Protocol`/abstract stub that is never instantiated — nowhere else.
- Dead code, unused imports, and unreachable branches MUST be removed before commit.

---

## 2. Strict Typing

**Python (Pydantic v2):**

- **Every** function/method signature MUST have explicit parameter and return type hints. No bare `def f(x):`.
- Data models are Pydantic v2 `BaseModel` with `ConfigDict` — never v1 syntax (`class Config`, `regex=`, scalar `example=`).
- No untyped `dict`/`list` for structured payloads; model them.
- Nullable fields are `X | None` with an explicit default — never implicit `Optional` ambiguity.

**TypeScript:**

- **The `any` type is ABSOLUTELY FORBIDDEN** — explicit `any`, implicit `any`, and `as any` casts alike. Use precise types or `unknown` with a narrowing guard.
- `tsconfig` runs in `strict` mode; `tsc --noEmit --strict` MUST exit `0`. No `// @ts-ignore` / `// @ts-expect-error` to silence real type errors.
- Wire types mirror `schema.md` (reconciled to `trd.md` §4.4) in `snake_case`, so JSON deserializes with zero remapping.

---

## 3. Secret Management & API Security

**Zero-tolerance. A leaked key is a critical build failure.**

- **Secrets live ONLY in the backend `.env`, accessed ONLY via `os.getenv()`.** Never hardcode a secret in source, never inline it, never commit it.
- **`ANTHROPIC_API_KEY` and any external secret MUST NEVER appear in the frontend.** No secret in `web/`, in any `VITE_*` variable, in the bundle, or in client-shipped code. Vite inlines every `VITE_`-prefixed value into the public bundle — a secret there is a public secret.
- **`.env` MUST be listed in `.gitignore`** before the first commit. Never commit `.env`.
- **You MUST generate a safe `.env.example`** enumerating every required variable **by name with placeholder values only** — never real values. Keep it in sync with `os.getenv()` usage.

```bash
# .env.example  — committed. Contains NO real values.
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxx   # only if a Claude-backed feature is added
# Note: V1 upstream (Open-Meteo, trd.md §2) requires NO API key.
```

> **Reconciliation:** `trd.md` V1 uses only Open-Meteo, which needs **no key** — the ideal secret count is **zero**. This protocol governs any secret that is later introduced. If you find yourself adding a secret not required by a blueprint, STOP and escalate.

---

## 4. Network Security — CORS & Rate Limiting

- The FastAPI backend **MUST enforce CORS** via `CORSMiddleware`, restricted to `GET` (+ preflight) only.
- **Allowed origins MUST come from an env-driven allowlist** (`ALLOWED_ORIGINS`), not a wildcard, in any deployed environment.

```python
import os
origins = [o for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # designated frontend origins ONLY
    allow_methods=["GET"],
    allow_headers=["*"],
)
```

> **Reconciliation (flag to owner):** `trd.md` §4.3 currently sets `allow_origins=["*"]`. `trd.md` is top authority, but a wildcard on a browser-facing API defeats CORS. This rule **hardens** that to a designated allowlist. Treat the allowlist as binding for deploys; if the owner insists on `["*"]` for a truly public no-cookie API, record the exception in `tracker.md` — do not silently pick one.

- **Rate limiting is MANDATORY** — sliding window, **60 req/min per client IP**, per `trd.md` §5. IP resolved from Vercel's `x-real-ip` only; **never trust client-controlled `x-forwarded-for`**. Store in a **bounded** structure (maxsize eviction) to prevent memory-exhaustion DoS. Over-limit → `429` + `Retry-After: 60`.

---

## 5. Local-First Data & Privacy

- **The backend MUST remain 100% stateless** — no database, no server-side sessions, no disk writes, no per-user storage. User state never touches the server.
- **User preferences persist ONLY in the browser's `localStorage`** on the user's device.
- **You MUST sanitize every value read from `localStorage` before it is rendered or used in the DOM.** Treat `localStorage` as untrusted attacker-controlled input (it is user-writable and a stored-XSS vector).
  - Render via React text nodes / bound props only. **NEVER** `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function` with stored data.
  - Validate/parse stored JSON against a strict schema (e.g. a Zod/TS guard); on parse failure or unexpected shape, discard and fall back to defaults — never render raw.
  - Coerce to expected primitives (numbers for lat/lon, enum-checked strings for activity/profile) before use.
- **No third-party tracking cookies. No analytics/advertising SDKs. No cross-site trackers.** First-party functional storage only.
- **You MUST include a minimal, static Privacy/Cookies Policy component** stating: no tracking cookies, preferences stored locally in `localStorage`, coordinates sent to the backend solely to fetch air-quality data and never persisted server-side.

---

## 6. Principle of Least Privilege — Permissions

- **No auto-prompting.** Browser geolocation MUST be requested ONLY in direct response to an explicit user action (a click on a "Use my location" control). **NEVER** call `navigator.geolocation.getCurrentPosition()` on page load, mount, `useEffect`, or any automatic trigger.
- **Secure-context precondition.** Before calling the API you MUST verify both that `navigator.geolocation` exists **and** that the page is a secure context (`window.isSecureContext` — HTTPS or `localhost`). If either check fails, do not call the API; surface a graceful message and keep the current/default coordinates.
- **Data minimization (MANDATORY).** The retrieved `latitude` and `longitude` MUST be rounded to **exactly 4 decimal places** before they are used in any API request, stored, or logged — never send raw high-precision GPS. (4 dp ≈ 11 m; enough for AQI, coarse enough to resist hyper-specific tracking.)
- **You MUST fail gracefully.** On denial (`PERMISSION_DENIED`), dismissal, `TIMEOUT`, `POSITION_UNAVAILABLE`, unsupported API, or non-secure context, default to Mumbai: **`lat = 19.0760`, `lon = 72.8777`** — never block the UI, never loop the prompt, never surface a raw `GeolocationPositionError`.
- **No leaks on unmount.** Guard all post-resolution React state updates (the async position callback may resolve after the component unmounts) so no `setState` fires on an unmounted component.
- Request no browser permission the current interaction does not require.

---

## 7. Log Sanitization

- **You MUST NEVER log secrets, credentials, or `Authorization`/`Cookie`/`x-api-key` headers.**
- **NEVER log raw user payloads, full request headers, or precise coordinates** tied to a session.
- On `500`, log the server-side traceback for diagnostics but **NEVER leak it in the HTTP response body** (`trd.md` §6) — the client gets the sanitized error envelope only.
- No secret, token, or PII in any `print`/`logger` call, exception message, or committed log artifact.

---

## 8. Git Commit Standards

- **Conventional Commits are MANDATORY.** Allowed types: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `style:`, `perf:`, `build:`, `ci:`.

```
feat(engine): implement NAQI piecewise-linear sub-index with C_high==C_low guard
fix(cors): restrict allowed origins to env allowlist
test(upstream): cover timeout->502 and all-null->404 via respx
```

- **Commits MUST be atomic** — one logical sub-task each — and made only **after** that sub-task's terminal checkpoint exits `0` (`implementationplan.md`).
- **NEVER commit** `.env`, real secrets, `node_modules/`, `.venv/`, `web/dist/`, or build artifacts. Verify `.gitignore` covers them before every commit.
- Never commit code that fails typecheck, lint, or tests.

---

## 9. Styling Discipline

- **Tailwind-only styling.** No inline `style={{…}}` for design-token values, no ad-hoc `.css` files, no CSS-in-JS. Exception: the scoped Swagger `<style>` block (`design.md` §9) and the Three.js canvas, which Tailwind cannot reach.
- **Hex codes MUST come verbatim from `design.md`** — foundation tokens (§2.1) and the 6-band severity ramp (§2.2). No invented colors, no eyeballed shades. Encode them once as Tailwind theme tokens and reference the tokens.
- Enforce `design.md` soft-geometry: radii 24–28 px (26 default), 1.5 px translucent borders. **No** sharp corners, no 1 px opaque borders.
- Accessibility is binding (`design.md` §11): text contrast ≥ 4.5:1, focus rings 3 px Ice Blue `#D6E6F3` (never removed), severity always triple-encoded (color + icon + label).

---

## 10. Mobile-First Protocol (BINDING)

- **Responsive layout via Tailwind breakpoints.** The dashboard is authored mobile-first: the default (unprefixed) styles target small screens and stack **vertically** (`flex-col`); desktop layout is layered on with `md:` and up (`md:flex-row`). No fixed pixel widths that force horizontal scroll at 375 px.
- **Touch targets ≥ 44 px.** Every interactive control (buttons, the NAQI⇄EAQI toggle, selects, the GET/refresh button, copy button) MUST be at least `44px` high (`min-h-[44px]` / `h-11`) with ≥ 8 px spacing between adjacent targets.
- **Mobile WebGL throttling (MANDATORY).** The Three.js canvas MUST detect mobile viewports (`window.innerWidth < 768`) and, when mobile:
  - reduce the particle count by **50%** versus desktop, and
  - cap the Device Pixel Ratio to the range **`[1, 1.5]`** (`Math.min(window.devicePixelRatio, 1.5)`), never higher,
  to prevent battery drain and thermal throttling. Re-evaluate on resize/orientation change; pause the render loop on `document.hidden`; honor `prefers-reduced-motion` (static fallback).

---

## Enforcement Summary

Every rule above is a **hard gate**. On any violation or unsatisfiable rule: **do not proceed, do not weaken the rule, do not edit a blueprint** — log it to `tracker.md → BUGS AND BLOCKERS` and escalate. Flagged reconciliations (§3, §4) defer to `trd.md` as top authority until the owner rules; record the chosen exception in `tracker.md`.
