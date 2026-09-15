import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import FaceMesh from './components/FaceMesh'
import Magnetic from './components/Magnetic'
import { profile, projects, experience, education, skills, languages } from './data'

gsap.registerPlugin(ScrollTrigger)

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

      if (reduced) {
        gsap.set('.reveal', { opacity: 1, y: 0 })
        return
      }

      gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 88%' },
          },
        )
      })
    }, root)

    return () => {
      ctx.revert()
      cancelAnimationFrame(raf)
      lenis?.destroy()
    }
  }, [])

  return (
    <div ref={root}>
      <FaceMesh src="/face.jpg" />

      <div className="shell">
        <header className="hero" id="top">
          <SplitHeading text={profile.name} className="hero-name" />
          <p className="hero-role">{profile.role}</p>
          <p className="hero-intro">{profile.intro}</p>
          <nav className="hero-actions">
            <Magnetic href={profile.links.cv} download>
              Download CV
            </Magnetic>
            <a href={profile.links.github}>GitHub</a>
            <a href={profile.links.linkedin}>LinkedIn</a>
          </nav>
        </header>

        <section className="band reveal" id="about">
          <div className="band-label">About</div>
          <div className="band-body prose">
            {profile.about.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section className="band" id="work">
          <div className="band-label reveal">Selected work</div>
          <div className="band-body">
            <ol className="projects">
              {projects.map((p) => (
                <li className="project reveal" key={p.title}>
                  <div className="project-head">
                    <h2>{p.title}</h2>
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
          <div className="band-label reveal">Experience</div>
          <div className="band-body">
            <ol className="timeline">
              {experience.map((e) => (
                <li className="reveal" key={e.period + e.role}>
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
          <div className="band-label reveal">Education</div>
          <div className="band-body">
            <ol className="timeline">
              {education.map((e) => (
                <li className="reveal" key={e.title}>
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
          <div className="band-label reveal">Skills</div>
          <div className="band-body">
            {skills.map((g) => (
              <div className="skill-group reveal" key={g.group}>
                <h3>{g.group}</h3>
                <ul className="stack">
                  {g.items.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="skill-group reveal">
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
          <div className="band-label reveal">Contact</div>
          <div className="band-body reveal">
            <a className="mail" href={`mailto:${profile.links.email}`}>
              {profile.links.email}
            </a>
            <nav className="hero-actions">
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
