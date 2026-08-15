/**
 * Imports curated art into public/media/{art,tattoo}/.
 *
 * Globs the source folders rather than listing filenames: they are still being
 * filled, so a re-run must pick up new work without a code change.
 *
 *   npm run import:art
 */
import { readdirSync, mkdirSync, existsSync, statSync } from 'node:fs'
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
const MAX_BYTES = 250 * 1024

/**
 * Spec width/quality first, then progressively smaller/lower-quality steps
 * used ONLY for the rare source file whose output still exceeds the 250KB
 * budget at spec (dense photographic noise/texture compresses far worse than
 * the flat-color fan art most of this folder is). Each file is generated at
 * the first step whose three outputs all clear the budget, so the vast
 * majority ship at full 1600px/spec quality and only the outliers degrade.
 */
const STEPS = [
  { width: 1600, avif: 55, webp: 72, jpeg: 78 },
  { width: 1400, avif: 48, webp: 60, jpeg: 68 },
  { width: 1280, avif: 40, webp: 50, jpeg: 58 },
  { width: 1150, avif: 35, webp: 40, jpeg: 48 },
  { width: 1024, avif: 30, webp: 32, jpeg: 40 },
]

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

async function generateAtStep(
  src: string,
  outDir: string,
  slug: string,
  step: (typeof STEPS)[number],
  failOn: 'none' | undefined
): Promise<string[]> {
  const base = sharp(src, failOn ? { failOn } : {})
    .rotate()
    .resize(step.width, null, { withoutEnlargement: true })
  const paths = [
    join(outDir, `${slug}.avif`),
    join(outDir, `${slug}.webp`),
    join(outDir, `${slug}.jpg`),
  ]
  await base.clone().avif({ quality: step.avif }).toFile(paths[0])
  await base.clone().webp({ quality: step.webp }).toFile(paths[1])
  await base.clone().jpeg({ quality: step.jpeg, mozjpeg: true }).toFile(paths[2])
  return paths
}

function maxSize(paths: string[]): number {
  return Math.max(...paths.map((p) => statSync(p).size))
}

async function main() {
  const missingAlt: string[] = []
  const fellBack: string[] = []

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
      const failOn = await probeFailOn(src, file)

      let stepIndex = 0
      let paths = await generateAtStep(src, outDir, slug, STEPS[stepIndex], failOn)
      while (maxSize(paths) > MAX_BYTES && stepIndex < STEPS.length - 1) {
        stepIndex += 1
        paths = await generateAtStep(src, outDir, slug, STEPS[stepIndex], failOn)
      }

      if (stepIndex > 0) {
        const step = STEPS[stepIndex]
        const kb = Math.round(maxSize(paths) / 1024)
        const msg = `${out}/${slug}: exceeded 250KB at spec (1600px), fell back to step ${stepIndex} (${step.width}px, avif${step.avif}/webp${step.webp}/jpeg${step.jpeg}) — largest output ${kb}KB`
        console.warn(`  ${msg}`)
        fellBack.push(msg)
      }
      console.log(`  ${out}/${slug}`)
    }
  }

  if (fellBack.length) {
    console.warn(`\n${fellBack.length} image(s) needed the size-budget fallback:`)
    for (const m of fellBack) console.warn(`  - ${m}`)
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
