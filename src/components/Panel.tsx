import type { ReactNode } from 'react'
import Stream from './Stream'

/**
 * One full-viewport section.
 *
 * The indexed label is the only thing every panel has in common structurally,
 * and it is what carries the shared entrance: the label generates word by word,
 * then the panel's contents rise in a stagger. Six panels, one arrival.
 *
 * The index is written here rather than counted in CSS because it is content —
 * a reader uses it to know how far through they are, now that the section rail
 * is gone.
 */
export default function Panel({
  id,
  index,
  label,
  children,
}: {
  id: string
  index: number
  label: string
  children: ReactNode
}) {
  return (
    <section className="panel" id={id} aria-labelledby={`${id}-label`}>
      <div className="panel-inner">
        <h2 className="panel-label" id={`${id}-label`}>
          <span className="panel-index">{String(index).padStart(2, '0')}</span>
          <Stream text={label} />
        </h2>
        {children}
      </div>
    </section>
  )
}
