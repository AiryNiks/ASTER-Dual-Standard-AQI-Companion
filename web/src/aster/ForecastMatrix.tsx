// 7-day forecasting matrix — promoted from the Engine Bench into the main dashboard.
// Theme-aware (light + dark), responsive (driver columns collapse under 900px via
// the .fc-opt / .fcgrid rules in index.css), with hover feedback per row.
import type { CSSProperties } from 'react'
import { SEV_COLORS, type FcRow } from './engine'

const mono = "'JetBrains Mono',monospace"

function dayName(i: number): string {
  if (i === 0) return 'Today'
  if (i === 1) return 'Tomorrow'
  return new Date(Date.now() + i * 864e5).toLocaleDateString([], { weekday: 'long' })
}

export function ForecastMatrix({ rows, dark }: { rows: FcRow[]; dark: boolean }) {
  // Factor tints tuned per theme so every value passes contrast on the glass card.
  const cGreen = dark ? '#5BCB96' : '#1F9D66'
  const cRed = dark ? '#E28791' : '#B23A46'
  const cOchre = dark ? '#D9A05B' : '#8a5a12'
  const cBlue = dark ? '#9AB2EE' : '#2f4da8'
  const tint = (x: number) => (x > 1.02 ? cRed : x < 0.98 ? cGreen : 'var(--ink3)')
  const domCol = (name: string) => (name === 'O₃' ? cOchre : name === 'PM2.5' || name === 'PM10' ? 'var(--ink2)' : cBlue)

  const head = (label: string, color: string, align: CSSProperties['textAlign'], opt = false) => (
    <div className={opt ? 'fc-opt' : undefined} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color, fontWeight: 600, textAlign: align }}>
      {label}
    </div>
  )
  const pill = (ord: number): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999,
    background: SEV_COLORS[ord], color: ord <= 3 ? '#241a0b' : '#fff', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap',
  })
  const num: CSSProperties = { fontFamily: mono, fontSize: 12.5, color: 'var(--ink2)', textAlign: 'right' }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="fcwrap">
        <div className="fcgrid" style={{ padding: '0 6px 10px', borderBottom: '1px solid var(--divider)' }}>
          {head('Day', 'var(--ink3)', 'left')}
          {head('Wind', 'var(--ink3)', 'right', true)}
          {head('RH', 'var(--ink3)', 'right', true)}
          {head('Tmin', 'var(--ink3)', 'right', true)}
          {head('ƒwind', cGreen, 'right', true)}
          {head('ƒhum', cRed, 'right', true)}
          {head('ƒinv', cOchre, 'right', true)}
          {head('PM2.5', 'var(--ink3)', 'right')}
          {head('NAQI', 'var(--ink3)', 'right')}
          {head('Dom', 'var(--ink3)', 'center')}
          {head('Band', 'var(--ink3)', 'center')}
          {head('Conf', 'var(--ink3)', 'right', true)}
        </div>
        {rows.map((r) => (
          <div
            key={r.d}
            className="fcgrid fcrow"
            style={{
              padding: '11px 6px',
              borderBottom: '1px solid var(--divider)',
              background: 'transparent',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{dayName(r.d)}</div>
            <div className="fc-opt" style={num}>{r.wind}</div>
            <div className="fc-opt" style={num}>{r.rh}</div>
            <div className="fc-opt" style={num}>{r.tmin}°</div>
            <div className="fc-opt" style={{ ...num, fontWeight: 500, color: tint(r.fW) }}>{r.fW.toFixed(2)}</div>
            <div className="fc-opt" style={{ ...num, fontWeight: 500, color: tint(r.fH) }}>{r.fH.toFixed(2)}</div>
            <div className="fc-opt" style={{ ...num, fontWeight: 500, color: tint(r.fI) }}>{r.fI.toFixed(2)}</div>
            <div style={{ ...num, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{r.predPm == null ? '—' : Math.round(r.predPm)}</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--ink)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.naqi}</div>
            <div style={{ textAlign: 'center', fontFamily: mono, fontSize: 11.5, fontWeight: 600, color: domCol(r.domName) }}>{r.domName}</div>
            <div style={{ textAlign: 'center' }}><span style={pill(r.ord)}>{r.band}</span></div>
            <div className="fc-opt" style={{ ...num, fontSize: 12, color: 'var(--ink3)' }}>{r.conf}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
