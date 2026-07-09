// Aster brand mark — ported from AsterMark.dc.html (a radiant aster bloom).
export function AsterMark({ size = 42 }: { size?: number }) {
  const outer = Array.from({ length: 12 }, (_, i) => i * 30)
  const mid = Array.from({ length: 12 }, (_, i) => 15 + i * 30)
  const inner = Array.from({ length: 6 }, (_, i) => i * 60)
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
      <g transform="translate(24 24)">
        <g fill="#6D28D9" opacity="0.95">
          {outer.map((r) => (
            <ellipse key={'o' + r} cx="0" cy="-13.5" rx="2.8" ry="12.5" transform={`rotate(${r})`} />
          ))}
        </g>
        <g fill="#A78BFA">
          {mid.map((r) => (
            <ellipse key={'m' + r} cx="0" cy="-11" rx="2.4" ry="10" transform={`rotate(${r})`} />
          ))}
        </g>
        <g fill="#C4B5FD" opacity="0.9">
          {inner.map((r) => (
            <ellipse key={'i' + r} cx="0" cy="-6.5" rx="1.7" ry="5" transform={`rotate(${r})`} />
          ))}
        </g>
        <circle cx="0" cy="0" r="6.6" fill="#B8791A" />
        <circle cx="0" cy="0" r="5" fill="#EAB308" />
        <circle cx="-1.3" cy="-1.3" r="2.4" fill="#FCD34D" />
      </g>
    </svg>
  )
}
