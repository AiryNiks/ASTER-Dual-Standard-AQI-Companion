# design.md — AQI Health Advisory API · Spatial Glassmorphism DX

| Field | Value |
|---|---|
| Version | 1.0 (Final, post 3× review loop, cross-checked against `prd.md` v1.1 + `trd.md` v1.0) |
| Aesthetic | Spatial Glassmorphism — living 3D atmosphere + floating glass data surfaces |
| Surfaces | Landing/demo page (primary) · Swagger `/docs` skin (**Phase 2** — `trd.md` §7 locks V1 to default Swagger; this doc is the approved brief for the later phase) |
| Default city | Mumbai (19.076, 72.878) — monsoon-haze simulation context |

---

## 1. Design Principles

1. **The page is the air.** The Three.js atmosphere isn't decoration — its density, drift, and tint *are* the current AQI severity. Data and mood are the same layer.
2. **Glass floats, never blocks.** Content lives on translucent surfaces above the scene. Blur signals depth, not style-for-style's-sake.
3. **Soft geometry only.** 24–28 px radii, feathered translucent borders. Zero brutalist artifacts: no sharp corners, no 1 px opaque borders, no zero-radius chips anywhere — including inside Swagger.
4. **DX is the product demo.** The JSON demo card, copy interactions, and error choreography are marketing.

## 2. Color Tokens

### 2.1 Foundation

| Token | Value | Job |
|---|---|---|
| `--bg-base` | `#101211` Carbon Powder | Page base |
| `--surface-card` | `rgba(255,255,255,0.08)` over base | Glass card fill |
| `--surface-modal` | `#161616` Obsidian (at 92% opacity + blur) | Modals/sheets |
| `--scene-top` | `#002F49` Cosmos Blue | 3D backdrop gradient start |
| `--scene-bottom` | `#000926` Deep Navy | 3D backdrop gradient end |
| `--text-primary` | `#F2F1ED` Soft Pearl | Headlines, body (≈15:1 on base) |
| `--text-secondary` | `#B38F6F` Warm Sand | Labels, eyebrows, captions (6.4:1 ✓) |
| `--border-glass` | `rgba(242,241,237,0.10)` | Card borders (translucent, 1.5 px) |
| `--accent-fill` | `#0F52BA` Sapphire | Button/tag **fills only** |
| `--accent-text` | `#D6E6F3` Ice Blue | Links, focus rings, accent **text** |

**Review-loop catch (binding rule):** Sapphire as *text* on Carbon Powder is only 2.6:1 — fails AA. Therefore Sapphire is a **fill-only** token (with Soft Pearl text on it, 6.3:1 ✓); all accent-colored text and focus rings use Ice Blue `#D6E6F3` (≈14:1 ✓).

### 2.2 Severity Ramp (6-band, contrast-verified)

| Band | Name | Hex | Chip text | Ratio |
|---|---|---|---|---|
| 1 | Good — Emerald | `#50C878` | `#101211` dark | 8.9:1 ✓ |
| 2 | Fair — Golf | `#E8C581` | `#101211` dark | 11.6:1 ✓ |
| 3 | Moderate — Cadmium Orange | `#E58423` | `#101211` dark | 6.9:1 ✓ |
| 4 | Poor — Mahogany | `#BA3D03` | `#F2F1ED` pearl | 4.9:1 ✓ |
| 5 | Very Poor — Crimson Blaze | `#C1121F` | `#F2F1ED` pearl | 5.5:1 ✓ |
| 6 | Severe — Crimson Depth | `#710014` | `#F2F1ED` pearl | 11:1 ✓ + 24 px outer glow `rgba(113,0,20,0.45)` |

Rules: severity color is never the only signal (always icon + label); bands map 1:1 to EAQI bands and to NAQI category ordinals (`trd.md` §3); the page's ambient accent binds to the **strictest** standard's band, matching the API's default `standard=strictest`.

## 3. Typography

| Role | Font | Spec |
|---|---|---|
| Display / hero AQI number | Inter Display | 700, 96–140 px, tracking −2%, `font-variant-numeric: tabular-nums` |
| Headings | Inter Display | 600, scale 24/32/48 |
| Body | Inter | 400, 16 px min, line-height 1.6 |
| Data, code, JSON | JetBrains Mono | 400/500, 14–16 px, tabular |

## 4. Layout — Bento Grid

Desktop (≥1024): 12-col, max-w 1200 px, 24 px gutters. Hero row full-width (giant AQI number + verdict pill + city search); below: gauge card (5 col) · pollutant sub-index card (7 col) · advisory card (7 col) · live demo card (5 col, sticky).

**Mobile stacking (≤767 px), strict order:** hero number → verdict pill → dual-gauge card → advisory card → sub-index bars → live demo card. Single column, 16 px gutters, cards full-width. 4/8 px spacing rhythm throughout; `min-h-dvh`; no horizontal scroll at 375 px; all touch targets ≥44×44 px with ≥8 px gaps.

## 5. Components

### 5.1 Glass card (canonical spec)

```css
.card-glass {
  border-radius: 26px;                      /* 24–28px range; 26 default */
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(20px) saturate(140%);
  border: 1.5px solid rgba(242,241,237,0.10);
  box-shadow: 0 24px 64px rgba(0,9,38,0.35); /* Deep Navy shadow, elevation L2 */
}
```

Elevation scale: L1 hover `0 12px 32px`, L2 resting cards, L3 modals `0 40px 96px` + scrim `rgba(16,18,17,0.55)`.

### 5.2 Pill toggle — NAQI ⇄ EAQI ⇄ Strictest

44 px height, full-radius track (`rgba(255,255,255,0.06)`), active thumb = Sapphire fill + Pearl text, inactive labels Warm Sand. Thumb slides with spring (stiffness 170, damping 26). `role="tablist"`, arrow-key navigable, Ice Blue focus ring (3 px).

### 5.3 Arc gauges

270° arc, 12 px stroke, round caps. NAQI gauge: 0–500 scale, needle + center tabular number. EAQI gauge: 6 discrete segments. Track `rgba(242,241,237,0.08)`; fill = current band color; value animates with count-up (600 ms, expo-out) — never animates on reduced motion. Each gauge has `aria-label` summarizing value + category, plus visible text label beneath (color is never sole indicator).

### 5.4 Verdict pill

Full-radius chip, band-colored fill, chip-text color per §2.2 table, Lucide icon (`shield-check` / `alert-triangle` / `octagon-x` for safe/caution/avoid), 16 px text, `role="status"` + `aria-live="polite"` so verdict changes are announced.

### 5.5 Live demo card (DX centerpiece)

- Inputs: lat/lon (Mumbai prefilled), activity + profile selects, GET button (Sapphire fill).
- Tabs: **cURL** | **JSON response**. Response types out at 400 chars/s after resolve.
- **Syntax highlighting (palette-native):** JSON keys Ice Blue `#D6E6F3`; strings Golf `#E8C581`; numbers Emerald `#50C878`; punctuation/braces Warm Sand `#B38F6F`; severity values (`"category"`, `"verdict"`) rendered in their band color. Background: `rgba(0,9,38,0.5)` inset panel, radius 16 px.
- **Copy-to-clipboard:** ghost button (Lucide `copy`, 44 px hit area, `aria-label="Copy cURL"`). Hover: fill `rgba(214,230,243,0.12)` (120 ms). Click: `navigator.clipboard.writeText()` → icon crossfades to Emerald `check` (200 ms expo-out) + tooltip "Copied" → reverts after 1.6 s. Failure (clipboard API denied): tooltip "Press ⌘C" with text auto-selected — never a silent no-op.
- Mumbai default response uses **math-verified** values (PM2.5 58 µg/m³ → NAQI 97 "Satisfactory", PM10 92 → sub-index 92; EAQI PM2.5 → band 5): the demo showcases real NAQI-vs-EAQI divergence, the product's core insight.

## 6. Motion System

| Token | Value |
|---|---|
| `--ease-enter` | `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) |
| `--ease-exit` | `cubic-bezier(0.7, 0, 0.84, 0)` |
| Micro-interactions | 150–200 ms |
| Card entrances | 500–600 ms, +24 px rise, stagger 40 ms |
| Exits | ~65% of enter duration |
| Springs (cards, thumb) | stiffness 170, damping 26 |
| Severity hue crossfade | 900 ms when city/band changes |
| Press feedback | scale 0.97, ≤100 ms response |

Transform/opacity only; all animations interruptible; never block input; no layout-shifting transforms.

### Living Atmosphere (Three.js)

- Cosmos Blue → Deep Navy gradient dome; instanced particle field (desktop 40k / mobile 12k points, additive blending, DPR capped 1.5).
- Bound to severity band: density ×1 (band 1) → ×3.2 (band 6); drift speed slows as severity rises (heavy air); tint = band color at 18% saturation into the haze.
- Mumbai default: monsoon-haze preset — slow horizontal drift, faint rain-streak particles (video-reference homage), band-3 amber tint.
- Idle breathing loop (14 s sine) so the scene lives even untouched; pointer parallax ±12 px scene / ±6 px cards; `requestAnimationFrame` paused on `document.hidden`.

## 7. Loading — The Glass Shimmer

Opaque grey skeletons are forbidden. Sequence:

1. Glass containers render **immediately** (fixed dimensions — CLS < 0.1) over the neutral Cosmos Blue idle scene (no severity tint yet).
2. Placeholders inside cards: rounded bars (radius 8 px) of `rgba(242,241,237,0.06)` with a sweeping highlight:

```css
.shimmer::after {
  background: linear-gradient(100deg, transparent 20%,
              rgba(242,241,237,0.14) 50%, transparent 80%);
  animation: sweep 1.8s cubic-bezier(0.37, 0, 0.63, 1) infinite; /* sine-like */
  /* animates transform: translateX(-100% → 100%); GPU-only */
}
```

3. On resolve: placeholder crossfades into payload (300 ms), atmosphere tints to the severity band over the 900 ms hue crossfade. If loading exceeds 300 ms shimmer is already visible; no spinner anywhere above the fold.

## 8. Error States (fail-fast choreography)

Per `trd.md` §6 the API **fails fast** — there is no circuit breaker; the design mirrors that honesty.

**502 / upstream failure ("the air goes still"):**
1. Atmosphere freezes mid-frame (drift velocity → 0 over 400 ms) and desaturates to grayscale (CSS `filter` on the canvas container, 600 ms).
2. Affected glass cards pulse **once** — border + glow flash Crimson Depth `rgba(113,0,20,0.6)`, 500 ms expo-out. One pulse; looping alarm animations are forbidden.
3. Card content is replaced by the raw error envelope in the demo-card JSON style, max legibility (16 px JetBrains Mono, Pearl on `rgba(0,9,38,0.7)`):

```json
{ "error": { "status": 502, "title": "Bad Gateway",
  "detail": "Upstream air-quality provider timed out (3.0s). No stale data is shown." } }
```

4. Retry button (Sapphire fill, 44 px) + Warm Sand caption "Open-Meteo is unreachable — your coordinates are fine." Error region uses `role="alert"`; retry re-runs the load sequence from §7. Scene color returns via the standard 900 ms crossfade on success.

**Other states:** `400` — inline field errors below inputs (Crimson Blaze text 14 px + icon), first invalid field auto-focused, no scene change. `404` (all pollutants null) — card empty-state: "No modeled data for this point," Warm Sand, with a "Try Mumbai" chip. `429` — demo card only: countdown chip using `Retry-After`, GET button disabled at 0.45 opacity. Errors never tint the atmosphere to a severity color — severity is reserved for *air* meaning only (color-semantics rule).

## 9. Swagger `/docs` Skin — Phase 2 brief

V1 ships stock Swagger (`trd.md` §7). When the skin phase begins, inject via a custom docs route (FastAPI: disable default `docs_url`, serve `get_swagger_ui_html`-style HTML with an appended `<style>` block — Swagger UI's real DOM classes below):

```css
/* Foundation */
body, .swagger-ui { background: #101211; }
.swagger-ui, .swagger-ui .info .title, .swagger-ui .opblock .opblock-summary-description,
.swagger-ui .opblock-description-wrapper p, .swagger-ui table thead tr th,
.swagger-ui .parameter__name, .swagger-ui .response-col_status { color: #F2F1ED; }
.swagger-ui .topbar { display: none; }                    /* remove default green bar */
.swagger-ui .info .description, .swagger-ui .parameter__type { color: #B38F6F; }

/* GET method tag → Sapphire */
.swagger-ui .opblock.opblock-get { background: rgba(15,82,186,0.10);
  border: 1.5px solid rgba(15,82,186,0.35); border-radius: 24px; }
.swagger-ui .opblock.opblock-get .opblock-summary-method {
  background: #0F52BA; color: #F2F1ED; border-radius: 9999px; }

/* Version badge → Warm Sand */
.swagger-ui .info .title small.version-stamp { background: #B38F6F; }
.swagger-ui .info .title small.version-stamp pre.version { color: #101211; }

/* Glass panels, soft geometry (no 1px opaque borders anywhere) */
.swagger-ui .opblock-body, .swagger-ui .model-box, .swagger-ui select, .swagger-ui input {
  background: rgba(255,255,255,0.06); color: #F2F1ED;
  border: 1.5px solid rgba(242,241,237,0.10); border-radius: 16px; }
.swagger-ui .btn.execute { background: #0F52BA; color: #F2F1ED;
  border-radius: 9999px; border: none; }
.swagger-ui .btn.execute:focus { outline: 3px solid #D6E6F3; }
```

Constraint honored: version badge is Warm Sand **fill** with dark text (Warm Sand as text on white Swagger defaults would fail contrast); links/focus inside docs use Ice Blue per the §2.1 rule.

## 10. Performance & Fallback Ladder

| Tier | Trigger | Experience |
|---|---|---|
| Full | WebGL2, `deviceMemory ≥ 4`, no reduced-motion | 40k particles, parallax, full motion |
| Lite | Mobile or `deviceMemory < 4` or `hardwareConcurrency < 4` | 12k particles, no pointer parallax, DPR 1 |
| Static | `prefers-reduced-motion`, WebGL unavailable, or first frame > 50 ms | AVIF poster: Cosmos→Navy gradient + pre-tinted severity glow; all UI animation reduced to opacity fades ≤200 ms |

Additional budget rules: hero above-the-fold is static HTML/CSS (LCP independent of Three.js); WebGL bundle lazy-loaded below the fold; per-frame budget < 16 ms; `content-visibility: auto` on below-fold cards; fonts `font-display: swap` with only two families preloaded; images AVIF/WebP with explicit dimensions.

## 11. Accessibility Checklist (binding)

- All text pairs verified ≥4.5:1 (computed ratios in §2). Focus rings: 3 px Ice Blue, never removed.
- Severity always triple-encoded: color + Lucide icon + text label. Lucide only — no emoji icons.
- Keyboard: full tab order matches visual order; pill toggle arrow-keys; demo card fully operable without pointer; copy button and gauge tooltips keyboard-reachable.
- Screen readers: gauges expose `aria-label` summaries; verdict `aria-live="polite"`; errors `role="alert"`; scene canvas `aria-hidden="true"` with a text equivalent ("Current Mumbai air: Moderate, NAQI 97 / EAQI 5") adjacent.
- `prefers-reduced-motion` honored globally (Static tier); zoom never disabled; body text ≥16 px.

## 11a. Mobile-First Protocol (BINDING)

Authored mobile-first; this section is the concrete, binding spec that the §4 layout and §10 ladder must satisfy. Sole owner: Claude Cowork (all phases).

**Responsive layout (Tailwind breakpoints):** default/unprefixed styles target small screens and stack **vertically** — `flex-col` — with desktop layered on at `md:` and up — `md:flex-row`. Cards are full-width on mobile (16 px gutters), the bento grid engages only at `md:`/`lg:`. No horizontal scroll at 375 px.

**Touch targets ≥ 44 px:** every interactive control (buttons, NAQI⇄EAQI toggle, selects, GET/refresh, copy) is at least `44px` tall (`min-h-[44px]` / `h-11`) with ≥ 8 px spacing.

**Mobile WebGL throttling (mandatory):** the Three.js canvas detects mobile viewports (`window.innerWidth < 768`) and, when mobile:

- reduces the particle count by **50%** vs desktop (desktop 40k → mobile ≤ 20k; the §10 Lite tier's 12k satisfies this), and
- caps the Device Pixel Ratio to **`[1, 1.5]`** — `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))` — never higher,

to prevent battery drain and thermal throttling. Re-evaluate on resize/orientation change, pause `requestAnimationFrame` on `document.hidden`, and fall back to the Static tier under `prefers-reduced-motion`. This supersedes the older "DPR 1" note in §10 as the mobile DPR ceiling.

## 12. Review-Loop Record (mistakes caught & fixed)

1. **Sapphire text contrast failure** (2.6:1 on Carbon) → split into fill-only + Ice Blue text tokens (§2.1).
2. **"Circuit breaker UI" naming** — TRD implements fail-fast, not a breaker → error section renamed and choreographed around the real 502/3.0 s behavior (§8).
3. **Swagger phase conflict** — TRD §7 forbids V1 CSS → skin scoped as Phase 2 brief; realistic Swagger DOM selectors used (`.opblock-get`, `.version-stamp`), not invented classes (§9).
4. **Chip text colors verified by computed luminance** — bands 1–3 dark text, 4–6 pearl text (§2.2); a naive all-pearl ramp would fail on Golf/Cadmium.
5. **Brutalism sweep** — no sharp corners or opaque 1 px borders anywhere, including injected Swagger styles (radius 16–24 px, 1.5 px translucent borders).
6. **Demo payload math re-verified** against `trd.md` breakpoints (PM2.5 58 → NAQI 97; EAQI band 5) so the marketing surface never contradicts the engine.
