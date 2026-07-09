# Aster — Dual-Standard AQI Companion

A live air-quality companion that reads the sky and the air at once. Aster shows India's
NAQI (CPCB) and Europe's EAQI (EEA) side by side, tunes its verdict to your activity and
health profile, and renders a WebGL atmosphere that mirrors the real weather — sun, moon
and stars, drifting clouds, breathing fog, rain, snow and storms — behind a liquid-glass
dashboard.

## Features

- **Dual-standard readings** — NAQI (CPCB) and EAQI (EEA) computed from the same raw
  pollutant concentrations, with a "strictest of the two" mode and a divergence note when
  they disagree.
- **Activity- and profile-aware verdicts** — Safe / Caution / Avoid, weighted by what
  you're about to do (commute, workout, delivery…) and who you are (child, senior,
  respiratory-sensitive).
- **Live WebGL atmosphere** — a single fragment shader renders a textured sun (light,
  clear skies only) or a cratered moon and stars (dark, clear skies only), drifting
  billowed clouds, breathing volumetric fog, wind-blown snow, and rain/lightning storms —
  all driven by real weather data or a manual preview toggle.
- **7-day forecasting matrix** — a multiplicative anomaly regression projects PM2.5
  forward through wind dispersion, humidity trapping and overnight inversion, with every
  driver term shown per day.
- **Neighbourhood-level location** — reverse geocoding surfaces the actual locality
  (e.g. "Bandra West") instead of just the city.
- **Responsive** — a full desktop dashboard and a dedicated mobile app layout (safe-area
  insets, bottom nav) for phones.

## Stack

- React 18 + TypeScript + Vite
- Raw WebGL (no Three.js) for the atmosphere shader
- Data: [Open-Meteo](https://open-meteo.com/) (weather + air quality, no API key required),
  [BigDataCloud](https://www.bigdatacloud.com/) (reverse geocoding)

Aster is a fully client-side single-page app — no backend, no database, no secrets.

## Getting started

```bash
cd web
npm install
npm run dev
```

Then open the printed local URL. Grant location access (optional) or leave the default
location to explore live data.

## Build

```bash
cd web
npm run build   # tsc --noEmit && vite build
npm run preview
```

## Project structure

```
web/src/aster/     Engine (NAQI/EAQI math, forecasting), theme, atmosphere shader,
                    desktop + mobile dashboards
web/src/App.tsx     Top-level layout switch (desktop / mobile)
```
