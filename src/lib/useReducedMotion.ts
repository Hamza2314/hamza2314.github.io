import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Tracks the OS-level reduced-motion setting, and keeps tracking it: the user
 * can flip this mid-session and the scene is expected to go still immediately.
 *
 * The lazy initialiser returns false when there is no window, so this is safe
 * to call during the build-time prerender.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const sync = () => setReduced(mq.matches)

    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return reduced
}
