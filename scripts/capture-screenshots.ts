/**
 * Captures hero screenshots of the public project sites into
 * public/media/<slug>/hero.{avif,webp,jpg}.
 *
 *   npx playwright install chromium
 *   npm run capture:screenshots
 */
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { projects } from '../content/projects'

const WIDTH = 1600

async function main() {
  const targets = projects.filter((p) => p.autoCapture && p.liveUrl)
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
      const base = sharp(raw).resize(WIDTH, null, { withoutEnlargement: true })
      await base.clone().avif({ quality: 55 }).toFile(join(outDir, 'hero.avif'))
      await base.clone().webp({ quality: 72 }).toFile(join(outDir, 'hero.webp'))
      await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(join(outDir, 'hero.jpg'))
      console.log(`  saved ${p.slug}/hero`)
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
