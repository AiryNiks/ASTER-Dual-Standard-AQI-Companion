import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { AsterMark } from './AsterMark'
import { AtmosphereCanvas } from './AtmosphereCanvas'
import { TiltCard } from './TiltCard'
import { ForecastMatrix } from './ForecastMatrix'
import { LocationSearch } from './LocationSearch'
import { condIcon, verdictIcon } from './icons'
import { effectiveSky, POLL_NAMES, type Standard } from './engine'
import { deriveView } from './derive'
import type { AsterState } from './useAster'

interface Props {
  state: AsterState
  patch: (p: Partial<AsterState>) => void
  hap: () => void
  geolocate: (manual?: boolean) => void
  refresh: () => void
  setLocation: (lat: number, lon: number, name: string, sub: string) => void
}

// ---- shared style helpers (ported from the design) ----
const cardBase: CSSProperties = {
  position: 'relative',
  borderRadius: 26,
  background: 'var(--card)',
  border: '1px solid var(--card-brd)',
  backdropFilter: 'var(--glass-f)',
  WebkitBackdropFilter: 'var(--glass-f)',
  boxShadow: 'var(--card-sh)',
}
const insetTile: CSSProperties = {
  borderRadius: 15,
  background: 'var(--inset)',
  border: '1px solid var(--inset-brd)',
  boxShadow: 'var(--card-sh-s)',
}
const eyebrow: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--eyebrow)',
  fontWeight: 600,
}
const h3: CSSProperties = {
  margin: 0,
  fontFamily: "'Space Grotesk',sans-serif",
  fontSize: 17,
  fontWeight: 600,
  color: 'var(--ink)',
}

function chip(sel: boolean): CSSProperties {
  return sel
    ? {
        padding: '9px 15px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 40,
        border: '1px solid var(--chip-on-brd)', background: 'var(--chip-on-bg)', color: 'var(--chip-on-fg)',
        boxShadow: 'var(--chip-on-sh)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', transition: 'all .3s var(--ease-out)',
      }
    : {
        padding: '9px 15px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 40,
        border: '1px solid var(--chip-off-brd)', background: 'var(--chip-off-bg)', color: 'var(--chip-off-fg)', transition: 'all .3s var(--ease-out)',
      }
}

// Glassy skeleton block shown while live data is fetching.
function Skel({ w, h, br = 10, style }: { w: number | string; h: number; br?: number; style?: CSSProperties }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: br, display: 'inline-block', ...style }} />
}

export function Dashboard({ state, patch, hap, geolocate, refresh, setLocation }: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const st = state
  const dark = st.theme === 'dark'
  const w = st.weather
  const loading = st.loading

  const v = useMemo(() => deriveView(st, dark), [st, dark])

  const std = st.standard
  const sIdx = std === 'naqi' ? 0 : std === 'eaqi' ? 1 : 2
  const sky = useMemo(() => effectiveSky(w, st.rawNaqi, st.skyMode, st.theme), [w, st.rawNaqi, st.skyMode, st.theme])

  const selStd = (s: Standard) => { hap(); patch({ standard: s }) }
  const tabStyle = (on: boolean): CSSProperties => ({
    position: 'relative', zIndex: 1, minHeight: 40, border: 'none', background: 'transparent', cursor: 'pointer',
    fontSize: 13, transition: 'color .3s var(--ease-out)', fontFamily: 'Inter,sans-serif',
    color: on ? (dark ? '#FFFFFF' : 'var(--ink)') : 'var(--ink3)', fontWeight: on ? 700 : 600,
  })
  const ctlBtn: CSSProperties = {
    height: 44, borderRadius: 999, border: '1px solid var(--track-brd)', background: 'var(--track)', color: 'var(--ink2)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: 'var(--card-sh-s)',
    // no inline transition: every ctlBtn carries .hv, whose spring/ease set governs.
  }

  const actChips: [string, string][] = [
    ['general', 'General'], ['commute', 'Commute'], ['moderate_exercise', 'Light exercise'],
    ['intense_workout', 'Intense workout'], ['delivery', 'Delivery'], ['outdoor_work', 'Outdoor work'],
  ]
  const profChips: [string, string][] = [['adult', 'Adult'], ['child', 'Child'], ['senior', 'Senior'], ['respiratory_sensitive', 'Sensitive']]
  const skyChips: [string, string][] = [
    ['live', 'Live'], ['clear', 'Clear'], ['clouds', 'Clouds'], ['rain', 'Rain'], ['storm', 'Storm'], ['snow', 'Snow'], ['fog', 'Fog'],
  ]

  const skelRows: ReactNode = (
    <div>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="skeleton" style={{ height: 34, borderRadius: 10, margin: '9px 0' }} />
      ))}
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 1300, margin: '0 auto', borderRadius: 34, overflow: 'hidden', background: 'var(--shell)', border: '1px solid var(--card-brd)', boxShadow: 'var(--shell-sh)' }}>
      <AtmosphereCanvas sky={sky} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'var(--scrim)' }} />

      <div style={{ position: 'relative', padding: 'clamp(20px,3vw,34px)', paddingBottom: 44 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 34 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <AsterMark size={32} />
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: 'var(--ink)' }}>Aster</span>
          </div>

          <div role="button" tabIndex={0} aria-label="Search location" onClick={() => { hap(); setSearchOpen(true) }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hap(); setSearchOpen(true) } }} title="Search location" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px 8px 15px', borderRadius: 999, background: 'var(--glass-2)', border: '1px solid var(--card-brd)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: 'var(--card-sh-s)', cursor: 'pointer' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent)' }} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{st.locName}</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{st.locSub}</div>
            </div>
            <button className="hv" onClick={(e) => { e.stopPropagation(); geolocate(true) }} title="Use my location" style={{ ...ctlBtn, marginLeft: 4, width: 38, height: 38, color: 'var(--accent)', background: 'var(--glass-2)', border: '1px solid var(--tint-brd)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="7" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', width: 264, padding: 4, borderRadius: 999, background: 'var(--track)', border: '1px solid var(--track-brd)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: 'var(--track-sh)' }}>
              <span style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc((100% - 8px)/3)', borderRadius: 999, background: 'var(--thumb)', boxShadow: 'var(--thumb-sh)', border: '1px solid var(--thumb-brd)', transition: 'transform .45s cubic-bezier(.16,1,.3,1)', willChange: 'transform', transform: `translateX(${sIdx * 100}%)` }} />
              <button onClick={() => selStd('naqi')} style={tabStyle(std === 'naqi')}>NAQI</button>
              <button onClick={() => selStd('eaqi')} style={tabStyle(std === 'eaqi')}>EAQI</button>
              <button onClick={() => selStd('strictest')} style={tabStyle(std === 'strictest')}>Strictest</button>
            </div>
            <button className="hv" onClick={refresh} title="Refresh air and weather" style={{ ...ctlBtn, gap: 8, padding: '0 18px', fontWeight: 600, fontSize: 14 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" style={st.spinning ? { animation: 'aspin .85s cubic-bezier(.4,.05,.25,1)', transformOrigin: '50% 50%' } : undefined}><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8" /><path d="M21 3v5h-5" /></svg>
              Refresh
            </button>
            <button className="hv" onClick={() => { hap(); patch({ theme: dark ? 'light' : 'dark' }) }} title="Toggle dark mode" style={{ ...ctlBtn, width: 44 }}>
              {condIcon('clear', dark, 18, dark ? '#E7ECF3' : '#37475C')}
            </button>
          </div>
        </div>

        {/* severe banner */}
        {v.severeOn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 20, background: 'var(--card)', border: '1px solid var(--warn-brd)', boxShadow: 'var(--card-sh-s)', backdropFilter: 'var(--glass-f)', WebkitBackdropFilter: 'var(--glass-f)', margin: '-14px 0 24px', flexWrap: 'wrap' }}>
            <span style={{ width: 38, height: 38, borderRadius: 13, background: 'var(--warn-bg)', border: '1px solid var(--warn-brd)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{condIcon('storm', true, 19, dark ? '#CEBBA1' : '#A96A28')}</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{v.severeTitle}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink2)', marginTop: 2 }}>{v.severeMsg}</div>
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {v.severeList.map((sv) => (
                <span key={sv} style={{ padding: '6px 11px', borderRadius: 999, background: 'var(--warn-bg)', border: '1px solid var(--warn-brd)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{sv}</span>
              ))}
            </div>
          </div>
        )}

        {/* hero + weather card */}
        <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300, paddingTop: 6 }}>
            <div style={{ ...eyebrow, letterSpacing: '0.2em', marginBottom: 16 }}>{v.eyebrow}</div>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22 }}>
                <Skel w={168} h={116} br={20} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 4 }}>
                  <Skel w={112} h={36} br={999} />
                  <Skel w={126} h={32} br={999} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(90px,13vw,150px)', lineHeight: 0.8, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>{v.hv}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 17px', borderRadius: 999, background: v.hcol, color: v.chipTxt, fontWeight: 600, fontSize: 14, ['--cg' as any]: v.hcol, boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.25)' : '0 6px 22px ' + v.hcol + '66', animation: dark ? 'none' : 'achip 3.6s ease-in-out infinite' }}>{v.hb}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 15px', borderRadius: 999, background: v.vd.color, color: v.vd.fg, fontWeight: 600, fontSize: 13, boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.3)' : '0 6px 18px ' + v.vd.color + '55' }}>{verdictIcon(v.vd.key, 15, v.vd.fg)} {v.vd.label}</span>
                </div>
              </div>
            )}
            <div style={{ marginTop: 20, fontSize: 14, color: 'var(--ink2)' }}>{v.hs} · Dominant {POLL_NAMES[v.hdom] || v.hdom}</div>

            <TiltCard style={{ marginTop: 26, maxWidth: 460, ...cardBase, borderRadius: 22 }}>
              <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', padding: '16px 18px' }}>
                <AsterMark size={22} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, color: 'var(--ink)' }}>Aster's take</div>
                  <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.5 }}>{v.asterTake}</div>
                </div>
              </div>
            </TiltCard>
          </div>

          <TiltCard style={{ width: 322, flexShrink: 0, ...cardBase, borderRadius: 26 }}>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ ...eyebrow, fontSize: 11.5, letterSpacing: '0.16em' }}>Right now</div>
                {condIcon(w.kind, w.isDay, 22, dark ? '#93A4C9' : '#3F63C6')}
              </div>
              {loading ? (
                <div style={{ marginTop: 16 }}><Skel w={130} h={58} br={14} /></div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 16 }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 66, lineHeight: 0.85, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>{Math.round(w.tempC)}°</div>
                  <div style={{ marginBottom: 9 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{w.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Feels {Math.round(w.feelsC)}°</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 20 }}>
                {[
                  ['Rain 6h', w.rainChance == null ? '—' : w.rainChance + '%'],
                  ['Humidity', Math.round(w.humidity) + '%'],
                  ['Wind', Math.round(w.windKmh) + ' km/h'],
                  ['Sky', w.isDay ? 'Daytime' : 'Night'],
                ].map(([k, val]) => (
                  <div key={k} style={{ padding: '11px 12px', borderRadius: 14, background: 'var(--inset)', border: '1px solid var(--inset-brd)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                    <div style={{ marginTop: 3, fontFamily: "'Space Grotesk',sans-serif", fontSize: 19, fontWeight: 600, color: 'var(--ink)' }}>{loading ? <Skel w={46} h={18} br={6} /> : val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--divider)', fontSize: 12, color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: '#3FB183', boxShadow: '0 0 10px #3FB183' }} /> The sky above mirrors this live.
              </div>
            </div>
          </TiltCard>
        </div>

        {/* dual-standard reading + raw concentrations */}
        <div style={{ display: 'flex', gap: 22, alignItems: 'stretch', marginBottom: 22, flexWrap: 'wrap' }}>
          <TiltCard style={{ width: 434, flex: '1 1 380px', ...cardBase }}>
            <div style={{ padding: '22px 24px' }}>
              <h3 style={{ ...h3, marginBottom: 6 }}>Dual-standard reading</h3>
              <p style={{ margin: '0 0 18px', fontSize: 12.5, color: 'var(--ink3)' }}>India NAQI vs Europe EAQI — same air, two verdicts.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: 184, height: 184, flexShrink: 0 }}>
                  <svg width="184" height="184" viewBox="0 0 220 220">
                    <circle cx="110" cy="110" r="84" fill="none" style={{ stroke: 'var(--tint-brd)' }} strokeWidth="15" strokeLinecap="round" strokeDasharray="395.84 527.79" transform="rotate(135 110 110)" />
                    <circle cx="110" cy="110" r="84" fill="none" stroke={v.naqiColor} strokeWidth="15" strokeLinecap="round" strokeDasharray={(v.naqiFrac * 395.84).toFixed(1) + ' 527.79'} transform="rotate(135 110 110)" style={{ transition: 'stroke-dasharray .9s cubic-bezier(.16,1,.3,1), stroke .9s var(--ease-out)', filter: 'drop-shadow(0 3px 8px rgba(40,70,130,0.25))' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em' }}>NAQI</div>
                    {loading ? <Skel w={62} h={38} br={10} /> : <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 44, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>{v.idx.naqi.aqi}</div>}
                    <div style={{ color: v.naqiColor, fontSize: 11, fontWeight: 600, marginTop: 2 }}>{loading ? '' : v.idx.naqi.band}</div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em', marginBottom: 6 }}>EAQI LEVEL</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                    {loading ? <Skel w={40} h={32} br={8} /> : <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 38, lineHeight: 1, color: v.eaqiColor }}>{v.idx.eaqi.level}</span>}
                    <span style={{ fontSize: 13, color: 'var(--ink2)' }}>/ 6 · {loading ? '…' : v.idx.eaqi.band}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>{v.eaqiSegs.map((s, i) => <div key={i} style={s} />)}</div>
                  <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5 }}>{v.divergenceNote}</div>
                </div>
              </div>
            </div>
          </TiltCard>

          <TiltCard style={{ flex: '1 1 380px', ...cardBase }}>
            <div style={{ padding: '22px 24px' }}>
              <h3 style={{ ...h3, marginBottom: 16 }}>Raw concentrations</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11 }}>
                {v.pollArr.map((p) => (
                  <div key={p.label} style={{ padding: '12px 13px', ...insetTile }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink3)' }}>{p.label}</div>
                    <div style={{ marginTop: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: 19, fontWeight: 500, color: 'var(--ink)' }}>{loading ? <Skel w={44} h={18} br={6} /> : p.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{p.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          </TiltCard>
        </div>

        {/* 7-day forecasting matrix */}
        <TiltCard style={{ ...cardBase, marginBottom: 22 }}>
          <div style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...eyebrow }}>Predictive engine</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', border: '1px solid var(--accent-line)', background: 'var(--accent-soft)', borderRadius: 999, padding: '2px 9px' }}>7-day NAQI</span>
              </div>
              <h3 style={{ ...h3, margin: '7px 0 0' }}>7-day forecast</h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--ink3)' }}>PM2.5 projected through wind dispersion, humidity trapping &amp; overnight inversion.</p>
            </div>
            <div style={{ maxWidth: 330, textAlign: 'right', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink3)' }}>
              Worst air <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{v.fc.peak.label.toLowerCase() === 'today' ? 'today' : v.fc.peak.label}</span> — NAQI <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{v.fc.peak.naqi}</span> {v.fc.peak.band}, {v.fc.peak.domName}-driven, as wind eases to {v.fc.peak.wind} km/h and humidity climbs to {v.fc.peak.rh}%.
            </div>
          </div>
          {loading ? skelRows : <ForecastMatrix rows={v.fc.raws} dark={dark} />}
          </div>
        </TiltCard>

        {/* should I head out — full width */}
        <TiltCard style={{ ...cardBase, marginBottom: 22 }}>
          <div style={{ padding: '22px 24px' }}>
          <h3 style={{ ...h3, marginBottom: 4 }}>Should I head out?</h3>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--ink3)' }}>Aster tunes the verdict to your activity and profile.</p>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ ...eyebrow, letterSpacing: '0.1em', marginBottom: 9 }}>Activity</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {actChips.map(([id, label]) => <button key={id} className="hv" onClick={() => { hap(); patch({ activity: id }) }} style={chip(st.activity === id)}>{label}</button>)}
              </div>
              <div style={{ ...eyebrow, letterSpacing: '0.1em', marginBottom: 9 }}>Profile</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {profChips.map(([id, label]) => <button key={id} className="hv" onClick={() => { hap(); patch({ profile: id }) }} style={chip(st.profile === id)}>{label}</button>)}
              </div>
            </div>
            <div style={{ flex: '1.2 1 380px', padding: '16px 18px', borderRadius: 18, background: 'var(--inset)', border: '1px solid var(--inset-brd)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999, background: v.vd.color, color: v.vd.fg, fontWeight: 600, fontSize: 14, flexShrink: 0, boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.3)' : '0 8px 20px ' + v.vd.color + '55' }}>{verdictIcon(v.vd.key, 16, v.vd.fg)} {v.vd.label}</span>
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{v.vd.headline}</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink2)', lineHeight: 1.55 }}>{v.vd.reasoning}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {v.vd.prec.map((pr) => (
                  <span key={pr} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>{pr}
                  </span>
                ))}
              </div>
            </div>
          </div>
          </div>
        </TiltCard>

        {/* sky preview */}
        <div style={{ padding: '18px 22px', borderRadius: 22, background: 'var(--inset)', border: '1px solid var(--inset-brd)', boxShadow: 'var(--card-sh-s)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--ink2)' }}><span style={{ fontWeight: 600, color: 'var(--ink)' }}>Preview the living sky</span> — feel any condition, day or night.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {skyChips.map(([id, label]) => <button key={id} className="hv" onClick={() => { hap(); patch({ skyMode: id as any }) }} style={chip(st.skyMode === id)}>{label}</button>)}
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><AsterMark size={18} /> Aster · dual-standard air quality with a live atmosphere.</div>
          <div>NAQI (CPCB) · EAQI (EEA) · Weather &amp; air data by Open-Meteo</div>
        </div>
      </div>

      {searchOpen && (
        <LocationSearch
          onClose={() => setSearchOpen(false)}
          onPick={(la, lo, n, s) => { setLocation(la, lo, n, s); setSearchOpen(false) }}
        />
      )}
    </div>
  )
}
