import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

const info = await page.evaluate(() => {
  const read = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return {
      inline: el.getAttribute('style') || '(no style attr)',
      opacity: cs.opacity,
      transform: cs.transform,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    }
  }

  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    // Did each animated group actually land?
    photo: read('.hero-photo'),
    word: read('.hero-name .word-inner'),
    role: read('.hero-role'),
    actions: read('.hero-actions'),
    // Is anything still holding a GSAP-set inline style?
    inlineStyled: [...document.querySelectorAll('.hero [style]')].map((el) => ({
      cls: el.className,
      style: el.getAttribute('style'),
    })),
  }
})

console.log(JSON.stringify(info, null, 2))
console.log('\nconsole errors:', errors.length ? errors : '(none)')

await browser.close()
