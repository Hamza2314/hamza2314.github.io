import type { Object3D } from 'three'

/** Per-frame state handed to every scene item. Built once, mutated in place. */
export type FrameContext = {
  /** Normalised page scroll, 0 at the top, 1 at the bottom. */
  progress: number
  /** Seconds since the scene started. */
  time: number
  /** Seconds since the previous frame. */
  delta: number
  /** Pointer position, -1..1 on each axis, origin at viewport centre. */
  mouseX: number
  mouseY: number
  /** Clamped device pixel ratio, for point sizing. */
  pixelRatio: number
  /** Reduced motion: hold still, ignore pointer. */
  reduced: boolean

  /**
   * Per-project progress, 0 as the section enters the viewport and 1 as it
   * leaves. Index-aligned with `projects` in src/data.ts. Empty on mobile,
   * where project objects are not built at all.
   */
  projects: number[]
  /** Index of the project nearest the viewport centre, or -1 for none. */
  activeProject: number
  /** How strongly any project object is on screen, 0..1. Fades the face back. */
  projectPresence: number
}

/**
 * Anything the stage can hold. Kept deliberately small so project objects and
 * the face share one lifecycle and the stage does not care which is which.
 */
export type SceneItem = {
  object: Object3D
  update: (ctx: FrameContext) => void
  dispose: () => void
}
