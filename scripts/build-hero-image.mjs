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

const SRC = 'assets/Photo3.png'
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
 * taken as a percentage of the frame: this source is a wide landscape plate
 * with the subject in the left third, so no percentage rule would land.
 *
 * Alpha profile of Photo3.png:
 *   bbox          x 245..629, y 103..1164  (subject is only 385 x 1062)
 *   head top      y 103
 *   shoulders     y 368
 *   widest        y 527
 *   waistcoat pt  y ~700
 *
 * Note the ceiling this imposes: at 385px across, the widest derivative is
 * smaller than the figure's own layout box on a 1440 viewport, so the hero
 * upscales. Nothing here can recover detail the source does not have.
 */
const CROPS = [
  { name: 'hero', box: { left: 235, top: 88, width: 405, height: 625 }, widths: [405] },
  { name: 'hero-t', box: { left: 250, top: 88, width: 375, height: 362 }, widths: [375] },
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
