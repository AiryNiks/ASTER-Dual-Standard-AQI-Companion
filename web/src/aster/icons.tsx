// Weather-condition + verdict icons — ported from iconFor() / vIcon() in Aster.dc.html.
import type { ReactNode } from 'react'
import type { SceneKind } from './engine'

export function condIcon(kind: SceneKind, isDay: boolean, size: number, color = '#3F63C6'): ReactNode {
  const svg = (children: ReactNode) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
  if (kind === 'storm')
    return svg(
      <>
        <path d="M6 16.3A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 .5 9" />
        <path d="M13 12l-3 5h4l-3 5" />
      </>,
    )
  if (kind === 'rain')
    return svg(
      <>
        <path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2" />
        <path d="M8 14v6M12 16v6M16 14v6" />
      </>,
    )
  if (kind === 'snow')
    return svg(
      <>
        <path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2" />
        <path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01" />
      </>,
    )
  if (kind === 'fog')
    return svg(
      <>
        <path d="M4 11.9A7 7 0 1 1 15.7 5h1.8a4.5 4.5 0 0 1 2.5 8.2" />
        <path d="M16 17H7M17 21H9" />
      </>,
    )
  if (kind === 'clouds') return svg(<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z" />)
  if (!isDay) return svg(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />)
  return svg(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>,
  )
}

export function verdictIcon(key: 'safe' | 'caution' | 'avoid', size: number, color = '#fff'): ReactNode {
  const svg = (children: ReactNode) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
  if (key === 'avoid')
    return svg(
      <>
        <path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9L7.9 2z" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </>,
    )
  if (key === 'caution')
    return svg(
      <>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
      </>,
    )
  return svg(
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </>,
  )
}
