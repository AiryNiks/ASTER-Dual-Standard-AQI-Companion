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

## Round 6 — 2026-07-10 (geolocate-first, regulatory AQI bases, sun placement)
- REVERSES the Round-1 locked "no auto-geolocate" decision PER EXPLICIT USER DIRECTIVE:
  mount now calls geolocate(false, fallback) — granted → user coords + regional locality
  ("Bandra West · Mumbai, Maharashtra", verified live via stubbed coords); denied/timeout/
  no-API → Mumbai fallback (verified live: headless auto-deny → Mumbai + data loaded).
- AQI methodology corrected (useAster.fetchAQI): indexes no longer computed from
  instantaneous readings. New state rawNaqi (CPCB basis: 24h means PM/NO2/SO2/NH3, 8h
  rolling max CO/O3, ≥12h/≥6h data floors) + rawEaqi (EEA basis: 24h-mean PM + latest-hour
  gases) from hourly series (past_days=1, observed hours only, string-compare time cutoff).
  computeIndexes(raw, rawE?) gained optional EAQI basis; derive/fcData/effectiveSky
  consumers switched to rawNaqi/rawEaqi; st.raw stays the instantaneous "Raw
  concentrations" readout. Verified: independent recomputation NAQI 52 / EAQI 2 == app
  display (old instantaneous method would have shown ~70 — O3 spike).
- Sun: aspect-aware anchor — asp.x<0.55 (phones) keeps (0.76,0.88); wider desktop shells
  → (0.56,0.87) open sky band between hero columns. R 0.066→0.072. Realism rebalance:
  disc is now the brightest element (halo/bloom/rim cut 0.5/0.28/0.45→0.30/0.18/0.20,
  photosphere brightened) — fixes the "eclipse ring" read when partially occluded.
  Verified via manual-uniform shader drive + pixel profile: center L237 > justOut 216 >
  halo 175, symmetric ±4 lum, anchor exact; desktop screenshot clean.
- Sandbox note: background-tab rAF suspension + intensive timer throttling makes live
  loops unverifiable in hidden preview tabs; driving the app's own GL program with manual
  uniforms + drawArrays is the reliable probe path.

## Round 7 — 2026-07-10 (accuracy audit, mobile Trends tab, polish)
- AQI cross-checked vs aqi.in (Bandra East station 15:51 IST: PM2.5 10, PM10 70,
  US-AQI 58) and Open-Meteo (PM2.5 15.3, PM10 32.4): our NAQI 62 ≈ station-implied CPCB
  ~70, same band — NO code defect; aqi.in headlines US AQI (different scale), Google
  Maps uses inverted 0-100 UAQI (not comparable). Documented, nothing to fix.
- Regional-name FIX (useAster.reverseGeocode): BigDataCloud has no locality names for
  most Mumbai points (only ward/zone polygons — Andheri/Dadar/Powai collapsed to
  "Mumbai"). Primary source now OSM Nominatim reverse (zoom=16, addressdetails), field
  chain suburb→neighbourhood→quarter→residential→village→town→city_district→city with
  the ward/zone junk filter; BigDataCloud kept as fallback. Verified live: Khar /
  Andheri West / Matunga East / Powai; in-app locate flow → "Andheri West · Mumbai,
  Maharashtra". One request per locate (Nominatim policy-compliant).
- Mobile bottom nav: Map + You REMOVED; Now/Trends are real tabs (useState, clickable
  buttons). Trends = glass card w/ "Forecast horizon · 7 days" + peak summary line +
  ForecastMatrix (5-col mobile collapse verified: 7 rows at 375px, no page overflow).
- Tap flash fixed: `-webkit-tap-highlight-color: transparent` on the `*` reset.
- Favicon: web/public/favicon.svg (static AsterMark replica, defs/use) + index.html
  link (Vite base-safe). In dist ✓, served image/svg+xml ✓. Safari ignores SVG
  favicons (platform limit; PNG fallback = possible follow-up).
- All verified live in preview (build ×2 green, console clean, screenshots).

## Round 8 — 2026-07-10 (English-only names, manual location search)
- Locality names English-pinned: Nominatim reverse now sends `accept-language=en`
  (without it the device's Accept-Language can surface native-script OSM names —
  the user's phone showed "बांद्रा पूर्व"). BigDataCloud fallback was already en.
- Manual location search: new src/aster/LocationSearch.tsx — spotlight-style glass
  panel (existing --card tokens, z-200 scrim, aspin spinner, .lsrow hover) fed by the
  Open-Meteo geocoding API (key-less, language=en, debounced 300ms, 6 hits, stale-
  response seq guard). Triggers: desktop location pill + mobile location row (both
  now clickable; locate button isolated via stopPropagation). Picks call new
  useAster.setLocation(lat,lon,name,sub) — sets names directly, re-fetches weather+AQI,
  SKIPS reverse geocode so the chosen name isn't overwritten. Esc/Enter/scrim-close.
- Verified live (fresh mounts): Delhi pick → NAQI 205 / EAQI 5 Very Poor / 33° (full
  derivation reflow); Andheri/Powai/Borivali resolve w/ Indian admin subs; console
  error-free via post-reload probe (earlier hook-order warnings = HMR-window artifacts
  from inserting setLocation mid-session; hook order is static in source).
- Env note: preview screenshot pipeline wedged again this round — panel verified via
  a11y snapshot + reused (previously screenshotted) design tokens.

## Round 9 — 2026-07-10 (code review: location fetch race fix)
- Reviewed full web/src. One substantive bug: useAster fetch results were unguarded, so
  a slow response for an OLD location could overwrite a NEWER one (rapid search/locate/
  refresh) — showing e.g. Delhi's AQI under the name "Mumbai". Exactly the "wrong AQI"
  class the user flagged.
- FIX: monotonic reqSeq ref. fetchWeather/fetchAQI/reverseGeocode take a seq token and
  drop their patch if seq !== reqSeq.current; loadFor/setLocation bump the token and gate
  the loading:false flip. (LocationSearch already had its own result-seq guard; unchanged.)
- Verified live (clean full-reload mount, prod code): shimmed Delhi AQI to resolve 2.5s
  LATE, then rapid Delhi→Mumbai pick → Mumbai NAQI 62 survives (would've been ~205 pre-
  fix); single Delhi pick still correctly shows 205; zero console errors post-reload.
  (Hook-order warnings seen mid-edit were HMR artifacts of adding a useRef — gone after
  full reload, confirmed clean.)
- No security/perf findings: no secrets, no XSS sinks, search query encodeURIComponent'd,
  canvas rAF loop already has full teardown. Build green.

## Round 10 — 2026-07-10 (weather condition accuracy)
- Bug: app showed "Light drizzle" while Google/reality said cloudy. Root cause = Open-Meteo
  WMO weather_code 51 (light drizzle) returned off TRACE modeled precip (0.1mm) at 74–93%
  cloud. App was faithful to the API, but the API over-reports drizzle on negligible precip.
- FIX (engine.ts reconcileWeatherCode + useAster.fetchWeather): light-precip codes
  {51,53,56,57,61} carrying <0.2mm are reclassified by cloud cover (≥70→Overcast, ≥40→Partly
  cloudy, ≥15→Mostly clear, else Clear). Moderate/heavy rain (63/65), showers (80+), snow,
  fog, storms are NEVER touched — genuine precip always stands. Reconciled code drives label,
  icon, kind AND sky (deriveSky), so the rendered atmosphere matches too.
- Verified: 12/12 unit cases (incl. real 0.3mm drizzle + 0.2mm light rain preserved; heavy
  rain/storm/fog untouched); live Mumbai raw 51/0.1mm/93% → Overcast; running app renders
  "Overcast · Feels" (no "Light drizzle"), zero console errors, build green. Desktop+mobile
  share state.weather so both fixed. (Screenshot pipeline wedged by WebGL canvas again —
  verified via page-text + Node, per prior rounds.)
- Git: confirmed local == origin/main before starting (d11310b, all verified files pushed).

## Round 11 — 2026-07-10 (first-load location accuracy)
- Bug: on first load location was wrong (Kurla West), only correct (Bandra East) after a
  re-fetch. Cause = geolocate options `{ maximumAge: 6e5, enableHighAccuracy: false }`:
  accepted a 10-min-stale cached position AND used coarse network location (km-off), and
  getCurrentPosition returns the FIRST (coarse) fix before GPS locks.
- FIX (useAster.geolocate): switched to watchPosition with
  `{ enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }`. Commits the first fix with
  accuracy ≤100m (neighbourhood-sharp); a 10s deadline commits the best fix gathered so far
  (else onFail→Mumbai). clearWatch + done-guard on every exit path (commit/giveUp) — no
  leak, no double-commit, no stuck-loading.
- Verified live (mocked watchPosition): (a) coarse fix acc 2500 fires NO fetch → sharp fix
  acc 40 commits (19.064 Bandra), watch cleared; (b) only-coarse → 10s deadline commits best
  coarse (19.070), watch cleared, no hang. Options object asserted correct. Build green,
  console clean. Real GPS unavailable in sandbox so logic proven via injected fixes.

## Round 12 — 2026-07-11 (forecast highlight, load delay, cloud/fog motion)
- (1) Default-selected day REMOVED: ForecastMatrix no longer paints the peak row
  (r.d===peakD → accent bg). peakD prop dropped from component + both call sites (grep
  clean). Verified 0 highlighted rows, desktop + mobile Trends, 7 rows each.
- (2) ~5s load delay FIXED: root cause was Round-11's watchPosition change — data loading
  was gated behind the GPS fix. Mount now paints DEFAULT (Mumbai) weather+AQI immediately
  (reqSeq-guarded, no reverse-geocode so label stays "Mumbai") and runs geolocate(false)
  in parallel to refine. Verified via Resource Timing: AQI/weather done ~600ms after nav
  (was: waited on 10s watchPosition deadline when GPS slow/denied).
- (3) Clouds motion (clouds mode, light+dark): added cloudsMode factor
  =smoothstep(0.45,0.68, uCloud*(1-uRain)*(1-uStorm)*(1-uSnow)*(1-uFog)) — ≈1 ONLY in
  clouds/live-cloudy, ≈0 elsewhere. drift+=cloudsMode*2.0 (translation only). Dark clouds
  lifted cloudCol*=1+cloudsMode*uDark*0.6 for night visibility. Measured drift: light 54.5%,
  dark 19.6% (was ~2.8%).
- (4) Fog motion (fog mode, light+dark): fog was a flat saturated wash → looked static
  (the actual bug, present in original too). Now: patchy drifting density
  (smoothstep→0.32..1.0), faster 2-bank drift, moving luminance wisps (centred on 1.0),
  and dark fogCol brightened 0.13→0.32 (lit night fog) for visible contrast. Measured
  drift: light 13.2%, dark 17.6% (was 0%/0%). Fog block is inside if(uFog>0.003) → other
  modes untouched by construction.
- SCOPING (user: "strictly don't change other modes"): cloudsMode=0 for rain/storm/snow/
  clear (product<0.45) → drift boost + dark-cloud lift never apply; fog edits gated on
  uFog>0. Rain ref drift unchanged (18.8%). VERIFIED via manual shader-uniform drive +
  readPixels drift (tab backgrounded → app rAF paused, so drove the program directly, as
  in prior rounds). Build green ×5, console clean, no shader-compile errors, app renders
  desktop+mobile. Live 60fps rAF animation confirmed in earlier rounds.

## Open follow-ups (not done, proposed)
- `three` + @types/three still in package.json but unused (raw WebGL) — drop in a
  follow-up commit (also removes tailwind/autoprefixer/postcss devDeps).
- Stale docs describe the old app (prd/design/schema/tracker/rules/appbuilder/
  implementationplan/trd) — archive or rewrite.
- Audit warnings outstanding: sample-data badge + geolocation-denied feedback,
  fetch timeouts (AbortController), React ErrorBoundary, Vite upgrade (dev-only
  esbuild advisory), security headers on the hosting platform.
