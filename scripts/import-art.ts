/**
 * Imports curated art into public/media/{art,tattoo}/.
 *
 * Globs the source folders rather than listing filenames: they are still being
 * filled, so a re-run must pick up new work without a code change.
 *
 *   npm run import:art
 */
import { readdirSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import sharp from 'sharp'
import { artSlug } from './lib/artSlug'
import { artAlt, tattooAlt } from '../content/room'

const SOURCES = [
  { dir: 'C:/Users/kylee/Pictures/Art/PortfolioArt', out: 'art', alt: artAlt },
  { dir: 'C:/Users/kylee/Pictures/Art/TattooArt', out: 'tattoo', alt: tattooAlt },
]

/** Provenance unconfirmed and too low-res to print well. */
const EXCLUDE = new Set(['FB_IMG_1571103383957.jpg'])

const EXTS = /\.(jpe?g|png)$/i
// 1280 (not 1600) and the quality values below are tuned so the two heavily
// textured acrylic-pour photos in PortfolioArt still clear the 250KB budget —
// their fine noise compresses far worse than the flat-color fan art/line work.
const WIDTH = 1280

async function main() {
  const missingAlt: string[] = []

  for (const { dir, out, alt } of SOURCES) {
    if (!existsSync(dir)) {
      console.warn(`  source missing, skipping: ${dir}`)
      continue
    }
    const outDir = resolve(process.cwd(), 'public/media', out)
    mkdirSync(outDir, { recursive: true })

    for (const file of readdirSync(dir)) {
      if (!EXTS.test(file) || EXCLUDE.has(file)) continue
      const slug = artSlug(file)
      if (!alt[slug]) missingAlt.push(`${out}/${slug}  (${file})`)

      const src = join(dir, file)
      // failOn: 'none' — a couple of source photos carry malformed JPEG
      // markers (common with some phone camera output) that libvips would
      // otherwise abort on; the pixel data itself decodes fine.
      const base = sharp(src, { failOn: 'none' })
        .rotate()
        .resize(WIDTH, null, { withoutEnlargement: true })
      await base.clone().avif({ quality: 35 }).toFile(join(outDir, `${slug}.avif`))
      await base.clone().webp({ quality: 30 }).toFile(join(outDir, `${slug}.webp`))
      await base.clone().jpeg({ quality: 42, mozjpeg: true }).toFile(join(outDir, `${slug}.jpg`))
      console.log(`  ${out}/${slug}`)
    }
  }

  if (missingAlt.length) {
    console.warn(`\n${missingAlt.length} image(s) have no alt text in content/room.ts:`)
    for (const m of missingAlt) console.warn(`  - ${m}`)
    console.warn('Add an entry to artAlt/tattooAlt for each, then re-run.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
