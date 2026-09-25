import { Fragment } from 'react'

/**
 * Wraps each word of a string in its own span so it can be revealed in
 * sequence, the way a model emits tokens.
 *
 * Revealed, not typed. The complete text is in the markup from the start: it
 * prerenders, it is selectable, a screen reader gets all of it at once, and
 * with JavaScript off it is simply visible. The animation only ever changes
 * opacity. Injecting the characters instead would cost all four of those and
 * buy nothing the eye can tell apart.
 *
 * Words rather than characters, because that is what streaming actually looks
 * like and it is far quicker to read than a typewriter. The caret rides the
 * last revealed word as a ::after, so no separate element has to be positioned.
 *
 * The space between words is a real text node outside the spans, so copying the
 * text back out of the page gives you the sentence rather than onelongword.
 */
export default function Stream({ text }: { text: string }) {
  const words = text.split(' ')

  return (
    <span className="stream">
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="stream-w">{word}</span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </span>
  )
}
