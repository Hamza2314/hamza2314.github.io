import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Scene from './components/Scene'
import Magnetic from './components/Magnetic'
import { profile, projects, experience, education, skills, languages } from './data'

gsap.registerPlugin(ScrollTrigger)

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
]

/** The one deliberate entrance on the page: the name rises once, on load. */
function SplitHeading({ text, className }: { text: string; className?: string }) {
  return (
    <h1 className={className}>
      {text.split(' ').map((word, i) => (
        <span className="word" key={i}>
          <span className="word-inner" style={{ transitionDelay: `${i * 70}ms` }}>
            {word}
          </span>
        </span>
      ))}
    </h1>
  )
}

export default function App() {
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let lenis: Lenis | null = null
    let raf = 0

    if (!reduced) {
      lenis = new Lenis({ duration: 1.05, smoothWheel: true })
      const loop = (time: number) => {
        lenis?.raf(time)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      lenis.on('scroll', ScrollTrigger.update)
    }

    const ctx = gsap.context(() => {
      document.body.classList.add('ready')

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
      lenis?.destroy()
    }
  }, [])

  return (
    <div ref={root}>
      <Scene />

      <nav className="rail" aria-label="Sections">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>
            {s.label}
          </a>
        ))}
      </nav>

      <div className="shell">
        <header className="hero" id="top">
          <SplitHeading text={profile.name} className="hero-name" />
          <p className="hero-role">{profile.role}</p>
          <p className="hero-intro">{profile.intro}</p>
          <nav className="hero-actions" aria-label="Primary">
            <Magnetic href={profile.links.cv} download>
              Download CV
            </Magnetic>
            <a href={profile.links.github}>GitHub</a>
            <a href={profile.links.linkedin}>LinkedIn</a>
          </nav>
        </header>

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
