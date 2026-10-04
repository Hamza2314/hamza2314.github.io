/**
 * The handful of glyphs the page uses, drawn on one 20px grid with one stroke
 * weight so they sit together. They take the text colour, and are always
 * decorative: the control around each one carries the accessible name.
 */
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export const ArrowLeft = () => (
  <svg {...base}>
    <path d="M16 10H4M9 5l-5 5 5 5" />
  </svg>
)

export const ArrowRight = () => (
  <svg {...base}>
    <path d="M4 10h12M11 5l5 5-5 5" />
  </svg>
)

export const Close = () => (
  <svg {...base}>
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
)

export const Expand = () => (
  <svg {...base}>
    <path d="M12 4h4v4M8 16H4v-4M16 4l-5 5M4 16l5-5" />
  </svg>
)
