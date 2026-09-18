import { useState, useSyncExternalStore } from 'react'
import {
  DEFAULTS,
  exportCss,
  exportDefaults,
  getServerTuning,
  getTuning,
  resetTuning,
  setTuning,
  subscribe,
  type Tuning,
} from '../lib/heroTuning'
import { PARTICLE_PRESETS } from '../lib/particlePresets'

/**
 * Design panel for the hero. Lazy-loaded and only mounted with ?tune in the
 * URL, so it never reaches an ordinary visitor or the initial bundle.
 */

type NumKey = {
  [K in keyof Tuning]: Tuning[K] extends number ? K : never
}[keyof Tuning]

type StrKey = {
  [K in keyof Tuning]: Tuning[K] extends string ? K : never
}[keyof Tuning]

type BoolKey = {
  [K in keyof Tuning]: Tuning[K] extends boolean ? K : never
}[keyof Tuning]

type Control =
  | { kind: 'text'; key: StrKey; label: string; rows?: number; placeholder?: string }
  | { kind: 'range'; key: NumKey; label: string; min: number; max: number; step: number; unit?: string }
  | { kind: 'color'; key: StrKey; label: string }
  | { kind: 'toggle'; key: BoolKey; label: string }
  | { kind: 'select'; key: NumKey; label: string; options: string[] }

type Group = { title: string; controls: Control[] }

const GROUPS: Group[] = [
  {
    title: 'Text',
    controls: [
      { kind: 'text', key: 'name', label: 'Name', placeholder: 'from data.ts' },
      { kind: 'text', key: 'role', label: 'Role', placeholder: 'from data.ts' },
      { kind: 'text', key: 'intro', label: 'Intro', rows: 4, placeholder: 'from data.ts' },
    ],
  },
  {
    title: 'Name type',
    controls: [
      { kind: 'range', key: 'nameSize', label: 'Size', min: 28, max: 180, step: 1, unit: 'px' },
      { kind: 'range', key: 'nameWidth', label: 'Width axis', min: 62, max: 125, step: 1 },
      { kind: 'range', key: 'nameWeight', label: 'Weight', min: 400, max: 600, step: 10 },
      { kind: 'range', key: 'nameTrack', label: 'Tracking', min: -70, max: 30, step: 1, unit: '/1000em' },
      { kind: 'range', key: 'nameLeading', label: 'Leading', min: 0.8, max: 1.3, step: 0.01 },
      { kind: 'toggle', key: 'nameNoWrap', label: 'Keep on one line' },
    ],
  },
  {
    title: 'Role and intro',
    controls: [
      { kind: 'range', key: 'roleSize', label: 'Role size', min: 12, max: 36, step: 1, unit: 'px' },
      { kind: 'range', key: 'roleWidth', label: 'Role width axis', min: 62, max: 125, step: 1 },
      { kind: 'range', key: 'introSize', label: 'Intro size', min: 12, max: 26, step: 1, unit: 'px' },
      { kind: 'range', key: 'introMeasure', label: 'Intro measure', min: 24, max: 80, step: 1, unit: 'ch' },
      { kind: 'range', key: 'introLeading', label: 'Intro leading', min: 1.2, max: 2, step: 0.05 },
    ],
  },
  {
    title: 'Layout',
    controls: [
      { kind: 'range', key: 'heroHeight', label: 'Hero height', min: 60, max: 120, step: 1, unit: 'vh' },
      { kind: 'range', key: 'textWidth', label: 'Text measure', min: 24, max: 80, step: 1, unit: 'ch' },
      { kind: 'range', key: 'textShiftX', label: 'Text nudge X', min: -300, max: 300, step: 2, unit: 'px' },
      { kind: 'range', key: 'textShiftY', label: 'Text nudge Y', min: -300, max: 300, step: 2, unit: 'px' },
    ],
  },
  {
    title: 'Particle field',
    controls: [
      {
        kind: 'select',
        key: 'particlePreset',
        label: 'Effect',
        options: PARTICLE_PRESETS.map((p) => p.label),
      },
      { kind: 'color', key: 'dot', label: 'Particle colour' },
    ],
  },
  {
    title: 'Portrait',
    controls: [
      { kind: 'range', key: 'portraitSize', label: 'Circle size', min: 110, max: 340, step: 2, unit: 'px' },
      { kind: 'range', key: 'brushSize', label: 'Brush', min: 8, max: 70, step: 1, unit: 'px' },
      { kind: 'range', key: 'idleDelay', label: 'Idle before resolve', min: 0.5, max: 8, step: 0.1, unit: 's' },
      { kind: 'range', key: 'resolveTime', label: 'Resolve time', min: 0.2, max: 3, step: 0.05, unit: 's' },
    ],
  },
  {
    title: 'Glow',
    controls: [
      { kind: 'range', key: 'glowX', label: 'Centre X', min: 0, max: 100, step: 1, unit: '%' },
      { kind: 'range', key: 'glowY', label: 'Centre Y', min: 0, max: 100, step: 1, unit: '%' },
      { kind: 'range', key: 'glowRX', label: 'Spread X', min: 10, max: 120, step: 1, unit: '%' },
      { kind: 'range', key: 'glowRY', label: 'Spread Y', min: 10, max: 120, step: 1, unit: '%' },
      { kind: 'range', key: 'glowAlpha', label: 'Strength', min: 0, max: 0.4, step: 0.005 },
      { kind: 'range', key: 'glowDrift', label: 'Cursor drift', min: 0, max: 12, step: 0.5, unit: 'vw' },
    ],
  },
  {
    title: 'Colour',
    controls: [
      { kind: 'color', key: 'bg', label: 'Background' },
      { kind: 'color', key: 'text', label: 'Text' },
      { kind: 'color', key: 'textDim', label: 'Secondary text' },
      { kind: 'color', key: 'accent', label: 'Accent' },
    ],
  },
  {
    title: 'Motion',
    controls: [
      { kind: 'range', key: 'parallax', label: 'Parallax', min: 0, max: 1, step: 0.05 },
      { kind: 'toggle', key: 'entrance', label: 'Entrance animation' },
    ],
  },
]

function Row({ control, value }: { control: Control; value: Tuning[keyof Tuning] }) {
  if (control.kind === 'range') {
    const v = value as number
    return (
      <label className="tuner-row">
        <span className="tuner-label">
          {control.label}
          <em>
            {v}
            {control.unit ?? ''}
          </em>
        </span>
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={v}
          onChange={(e) => setTuning({ [control.key]: Number(e.target.value) } as Partial<Tuning>)}
        />
      </label>
    )
  }

  if (control.kind === 'select') {
    return (
      <label className="tuner-row">
        <span className="tuner-label">{control.label}</span>
        <select
          className="tuner-select"
          value={value as number}
          onChange={(e) => setTuning({ [control.key]: Number(e.target.value) } as Partial<Tuning>)}
        >
          {control.options.map((label, i) => (
            <option key={label} value={i}>
              {label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (control.kind === 'color') {
    const v = value as string
    return (
      <label className="tuner-row tuner-color">
        <span className="tuner-label">
          {control.label}
          <em>{v}</em>
        </span>
        <input
          type="color"
          value={v}
          onChange={(e) => setTuning({ [control.key]: e.target.value } as Partial<Tuning>)}
        />
      </label>
    )
  }

  if (control.kind === 'toggle') {
    return (
      <label className="tuner-row tuner-toggle">
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => setTuning({ [control.key]: e.target.checked } as Partial<Tuning>)}
        />
        <span>{control.label}</span>
      </label>
    )
  }

  const v = value as string
  return (
    <label className="tuner-row">
      <span className="tuner-label">{control.label}</span>
      {control.rows ? (
        <textarea
          rows={control.rows}
          value={v}
          placeholder={control.placeholder}
          onChange={(e) => setTuning({ [control.key]: e.target.value } as Partial<Tuning>)}
        />
      ) : (
        <input
          type="text"
          value={v}
          placeholder={control.placeholder}
          onChange={(e) => setTuning({ [control.key]: e.target.value } as Partial<Tuning>)}
        />
      )}
    </label>
  )
}

export default function HeroTuner() {
  const tuning = useSyncExternalStore(subscribe, getTuning, getServerTuning)
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>(['Text', 'Layout'])

  const copy = async () => {
    const css = `${exportCss(tuning)}\n\n${exportDefaults(tuning)}`
    try {
      await navigator.clipboard.writeText(css)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard can be blocked; the textarea below is the fallback.
    }
  }

  if (!open) {
    return (
      <button className="tuner-fab" onClick={() => setOpen(true)} aria-label="Open hero tuner">
        Tune
      </button>
    )
  }

  return (
    <aside className="tuner" aria-label="Hero tuning panel">
      <header className="tuner-head">
        <strong>Hero</strong>
        <div className="tuner-head-actions">
          <button onClick={() => resetTuning()}>Reset</button>
          <button onClick={copy}>{copied ? 'Copied' : 'Copy CSS'}</button>
          <button onClick={() => setOpen(false)} aria-label="Collapse panel">
            ×
          </button>
        </div>
      </header>

      <div className="tuner-body">
        {GROUPS.map((group) => {
          const isOpen = openGroups.includes(group.title)
          return (
            <section key={group.title} className="tuner-group">
              <button
                className="tuner-group-head"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenGroups((prev) =>
                    prev.includes(group.title)
                      ? prev.filter((t) => t !== group.title)
                      : [...prev, group.title],
                  )
                }
              >
                <span>{group.title}</span>
                <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>

              {isOpen && (
                <div className="tuner-controls">
                  {group.controls.map((control) => (
                    <Row key={control.key} control={control} value={tuning[control.key]} />
                  ))}
                </div>
              )}
            </section>
          )
        })}

        <section className="tuner-group">
          <p className="tuner-note">
            Changes are saved in this browser only. The live site keeps the defaults until
            the values are written into the source. The first block below goes into{' '}
            <code>styles.css</code>; the second replaces the matching lines of{' '}
            <code>DEFAULTS</code> in <code>src/lib/heroTuning.ts</code>, because the
            canvases read those numbers directly and no CSS property carries them.
          </p>
          <textarea className="tuner-export" readOnly rows={6} value={exportCss(tuning)} />
          <textarea className="tuner-export" readOnly rows={5} value={exportDefaults(tuning)} />
        </section>
      </div>
    </aside>
  )
}

export { DEFAULTS }
