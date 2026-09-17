import { renderToString } from 'react-dom/server'
import App from './App'

/**
 * Build-time only. Never shipped to the browser.
 *
 * Renders the page to static HTML so the hero, and everything else made of
 * words, is in the document before any JavaScript runs. The scene is
 * client-only and renders nothing here, which is the point: the writing does
 * not wait on WebGL.
 *
 * Must be renderToString, not renderToStaticMarkup: the latter omits the
 * hydration markers hydrateRoot needs, so React discards the markup and
 * re-renders, which strands any animation start-state already applied to it.
 */
export function render(): string {
  return renderToString(<App />)
}
