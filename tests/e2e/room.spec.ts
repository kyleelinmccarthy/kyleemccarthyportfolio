import { test, expect } from '@playwright/test'
import { rooms } from '@/content/rooms'
import { journey } from '@/content/journey'
import { room } from '@/content/room'

// Read the door's words from content. Pinning them here meant every reword
// broke three tests that were never about the wording.
const doorName = new RegExp(rooms.wayOut.door.label, 'i')

test('the door is a real link and reaches the room', async ({ page }) => {
  await page.goto('/')
  const door = page.getByRole('link', { name: doorName })
  await expect(door).toHaveAttribute('href', '/room')
})

test('the door is the last beat of the home scroll only, not part of /connect', async ({ page }) => {
  // The home journey's WayOutRoom and the standalone /connect route both
  // render journey.talk's copy, but only WayOutRoom includes the door (spec
  // §5) — on /connect it would land mid-page between the copy and the form.
  await page.goto('/')
  await expect(page.getByRole('link', { name: doorName })).toHaveCount(1)

  await page.goto('/connect')
  // Proxy for "the talk copy did render here" — so the assertion below proves
  // the door is absent, not merely that the whole page failed to render.
  await expect(page.getByRole('heading', { name: journey.talk.heading })).toBeVisible()
  await expect(page.getByRole('link', { name: doorName })).toHaveCount(0)
})

test('the door’s accessible name contains its visible text (WCAG 2.5.3)', async ({ page }) => {
  await page.goto('/')
  const door = page.getByRole('link', { name: doorName })
  const visible = rooms.wayOut.door.label.toLowerCase()
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

  // The library shelves its nine as books rather than laying them out as
  // cards, so the count here is spines, not articles.
  await page.goto('/room')
  await expect(page.getByRole('button', { name: 'Kingdoms & Crowns' })).toBeVisible()
  await expect(page.getByRole('button', { name: '403HQ' })).toHaveCount(0)
})

test('the room renders its sections', async ({ page }) => {
  await page.goto('/room')
  // Read the headings from content. Pinned strings here broke on a reword
  // that had nothing to do with whether the sections render.
  for (const heading of [room.projects.heading, room.art.heading, room.offTheClock.heading]) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  // The tattoo flash had a room of its own, which made it look like a separate
  // career rather than one more thing she draws. It is a volume on the art
  // shelf now, so it is a book you can take down, not a section heading.
  await expect(page.getByRole('button', { name: room.tattoo.heading })).toBeVisible()
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
