/**
 * Removes the background from a photo, locally.
 *
 * Runs an ONNX segmentation model on this machine: the photo is never sent to
 * a third-party service. Writes an RGBA PNG next to the source.
 *
 * Run: node scripts/cutout.mjs <input> <output>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { removeBackground } from '@imgly/background-removal-node'

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.error('usage: node scripts/cutout.mjs <input> <output>')
  process.exit(1)
}

console.log(`cutting out ${input} ...`)

// A bare Buffer carries no MIME type and the decoder rejects it, so wrap the
// bytes in a Blob tagged from the file extension.
const mime = input.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
const source = new Blob([readFileSync(input)], { type: mime })

const blob = await removeBackground(source, {
  // 'medium' keeps more hair detail than 'small'; curly hair against a busy
  // background is the worst case for this model.
  model: 'medium',
  output: { format: 'image/png', quality: 1 },
  progress: (key, current, total) => {
    if (key.startsWith('fetch')) process.stdout.write(`\r  ${key} ${current}/${total}   `)
  },
})

writeFileSync(output, Buffer.from(await blob.arrayBuffer()))
console.log(`\nwrote ${output}`)
