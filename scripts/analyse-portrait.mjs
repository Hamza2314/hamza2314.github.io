/**
 * Reads a portrait's alpha channel and reports where the subject sits, so hero
 * crop boxes are chosen from the image rather than guessed, and so a new source
 * can be judged against the resolution the hero actually needs.
 *
 * Run: node scripts/analyse-portrait.mjs [path]
 */
import sharp from 'sharp'

const SRC = process.argv[2] ?? 'assets/Photo3.png'

/**
 * The figure occupies 38vw. On a 1920 viewport at 2x that is 1460 device px,
 * which is the widest the hero will ever ask for.
 */
const TARGET = 1400
const FLOOR = 1100

const meta = await sharp(SRC).metadata()
console.log(`${SRC}`)
console.log(`  ${meta.width} x ${meta.height}  channels=${meta.channels} alpha=${meta.hasAlpha}`)

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info

const OPAQUE = 24
let top = height
let bottom = -1
let left = width
let right = -1

const rowLeft = new Int32Array(height).fill(-1)
const rowRight = new Int32Array(height).fill(-1)

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * channels + 3] < OPAQUE) continue
    if (rowLeft[y] < 0) rowLeft[y] = x
    rowRight[y] = x
    if (y < top) top = y
    if (y > bottom) bottom = y
    if (x < left) left = x
    if (x > right) right = x
  }
}

const subjectW = right - left + 1
const subjectH = bottom - top + 1
console.log(`  subject bbox: x ${left}..${right}, y ${top}..${bottom}  (${subjectW} x ${subjectH})`)
console.log(`  subject fills ${((subjectW / width) * 100).toFixed(0)}% of frame width`)

// Head: the narrow run before the shoulders flare out.
let shoulderY = top
for (let y = top; y < bottom; y++) {
  const w = rowRight[y] - rowLeft[y]
  if (w > subjectW * 0.55) {
    shoulderY = y
    break
  }
}

let headW = 0
for (let y = top; y < shoulderY; y++) headW = Math.max(headW, rowRight[y] - rowLeft[y])

console.log(`  shoulders start at y=${shoulderY}, head is ${headW}px wide`)

// The hero crop runs head to waistcoat, roughly twice the head-to-shoulder drop
// below the shoulder line, and about as wide as the shoulders.
const cropTop = Math.max(0, top - Math.round(headW * 0.12))
const cropBottom = Math.min(height, shoulderY + Math.round((shoulderY - top) * 2.2))
let cropW = 0
for (let y = cropTop; y < cropBottom; y++) cropW = Math.max(cropW, rowRight[y] - rowLeft[y])

const pad = Math.round(cropW * 0.06)
const usable = cropW + pad * 2

console.log(`\n  upper-body crop would be about ${usable} x ${cropBottom - cropTop} px`)
console.log(`  head width ${headW}px  (want 350-450)`)

const verdict =
  usable >= TARGET ? 'GOOD' : usable >= FLOOR ? 'USABLE' : 'TOO LOW'
console.log(
  `\n  verdict: ${verdict} — ${usable}px against a ${TARGET}px target, ${FLOOR}px floor`,
)
if (usable < TARGET) {
  console.log(`  hero would upscale ${(1460 / usable).toFixed(2)}x on a 1920 retina screen`)
}

console.log('\n  silhouette profile:')
for (let p = 0; p <= 100; p += 5) {
  const y = Math.min(height - 1, Math.round(top + ((bottom - top) * p) / 100))
  const w = rowLeft[y] < 0 ? 0 : rowRight[y] - rowLeft[y]
  console.log(
    `    ${String(p).padStart(3)}%  y=${String(y).padStart(4)}  l=${String(rowLeft[y]).padStart(4)} r=${String(rowRight[y]).padStart(4)} w=${String(w).padStart(4)}  ${'#'.repeat(Math.round(w / 40))}`,
  )
}
