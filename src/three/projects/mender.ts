import { BufferAttribute, BufferGeometry, Color, Group, LineSegments, Points } from 'three'
import { makeLineMaterial, makePointMaterial } from '../materials'
import type { FrameContext, SceneItem } from '../types'

/**
 * Mender: browser automation whose selectors repair themselves.
 *
 * A lattice whose edges snap and reform continuously. Nothing ever settles,
 * but the structure never falls apart either: it degrades visibly and heals.
 */

const NODES = 24
const LINKS_PER_NODE = 2
const BREAK_SPEED = 0.17

type Edge = { a: number; b: number; offset: number }

export function createMender(color: Color): SceneItem {
  const group = new Group()

  // --- nodes on a rough shell ---
  const nodeHome = new Float32Array(NODES * 3)
  for (let i = 0; i < NODES; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 0.72 + Math.random() * 0.22
    nodeHome[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    nodeHome[i * 3 + 1] = r * Math.cos(phi) * 1.05
    nodeHome[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) * 0.8
  }

  // --- edges: each node links to its nearest few ---
  const edges: Edge[] = []
  const seen = new Set<string>()

  for (let i = 0; i < NODES; i++) {
    const ranked = []
    for (let j = 0; j < NODES; j++) {
      if (i === j) continue
      const dx = nodeHome[i * 3] - nodeHome[j * 3]
      const dy = nodeHome[i * 3 + 1] - nodeHome[j * 3 + 1]
      const dz = nodeHome[i * 3 + 2] - nodeHome[j * 3 + 2]
      ranked.push({ j, d: dx * dx + dy * dy + dz * dz })
    }
    ranked.sort((x, y) => x.d - y.d)

    for (let k = 0; k < LINKS_PER_NODE; k++) {
      const j = ranked[k].j
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ a: i, b: j, offset: Math.random() })
    }
  }

  const edgePositions = new Float32Array(edges.length * 2 * 3)
  const edgeAlpha = new Float32Array(edges.length * 2)

  const edgeGeo = new BufferGeometry()
  edgeGeo.setAttribute('position', new BufferAttribute(edgePositions, 3))
  edgeGeo.setAttribute('aAlpha', new BufferAttribute(edgeAlpha, 1))

  const edgeMat = makeLineMaterial(color)
  group.add(new LineSegments(edgeGeo, edgeMat))

  // --- node points ---
  const nodePositions = new Float32Array(NODES * 3)
  const nodeAlpha = new Float32Array(NODES).fill(0.9)

  const nodeGeo = new BufferGeometry()
  nodeGeo.setAttribute('position', new BufferAttribute(nodePositions, 3))
  nodeGeo.setAttribute('aAlpha', new BufferAttribute(nodeAlpha, 1))

  const nodeMat = makePointMaterial(color, 4.6)
  group.add(new Points(nodeGeo, nodeMat))

  return {
    object: group,

    update(ctx: FrameContext) {
      const p = ctx.projects[1] ?? 0
      nodeMat.uniforms.uPixelRatio.value = ctx.pixelRatio

      // The lattice draws itself together as the section arrives.
      const assemble = 0.55 + 0.45 * (p * p * (3 - 2 * p))
      const t = ctx.reduced ? 0.4 : ctx.time

      for (let i = 0; i < NODES; i++) {
        // A node nudges when one of its links is mid-break.
        const jitter = ctx.reduced ? 0 : Math.sin(t * 1.3 + i * 2.1) * 0.012
        nodePositions[i * 3] = nodeHome[i * 3] * assemble + jitter
        nodePositions[i * 3 + 1] = nodeHome[i * 3 + 1] * assemble
        nodePositions[i * 3 + 2] = nodeHome[i * 3 + 2] * assemble + jitter
      }
      nodeGeo.attributes.position.needsUpdate = true

      for (let e = 0; e < edges.length; e++) {
        const { a, b, offset } = edges[e]

        // Sawtooth per edge: a sharp snap, then a gradual repair. Offsets are
        // random, so breaks are staggered and the whole never fails at once.
        const cycle = (t * BREAK_SPEED + offset) % 1
        const health = cycle < 0.1 ? 0 : Math.min((cycle - 0.1) / 0.28, 1)

        const base = e * 6
        for (let v = 0; v < 2; v++) {
          const n = v === 0 ? a : b
          edgePositions[base + v * 3] = nodePositions[n * 3]
          edgePositions[base + v * 3 + 1] = nodePositions[n * 3 + 1]
          edgePositions[base + v * 3 + 2] = nodePositions[n * 3 + 2]
          edgeAlpha[e * 2 + v] = health * 0.5 * p
        }
      }

      edgeGeo.attributes.position.needsUpdate = true
      edgeGeo.attributes.aAlpha.needsUpdate = true

      if (!ctx.reduced) group.rotation.y = t * 0.06 + ctx.mouseX * 0.14
    },

    dispose() {
      edgeGeo.dispose()
      edgeMat.dispose()
      nodeGeo.dispose()
      nodeMat.dispose()
    },
  }
}
