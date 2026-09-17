/**
 * Crops the full-length portrait to upper body and emits the responsive
 * derivatives the hero actually serves.
 *
 * The source PNG lives in assets/, deliberately outside public/, so the
 * 2.37 MB original is version-controlled but never copied into dist.
 *
 * Run: npm run build:hero
 */
import { mkdirSync, statSync } from 'node:fs'
import sharp from 'sharp'

const SRC = 'assets/Photo4.png'
const OUT = 'public'

/**
 * Two crops, because the stacked phone layout needs a tighter frame than the
 * side-by-side desktop one, and cropping in CSS would mean upscaling.
 *
 * The silhouette scan puts the shoulders at 25% and the widest point at 45%,
 * with the body narrowing past 50% at the natural waist.
 *
 *   wide   top 52%  head to the bottom of the waistcoat
 *   tight  top 30%  head and shoulders only
 */
/**
 * Explicit crop boxes, measured from the cutout's alpha profile rather than
 * taken as a percentage of the frame.
 *
 * Alpha profile of Photo4.png (3375 x 4219):
 *   bbox          x 929..2225, y 642..4218  (subject 1297 x 3577)
 *   head top      y 642, head ~430px wide
 *   shoulders     y ~1500
 *   widest        y 2072  (x 972..2215)
 *   waist         y ~2800, where the silhouette drops from 1123 to 822
 *
 * This source finally clears the resolution the hero asks for: the figure
 * occupies 38vw, so a 1920 viewport at 2x wants about 1460 device px, and the
 * wide crop supplies 1350. No meaningful upscaling.
 */
const CROPS = [
  { name: 'hero', box: { left: 920, top: 600, width: 1350, height: 2150 }, widths: [440, 800, 1350] },
  { name: 'hero-t', box: { left: 990, top: 600, width: 1220, height: 1300 }, widths: [420, 800, 1220] },
]

const meta = await sharp(SRC).metadata()
mkdirSync(OUT, { recursive: true })

const rows = []

for (const crop of CROPS) {
  const { left, top, width, height } = crop.box
  console.log(
    `${crop.name}: ${meta.width}x${meta.height} -> ${width}x${height} at (${left}, ${top})`,
  )

  const cropped = await sharp(SRC).extract(crop.box).toBuffer()

  for (const w of crop.widths) {
    await emit(cropped, crop.name, w, rows)
  }
}

async function emit(buffer, name, width, out) {
  const base = sharp(buffer).resize({ width, withoutEnlargement: true })

  // Alpha survives both formats. Quality is set high because the 300 kB budget
  // left roughly 4x headroom at default settings, and skin tones are where
  // compression artefacts show first.
  const avif = `${OUT}/${name}-${width}.avif`
  const webp = `${OUT}/${name}-${width}.webp`

  await base.clone().avif({ quality: 70, effort: 6 }).toFile(avif)
  await base.clone().webp({ quality: 90, effort: 6, alphaQuality: 100 }).toFile(webp)

  out.push({ file: `${name}-${width}`, avif: statSync(avif).size, webp: statSync(webp).size })
}

console.log('\nfile            avif      webp')
for (const r of rows) {
  console.log(
    `${r.file.padEnd(12)}  ${(r.avif / 1024).toFixed(1).padStart(7)} kB  ${(r.webp / 1024).toFixed(1).padStart(7)} kB`,
  )
}

const budget = 300 * 1024
const worst = Math.max(...rows.map((r) => Math.max(r.avif, r.webp)))
console.log(
  `\nlargest derivative: ${(worst / 1024).toFixed(1)} kB against a 300 kB budget -> ${worst <= budget ? 'PASS' : 'OVER'}`,
)
console.log(`source PNG (not shipped): ${(statSync(SRC).size / 1024 / 1024).toFixed(2)} MB`)
