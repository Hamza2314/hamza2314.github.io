import { useEffect, useRef } from 'react'
import { Color, Group, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { loadFaceCloud } from './sampleFace'
import { createFaceCloud } from './faceCloud'
import { createProjectDeck } from './projects'
import type { FrameContext, SceneItem } from './types'

/**
 * The one and only module that pulls in three.js.
 *
 * Everything WebGL hangs off this file so Vite can split it into its own chunk.
 * Nothing in the initial page graph may import from `src/three/`.
 */

export type StageProps = {
  /** Reduced motion: one static frame, no drift, no parallax, no loop at all. */
  reduced: boolean
  /** False when the canvas is scrolled away. */
  visible: boolean
  /** Context loss is not recovered from; the page falls back to static. */
  onContextLost: () => void
}

/** Phones get a thinner cloud. Measured against a 4x CPU throttle. */
const MAX_POINTS_MOBILE = 1100
const MAX_POINTS_DESKTOP = 2600
const MOBILE_QUERY = '(max-width: 700px)'

type LoopControls = { start: () => void; stop: () => void }

/** Point colour comes from CSS so the scene follows the theme for free. */
function readMeshColor(): Color {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--mesh')
    .trim()
  return new Color(raw || '#2b2e33')
}

export default function Stage({ reduced, visible, onContextLost }: StageProps) {
  const host = useRef<HTMLDivElement>(null)
  const controls = useRef<LoopControls | null>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return

    let disposed = false
    const items: SceneItem[] = []
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      // Creating a context can throw outright on blocklisted drivers.
      onContextLost()
      return
    }

    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(el.clientWidth, el.clientHeight, false)
    el.appendChild(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0, 3.2)

    const isMobile = window.matchMedia(MOBILE_QUERY).matches

    const ctx: FrameContext = {
      progress: 0,
      time: 0,
      delta: 0,
      mouseX: 0,
      mouseY: 0,
      pixelRatio,
      reduced,
      projects: [],
      activeProject: -1,
      projectPresence: 0,
    }

    function draw() {
      for (const item of items) item.update(ctx)
      renderer.render(scene, camera)
    }

    /** The single resolved frame shown under reduced motion. */
    function drawStatic() {
      ctx.progress = 1
      ctx.time = 0
      ctx.mouseX = 0
      ctx.mouseY = 0
      ctx.reduced = true
      draw()
    }

    // --- loop ---------------------------------------------------------------
    // Two independent reasons to hold still: the canvas is scrolled out of
    // view, or the tab is in the background. Either one cancels the rAF
    // outright rather than running a no-op frame.
    let raf = 0
    let running = false
    let last = performance.now()

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      ctx.delta = Math.min((now - last) / 1000, 0.1)
      last = now
      ctx.time += ctx.delta
      ctx.reduced = false
      draw()
    }

    const start = () => {
      if (running || disposed || reduced || document.hidden) return
      running = true
      last = performance.now() // avoid a jumped delta after a pause
      raf = requestAnimationFrame(loop)
    }

    const stop = () => {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    controls.current = { start, stop }

    const onVisibility = () => {
      if (document.hidden) stop()
      else if (visible) start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // --- context loss -------------------------------------------------------
    const onLost = (event: Event) => {
      event.preventDefault()
      stop()
      onContextLost()
    }
    renderer.domElement.addEventListener('webglcontextlost', onLost, { once: true })

    // --- sizing -------------------------------------------------------------
    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      // Repaint immediately: under reduced motion nothing else ever will.
      draw()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    // --- scroll -------------------------------------------------------------
    // Project elements are looked up once; their rects are cheap to re-read and
    // are only measured while at least one is near the viewport.
    const projectEls: HTMLElement[] = isMobile
      ? []
      : Array.from(document.querySelectorAll<HTMLElement>('[data-project]'))

    ctx.projects = new Array<number>(projectEls.length).fill(0)

    const measureScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      ctx.progress = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0

      const mid = window.innerHeight / 2
      let best = -1
      let bestDist = Infinity
      let presence = 0

      for (let i = 0; i < projectEls.length; i++) {
        const r = projectEls[i].getBoundingClientRect()

        // 0 as the element's top reaches the bottom of the viewport,
        // 1 as its bottom clears the top.
        const span = r.height + window.innerHeight
        const travelled = window.innerHeight - r.top
        ctx.projects[i] = Math.min(Math.max(travelled / span, 0), 1)

        const centre = r.top + r.height / 2
        const dist = Math.abs(centre - mid)

        // Only claim the slot while the element genuinely overlaps the viewport.
        if (r.bottom > 0 && r.top < window.innerHeight && dist < bestDist) {
          bestDist = dist
          best = i
          presence = Math.max(presence, 1 - Math.min(dist / window.innerHeight, 1))
        }
      }

      ctx.activeProject = best
      ctx.projectPresence = presence
    }
    measureScroll()
    if (!reduced) {
      window.addEventListener('scroll', measureScroll, { passive: true })
    }
    window.addEventListener('resize', measureScroll, { passive: true })

    // --- pointer ------------------------------------------------------------
    const onMove = (e: PointerEvent) => {
      ctx.mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      ctx.mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    if (!reduced) window.addEventListener('pointermove', onMove, { passive: true })

    // --- theme --------------------------------------------------------------
    // The material holds this exact Color instance, so copying into it is
    // enough to retheme without rebuilding anything.
    const meshColor = readMeshColor()
    const themeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onTheme = () => {
      meshColor.copy(readMeshColor())
      draw()
    }
    themeQuery.addEventListener('change', onTheme)

    // --- content ------------------------------------------------------------
    const maxPoints = isMobile ? MAX_POINTS_MOBILE : MAX_POINTS_DESKTOP

    // Project objects are a desktop-only feature: phones keep the face alone.
    if (!isMobile && projectEls.length) {
      const deck = createProjectDeck(meshColor, new Group())
      items.push(deck)
      scene.add(deck.object)
    }

    loadFaceCloud('/face.jpg', maxPoints).then((cloud) => {
      if (disposed) return

      const face = createFaceCloud(cloud, meshColor)
      items.push(face)
      scene.add(face.object)

      if (reduced) drawStatic()
      else if (visible) start()
      else draw() // one frame so the scene is not blank if it starts off-screen
    })

    if (reduced) drawStatic()

    return () => {
      disposed = true
      stop()
      controls.current = null

      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      themeQuery.removeEventListener('change', onTheme)
      window.removeEventListener('scroll', measureScroll)
      window.removeEventListener('resize', measureScroll)
      window.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('webglcontextlost', onLost)

      for (const item of items) {
        scene.remove(item.object)
        item.dispose()
      }
      renderer.dispose()
      renderer.domElement.remove()
    }
    // `visible` is handled by the effect below so the scene is not rebuilt
    // every time it scrolls in and out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, onContextLost])

  useEffect(() => {
    if (visible) controls.current?.start()
    else controls.current?.stop()
  }, [visible])

  return <div className="scene-gl" ref={host} />
}
