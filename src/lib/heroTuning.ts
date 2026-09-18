/**
 * Live tuning store for the hero section.
 *
 * Most knobs map to a CSS custom property that the hero rules already read, so
 * changing one repaints without React re-rendering anything. The rest drive the
 * two canvases, which read them straight out of this store each frame and
 * repaint on the subscription below.
 *
 * Values persist to localStorage, which means they are local to this browser:
 * the deployed site shows the defaults until the numbers are baked in. The
 * panel exports both halves, because they bake into different files, the CSS
 * ones into styles.css and the canvas ones into DEFAULTS here.
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
  textWidth: number
  textShiftX: number
  textShiftY: number

  // portrait
  portraitSize: number

  // particle field
  particlePreset: number

  // overhead beam (canvas)
  beamTop: number
  beamAngle: number
  beamHeight: number
  beamStrength: number
  beamGrain: number

  // scratch (canvas)
  brushSize: number
  idleDelay: number
  resolveTime: number

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
  dot: string

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
  textWidth: 52,
  textShiftX: 0,
  textShiftY: 0,

  portraitSize: 200,

  // Constellation, the first of the ten.
  particlePreset: 0,

  // A narrow aperture, as a percentage of the hero's width, opening at a fixed
  // angle from there. Reach is a percentage of the hero's height.
  beamTop: 12,
  beamAngle: 28,
  beamHeight: 94,
  beamStrength: 0.3,
  beamGrain: 0.14,

  brushSize: 26,
  idleDelay: 2.5,
  resolveTime: 0.7,

  // Wide and shallow, near the top edge: light arriving from above the frame
  // rather than a pool of it sitting on the page.
  glowX: 50,
  glowY: 20,
  glowRX: 80,
  glowRY: 50,
  // Ambient only now: the shaft is the light source, and this just keeps the
  // upper half from reading as flat black behind it.
  glowAlpha: 0.05,
  glowDrift: 4,

  bg: '#0c0d0f',
  text: '#f0f0ee',
  textDim: '#8a8d91',
  accent: '#c8cdd4',
  dot: '#aab3c2',

  // Gentler than the old full-bleed figure wanted: a 200px circle travelling
  // half a viewport reads as the thing falling off the page.
  parallax: 0.18,
  entrance: true,
}

/**
 * The knobs the canvases own. They are listed rather than inferred because the
 * distinction that matters is not the type but where the value has to be baked
 * once it is settled: these go into DEFAULTS above, everything else into CSS.
 */
const CANVAS_KEYS = [
  'particlePreset',
  'beamTop',
  'beamAngle',
  'beamHeight',
  'beamStrength',
  'beamGrain',
  // The particle colour is handed to the engine, not to a stylesheet. It has to
  // bake alongside the preset or a baked value would sit in CSS being read by
  // nothing while the field kept using the default.
  'dot',
  'brushSize',
  'idleDelay',
  'resolveTime',
] as const

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
    '--h-text-w': `${t.textWidth}ch`,
    '--h-text-x': `${t.textShiftX}px`,
    '--h-text-y': `${t.textShiftY}px`,

    '--p-size': `${t.portraitSize}px`,

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

/**
 * The canvas half of the same job: the block to paste over the matching lines
 * in DEFAULTS above. These knobs never reach the DOM, so there is no CSS
 * property to carry them and nothing in styles.css to receive them.
 */
export function exportDefaults(t: Tuning = state): string {
  const changed = CANVAS_KEYS.filter((key) => t[key] !== DEFAULTS[key])
  if (!changed.length) return '// canvas tuning: unchanged from defaults'

  return [
    '// canvas tuning, for DEFAULTS in src/lib/heroTuning.ts',
    ...changed.map((key) => {
      const value = t[key]
      return `  ${key}: ${typeof value === 'string' ? `'${value}'` : value},`
    }),
  ].join('\n')
}
