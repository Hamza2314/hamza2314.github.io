import type Lenis from 'lenis'

/**
 * The page's one smooth scroller, made reachable outside App.
 *
 * Absent under reduced motion, and before App's effect has run, so every caller
 * has to cope with null and fall back to the native window scroll.
 */
let instance: Lenis | null = null

export const setLenis = (lenis: Lenis | null) => {
  instance = lenis
}

export const getLenis = () => instance

/** Holds the page still behind an overlay, and lets it go again. */
export function lockScroll(locked: boolean) {
  document.documentElement.classList.toggle('is-scroll-locked', locked)
  if (locked) instance?.stop()
  else instance?.start()
}
