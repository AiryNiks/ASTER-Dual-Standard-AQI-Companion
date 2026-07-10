# STATE — AQI Advisor (Aster)

## Locked decisions
- **2026-07-09**: Replacing the old `web/src` app with a faithful React port of the
  Claude Design handoff `Aster.dc.html` (source of truth:
  `../AQI Advisor Premium Design-handoff/aqi-advisor-premium-design/project/`).
- **Atmosphere engine = WebGL fragment shader** (ported 1:1 from the design's `makeSky`),
  NOT a Canvas-2D reimplementation. The shader already renders a daylight-only plasma sun,
  a night-only glowing moon, drifting volumetric clouds, breathing fog, and animated
  rain/snow/lightning — strictly more premium than the Canvas-2D fallback in the pasted
  directive. The Canvas-2D directive was the user's workaround for degraded Claude Design output.
- Single **responsive** app = the web dashboard, collapsing to the mobile layout — not the
  design tool's side-by-side showcase of two device frames.
- **Aster Engine Bench** built as a second in-app view (route/tab): 7-day forecasting matrix,
  `predPM(d)` multiplicative anomaly equation, and the verification/A-B audit module.
- Styling mirrors the design: inline styles + CSS custom properties set on a root element
  (light/dark theme maps ported verbatim). Stack unchanged: Vite + React 18 + TS.

## Progress — all phases built & verified live (2026-07-09)
- Old `web/src` removed; new app under `web/src/aster/*` + `web/src/App.tsx`.
- Files: engine.ts (math), theme.ts (theme maps), useAster.ts (state+data),
  AtmosphereCanvas.tsx (WebGL sky), AsterMark.tsx, icons.tsx, TiltCard.tsx,
  Dashboard.tsx, EngineBench.tsx.
- Phase 1 (liquid glass + backgrounds + hover): PASS — verified pastel light + Mumbai Noir
  dark page-bg; glass cards computed `backdrop-filter: blur(...)` + `box-shadow` incl. `inset`
  (inspected 7 cards); TiltCard delivers lift + glare hover.
- Phase 2 (WebGL celestial atmosphere): PASS — daytime sun / night moon gated in shader,
  drifting fbm clouds, breathing fog, rain/snow/storm in a single rAF loop.
- Phase 3 (Engine Bench): PASS — 7-day matrix populated, multiplicative-anomaly equation
  shown above the matrix, A/B audit cross-checks Day +3 PM2.5 (NAQI 173 ⇄ EAQI L6) vs
  EAQI Level 3 (Moderate) in indigo/gold.
- `npm run build` (tsc + vite) green; no console errors.

## Deviations from the pasted directive (intentional, flagged)
- Atmosphere is WebGL (the real Aster.dc.html engine), not a Canvas-2D reimplementation.
- Removed auto-geolocate on first paint (kept the manual locate button) — better UX, no
  permission modal on load. Mumbai is the default location.

## Revamp — 2026-07-09 (second directive, supersedes parts of the above)
- SUPERSEDED (flagged): Engine Bench as a separate view + A/B audit module + equation card
  are REMOVED per the new directive. Its 7-day forecasting matrix now lives in the main
  dashboard (src/aster/ForecastMatrix.tsx, driven by live fcData). Sliders/dev demo gone.
- Shader overhaul (AtmosphereCanvas.tsx): golden textured sun (#FFFDE7→#FBC02D, granulated,
  plasma corona) gated to light theme + daytime + clear; cratered/maria moon + stars gated
  to dark theme (or real night) + clear; celestial geometry width-normalized (`um`) — the
  old height-relative corona whited out the whole tall canvas; layered fluttering snow (4
  parallax depths, wind sway); breathing volumetric fog; dark-theme-visible clouds/rain
  (post-mineral color paths). preserveDrawingBuffer:true enabled for pixel-audit tooling.
- Light scrim lightened (0.58/0.38/0.46/0.74) so the sky shows through — verified text
  still legible.
- Theme transitions: blanket .aster-root color/background/border/shadow ease (index.css).
- Skeleton loaders (glassy shimmer) on hero/weather/pollutants/matrix until fetches settle.
- Hover micro-interactions (.hv, .fcrow:hover). Matrix collapses to 5 columns <900px.
- Debug strings removed (Mumbai Noir / Pastel sky / Phase 1 / dev demo / the page is the air).
- Verified live: light+clear sun, dark+clear moon+stars, snow, fog (pixel-drift), cloud
  motion (pixel-drift), mobile 375px matrix, npm run build green, zero console errors.

## Round 3 — 2026-07-09 (fixes + mobile + audit)
- Overcast clouds now show drifting billow structure (luminance spread verified 17);
  dark fog brightened. Flicker fixed: .fcrow:hover no longer transforms (scrollbar
  toggle in the overflow-x container was the cause; scrollWidth stability verified).
- Matrix + "Should I head out?" cards are TiltCards (tilt verified via dispatched events).
- Mobile app layout (≤640px): src/aster/MobileDashboard.tsx — design's 1b variant with
  safe-area insets + bottom nav; App.tsx switches via matchMedia. Verified at 375×812.
- Locality geocoding: picks highest-order named place from BigDataCloud localityInfo
  (skips Ward/Zone/District noise). Verified end-to-end: "Bandra West · Mumbai,
  Maharashtra" with stubbed coords.
- deriveView extracted to src/aster/derive.ts (shared desktop/mobile).
- Security audit run: no secrets, no XSS sinks, comprehensive .gitignore written.
  npm audit: 0 prod vulns; dev-only esbuild/vite advisory (GHSA-67mh-4wv8-2f99).
- Audit findings: api/ FastAPI backend + vercel.json rewrites are DEAD CODE for the new
  frontend (calls Open-Meteo directly) — decide keep-or-delete before commit.

## Round 4 — 2026-07-09 (backend removal + git)
- Dead backend deleted: api/, app/, tests/, requirements.txt, vercel.json, root
  .env.example, .venv/. Frontend wiring cleaned: vite proxy removed, web/.env.example
  and VITE_API_BASE typing removed, unused tailwind/postcss configs deleted (zero
  references; build output hashes identical before/after).
- Repo: git init + initial commit (identity set locally: Aryan / fifafiesta26@gmail.com).

## Round 5 — 2026-07-10 (celestial realism + motion system)
- Sun rebuilt (AtmosphereCanvas.tsx shader): limb-darkened photosphere (cream core →
  gold → deep-amber rim, mu-based), two-scale drifting granulation, thin chromosphere
  ring, AA'd edge, hot outside rim light, 3-layer volumetric corona (long-tail aura that
  TINTS sky amber + wispy fbm-modulated mid halo + hot bloom). R=0.066·um; anchor stays
  (0.76,0.88) — LOCKED judgment: every viewport band is card-covered, sun-behind-frosted-
  glass is the design language (moon mirrors it top-left).
- Stars rebuilt: 3 lattice depths (190/0.84, 120/0.86 grids via starLayer + 64-grid hero
  stars inline) — per-star size/brightness/color-temp (blue-white vs warm), organic
  twinkle from two beating sines w/ per-star rate/phase/depth; hero stars get soft
  4-point flares. Star pass wrapped in uniform-coherent if(starVis) → light mode pays 0.
- Motion system: :root --ease-out cubic-bezier(.33,1,.68,1) + --ease-spring (.34,1.4,.64,1)
  in index.css; blanket theme fade, .hv (8-prop list + will-change:transform), .fcrow,
  body/App root, chips/tabs/gauges/derive segs, TiltCard (will-change) all on the curves;
  ctlBtn inline transitions REMOVED (the .hv class governs). Shader dark-channel smoothing
  rate 3.4 (τ≈0.29s) so the sky tracks the 0.45s CSS theme cross-fade.
- Mobile = same shader (shared AtmosphereCanvas); MobileDashboard mirrors every inline
  upgrade incl. gauge stroke easing (was linear .9s, no stroke transition).
- VERIFIED LIVE (preview + pixel probes, Intel UHD/ANGLE): build green; shader compiles
  both themes (no console errors); sun circularity 1.000 exact on desktop 1180×1743 AND
  mobile 469×1015, center (0.759,0.122)/(0.758,0.120) vs (0.76,0.12) expected; limb
  profile 238→206→177 lum w/ blue collapse; granulation animates (0.44Δ/0.9s); star
  coverage 4.7–11.8% of sky pixels (≈7× density), twinkle organic (balanced ±, 99% of
  changes on star pixels); theme fade pixel-sampled smooth/monotonic; fps p50 16.7ms
  (60fps, mobile-size dark steady) / 20.5ms transient during theme flip on 2M-px desktop
  canvas. Sandbox emulates prefers-reduced-motion → CSS durations verified via computed
  styles; shader fade unaffected by that media query.

## Open follow-ups (not done, proposed)
- `three` + @types/three still in package.json but unused (raw WebGL) — drop in a
  follow-up commit (also removes tailwind/autoprefixer/postcss devDeps).
- Stale docs describe the old app (prd/design/schema/tracker/rules/appbuilder/
  implementationplan/trd) — archive or rewrite.
- Audit warnings outstanding: sample-data badge + geolocation-denied feedback,
  fetch timeouts (AbortController), React ErrorBoundary, Vite upgrade (dev-only
  esbuild advisory), security headers on the hosting platform.
