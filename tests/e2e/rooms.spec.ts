import { test, expect } from '@playwright/test'
import { rooms } from '@/content/rooms'

test('the welcome is readable with animations disabled', async ({ browser }) => {
  // The door opening must never gate the content behind it.
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByText(/come on in/i).first()).toBeVisible()
  await context.close()
})

test('the window states all three principles on the home page', async ({ page }) => {
  await page.goto('/')
  // Read from content rather than hardcoding: this test pinned the old heading
  // and broke the moment the copy was reworded, which tells you nothing useful.
  // What actually matters is that whatever the window says, it all renders.
  await expect(page.getByRole('heading', { name: rooms.window.heading })).toBeAttached()
  for (const principle of rooms.window.principles) {
    await expect(page.getByText(principle.title, { exact: true })).toBeAttached()
  }
})

// The Floor renders inside the scroll-driven journey, so at initial load its
// RevealOnActive content sits at opacity 0 until that scene becomes active —
// scrolling the camera there is what the cinematic mode requires. Reduced
// motion sidesteps that: it falls back to plain stacked sections with no
// opacity gating, so the floor's content is genuinely visible without
// simulating the scroll-driven camera move.
test('the floor names all seven featured pieces', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  for (const name of [
    'Beacon', '403HQ', 'AURA', 'NBS Website',
    'Kingdoms & Crowns', 'ChemTreeHQ', 'The Wretched Few',
  ]) {
    await expect(page.getByRole('heading', { name, level: 3 })).toBeVisible()
  }
  await context.close()
})

test('the mailbox takes a letter and has no inquiry dropdown', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: /inquiry|type/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /send|post/i })).toBeVisible()
})

// The jsdom unit test (tests/unit/Placard.test.tsx) checks the same disclosure,
// but jsdom's handling of the closed-<details> UA stylesheet is not something
// to take on faith — this is the real browser applying the real stylesheet.
test('a placard is closed until its summary is activated', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  const placard = page.locator('details').first()
  const summary = placard.locator('summary')
  const threwAway = placard.locator('dd').nth(1)
  await expect(summary).toHaveText(/what went wrong/i)
  await expect(threwAway).toBeHidden()
  await summary.click()
  await expect(threwAway).toBeVisible()
  await context.close()
})

test('the door comes toward you as you scroll into it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.waitForTimeout(1200)

  const doorWidth = async () =>
    page.evaluate(() => {
      const el = document.querySelector('[style*="perspective"]')
      return el ? Math.round(el.getBoundingClientRect().width) : 0
    })

  const atRest = await doorWidth()
  await page.evaluate(() => window.scrollTo(0, 1400))
  await page.waitForTimeout(700)
  const approached = await doorWidth()

  // Walking up to a door means it gets bigger. Without the scene-progress
  // scale this is a static image you scroll past, which is what it was.
  expect(atRest).toBeGreaterThan(0)
  expect(approached).toBeGreaterThan(atRest * 2)
})
