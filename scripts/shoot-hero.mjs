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
  { name: 'hero-1440', width: 1440, height: 900, dpr: 1, query: '', spot: [335, 610] },
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

  // Park the cursor clear of the portrait so the dot spotlight is in the frame.
  // Without this every shot catches the lattice at rest, which is the one state
  // that says nothing about whether the interaction works.
  if (view.spot) {
    await page.mouse.move(view.spot[0], view.spot[1])
    await page.waitForTimeout(700)
  }

  await page.screenshot({ path: `${OUT}/${view.name}.png` })

  const state = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    }
    return {
      portrait: pick('.portrait'),
      canvas: pick('.portrait-canvas'),
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

// --- the scratch ------------------------------------------------------------
// Drag the cursor across the circle and catch it mid-way, then wait out the
// idle delay and catch it again once the deck has advanced. A still of the
// finished state proves nothing on its own: both photos are of the same person
// and the whole question is whether the in-between frame reads.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('.portrait-canvas')
  await page.waitForTimeout(1600) // entrance, and all three squares decoded

  const circle = await page.locator('.portrait').boundingBox()
  const cx = circle.x + circle.width / 2
  const cy = circle.y + circle.height / 2
  const r = circle.width / 2

  // A diagonal wipe across the middle, in enough steps that the stroke
  // interpolation is doing real work between events.
  await page.mouse.move(cx - r * 0.8, cy - r * 0.5)
  for (let i = 1; i <= 14; i++) {
    await page.mouse.move(cx - r * 0.8 + (r * 1.6 * i) / 14, cy - r * 0.5 + (r * i) / 14)
    await page.waitForTimeout(16)
  }

  await page.screenshot({ path: `${OUT}/scratch-mid.png`, clip: pad(circle, 60) })

  // Off the circle, then wait past the idle delay plus the resolve.
  await page.mouse.move(cx + r * 6, cy)
  await page.waitForTimeout(4200)
  await page.screenshot({ path: `${OUT}/scratch-resolved.png`, clip: pad(circle, 60) })

  console.log(`\nscratch: circle ${Math.round(circle.width)}px at (${Math.round(cx)}, ${Math.round(cy)})`)
  if (errors.length) console.log('  ERRORS: ' + errors.join(' | '))
  await page.close()
}

function pad(box, by) {
  return {
    x: Math.max(0, box.x - by),
    y: Math.max(0, box.y - by),
    width: box.width + by * 2,
    height: box.height + by * 2,
  }
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
