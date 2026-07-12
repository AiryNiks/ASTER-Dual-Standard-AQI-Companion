// Aster engine — ported 1:1 from the Claude Design handoff (Aster.dc.html / Aster - Engine Bench.dc.html).
// Pure air-quality math: NAQI (CPCB) + EAQI (EEA) breakpoints, the multiplicative
// anomaly regression forecast, the medical verdict, and weather→sky derivation.

export type Theme = 'light' | 'dark'
export type Standard = 'naqi' | 'eaqi' | 'strictest'
export type SkyMode = 'live' | 'clear' | 'clouds' | 'rain' | 'storm' | 'snow' | 'fog'
export type SceneKind = 'clear' | 'clouds' | 'rain' | 'snow' | 'fog' | 'storm'

export interface RawPollutants {
  pm2_5: number | null
  pm10: number | null
  no2: number | null
  so2: number | null
  o3: number | null
  co: number | null
  nh3: number | null
  pb: number | null
}

export interface SkyState {
  day: number
  dusk: number
  cloud: number
  rain: number
  snow: number
  fog: number
  storm: number
  wind: number
}

export interface Weather {
  tempC: number
  feelsC: number
  humidity: number
  windKmh: number
  precipMm: number
  rainChance: number | null
  code: number
  isDay: boolean
  label: string
  kind: SceneKind
  sky: SkyState
}

export const SEV_COLORS: Record<number, string> = {
  1: '#5FC58C',
  2: '#E7C77D',
  3: '#EAA45B',
  4: '#C0522F',
  5: '#B23A46',
  6: '#7E1730',
}
export const SEV_NAMES: Record<number, string> = {
  1: 'Good',
  2: 'Fair',
  3: 'Moderate',
  4: 'Poor',
  5: 'Very Poor',
  6: 'Severe',
}
export const NAQI_ORD: Record<string, number> = {
  Good: 1,
  Satisfactory: 2,
  Moderate: 3,
  Poor: 4,
  'Very Poor': 5,
  Severe: 6,
}
export const EAQI_NAMES = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor', 'Extremely Poor']
const HAZE: Record<number, number> = { 1: 0.1, 2: 0.18, 3: 0.28, 4: 0.36, 5: 0.44, 6: 0.52 }

const ACT_MULT: Record<string, number> = {
  intense_workout: 3,
  delivery: 2,
  outdoor_work: 2,
  moderate_exercise: 1.75,
  commute: 1.25,
  general: 1,
}
const PROF_MULT: Record<string, number> = {
  respiratory_sensitive: 1.5,
  child: 1.3,
  senior: 1.3,
  adult: 1,
}
export const ACT_LABELS: Record<string, string> = {
  intense_workout: 'Intense workout',
  delivery: 'Delivery',
  outdoor_work: 'Outdoor work',
  moderate_exercise: 'Light exercise',
  commute: 'Commute',
  general: 'General',
}

export const POLL: [keyof RawPollutants, string, string][] = [
  ['pm2_5', 'PM2.5', 'µg/m³'],
  ['pm10', 'PM10', 'µg/m³'],
  ['no2', 'NO₂', 'µg/m³'],
  ['so2', 'SO₂', 'µg/m³'],
  ['o3', 'O₃', 'µg/m³'],
  ['co', 'CO', 'mg/m³'],
  ['nh3', 'NH₃', 'µg/m³'],
  ['pb', 'Pb', 'µg/m³'],
]
export const POLL_NAMES: Record<string, string> = {
  pm2_5: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO₂',
  so2: 'SO₂',
  o3: 'O₃',
  co: 'CO',
  nh3: 'NH₃',
  pb: 'Pb',
}
export const WMO: Record<number, string> = {
  0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Rain showers',
  81: 'Heavy showers', 82: 'Violent showers', 85: 'Snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Storm, hail', 99: 'Storm, hail',
}

// NAQI (CPCB) sub-index breakpoint tables and EAQI (EEA) band edges.
const NAQI_BP: Record<string, number[][]> = {
  pm2_5: [[0, 30, 0, 50], [31, 60, 51, 100], [61, 90, 101, 200], [91, 120, 201, 300], [121, 250, 301, 400], [251, 500, 401, 500]],
  pm10: [[0, 50, 0, 50], [51, 100, 51, 100], [101, 250, 101, 200], [251, 350, 201, 300], [351, 430, 301, 400], [431, 600, 401, 500]],
  no2: [[0, 40, 0, 50], [41, 80, 51, 100], [81, 180, 101, 200], [181, 280, 201, 300], [281, 400, 301, 400], [401, 600, 401, 500]],
  o3: [[0, 50, 0, 50], [51, 100, 51, 100], [101, 168, 101, 200], [169, 208, 201, 300], [209, 748, 301, 400], [749, 1000, 401, 500]],
  so2: [[0, 40, 0, 50], [41, 80, 51, 100], [81, 380, 101, 200], [381, 800, 201, 300], [801, 1600, 301, 400], [1601, 2000, 401, 500]],
  co: [[0, 1, 0, 50], [1.1, 2, 51, 100], [2.1, 10, 101, 200], [10.1, 17, 201, 300], [17.1, 34, 301, 400], [34.1, 50, 401, 500]],
  nh3: [[0, 200, 0, 50], [201, 400, 51, 100], [401, 800, 101, 200], [801, 1200, 201, 300], [1201, 1800, 301, 400], [1801, 2400, 401, 500]],
}
const EAQI_BP: Record<string, number[]> = {
  pm2_5: [10, 20, 25, 50, 75],
  pm10: [20, 40, 50, 100, 150],
  no2: [40, 90, 120, 230, 340],
  o3: [50, 100, 130, 240, 380],
  so2: [100, 200, 350, 500, 750],
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function hexToRgb(h: string): [number, number, number] {
  h = (h || '#888').replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]
}

export function naqiSub(pol: string, C: number | null): number | null {
  const bp = NAQI_BP[pol]
  if (C == null || !bp) return null
  for (const s of bp) if (C <= s[1]) return Math.round(((s[3] - s[2]) / (s[1] - s[0])) * (Math.max(C, s[0]) - s[0]) + s[2])
  const l = bp[bp.length - 1]
  return Math.round(((l[3] - l[2]) / (l[1] - l[0])) * (C - l[0]) + l[2])
}
export function naqiCat(v: number): string {
  return v <= 50 ? 'Good' : v <= 100 ? 'Satisfactory' : v <= 200 ? 'Moderate' : v <= 300 ? 'Poor' : v <= 400 ? 'Very Poor' : 'Severe'
}
export function eaqiBand(pol: string, C: number | null): number | null {
  const b = EAQI_BP[pol]
  if (C == null || !b) return null
  for (let i = 0; i < b.length; i++) if (C <= b[i]) return i + 1
  return 6
}

export interface Indexes {
  naqi: { aqi: number; band: string; dominant: string; sub: Record<string, number> }
  eaqi: { level: number; band: string; dominant: string }
}

// rawE lets the EAQI use its own regulatory basis (EEA: 24h-mean PM + latest-hour
// gases) when the caller has one; it defaults to the NAQI basis for compatibility.
export function computeIndexes(raw: Partial<RawPollutants>, rawE?: Partial<RawPollutants>): Indexes {
  const np = ['pm2_5', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3']
  const sub: Record<string, number> = {}
  let mx = 0
  let dom = 'pm2_5'
  np.forEach((p) => {
    const s = naqiSub(p, (raw as any)[p])
    if (s != null) {
      sub[p] = s
      if (s > mx) {
        mx = s
        dom = p
      }
    }
  })
  const naqi = { aqi: Math.round(mx), band: naqiCat(mx), dominant: dom, sub }
  const eb = rawE || raw
  const ep = ['pm2_5', 'pm10', 'no2', 'o3', 'so2']
  let mb = 1
  let ed = 'pm2_5'
  ep.forEach((p) => {
    const b = eaqiBand(p, (eb as any)[p])
    if (b != null && b > mb) {
      mb = b
      ed = p
    }
  })
  return { naqi, eaqi: { level: mb, band: EAQI_NAMES[mb - 1], dominant: ed } }
}

export function strictestBand(idx: Indexes): number {
  return Math.max(NAQI_ORD[idx.naqi.band] || 1, idx.eaqi.level)
}

// ---- Multiplicative anomaly regression forecast (dashboard "Forecast horizon") ----
const POLLS = ['pm2_5', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3']
const PGROUP: Record<string, string> = { pm2_5: 'pm', pm10: 'pm', no2: 'gas', so2: 'gas', co: 'gas', nh3: 'gas', o3: 'o3' }
export const FC_FULL = ['Today', 'Day +1', 'Day +2', 'Day +3', 'Day +4', 'Day +5', 'Day +6']
export const FC_SHORT = ['Now', '+1', '+2', '+3', '+4', '+5', '+6']
const dWind = [0, -3, -6, -9, -6, 1, 5]
const dRh = [0, 5, 9, 13, 9, 3, -2]
const dTmin = [0, -4, -8, -11, -8, -3, 1]

export const gWind = (w: number, V0 = 12) => 1 / (1 + Math.max(0, w) / V0)
export const gHum = (rh: number, th = 70) => {
  const d = Math.max(0, rh - th)
  return 1 + 0.008 * d + 0.00022 * d * d
}
export const gInv = (tmin: number, w: number, g = 0.7) =>
  1 + g * Math.pow(clamp((16 - tmin) / 16, 0, 1), 0.85) * Math.pow(clamp((7 - w) / 7, 0, 1), 1.3)
export const o3Boost = (w: number, tmin: number) =>
  (1 + 0.6 * clamp((12 - w) / 12, 0, 1)) * (1 + 0.03 * clamp(tmin - 18, -8, 14))

export interface FcRow {
  d: number
  short: string
  label: string
  wind: number
  rh: number
  tmin: number
  fW: number
  fH: number
  fI: number
  predPm: number | null
  naqi: number
  band: string
  ord: number
  domName: string
  conf: number
}
export interface FcData {
  raws: FcRow[]
  chartMax: number
  peak: FcRow
}

export function fcData(weather: Weather, raw: RawPollutants): FcData {
  const w0 = weather.windKmh == null ? 12 : weather.windKmh
  const rh0 = weather.humidity == null ? 60 : weather.humidity
  const t0 = (weather.tempC == null ? 24 : weather.tempC) - 7
  const rho = 0.82
  const gW0 = gWind(w0)
  const gH0 = gHum(rh0)
  const gI0 = gInv(t0, w0)
  const o0 = o3Boost(w0, t0)
  const raws: FcRow[] = FC_FULL.map((label, d) => {
    const wind = clamp(w0 + dWind[d], 0, 60)
    const rh = clamp(rh0 + dRh[d], 10, 100)
    const tmin = t0 + dTmin[d]
    const fW = gWind(wind) / gW0
    const fH = gHum(rh) / gH0
    const fI = gInv(tmin, wind) / gI0
    const fO = o3Boost(wind, tmin) / o0
    const fPM = fW * fH * fI
    const fGas = fW * fI
    const proj: Record<string, number | null> = {}
    POLLS.forEach((pol) => {
      const m = (raw as any)[pol]
      if (m == null) {
        proj[pol] = null
        return
      }
      const f = PGROUP[pol] === 'pm' ? fPM : PGROUP[pol] === 'o3' ? fO : fGas
      proj[pol] = m + Math.pow(rho, d) * (m * f - m)
    })
    const idx = computeIndexes(proj)
    const band = idx.naqi.band
    const ord = NAQI_ORD[band] || 1
    return {
      d,
      short: FC_SHORT[d],
      label,
      wind: Math.round(wind),
      rh: Math.round(rh),
      tmin: Math.round(tmin),
      fW,
      fH,
      fI,
      predPm: proj.pm2_5,
      naqi: idx.naqi.aqi,
      band,
      ord,
      domName: POLL_NAMES[idx.naqi.dominant] || idx.naqi.dominant,
      conf: Math.max(0, 100 - 9 * d),
    }
  })
  const chartMax = Math.max(160, ...raws.map((r) => r.naqi))
  let peak = raws[0]
  raws.forEach((r) => {
    if (r.naqi > peak.naqi) peak = r
  })
  return { raws, chartMax, peak }
}

// ---- Medical verdict ----
export interface Verdict {
  key: 'safe' | 'caution' | 'avoid'
  label: string
  color: string
  fg: string
  risk: number
  headline: string
  reasoning: string
  prec: string[]
}
export function verdict(band: number, act: string, prof: string): Verdict {
  const a = ACT_MULT[act] || 1
  const p = PROF_MULT[prof] || 1
  const risk = Math.round((band / 3) * a * p * 100) / 100
  const key = risk >= 3 ? 'avoid' : risk >= 1.2 ? 'caution' : 'safe'
  const label = { safe: 'Safe to go', caution: 'Caution', avoid: 'Avoid' }[key]
  const color = { safe: '#1F9D66', caution: '#E7A24C', avoid: '#C24C58' }[key]
  const fg = { safe: '#ffffff', caution: '#3A2910', avoid: '#ffffff' }[key]
  const al = (ACT_LABELS[act] || 'activity').toLowerCase()
  const al2 = act === 'general' ? 'heading out' : al
  const headline = {
    safe: 'Air is fine for ' + al2 + ' right now.',
    caution: 'Take it easy — ' + al2 + ' carries some risk.',
    avoid: 'Air is unsafe for ' + al2 + ' in this area.',
  }[key]
  const pmap: Record<string, string> = {
    respiratory_sensitive: ' with a respiratory-sensitive profile',
    child: ' for a child',
    senior: ' for a senior',
    adult: '',
  }
  const reasoning =
    'Strictest standard reads ' + SEV_NAMES[band] + ' (band ' + band + '). At ' + al + ' breathing rates' +
    (pmap[prof] || '') + ', exposure risk scores ' + risk + '.'
  const prec =
    key === 'avoid'
      ? ['Wear an N95 / FFP2', 'Limit exposure to 30 min', 'Cabin-filtered vehicle', 'Reschedule effort']
      : key === 'caution'
        ? ['Carry a mask', 'Take indoor breaks', 'Avoid traffic corridors']
        : ['Enjoy the outdoors', 'Stay hydrated']
  return { key, label, color, fg, risk, headline, reasoning, prec }
}

// Open-Meteo's WMO weather_code can report a light-precipitation code (drizzle / slight
// rain) off trace modeled precip — e.g. code 51 "light drizzle" with only 0.1 mm and 74%
// cloud, which everyone else (and the sky itself) reads as simply cloudy. When a LIGHT
// precip code carries under a perceptible amount of precipitation, reclassify it by cloud
// cover. The model's convective scheme over-reports the same way for THUNDERSTORMS: high
// monsoon CAPE paints code 95 across whole afternoons while actual precipitation stays at
// a trace (verified live 2026-07-12: code 95 + 0.2 mm + user-confirmed no storm). An
// occurring thunderstorm rains, so code 95 under 0.5 mm is reclassified too. Moderate/
// heavy rain (63/65), showers (80+), snow, fog and hail storms (96/99) are never touched,
// so genuine precipitation always stands.
const LIGHT_PRECIP_CODES = new Set([51, 53, 56, 57, 61])
const PRECIP_MIN_MM = 0.2
const STORM_PRECIP_MIN_MM = 0.5
export function reconcileWeatherCode(
  code: number,
  precipMm: number | null | undefined,
  cloud: number | null | undefined,
): number {
  const p = precipMm || 0
  const overReported =
    (LIGHT_PRECIP_CODES.has(code) && p < PRECIP_MIN_MM) || (code === 95 && p < STORM_PRECIP_MIN_MM)
  if (!overReported) return code
  const cc = cloud == null ? 100 : cloud
  if (cc >= 70) return 3 // Overcast
  if (cc >= 40) return 2 // Partly cloudy
  if (cc >= 15) return 1 // Mostly clear
  return 0 // Clear sky
}

// ---- Weather → sky derivation ----
export function kindOf(c: number): SceneKind {
  if (c >= 95) return 'storm'
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow'
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain'
  if (c === 45 || c === 48) return 'fog'
  if (c >= 2) return 'clouds'
  return 'clear'
}
function rainInt(c: number, mm: number): number {
  let b = 0
  if (c === 51 || c === 56) b = 0.28
  else if (c === 53) b = 0.38
  else if (c === 55 || c === 57) b = 0.5
  else if (c === 61 || c === 66) b = 0.45
  else if (c === 63) b = 0.65
  else if (c === 65 || c === 67) b = 0.9
  else if (c === 80) b = 0.5
  else if (c === 81) b = 0.72
  else if (c === 82) b = 1
  else if (c >= 95) b = 0.82
  const n = Math.min((mm || 0) / 8, 0.25)
  return Math.min(1, b + (b > 0 ? n : 0))
}
function snowInt(c: number): number {
  if (c === 71 || c === 77) return 0.4
  if (c === 73 || c === 85) return 0.65
  if (c === 75 || c === 86) return 0.9
  return 0
}
export function duskF(now: number, evs: number[]): number {
  const W = 3e6
  let best = 0
  evs.forEach((ev) => {
    const d = Math.abs(now - ev)
    if (d < W) best = Math.max(best, 1 - d / W)
  })
  return best
}
export function deriveSky(w: {
  code: number
  isDay: boolean
  cloudCover?: number
  windKmh?: number
  precipMm?: number
  dusk?: number
}): SkyState {
  const k = kindOf(w.code)
  const floor = k === 'storm' ? 0.95 : k === 'rain' ? 0.75 : k === 'snow' ? 0.6 : k === 'fog' ? 0.4 : 0
  return {
    day: w.isDay ? 1 : 0,
    dusk: w.dusk || 0,
    cloud: Math.max((w.cloudCover || 0) / 100, floor),
    rain: rainInt(w.code, w.precipMm || 0),
    snow: snowInt(w.code),
    fog: k === 'fog' ? 0.85 : 0,
    storm: k === 'storm' ? 1 : 0,
    wind: Math.min((w.windKmh || 0) / 45, 1),
  }
}

export const PRESETS: Record<string, Omit<SkyState, 'day' | 'dusk'>> = {
  clear: { cloud: 0.06, rain: 0, snow: 0, fog: 0, storm: 0, wind: 0.15 },
  clouds: { cloud: 0.72, rain: 0, snow: 0, fog: 0, storm: 0, wind: 0.3 },
  rain: { cloud: 0.85, rain: 0.7, snow: 0, fog: 0, storm: 0, wind: 0.45 },
  storm: { cloud: 0.97, rain: 0.88, snow: 0, fog: 0, storm: 1, wind: 0.7 },
  snow: { cloud: 0.6, rain: 0, snow: 0.8, fog: 0, storm: 0, wind: 0.2 },
  fog: { cloud: 0.45, rain: 0, snow: 0, fog: 0.9, storm: 0, wind: 0.1 },
}

export interface EffectiveSky extends SkyState {
  haze: number
  hazeColor: string
  dark: number
}
export function effectiveSky(
  weather: Weather,
  raw: RawPollutants,
  skyMode: SkyMode,
  theme: Theme,
  atmosphere = 'Balanced',
): EffectiveSky {
  const base = weather.sky
  let sky: SkyState = base
  if (skyMode !== 'live') {
    const pr = PRESETS[skyMode]
    sky = Object.assign({}, pr, { day: base.day, dusk: base.dusk }) as SkyState
  }
  const band = strictestBand(computeIndexes(raw))
  const hm = atmosphere === 'Cinematic' ? 1.35 : atmosphere === 'Serene' ? 0.6 : 1
  return Object.assign({}, sky, {
    haze: (HAZE[band] || 0.2) * hm,
    hazeColor: SEV_COLORS[band],
    dark: theme === 'dark' ? 1 : 0,
  })
}

export const DEFAULT_WEATHER: Weather = {
  tempC: 31, feelsC: 35, humidity: 66, windKmh: 14, precipMm: 0, rainChance: 20, code: 2,
  isDay: true, label: 'Partly cloudy', kind: 'clouds',
  sky: { day: 1, dusk: 0, cloud: 0.5, rain: 0, snow: 0, fog: 0, storm: 0, wind: 0.3 },
}
export const DEFAULT_RAW: RawPollutants = {
  pm2_5: 58, pm10: 92, no2: 38.1, so2: 12.7, o3: 55.3, co: 1.4, nh3: 9.2, pb: null,
}
