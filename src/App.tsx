import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Scene from './components/Scene'
import Magnetic from './components/Magnetic'
import ParticleField from './components/ParticleField'
import HeroBeam from './components/HeroBeam'
import Stream from './components/Stream'
import ScratchPortrait from './components/ScratchPortrait'
import {
  getServerTuning,
  getTuning,
  hydrateTuning,
  subscribe as subscribeTuning,
} from './lib/heroTuning'
import { profile, projects, experience, education, skills, languages } from './data'

// Design panel. Its own chunk, and only ever requested with ?tune in the URL,
// so it costs an ordinary visitor nothing.
const HeroTuner = lazy(() => import('./components/HeroTuner'))

gsap.registerPlugin(ScrollTrigger)

/** Marks that the bands have already generated once in this tab. */
const STREAM_KEY = 'bands-streamed'

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
]

/** Words rise from a clipped mask. The stagger is driven by GSAP, not CSS. */
function SplitHeading({ text, className }: { text: string; className?: string }) {
  return (
    <h1 className={className}>
      {text.split(' ').map((word, i) => (
        <span className="word" key={i}>
          <span className="word-inner">{word}</span>
        </span>
      ))}
    </h1>
  )
}

export default function App() {
  const root = useRef<HTMLDivElement>(null)
  const hero = useRef<HTMLElement>(null)
  const figure = useRef<HTMLDivElement>(null)
  const glow = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string>('')

  // Stored tuning is applied after mount, never during render, so the
  // prerendered markup and the first client render always agree.
  const tuning = useSyncExternalStore(subscribeTuning, getTuning, getServerTuning)
  const [tunerOn, setTunerOn] = useState(false)

  useEffect(() => {
    hydrateTuning()
    setTunerOn(new URLSearchParams(window.location.search).has('tune'))
  }, [])

  const heroName = tuning.name.trim() || profile.name
  const heroRole = tuning.role.trim() || profile.role
  const heroIntro = tuning.intro.trim() || profile.intro

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(max-width: 768px)').matches
    let lenis: Lenis | null = null
    let raf = 0

    // Damped cursor drift for the hero glow. Targets are written by the
    // pointer handler; the loop eases toward them so the light never snaps.
    let gx = 0
    let gy = 0
    let tgx = 0
    let tgy = 0

    const onPointer = (e: PointerEvent) => {
      tgx = (e.clientX / window.innerWidth - 0.5) * 2
      tgy = (e.clientY / window.innerHeight - 0.5) * 2
    }

    // No cursor on a phone, and reduced motion means the light holds still.
    const drifts = !reduced && !coarse
    if (drifts) window.addEventListener('pointermove', onPointer, { passive: true })

    if (!reduced) {
      lenis = new Lenis({ duration: 1.05, smoothWheel: true })
      const loop = (time: number) => {
        lenis?.raf(time)

        if (drifts && glow.current) {
          gx += (tgx - gx) * 0.06
          gy += (tgy - gy) * 0.06
          // Travel is a share of the viewport, tunable, default 4%.
          const reach = getTuning().glowDrift
          glow.current.style.setProperty('--gx', `${(gx * reach).toFixed(3)}vw`)
          glow.current.style.setProperty('--gy', `${(gy * reach).toFixed(3)}vh`)
        }

        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      lenis.on('scroll', ScrollTrigger.update)
    }

    const ctx = gsap.context(() => {
      if (!reduced && getTuning().entrance) {
        // One orchestrated moment. The subject arrives first, the name
        // overlaps it, and the supporting copy follows as a single group.
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .fromTo(
            '.hero-photo',
            { opacity: 0, y: 26 },
            { opacity: 1, y: 0, duration: 0.9 },
            0,
          )
          // y:0 is load-bearing. The anti-flash CSS start state is a
          // translateY(105%), which GSAP parses into its pixel y channel on
          // first touch; animating yPercent alone then leaves those pixels in
          // place and the words finish exactly where they started, clipped by
          // .word's overflow. Pinning y keeps the percentage the only mover.
          .fromTo(
            '.hero-name .word-inner',
            { yPercent: 105, y: 0 },
            { yPercent: 0, y: 0, duration: 0.9, stagger: 0.07 },
            0.18,
          )
          .fromTo(
            '.hero-reveal',
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 },
            0.5,
          )
      } else if (!reduced) {
        // Entrance switched off in the panel: land everything at its end state
        // so the CSS start states do not leave the hero half-hidden.
        gsap.set('.hero-photo', { opacity: 1, y: 0 })
        gsap.set('.hero-name .word-inner', { yPercent: 0, y: 0 })
        gsap.set('.hero-reveal', { opacity: 1, y: 0 })
      }

      if (!reduced) {
        // Scroll. One value drives all of it, scrubbed, never pinned.
        const range = { trigger: hero.current, start: 'top top', end: 'bottom top' }

        gsap.to(figure.current, {
          // Read live so the panel's parallax slider takes effect on refresh.
          y: () => window.innerHeight * getTuning().parallax,
          scale: 1.05,
          ease: 'none',
          scrollTrigger: { ...range, scrub: true, invalidateOnRefresh: true },
        })

        gsap.to('.hero-text', {
          opacity: 0,
          ease: 'none',
          scrollTrigger: { ...range, start: '60% top', scrub: true },
        })

        gsap.to(glow.current, {
          opacity: 0,
          ease: 'none',
          scrollTrigger: { ...range, scrub: true },
        })
      }

      // --- band streaming ---
      // Each band generates itself when it is first scrolled to. The words are
      // already in the DOM; all that moves is opacity and which word the caret
      // is sitting after.
      const blocks = Array.from(root.current?.querySelectorAll('.stream') ?? [])

      // Once per tab, so a visitor reading back up the page is not made to wait
      // again. `?tune` opts out of that, because iterating on an effect you can
      // only see once per session is miserable.
      const tuning = new URLSearchParams(window.location.search).has('tune')
      const alreadyRan = !tuning && sessionStorage.getItem(STREAM_KEY) === '1'

      if (reduced || alreadyRan || !getTuning().streamOn) {
        for (const block of blocks) {
          for (const word of block.querySelectorAll('.stream-w')) {
            word.classList.add('is-on')
          }
        }
      } else {
        // Blocks sharing a [data-stream] ancestor generate one after another,
        // so there is only ever one caret on screen. Without this the three
        // About paragraphs run in parallel and the page appears to have three
        // cursors, which is not what streaming looks like.
        const groups = new Map<Element, Element[]>()
        for (const block of blocks) {
          const key = block.closest('[data-stream]') ?? block
          const list = groups.get(key)
          if (list) list.push(block)
          else groups.set(key, [block])
        }

        for (const [key, list] of groups) {
          ScrollTrigger.create({
            trigger: key,
            start: 'top 88%',
            once: true,
            onEnter: () => {
              const speed = getTuning().streamSpeed
              const tl = gsap.timeline()

              for (const block of list) {
                const words = Array.from(block.querySelectorAll<HTMLElement>('.stream-w'))
                if (!words.length) continue

                // One tween of a counter rather than one tween per word: a long
                // band is a couple of hundred words, and they only ever need a
                // class adding in order.
                const state = { i: 0 }
                let shown = 0
                let caret: HTMLElement | null = null

                tl.to(
                  state,
                  {
                    i: words.length,
                    duration: words.length / speed,
                    ease: 'none',
                    onUpdate: () => {
                      const upTo = Math.min(words.length, Math.floor(state.i) + 1)
                      while (shown < upTo) words[shown++].classList.add('is-on')

                      const head = words[shown - 1]
                      if (head && head !== caret) {
                        caret?.classList.remove('is-cursor')
                        head.classList.add('is-cursor')
                        caret = head
                      }
                    },
                    onComplete: () => {
                      for (const word of words) word.classList.add('is-on')
                      caret?.classList.remove('is-cursor')
                    },
                  },
                  // A beat between blocks, which is what reads as a paragraph
                  // break rather than one long run of text.
                  '>0.14',
                )
              }
            },
          })
        }

        try {
          sessionStorage.setItem(STREAM_KEY, '1')
        } catch {
          // Private mode. The effect simply plays on every load.
        }
      }

      // ScrollTrigger drives the rail's current-section state. It is
      // wayfinding, not decoration, which is why it survives reduced motion
      // while the old blanket fade-and-rise on every section did not.
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id)
        if (!el) continue

        ScrollTrigger.create({
          trigger: el,
          start: 'top 45%',
          end: 'bottom 45%',
          onToggle: (self) => {
            if (self.isActive) setActive(id)
          },
        })
      }
    }, root)

    return () => {
      ctx.revert()
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      lenis?.destroy()
    }
  }, [])

  return (
    <div ref={root}>
      <Scene />

      {tunerOn && (
        <Suspense fallback={null}>
          <HeroTuner />
        </Suspense>
      )}

      <nav className="rail" aria-label="Sections">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>
            {s.label}
          </a>
        ))}
      </nav>

      <header className="hero" id="top" ref={hero}>
        <ParticleField />
        <div className="hero-glow" ref={glow} aria-hidden="true" />
        <HeroBeam />

        <div className="hero-inner">
          <div className="hero-figure" ref={figure}>
            {/* Numbered stand-ins are in public/ for now, so the alt text
                describes those and not a portrait that is not there. Put the
                name back when `npm run build:circle` replaces them. */}
            <ScratchPortrait alt="Portrait placeholder" />
          </div>

          <div className="hero-text">
            <SplitHeading text={heroName} className="hero-name" />
            <p className="hero-role hero-reveal">{heroRole}</p>
            <p className="hero-intro hero-reveal">{heroIntro}</p>
            <nav className="hero-actions hero-reveal" aria-label="Primary">
              <Magnetic href={profile.links.cv} download>
                Download CV
              </Magnetic>
              <a href={profile.links.github}>GitHub</a>
              <a href={profile.links.linkedin}>LinkedIn</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="shell">
        <section className="band" id="about">
          <h2 className="band-label">
            <Stream text="About" />
          </h2>
          {/* data-stream chains these paragraphs into one sequence, so the
              caret moves through them in order rather than three at once. */}
          <div className="band-body prose" data-stream>
            {profile.about.map((p, i) => (
              <p key={i}>
                <Stream text={p} />
              </p>
            ))}
          </div>
        </section>

        <section className="band" id="work">
          <h2 className="band-label">
            <Stream text="Selected work" />
          </h2>
          <div className="band-body">
            <ol className="projects">
              {projects.map((p, i) => (
                <li className="project" key={p.title} data-project={i}>
                  <div className="project-head">
                    <h3>{p.title}</h3>
                    <span className="project-status">{p.status}</span>
                  </div>
                  <p>
                    <Stream text={p.body} />
                  </p>
                  <ul className="stack">
                    {p.stack.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band" id="experience">
          <h2 className="band-label">
            <Stream text="Experience" />
          </h2>
          <div className="band-body">
            <ol className="timeline">
              {experience.map((e) => (
                <li key={e.period + e.role}>
                  <span className="period">{e.period}</span>
                  <div>
                    <h3>
                      {e.role}
                      <span className="org">{e.org}</span>
                    </h3>
                    <p>
                      <Stream text={e.body} />
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band" id="education">
          <h2 className="band-label">
            <Stream text="Education" />
          </h2>
          <div className="band-body">
            <ol className="timeline">
              {education.map((e) => (
                <li key={e.title}>
                  <span className="period">{e.period}</span>
                  <div>
                    <h3>
                      {e.title}
                      <span className="org">{e.org}</span>
                    </h3>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band" id="skills">
          <h2 className="band-label">
            <Stream text="Skills" />
          </h2>
          <div className="band-body">
            {skills.map((g) => (
              <div className="skill-group" key={g.group}>
                <h3>{g.group}</h3>
                <ul className="stack">
                  {g.items.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="skill-group">
              <h3>Languages</h3>
              <ul className="stack">
                {languages.map((l) => (
                  <li key={l.name}>
                    {l.name} <span className="lvl">{l.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="band contact" id="contact">
          <h2 className="band-label">
            <Stream text="Contact" />
          </h2>
          <div className="band-body">
            <a className="mail" href={`mailto:${profile.links.email}`}>
              {profile.links.email}
            </a>
            <nav className="hero-actions" aria-label="Contact links">
              <Magnetic href={profile.links.cv} download>
                Download CV
              </Magnetic>
              <a href={profile.links.github}>GitHub</a>
              <a href={profile.links.linkedin}>LinkedIn</a>
            </nav>
            <p className="loc">{profile.location}</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
