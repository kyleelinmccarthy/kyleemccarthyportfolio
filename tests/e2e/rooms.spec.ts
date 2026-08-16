import { test, expect } from '@playwright/test'

test('the welcome is readable with animations disabled', async ({ browser }) => {
  // The door opening must never gate the content behind it.
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByText(/come in/i)).toBeVisible()
  await context.close()
})

test('the window states all three principles on the home page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /how i go about it/i })).toBeAttached()
  for (const title of ['Keep moving', 'Nothing is sacred', 'AI is a tool, not the problem']) {
    await expect(page.getByText(title, { exact: true })).toBeAttached()
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
