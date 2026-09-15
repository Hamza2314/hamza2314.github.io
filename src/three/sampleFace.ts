/**
 * Turns a portrait into a point cloud.
 *
 * The sampling rule is carried over unchanged from the old Canvas-2D mesh: read
 * the image at a fixed 200px square, keep pixels darker than a threshold, and
 * take z from luminance so the cloud has real depth rather than a flat cut-out.
 * Contrast in the source photo matters far more than resolution.
 */

const SIZE = 200
const SAMPLE_STEP = 4

/** Below this darkness a pixel is background and gets dropped. */
const WEIGHT_FLOOR = 0.28

export type PointCloud = {
  /** xyz triples, y already flipped into WebGL's y-up space. */
  positions: Float32Array
  /** Per-point darkness, 0..1. Drives both alpha and point size. */
  weights: Float32Array
  /** Per-point random offset direction, used for the scattered state. */
  scatter: Float32Array
  count: number
  /** False when we fell back to the abstract sphere. */
  fromImage: boolean
}

type RawPoint = { x: number; y: number; z: number; w: number }

function pack(points: RawPoint[], fromImage: boolean): PointCloud {
  const count = points.length
  const positions = new Float32Array(count * 3)
  const weights = new Float32Array(count)
  const scatter = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const p = points[i]
    positions[i * 3] = p.x
    positions[i * 3 + 1] = p.y
    positions[i * 3 + 2] = p.z
    weights[i] = p.w

    // A random direction per point, biased outward and forward so the scattered
    // state reads as a cloud drifting apart rather than a uniform fuzz.
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const mag = 0.5 + Math.random() * 0.9
    scatter[i * 3] = Math.sin(phi) * Math.cos(theta) * mag
    scatter[i * 3 + 1] = Math.cos(phi) * mag
    scatter[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * mag * 1.4
  }

  return { positions, weights, scatter, count, fromImage }
}

export function sampleImage(img: HTMLImageElement, maxPoints: number): PointCloud {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return buildFallback(maxPoints)

  // Contain-fit, centred.
  const scale = Math.min(SIZE / img.width, SIZE / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)

  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, SIZE, SIZE).data
  } catch {
    // Tainted canvas, e.g. the image came from another origin without CORS.
    return buildFallback(maxPoints)
  }

  const points: RawPoint[] = []

  for (let y = 0; y < SIZE; y += SAMPLE_STEP) {
    for (let x = 0; x < SIZE; x += SAMPLE_STEP) {
      const i = (y * SIZE + x) * 4
      if (data[i + 3] < 24) continue

      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255
      const weight = 1 - lum
      if (weight < WEIGHT_FLOOR) continue

      points.push({
        x: (x - SIZE / 2) / (SIZE / 2),
        // Canvas y runs down, WebGL y runs up.
        y: -((y - SIZE / 2) / (SIZE / 2)),
        z: (weight - 0.5) * 0.85,
        w: weight,
      })
    }
  }

  if (!points.length) return buildFallback(maxPoints)

  return pack(thin(points, maxPoints), true)
}

/** Evenly decimate rather than truncate, so thinning does not crop the face. */
function thin(points: RawPoint[], maxPoints: number): RawPoint[] {
  if (points.length <= maxPoints) return points

  const stride = points.length / maxPoints
  const out: RawPoint[] = []
  for (let i = 0; i < maxPoints; i++) out.push(points[Math.floor(i * stride)])
  return out
}

/**
 * Used when face.jpg is missing, fails to load, or taints the canvas. An
 * abstract point sphere: the site still has a scene, it just is not a portrait.
 */
export function buildFallback(maxPoints: number): PointCloud {
  const count = Math.min(1800, maxPoints)
  const points: RawPoint[] = []

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 0.62 + Math.sin(phi * 3) * 0.04

    const z = r * Math.sin(phi) * Math.sin(theta) * 0.8
    points.push({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi) * 1.18 - 0.05,
      z,
      w: 0.45 + Math.abs(z) * 0.5,
    })
  }

  return pack(points, false)
}

/**
 * Loads the portrait and samples it, resolving to the fallback sphere on any
 * failure. Never rejects: a missing photo is a normal state, not an error.
 */
export function loadFaceCloud(src: string, maxPoints: number): Promise<PointCloud> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(sampleImage(img, maxPoints))
    img.onerror = () => resolve(buildFallback(maxPoints))
    img.src = src
  })
}
