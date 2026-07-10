// Mobile app layout — ported from the design's "1b · Mobile" variant (Aster.dc.html),
// adapted for a real phone: device status bar is the OS's own, safe-area insets respected,
// full-bleed living sky behind glass cards, bottom app nav.
import { useMemo, useState, type CSSProperties } from 'react'
import { AsterMark } from './AsterMark'
import { AtmosphereCanvas } from './AtmosphereCanvas'
import { ForecastMatrix } from './ForecastMatrix'
import { condIcon, verdictIcon } from './icons'
import { effectiveSky, type Standard } from './engine'
import { deriveView } from './derive'
import type { AsterState } from './useAster'

interface Props {
  state: AsterState
  patch: (p: Partial<AsterState>) => void
  hap: () => void
  geolocate: (manual?: boolean) => void
  refresh: () => void
}

const card: CSSProperties = {
  position: 'relative',
  borderRadius: 22,
  background: 'var(--card)',
  border: '1px solid var(--card-brd)',
  backdropFilter: 'var(--glass-f)',
  WebkitBackdropFilter: 'var(--glass-f)',
  boxShadow: 'var(--card-sh)',
}

function chipSm(sel: boolean): CSSProperties {
  return sel
    ? {
        padding: '8px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', minHeight: 38, whiteSpace: 'nowrap',
        border: '1px solid var(--chip-on-brd)', background: 'var(--chip-on-bg)', color: 'var(--chip-on-fg)',
        boxShadow: 'var(--chip-on-sh)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', transition: 'all .3s var(--ease-out)',
      }
    : {
        padding: '8px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', minHeight: 38, whiteSpace: 'nowrap',
        border: '1px solid var(--chip-off-brd)', background: 'var(--chip-off-bg)', color: 'var(--chip-off-fg)', transition: 'all .3s var(--ease-out)',
      }
}

export function MobileDashboard({ state, patch, hap, geolocate, refresh }: Props) {
  const st = state
  const dark = st.theme === 'dark'
  const [tab, setTab] = useState<'now' | 'trends'>('now')
  const w = st.weather
  const loading = st.loading
  const v = useMemo(() => deriveView(st, dark), [st, dark])
  const sky = useMemo(() => effectiveSky(w, st.rawNaqi, st.skyMode, st.theme), [w, st.rawNaqi, st.skyMode, st.theme])

  const std = st.standard
  const sIdx = std === 'naqi' ? 0 : std === 'eaqi' ? 1 : 2
  const selStd = (s: Standard) => { hap(); patch({ standard: s }) }
  const tabStyle = (on: boolean): CSSProperties => ({
    position: 'relative', zIndex: 1, minHeight: 40, border: 'none', background: 'transparent', cursor: 'pointer',
    fontSize: 13, transition: 'color .3s var(--ease-out)', fontFamily: 'Inter,sans-serif',
    color: on ? (dark ? '#FFFFFF' : 'var(--ink)') : 'var(--ink3)', fontWeight: on ? 700 : 600,
  })
  const ctlBtn: CSSProperties = {
    width: 40, height: 40, borderRadius: 999, border: '1px solid var(--track-brd)', background: 'var(--track)', color: 'var(--ink2)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: 'var(--card-sh-s)',
    // no inline transition: every ctlBtn carries .hv, whose spring/ease set governs.
  }

  const actChips: [string, string][] = [
    ['general', 'General'], ['commute', 'Commute'], ['moderate_exercise', 'Light exercise'],
    ['intense_workout', 'Intense workout'], ['delivery', 'Delivery'], ['outdoor_work', 'Outdoor work'],
  ]
  const skyChips: [string, string][] = [
    ['live', 'Live'], ['clear', 'Clear'], ['clouds', 'Clouds'], ['rain', 'Rain'], ['storm', 'Storm'], ['snow', 'Snow'], ['fog', 'Fog'],
  ]

  const navItem = (id: 'now' | 'trends', label: string, icon: React.ReactNode) => (
    <button
      key={id}
      onClick={() => { hap(); setTab(id) }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '2px 26px',
        background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit',
        color: tab === id ? 'var(--accent)' : 'var(--navidle)',
      }}
    >
      {icon}
      <span style={{ fontSize: 10, fontWeight: tab === id ? 600 : 400 }}>{label}</span>
    </button>
  )

  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden', background: 'var(--shell)' }}>
      <AtmosphereCanvas sky={sky} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'var(--scrim-m)' }} />

      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 120px', zIndex: 10 }}>
        {/* location + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent)', flexShrink: 0 }} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            <div style={{ lineHeight: 1.1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.locName}</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.locSub}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="hv" onClick={() => { hap(); patch({ theme: dark ? 'light' : 'dark' }) }} title="Toggle dark mode" style={ctlBtn}>
              {condIcon('clear', dark, 17, dark ? '#E7ECF3' : '#37475C')}
            </button>
            <button className="hv" onClick={refresh} title="Refresh" style={ctlBtn}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={st.spinning ? { animation: 'aspin .85s cubic-bezier(.4,.05,.25,1)', transformOrigin: '50% 50%' } : undefined}><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8" /><path d="M21 3v5h-5" /></svg>
            </button>
            <button className="hv" onClick={() => geolocate(true)} title="Use my location" style={ctlBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="7" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>
            </button>
          </div>
        </div>

        {tab === 'now' && (<>
        {/* standard toggle */}
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', width: '100%', padding: 4, borderRadius: 999, background: 'var(--track)', border: '1px solid var(--track-brd)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: 'var(--track-sh)', marginBottom: 4 }}>
          <span style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc((100% - 8px)/3)', borderRadius: 999, background: 'var(--thumb)', boxShadow: 'var(--thumb-sh)', border: '1px solid var(--thumb-brd)', transition: 'transform .45s cubic-bezier(.16,1,.3,1)', willChange: 'transform', transform: `translateX(${sIdx * 100}%)` }} />
          <button onClick={() => selStd('naqi')} style={tabStyle(std === 'naqi')}>NAQI</button>
          <button onClick={() => selStd('eaqi')} style={tabStyle(std === 'eaqi')}>EAQI</button>
          <button onClick={() => selStd('strictest')} style={tabStyle(std === 'strictest')}>Strictest</button>
        </div>

        {/* severe banner */}
        {v.severeOn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 18, background: 'var(--card)', border: '1px solid var(--warn-brd)', backdropFilter: 'var(--glass-f)', WebkitBackdropFilter: 'var(--glass-f)', margin: '12px 0 2px' }}>
            <span style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--warn-bg)', border: '1px solid var(--warn-brd)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{condIcon('storm', true, 17, dark ? '#CEBBA1' : '#A96A28')}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>{v.severeTitle}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink2)', marginTop: 1 }}>{v.severeMsg}</div>
            </div>
          </div>
        )}

        {/* hero */}
        <div style={{ textAlign: 'center', margin: '18px 0 22px' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--eyebrow)', fontWeight: 600, marginBottom: 6 }}>Air quality now · {v.updatedTime}</div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}><span className="skeleton" style={{ width: 150, height: 96, borderRadius: 20, display: 'inline-block' }} /></div>
          ) : (
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(88px,28vw,118px)', lineHeight: 0.82, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>{v.hv}</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 17px', borderRadius: 999, background: v.hcol, color: v.chipTxt, fontWeight: 600, fontSize: 14, ['--cg' as any]: v.hcol, boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.25)' : '0 6px 22px ' + v.hcol + '66', animation: dark ? 'none' : 'achip 3.6s ease-in-out infinite' }}>{v.hb}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 15px', borderRadius: 999, background: v.vd.color, color: v.vd.fg, fontWeight: 600, fontSize: 13, boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.3)' : '0 6px 18px ' + v.vd.color + '55' }}>{verdictIcon(v.vd.key, 14, v.vd.fg)} {v.vd.label}</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--ink2)' }}>{v.hs}</div>
        </div>

        {/* weather strip */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', marginBottom: 14 }}>
          {condIcon(w.kind, w.isDay, 34, dark ? '#93A4C9' : '#3F63C6')}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 30, lineHeight: 1, color: 'var(--ink)' }}>{loading ? '…' : Math.round(w.tempC) + '°'}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{w.label} · Feels {Math.round(w.feelsC)}°</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--ink3)', lineHeight: 1.5 }}>
            <div>Rain {w.rainChance == null ? '—' : w.rainChance + '%'}</div>
            <div>Wind {Math.round(w.windKmh)} km/h</div>
            <div>Hum {Math.round(w.humidity)}%</div>
          </div>
        </div>

        {/* dual standard */}
        <div style={{ ...card, padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
              <svg width="120" height="120" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r="84" fill="none" style={{ stroke: 'var(--tint-brd)' }} strokeWidth="16" strokeLinecap="round" strokeDasharray="395.84 527.79" transform="rotate(135 110 110)" />
                <circle cx="110" cy="110" r="84" fill="none" stroke={v.naqiColor} strokeWidth="16" strokeLinecap="round" strokeDasharray={(v.naqiFrac * 395.84).toFixed(1) + ' 527.79'} transform="rotate(135 110 110)" style={{ transition: 'stroke-dasharray .9s cubic-bezier(.16,1,.3,1), stroke .9s var(--ease-out)' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--ink3)' }}>NAQI</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 30, lineHeight: 1, color: 'var(--ink)' }}>{v.idx.naqi.aqi}</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.08em', marginBottom: 4 }}>EAQI LEVEL</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 30, lineHeight: 1, color: v.eaqiColor }}>{v.idx.eaqi.level}</span>
                <span style={{ fontSize: 12, color: 'var(--ink2)' }}>/ 6 · {v.idx.eaqi.band}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>{v.eaqiSegs.map((s, i) => <div key={i} style={s} />)}</div>
            </div>
          </div>
        </div>

        {/* going out */}
        <div style={{ ...card, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--eyebrow)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Going out for…</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            {actChips.map(([id, label]) => <button key={id} className="hv" onClick={() => { hap(); patch({ activity: id }) }} style={chipSm(st.activity === id)}>{label}</button>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999, background: v.vd.color, color: v.vd.fg, fontWeight: 600, fontSize: 14, flexShrink: 0, boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.3)' : '0 8px 20px ' + v.vd.color + '55' }}>{verdictIcon(v.vd.key, 16, v.vd.fg)} {v.vd.label}</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600, flex: 1 }}>{v.vd.headline}</span>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--ink2)', lineHeight: 1.5 }}>{v.vd.reasoning}</p>
        </div>

        {/* sky preview */}
        <div style={{ ...card, padding: '16px 18px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Preview the sky</div>
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
            {skyChips.map(([id, label]) => <button key={id} onClick={() => { hap(); patch({ skyMode: id as any }) }} style={chipSm(st.skyMode === id)}>{label}</button>)}
          </div>
        </div>

        {/* aster take */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '14px 16px', borderRadius: 18, background: 'var(--inset)', border: '1px solid var(--inset-brd)' }}>
          <div style={{ flexShrink: 0, marginTop: 1 }}><AsterMark size={20} /></div>
          <div style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.5 }}>{v.asterTake}</div>
        </div>
        </>)}

        {/* trends — 7-day forecast horizon */}
        {tab === 'trends' && (
          <div style={{ ...card, padding: 18, margin: '16px 0 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--eyebrow)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Forecast horizon · 7 days</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 12 }}>
              Peak {v.fc.peak.label.toLowerCase()} — NAQI {v.fc.peak.naqi} · {v.fc.peak.band}
            </div>
            {loading ? (
              <div>{[0, 1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 34, borderRadius: 10, margin: '9px 0' }} />)}</div>
            ) : (
              <ForecastMatrix rows={v.fc.raws} peakD={v.fc.peak.d} dark={dark} />
            )}
          </div>
        )}
      </div>

      {/* bottom nav */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--navbar)', backdropFilter: 'var(--glass-f)', WebkitBackdropFilter: 'var(--glass-f)', borderTop: '1px solid var(--navbar-brd)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '12px 14px calc(env(safe-area-inset-bottom, 0px) + 12px)', zIndex: 20 }}>
        {navItem('now', 'Now', <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>)}
        {navItem('trends', 'Trends', <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>)}
      </div>
    </div>
  )
}
