import { Canvas } from '@react-three/fiber'

/**
 * The one and only module that pulls in three.js and R3F.
 *
 * Everything WebGL hangs off this file so that Vite can split it into its own
 * chunk. Nothing in the initial page graph may import from `src/three/`.
 */

export type StageProps = {
  /** Reduced motion: one static frame, no autorotation, no parallax. */
  reduced: boolean
  /** False when the canvas is scrolled away; the loop freezes rather than idling. */
  visible: boolean
  /** Context loss is unrecoverable here; the page falls back to static. */
  onContextLost: () => void
}

export default function Stage({ reduced, visible, onContextLost }: StageProps) {
  // 'demand'  draws once on mount and then only when something calls invalidate()
  // 'never'   freezes entirely while off-screen
  // 'always'  the normal scroll-driven case
  const frameloop = reduced ? 'demand' : visible ? 'always' : 'never'

  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={frameloop}
      camera={{ position: [0, 0, 3.2], fov: 42 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          'webglcontextlost',
          (event) => {
            // Without preventDefault the browser will not even try to restore,
            // but we do not attempt a restore: a lost context mid-scroll is rare
            // and the static page is a perfectly good outcome.
            event.preventDefault()
            onContextLost()
          },
          { once: true },
        )
      }}
    >
      {/* Scene content arrives in step 4. */}
    </Canvas>
  )
}
