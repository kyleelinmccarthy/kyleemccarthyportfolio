/**
 * Captures dnd4noobs, the learn-to-play D&D app, into
 * public/media/dnd4noobs/{hero,learn,create,adventure}.jpg, for that
 * project's gallery.
 *
 * dnd4noobs is invite-only, so this shoots a local copy of the app (from its
 * own repository, without switching branches: `npx wrangler d1 migrations
 * apply dnd4noobs --local`, then `npm run dev`, which listens on :3210), then:
 *
 *   npm run capture:dnd4noobs [-- http://localhost:3210 [learn,create]]
 *
 * The optional second argument is a comma-separated list of shots to redo.
 * All four pages work signed out, so no account is needed and nothing from a
 * real profile can show. If that ever changes, a sign-in step would need
 * adding here (credentials from the environment, never a committed file).
 * Every hero name typed here is made up. Look at every
 * picture before adding it to the gallery: no real names, no email addresses.
 *
 * Encoding goes through scripts/lib/imageLadder.ts, as the other capture and
 * import scripts do, so each picture gets the same size budget.
 */
import { chromium, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateWithFallback, LadderReport } from './lib/imageLadder'

const BASE = process.argv[2] ?? 'http://localhost:3210'
const ONLY = process.argv[3]?.split(',')
const VIEWPORT = { width: 1600, height: 1000 }
/** A made-up hero name; nothing that could be a real child's. */
const HERO_NAME = 'Demo Player'

type Shot = { name: string; path: string; prepare?: (page: Page) => Promise<void> }

/** Builds a Bard through the hero builder and stops on the Name step with the made-up name typed in. */
async function buildHeroToName(page: Page) {
  const next = page.getByRole('button', { name: /^Next →/ })
  const cards = () => page.locator('main button')
  /** Clicks the first choice card of the current step (the ones after the step tabs). */
  const pickFirstCard = async () => {
    const texts = await cards().allInnerTexts()
    const afterTabs = texts.findIndex((t) => /9\s*Done/.test(t)) + 1
    await cards().nth(afterTabs).click()
  }
  await page.getByText('Bard', { exact: true }).first().click()
  await next.click()
  await page.getByText('Criminal', { exact: true }).click() // Background (no extra spell picks)
  await next.click()
  await page.getByText('Dwarf', { exact: true }).click() // Species
  await next.click()
  // Abilities: the standard set is the default; give each ability a different number, then the two bonuses.
  const selects = page.locator('main select')
  for (let i = 0; i < 6; i++) await selects.nth(i).selectOption({ index: i + 1 })
  await selects.nth(6).selectOption({ index: 1 })
  await selects.nth(7).selectOption({ index: 2 })
  await next.click()
  // Skills: three of the choices.
  for (const skill of ['acrobatics', 'deception', 'performance']) {
    await page.locator('main button', { hasText: new RegExp(`^${skill}`) }).click()
  }
  await next.click()
  // Gear and Spells: take the first offer on each until the Name step.
  for (let i = 0; i < 4; i++) {
    if (await page.locator('main input[type=text], main input:not([type])').first().isVisible().catch(() => false)) break
    await page.waitForTimeout(400)
    if (await next.isDisabled()) {
      // Spells: the 1st-level group is the second fieldset; pick its first four.
      const cantrips = page.locator('main fieldset').nth(0).locator('button')
      for (let k = 0; k < 2; k++) await cantrips.nth(k).click()
      const firstLevel = page.locator('main fieldset').nth(1).locator('button')
      for (let k = 0; k < 4; k++) await firstLevel.nth(k).click()
    }
    await next.click({ timeout: 4000 })
    await page.waitForTimeout(500)
  }
  await page.locator('main input[type=text], main input:not([type])').first().fill(HERO_NAME)
  await page.waitForTimeout(600)
  // Reframe: drop the footer, then scroll so the Detail bar, step bar and Name card sit
  // in view with a little room above (the site header is off-screen).
  await page.addStyleTag({ content: 'footer { display: none !important; } main { padding-bottom: 700px !important; }' })
  const detail = page.getByText('Rules', { exact: true }).first()
  const box = await detail.boundingBox()
  if (box) await page.evaluate((dy) => window.scrollBy(0, dy), box.y - 50)
  await page.waitForTimeout(500)
}

/** Picks the pregenerated Bruna (a made-up hero) and plays on to a scene mid-adventure. */
async function playIntoAdventure(page: Page) {
  await page.getByText(/Bruna/).click()
  await page.waitForTimeout(1500)
  const go = page.getByRole('button', { name: /^Continue →/ })
  await go.click()
  await page.waitForTimeout(800)
}

/** Rolls the d20 so the lesson shows a result rather than the empty pre-roll card. */
async function rollTheDie(page: Page) {
  await page.getByRole('button', { name: /Roll 1d20/ }).click()
  await page.waitForTimeout(2500)
}

const SHOTS: Shot[] = [
  { name: 'hero', path: '/' },
  { name: 'learn', path: '/learn/meet-the-d20', prepare: rollTheDie },
  { name: 'create', path: '/create', prepare: buildHeroToName },
  { name: 'adventure', path: '/tutorials/lost-lute/play', prepare: playIntoAdventure },
]

async function main() {
  const outDir = resolve(process.cwd(), 'public/media/dnd4noobs')
  mkdirSync(outDir, { recursive: true })
  const report = new LadderReport()
  const browser = await chromium.launch()
  try {
    for (const shot of SHOTS) {
      if (ONLY && !ONLY.includes(shot.name)) continue
      // A fresh context each time: no cookies, so no signed-in profile can show.
      const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
      const page = await context.newPage()
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'load', timeout: 120_000 })
      await page.waitForTimeout(3000)
      // Hide the dev server's own overlay button.
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
      if (shot.prepare) await shot.prepare(page)
      await page.mouse.move(VIEWPORT.width - 5, 5)
      const raw = await page.screenshot({ clip: { x: 0, y: 0, ...VIEWPORT } })
      const result = await generateWithFallback(raw, outDir, shot.name)
      report.record(`dnd4noobs/${shot.name}`, result)
      console.log(`  saved dnd4noobs/${shot.name}`)
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
