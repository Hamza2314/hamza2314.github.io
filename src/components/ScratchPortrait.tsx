import { useEffect, useRef, useState } from 'react'
import { getTuning } from '../lib/heroTuning'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * The portrait, as a scratch card.
 *
 * One photo sits on top of the next. Rubbing the circle wears holes in the top
 * one and the next shows through, so a half-scratched circle is genuinely half
 * of each. Stop moving and the rest of the top photo dissolves on its own, at
 * which point the deck advances and the circle is scratchable again. That swap
 * happens on the frame where the top layer is already fully gone, so it changes
 * no pixels and there is nothing to see.
 *
 * Composition per frame, all of it at 200-odd pixels square:
 *
 *   1  the incoming photo, whole
 *   2  the outgoing photo on an offscreen layer, with the brush mask punched
 *      out of it (`destination-out`) and then the veil taken off what is left
 *   3  that layer over the top, and the brush ring if the cursor is in
 *
 * The <img> underneath is the real portrait: it is what the prerendered HTML
 * ships, what loads without JavaScript, and what stands in under reduced
 * motion. The canvas only ever covers it.
 */

/** Built by scripts/build-circle-photos.mjs, aligned head-to-head. */
const PHOTOS = ['circle-1', 'circle-2', 'circle-3']
const WIDTHS = [200, 400, 600]

/** Below this the mask is empty enough that there is nothing to resolve. */
const SCRATCH_FLOOR = 0.015

/**
 * The circle's shipped sizes, as a plain source-size list. It cannot be driven
 * by the tuning var the CSS uses, because `sizes` is parsed by the preload
 * scanner long before any custom property has a value.
 */
const SIZES = '(max-width: 768px) 150px, 200px'

const srcSet = (name: string, ext: string) =>
  WIDTHS.map((w) => `/${name}-${w}.${ext} ${w}w`).join(', ')

/** Device-pixel source for the canvas: the smallest derivative that covers it. */
function pick(name: string, cssSize: number, dpr: number) {
  const needed = cssSize * dpr
  const width = WIDTHS.find((w) => w >= needed) ?? WIDTHS[WIDTHS.length - 1]
  return `/${name}-${width}.webp`
}

export default function ScratchPortrait({ alt }: { alt: string }) {
  const host = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  // Client-only, and mounted a render late, so the prerendered markup and the
  // first client render both contain the <img> alone.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const el = canvas.current
    const box = host.current
    if (!el || !box || reduced) return

    const ctx = el.getContext('2d')
    if (!ctx) return

    // The holes rubbed in the top photo, and the offscreen the top photo is
    // assembled on. Keeping the veil separate from the mask is what makes the
    // resolve exact: painting flat white into the mask over and over only ever
    // approaches opaque, while one `destination-out` fill at alpha 1 removes
    // the layer completely.
    const mask = document.createElement('canvas')
    const layer = document.createElement('canvas')
    const maskCtx = mask.getContext('2d')
    const layerCtx = layer.getContext('2d')
    if (!maskCtx || !layerCtx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let size = 0

    const images: (HTMLImageElement | null)[] = PHOTOS.map(() => null)
    let top = 0
    let veil = 0
    let resolving = false

    // Roughly how much of the circle has been rubbed away, accumulated as
    // strokes are laid down rather than read back off the mask: sampling pixels
    // every frame to answer "is anything scratched yet" would cost more than
    // the whole effect. Only ever compared against a threshold.
    let scratched = 0

    let hovering = false
    let bx = 0
    let by = 0
    let lastX = -1
    let lastY = -1
    let idle = 0

    const after = (i: number) => (i + 1) % PHOTOS.length

    // --- painting ------------------------------------------------------------
    const draw = () => {
      const under = images[after(top)]
      const over = images[top]
      if (!under || !over) return

      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(under, 0, 0, size, size)

      layerCtx.globalCompositeOperation = 'source-over'
      layerCtx.globalAlpha = 1
      layerCtx.clearRect(0, 0, size, size)
      layerCtx.drawImage(over, 0, 0, size, size)

      // Punch the rubbed holes, then take the veil off everything still there.
      layerCtx.globalCompositeOperation = 'destination-out'
      layerCtx.drawImage(mask, 0, 0)
      if (veil > 0) {
        layerCtx.globalAlpha = veil
        layerCtx.fillStyle = '#fff'
        layerCtx.fillRect(0, 0, size, size)
        layerCtx.globalAlpha = 1
      }
      layerCtx.globalCompositeOperation = 'source-over'

      ctx.drawImage(layer, 0, 0)

      if (hovering) ring()
    }

    /** The brush, drawn as its own outline. The cursor is the tool here. */
    const ring = () => {
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = Math.max(1, dpr)
      ctx.beginPath()
      ctx.arc(bx, by, getTuning().brushSize * dpr, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    /**
     * Lay a soft dab into the mask. Feathered rather than hard-edged, so the
     * boundary between the two photos is a gradient and the eye reads it as
     * worn rather than cut.
     */
    const dab = (x: number, y: number) => {
      const r = getTuning().brushSize * dpr
      const g = maskCtx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(255, 255, 255, 1)')
      g.addColorStop(0.55, 'rgba(255, 255, 255, 0.92)')
      g.addColorStop(1, 'rgba(255, 255, 255, 0)')

      maskCtx.fillStyle = g
      maskCtx.beginPath()
      maskCtx.arc(x, y, r, 0, Math.PI * 2)
      maskCtx.fill()

      scratched = Math.min(1, scratched + (r * r * 4) / (size * size))
    }

    /** Dabs along the segment since the last event, so fast drags stay solid. */
    const stroke = (x: number, y: number) => {
      const r = getTuning().brushSize * dpr

      if (lastX >= 0) {
        const dx = x - lastX
        const dy = y - lastY
        const steps = Math.floor(Math.hypot(dx, dy) / (r * 0.4))
        for (let i = 1; i <= steps; i++) {
          dab(lastX + (dx * i) / steps, lastY + (dy * i) / steps)
        }
      }

      dab(x, y)
      lastX = x
      lastY = y
    }

    // --- loop ----------------------------------------------------------------
    // Runs while the cursor is in the circle or a resolve is under way, and
    // stops the moment neither is true.
    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1)
      last = now

      if (resolving) {
        veil += delta / getTuning().resolveTime
        if (veil >= 1) {
          // The top layer is fully gone, so the circle is already showing the
          // photo underneath. Promoting it and wiping the mask paints exactly
          // the same pixels, which is why the deck can advance mid-frame.
          top = after(top)
          veil = 0
          resolving = false
          scratched = 0
          maskCtx.clearRect(0, 0, size, size)
        }
      }

      draw()

      if (!hovering && !resolving) {
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

    // --- resolve -------------------------------------------------------------
    const startResolve = () => {
      if (resolving || scratched < SCRATCH_FLOOR) return
      resolving = true
      wake()
    }

    /** Restarted on every movement over the circle, and on the way out. */
    const armIdle = () => {
      window.clearTimeout(idle)
      if (scratched < SCRATCH_FLOOR) return
      idle = window.setTimeout(startResolve, getTuning().idleDelay * 1000)
    }

    // --- input ---------------------------------------------------------------
    const local = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      return [(e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr] as const
    }

    const onEnter = (e: PointerEvent) => {
      // A touch has no hover to speak of; tapping advances the deck instead.
      if (e.pointerType === 'touch') return
      const [x, y] = local(e)
      hovering = true
      bx = x
      by = y
      lastX = -1
      lastY = -1
      wake()
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !hovering) return
      const [x, y] = local(e)
      bx = x
      by = y
      stroke(x, y)
      armIdle()
      wake()
    }

    const onLeave = () => {
      hovering = false
      lastX = -1
      lastY = -1
      // One last frame to take the brush ring off, then the loop may stop.
      wake()
      armIdle()
    }

    const onClick = () => {
      // The obvious gesture on a phone, and a shortcut past the wait on a
      // desktop. Either way it runs the same dissolve.
      if (scratched < SCRATCH_FLOOR) scratched = 1
      window.clearTimeout(idle)
      startResolve()
    }

    box.addEventListener('pointerenter', onEnter)
    box.addEventListener('pointermove', onMove)
    box.addEventListener('pointerleave', onLeave)
    box.addEventListener('click', onClick)

    // --- sizing --------------------------------------------------------------
    // Everything is square, and every buffer is the same square, so one number
    // describes the lot.
    const resize = () => {
      const side = Math.round(box.clientWidth * dpr)
      if (!side || side === size) return

      size = side
      for (const c of [el, mask, layer]) {
        c.width = size
        c.height = size
      }
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(box)

    // --- sources -------------------------------------------------------------
    // The first photo is already in the document and decoded, so its currentSrc
    // is reused rather than picking a URL again and risking a second fetch of
    // the same bytes at a different width.
    let disposed = false
    const cssSize = box.clientWidth || 200

    PHOTOS.forEach((name, i) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        if (disposed) return
        images[i] = img
        // The pair on screen is the top photo and the one behind it; a third
        // still loading changes nothing yet.
        if (i === top || i === after(top)) draw()
      }
      img.src =
        i === 0 && image.current?.currentSrc
          ? image.current.currentSrc
          : pick(name, cssSize, dpr)
    })

    resize()

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      window.clearTimeout(idle)
      ro.disconnect()
      box.removeEventListener('pointerenter', onEnter)
      box.removeEventListener('pointermove', onMove)
      box.removeEventListener('pointerleave', onLeave)
      box.removeEventListener('click', onClick)
    }
  }, [mounted, reduced])

  return (
    <div className="portrait hero-photo" ref={host}>
      <picture>
        <source type="image/avif" srcSet={srcSet(PHOTOS[0], 'avif')} sizes={SIZES} />
        <img
          ref={image}
          className="portrait-img"
          src={`/${PHOTOS[0]}-400.webp`}
          srcSet={srcSet(PHOTOS[0], 'webp')}
          sizes={SIZES}
          alt={alt}
          width={400}
          height={400}
          decoding="async"
          fetchPriority="high"
        />
      </picture>

      {mounted && !reduced && (
        <canvas className="portrait-canvas" ref={canvas} aria-hidden="true" />
      )}
    </div>
  )
}
