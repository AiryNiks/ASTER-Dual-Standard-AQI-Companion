// Manual location search — a spotlight-style glass panel over a dim scrim.
// Places come from the Open-Meteo geocoding API (free, key-less, English-pinned);
// picking one hands lat/lon + display names to the parent and closes the panel.
import { useEffect, useRef, useState } from 'react'
import { fetchT } from './useAster'

interface Hit {
  latitude: number
  longitude: number
  name: string
  admin1?: string
  admin2?: string
  country?: string
}

export function LocationSearch({
  onPick,
  onClose,
}: {
  onPick: (lat: number, lon: number, name: string, sub: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const s = q.trim()
    if (s.length < 2) {
      setHits([])
      setBusy(false)
      return
    }
    const id = ++seq.current
    setBusy(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetchT(
          'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(s) + '&count=6&language=en&format=json',
          8000,
        )
        if (!r.ok) throw 0
        const j = await r.json()
        if (seq.current === id) setHits(j.results || [])
      } catch (e) {
        if (seq.current === id) setHits([])
      }
      if (seq.current === id) setBusy(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const subOf = (h: Hit) =>
    [h.admin2, h.admin1, h.country]
      .filter((x, i, arr) => x && arr.indexOf(x) === i && x !== h.name)
      .slice(0, 2)
      .join(', ')
  const pick = (h: Hit) => onPick(h.latitude, h.longitude, h.name, subOf(h) || ' ')

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8,12,20,0.35)',
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 'max(9vh, 56px)', left: '50%', transform: 'translateX(-50%)',
          width: 'min(480px, calc(100vw - 28px))', borderRadius: 22, overflow: 'hidden',
          background: 'var(--card)', border: '1px solid var(--card-brd)', boxShadow: 'var(--card-sh)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--divider)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" style={{ color: 'var(--ink3)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.8-3.8" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'Enter' && hits[0]) pick(hits[0])
            }}
            placeholder="Search a city or locality…"
            style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
              font: 'inherit', fontSize: 15, color: 'var(--ink)', padding: 0,
            }}
          />
          {busy && <span style={{ width: 14, height: 14, flexShrink: 0, border: '2px solid var(--tint-brd)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'aspin .8s linear infinite' }} />}
        </div>
        {hits.length > 0 && (
          <div style={{ maxHeight: '46vh', overflowY: 'auto', padding: 6 }}>
            {hits.map((h, i) => (
              <button
                key={h.latitude + ',' + h.longitude + i}
                className="lsrow"
                onClick={() => pick(h)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: 14,
                  background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{h.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 1 }}>{subOf(h) || '—'}</div>
              </button>
            ))}
          </div>
        )}
        {q.trim().length >= 2 && !busy && hits.length === 0 && (
          <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--ink3)' }}>No places found.</div>
        )}
      </div>
    </div>
  )
}
