/**
 * Copies and downsizes art out of sibling project repos into public/media/<slug>/.
 * Committed output keeps the build independent of a WSL mount or a Unity repo.
 *
 *   npm run import:assets
 */
import { existsSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { generateWithFallback, LadderReport } from './lib/imageLadder'

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

async function main() {
  const report = new LadderReport()

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

      const result = await generateWithFallback(src, outDir, name)
      report.record(`${s.slug}/${name}`, result)
      console.log(`  ${s.slug}/${name}`)
    }
  }

  report.print()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
