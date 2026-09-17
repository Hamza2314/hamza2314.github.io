import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Scene from './components/Scene'
import Magnetic from './components/Magnetic'
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

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
]

/**
 * Two crops of the same portrait: `hero` runs to the waistcoat for the
 * side-by-side desktop layout, `hero-t` is head and shoulders for the stacked
 * phone one. Cropping tighter in CSS instead would mean upscaling.
 */
const WIDE_WIDTHS = [440, 800, 1350]
const TIGHT_WIDTHS = [420, 800, 1220]

const PHONE = '(max-width: 768px)'
const WIDE_SIZES = '38vw'
const TIGHT_SIZES = '76vw'

const srcSet = (name: string, widths: number[], ext: string) =>
  widths.map((w) => `/${name}-${w}.${ext} ${w}w`).join(', ')

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
        <div className="hero-glow" ref={glow} aria-hidden="true" />

        <div className="hero-figure" ref={figure}>
          <picture className="hero-photo">
            <source
              media={PHONE}
              type="image/avif"
              srcSet={srcSet('hero-t', TIGHT_WIDTHS, 'avif')}
              sizes={TIGHT_SIZES}
            />
            <source
              media={PHONE}
              type="image/webp"
              srcSet={srcSet('hero-t', TIGHT_WIDTHS, 'webp')}
              sizes={TIGHT_SIZES}
            />
            <source
              type="image/avif"
              srcSet={srcSet('hero', WIDE_WIDTHS, 'avif')}
              sizes={WIDE_SIZES}
            />
            <source
              type="image/webp"
              srcSet={srcSet('hero', WIDE_WIDTHS, 'webp')}
              sizes={WIDE_SIZES}
            />
            <img
              src="/hero-800.webp"
              alt={`${heroName}, ${heroRole}, in a light grey three-piece suit`}
              width={1350}
              height={2150}
              decoding="async"
              fetchPriority="high"
            />
          </picture>
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
      </header>

      <div className="shell">
        <section className="band" id="about">
          <h2 className="band-label">About</h2>
          <div className="band-body prose">
            {profile.about.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section className="band" id="work">
          <h2 className="band-label">Selected work</h2>
          <div className="band-body">
            <ol className="projects">
              {projects.map((p, i) => (
                <li className="project" key={p.title} data-project={i}>
                  <div className="project-head">
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
            </ol>
          </div>
        </section>

        <section className="band" id="experience">
          <h2 className="band-label">Experience</h2>
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
                    <p>{e.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band" id="education">
          <h2 className="band-label">Education</h2>
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
          <h2 className="band-label">Skills</h2>
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
          <h2 className="band-label">Contact</h2>
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
