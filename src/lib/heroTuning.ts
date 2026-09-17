/**
 * Live tuning store for the hero section.
 *
 * Every knob maps to a CSS custom property that the hero rules already read,
 * so changing one repaints without React re-rendering anything. Values persist
 * to localStorage, which means they are local to this browser: the deployed
 * site shows the defaults until the numbers are baked into styles.css. The
 * panel's "Copy CSS" button produces exactly that block.
 */

export type Tuning = {
  // text
  name: string
  role: string
  intro: string

  // name
  nameSize: number
  nameWidth: number
  nameWeight: number
  nameTrack: number
  nameLeading: number
  nameNoWrap: boolean

  // role
  roleSize: number
  roleWidth: number

  // intro
  introSize: number
  introMeasure: number
  introLeading: number

  // layout
  heroHeight: number
  splitLeft: number
  textWidth: number
  textShiftX: number
  textShiftY: number

  // figure
  figWidth: number
  figHeight: number
  figX: number
  figY: number
  figPosX: number
  figPosY: number
  figScale: number
  figOpacity: number

  // glow
  glowX: number
  glowY: number
  glowRX: number
  glowRY: number
  glowAlpha: number
  glowDrift: number

  // colour
  bg: string
  text: string
  textDim: string
  accent: string

  // motion
  parallax: number
  entrance: boolean
}

export const DEFAULTS: Tuning = {
  name: '',
  role: '',
  intro: '',

  nameSize: 84,
  nameWidth: 118,
  nameWeight: 500,
  nameTrack: -25,
  nameLeading: 0.95,
  nameNoWrap: true,

  roleSize: 21,
  roleWidth: 88,

  introSize: 17,
  introMeasure: 42,
  introLeading: 1.6,

  heroHeight: 100,
  splitLeft: 38,
  textWidth: 52,
  textShiftX: 0,
  textShiftY: 0,

  figWidth: 38,
  figHeight: 82,
  figX: 2,
  figY: -7,
  figPosX: 50,
  figPosY: 0,
  figScale: 1,
  figOpacity: 1,

  glowX: 75,
  glowY: 85,
  glowRX: 58,
  glowRY: 52,
  glowAlpha: 0.11,
  glowDrift: 4,

  bg: '#0c0d0f',
  text: '#f0f0ee',
  textDim: '#8a8d91',
  accent: '#c8cdd4',

  parallax: 0.5,
  entrance: true,
}

/** Knob -> CSS custom property. Anything absent here is not a CSS value. */
function cssVars(t: Tuning): Record<string, string> {
  return {
    '--h-name-size': `${t.nameSize}px`,
    '--h-name-wdth': `${t.nameWidth}`,
    '--h-name-weight': `${t.nameWeight}`,
    '--h-name-track': `${t.nameTrack / 1000}em`,
    '--h-name-lh': `${t.nameLeading}`,
    '--h-name-wrap': t.nameNoWrap ? 'nowrap' : 'normal',

    '--h-role-size': `${t.roleSize}px`,
    '--h-role-wdth': `${t.roleWidth}`,

    '--h-intro-size': `${t.introSize}px`,
    '--h-intro-measure': `${t.introMeasure}ch`,
    '--h-intro-lh': `${t.introLeading}`,

    '--h-height': `${t.heroHeight}vh`,
    '--h-split': `${t.splitLeft}%`,
    '--h-text-w': `${t.textWidth}ch`,
    '--h-text-x': `${t.textShiftX}px`,
    '--h-text-y': `${t.textShiftY}px`,

    '--h-fig-w': `${t.figWidth}%`,
    '--h-fig-h': `${t.figHeight}vh`,
    '--h-fig-x': `${t.figX}vw`,
    '--h-fig-y': `${t.figY}vh`,
    '--h-fig-pos-x': `${t.figPosX}%`,
    '--h-fig-pos-y': `${t.figPosY}%`,
    '--h-fig-scale': `${t.figScale}`,
    '--h-fig-opacity': `${t.figOpacity}`,

    '--h-glow-x': `${t.glowX}%`,
    '--h-glow-y': `${t.glowY}%`,
    '--h-glow-rx': `${t.glowRX}%`,
    '--h-glow-ry': `${t.glowRY}%`,
    '--h-glow-a': `${t.glowAlpha}`,
    '--h-glow-drift': `${t.glowDrift}`,

    '--bg': t.bg,
    '--text': t.text,
    '--text-dim': t.textDim,
    '--accent': t.accent,
  }
}

const KEY = 'hero-tuning-v1'

function load(): Tuning {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    // Merge over defaults so a stored blob from an older shape still loads.
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Tuning>) }
  } catch {
    return DEFAULTS
  }
}

let state: Tuning = DEFAULTS
let hydrated = false
const listeners = new Set<() => void>()

export function getTuning(): Tuning {
  return state
}

/** SSR and the first client render must agree, so both see the defaults. */
export function getServerTuning(): Tuning {
  return DEFAULTS
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function applyTuning(t: Tuning = state) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [prop, value] of Object.entries(cssVars(t))) {
    root.style.setProperty(prop, value)
  }
}

/** Called once after mount so stored values never break hydration. */
export function hydrateTuning() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  state = load()
  applyTuning(state)
  for (const fn of listeners) fn()
}

export function setTuning(patch: Partial<Tuning>) {
  state = { ...state, ...patch }
  applyTuning(state)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Private mode, or storage disabled. Tuning still applies for this session.
  }
  for (const fn of listeners) fn()
}

export function resetTuning() {
  state = DEFAULTS
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nothing to clean up.
  }
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    for (const prop of Object.keys(cssVars(DEFAULTS))) root.style.removeProperty(prop)
  }
  for (const fn of listeners) fn()
}

/** The block to paste into styles.css to make the current tuning permanent. */
export function exportCss(t: Tuning = state): string {
  const vars = cssVars(t)
  const changed = Object.entries(vars).filter(([prop, value]) => {
    const base = cssVars(DEFAULTS)[prop]
    return base !== value
  })

  if (!changed.length) return '/* hero tuning: unchanged from defaults */'

  const lines = changed.map(([prop, value]) => `  ${prop}: ${value};`)
  const textNotes: string[] = []
  if (t.name) textNotes.push(`   name:  ${t.name}`)
  if (t.role) textNotes.push(`   role:  ${t.role}`)
  if (t.intro) textNotes.push(`   intro: ${t.intro}`)

  return [
    '/* hero tuning */',
    ':root {',
    ...lines,
    '}',
    ...(textNotes.length ? ['', '/* text overrides, for src/data.ts:', ...textNotes, '*/'] : []),
  ].join('\n')
}
