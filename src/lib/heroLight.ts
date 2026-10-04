import gsap from 'gsap'

export type RGB = readonly [number, number, number]

/** The cool silver the hero has always been lit with. */
export const DEFAULT_LIGHT: RGB = [200, 205, 212]

/**
 * The colour of the hero's light, eased between values.
 *
 * The portrait sets a target as it changes photo; the beam and the ambient
 * wash subscribe and repaint as it moves. One tween, so the two can never
 * drift apart in colour.
 */
const light = { r: DEFAULT_LIGHT[0], g: DEFAULT_LIGHT[1], b: DEFAULT_LIGHT[2] }
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

export function getLight(): RGB {
  return [Math.round(light.r), Math.round(light.g), Math.round(light.b)]
}

export function subscribeLight(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Eases the light to `to` over `seconds`. Restarting mid-way is seamless. */
export function setLight(to: RGB, seconds: number) {
  gsap.to(light, {
    r: to[0],
    g: to[1],
    b: to[2],
    duration: seconds,
    ease: 'sine.inOut',
    overwrite: true,
    onUpdate: notify,
  })
}
