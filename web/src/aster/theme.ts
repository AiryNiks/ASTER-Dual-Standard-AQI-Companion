// Theme variable maps ported verbatim from Aster.dc.html (THEMES / BACKDROPS / applyTheme).
import { ACCENTS, hexToRgb, type Theme } from './engine'

export const BACKDROPS: Record<string, [string, string]> = {
  'Pastel Blue': ['#f2f8ff', '#dae7f5'],
  'Warm Sand': ['#fdf6ee', '#ecdcc8'],
  Mist: ['#f1f9f4', '#d7ebe0'],
  Lilac: ['#f6f1ff', '#e6dbf7'],
}

export const THEMES: Record<Theme, Record<string, string>> = {
  light: {
    '--ink': '#0F1E33', '--ink2': '#37475C', '--ink3': '#46556A', '--ink4': '#5F6E82',
    '--eyebrow': '#455370', '--navidle': '#69778B',
    '--card': 'linear-gradient(155deg,rgba(255,255,255,0.84),rgba(255,255,255,0.68) 60%,rgba(232,241,252,0.76))',
    '--card-brd': 'rgba(148,163,184,0.45)',
    '--card-sh': '0 30px 70px rgba(40,70,130,0.18),inset 0 1.5px 0 rgba(255,255,255,0.8)',
    '--card-sh-s': '0 10px 26px rgba(40,70,130,0.1)',
    '--btn-sh': '0 6px 16px var(--accent-glow)', '--btn-sh-h': '0 9px 22px var(--accent-glow)',
    '--inset': 'rgba(255,255,255,0.5)', '--inset-brd': 'rgba(255,255,255,0.7)',
    '--glass-2': 'rgba(255,255,255,0.7)', '--glass-f': 'blur(24px) saturate(150%)',
    '--track': 'rgba(255,255,255,0.58)', '--track-brd': 'rgba(41,55,74,0.18)',
    '--track-sh': 'inset 0 1px 3px rgba(40,70,130,0.10)', '--ctl-h': 'rgba(255,255,255,0.85)',
    '--thumb': 'linear-gradient(180deg,#ffffff,#f0f4fb)',
    '--thumb-sh': '0 5px 15px rgba(40,70,130,0.26),0 1px 0 rgba(255,255,255,0.95) inset',
    '--thumb-brd': 'rgba(40,70,130,0.06)', '--hair': 'rgba(255,255,255,0.9)',
    '--divider': 'rgba(40,70,130,0.1)', '--tint-brd': 'rgba(40,70,130,0.13)',
    '--chip-on-bg': 'rgba(224,242,254,0.4)', '--chip-on-brd': 'rgba(224,242,254,0.65)',
    '--chip-on-fg': '#2A3A48', '--chip-on-sh': '0 8px 32px rgba(0,0,0,0.1),inset 0 1px 0 rgba(255,255,255,0.5)',
    '--chip-off-bg': 'rgba(255,255,255,0.14)', '--chip-off-brd': 'rgba(255,255,255,0.6)', '--chip-off-fg': '#37475C',
    '--warn-bg': 'rgba(254,237,222,0.4)', '--warn-brd': 'rgba(254,237,222,0.65)',
    '--navbar': 'linear-gradient(180deg,rgba(255,255,255,0.4),rgba(255,255,255,0.82))',
    '--navbar-brd': 'rgba(255,255,255,0.7)',
    '--shell': 'linear-gradient(180deg,#cfe3f7,#eaf2fc)', '--bezel': 'linear-gradient(160deg,#fdfefe,#dfe8f2)',
    '--shell-sh': '0 60px 140px rgba(40,70,130,0.28), inset 0 1px 0 rgba(255,255,255,0.9)',
    '--bezel-sh': '0 60px 130px rgba(40,70,130,0.32), inset 0 0 0 2px rgba(255,255,255,0.5)',
    '--scrim': 'linear-gradient(180deg, rgba(237,245,253,0.58) 0%, rgba(237,245,253,0.38) 34%, rgba(227,238,250,0.46) 66%, rgba(214,230,247,0.74) 100%)',
    '--scrim-m': 'linear-gradient(180deg, rgba(237,245,253,0.6) 0%, rgba(237,245,253,0.4) 36%, rgba(227,238,250,0.48) 64%, rgba(214,230,247,0.76) 100%)',
    '--code-bg': '#0B1220',
  },
  dark: {
    '--ink': '#E7ECF3', '--ink2': '#AAB4C4', '--ink3': '#8A97A9', '--ink4': '#6B7787',
    '--eyebrow': '#8A97A9', '--navidle': '#5E6A79',
    '--card': 'linear-gradient(155deg,rgba(22,28,42,0.62),rgba(18,24,38,0.56) 60%,rgba(13,18,29,0.6))',
    '--card-brd': 'rgba(255,255,255,0.06)', '--card-sh': 'inset 0 1px 2px rgba(0,0,0,0.4)',
    '--card-sh-s': 'inset 0 1px 2px rgba(0,0,0,0.35)', '--btn-sh': 'inset 0 1px 2px rgba(0,0,0,0.4)',
    '--btn-sh-h': 'inset 0 1px 2px rgba(0,0,0,0.4)', '--inset': 'rgba(255,255,255,0.04)',
    '--inset-brd': 'rgba(255,255,255,0.07)', '--glass-2': 'rgba(24,31,46,0.65)', '--glass-f': 'blur(32px)',
    '--track': 'rgba(255,255,255,0.05)', '--track-brd': 'rgba(255,255,255,0.08)',
    '--track-sh': 'inset 0 1px 3px rgba(0,0,0,0.5)', '--ctl-h': 'rgba(255,255,255,0.10)',
    '--thumb': 'linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.13))',
    '--thumb-sh': '0 2px 8px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.25)',
    '--thumb-brd': 'rgba(255,255,255,0.24)', '--hair': 'rgba(255,255,255,0.07)',
    '--divider': 'rgba(255,255,255,0.07)', '--tint-brd': 'rgba(255,255,255,0.1)',
    '--chip-on-bg': 'rgba(148,163,184,0.15)', '--chip-on-brd': 'rgba(148,163,184,0.4)',
    '--chip-on-fg': '#FFFFFF', '--chip-on-sh': 'inset 0 1px 2px rgba(0,0,0,0.4)',
    '--chip-off-bg': 'rgba(255,255,255,0.04)', '--chip-off-brd': 'rgba(255,255,255,0.13)', '--chip-off-fg': '#AAB4C4',
    '--warn-bg': 'rgba(206,187,161,0.12)', '--warn-brd': 'rgba(206,187,161,0.35)',
    '--navbar': 'linear-gradient(180deg,rgba(13,18,29,0.55),rgba(11,15,23,0.9))', '--navbar-brd': 'rgba(255,255,255,0.06)',
    '--shell': 'linear-gradient(180deg,#0d1420,#0a0f18)', '--bezel': 'linear-gradient(160deg,#1a2231,#0e1420)',
    '--shell-sh': '0 40px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    '--bezel-sh': '0 40px 90px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.06)',
    '--scrim': 'linear-gradient(180deg, rgba(11,15,23,0.5) 0%, rgba(11,15,23,0.22) 34%, rgba(11,15,23,0.34) 66%, rgba(7,10,17,0.68) 100%)',
    '--scrim-m': 'linear-gradient(180deg, rgba(11,15,23,0.52) 0%, rgba(11,15,23,0.24) 36%, rgba(11,15,23,0.36) 64%, rgba(7,10,17,0.7) 100%)',
    '--code-bg': '#080D18',
  },
}

export function applyTheme(root: HTMLElement, theme: Theme, backdrop = 'Pastel Blue', accent = '#3F63C6') {
  const dark = theme === 'dark'
  const T = THEMES[dark ? 'dark' : 'light']
  for (const k in T) root.style.setProperty(k, T[k])
  const bd = BACKDROPS[backdrop] || BACKDROPS['Pastel Blue']
  root.style.setProperty(
    '--page-bg',
    dark
      ? 'radial-gradient(1100px 700px at 82% -6%, #141A26 0%, rgba(20,26,38,0) 55%),linear-gradient(165deg,#0B0F17 0%,#070A11 100%)'
      : 'radial-gradient(1200px 760px at 82% -8%, #ffffff 0%, rgba(255,255,255,0) 55%),linear-gradient(165deg,' +
          bd[0] + ' 0%,' + bd[1] + ' 100%)',
  )
  const a = dark ? '#93A4C9' : accent || '#3F63C6'
  const m = dark ? ['#B7C4DE', 'rgba(147,164,201,0.16)'] : ACCENTS[a] || ACCENTS['#3F63C6']
  root.style.setProperty('--accent', a)
  root.style.setProperty('--accent-l', m[0])
  root.style.setProperty('--accent-glow', m[1])
  const rgb = hexToRgb(a).map((x) => Math.round(x * 255))
  const R = rgb[0] + ',' + rgb[1] + ',' + rgb[2]
  root.style.setProperty('--accent-soft', 'rgba(' + R + ',0.10)')
  root.style.setProperty('--accent-soft-h', 'rgba(' + R + ',0.17)')
  root.style.setProperty('--accent-line', 'rgba(' + R + ',0.28)')
  try {
    document.body.style.background = dark ? '#0B0F17' : '#edf4fc'
  } catch (e) {
    /* noop */
  }
}
