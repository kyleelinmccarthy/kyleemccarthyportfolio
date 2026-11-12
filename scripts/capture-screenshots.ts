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
 *   npm run capture:screenshots            # every autoCapture project
 *   npm run capture:screenshots -- the-budget tiny-frenzy-games   # only these
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { projects } from '../content/projects'
import { generateWithFallback, LadderReport } from './lib/imageLadder'

async function main() {
  // Optional slugs on the command line limit the run; none means every target.
  const only = process.argv.slice(2)
  const targets = projects.filter(
    (p) => p.autoCapture && p.liveUrl && (only.length === 0 || only.includes(p.slug))
  )
  const unknown = only.filter((slug) => !targets.some((p) => p.slug === slug))
  if (unknown.length > 0) console.warn(`  not capturable, ignored: ${unknown.join(', ')}`)
  const report = new LadderReport()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })

  for (const p of targets) {
    try {
      console.log(`Capturing ${p.name} -> ${p.liveUrl}`)
      await page.goto(p.liveUrl!, { waitUntil: 'networkidle', timeout: 45_000 })
      if (p.captureClick) {
        await page.getByRole('button', { name: p.captureClick, exact: true }).click()
        await page.waitForLoadState('networkidle')
        // A demo entered from a login screen loads its data client-side after the
        // click settles, so give it longer than a static page to leave its spinner.
        await page.waitForTimeout(5000)
      }
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
