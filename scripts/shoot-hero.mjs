/**
 * Screenshots the hero at desktop and phone widths.
 *
 * Run against a running preview server:
 *   npm run preview -- --port 4173
 *   node scripts/shoot-hero.mjs
 */
import { chromium } from 'playwright'

const URL = process.env.SHOT_URL ?? 'http://localhost:4173/'
const OUT = 'scripts/shots'

const VIEWS = [
  { name: 'hero-1440', width: 1440, height: 900, dpr: 1 },
  { name: 'hero-390', width: 390, height: 844, dpr: 2 },
]

const browser = await chromium.launch()

for (const view of VIEWS) {
  const page = await browser.newPage({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: view.dpr,
  })

  await page.goto(URL, { waitUntil: 'networkidle' })

  // Let the entrance timeline finish and the portrait decode.
  await page.waitForSelector('.hero-photo img')
  await page.evaluate(() => {
    const img = document.querySelector('.hero-photo img')
    return img && img.decode ? img.decode().catch(() => {}) : null
  })
  await page.waitForTimeout(2200)

  await page.screenshot({ path: `${OUT}/${view.name}.png` })
  console.log(`${view.name}: ${view.width}x${view.height} @${view.dpr}x`)

  // Report what actually landed where, so framing is checked by numbers too.
  const box = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    }
    return {
      hero: pick('.hero'),
      figure: pick('.hero-figure'),
      text: pick('.hero-text'),
      name: pick('.hero-name'),
      img: pick('.hero-photo img'),
      currentSrc: document.querySelector('.hero-photo img')?.currentSrc ?? null,
    }
  })
  console.log(JSON.stringify(box, null, 2))

  await page.close()
}

await browser.close()
