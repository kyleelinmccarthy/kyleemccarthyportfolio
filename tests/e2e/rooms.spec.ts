import { test, expect } from '@playwright/test'
import { rooms } from '@/content/rooms'
import { FEATURED } from '@/content/caseStudies'
import { projects } from '@/content/projects'

test('the welcome is readable with animations disabled', async ({ browser }) => {
  // The door opening must never gate the content behind it.
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  // Whatever the welcome says, the no-JS version of it has to be on screen
  // with the door animation off. Read from content — pinning the words here
  // broke on a reword that had nothing to do with animation.
  await expect(page.getByText(rooms.steps.welcome).first()).toBeVisible()
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
test('the floor names every featured piece, and nothing personal', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  // Read the roster from content. Hardcoding it here meant the wall's contents
  // were pinned in two places, and moving the personal pieces to the library
  // broke a test that was only ever about whether the wall renders.
  const byslug = new Map(projects.map((p) => [p.slug, p]))
  for (const slug of FEATURED) {
    const name = byslug.get(slug)!.name
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
  await expect(summary).toHaveText(new RegExp(rooms.floor.placardHint, 'i'))
  await expect(threwAway).toBeHidden()
  await summary.click()
  await expect(threwAway).toBeVisible()
  await context.close()
})

test('the door comes toward you as you scroll into it', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1200)

  const doorWidth = async () =>
    page.evaluate(() => {
      const el = document.querySelector('[style*="perspective"]')
      return el ? Math.round(el.getBoundingClientRect().width) : 0
    })

  const atRest = await doorWidth()
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.9))
  await page.waitForTimeout(700)
  const approached = await doorWidth()

  // Walking up to a door means it gets bigger. Without the scene-progress
  // scale this is a static image you scroll past, which is what it was.
  expect(atRest).toBeGreaterThan(0)
  expect(approached).toBeGreaterThan(atRest * 2)
})

test('the door shuts again when you scroll back up', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1200)

  // The slab's rotateY shows up as a 3d matrix; a closed door has no transform
  // at all. That difference is enough to tell open from shut.
  const slabTransform = async () =>
    page.evaluate(() => {
      const slab = document.querySelector('[style*="perspective"] > div') as HTMLElement | null
      return slab ? getComputedStyle(slab).transform : 'missing'
    })

  const shut = await slabTransform()

  // Poll rather than sleeping a fixed 700ms. The swing is scroll-linked and
  // settles a frame or two after the scroll, and under parallel workers that
  // took longer than the sleep allowed — the test failed in a full run and
  // passed three times out of three on its own, which is a flake, not a bug.
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.9))
  await expect
    .poll(slabTransform, { timeout: 5000, message: 'door should swing open on scroll' })
    .not.toBe(shut)

  await page.evaluate(() => window.scrollTo(0, 0))
  await expect
    .poll(slabTransform, { timeout: 5000, message: 'door should shut again on scroll back' })
    .toBe(shut)
})

test('the door has a door’s proportions, not the viewport’s', async ({ page }) => {
  // Width used to come from vw and height from vh, so the ratio between them
  // changed with the window and came out square on a wide-ish screen. Deriving
  // width from height fixes it; this pins that it stays fixed.
  for (const [w, h] of [
    [1141, 885],
    [1440, 900],
    [1280, 1400],
  ] as const) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto('/')
    await page.waitForTimeout(900)
    const ratio = await page.evaluate(() => {
      const r = document.querySelector('[style*="perspective"]')!.getBoundingClientRect()
      return r.height / r.width
    })
    expect(ratio, `at ${w}x${h} the door is ${ratio.toFixed(2)}:1 tall`).toBeGreaterThan(2)
    expect(ratio, `at ${w}x${h} the door is ${ratio.toFixed(2)}:1 tall`).toBeLessThan(2.6)
  }
})

test('the door walks you inside when you click it', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1200)

  const before = await page.evaluate(() => window.scrollY)
  await page.getByRole('button', { name: rooms.steps.doorAction }).click()
  // The journey has no next page to navigate to — clicking the door scrolls
  // you to where the wheel would have, so the camera plays the same move.
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeGreaterThan(before + 200)

  // And you land on the room the door leads into, not somewhere past it.
  await expect(page.getByText(rooms.window.entry)).toBeVisible()
})

/** Smooth scrolling is in flight after an advance; wait for it to settle. */
async function settled(page: import('@playwright/test').Page) {
  let last = -1
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => Math.round(window.scrollY))
        const stable = y === last
        last = y
        return stable
      },
      { timeout: 10_000, message: 'scroll should come to rest' }
    )
    .toBe(true)
}

test('the window walks you on to the work', async ({ page }, testInfo) => {
  // Desktop only, deliberately. Under 768px the room's copy runs full width
  // and the window sits behind it, so the window renders as a picture rather
  // than as a control nobody could reach.
  test.skip(
    (testInfo.project.use.viewport?.width ?? 1280) < 768,
    'the window is decoration on narrow screens'
  )
  await page.goto('/')
  await page.waitForTimeout(1200)

  await page.getByRole('button', { name: rooms.steps.doorAction }).click()
  await expect(page.getByText(rooms.window.entry)).toBeVisible()
  // The door's own scroll is still gliding; clicking a moving target is what
  // "element is not stable" means.
  await settled(page)

  const before = await page.evaluate(() => window.scrollY)
  await page.getByRole('button', { name: rooms.window.windowAction }).click()
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeGreaterThan(before + 200)
  await expect(page.getByRole('heading', { name: 'Beacon', level: 3 })).toBeVisible()
})
