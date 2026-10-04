import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Scene from './components/Scene'
import Magnetic from './components/Magnetic'
import ParticleField from './components/ParticleField'
import HeroBeam from './components/HeroBeam'
import Stream from './components/Stream'
import Panel from './components/Panel'
import ScratchPortrait from './components/ScratchPortrait'
import {
  getServerTuning,
  getTuning,
  hydrateTuning,
  subscribe as subscribeTuning,
} from './lib/heroTuning'
import { profile, projects, employment, education, skills, languages } from './data'

// Design panel. Its own chunk, and only ever requested with ?tune in the URL,
// so it costs an ordinary visitor nothing.
const HeroTuner = lazy(() => import('./components/HeroTuner'))

gsap.registerPlugin(ScrollTrigger)

/** Marks that the bands have already generated once in this tab. */
const STREAM_KEY = 'bands-streamed'

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

      // --- panel arrival ---
      // Every panel arrives the same way and that is the whole point of it:
      // the label generates word by word with a caret, then the panel's
      // contents rise in a stagger. Six panels, one gesture.
      //
      // Nothing is injected. The words are already in the DOM, so all that
      // moves here is opacity and which word the caret is sitting after.
      const panels = Array.from(root.current?.querySelectorAll<HTMLElement>('.panel') ?? [])

      const land = (panel: HTMLElement) => {
        for (const word of panel.querySelectorAll('.stream-w')) word.classList.add('is-on')
        gsap.set(panel.querySelectorAll('[data-rise]'), { opacity: 1, y: 0 })
      }

      // Once per tab, so a visitor reading back up the page is not made to wait
      // again. `?tune` opts out of that, because iterating on an effect you can
      // only see once per session is miserable.
      const tuning = new URLSearchParams(window.location.search).has('tune')
      const alreadyRan = !tuning && sessionStorage.getItem(STREAM_KEY) === '1'

      if (reduced || alreadyRan || !getTuning().streamOn) {
        panels.forEach(land)
      } else {
        for (const panel of panels) {
          ScrollTrigger.create({
            trigger: panel,
            start: 'top 72%',
            once: true,
            onEnter: () => {
              const speed = getTuning().streamSpeed
              const tl = gsap.timeline()

              // Streams run in DOM order, one after another, so there is only
              // ever one caret on screen. Running them together reads as a page
              // with several cursors, which is not what streaming looks like.
              for (const block of panel.querySelectorAll('.stream')) {
                const words = Array.from(block.querySelectorAll<HTMLElement>('.stream-w'))
                if (!words.length) continue

                // One tween of a counter rather than one tween per word: the
                // words only ever need a class adding, in order.
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
                  '>0.1',
                )
              }

              const rises = panel.querySelectorAll('[data-rise]')
              if (rises.length) {
                tl.fromTo(
                  rises,
                  { opacity: 0, y: 20 },
                  { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' },
                  // Overlapping the tail of the label keeps the panel from
                  // arriving in two visibly separate halves.
                  '>-0.18',
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
        {/* The lead paragraph generates; the rest rises with everything else,
            because four paragraphs of streaming is a reader kept waiting. */}
        <Panel id="about" index={1} label="About">
          <div className="about-grid">
            <p className="about-lead">
              <Stream text={profile.about[0]} />
            </p>
            <div className="about-rest">
              {profile.about.slice(1).map((p, i) => (
                <p key={i} data-rise>
                  {p}
                </p>
              ))}
            </div>
          </div>
        </Panel>

        <Panel id="projects" index={2} label="Projects">
          <ol className="cells cells-3">
            {projects.map((p, i) => (
              <li className="cell" key={p.title} data-project={i} data-rise>
                <div className="cell-head">
                  <h3>{p.title}</h3>
                  <span className="project-status">{p.status}</span>
                </div>
                <p>{p.body}</p>
                <ul className="stack">
                  {p.stack.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </li>
            ))}

            {/* Five projects in a three-column grid leaves a hole. This fills
                it with the work that was only ever a list of nouns anyway. */}
            <li className="cell cell-quiet" data-rise>
              <p>
                Also: MediaWiki extensions in PHP and JavaScript, WordPress and React
                builds for small businesses, and competitive programming in Python, C#,
                and Java.
              </p>
            </li>
          </ol>
        </Panel>

        <Panel id="experience" index={3} label="Experience">
          <div className="employers">
            {employment.map((emp) => (
              <section className="employer" key={emp.org}>
                <header className="employer-head" data-rise>
                  <h3 className="employer-name">{emp.org}</h3>
                  <span className="period">{emp.period}</span>
                </header>

                {emp.meta && (
                  <p className="employer-meta" data-rise>
                    {emp.meta}
                  </p>
                )}

                <ol className="roles">
                  {emp.roles.map((r) => (
                    <li className="role" key={r.title} data-rise>
                      <div className="role-head">
                        <h4 className="role-title">{r.title}</h4>
                        {/* A lone role spanning the whole engagement would
                            print the same dates twice, once in the header and
                            once here. */}
                        {r.period !== emp.period && (
                          <span className="period role-period">{r.period}</span>
                        )}
                      </div>
                      <p>{r.body}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </Panel>

        <Panel id="education" index={4} label="Education">
          <ol className="cells cells-2">
            {education.map((e) => (
              <li className="cell" key={e.title} data-rise>
                <p className="cell-key">{e.period}</p>
                <h3>{e.title}</h3>
                {/* Grade above the place, and tied to it: one stack with its
                    own tight gap, so the cell's own spacing does not push the
                    two apart. */}
                <div className="edu-meta">
                  {e.grade && <p className="edu-grade">{e.grade}</p>}
                  <span className="org">{e.org}</span>
                </div>
                {e.body && <p>{e.body}</p>}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel id="skills" index={5} label="Skills">
          <ol className="cells cells-3">
            {skills.map((g) => (
              <li className="cell" key={g.group} data-rise>
                <h3>{g.group}</h3>
                <ul className="stack">
                  {g.items.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </li>
            ))}
            <li className="cell" data-rise>
              <h3>Languages</h3>
              <ul className="stack">
                {languages.map((l) => (
                  <li key={l.name}>
                    {l.name} <span className="lvl">{l.level}</span>
                  </li>
                ))}
              </ul>
            </li>
          </ol>
        </Panel>

        <Panel id="contact" index={6} label="Contact">
          <a className="mail" href={`mailto:${profile.links.email}`} data-rise>
            {profile.links.email}
          </a>
          <nav className="hero-actions" aria-label="Contact links" data-rise>
            <Magnetic href={profile.links.cv} download>
              Download CV
            </Magnetic>
            <a href={profile.links.github}>GitHub</a>
            <a href={profile.links.linkedin}>LinkedIn</a>
          </nav>
          <p className="loc" data-rise>
            {profile.location}
          </p>
        </Panel>
      </div>
    </div>
  )
}
