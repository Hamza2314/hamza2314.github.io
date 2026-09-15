import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'

/**
 * Build-time only. Never shipped to the browser.
 *
 * Renders the page to static HTML so the hero, and everything else made of
 * words, is in the document before any JavaScript runs. The scene is
 * client-only and renders nothing here, which is the point: the writing does
 * not wait on WebGL.
 */
export function render(): string {
  return renderToStaticMarkup(<App />)
}
