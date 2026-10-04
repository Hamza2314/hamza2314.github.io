/**
 * Cuts the head-and-shoulders squares the hero portrait scratches between, and
 * emits the responsive derivatives.
 *
 * The circle is small, so the whole budget here is a rounding error next to the
 * full-length hero crops this replaced. What matters instead is *alignment*:
 * the scratch reads as one photo becoming another only while the head sits in
 * the same place in every square. The boxes below are tuned by eye against the
 * circular previews this script can emit.
 *
 * Writes the same filenames as build-circle-placeholders.mjs, which is what
 * makes the two interchangeable. Running this one replaces the numbered cards;
 * the alt text in App.tsx has to go back to the name at the same time.
 *
 * Run: npm run build:circle          (add --preview to write the proof sheet)
 */
import { mkdirSync, statSync } from 'node:fs'
import sharp from 'sharp'

const OUT = 'public'
const PREVIEW_DIR = 'scripts/shots'

/** Served widths. 200 css px at 1x, 2x and 3x, with nothing upscaled. */
const WIDTHS = [200, 400, 600]

/**
 * Source squares, in source pixels. Every box targets the same three ratios,
 * taken off the first square once it looked right in the circle:
 *
 *   head top     15% down the box
 *   head height  43% of the box
 *   head centre  on the vertical midline
 *
 * Hold those and a half-scratched circle reads as one face becoming another.
 * Miss them and it reads as a rendering fault.
 *
 *   Pics/Nature.jpeg    1024 x 1024   forest behind
 *   Pics/Office.jpeg    1024 x 1024   office behind
 *   Pics/Sea.jpeg       1024 x 1024   beach behind
 *
 * The three were shot as a set: same pose, same framing, head already in the
 * same place in every frame. The whole square is used as-is, since there is no
 * room above the hair to hit the ratios above without cropping the curls.
 *
 * `padTop` buys room above a head the source has no room above. It is only
 * safe on cutouts, where the added pixels flatten to exactly the same ground
 * as the transparent ones already around the subject.
 */
const FULL = { left: 0, top: 0, width: 1024, height: 1024 }
const PHOTOS = [
  { name: 'circle-1', src: 'Pics/Office.jpeg', box: FULL },
  { name: 'circle-2', src: 'Pics/Nature.jpeg', box: FULL },
  { name: 'circle-3', src: 'Pics/Sea.jpeg', box: FULL },
]

const preview = process.argv.includes('--preview')

mkdirSync(OUT, { recursive: true })
if (preview) mkdirSync(PREVIEW_DIR, { recursive: true })

const rows = []

for (const photo of PHOTOS) {
  const meta = await sharp(photo.src).metadata()
  const { left, top, width, height } = photo.box
  const padTop = photo.padTop ?? 0

  if (left + width > meta.width || top + height > meta.height + padTop) {
    throw new Error(
      `${photo.name}: box ${width}x${height} at (${left}, ${top}) falls outside ${photo.src} (${meta.width}x${meta.height}, padded by ${padTop})`,
    )
  }

  console.log(
    `${photo.name}: ${photo.src} ${meta.width}x${meta.height}${padTop ? ` +${padTop} top` : ''} -> ${width}x${height} at (${left}, ${top})`,
  )

  // The cutouts are transparent outside the subject. Padding transparent and
  // flattening afterwards means the added strip and the subject's own
  // surround end up the identical colour, with no seam where they meet.
  //
  // Two passes on purpose: within one pipeline sharp runs extract before
  // extend, which is the opposite of what the box coordinates assume.
  const padded = padTop
    ? await sharp(photo.src)
        .ensureAlpha()
        .extend({ top: padTop, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    : photo.src

  // Flattening onto the page ground also keeps the circle from showing the page
  // through the shoulders, and makes every square opaque so they composite
  // identically on the canvas.
  const square = await sharp(padded)
    .extract(photo.box)
    .flatten({ background: '#0c0d0f' })
    .toBuffer()

  for (const w of WIDTHS) {
    await emit(square, photo.name, w, rows)
  }

  if (preview) await writePreview(square, photo.name)
}

async function emit(buffer, name, width, out) {
  const base = sharp(buffer).resize({ width, height: width, withoutEnlargement: true })

  const avif = `${OUT}/${name}-${width}.avif`
  const webp = `${OUT}/${name}-${width}.webp`

  await base.clone().avif({ quality: 72, effort: 6 }).toFile(avif)
  await base.clone().webp({ quality: 90, effort: 6 }).toFile(webp)

  out.push({ file: `${name}-${width}`, avif: statSync(avif).size, webp: statSync(webp).size })
}

/**
 * The square masked to the circle it will actually be seen through, at the size
 * it will actually be seen at. Judging the crop on the uncropped square is how
 * you end up with a chin against the edge.
 */
async function writePreview(buffer, name) {
  const size = 240
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  )

  await sharp(buffer)
    .resize({ width: size, height: size })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(`${PREVIEW_DIR}/${name}-preview.png`)
}

console.log('\nfile             avif      webp')
for (const r of rows) {
  console.log(
    `${r.file.padEnd(13)}  ${(r.avif / 1024).toFixed(1).padStart(7)} kB  ${(r.webp / 1024).toFixed(1).padStart(7)} kB`,
  )
}

// All three are fetched up front by the scratch canvas, so the ceiling that
// matters is the set, not the file.
const total = rows
  .filter((r) => r.file.endsWith('-400'))
  .reduce((sum, r) => sum + Math.min(r.avif, r.webp), 0)
console.log(`\nthe three 400px squares together: ${(total / 1024).toFixed(1)} kB`)
