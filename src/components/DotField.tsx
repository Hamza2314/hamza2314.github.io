import { useEffect, useRef } from 'react'
import { getTuning, subscribe as subscribeTuning } from '../lib/heroTuning'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * The lattice behind the hero: a still grid of faint dots that lifts under the
 * cursor.
 *
 * Two canvases rather than one, which is what keeps this cheap enough to be
 * free. The rest grid is painted once onto `base` and then never touched; only
 * the couple of hundred dots inside the cursor's reach are redrawn per frame,
 * onto a transparent `live` layer stacked over it. A lifted dot is concentric
 * with and larger than the resting dot it covers, so the two layers agree
 * without the live one having to know what is underneath.
 *
 * The loop exists only while something is moving. Pointer at rest outside the
 * hero means the influence has eased to zero, the live layer is cleared, and
 * the rAF is cancelled outright: an idle tab spends nothing here.
 *
 * All internal maths is in device pixels. The contexts are deliberately not
 * scaled by DPR, because half the work below is comparing distances against a
 * pointer position and rounding dot centres onto the pixel grid.
 */

/** Cap DPR: a dot lattice gains nothing from a third subpixel of precision. */
const MAX_DPR = 2

/** Pointer influence eases in and out at this rate per frame, at 60fps. */
const EASE = 0.08

/** Below this the influence is treated as gone and the loop is allowed to end. */
const SLEEP = 0.002

function readColor(): string {
  const style = getComputedStyle(document.documentElement)
  return (
    style.getPropertyValue('--dot').trim() ||
    style.getPropertyValue('--mesh').trim() ||
    '#aab3c2'
  )
}

export default function DotField() {
  const host = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = host.current
    if (!el) return

    const base = document.createElement('canvas')
    const live = document.createElement('canvas')
    base.className = 'dots-base'
    live.className = 'dots-live'
    el.append(base, live)

    const baseCtx = base.getContext('2d')
    const liveCtx = live.getContext('2d')
    if (!baseCtx || !liveCtx) return

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    let width = 0
    let height = 0
    let colour = readColor()

    // Pointer, in device pixels, relative to the canvas. Target values are
    // written by the listener; the loop eases the live ones toward them so the
    // spotlight has weight instead of teleporting.
    let px = 0
    let py = 0
    let tx = 0
    let ty = 0
    let influence = 0
    let target = 0
    let time = 0

    /** The resting lattice. Repainted only on resize or a theme change. */
    const paintBase = () => {
      const { dotSpacing, dotSize, dotAlpha } = getTuning()
      const step = dotSpacing * dpr
      const r = dotSize * dpr

      baseCtx.clearRect(0, 0, width, height)
      baseCtx.fillStyle = colour
      baseCtx.globalAlpha = dotAlpha

      // Half a step of inset centres the lattice in the box, so the grid never
      // looks anchored to one corner.
      for (let y = step / 2; y < height; y += step) {
        for (let x = step / 2; x < width; x += step) {
          baseCtx.beginPath()
          baseCtx.arc(x, y, r, 0, Math.PI * 2)
          baseCtx.fill()
        }
      }

      baseCtx.globalAlpha = 1
    }

    const paintLive = () => {
      liveCtx.clearRect(0, 0, width, height)
      if (influence < SLEEP) return

      const { dotSpacing, dotSize, dotAlpha, spotRadius, spotBoost, spotRipple } =
        getTuning()

      const step = dotSpacing * dpr
      const r = dotSize * dpr
      const reach = spotRadius * dpr
      const peak = Math.min(dotAlpha + spotBoost, 1)

      // Only the lattice cells whose centres can fall inside the reach are
      // considered. Everything outside it is already correct on the base layer.
      const first = Math.max(0, Math.floor((px - reach - step / 2) / step))
      const last = Math.ceil((px + reach - step / 2) / step)
      const top = Math.max(0, Math.floor((py - reach - step / 2) / step))
      const bottom = Math.ceil((py + reach - step / 2) / step)

      liveCtx.fillStyle = colour

      for (let j = top; j <= bottom; j++) {
        const y = step / 2 + j * step
        if (y > height) break

        for (let i = first; i <= last; i++) {
          const x = step / 2 + i * step
          if (x > width) break

          const dx = x - px
          const dy = y - py
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > reach) continue

          // Smoothstep, so the edge of the reach is not a findable circle.
          const linear = 1 - dist / reach
          const fall = linear * linear * (3 - 2 * linear) * influence

          // A ripple travelling outward from the cursor. Phase runs on distance
          // as well as time, which is what makes it read as a wave through the
          // lattice rather than every dot pulsing in unison.
          const wave = 1 + spotRipple * Math.sin(time * 2.6 - dist * 0.03)

          liveCtx.globalAlpha = dotAlpha + (peak - dotAlpha) * fall
          liveCtx.beginPath()
          liveCtx.arc(x, y, r * (1 + fall * wave), 0, Math.PI * 2)
          liveCtx.fill()
        }
      }

      liveCtx.globalAlpha = 1
    }

    // --- loop ----------------------------------------------------------------
    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1)
      last = now
      time += delta

      px += (tx - px) * EASE
      py += (ty - py) * EASE
      influence += (target - influence) * EASE

      paintLive()

      // Settled and nothing to fade: stop rather than run empty frames.
      if (influence < SLEEP && target === 0) {
        raf = 0
        return
      }
      raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    // --- pointer -------------------------------------------------------------
    // The hero's position is cached rather than measured per event. Measuring
    // inside pointermove forces a layout on every one of them, and with Lenis
    // driving a transform on the page that layout is nearly always dirty.
    // Scroll and resize are the only two things that can move the box, and both
    // are cheap places to re-measure.
    let rect = el.getBoundingClientRect()
    const remeasure = () => {
      rect = el.getBoundingClientRect()
    }

    const onMove = (e: PointerEvent) => {
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      target = inside ? 1 : 0
      if (!inside) return

      tx = (e.clientX - rect.left) * dpr
      ty = (e.clientY - rect.top) * dpr

      // First entry: land the spotlight where the cursor actually is instead of
      // sliding it in from wherever it was left.
      if (influence < SLEEP) {
        px = tx
        py = ty
      }

      wake()
    }

    const onLeave = () => {
      target = 0
      wake()
    }

    // Reduced motion keeps the lattice, because it is a texture rather than an
    // animation, and drops everything that moves. These listeners are the only
    // thing that can ever wake the loop, so not binding them is the whole of it.
    //
    // Listening on the window rather than the element: the hero is full-bleed,
    // and a pointer that leaves through the bottom edge still has to fade out.
    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('scroll', remeasure, { passive: true })
      document.addEventListener('pointerleave', onLeave)
    }

    // --- sizing --------------------------------------------------------------
    const resize = () => {
      const w = Math.round(el.clientWidth * dpr)
      const h = Math.round(el.clientHeight * dpr)
      if (!w || !h || (w === width && h === height)) return

      width = w
      height = h
      for (const c of [base, live]) {
        c.width = w
        c.height = h
      }
      remeasure()
      paintBase()
      paintLive()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    // --- repaint triggers ----------------------------------------------------
    // The resting lattice is painted once and then left alone, so anything that
    // changes what it should look like has to say so. Two things can: the
    // theme, and the tuning panel moving spacing, size, alpha or the colour.
    const themeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const repaint = () => {
      colour = readColor()
      paintBase()
      paintLive()
    }
    themeQuery.addEventListener('change', repaint)
    const unsubscribe = subscribeTuning(repaint)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      unsubscribe()
      themeQuery.removeEventListener('change', repaint)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', remeasure)
      document.removeEventListener('pointerleave', onLeave)
      base.remove()
      live.remove()
    }
  }, [reduced])

  // Both canvases are created by the effect, so the server and the first client
  // render agree on an empty div and hydration has nothing to reconcile.
  return <div className="hero-dots" ref={host} aria-hidden="true" />
}

