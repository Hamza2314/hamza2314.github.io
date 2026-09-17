/**
 * Reads the portrait's alpha channel and prints where the subject actually
 * sits, so the hero crop is chosen from the image rather than guessed.
 *
 * Run: node scripts/analyse-portrait.mjs
 */
import sharp from 'sharp'

const SRC = 'assets/PersonalPhoto.png'

const meta = await sharp(SRC).metadata()
console.log(`size: ${meta.width} x ${meta.height}  channels: ${meta.channels}  alpha: ${meta.hasAlpha}`)

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

console.log(`\ncontent bbox: top=${top} bottom=${bottom} left=${left} right=${right}`)
console.log(`content size: ${right - left + 1} x ${bottom - top + 1}`)

let shoulderY = top
let shoulderW = 0
for (let y = top; y < top + Math.floor(height / 3); y++) {
  const w = rowRight[y] - rowLeft[y]
  if (w > shoulderW) {
    shoulderW = w
    shoulderY = y
  }
}
console.log(
  `widest row in top third: y=${shoulderY} width=${shoulderW} (${((shoulderY / height) * 100).toFixed(1)}% down)`,
)

console.log('\nsilhouette profile:')
for (let pct = 0; pct <= 100; pct += 5) {
  const y = Math.min(height - 1, Math.round((pct / 100) * height))
  const w = rowLeft[y] < 0 ? 0 : rowRight[y] - rowLeft[y]
  const cx = rowLeft[y] < 0 ? 0 : Math.round((rowLeft[y] + rowRight[y]) / 2)
  console.log(
    `  ${String(pct).padStart(3)}%  y=${String(y).padStart(4)}  w=${String(w).padStart(4)}  cx=${String(cx).padStart(4)}  ${'#'.repeat(Math.round(w / 30))}`,
  )
}
