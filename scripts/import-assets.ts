/**
 * Copies and downsizes art out of sibling project repos into public/media/<slug>/.
 * Committed output keeps the build independent of a WSL mount or a Unity repo.
 *
 *   npm run import:assets
 */
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import sharp from 'sharp'

interface Source {
  slug: string
  dir: string
  /** [sourceFile, outputName] */
  files: Array<[string, string]>
}

const KC = '//wsl.localhost/Ubuntu/home/kylee/projects/kingdoms-and-crowns/public/marketing/screens/r2'

const SOURCES: Source[] = [
  {
    slug: 'kingdoms-and-crowns',
    dir: KC,
    files: [
      ['hero-my-quests.jpg', 'hero'],
      ['hero-my-castle.jpg', 'castle'],
      ['hero-my-tavern.jpg', 'tavern'],
      ['hero-my-trophies.jpg', 'trophies'],
      ['hero-ranks.jpg', 'ranks'],
      ['parent-quest-giver.jpg', 'quest-giver'],
      ['parent-hall-of-legends.jpg', 'hall-of-legends'],
    ],
  },
  // The Wretched Few is added in Task 11, gated on approval to publish
  // pre-release art from a project with a co-owner.
]

const MAX_BYTES = 250 * 1024

/**
 * Spec width/quality first, then progressively smaller/lower-quality steps
 * used ONLY for the rare source file whose output still exceeds the 250KB
 * budget at spec. Each file is generated at the first step whose three
 * outputs all clear the budget, so the vast majority ship at full
 * 1600px/spec quality and only the outliers degrade.
 */
const STEPS = [
  { width: 1600, avif: 55, webp: 72, jpeg: 78 },
  { width: 1400, avif: 48, webp: 60, jpeg: 68 },
  { width: 1280, avif: 40, webp: 50, jpeg: 58 },
  { width: 1150, avif: 35, webp: 40, jpeg: 48 },
  { width: 1024, avif: 30, webp: 32, jpeg: 40 },
]

async function generateAtStep(
  src: string,
  outDir: string,
  name: string,
  step: (typeof STEPS)[number]
): Promise<string[]> {
  const base = sharp(src).resize(step.width, null, { withoutEnlargement: true })
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

async function main() {
  const fellBack: string[] = []

  for (const s of SOURCES) {
    if (!existsSync(s.dir)) {
      console.warn(`  source missing, skipping ${s.slug}: ${s.dir}`)
      continue
    }
    const outDir = resolve(process.cwd(), 'public/media', s.slug)
    mkdirSync(outDir, { recursive: true })

    for (const [file, name] of s.files) {
      const src = join(s.dir, file)
      if (!existsSync(src)) {
        console.warn(`  missing ${s.slug}/${file}`)
        continue
      }

      let stepIndex = 0
      let paths = await generateAtStep(src, outDir, name, STEPS[stepIndex])
      while (maxSize(paths) > MAX_BYTES && stepIndex < STEPS.length - 1) {
        stepIndex += 1
        paths = await generateAtStep(src, outDir, name, STEPS[stepIndex])
      }

      if (stepIndex > 0) {
        const step = STEPS[stepIndex]
        const kb = Math.round(maxSize(paths) / 1024)
        const msg = `${s.slug}/${name}: exceeded 250KB at spec (1600px), fell back to step ${stepIndex} (${step.width}px, avif${step.avif}/webp${step.webp}/jpeg${step.jpeg}) — largest output ${kb}KB`
        console.warn(`  ${msg}`)
        fellBack.push(msg)
      }
      console.log(`  ${s.slug}/${name}`)
    }
  }

  if (fellBack.length) {
    console.warn(`\n${fellBack.length} image(s) needed the size-budget fallback:`)
    for (const m of fellBack) console.warn(`  - ${m}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
