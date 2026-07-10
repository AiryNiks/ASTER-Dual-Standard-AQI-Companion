import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_RAW,
  DEFAULT_WEATHER,
  deriveSky,
  duskF,
  kindOf,
  reconcileWeatherCode,
  WMO,
  type RawPollutants,
  type SkyMode,
  type Standard,
  type Theme,
  type Weather,
} from './engine'

export interface AsterState {
  lat: number
  lon: number
  locName: string
  locSub: string
  standard: Standard
  activity: string
  profile: string
  skyMode: SkyMode
  spinning: boolean
  loading: boolean
  theme: Theme
  observedAt: string
  weather: Weather
  raw: RawPollutants
  // Regulatory index bases: NAQI wants 24h means (8h max for CO/O3), EAQI wants
  // 24h-mean PM + latest-hour gases. `raw` stays the instantaneous readout.
  rawNaqi: RawPollutants
  rawEaqi: RawPollutants
}

const initialTheme: Theme =
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

export function useAster() {
  const [state, setState] = useState<AsterState>({
    lat: 19.076,
    lon: 72.8777,
    locName: 'Mumbai',
    locSub: 'Maharashtra, India',
    standard: 'strictest',
    activity: 'general',
    profile: 'adult',
    skyMode: 'live',
    spinning: false,
    loading: true,
    theme: initialTheme,
    observedAt: new Date().toISOString(),
    weather: DEFAULT_WEATHER,
    raw: DEFAULT_RAW,
    rawNaqi: DEFAULT_RAW,
    rawEaqi: DEFAULT_RAW,
  })
  const patch = useCallback((p: Partial<AsterState>) => setState((s) => ({ ...s, ...p })), [])

  // Monotonic request token. Every location load bumps it; each async result checks it
  // before writing, so a slow response for an old location can never overwrite a newer
  // one when the user rapidly searches/relocates. Refs are stable — no dep-array churn.
  const reqSeq = useRef(0)

  const hap = useCallback(() => {
    try {
      navigator.vibrate && navigator.vibrate(8)
    } catch (e) {
      /* noop */
    }
  }, [])

  const fetchWeather = useCallback(async (lat: number, lon: number, seq?: number) => {
    try {
      const url =
        'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m' +
        '&hourly=precipitation_probability&daily=sunrise,sunset&forecast_days=2&timezone=auto'
      const r = await fetch(url)
      if (!r.ok) throw 0
      const j = await r.json()
      const c = j.current
      let rc: number | null = null
      if (j.hourly && j.hourly.time) {
        const now = new Date(c.time).getTime()
        const ps = j.hourly.time
          .map((t: string, i: number) => ({ t: new Date(t).getTime(), p: j.hourly.precipitation_probability[i] }))
          .filter((h: any) => h.p != null && h.t >= now - 18e5 && h.t <= now + 216e5)
          .map((h: any) => h.p)
        if (ps.length) rc = Math.max.apply(null, ps)
      }
      const sun: number[] = []
      ;((j.daily && j.daily.sunrise) || []).forEach((s: string) => sun.push(new Date(s).getTime()))
      ;((j.daily && j.daily.sunset) || []).forEach((s: string) => sun.push(new Date(s).getTime()))
      const dusk = duskF(Date.now(), sun)
      // Correct trace-precip drizzle codes to their real (cloud-based) condition before
      // it drives the label, icon and sky — see reconcileWeatherCode.
      const code = reconcileWeatherCode(c.weather_code, c.precipitation, c.cloud_cover)
      const sky = deriveSky({
        code,
        isDay: c.is_day === 1,
        cloudCover: c.cloud_cover,
        windKmh: c.wind_speed_10m,
        precipMm: c.precipitation,
        dusk,
      })
      if (seq != null && seq !== reqSeq.current) return
      patch({
        observedAt: c.time,
        weather: {
          tempC: c.temperature_2m,
          feelsC: c.apparent_temperature,
          humidity: c.relative_humidity_2m,
          windKmh: c.wind_speed_10m,
          precipMm: c.precipitation,
          rainChance: rc,
          code,
          isDay: c.is_day === 1,
          label: WMO[code] || 'Unsettled',
          kind: kindOf(code),
          sky,
        },
      })
    } catch (e) {
      /* keep sample */
    }
  }, [patch])

  const fetchAQI = useCallback(async (lat: number, lon: number, seq?: number) => {
    try {
      const POLLS = 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,ammonia'
      const url =
        'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon +
        '&current=' + POLLS + '&hourly=' + POLLS + '&past_days=1&forecast_days=1&timezone=auto'
      const r = await fetch(url)
      if (!r.ok) throw 0
      const j = await r.json()
      const c = j.current
      const raw: RawPollutants = {
        pm2_5: c.pm2_5 ?? null,
        pm10: c.pm10 ?? null,
        no2: c.nitrogen_dioxide ?? null,
        so2: c.sulphur_dioxide ?? null,
        o3: c.ozone ?? null,
        co: c.carbon_monoxide == null ? null : Math.round(c.carbon_monoxide / 10) / 100,
        nh3: c.ammonia ?? null,
        pb: null,
      }
      // Regulatory aggregates from the hourly series, observed hours only (the series
      // spans yesterday 00:00 → today 23:00; entries after `current.time` are forecast).
      // Same "YYYY-MM-DDTHH:mm" local format on both sides, so string compare is safe.
      const H = j.hourly || {}
      const times: string[] = H.time || []
      let end = -1
      for (let i = 0; i < times.length; i++) if (times[i] <= c.time) end = i
      const mean24 = (arr: (number | null)[] | undefined): number | null => {
        if (!arr || end < 0) return null
        const w = arr.slice(Math.max(0, end - 23), end + 1).filter((v) => v != null) as number[]
        return w.length >= 12 ? w.reduce((s, v) => s + v, 0) / w.length : null
      }
      const max8h = (arr: (number | null)[] | undefined): number | null => {
        if (!arr || end < 0) return null
        let m: number | null = null
        for (let s = end - 23; s <= end - 7; s++) {
          const seg = arr.slice(Math.max(0, s), s + 8).filter((v) => v != null) as number[]
          if (seg.length >= 6) {
            const mv = seg.reduce((a, b) => a + b, 0) / seg.length
            if (m == null || mv > m) m = mv
          }
        }
        return m
      }
      const co8 = max8h(H.carbon_monoxide)
      const rawNaqi: RawPollutants = {
        pm2_5: mean24(H.pm2_5) ?? raw.pm2_5,
        pm10: mean24(H.pm10) ?? raw.pm10,
        no2: mean24(H.nitrogen_dioxide) ?? raw.no2,
        so2: mean24(H.sulphur_dioxide) ?? raw.so2,
        o3: max8h(H.ozone) ?? raw.o3,
        co: co8 == null ? raw.co : Math.round(co8 / 10) / 100,
        nh3: mean24(H.ammonia) ?? raw.nh3,
        pb: null,
      }
      const rawEaqi: RawPollutants = {
        pm2_5: rawNaqi.pm2_5,
        pm10: rawNaqi.pm10,
        no2: raw.no2,
        so2: raw.so2,
        o3: raw.o3,
        co: null,
        nh3: null,
        pb: null,
      }
      if (seq != null && seq !== reqSeq.current) return
      patch({ raw, rawNaqi, rawEaqi })
    } catch (e) {
      /* keep sample */
    }
  }, [patch])

  const reverseGeocode = useCallback(async (lat: number, lon: number, seq?: number) => {
    const stale = () => seq != null && seq !== reqSeq.current
    const junk = /\b(ward|zone|railway|council|division|region|district|metropolitan)\b/i
    // Primary: OSM Nominatim at neighbourhood zoom. BigDataCloud has no locality names
    // for most Indian metro points — its finest entries are ward/zone admin polygons —
    // while OSM carries real suburbs ("Andheri West", "Powai", "Matunga East").
    try {
      // accept-language=en pins English names — without it Nominatim follows the
      // device's Accept-Language and can return native-script names (e.g. Devanagari).
      const r = await fetch(
        'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + lat + '&lon=' + lon + '&zoom=16&addressdetails=1&accept-language=en',
      )
      if (r.ok) {
        const a = (await r.json()).address || {}
        const name = [a.suburb, a.neighbourhood, a.quarter, a.residential, a.village, a.town, a.city_district, a.city].find(
          (n: string | undefined) => n && !junk.test(n),
        )
        if (name) {
          if (stale()) return
          const cityPart = a.city && a.city !== name ? a.city : a.town && a.town !== name ? a.town : null
          const sub = [cityPart, a.state || a.county].filter(Boolean).join(', ')
          patch({ locName: name, locSub: sub || ' ' })
          return
        }
      }
    } catch (e) {
      /* fall through to BigDataCloud */
    }
    try {
      const r = await fetch(
        'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat + '&longitude=' + lon + '&localityLanguage=en',
      )
      if (!r.ok) throw 0
      const j = await r.json()
      // Prefer the neighbourhood ("Bandra West") over the city ("Mumbai"). BigDataCloud puts
      // it in localityInfo as the highest-`order` named place; skip admin plumbing like
      // "Mumbai Zone 3" / "H/W Ward" and anything we already show (city/state/country).
      const info = j.localityInfo || {}
      const cand = ([] as { name?: string; order?: number }[])
        .concat(info.administrative || [], info.informative || [])
        .filter((e) => e && e.name && (e.order || 0) >= 12)
        .filter((e) => !/\b(ward|zone|railway|council|division|region|district|metropolitan)\b/i.test(e.name!))
        .filter((e) => e.name !== j.city && e.name !== j.principalSubdivision && e.name !== j.countryName)
        .sort((a, b) => (b.order || 0) - (a.order || 0))
      const name = cand[0]?.name || j.locality || j.city || j.principalSubdivision || 'Your location'
      if (stale()) return
      const cityPart = j.city && j.city !== name ? j.city : null
      const sub = [cityPart, j.principalSubdivision || j.countryName].filter(Boolean).join(', ')
      patch({ locName: name, locSub: sub || ' ' })
    } catch (e) {
      /* noop */
    }
  }, [patch])

  const loadFor = useCallback(
    (lat: number, lon: number) => {
      // Skeletons clear once both data fetches settle (success or fallback to sample).
      // Only the latest load may flip loading off, so a stale settle can't clear a fresh one.
      const seq = ++reqSeq.current
      Promise.allSettled([fetchWeather(lat, lon, seq), fetchAQI(lat, lon, seq), reverseGeocode(lat, lon, seq)]).then(() => {
        if (seq === reqSeq.current) patch({ loading: false })
      })
    },
    [fetchWeather, fetchAQI, reverseGeocode, patch],
  )

  const geolocate = useCallback(
    (manual?: boolean, onFail?: () => void) => {
      if (manual) hap()
      if (!navigator.geolocation) {
        if (onFail) onFail()
        return
      }
      // watchPosition (not getCurrentPosition) so we can wait past the first coarse
      // network fix for a sharper GPS one. getCurrentPosition would return that early
      // low-accuracy fix — the "wrong neighbourhood on load, right after refresh" bug.
      // maximumAge:0 forbids a stale cached position; enableHighAccuracy:true asks for GPS.
      let done = false
      let best: { la: number; lo: number; acc: number } | null = null
      let watchId: number | null = null
      let deadline: ReturnType<typeof setTimeout>
      const cleanup = () => {
        if (watchId != null) navigator.geolocation.clearWatch(watchId)
        clearTimeout(deadline)
      }
      const commit = (la: number, lo: number) => {
        if (done) return
        done = true
        cleanup()
        patch({ lat: la, lon: lo })
        loadFor(la, lo)
      }
      const giveUp = () => {
        if (done) return
        done = true
        cleanup()
        if (onFail) onFail()
      }
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const la = pos.coords.latitude
          const lo = pos.coords.longitude
          const acc = pos.coords.accuracy
          if (!best || acc < best.acc) best = { la, lo, acc }
          if (acc <= 100) commit(la, lo) // neighbourhood-sharp — commit immediately
        },
        () => {
          /* transient errors: let the deadline decide using the best fix so far */
        },
        { timeout: 15000, maximumAge: 0, enableHighAccuracy: true },
      )
      // Hard deadline: take the sharpest fix gathered so far, else fall back.
      deadline = setTimeout(() => {
        if (best) commit(best.la, best.lo)
        else giveUp()
      }, 10000)
    },
    [hap, patch, loadFor],
  )

  // Manual location pick (search): trust the chosen name — no reverse geocode pass.
  const setLocation = useCallback(
    (lat: number, lon: number, name: string, sub: string) => {
      hap()
      const seq = ++reqSeq.current
      patch({ lat, lon, locName: name, locSub: sub, loading: true })
      Promise.allSettled([fetchWeather(lat, lon, seq), fetchAQI(lat, lon, seq)]).then(() => {
        if (seq === reqSeq.current) patch({ loading: false })
      })
    },
    [hap, patch, fetchWeather, fetchAQI],
  )

  const spinTimer = useRef<ReturnType<typeof setTimeout>>()
  const refresh = useCallback(() => {
    hap()
    patch({ spinning: true })
    loadFor(state.lat, state.lon)
    if (spinTimer.current) clearTimeout(spinTimer.current)
    spinTimer.current = setTimeout(() => patch({ spinning: false }), 850)
  }, [hap, patch, loadFor, state.lat, state.lon])

  // Ask for the user's location on first paint. Granted → their coords + regional
  // locality name (reverse-geocoded, e.g. "Bandra West"); denied, timed out, or no
  // geolocation API → fall back to Mumbai.
  useEffect(() => {
    geolocate(false, () => loadFor(19.076, 72.8777))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, patch, hap, geolocate, refresh, setLocation }
}
