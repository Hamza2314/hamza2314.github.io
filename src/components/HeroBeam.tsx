import { useEffect, useRef, useState } from 'react'
import { getTuning, subscribe as subscribeTuning } from '../lib/heroTuning'

/**
 * A shaft of light entering from above.
 *
 * This is the Switchhouse god-ray recipe, painted rather than clipped. The
 * distinction matters more than it sounds: a clip-path fills a cone evenly and
 * then cuts it off, which reads as a grey triangle drawn on the page no matter
 * how hard it is blurred. What makes a shaft read as light is that its alpha
 * falls to zero at its own edges, so there is no edge to find.
 *
 * Both falloffs are theirs, from the baked beam texture:
 *
 *   vertical    (1 - v)^2          full at the top, gone by the bottom
 *   horizontal  sin(pi*u)^1.7      soft sides, silhouette invisible
 *
 * The cone is described by an angle rather than by a width at the bottom. A
 * width in percent is not a cone: on a phone the same percentages open far too
 * slowly and the shaft fades to nothing while it is still a streak. An angle
 * behaves like light does, and a narrow viewport simply crops it.
 *
 * Holding the angle means the buffer's aspect has to track the hero's, since
 * CSS stretches the result. The buffer is otherwise kept small on purpose: the
 * falloffs are low frequency and survive the upscale, and the grain wants
 * softening rather than resolving.
 */

/** Buffer height. Width follows the hero's aspect, within these bounds. */
const BUFFER_H = 600
const MIN_W = 200
const MAX_W = 1200

/** Cool silver, matching the ambient wash it sits in. */
const RGB = [200, 205, 212]

export default function HeroBeam() {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  // Client-only: the prerendered markup and first client render agree on an
  // empty container, and the canvas appears on the pass after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const el = canvas.current
    const box = host.current
    if (!el || !box) return

    const ctx = el.getContext('2d')
    if (!ctx) return

    let width = 0

    const paint = () => {
      if (!width) return

      const { beamTop, beamAngle, beamHeight, beamStrength, beamGrain } = getTuning()

      const img = ctx.createImageData(width, BUFFER_H)
      const data = img.data

      const cx = width / 2
      const topHalf = (beamTop / 100) * width * 0.5
      const reach = beamHeight / 100

      // One pixel of buffer height is one pixel of buffer width, because the
      // buffer carries the hero's aspect. That is what makes the angle real.
      const slope = Math.tan((beamAngle * Math.PI) / 180)

      for (let y = 0; y < BUFFER_H; y++) {
        const v = y / BUFFER_H

        // Past the beam's reach there is nothing to draw. Leaving these pixels
        // at alpha 0 is what lets the shaft end in air rather than at a line.
        if (v > reach) continue

        const vv = v / reach
        const vf = (1 - vv) * (1 - vv)
        const half = topHalf + y * slope

        const from = Math.max(0, Math.ceil(cx - half))
        const to = Math.min(width - 1, Math.floor(cx + half))

        for (let x = from; x <= to; x++) {
          const u = (x - cx) / half

          // sin over the beam's own width, so the falloff tracks the cone as it
          // widens instead of being fixed to the buffer.
          const hf = Math.pow(Math.sin(Math.PI * ((u + 1) / 2)), 1.7)

          const grain = 1 - beamGrain + beamGrain * Math.random()
          const a = beamStrength * vf * hf * grain

          const i = (y * width + x) * 4
          data[i] = RGB[0]
          data[i + 1] = RGB[1]
          data[i + 2] = RGB[2]
          data[i + 3] = Math.round(a * 255)
        }
      }

      ctx.putImageData(img, 0, 0)
    }

    const resize = () => {
      const w = box.clientWidth
      const h = box.clientHeight
      if (!w || !h) return

      const next = Math.min(MAX_W, Math.max(MIN_W, Math.round((w / h) * BUFFER_H)))
      if (next === width) return

      width = next
      el.width = width
      el.height = BUFFER_H
      paint()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(box)
    resize()

    const unsubscribe = subscribeTuning(paint)
    return () => {
      ro.disconnect()
      unsubscribe()
    }
  }, [mounted])

  return (
    <div className="hero-beam" ref={host} aria-hidden="true">
      {mounted && <canvas ref={canvas} />}
    </div>
  )
}
