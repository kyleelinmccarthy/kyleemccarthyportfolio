/**
 * Captures the Realm, the 3D game in Kingdoms & Crowns, into
 * public/media/kingdoms-and-crowns/realm-*.jpg, for that project's gallery.
 *
 * The Realm runs in the Kingdoms & Crowns app, not on a public site, so this
 * shoots a local copy of that app running in its demo mode, where every
 * person in it is a demo persona. Start its dev server in demo mode first
 * (from that repository, without switching branches: `DEMO_MODE=true npx next
 * dev -p 3001`), then:
 *
 *   REALM_PERSONAS=<first>,<second> npm run capture:realm [-- http://localhost:3001]
 *
 * REALM_PERSONAS are the values of the app's `demo_persona` cookie for its two
 * demo heroes (the child personas, never the grown-up one, so no "visiting"
 * banner shows); they are read from the environment because they are that
 * app's business, not this site's. The first hero's Realm is shot as it
 * opens and after a short walk; the second's after mounting up and riding a
 * little way. Look at every picture before adding it to the gallery: only
 * demo names may show.
 *
 * Encoding goes through scripts/lib/imageLadder.ts, as the other capture and
 * import scripts do, so each picture gets the same size budget.
 */
import { chromium, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateWithFallback, LadderReport } from './lib/imageLadder'

const BASE = process.argv[2] ?? 'http://localhost:3001'
const VIEWPORT = { width: 1600, height: 1000 }
/** How long the Realm gets to load its world and settle once its canvas is up. */
const SETTLE_MS = 10_000

type Action = (page: Page) => Promise<void>

/** Holds `key` down for `ms`, as a player walking does, then lets the world settle. */
const hold =
  (key: string, ms: number): Action =>
  async (page) => {
    await page.keyboard.down(key)
    await page.waitForTimeout(ms)
    await page.keyboard.up(key)
    await page.waitForTimeout(1500)
  }

/** Presses `key` once and waits for what it sets off. */
const press =
  (key: string, ms = 2000): Action =>
  async (page) => {
    await page.keyboard.press(key)
    await page.waitForTimeout(ms)
  }

/** The shots: which hero (0 or 1 of REALM_PERSONAS), what they do first, and the file's name. */
const SHOTS: Array<{ hero: 0 | 1; name: string; actions: Action[] }> = [
  { hero: 0, name: 'realm-village', actions: [] },
  { hero: 0, name: 'realm-fields', actions: [hold('w', 3500)] },
  { hero: 1, name: 'realm-ride', actions: [press('m'), hold('d', 1200), hold('w', 2500)] },
]

async function main() {
  const personas = (process.env.REALM_PERSONAS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (personas.length < 2) {
    throw new Error('Set REALM_PERSONAS to the two demo heroes’ `demo_persona` cookie values (see the comment at the top of this script).')
  }
  const host = new URL(BASE).hostname
  const outDir = resolve(process.cwd(), 'public/media/kingdoms-and-crowns')
  mkdirSync(outDir, { recursive: true })
  const report = new LadderReport()
  const browser = await chromium.launch()
  try {
    for (const shot of SHOTS) {
      const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
      await context.addCookies([{ name: 'demo_persona', value: personas[shot.hero], domain: host, path: '/', sameSite: 'Lax' }])
      const page = await context.newPage()
      await page.goto(`${BASE}/realm`, { waitUntil: 'load', timeout: 120_000 })
      // The 3D scene is up once its canvas is; then the world streams in and the camera settles behind the hero.
      await page.waitForSelector('canvas', { timeout: 120_000 })
      await page.waitForTimeout(SETTLE_MS)
      // A click on the world gives it the keyboard.
      await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height * 0.7)
      for (const act of shot.actions) await act(page)
      const raw = await page.screenshot({ clip: { x: 0, y: 0, ...VIEWPORT } })
      const result = await generateWithFallback(raw, outDir, shot.name)
      report.record(`kingdoms-and-crowns/${shot.name}`, result)
      console.log(`  saved kingdoms-and-crowns/${shot.name}`)
      await context.close()
    }
  } finally {
    await browser.close()
  }
  report.print()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
