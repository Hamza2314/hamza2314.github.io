import { useRef, type ReactNode } from 'react'

export default function Magnetic({
  href,
  children,
  download,
}: {
  href: string
  children: ReactNode
  download?: boolean
}) {
  const wrap = useRef<HTMLSpanElement>(null)
  const inner = useRef<HTMLAnchorElement>(null)

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const move = (e: React.MouseEvent) => {
    if (reduced || !wrap.current || !inner.current) return
    const r = wrap.current.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    inner.current.style.transition = 'transform .1s linear'
    inner.current.style.transform = `translate(${dx * 0.3}px, ${dy * 0.35}px)`
  }

  const leave = () => {
    if (!inner.current) return
    inner.current.style.transition = 'transform .55s cubic-bezier(.22,1.3,.36,1)'
    inner.current.style.transform = 'translate(0,0)'
  }

  return (
    <span className="magnetic" ref={wrap} onMouseMove={move} onMouseLeave={leave}>
      <a
        ref={inner}
        className="magnetic-hit"
        href={href}
        {...(download ? { download: '' } : { target: '_blank', rel: 'noreferrer' })}
      >
        {children}
      </a>
    </span>
  )
}
