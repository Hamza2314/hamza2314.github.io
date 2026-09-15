import { BufferAttribute, BufferGeometry, Color, Group, LineSegments, Points } from 'three'
import { makeLineMaterial, makePointMaterial } from '../materials'
import type { FrameContext, SceneItem } from '../types'

/**
 * Multi-stage content pipeline: outline, draft, legal review, SEO, final edit.
 *
 * Five gate rings on a line. A token travels through them in order, pausing
 * and flaring at each one as that stage validates. Sequence is the whole point,
 * so the token never skips and never runs backwards.
 */

const GATES = 5
const RING_SEGMENTS = 30
const TRAIL = 14
const SPAN = 2.0

const ringVertsEach = RING_SEGMENTS * 2

/** Even spacing along x, centred on the origin. */
function gateX(i: number): number {
  return (i / (GATES - 1) - 0.5) * SPAN
}

export function createPipeline(color: Color): SceneItem {
  const group = new Group()

  // --- gate rings ---
  const ringPositions = new Float32Array(GATES * ringVertsEach * 3)
  const ringAlpha = new Float32Array(GATES * ringVertsEach)

  for (let g = 0; g < GATES; g++) {
    const x = gateX(g)
    for (let s = 0; s < RING_SEGMENTS; s++) {
      for (let v = 0; v < 2; v++) {
        const a = ((s + v) / RING_SEGMENTS) * Math.PI * 2
        const base = (g * ringVertsEach + s * 2 + v) * 3
        ringPositions[base] = x
        ringPositions[base + 1] = Math.cos(a) * 0.3
        ringPositions[base + 2] = Math.sin(a) * 0.3
      }
    }
  }

  const ringGeo = new BufferGeometry()
  ringGeo.setAttribute('position', new BufferAttribute(ringPositions, 3))
  ringGeo.setAttribute('aAlpha', new BufferAttribute(ringAlpha, 1))

  const ringMat = makeLineMaterial(color)
  group.add(new LineSegments(ringGeo, ringMat))

  // --- the travelling token, drawn as a short trail ---
  const tokenPositions = new Float32Array(TRAIL * 3)
  const tokenAlpha = new Float32Array(TRAIL)

  const tokenGeo = new BufferGeometry()
  tokenGeo.setAttribute('position', new BufferAttribute(tokenPositions, 3))
  tokenGeo.setAttribute('aAlpha', new BufferAttribute(tokenAlpha, 1))

  const tokenMat = makePointMaterial(color, 6.0)
  group.add(new Points(tokenGeo, tokenMat))

  return {
    object: group,

    update(ctx: FrameContext) {
      const p = ctx.projects[3] ?? 0
      tokenMat.uniforms.uPixelRatio.value = ctx.pixelRatio

      // Scroll walks the token across the gates. Dwell at each gate is built in
      // by quantising: the token spends part of each segment held at a ring.
      const walk = p * GATES
      const stage = Math.min(Math.floor(walk), GATES - 1)
      const within = walk - stage

      // Hold for the first 45% of each segment, then travel to the next gate.
      const travel = Math.max(0, (within - 0.45) / 0.55)
      const from = gateX(stage)
      const to = gateX(Math.min(stage + 1, GATES - 1))
      const tokenX = from + (to - from) * travel

      for (let g = 0; g < GATES; g++) {
        // A gate is lit once passed, and flares while the token sits in it.
        const passed = g < stage ? 1 : 0
        const active = g === stage ? 1 - travel : 0
        const a = 0.2 + passed * 0.35 + active * 0.65

        for (let v = 0; v < ringVertsEach; v++) {
          ringAlpha[g * ringVertsEach + v] = a * p
        }
      }
      ringGeo.attributes.aAlpha.needsUpdate = true

      for (let t = 0; t < TRAIL; t++) {
        // Trail lags behind the head along x only; it reads as motion blur.
        const lag = t * 0.018
        tokenPositions[t * 3] = tokenX - lag * (travel > 0 ? 1 : 0)
        tokenPositions[t * 3 + 1] = 0
        tokenPositions[t * 3 + 2] = 0
        tokenAlpha[t] = (1 - t / TRAIL) * p
      }

      tokenGeo.attributes.position.needsUpdate = true
      tokenGeo.attributes.aAlpha.needsUpdate = true

      group.rotation.y = ctx.reduced ? -0.5 : -0.5 + ctx.mouseX * 0.12
      group.rotation.x = ctx.reduced ? 0.12 : 0.12 + ctx.mouseY * 0.06
    },

    dispose() {
      ringGeo.dispose()
      ringMat.dispose()
      tokenGeo.dispose()
      tokenMat.dispose()
    },
  }
}
