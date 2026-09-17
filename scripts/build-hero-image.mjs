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

const SRC = 'assets/PersonalPhoto2-clean.png'
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
 * taken as a percentage of the frame. This photo has the subject centred with
 * headroom, so a fixed "top N%" rule would not land on the body.
 *
 * The right edge is deliberately 990, not the alpha bbox: automatic
 * segmentation merged a chair back into the left arm between columns 1000 and
 * 1110, and the two are one connected region, so the only way to drop the
 * furniture without hand-masking is to frame it out.
 *
 *   head top      y 311
 *   shoulders     y 720
 *   widest        y 900
 *   waistcoat pt  y ~1330
 */
const CROPS = [
  { name: 'hero', box: { left: 420, top: 300, width: 570, height: 1000 }, widths: [420, 570] },
  { name: 'hero-t', box: { left: 430, top: 300, width: 550, height: 700 }, widths: [420, 550] },
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
