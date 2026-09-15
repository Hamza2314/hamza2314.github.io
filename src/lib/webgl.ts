/**
 * One-shot probe for a usable WebGL context.
 *
 * This can legitimately return false on a perfectly healthy machine: locked-down
 * corporate browsers and some remote-desktop sessions disable WebGL outright,
 * and that is exactly the audience this site is aimed at. A false here is a
 * normal branch, not an error path.
 */
export function hasWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  try {
    const probe = document.createElement('canvas')
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl')
    if (!gl) return false

    // Hand the context back straight away. Browsers cap how many live contexts
    // a page may hold, and we only wanted to know whether one was possible.
    const lose = gl.getExtension('WEBGL_lose_context')
    if (lose) lose.loseContext()

    return true
  } catch {
    return false
  }
}
