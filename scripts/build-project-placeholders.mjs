/**
 * Placeholder screenshots for the Projects showcase, until the real ones exist.
 *
 * Each is a 16:10 SVG of a generic app window, tinted per project and laid out
 * three ways (dashboard, list, document) so a gallery of three reads as three
 * different views rather than one image repeated. The project name and the
 * word "placeholder" are printed across the middle, so none of them can be
 * mistaken for the real thing.
 *
 * Writes public/projects/<slug>-<n>.svg, which is what placeholderShots() in
 * src/data.ts points at. Replace a project's `shots` there once its real
 * screenshots are in.
 *
 * Run: node scripts/build-project-placeholders.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = 'public/projects'
const W = 1600
const H = 1000

const PROJECTS = [
  { slug: 'excessus', title: 'Excessus', hue: 212 },
  { slug: 'mender', title: 'Mender', hue: 265 },
  { slug: 'geosearch', title: 'Geographic AI search', hue: 165 },
  { slug: 'pipeline', title: 'Content pipeline', hue: 32 },
  { slug: 'seal', title: 'Seal tracking', hue: 340 },
]

const COUNT = 3

const tint = (hue, l = 62, a = 1) => `hsla(${hue}, 32%, ${l}%, ${a})`

/** A rounded bar standing in for a line of text. */
const bar = (x, y, w, h = 12, fill = '#2b2e35') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`

function dashboard(hue) {
  const cards = [0, 1, 2]
    .map((i) => {
      const x = 400 + i * 368
      return `
      <rect x="${x}" y="250" width="344" height="150" rx="10" fill="#1d1f24" stroke="#2a2d33"/>
      ${bar(x + 28, 282, 120, 10, '#34373e')}
      ${bar(x + 28, 316, 170, 26, i === 0 ? tint(hue, 66) : '#3a3d44')}
      ${bar(x + 28, 362, 90, 10)}`
    })
    .join('')

  // A gently rising series, deterministic so rebuilds produce identical files.
  const pts = Array.from({ length: 13 }, (_, i) => {
    const x = 440 + i * 84
    const y = 800 - i * 18 - Math.round(Math.sin(i * 1.3) * 34)
    return `${x},${y}`
  }).join(' ')

  return `${cards}
    <rect x="400" y="428" width="1080" height="420" rx="10" fill="#1b1d22" stroke="#2a2d33"/>
    ${bar(432, 460, 200, 12, '#34373e')}
    ${[0, 1, 2, 3].map((i) => `<line x1="440" x2="1448" y1="${560 + i * 70}" y2="${560 + i * 70}" stroke="#25282e"/>`).join('')}
    <polyline points="440,820 ${pts} 1448,820" fill="${tint(hue, 60, 0.12)}" stroke="none"/>
    <polyline points="${pts}" fill="none" stroke="${tint(hue, 66)}" stroke-width="3" stroke-linejoin="round"/>`
}

function list(hue) {
  return Array.from({ length: 8 }, (_, i) => {
    const y = 250 + i * 74
    const on = i === 1
    return `
      <rect x="400" y="${y}" width="1080" height="60" rx="8" fill="${on ? tint(hue, 50, 0.16) : '#1b1d22'}" stroke="${on ? tint(hue, 60, 0.5) : '#25282e'}"/>
      <circle cx="436" cy="${y + 30}" r="12" fill="${on ? tint(hue, 66) : '#34373e'}"/>
      ${bar(468, y + 18, 220 + ((i * 53) % 160), 11, '#3a3d44')}
      ${bar(468, y + 36, 380 + ((i * 97) % 220), 9)}
      ${bar(1360, y + 24, 88, 12, on ? tint(hue, 66, 0.8) : '#2b2e35')}`
  }).join('')
}

function documentView(hue) {
  const lines = Array.from({ length: 11 }, (_, i) =>
    bar(440, 340 + i * 34, 640 - ((i * 71) % 210), 10, '#2f3238'),
  ).join('')
  return `
    <rect x="400" y="250" width="720" height="610" rx="10" fill="#1b1d22" stroke="#2a2d33"/>
    ${bar(440, 288, 320, 18, '#3a3d44')}
    ${lines}
    <rect x="1144" y="250" width="336" height="610" rx="10" fill="#1b1d22" stroke="#2a2d33"/>
    ${bar(1172, 288, 150, 12, '#34373e')}
    ${[0, 1, 2, 3].map((i) => `
      <rect x="1172" y="${330 + i * 96}" width="280" height="76" rx="8" fill="${i === 0 ? tint(hue, 50, 0.16) : '#1f2126'}" stroke="${i === 0 ? tint(hue, 60, 0.45) : '#2a2d33'}"/>
      ${bar(1192, 352 + i * 96, 150, 10, i === 0 ? tint(hue, 70) : '#3a3d44')}
      ${bar(1192, 374 + i * 96, 220, 8)}`).join('')}`
}

const VIEWS = [dashboard, list, documentView]

function svg({ title, hue }, n) {
  const body = VIEWS[(n - 1) % VIEWS.length](hue)
  const nav = Array.from({ length: 7 }, (_, i) => {
    const y = 236 + i * 46
    const on = i === (n - 1) % 3
    return `${on ? `<rect x="100" y="${y - 14}" width="220" height="38" rx="8" fill="${tint(hue, 50, 0.16)}"/>` : ''}
      ${bar(124, y, 120 + ((i * 37) % 70), 10, on ? tint(hue, 72) : '#2f3238')}`
  }).join('')

  const label = `${title}`
  const sub = `Screenshot ${n} · placeholder`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="glow" cx="78%" cy="8%" r="80%">
      <stop offset="0" stop-color="${tint(hue, 55, 0.22)}"/>
      <stop offset="1" stop-color="${tint(hue, 55, 0)}"/>
    </radialGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#16181c"/>
      <stop offset="1" stop-color="#0e0f12"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#ground)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <rect x="72" y="72" width="1456" height="856" rx="16" fill="#17191d" stroke="#2a2d33"/>
  <path d="M72 88a16 16 0 0 1 16-16h1424a16 16 0 0 1 16 16v40H72z" fill="#1e2025"/>
  <circle cx="110" cy="100" r="7" fill="#3a3d44"/>
  <circle cx="134" cy="100" r="7" fill="#3a3d44"/>
  <circle cx="158" cy="100" r="7" fill="#3a3d44"/>
  <rect x="580" y="88" width="440" height="24" rx="12" fill="#141518"/>

  <rect x="72" y="128" width="276" height="800" fill="#15171a"/>
  ${bar(108, 168, 140, 16, tint(hue, 66))}
  ${nav}

  ${bar(400, 168, 380, 22, '#3a3d44')}
  ${bar(400, 204, 240, 11)}
  ${body}

  <rect x="${W / 2 - 330}" y="${H / 2 - 74}" width="660" height="148" rx="14" fill="#0c0d0f" fill-opacity="0.86" stroke="#2f3238"/>
  <text x="${W / 2}" y="${H / 2 - 6}" text-anchor="middle" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="46" font-weight="600" fill="#f0f0ee">${label}</text>
  <text x="${W / 2}" y="${H / 2 + 42}" text-anchor="middle" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="22" letter-spacing="3" fill="#8a8d91">${sub.toUpperCase()}</text>
</svg>
`
}

mkdirSync(OUT, { recursive: true })
for (const project of PROJECTS) {
  for (let n = 1; n <= COUNT; n++) {
    const file = `${OUT}/${project.slug}-${n}.svg`
    writeFileSync(file, svg(project, n))
    console.log('wrote', file)
  }
}
