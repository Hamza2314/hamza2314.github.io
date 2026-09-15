import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { hasWebGL } from '../lib/webgl'
import { useReducedMotion } from '../lib/useReducedMotion'

// The three.js chunk. Nothing above this line touches WebGL, so the hero paints
// without waiting on it.
const Stage = lazy(() => import('../three/Stage'))

/**
 * Anything thrown inside the WebGL subtree takes the scene down, not the page.
 * Covers both a failed chunk load and a driver-level explosion during init.
 */
class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { dead: boolean }
> {
  state = { dead: false }

  static getDerivedStateFromError() {
    return { dead: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.dead ? null : this.props.children
  }
}

export default function Scene() {
  const host = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  // Probed once. Re-probing on every render would leak contexts.
  const [supported] = useState(hasWebGL)
  const [dead, setDead] = useState(false)

  // `armed` latches: once the canvas has been near the viewport we keep the
  // chunk loaded. `visible` keeps flipping, and drives the frameloop.
  const [armed, setArmed] = useState(false)
  const [visible, setVisible] = useState(false)

  // The scene is client-only. Rendering null on the server *and* on the first
  // client render keeps hydration matching; the canvas appears on the pass
  // after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Stable identity: Stage tears the whole renderer down when this changes.
  const kill = useCallback(() => setDead(true), [])

  useEffect(() => {
    const el = host.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
        if (entry.isIntersecting) setArmed(true)
      },
      { rootMargin: '200px 0px' },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [supported, dead])

  // No WebGL, or the context died: the page keeps its full styled layout and
  // simply has no scene in it. Never a blank screen.
  if (!mounted || !supported || dead) return null

  return (
    <div className="scene" ref={host} aria-hidden="true">
      <SceneBoundary onError={kill}>
        <Suspense fallback={null}>
          {armed && <Stage reduced={reduced} visible={visible} onContextLost={kill} />}
        </Suspense>
      </SceneBoundary>
    </div>
  )
}
