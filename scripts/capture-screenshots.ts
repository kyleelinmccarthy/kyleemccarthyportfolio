/**
 * Captures optimized screenshots of the public project sites into
 * public/screenshots/<file>. ProjectVisual auto-uses them when present and
 * falls back to abstract panels otherwise.
 *
 * Requires Playwright browsers + system deps:
 *   npx playwright install --with-deps chromium
 *   npm run capture:screenshots
 */
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { resolve } from 'node:path'
import { projects } from '../content/projects'

const OUT_DIR = resolve(process.cwd(), 'public/screenshots')

async function main() {
  const targets = projects.filter((p) => p.liveUrl && p.screenshot)
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  for (const p of targets) {
    try {
      console.log(`Capturing ${p.name} → ${p.liveUrl}`)
      await page.goto(p.liveUrl!, { waitUntil: 'networkidle', timeout: 45_000 })
      await page.waitForTimeout(1500)
      const raw = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } })
      await sharp(raw)
        .resize(1280, 800, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(resolve(OUT_DIR, p.screenshot!))
      console.log(`  saved ${p.screenshot}`)
    } catch (e) {
      console.warn(`  skipped ${p.name}:`, (e as Error).message)
    }
  }

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
