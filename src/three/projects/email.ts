import { BufferAttribute, BufferGeometry, Color, Group, Points } from 'three'
import { makePointMaterial } from '../materials'
import type { FrameContext, SceneItem } from '../types'

/**
 * German-language email manager: classification by semantic content.
 *
 * A disordered cloud of particles sorts itself into four separated clusters as
 * the section scrolls. Unsorted in, sorted out.
 */

const PARTICLES = 420
const CLUSTERS = 4

/** Cluster centres, spread wide enough to read as distinct groups. */
const CENTRES: [number, number, number][] = [
  [-0.78, 0.46, 0],
  [0.78, 0.46, -0.2],
  [-0.78, -0.5, -0.2],
  [0.78, -0.5, 0],
]

export function createEmail(color: Color): SceneItem {
  const group = new Group()

  const positions = new Float32Array(PARTICLES * 3)
  const alpha = new Float32Array(PARTICLES)

  // Start scattered, end in a cluster. Both endpoints are fixed per particle so
  // the sort is deterministic and reverses cleanly when scrolling back up.
  const scattered = new Float32Array(PARTICLES * 3)
  const sorted = new Float32Array(PARTICLES * 3)
  const assigned = new Uint8Array(PARTICLES)
  const lag = new Float32Array(PARTICLES)

  for (let i = 0; i < PARTICLES; i++) {
    scattered[i * 3] = (Math.random() - 0.5) * 2.3
    scattered[i * 3 + 1] = (Math.random() - 0.5) * 1.8
    scattered[i * 3 + 2] = (Math.random() - 0.5) * 1.1

    const c = i % CLUSTERS
    assigned[i] = c

    // Tight gaussian-ish blob around the cluster centre.
    const spread = 0.26
    sorted[i * 3] = CENTRES[c][0] + (Math.random() - 0.5) * spread
    sorted[i * 3 + 1] = CENTRES[c][1] + (Math.random() - 0.5) * spread
    sorted[i * 3 + 2] = CENTRES[c][2] + (Math.random() - 0.5) * spread

    lag[i] = Math.random() * 0.4
    alpha[i] = 0.4 + Math.random() * 0.5
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  geo.setAttribute('aAlpha', new BufferAttribute(alpha, 1))

  const mat = makePointMaterial(color, 3.8)
  group.add(new Points(geo, mat))

  return {
    object: group,

    update(ctx: FrameContext) {
      const p = ctx.projects[4] ?? 0
      mat.uniforms.uPixelRatio.value = ctx.pixelRatio

      for (let i = 0; i < PARTICLES; i++) {
        // Staggered arrival: particles do not snap into place together.
        const local = Math.min(Math.max((p - lag[i]) / (1 - lag[i]), 0), 1)
        const eased = local * local * (3 - 2 * local)

        const drift = ctx.reduced ? 0 : Math.sin(ctx.time * 0.6 + i) * 0.014 * (1 - eased)

        for (let a = 0; a < 3; a++) {
          const from = scattered[i * 3 + a]
          const to = sorted[i * 3 + a]
          positions[i * 3 + a] = from + (to - from) * eased + (a === 1 ? drift : 0)
        }
      }

      geo.attributes.position.needsUpdate = true

      if (!ctx.reduced) group.rotation.y = ctx.mouseX * 0.16
    },

    dispose() {
      geo.dispose()
      mat.dispose()
    },
  }
}
