import { BufferAttribute, BufferGeometry, Color, Group, LineSegments, Points } from 'three'
import { makeLineMaterial, makePointMaterial } from '../materials'
import type { FrameContext, SceneItem } from '../types'

/**
 * Excessus: a retrieval pipeline over legal source material.
 *
 * Scattered document rectangles are drawn inward to a single dense node as the
 * section scrolls through. Many sources, one structured answer.
 */

const DOCS = 26
const VERTS_PER_DOC = 8 // four segments of a rectangle outline
const NODE_POINTS = 110

/** Writes one rectangle outline as four line segments. */
function writeRect(
  out: Float32Array,
  base: number,
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  angle: number,
) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const corners = [
    [-w, -h],
    [w, -h],
    [w, h],
    [-w, h],
  ]

  for (let s = 0; s < 4; s++) {
    const a = corners[s]
    const b = corners[(s + 1) % 4]

    for (const [px, py] of [a, b]) {
      out[base++] = cx + px * cos - py * sin
      out[base++] = cy + px * sin + py * cos
      out[base++] = cz
    }
  }
}

export function createExcessus(color: Color): SceneItem {
  const group = new Group()

  // --- documents ---
  const docPositions = new Float32Array(DOCS * VERTS_PER_DOC * 3)
  const docAlpha = new Float32Array(DOCS * VERTS_PER_DOC)

  const scatter = Array.from({ length: DOCS }, () => {
    const theta = Math.random() * Math.PI * 2
    const radius = 0.95 + Math.random() * 0.55
    return {
      x: Math.cos(theta) * radius,
      y: (Math.random() - 0.5) * 1.7,
      z: Math.sin(theta) * radius * 0.6,
      angle: (Math.random() - 0.5) * 1.1,
      lag: Math.random() * 0.35, // staggers arrival so they do not land as one
    }
  })

  const docGeo = new BufferGeometry()
  docGeo.setAttribute('position', new BufferAttribute(docPositions, 3))
  docGeo.setAttribute('aAlpha', new BufferAttribute(docAlpha, 1))

  const docMat = makeLineMaterial(color)
  const docs = new LineSegments(docGeo, docMat)
  group.add(docs)

  // --- central node ---
  const nodePositions = new Float32Array(NODE_POINTS * 3)
  const nodeAlpha = new Float32Array(NODE_POINTS)

  for (let i = 0; i < NODE_POINTS; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = Math.cbrt(Math.random()) * 0.17
    nodePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    nodePositions[i * 3 + 1] = r * Math.cos(phi)
    nodePositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    nodeAlpha[i] = 0.5 + Math.random() * 0.5
  }

  const nodeGeo = new BufferGeometry()
  nodeGeo.setAttribute('position', new BufferAttribute(nodePositions, 3))
  nodeGeo.setAttribute('aAlpha', new BufferAttribute(nodeAlpha, 1))

  const nodeMat = makePointMaterial(color, 4.2)
  const node = new Points(nodeGeo, nodeMat)
  group.add(node)

  return {
    object: group,

    update(ctx: FrameContext) {
      const p = ctx.projects[0] ?? 0
      nodeMat.uniforms.uPixelRatio.value = ctx.pixelRatio

      for (let i = 0; i < DOCS; i++) {
        const s = scatter[i]

        // Each document starts converging slightly later than the last.
        const local = Math.min(Math.max((p - s.lag) / (1 - s.lag), 0), 1)
        const eased = local * local * (3 - 2 * local) // smoothstep

        const cx = s.x * (1 - eased)
        const cy = s.y * (1 - eased)
        const cz = s.z * (1 - eased)
        const size = 0.17 * (1 - eased * 0.78)

        // A little idle drift while still scattered, none once arrived.
        const wobble = ctx.reduced ? 0 : Math.sin(ctx.time * 0.5 + i) * 0.02 * (1 - eased)

        writeRect(
          docPositions,
          i * VERTS_PER_DOC * 3,
          cx,
          cy + wobble,
          cz,
          size * 0.76,
          size,
          s.angle * (1 - eased),
        )

        // Fade out as they merge, so the node reads as the result.
        const a = 0.75 * (1 - eased * 0.85)
        for (let v = 0; v < VERTS_PER_DOC; v++) docAlpha[i * VERTS_PER_DOC + v] = a
      }

      docGeo.attributes.position.needsUpdate = true
      docGeo.attributes.aAlpha.needsUpdate = true

      node.scale.setScalar(0.65 + p * 0.5)
      if (!ctx.reduced) group.rotation.y = ctx.mouseX * 0.12
    },

    dispose() {
      docGeo.dispose()
      docMat.dispose()
      nodeGeo.dispose()
      nodeMat.dispose()
    },
  }
}
