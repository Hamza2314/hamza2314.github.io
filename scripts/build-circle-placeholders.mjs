/**
 * Numbered stand-ins for the three portrait photos.
 *
 * Writes the exact filenames build-circle-photos.mjs writes, so the two are
 * interchangeable and nothing downstream knows which it is holding. Run this
 * one while there is no photo worth showing; run the other once there is, and
 * revert the alt text in App.tsx at the same time.
 *
 * The three cards are deliberately different in value. Identical cards would
 * make the scratch invisible, which would hide the one thing these exist to
 * demonstrate.
 *
 * Run: npm run build:circle-placeholder
 */
import { mkdirSync, statSync } from 'node:fs'
import sharp from 'sharp'

const OUT = 'public'
const PREVIEW_DIR = 'scripts/shots'
const WIDTHS = [200, 400, 600]

/** Rendered at 3x the largest derivative, then downsampled, so edges stay clean. */
const SIZE = 1800

const CARDS = [
  { name: 'circle-1', label: '01', top: '#1b1d22', bottom: '#111317', ink: '#7d848f' },
  { name: 'circle-2', label: '02', top: '#282b32', bottom: '#181a1f', ink: '#9aa2ae' },
  { name: 'circle-3', label: '03', top: '#35393f', bottom: '#212429', ink: '#b6bec9' },
]

const preview = process.argv.includes('--preview')

mkdirSync(OUT, { recursive: true })
if (preview) mkdirSync(PREVIEW_DIR, { recursive: true })

/**
 * Lit from above, matching the hero's own beam, so a card in the circle sits in
 * the same light as everything around it.
 */
const card = ({ label, top, bottom, ink }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${top}"/>
      <stop offset="100%" stop-color="${bottom}"/>
    </linearGradient>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="url(#ground)"/>

  <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE * 0.36}"
          fill="none" stroke="${ink}" stroke-opacity="0.22" stroke-width="${SIZE * 0.004}"/>

  <text x="${SIZE / 2}" y="${SIZE / 2}" fill="${ink}"
        font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="${SIZE * 0.34}" font-weight="600"
        letter-spacing="${SIZE * 0.01}"
        text-anchor="middle" dominant-baseline="central">${label}</text>

  <text x="${SIZE / 2}" y="${SIZE * 0.7}" fill="${ink}" fill-opacity="0.55"
        font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="${SIZE * 0.048}" font-weight="500"
        letter-spacing="${SIZE * 0.022}"
        text-anchor="middle" dominant-baseline="central">PHOTO</text>
</svg>`

const rows = []

for (const spec of CARDS) {
  const square = await sharp(Buffer.from(card(spec))).png().toBuffer()
  console.log(`${spec.name}: placeholder ${spec.label}`)

  for (const w of WIDTHS) {
    const base = sharp(square).resize({ width: w, height: w })

    const avif = `${OUT}/${spec.name}-${w}.avif`
    const webp = `${OUT}/${spec.name}-${w}.webp`

    await base.clone().avif({ quality: 72, effort: 6 }).toFile(avif)
    await base.clone().webp({ quality: 92, effort: 6 }).toFile(webp)

    rows.push({ file: `${spec.name}-${w}`, avif: statSync(avif).size, webp: statSync(webp).size })
  }

  if (preview) {
    const size = 240
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
    )
    await sharp(square)
      .resize({ width: size, height: size })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toFile(`${PREVIEW_DIR}/${spec.name}-preview.png`)
  }
}

console.log('\nfile             avif      webp')
for (const r of rows) {
  console.log(
    `${r.file.padEnd(13)}  ${(r.avif / 1024).toFixed(1).padStart(7)} kB  ${(r.webp / 1024).toFixed(1).padStart(7)} kB`,
  )
}
