import { useEffect, useRef, useState } from 'react'
import type { Project } from '../data'
import { lockScroll } from '../lib/scroll'
import { useReducedMotion } from '../lib/useReducedMotion'
import { ArrowLeft, ArrowRight, Close } from './icons'

const pad = (n: number) => String(n).padStart(2, '0')

/** Wheel travel that counts as one deliberate step, and the pause after it. */
const WHEEL_STEP = 30
const WHEEL_COOLDOWN = 450

/**
 * A project's screenshots, full screen, one at a time.
 *
 * A native <dialog> opened modal: the browser supplies the focus trap, Escape
 * to close, focus handed back on close, and the top layer, so no transform or
 * pin on the page underneath can reach it.
 *
 * The pictures sit in a snapping horizontal strip, which gives touch and
 * trackpad swiping for free. A vertical wheel is turned into one step per
 * gesture on top of that, so a mouse can page through as well. The strip's
 * own scroll position is the single source of truth for which picture is
 * showing; buttons, keys and the wheel only ever ask it to move.
 */
export default function Lightbox({
  project,
  start,
  onClose,
}: {
  /** Null keeps the dialog closed. */
  project: Project | null
  start: number
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const reduced = useReducedMotion()

  const shots = project?.shots ?? []
  const count = shots.length

  indexRef.current = index

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (project && !d.open) {
      d.showModal()
      lockScroll(true)
      setIndex(start)
      // The strip has just been rendered at its new width; place it without a
      // glide, since the reader asked for this picture, not a tour to it.
      requestAnimationFrame(() => {
        const el = strip.current
        if (el) el.scrollLeft = start * el.clientWidth
      })
    } else if (!project && d.open) {
      d.close()
    }
  }, [project, start])

  const go = (i: number) => {
    const el = strip.current
    if (!el || !count) return
    const k = Math.min(Math.max(i, 0), count - 1)
    el.scrollTo({ left: k * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' })
    setIndex(k)
  }

  const onScroll = () => {
    const el = strip.current
    if (!el || !el.clientWidth) return
    const k = Math.round(el.scrollLeft / el.clientWidth)
    setIndex((prev) => (prev === k ? prev : k))
  }

  // Non-passive, so the vertical wheel can be claimed for paging instead of
  // leaking through to the page behind.
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    let acc = 0
    let last = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return
      e.preventDefault()
      const t = performance.now()
      if (t - last < WHEEL_COOLDOWN) return
      acc += e.deltaY
      if (Math.abs(acc) < WHEEL_STEP) return
      last = t
      const dir = acc > 0 ? 1 : -1
      acc = 0
      goRef.current(indexRef.current + dir)
    }
    d.addEventListener('wheel', onWheel, { passive: false })
    return () => d.removeEventListener('wheel', onWheel)
  }, [])

  const goRef = useRef(go)
  goRef.current = go

  const close = () => dialog.current?.close()

  return (
    <dialog
      ref={dialog}
      className="lightbox"
      aria-labelledby="lightbox-title"
      // Lenis would otherwise take the wheel for the page underneath.
      data-lenis-prevent
      onClose={() => {
        lockScroll(false)
        onClose()
      }}
      onClick={(e) => {
        // The bare frame around a picture is backdrop as far as a reader is
        // concerned, so a click there closes, as a click outside would.
        const target = e.target as HTMLElement
        if (target === e.currentTarget || target.hasAttribute('data-close')) close()
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          go(index + 1)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          go(index - 1)
        }
      }}
    >
      {project && (
        <div className="lightbox-frame">
          <header className="lightbox-bar">
            <div className="lightbox-heading">
              <p className="lightbox-kicker">Screenshots</p>
              <h2 className="lightbox-title" id="lightbox-title">
                {project.title}
              </h2>
            </div>
            <p className="lightbox-count" aria-live="polite">
              {pad(index + 1)}
              <span> / {pad(count)}</span>
            </p>
            <button type="button" className="lightbox-close" aria-label="Close" onClick={close}>
              <Close />
            </button>
          </header>

          <div className="lightbox-stage">
            <div className="lightbox-strip" ref={strip} onScroll={onScroll}>
              {shots.map((s) => (
                <figure className="lightbox-shot" key={s.src} data-close>
                  <img src={s.src} alt={s.alt} decoding="async" />
                </figure>
              ))}
            </div>

            {count > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox-arrow is-prev"
                  aria-label="Previous screenshot"
                  disabled={index === 0}
                  onClick={() => go(index - 1)}
                >
                  <ArrowLeft />
                </button>
                <button
                  type="button"
                  className="lightbox-arrow is-next"
                  aria-label="Next screenshot"
                  disabled={index === count - 1}
                  onClick={() => go(index + 1)}
                >
                  <ArrowRight />
                </button>
              </>
            )}
          </div>

          <footer className="lightbox-foot">
            {/* Keyed so each caption arrives with its own short fade. */}
            <p className="lightbox-caption" key={index}>
              {shots[index]?.caption}
            </p>
            {count > 1 && (
              <div className="lightbox-thumbs">
                {shots.map((s, i) => (
                  <button
                    type="button"
                    key={s.src}
                    className={i === index ? 'is-on' : undefined}
                    aria-label={`Screenshot ${i + 1}`}
                    aria-current={i === index ? 'true' : undefined}
                    onClick={() => go(i)}
                  >
                    <img src={s.src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </footer>
        </div>
      )}
    </dialog>
  )
}
