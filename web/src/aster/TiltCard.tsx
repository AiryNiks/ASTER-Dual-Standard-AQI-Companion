// Spatial tilt + glare card — ported from setupTilt() in Aster.dc.html.
// Also delivers the Phase-1 tactile hover (lift + deepened shadow) on pointer devices.
import { useRef, type CSSProperties, type ReactNode } from 'react'

export function TiltCard({
  children,
  style,
  intensity = 1,
}: {
  children: ReactNode
  style?: CSSProperties
  intensity?: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)

  const move = (e: React.MouseEvent) => {
    const card = cardRef.current
    if (!card) return
    const r = card.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const rx = (0.5 - py) * 7 * intensity
    const ry = (px - 0.5) * 9 * intensity
    card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`
    const glare = glareRef.current
    if (glare) {
      glare.style.opacity = '0.55'
      glare.style.background = `radial-gradient(240px circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)`
    }
  }
  const leave = () => {
    const card = cardRef.current
    if (card) card.style.transform = ''
    const glare = glareRef.current
    if (glare) glare.style.opacity = '0'
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={move}
      onMouseLeave={leave}
      style={{
        position: 'relative',
        transition: 'transform .5s cubic-bezier(.16,1,.3,1), box-shadow .5s cubic-bezier(.16,1,.3,1)',
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '14%',
          right: '14%',
          height: 1,
          background: 'linear-gradient(90deg,transparent,var(--hair),transparent)',
          pointerEvents: 'none',
        }}
      />
      {children}
      <div
        ref={glareRef}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity .4s',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  )
}
