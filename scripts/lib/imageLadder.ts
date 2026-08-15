/**
 * Shared spec/quality/size ladder for the image import scripts
 * (import-art.ts, import-assets.ts, capture-screenshots.ts): a single source
 * of truth so a future tuning of the quality/size budget only needs to be
 * edited once, with nothing to catch drift if a caller is missed.
 *
 * JPEG is the only committed format. `next/image` re-encodes to AVIF/WebP at
 * request time from whatever the `src` points at (see next.config.mjs
 * `images.formats`), and every `src` in the app points at a `.jpg` — so
 * committing AVIF and WebP siblings shipped megabytes that nothing could ever
 * request.
 */
import { statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

export interface Step {
  width: number
  jpeg: number
}

/** Per-file budget that the committed JPEG must clear. */
export const MAX_BYTES = 250 * 1024

/**
 * Spec width/quality first, then progressively smaller/lower-quality steps
 * used ONLY for the rare source file whose output still exceeds the 250KB
 * budget at spec (dense photographic noise/texture compresses far worse than
 * flat-color art or clean UI screenshots). Each file is generated at the
 * first step whose output clears the budget, so the vast majority ship at
 * full 1600px/spec quality and only the outliers degrade.
 */
export const STEPS: Step[] = [
  { width: 1600, jpeg: 78 },
  { width: 1400, jpeg: 68 },
  { width: 1280, jpeg: 58 },
  { width: 1150, jpeg: 48 },
  { width: 1024, jpeg: 40 },
]

/**
 * A file path, or raw image bytes. capture-screenshots.ts has a Playwright
 * screenshot Buffer rather than a file on disk, and routing it through the
 * ladder is what gives it the budget check the other two callers get.
 */
export type ImageSource = string | Buffer

export interface GenerateOptions {
  /** Apply EXIF-orientation rotation before resizing (needed for phone photos). */
  rotate?: boolean
  /** Passed through to sharp()'s input options, e.g. 'none' to relax strict decode. */
  failOn?: 'none'
}

export interface FallbackResult {
  path: string
  stepIndex: number
  step: Step
  bytes: number
  /** Width actually written. Below `step.width` when the source was smaller. */
  width: number
}

async function generateAtStep(
  src: ImageSource,
  outDir: string,
  name: string,
  step: Step,
  options: GenerateOptions
): Promise<{ path: string; width: number }> {
  let pipeline = sharp(src, options.failOn ? { failOn: options.failOn } : {})
  if (options.rotate) pipeline = pipeline.rotate()
  const path = join(outDir, `${name}.jpg`)
  const info = await pipeline
    .resize(step.width, null, { withoutEnlargement: true })
    .jpeg({ quality: step.jpeg, mozjpeg: true })
    .toFile(path)
  return { path, width: info.width }
}

/**
 * Generates `<name>.jpg` for `src` at the first STEPS entry whose output
 * clears MAX_BYTES, starting at spec (STEPS[0]) and stepping down only as
 * needed. Returns the written path plus which step was used and the width
 * actually written, so the caller can log any file that fell back (by name)
 * or that shipped narrower than the target, and stop at the first passing
 * step rather than always applying a global downscale.
 */
export async function generateWithFallback(
  src: ImageSource,
  outDir: string,
  name: string,
  options: GenerateOptions = {}
): Promise<FallbackResult> {
  let stepIndex = 0
  let out = await generateAtStep(src, outDir, name, STEPS[stepIndex], options)
  while (statSync(out.path).size > MAX_BYTES && stepIndex < STEPS.length - 1) {
    stepIndex += 1
    out = await generateAtStep(src, outDir, name, STEPS[stepIndex], options)
  }
  return {
    path: out.path,
    stepIndex,
    step: STEPS[stepIndex],
    bytes: statSync(out.path).size,
    width: out.width,
  }
}

/**
 * Collects the per-file exceptions across a run and prints one grouped
 * summary at the end. Shared so all three import scripts report the same
 * things the same way — the drift this module exists to prevent.
 */
export class LadderReport {
  private fellBack: string[] = []
  private underTarget: string[] = []
  private overBudget: string[] = []

  /** Records (and immediately warns about) anything notable in one result. */
  record(label: string, result: FallbackResult): void {
    const { step, stepIndex, bytes, width } = result
    const kb = Math.round(bytes / 1024)

    if (stepIndex > 0) {
      this.push(
        this.fellBack,
        `${label}: exceeded 250KB at spec (${STEPS[0].width}px), fell back to step ${stepIndex} (${step.width}px, jpeg${step.jpeg}) — output ${kb}KB`
      )
    }
    // withoutEnlargement: a source narrower than the target is written at its
    // own width rather than upscaled. That is correct — upscaling invents
    // detail — but it silently ships under spec, so name the file.
    if (width < step.width) {
      this.push(
        this.underTarget,
        `${label}: source narrower than target — shipped at ${width}px, under the ${step.width}px target`
      )
    }
    if (bytes > MAX_BYTES) {
      this.push(
        this.overBudget,
        `${label}: STILL over the 250KB budget at the smallest step (${step.width}px, jpeg${step.jpeg}) — ${kb}KB`
      )
    }
  }

  private push(bucket: string[], message: string): void {
    console.warn(`  ${message}`)
    bucket.push(message)
  }

  /** Prints the grouped summary. Returns true if anything blew the budget. */
  print(): boolean {
    const groups: Array<[string[], string]> = [
      [this.fellBack, 'needed the size-budget fallback'],
      [this.underTarget, 'shipped below the target width'],
      [this.overBudget, 'are over the 250KB budget at every step'],
    ]
    for (const [bucket, heading] of groups) {
      if (!bucket.length) continue
      console.warn(`\n${bucket.length} image(s) ${heading}:`)
      for (const m of bucket) console.warn(`  - ${m}`)
    }
    return this.overBudget.length > 0
  }
}
