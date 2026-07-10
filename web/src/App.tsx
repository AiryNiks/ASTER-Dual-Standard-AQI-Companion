import { useEffect, useRef, useState } from 'react'
import { AsterMark } from './aster/AsterMark'
import { Dashboard } from './aster/Dashboard'
import { MobileDashboard } from './aster/MobileDashboard'
import { applyTheme } from './aster/theme'
import { useAster } from './aster/useAster'

const MOBILE_QUERY = '(max-width: 640px)'

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { state, patch, hap, geolocate, refresh, setLocation } = useAster()
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Push the theme CSS variables onto the root on every theme change.
  useEffect(() => {
    if (rootRef.current) applyTheme(rootRef.current, state.theme)
  }, [state.theme])

  return (
    <div
      ref={rootRef}
      className="aster-root"
      style={{
        minHeight: '100vh',
        background: 'var(--page-bg)',
        transition: 'background .9s var(--ease-out)',
        padding: isMobile ? 0 : '38px clamp(16px,3.5vw,56px) 96px',
        fontFamily: 'Inter,system-ui,sans-serif',
        color: 'var(--ink)',
      }}
    >
      {isMobile ? (
        <MobileDashboard state={state} patch={patch} hap={hap} geolocate={geolocate} refresh={refresh} setLocation={setLocation} />
      ) : (
        <>
          {/* top bar */}
          <div style={{ maxWidth: 1300, margin: '0 auto 28px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <AsterMark size={42} />
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, letterSpacing: '-0.01em', lineHeight: 1, color: 'var(--ink)' }}>Aster</div>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4, letterSpacing: '0.02em' }}>Live air-quality companion</div>
              </div>
            </div>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: 'var(--glass-2)', border: '1px solid var(--tint-brd)', fontSize: 12, color: 'var(--ink3)' }}>Live · Open-Meteo</span>
          </div>

          <Dashboard state={state} patch={patch} hap={hap} geolocate={geolocate} refresh={refresh} setLocation={setLocation} />
        </>
      )}
    </div>
  )
}
