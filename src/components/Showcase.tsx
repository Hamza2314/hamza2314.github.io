import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { Project } from '../data'
import Lightbox from './Lightbox'
import { ArrowLeft, ArrowRight, Expand } from './icons'

/** How the neighbours either side sit: smaller, quieter, out of focus. */
const SIDE_SCALE = 0.84
const SIDE_OPACITY = 0.3
/** In px. Shapes still read; the text deliberately does not. */
const SIDE_BLUR = 6
/** Air between the current project and each neighbour. */
const GAP = 40
/** Seconds for one project to glide into place. */
const TRAVEL = 1.05

/** Fired on the window whenever the slides move. src/three/Stage.tsx listens. */
const SHOWCASE_MOVE = 'showcase:move'

const pad = (n: number) => String(n).padStart(2, '0')
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/**
 * Projects, one at a time: the current one centred in front, its neighbours
 * either side smaller, dimmed and blurred, dissolving into the screen edges.
 * Stepping forward brings the right one to the centre and sends the current
 * one left, where it stays in view as the new neighbour.
 *
 * The arrow buttons step it, a click on a neighbour brings that one forward,
 * and the arrow keys work with the showcase focused. Scrolling, anywhere,
 * always moves the page.
 *
 * Two modes, one markup:
 *
 *   native   A phone, or no script. A snapping horizontal row, photo above
 *            card. This is what the prerendered HTML is.
 *   stage    A wide screen. Slides are absolutely placed and every position,
 *            scale, opacity and blur is computed from one fractional index,
 *            which glides between whole numbers (or jumps, under reduced
 *            motion).
 *
 * Positions are written to the DOM directly, not through React state: they
 * change on every animation frame.
 */
export default function Showcase({ label, projects }: { label: string; projects: Project[] }) {
  const root = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const now = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)

  const prev = useRef<HTMLButtonElement>(null)
  const next = useRef<HTMLButtonElement>(null)

  /** Brings project `i` to the front. Replaced by whichever mode is active. */
  const goTo = useRef<(i: number) => void>(() => {})
  /** One project back or forward. Replaced by whichever mode is active. */
  const step = useRef<(dir: 1 | -1) => void>(() => {})
  const current = useRef(0)

  const [gallery, setGallery] = useState<number | null>(null)
  const total = projects.length

  useEffect(() => {
    const rootEl = root.current
    const viewportEl = viewport.current
    const stageEl = stage.current
    if (!rootEl || !viewportEl || !stageEl) return

    const slides = Array.from(stageEl.querySelectorAll<HTMLElement>('.slide'))
    const steps = Math.max(slides.length - 1, 1)
    const geo = { mainX: 0, prevX: 0, nextX: 0, farLeftX: 0, farRightX: 0 }
    let pos = 0

    const markCurrent = (i: number, force = false) => {
      if (!force && i === current.current && slides[i]?.dataset.current) return
      current.current = i
      const staged = rootEl.classList.contains('is-stage')
      slides.forEach((s, k) => {
        const on = k === i
        s.classList.toggle('is-current', on)
        // On the stage a neighbour is clicked as a whole, never tabbed into:
        // its controls leave the tab order, and the buttons above cover the
        // keyboard. Not inert, which would swallow the click as well.
        for (const c of s.querySelectorAll<HTMLElement>('button, a')) {
          if (staged && !on) c.tabIndex = -1
          else c.removeAttribute('tabindex')
        }
        // Read by the 3D stage, which shows the current project's object.
        if (on) s.dataset.current = 'true'
        else delete s.dataset.current
      })
      if (now.current) now.current.textContent = pad(i + 1)
    }

    const setBar = (p: number) => {
      if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`
      rootEl.style.setProperty('--progress', p.toFixed(4))
    }

    // aria-disabled rather than disabled: a disabled button drops keyboard
    // focus to the page the moment the last press lands on it.
    const setEnds = (i: number) => {
      prev.current?.setAttribute('aria-disabled', String(i <= 0))
      next.current?.setAttribute('aria-disabled', String(i >= slides.length - 1))
    }

    // --- stage geometry ---
    // Read off the first slide, so every size stays in CSS where it belongs.
    const measure = () => {
      const first = slides[0]
      const media = first?.querySelector<HTMLElement>('.slide-media')
      if (!first || !media) return

      const vw = viewportEl.clientWidth
      const w = first.offsetWidth
      const side = w * SIDE_SCALE

      // Current dead centre, a neighbour either side at the same distance.
      // Slides scale from their left edge, so the one on the left is placed by
      // where its scaled right edge has to land.
      geo.mainX = (vw - w) / 2
      geo.prevX = geo.mainX - GAP - side
      geo.nextX = geo.mainX + w + GAP
      geo.farLeftX = geo.prevX - side - GAP
      geo.farRightX = geo.nextX + side + GAP
    }

    /** Lays every slide out for fractional index `f`. */
    const place = (f: number) => {
      pos = f
      const { mainX, prevX, nextX, farLeftX, farRightX } = geo

      for (let i = 0; i < slides.length; i++) {
        // Signed distance from the front: negative to the left, positive to
        // the right. Both sides are the same journey, mirrored.
        const d = i - f
        const a = Math.abs(d)
        const near = d < 0 ? prevX : nextX
        const far = d < 0 ? farLeftX : farRightX

        let x: number
        let s: number
        let o: number
        let b: number

        if (a <= 1) {
          // Front, or on its way to being a neighbour.
          x = lerp(mainX, near, a)
          s = lerp(1, SIDE_SCALE, a)
          o = lerp(1, SIDE_OPACITY, a)
          b = lerp(0, SIDE_BLUR, a)
        } else if (a <= 2) {
          // A neighbour, on its way off screen.
          x = lerp(near, far, a - 1)
          s = SIDE_SCALE
          o = lerp(SIDE_OPACITY, 0, a - 1)
          b = SIDE_BLUR
        } else {
          x = far
          s = SIDE_SCALE
          o = 0
          b = SIDE_BLUR
        }

        const el = slides[i]
        el.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scale(${s.toFixed(4)})`
        el.style.opacity = o.toFixed(3)
        // No filter at all on the front slide: a zero blur still costs a
        // compositing layer, and would soften text on some GPUs.
        el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none'
        el.style.zIndex = String(100 - Math.round(a * 10))
        el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
      }

      markCurrent(clamp(Math.round(f), 0, slides.length - 1))
      // The 3D stage otherwise only re-reads project positions on page scroll,
      // and this moves them without one.
      window.dispatchEvent(new Event(SHOWCASE_MOVE))
    }

    const clearStage = () => {
      for (const el of slides) {
        el.style.removeProperty('transform')
        el.style.removeProperty('opacity')
        el.style.removeProperty('z-index')
        el.style.removeProperty('visibility')
        el.style.removeProperty('filter')
        for (const c of el.querySelectorAll<HTMLElement>('button, a')) c.removeAttribute('tabindex')
      }
    }

    // --- native mode ---
    // The row's own scroll. Silent in stage mode, where the row is clipped.
    const nativeIndex = () => {
      const first = slides[0]
      const second = slides[1]
      if (!first) return 0
      const pitch = second ? second.offsetLeft - first.offsetLeft : first.offsetWidth
      return clamp(Math.round(viewportEl.scrollLeft / pitch), 0, slides.length - 1)
    }
    const onNativeScroll = () => {
      if (rootEl.classList.contains('is-stage')) return
      const max = viewportEl.scrollWidth - viewportEl.clientWidth
      setBar(max > 0 ? viewportEl.scrollLeft / max : 0)
      markCurrent(nativeIndex())
      setEnds(nativeIndex())
    }
    viewportEl.addEventListener('scroll', onNativeScroll, { passive: true })

    const mm = gsap.matchMedia()
    mm.add(
      { wide: '(min-width: 769px)', motion: '(prefers-reduced-motion: no-preference)' },
      (context) => {
        const { wide, motion } = context.conditions as { wide: boolean; motion: boolean }

        if (!wide) {
          step.current = (dir) => {
            const target = slides[clamp(nativeIndex() + dir, 0, slides.length - 1)]
            const first = slides[0]
            if (!target || !first) return
            viewportEl.scrollTo({
              left: target.offsetLeft - first.offsetLeft,
              behavior: motion ? 'smooth' : 'auto',
            })
          }
          onNativeScroll()
          return
        }

        rootEl.classList.add('is-stage')
        viewportEl.scrollLeft = 0
        measure()

        const ro = new ResizeObserver(() => {
          measure()
          place(pos)
        })
        ro.observe(viewportEl)

        // One tweened value, the fractional index, and everything follows it.
        const state = { f: pos }
        let target = Math.round(pos)
        let tween: gsap.core.Tween | null = null

        const render = () => {
          place(state.f)
          setBar(state.f / steps)
        }

        goTo.current = (i) => {
          const wanted = clamp(i, 0, steps)
          if (wanted === target) return
          target = wanted
          setEnds(target)
          tween?.kill()
          if (!motion) {
            state.f = target
            render()
            return
          }
          tween = gsap.to(state, {
            f: target,
            duration: TRAVEL,
            ease: 'power3.out',
            onUpdate: render,
          })
        }
        // Counted from where the slides are heading, not where they are, so a
        // second press mid-glide carries on to the next project.
        step.current = (dir) => goTo.current(target + dir)
        render()
        // Entering the stage with the same project current: the early return
        // in markCurrent would otherwise skip taking the neighbours out of
        // the tab order.
        markCurrent(current.current, true)
        setEnds(target)

        return () => {
          ro.disconnect()
          tween?.kill()
          rootEl.classList.remove('is-stage')
          clearStage()
        }
      },
    )

    return () => {
      mm.revert()
      viewportEl.removeEventListener('scroll', onNativeScroll)
    }
  }, [total])

  return (
    <div className="showcase" ref={root} data-axis="x">
      <div className="showcase-head" data-rise>
        <p className="showcase-count" aria-hidden="true">
          <span className="showcase-count-now" ref={now}>
            01
          </span>
          <span className="showcase-count-sep">/</span>
          <span>{pad(total)}</span>
        </p>
        <div className="showcase-progress" aria-hidden="true">
          <span ref={bar} />
        </div>

        <div className="showcase-nav">
          <button
            type="button"
            ref={prev}
            aria-label="Previous project"
            aria-disabled="true"
            onClick={() => step.current(-1)}
          >
            <ArrowLeft />
          </button>
          <button
            type="button"
            ref={next}
            aria-label="Next project"
            aria-disabled={total < 2}
            onClick={() => step.current(1)}
          >
            <ArrowRight />
          </button>
        </div>
      </div>

      <div
        className="showcase-viewport"
        ref={viewport}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        data-rise
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            step.current(1)
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            step.current(-1)
          }
        }}
      >
        <div className="showcase-stage" ref={stage}>
          {projects.map((p, i) => (
            <article
              className={i === 0 ? 'slide is-current' : 'slide'}
              key={p.slug}
              data-project={i}
              data-current={i === 0 ? 'true' : undefined}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${total}: ${p.title}`}
              // On the stage a neighbour is a preview: a click anywhere on it
              // brings it to the front, rather than acting on what is inside.
              onClickCapture={(e) => {
                if (root.current?.classList.contains('is-stage') && current.current !== i) {
                  e.preventDefault()
                  e.stopPropagation()
                  goTo.current(i)
                }
              }}
            >
              <div className="slide-card">
                <p className="slide-kicker">
                  <span className="slide-num">{pad(i + 1)}</span>
                  {p.status}
                </p>
                <h3 className="slide-title">{p.title}</h3>
                <p className="slide-body">{p.body}</p>
                <ul className="slide-tags">
                  {p.stack.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <button type="button" className="slide-more" onClick={() => setGallery(i)}>
                  View screenshots
                  <span className="slide-more-count">{p.shots.length}</span>
                </button>
              </div>

              <button
                type="button"
                className="slide-media"
                aria-label={`Open ${p.title} screenshots`}
                onClick={() => setGallery(i)}
              >
                <img
                  src={p.shots[0]?.src}
                  alt=""
                  width={1600}
                  height={1000}
                  loading={i < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                <span className="slide-media-badge" aria-hidden="true">
                  <Expand />
                  {p.shots.length} {p.shots.length === 1 ? 'image' : 'images'}
                </span>
              </button>
            </article>
          ))}
        </div>
      </div>

      <Lightbox
        project={gallery === null ? null : projects[gallery]}
        start={0}
        onClose={() => setGallery(null)}
      />
    </div>
  )
}
