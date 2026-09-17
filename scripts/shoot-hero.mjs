/**
 * Screenshots the hero at desktop and phone widths, and the tuning panel.
 *
 * Run against a running preview server:
 *   npm run preview -- --port 4173
 *   node scripts/shoot-hero.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.SHOT_URL ?? 'http://localhost:4173/'
const OUT = 'scripts/shots'

const VIEWS = [
  { name: 'hero-1440', width: 1440, height: 900, dpr: 1, query: '' },
  { name: 'hero-390', width: 390, height: 844, dpr: 2, query: '' },
  { name: 'hero-tuner', width: 1440, height: 900, dpr: 1, query: '?tune' },
]

const browser = await chromium.launch()

for (const view of VIEWS) {
  const page = await browser.newPage({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: view.dpr,
  })

  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(BASE + view.query, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero-photo img')
  await page.evaluate(() => {
    const img = document.querySelector('.hero-photo img')
    return img?.decode ? img.decode().catch(() => {}) : null
  })
  await page.waitForTimeout(2200)

  await page.screenshot({ path: `${OUT}/${view.name}.png` })

  const state = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    }
    return {
      figure: pick('.hero-figure'),
      name: pick('.hero-name'),
      word: pick('.hero-name .word-inner'),
      tuner: pick('.tuner'),
      currentSrc: document.querySelector('.hero-photo img')?.currentSrc?.split('/').pop() ?? null,
    }
  })

  console.log(`${view.name} (${view.width}x${view.height}@${view.dpr}x${view.query})`)
  console.log('  ' + JSON.stringify(state))
  if (errors.length) console.log('  ERRORS: ' + errors.join(' | '))

  await page.close()
}

// Prove the panel actually drives the page: move a slider, read the variable.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(BASE + '?tune', { waitUntil: 'networkidle' })
await page.waitForSelector('.tuner')

const before = await page.evaluate(() =>
  getComputedStyle(document.querySelector('.hero-name')).fontSize,
)

await page.getByRole('button', { name: 'Name type' }).click()
await page.waitForTimeout(200)

// React tracks controlled inputs through a value setter, so assigning .value
// directly is ignored. Go through the native prototype setter instead.
const slider = page
  .locator('.tuner-group', { hasText: 'Name type' })
  .locator('input[type="range"]')
  .first()

await slider.evaluate((el) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(el, '130')
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
await page.waitForTimeout(400)

const after = await page.evaluate(() => ({
  fontSize: getComputedStyle(document.querySelector('.hero-name')).fontSize,
  cssVar: document.documentElement.style.getPropertyValue('--h-name-size'),
  stored: !!window.localStorage.getItem('hero-tuning-v1'),
}))

console.log(`\nslider test: name font-size ${before} -> ${after.fontSize}`)
console.log(`  --h-name-size=${after.cssVar}  persisted=${after.stored}`)

await page.screenshot({ path: `${OUT}/hero-tuner-live.png` })
await page.close()

await browser.close()
