import type { ISourceOptions } from '@tsparticles/engine'

/**
 * The ten tsParticles effects, ported from the Phantom site.
 *
 * The configs are kept as they were tuned there. Two things differ, both
 * because this page is not that page:
 *
 *   - colour is injected at read time rather than hardcoded white, so the
 *     existing tuning knob keeps driving it
 *   - the preset is chosen through the hero tuning store instead of a store of
 *     its own, since there is only ever one field on this page
 *
 * Nothing here imports the engine at runtime: `ISourceOptions` is a type-only
 * import, so this module is free to be pulled into the tuning panel's chunk
 * without dragging tsParticles along with it.
 */

export interface ParticlePreset {
  id: string
  label: string
  options: ISourceOptions
}

// Shared base. Particles live inside a positioned container (not fullscreen),
// render on a transparent canvas, and respect reduced-motion preferences.
const base: ISourceOptions = {
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 120,
  detectRetina: true,
  motion: { reduce: { factor: 4, value: true } },
}

/** Replaced per render by the tuned colour; only a placeholder in the configs. */
const WHITE = '#ffffff'

export const PARTICLE_PRESETS: ParticlePreset[] = [
  {
    id: 'constellation',
    label: 'Constellation',
    options: {
      ...base,
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: true, mode: 'grab' },
          onClick: { enable: true, mode: 'push' },
        },
        modes: {
          grab: { distance: 170, links: { opacity: 0.5 } },
          push: { quantity: 3 },
        },
      },
      particles: {
        number: { value: 90 },
        color: { value: WHITE },
        links: { enable: true, color: WHITE, distance: 150, opacity: 0.12, width: 1 },
        move: { enable: true, speed: 0.6, direction: 'none', outModes: { default: 'out' } },
        opacity: { value: { min: 0.15, max: 0.4 } },
        size: { value: { min: 1, max: 2.2 } },
      },
    },
  },
  {
    id: 'drift',
    label: 'Nebula Drift',
    options: {
      ...base,
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: true, mode: 'bubble' },
          onClick: { enable: true, mode: 'repulse' },
        },
        modes: {
          bubble: { distance: 200, size: 5, duration: 2, opacity: 0.9 },
          repulse: { distance: 140, duration: 0.4 },
        },
      },
      particles: {
        number: { value: 110 },
        color: { value: WHITE },
        links: { enable: false },
        move: {
          enable: true,
          speed: 0.35,
          direction: 'none',
          random: true,
          outModes: { default: 'out' },
        },
        opacity: { value: { min: 0.1, max: 0.45 } },
        size: { value: { min: 1, max: 2.4 } },
      },
    },
  },
  {
    id: 'repel',
    label: 'Repel',
    options: {
      ...base,
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: true, mode: 'repulse' },
          onClick: { enable: true, mode: 'push' },
        },
        modes: {
          repulse: { distance: 130, duration: 0.4 },
          push: { quantity: 4 },
        },
      },
      particles: {
        number: { value: 100 },
        color: { value: WHITE },
        links: { enable: false },
        move: { enable: true, speed: 0.8, direction: 'none', outModes: { default: 'out' } },
        opacity: { value: { min: 0.2, max: 0.5 } },
        size: { value: { min: 1, max: 2.6 } },
      },
    },
  },
  {
    id: 'magnetic',
    label: 'Magnetic',
    options: {
      ...base,
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: true, mode: 'attract' },
          onClick: { enable: true, mode: 'push' },
        },
        modes: {
          attract: { distance: 220, duration: 0.4, factor: 3, speed: 1 },
          push: { quantity: 3 },
        },
      },
      particles: {
        number: { value: 90 },
        color: { value: WHITE },
        links: { enable: true, color: WHITE, distance: 130, opacity: 0.08, width: 1 },
        move: { enable: true, speed: 0.5, direction: 'none', outModes: { default: 'out' } },
        opacity: { value: { min: 0.15, max: 0.4 } },
        size: { value: { min: 1, max: 2.2 } },
      },
    },
  },
  {
    id: 'starfield',
    label: 'Starfield',
    options: {
      ...base,
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: {
            enable: true,
            mode: 'bubble',
            parallax: { enable: true, force: 50, smooth: 12 },
          },
          onClick: { enable: true, mode: 'push' },
        },
        modes: {
          bubble: { distance: 160, size: 3.5, duration: 2, opacity: 1 },
          push: { quantity: 4 },
        },
      },
      particles: {
        number: { value: 160 },
        color: { value: WHITE },
        links: { enable: false },
        move: { enable: true, speed: 0.15, direction: 'none', outModes: { default: 'out' } },
        opacity: {
          value: { min: 0.05, max: 0.7 },
          animation: { enable: true, speed: 0.6, sync: false },
        },
        size: { value: { min: 0.5, max: 1.6 } },
      },
    },
  },
  {
    id: 'web',
    label: 'Web',
    options: {
      ...base,
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: true, mode: 'connect' },
          onClick: { enable: true, mode: 'push' },
        },
        modes: {
          connect: { distance: 120, links: { opacity: 0.25 }, radius: 140 },
          push: { quantity: 3 },
        },
      },
      particles: {
        number: { value: 80 },
        color: { value: WHITE },
        links: { enable: true, color: WHITE, distance: 130, opacity: 0.1, width: 1 },
        move: { enable: true, speed: 0.45, direction: 'none', outModes: { default: 'out' } },
        opacity: { value: { min: 0.12, max: 0.4 } },
        size: { value: { min: 1, max: 2 } },
      },
    },
  },
  {
    id: 'snowfall',
    label: 'Snowfall',
    options: {
      ...base,
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: true, mode: 'repulse' },
          onClick: { enable: true, mode: 'push' },
        },
        modes: {
          repulse: { distance: 120, duration: 0.4 },
          push: { quantity: 4 },
        },
      },
      particles: {
        number: { value: 130 },
        color: { value: WHITE },
        links: { enable: false },
        move: {
          enable: true,
          speed: 0.7,
          direction: 'bottom',
          straight: false,
          random: true,
          outModes: { default: 'out' },
        },
        wobble: { enable: true, distance: 8, speed: 4 },
        opacity: { value: { min: 0.1, max: 0.5 } },
        size: { value: { min: 1, max: 2.8 } },
      },
    },
  },
  {
    id: 'plexus',
    label: 'Plexus Dense',
    options: {
      ...base,
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: true, mode: 'grab' },
          onClick: { enable: true, mode: 'push' },
        },
        modes: {
          grab: { distance: 140, links: { opacity: 0.4 } },
          push: { quantity: 4 },
        },
      },
      particles: {
        number: { value: 150 },
        color: { value: WHITE },
        links: { enable: true, color: WHITE, distance: 110, opacity: 0.14, width: 0.8 },
        move: { enable: true, speed: 0.5, direction: 'none', outModes: { default: 'out' } },
        opacity: { value: { min: 0.1, max: 0.35 } },
        size: { value: { min: 0.6, max: 1.8 } },
      },
    },
  },
  {
    id: 'slowmo',
    label: 'Slow Motion',
    options: {
      ...base,
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: true, mode: 'slow' },
          onClick: { enable: true, mode: 'push' },
        },
        modes: {
          slow: { factor: 4, radius: 220 },
          push: { quantity: 3 },
        },
      },
      particles: {
        number: { value: 95 },
        color: { value: WHITE },
        links: { enable: true, color: WHITE, distance: 140, opacity: 0.1, width: 1 },
        move: { enable: true, speed: 1.4, direction: 'none', outModes: { default: 'out' } },
        opacity: { value: { min: 0.15, max: 0.4 } },
        size: { value: { min: 1, max: 2.2 } },
      },
    },
  },
  {
    id: 'orbit',
    label: 'Orbit',
    options: {
      ...base,
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: true, mode: 'grab' },
          onClick: { enable: true, mode: 'bubble' },
        },
        modes: {
          grab: { distance: 160, links: { opacity: 0.35 } },
          bubble: { distance: 180, size: 4, duration: 2, opacity: 0.9 },
        },
      },
      particles: {
        number: { value: 70 },
        color: { value: WHITE },
        shape: { type: 'star' },
        links: { enable: false },
        move: { enable: true, speed: 0.6, direction: 'none', outModes: { default: 'out' } },
        rotate: {
          value: { min: 0, max: 360 },
          direction: 'random',
          animation: { enable: true, speed: 4, sync: false },
        },
        opacity: { value: { min: 0.15, max: 0.45 } },
        size: { value: { min: 1, max: 2.4 } },
      },
    },
  },
]

/** Wraps an out-of-range index rather than throwing, so cycling can be blind. */
export function clampPreset(index: number): number {
  const count = PARTICLE_PRESETS.length
  if (!Number.isFinite(index)) return 0
  return ((Math.trunc(index) % count) + count) % count
}

/**
 * The chosen preset with the tuned colour applied. Building this fresh is what
 * lets the colour knob drive the field; the preset objects themselves are never
 * mutated, because tsParticles holds onto whatever it is handed.
 */
export function presetOptions(index: number, colour: string): ISourceOptions {
  const { options } = PARTICLE_PRESETS[clampPreset(index)]
  const particles = options.particles ?? {}

  // Recoloured whenever links are configured at all, without checking whether
  // they are enabled: a colour on a disabled link draws nothing, and reading
  // `enable` off the engine's partial types buys a cast for no behaviour.
  return {
    ...options,
    particles: {
      ...particles,
      color: { value: colour },
      ...(particles.links ? { links: { ...particles.links, color: colour } } : {}),
    },
  }
}
