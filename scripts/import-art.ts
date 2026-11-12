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
import { slugFor } from './lib/artSlug'
import { artAlt, tattooAlt } from '../content/art'
import { generateWithFallback, LadderReport } from './lib/imageLadder'

const SOURCES = [
  { dir: 'C:/Users/kylee/Pictures/Art/PortfolioArt', out: 'art', alt: artAlt },
  { dir: 'C:/Users/kylee/Pictures/Art/TattooArt', out: 'tattoo', alt: tattooAlt },
]

/** Provenance unconfirmed and too low-res to print well. */
const EXCLUDE = new Set(['FB_IMG_1571103383957.jpg'])

const EXTS = /\.(jpe?g|png)$/i

/**
 * Strict-decodes a cheap, tiny probe render of `src` to check the file isn't
 * malformed. Sharp/libvips aborts by default on bad JPEG markers (seen on a
 * couple of phone-camera photos in this folder) — that's the right default,
 * since a genuinely corrupt file should be surfaced, not silently decoded to
 * wrong pixels. Only files that fail the strict probe fall back to
 * failOn: 'none', and we warn by name when that happens.
 */
async function probeFailOn(src: string, file: string): Promise<'none' | undefined> {
  try {
    await sharp(src).rotate().resize(64).jpeg().toBuffer()
    return undefined
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.warn(`  ${file}: strict decode failed (${message}) — retrying with failOn:'none'`)
    return 'none'
  }
}

async function main() {
  const missingAlt: string[] = []
  const report = new LadderReport()

  for (const { dir, out, alt } of SOURCES) {
    if (!existsSync(dir)) {
      console.warn(`  source missing, skipping: ${dir}`)
      continue
    }
    const outDir = resolve(process.cwd(), 'public/media', out)
    mkdirSync(outDir, { recursive: true })

    for (const file of readdirSync(dir)) {
      if (!EXTS.test(file) || EXCLUDE.has(file)) continue
      const slug = slugFor(file)
      if (!alt[slug]) missingAlt.push(`${out}/${slug}  (${file})`)

      const src = join(dir, file)
      const failOn = await probeFailOn(src, file)

      const result = await generateWithFallback(src, outDir, slug, { rotate: true, failOn })

      const label = `${out}/${slug}`
      report.record(label, result)
      console.log(`  ${label}`)
    }
  }

  report.print()

  if (missingAlt.length) {
    console.warn(`\n${missingAlt.length} image(s) have no alt text in content/art.ts:`)
    for (const m of missingAlt) console.warn(`  - ${m}`)
    console.warn('Add an entry to artAlt/tattooAlt for each, then re-run.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
