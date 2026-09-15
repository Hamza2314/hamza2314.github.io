import type { Color, Object3D } from 'three'
import type { FrameContext, SceneItem } from '../types'
import { createExcessus } from './excessus'
import { createPhantom } from './phantom'
import { createGeoSearch } from './geosearch'
import { createPipeline } from './pipeline'
import { createEmail } from './email'

/**
 * One 3D object per project, index-aligned with `projects` in src/data.ts.
 *
 * Only the object nearest the viewport centre is visible and updated; the rest
 * are hidden, which takes them out of the draw call entirely.
 */

type Factory = (color: Color) => SceneItem

// Index-aligned with `projects` in src/data.ts.
const FACTORIES: Factory[] = [
  createExcessus,
  createPhantom,
  createGeoSearch,
  createPipeline,
  createEmail,
]

export function createProjectItems(color: Color): SceneItem[] {
  return FACTORIES.map((make) => make(color))
}

/**
 * Wraps the per-project items so the stage handles them as one thing: it
 * cross-fades presence and skips work for everything off-screen.
 */
export function createProjectDeck(color: Color, host: Object3D): SceneItem {
  const items = createProjectItems(color)
  const presence = new Array<number>(items.length).fill(0)

  for (const item of items) {
    item.object.visible = false
    host.add(item.object)
  }

  return {
    object: host,

    update(ctx: FrameContext) {
      for (let i = 0; i < items.length; i++) {
        const target = ctx.activeProject === i ? 1 : 0
        presence[i] += (target - presence[i]) * (ctx.reduced ? 1 : 0.09)

        const visible = presence[i] > 0.01
        items[i].object.visible = visible
        if (!visible) continue

        items[i].update(ctx)
        setOpacity(items[i], presence[i])
      }
    },

    dispose() {
      for (const item of items) {
        host.remove(item.object)
        item.dispose()
      }
    },
  }
}

/** Walks the item's materials and sets the shared uOpacity uniform. */
function setOpacity(item: SceneItem, value: number) {
  item.object.traverse((child) => {
    const mat = (child as { material?: { uniforms?: Record<string, { value: unknown }> } })
      .material
    if (mat?.uniforms?.uOpacity) mat.uniforms.uOpacity.value = value
  })
}
