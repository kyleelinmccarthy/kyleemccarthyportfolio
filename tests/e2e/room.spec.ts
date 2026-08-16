import { test, expect } from '@playwright/test'

test('the door is a real link and reaches the room', async ({ page }) => {
  await page.goto('/')
  const door = page.getByRole('link', { name: /another room/i })
  await expect(door).toHaveAttribute('href', '/room')
})

test('the door is the last beat of the home scroll only, not part of /connect', async ({ page }) => {
  // The home journey's WayOutRoom and the standalone /connect route both
  // render journey.talk's copy, but only WayOutRoom includes the door (spec
  // §5) — on /connect it would land mid-page between the copy and the form.
  await page.goto('/')
  await expect(page.getByRole('link', { name: /another room/i })).toHaveCount(1)

  await page.goto('/connect')
  // Proxy for "the talk copy did render here" — so the assertion below proves
  // the door is absent, not merely that the whole page failed to render.
  await expect(page.getByRole('heading', { name: /go poke around/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /another room/i })).toHaveCount(0)
})

test('the door’s accessible name contains its visible text (WCAG 2.5.3)', async ({ page }) => {
  await page.goto('/')
  const door = page.getByRole('link', { name: /another room/i })
  const visible = 'there is another room'
  const accessible = ((await door.getAttribute('aria-label')) ?? '').toLowerCase()
  // Voice control activates by the label the user can read. axe cannot catch
  // this — label-content-name-mismatch ships disabled/experimental. Compared
  // case-insensitively because the label is uppercased in CSS, which
  // text-transform does not change for the accessibility tree.
  expect((await door.innerText()).toLowerCase()).toContain(visible)
  expect(accessible.startsWith(visible), `aria-label was "${accessible}"`).toBe(true)
})

test('/work shows the 8 professional builds and /room the 9 personal ones', async ({ page }) => {
  await page.goto('/work')
  await expect(page.locator('main article')).toHaveCount(8)
  await expect(page.getByRole('heading', { name: 'Kingdoms & Crowns', level: 3 })).toHaveCount(0)

  await page.goto('/room')
  await expect(page.locator('main article')).toHaveCount(9)
  await expect(page.getByRole('heading', { name: '403HQ', level: 3 })).toHaveCount(0)
})

test('the room renders its sections', async ({ page }) => {
  await page.goto('/room')
  await expect(page.getByRole('heading', { name: /built after hours/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /things I draw/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /tattoo flash/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /off the clock/i })).toBeVisible()
})

test('the room refers to family generically', async ({ page }) => {
  await page.goto('/room')
  const text = (await page.locator('main').innerText()).toLowerCase()
  // The spec's privacy constraint: relationships, never names. This pins the
  // intended vocabulary so a later copy edit that swaps in a name gets caught
  // by the missing generic phrase.
  expect(text).toContain('my kids')
  expect(text).toContain('my husband')
  expect(text).toContain('my daughter')
})
