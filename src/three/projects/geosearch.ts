import { BufferAttribute, BufferGeometry, Color, Group, LineSegments, Points } from 'three'
import { makeLineMaterial, makePointMaterial } from '../materials'
import type { FrameContext, SceneItem } from '../types'

/**
 * AI-powered geographic search: spatial retrieval over a GIS.
 *
 * A point field on a gently curved plane, with a circular query region that
 * sweeps across it as the section scrolls. Points inside the region lift and
 * brighten: this is search over space, not over a list.
 */

const COLS = 30
const ROWS = 16
const COUNT = COLS * ROWS
const RING_SEGMENTS = 56
const QUERY_RADIUS = 0.42

/** Gentle saddle, so the plane reads as terrain rather than a flat grid. */
function surfaceY(x: number, z: number): number {
  return Math.sin(x * 1.6) * 0.075 + Math.cos(z * 1.9) * 0.06
}

export function createGeoSearch(color: Color): SceneItem {
  const group = new Group()
  group.rotation.x = -0.72 // lean the plane away from the camera

  // --- the field ---
  const positions = new Float32Array(COUNT * 3)
  const alpha = new Float32Array(COUNT)
  const home = new Float32Array(COUNT * 2) // x, z only; y is derived

  let i = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = (c / (COLS - 1) - 0.5) * 2.2
      const z = (r / (ROWS - 1) - 0.5) * 1.5
      home[i * 2] = x
      home[i * 2 + 1] = z
      positions[i * 3] = x
      positions[i * 3 + 1] = surfaceY(x, z)
      positions[i * 3 + 2] = z
      alpha[i] = 0.3
      i++
    }
  }

  const fieldGeo = new BufferGeometry()
  fieldGeo.setAttribute('position', new BufferAttribute(positions, 3))
  fieldGeo.setAttribute('aAlpha', new BufferAttribute(alpha, 1))

  const fieldMat = makePointMaterial(color, 3.4)
  group.add(new Points(fieldGeo, fieldMat))

  // --- the query region outline ---
  const ringPositions = new Float32Array(RING_SEGMENTS * 2 * 3)
  const ringAlpha = new Float32Array(RING_SEGMENTS * 2).fill(0.8)

  const ringGeo = new BufferGeometry()
  ringGeo.setAttribute('position', new BufferAttribute(ringPositions, 3))
  ringGeo.setAttribute('aAlpha', new BufferAttribute(ringAlpha, 1))

  const ringMat = makeLineMaterial(color)
  group.add(new LineSegments(ringGeo, ringMat))

  return {
    object: group,

    update(ctx: FrameContext) {
      const p = ctx.projects[2] ?? 0
      fieldMat.uniforms.uPixelRatio.value = ctx.pixelRatio

      // The query sweeps left to right across the field as you scroll.
      const qx = (p - 0.5) * 2.4
      const qz = Math.sin(p * Math.PI * 1.5) * 0.4

      for (let k = 0; k < COUNT; k++) {
        const x = home[k * 2]
        const z = home[k * 2 + 1]

        const dx = x - qx
        const dz = z - qz
        const dist = Math.sqrt(dx * dx + dz * dz)

        // 1 at the centre of the query, 0 outside it.
        const hit = Math.max(0, 1 - dist / QUERY_RADIUS)
        const lift = hit * hit * 0.3

        positions[k * 3 + 1] = surfaceY(x, z) + lift
        alpha[k] = 0.22 + hit * 0.78
      }

      fieldGeo.attributes.position.needsUpdate = true
      fieldGeo.attributes.aAlpha.needsUpdate = true

      for (let s = 0; s < RING_SEGMENTS; s++) {
        for (let v = 0; v < 2; v++) {
          const a = ((s + v) / RING_SEGMENTS) * Math.PI * 2
          const base = (s * 2 + v) * 3
          const rx = qx + Math.cos(a) * QUERY_RADIUS
          const rz = qz + Math.sin(a) * QUERY_RADIUS
          ringPositions[base] = rx
          ringPositions[base + 1] = surfaceY(rx, rz) + 0.02
          ringPositions[base + 2] = rz
        }
      }

      ringGeo.attributes.position.needsUpdate = true

      if (!ctx.reduced) group.rotation.y = ctx.mouseX * 0.1
    },

    dispose() {
      fieldGeo.dispose()
      fieldMat.dispose()
      ringGeo.dispose()
      ringMat.dispose()
    },
  }
}
