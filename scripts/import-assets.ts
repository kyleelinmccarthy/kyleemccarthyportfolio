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
  /** One directory, or several when the art is spread across repos. */
  dir: string | string[]
  /** [sourceFile, outputName] */
  files: Array<[string, string]>
}

const KC = '//wsl.localhost/Ubuntu/home/kylee/projects/kingdoms-and-crowns/public/marketing/screens/r2'

const ELIMINATED_CAPSULES = 'E:/codeProjects/EliminatedGame/EliminatedGame/marketing/steam-capsule/steam'
const ELIMINATED_SHOTS = 'E:/codeProjects/eliminated-site/src/assets/screenshots'
const JIMOTHY_CAPSULES =
  'E:/codeProjects/Jimothy-the-raccoon/.claude/worktrees/dev/Captures/key-art-refs/steam-capsules/alley'

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
  {
    slug: 'eliminated',
    dir: [ELIMINATED_CAPSULES, ELIMINATED_SHOTS],
    files: [
      ['header_capsule_920x430.png', 'hero'],
      ['RedLight-1.webp', 'red-light'],
      ['GlassBridge-1.webp', 'glass-bridge'],
      ['KeepyUppy-1.webp', 'keepy-uppy'],
      ['Mingle-1.webp', 'mingle'],
      ['MusicalChairs-1.webp', 'musical-chairs'],
      ['PropHunt-1.webp', 'prop-hunt'],
      ['SimonSays-1.webp', 'simon-says'],
      ['Tag-1.webp', 'tag'],
      ['TugOfWar-1.webp', 'tug-of-war'],
    ],
  },
  {
    slug: 'jimothy-and-pidge',
    dir: JIMOTHY_CAPSULES,
    files: [
      ['header_capsule_920x430.png', 'hero'],
      ['main_capsule_1232x706.png', 'main'],
    ],
  },
]

async function main() {
  const report = new LadderReport()

  for (const s of SOURCES) {
    const dirs = Array.isArray(s.dir) ? s.dir : [s.dir]
    const present = dirs.filter((d) => existsSync(d))
    for (const d of dirs) if (!present.includes(d)) console.warn(`  source missing for ${s.slug}: ${d}`)
    if (present.length === 0) continue

    const outDir = resolve(process.cwd(), 'public/media', s.slug)
    mkdirSync(outDir, { recursive: true })

    for (const [file, name] of s.files) {
      const dir = present.find((d) => existsSync(join(d, file)))
      if (!dir) {
        console.warn(`  missing ${s.slug}/${file}`)
        continue
      }

      const result = await generateWithFallback(join(dir, file), outDir, name)
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
