/**
 * Injects the statically rendered page into dist/index.html.
 *
 * Runs after the client build and the SSR build. Adds no runtime dependency
 * and no bytes to what the browser downloads: react-dom/server is used here
 * and then thrown away with dist-ssr.
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs'

const TARGET = 'dist/index.html'
const MOUNT = '<div id="root"></div>'

const { render } = await import('./dist-ssr/entry-server.js')

const template = readFileSync(TARGET, 'utf8')
if (!template.includes(MOUNT)) {
  throw new Error(`prerender: could not find ${MOUNT} in ${TARGET}`)
}

const html = render()
writeFileSync(TARGET, template.replace(MOUNT, `<div id="root">${html}</div>`))

// The server bundle is build scaffolding; nothing should deploy it.
rmSync('dist-ssr', { recursive: true, force: true })

console.log(`prerender: injected ${html.length} chars of static HTML`)
