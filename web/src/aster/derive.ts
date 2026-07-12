// Pure derivation of everything the dashboards render from raw state.
// Shared by the desktop Dashboard and the mobile app layout.
import type { CSSProperties } from 'react'
import {
  computeIndexes,
  effectiveSky,
  fcData,
  POLL,
  SEV_COLORS,
  SEV_NAMES,
  NAQI_ORD,
  strictestBand,
  verdict,
} from './engine'
import type { AsterState } from './useAster'

export function deriveView(st: AsterState, dark: boolean) {
  const w = st.weather
  const idx = computeIndexes(st.rawNaqi, st.rawEaqi)
  const band = strictestBand(idx)
  const vd = verdict(band, st.activity, st.profile)
  const naqiOrd = NAQI_ORD[idx.naqi.band] || 1
  const std = st.standard

  let hv: number, hb: string, hs: string, hdom: string, hband: number
  if (std === 'naqi') {
    hv = idx.naqi.aqi; hb = idx.naqi.band; hs = 'CPCB National AQI · 0–500'; hdom = idx.naqi.dominant; hband = naqiOrd
  } else if (std === 'eaqi') {
    hv = idx.eaqi.level; hb = idx.eaqi.band; hs = 'European AQI · Level 1–6'; hdom = idx.eaqi.dominant; hband = idx.eaqi.level
  } else if (idx.eaqi.level >= naqiOrd) {
    hv = idx.eaqi.level; hb = idx.eaqi.band; hs = 'European AQI · Level 1–6'; hdom = idx.eaqi.dominant; hband = idx.eaqi.level
  } else {
    hv = idx.naqi.aqi; hb = idx.naqi.band; hs = 'CPCB National AQI · 0–500'; hdom = idx.naqi.dominant; hband = naqiOrd
  }
  const hcol = SEV_COLORS[hband]
  const chipTxt = hband <= 3 ? '#101211' : '#F2F1ED'
  const naqiColor = SEV_COLORS[naqiOrd]
  const eaqiColor = SEV_COLORS[idx.eaqi.level]
  const naqiFrac = Math.min(idx.naqi.aqi / 500, 1)
  const round1 = (n: number) => Math.round(n * 10) / 10
  const pollArr = POLL.map(([k, label, unit]) => {
    const val = (st.raw as any)[k]
    return { label, unit, val: val == null ? '—' : val >= 100 ? String(Math.round(val)) : String(round1(val)) }
  })
  const eaqiSegs = [1, 2, 3, 4, 5, 6].map((n) => ({
    height: 9, borderRadius: 5, flex: 1,
    background: n <= idx.eaqi.level ? SEV_COLORS[n] : 'var(--tint-brd)',
    boxShadow: !dark && n === idx.eaqi.level ? '0 0 12px ' + SEV_COLORS[n] : 'none',
    transition: 'all .5s var(--ease-out)',
  })) as CSSProperties[]
  let divergenceNote: string
  if (naqiOrd < idx.eaqi.level) divergenceNote = 'India rates this ' + idx.naqi.band + ', Europe rates it ' + idx.eaqi.band + '. Aster warns you to the stricter one.'
  else if (naqiOrd > idx.eaqi.level) divergenceNote = 'India rates this ' + idx.naqi.band + ' — stricter than the European band ' + idx.eaqi.band + '.'
  else divergenceNote = 'Both standards agree: ' + idx.eaqi.band + '.'

  const fc = fcData(w, st.rawNaqi)

  const outfit = { avoid: 'Mask up and keep outdoor time short.', caution: 'Keep a mask handy if you head out.', safe: 'Lovely conditions — enjoy being outside.' }[vd.key]
  const asterTake = SEV_NAMES[band] + ' air with ' + (w.label || '').toLowerCase() + '. ' + outfit

  const eff = effectiveSky(w, st.rawNaqi, st.skyMode, st.theme)
  // The banner is a real weather ADVISORY — it only fires off live conditions.
  // Previewing the Storm/Rain sky chips restyles the atmosphere, never the advice.
  const severeOn = st.skyMode === 'live' && ((eff.storm || 0) > 0.5 || (eff.rain || 0) >= 0.7)
  const severeTitle = (eff.storm || 0) > 0.5 ? 'Severe weather protocol · Thunderstorm' : 'Severe weather protocol · Heavy rain'
  const severeMsg = vd.key === 'avoid' ? 'Commute risk elevated — air and weather both advise staying in.' : 'Commute and outdoor risk elevated. Plan around waterlogging and low visibility.'
  const severeList = ['Allow +30 min commute', 'Avoid underpasses', 'Two-wheelers not advised']

  const updatedTime = new Date(st.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  // Hero eyebrow: honest about freshness. While loading, keep the normal line (the
  // skeletons already say "in progress"); once settled without live data, say so.
  const eyebrow = !st.live && !st.loading ? 'Fallback data · live feed unreachable' : 'Air quality now · Updated ' + updatedTime

  return {
    idx, band, vd, hv, hb, hs, hdom, hcol, chipTxt, naqiColor, eaqiColor, naqiFrac,
    pollArr, eaqiSegs, divergenceNote, fc, asterTake, severeOn, severeTitle, severeMsg,
    severeList, updatedTime, eyebrow,
  }
}

export type DerivedView = ReturnType<typeof deriveView>
