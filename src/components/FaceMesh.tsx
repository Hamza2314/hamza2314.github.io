import { useEffect, useRef } from 'react'

type Pt = { x: number; y: number; z: number; w: number }

const SAMPLE_STEP = 4
const MAX_POINTS = 2600
const LINK_RADIUS = 13

function buildFromImage(img: HTMLImageElement): Pt[] {
  const size = 200
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []

  const scale = Math.min(size / img.width, size / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)

  const { data } = ctx.getImageData(0, 0, size, size)
  const pts: Pt[] = []

  for (let y = 0; y < size; y += SAMPLE_STEP) {
    for (let x = 0; x < size; x += SAMPLE_STEP) {
      const i = (y * size + x) * 4
      if (data[i + 3] < 24) continue
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255
      const weight = 1 - lum
      if (weight < 0.28) continue
      pts.push({
        x: (x - size / 2) / (size / 2),
        y: (y - size / 2) / (size / 2),
        z: (weight - 0.5) * 0.85,
        w: weight,
      })
    }
  }

  if (pts.length <= MAX_POINTS) return pts
  const stride = pts.length / MAX_POINTS
  const out: Pt[] = []
  for (let i = 0; i < MAX_POINTS; i++) out.push(pts[Math.floor(i * stride)])
  return out
}

function buildFallback(): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < 1800; i++) {
    const u = Math.random()
    const v = Math.random()
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)
    const r = 0.62 + Math.sin(phi * 3) * 0.04
    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.cos(phi) * 1.18 - 0.05
    const z = r * Math.sin(phi) * Math.sin(theta) * 0.8
    pts.push({ x, y, z, w: 0.45 + Math.abs(z) * 0.5 })
  }
  return pts
}

export default function FaceMesh({ src }: { src?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ptsRef = useRef<Pt[]>([])
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const prog = useRef(0)

  useEffect(() => {
    let cancelled = false
    if (!src) {
      ptsRef.current = buildFallback()
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!cancelled) ptsRef.current = buildFromImage(img)
    }
    img.onerror = () => {
      if (!cancelled) ptsRef.current = buildFallback()
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let dpr = 1
    let raf = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = rect.width
      h = rect.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      prog.current = max > 0 ? Math.min(window.scrollY / max, 1) : 0
    }

    const onMove = (e: MouseEvent) => {
      mouse.current.tx = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.current.ty = (e.clientY / window.innerHeight - 0.5) * 2
    }

    resize()
    onScroll()
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onScroll, { passive: true })
    if (!reduced) window.addEventListener('mousemove', onMove, { passive: true })

    const ink = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--mesh').trim() || '#2b2e33'

    const render = () => {
      const pts = ptsRef.current
      ctx.clearRect(0, 0, w, h)
      if (!pts.length) {
        raf = requestAnimationFrame(render)
        return
      }

      mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.06
      mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.06

      const p = prog.current
      const turn = (1 - p) * 1.15 - 0.15 + mouse.current.x * 0.22
      const tilt = mouse.current.y * 0.14
      const scatter = Math.pow(1 - p, 2.2) * 0.42
      const scale = Math.min(w, h) * 0.42
      const cx = w / 2
      const cy = h / 2

      const cosY = Math.cos(turn)
      const sinY = Math.sin(turn)
      const cosX = Math.cos(tilt)
      const sinX = Math.sin(tilt)

      const proj: { x: number; y: number; d: number; w: number }[] = []
      const stroke = ink()

      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i]
        const off = scatter * (Math.sin(i * 12.9898) * 0.5 + Math.sin(i * 4.1414) * 0.5)
        const px = pt.x + off
        const py = pt.y + off * 0.6
        const pz = pt.z + off * 0.8

        const x1 = px * cosY + pz * sinY
        const z1 = pz * cosY - px * sinY
        const y2 = py * cosX - z1 * sinX
        const z2 = z1 * cosX + py * sinX

        const persp = 1 / (1.9 - z2 * 0.55)
        proj.push({
          x: cx + x1 * scale * persp * 1.9,
          y: cy + y2 * scale * persp * 1.9,
          d: z2,
          w: pt.w,
        })
      }

      ctx.strokeStyle = stroke
      ctx.lineWidth = 0.5
      ctx.globalAlpha = 0.18 + p * 0.22
      ctx.beginPath()
      for (let i = 0; i < proj.length; i += 2) {
        const a = proj[i]
        for (let j = i + 1; j < Math.min(i + 14, proj.length); j++) {
          const b = proj[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          if (dx * dx + dy * dy < LINK_RADIUS * LINK_RADIUS) {
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
          }
        }
      }
      ctx.stroke()

      ctx.globalAlpha = 1
      ctx.fillStyle = stroke
      for (let i = 0; i < proj.length; i++) {
        const q = proj[i]
        const depth = (q.d + 1) / 2
        ctx.globalAlpha = (0.2 + depth * 0.55) * (0.45 + p * 0.55) * q.w
        const r = 0.5 + depth * 0.9
        ctx.beginPath()
        ctx.arc(q.x, q.y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      raf = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="mesh-canvas" aria-hidden="true" />
}
