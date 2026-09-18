import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * The hero's background field. This file is the boundary: it decides whether
 * there should be particles at all, and everything tsParticles hangs off the
 * lazy import below so none of it reaches the initial page graph.
 *
 * Same shape as Scene: client-only, mounted a render late so the prerendered
 * markup and the first client render agree, and anything thrown inside takes
 * the field down rather than the page.
 */

const ParticleCanvas = lazy(() => import('./ParticleCanvas'))

class FieldBoundary extends Component<{ children: ReactNode }, { dead: boolean }> {
  state = { dead: false }

  static getDerivedStateFromError() {
    return { dead: true }
  }

  render() {
    return this.state.dead ? null : this.props.children
  }
}

export default function ParticleField() {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Reduced motion gets no field. The engine's own `motion.reduce` only slows
  // the drift by a factor of four, and everything else on this page stops dead
  // rather than slowing; a hero that keeps moving would be the odd one out.
  if (!mounted || reduced) return null

  return (
    <div className="hero-particles" aria-hidden="true">
      <FieldBoundary>
        <Suspense fallback={null}>
          <ParticleCanvas />
        </Suspense>
      </FieldBoundary>
    </div>
  )
}
