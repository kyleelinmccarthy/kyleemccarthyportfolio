/**
 * Captures hero screenshots of the public project sites into
 * public/media/<slug>/hero.jpg.
 *
 * Encoding goes through scripts/lib/imageLadder.ts, the same ladder the two
 * import scripts use, so a captured hero gets the 250KB budget check and the
 * per-file step-down fallback rather than a hardcoded copy of STEPS[0] with no
 * budget enforced at all.
 *
 *   npx playwright install chromium
 *   npm run capture:screenshots
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { projects } from '../content/projects'
import { generateWithFallback, LadderReport } from './lib/imageLadder'

async function main() {
  const targets = projects.filter((p) => p.autoCapture && p.liveUrl)
  const report = new LadderReport()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })

  for (const p of targets) {
    try {
      console.log(`Capturing ${p.name} -> ${p.liveUrl}`)
      await page.goto(p.liveUrl!, { waitUntil: 'networkidle', timeout: 45_000 })
      await page.waitForTimeout(1500)
      const raw = await page.screenshot({ clip: { x: 0, y: 0, width: 1600, height: 1000 } })

      const outDir = resolve(process.cwd(), 'public/media', p.slug)
      mkdirSync(outDir, { recursive: true })

      const result = await generateWithFallback(raw, outDir, 'hero')
      report.record(`${p.slug}/hero`, result)
      console.log(`  saved ${p.slug}/hero`)
    } catch (e) {
      console.warn(`  skipped ${p.name}:`, (e as Error).message)
    }
  }

  await browser.close()
  report.print()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
