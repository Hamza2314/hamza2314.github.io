/**
 * Real screenshots for the Projects showcase.
 *
 * Takes the source captures (PNG or JPEG, any size) and writes them as WebP,
 * capped at 1600px wide, to public/projects/<slug>-<n>.webp, which is what the
 * `shots` entries in src/data.ts point at.
 *
 * Run: node scripts/build-project-shots.mjs <source-folder>
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const SRC = process.argv[2]
const OUT = 'public/projects'
const MAX_WIDTH = 1600

if (!SRC) {
  console.error('Usage: node scripts/build-project-shots.mjs <source-folder>')
  process.exit(1)
}

// Output name -> source file, in gallery order. The first is the card image.
// excessus-1 is a hand-cropped PNG kept in public/projects as is.
const SHOTS = {
  'excessus-2': 'excessus-3-lawyer-inbox-lead-detail.jpg',
  'excessus-3': 'excessus-6-chatbot-style-preview.png',
  'mender-1': 'mender-1-campaign-list.jpg',
  'mender-2': 'mender-2-accounts.jpg',
  'mender-3': 'mender-3-campaign-types.jpg',
  'mender-4': 'mender-4-ai-model-registry.jpg',
  'geosearch-1': 'bsc-thesis-geoportal-ai-search.jpg',
  'pipeline-1': 'seo-1-generator-ui.jpg',
  'pipeline-2': 'seo-2-pipeline-steps.jpg',
  'pipeline-3': 'seo-3-agent-settings.jpg',
  'pipeline-4': 'seo-4-generated-article.png',
  'seal-1': 'seal-1-dino-foreground-heatmap.png',
  'seal-2': 'seal-2-segmentation-masks.jpg',
}

mkdirSync(OUT, { recursive: true })

for (const [name, file] of Object.entries(SHOTS)) {
  const out = join(OUT, `${name}.webp`)
  const info = await sharp(join(SRC, file))
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out)
  console.log(`${out}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`)
}
