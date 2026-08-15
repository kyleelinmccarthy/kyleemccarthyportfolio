/**
 * Shared spec/quality/size ladder for the image import scripts
 * (import-art.ts, import-assets.ts): a single source of truth so a future
 * tuning of the quality/size budget only needs to be edited once, with
 * nothing to catch drift if a caller is missed.
 */
import { statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

export interface Step {
  width: number
  avif: number
  webp: number
  jpeg: number
}

/** Per-file budget (avif/webp/jpeg each) that spec output must clear. */
export const MAX_BYTES = 250 * 1024

/**
 * Spec width/quality first, then progressively smaller/lower-quality steps
 * used ONLY for the rare source file whose output still exceeds the 250KB
 * budget at spec (dense photographic noise/texture compresses far worse than
 * flat-color art or clean UI screenshots). Each file is generated at the
 * first step whose three outputs all clear the budget, so the vast majority
 * ship at full 1600px/spec quality and only the outliers degrade.
 */
export const STEPS: Step[] = [
  { width: 1600, avif: 55, webp: 72, jpeg: 78 },
  { width: 1400, avif: 48, webp: 60, jpeg: 68 },
  { width: 1280, avif: 40, webp: 50, jpeg: 58 },
  { width: 1150, avif: 35, webp: 40, jpeg: 48 },
  { width: 1024, avif: 30, webp: 32, jpeg: 40 },
]

export interface GenerateOptions {
  /** Apply EXIF-orientation rotation before resizing (needed for phone photos). */
  rotate?: boolean
  /** Passed through to sharp()'s input options, e.g. 'none' to relax strict decode. */
  failOn?: 'none'
}

export interface FallbackResult {
  paths: string[]
  stepIndex: number
  step: Step
  maxBytes: number
}

async function generateAtStep(
  src: string,
  outDir: string,
  name: string,
  step: Step,
  options: GenerateOptions
): Promise<string[]> {
  let pipeline = sharp(src, options.failOn ? { failOn: options.failOn } : {})
  if (options.rotate) pipeline = pipeline.rotate()
  const base = pipeline.resize(step.width, null, { withoutEnlargement: true })
  const paths = [
    join(outDir, `${name}.avif`),
    join(outDir, `${name}.webp`),
    join(outDir, `${name}.jpg`),
  ]
  await base.clone().avif({ quality: step.avif }).toFile(paths[0])
  await base.clone().webp({ quality: step.webp }).toFile(paths[1])
  await base.clone().jpeg({ quality: step.jpeg, mozjpeg: true }).toFile(paths[2])
  return paths
}

function maxSize(paths: string[]): number {
  return Math.max(...paths.map((p) => statSync(p).size))
}

/**
 * Generates avif/webp/jpg for `src` at the first STEPS entry whose largest
 * output clears MAX_BYTES, starting at spec (STEPS[0]) and stepping down
 * only as needed. Returns the written paths plus which step was used, so the
 * caller can log any file that fell back (by name) and stop at the first
 * passing step rather than always applying a global downscale.
 */
export async function generateWithFallback(
  src: string,
  outDir: string,
  name: string,
  options: GenerateOptions = {}
): Promise<FallbackResult> {
  let stepIndex = 0
  let paths = await generateAtStep(src, outDir, name, STEPS[stepIndex], options)
  while (maxSize(paths) > MAX_BYTES && stepIndex < STEPS.length - 1) {
    stepIndex += 1
    paths = await generateAtStep(src, outDir, name, STEPS[stepIndex], options)
  }
  return { paths, stepIndex, step: STEPS[stepIndex], maxBytes: maxSize(paths) }
}

/** Human-readable log line for a file whose output stepped down from spec. */
export function fallbackMessage(label: string, result: FallbackResult): string {
  const { step, stepIndex, maxBytes } = result
  const kb = Math.round(maxBytes / 1024)
  return `${label}: exceeded 250KB at spec (1600px), fell back to step ${stepIndex} (${step.width}px, avif${step.avif}/webp${step.webp}/jpeg${step.jpeg}) — largest output ${kb}KB`
}
