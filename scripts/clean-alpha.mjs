/**
 * Keeps only the largest connected region of a cutout's alpha channel.
 *
 * Automatic segmentation leaves islands behind: here, pale furniture that the
 * model read as part of a pale suit. Those islands are not touching the
 * subject, so keeping the single biggest blob removes them all without
 * hand-masking.
 *
 * Run: node scripts/clean-alpha.mjs <input> <output>
 */
import sharp from 'sharp'

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.error('usage: node scripts/clean-alpha.mjs <input> <output>')
  process.exit(1)
}

const THRESHOLD = 40

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info
const pixels = width * height

// -1 unvisited-and-opaque, -2 transparent, >=0 component id
const label = new Int32Array(pixels).fill(-1)
for (let i = 0; i < pixels; i++) {
  if (data[i * channels + 3] < THRESHOLD) label[i] = -2
}

const sizes = []
const stack = new Int32Array(pixels)

for (let seed = 0; seed < pixels; seed++) {
  if (label[seed] !== -1) continue

  const id = sizes.length
  let count = 0
  let sp = 0
  stack[sp++] = seed
  label[seed] = id

  while (sp > 0) {
    const p = stack[--sp]
    count++

    const x = p % width
    const y = (p - x) / width

    // 4-connectivity is enough and avoids bridging across diagonal specks.
    if (x > 0 && label[p - 1] === -1) {
      label[p - 1] = id
      stack[sp++] = p - 1
    }
    if (x < width - 1 && label[p + 1] === -1) {
      label[p + 1] = id
      stack[sp++] = p + 1
    }
    if (y > 0 && label[p - width] === -1) {
      label[p - width] = id
      stack[sp++] = p - width
    }
    if (y < height - 1 && label[p + width] === -1) {
      label[p + width] = id
      stack[sp++] = p + width
    }
  }

  sizes.push(count)
}

let keep = 0
for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[keep]) keep = i

const ranked = sizes
  .map((n, id) => ({ id, n }))
  .sort((a, b) => b.n - a.n)
  .slice(0, 6)

console.log(`components: ${sizes.length}`)
for (const c of ranked) {
  console.log(
    `  #${c.id}  ${String(c.n).padStart(8)} px  ${((c.n / pixels) * 100).toFixed(2)}%${c.id === keep ? '   <- kept' : ''}`,
  )
}

let cleared = 0
for (let i = 0; i < pixels; i++) {
  if (label[i] >= 0 && label[i] !== keep) {
    data[i * channels + 3] = 0
    cleared++
  }
}

await sharp(data, { raw: { width, height, channels } })
  .png()
  .toFile(output)

console.log(`cleared ${cleared} px of stray islands -> ${output}`)
