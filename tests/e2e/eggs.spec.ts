import { drivesTheCanvas, expect, rig, test, type Page } from './canvas'
// Relative imports: Playwright does not know the `@/` alias.
import { eggWords } from '../../content/eggs'
import { BUGS_STORAGE_KEY } from '../../lib/eggs/bugCount'

/*
 * The two easter eggs. By day a ladybug wanders the planet: pressing it shows
 * "It's a feature, not a bug." with a count kept on the device. By night the
 * constellation "The Natural 20" rolls a die when pressed, and typing `roll`
 * anywhere rolls it at any hour; a natural 20 has a line of its own. The bug is
 * out in the e2e build only where a test asks for it (`window.__eggBug`), which
 * also says where it appears; its place on the screen comes from
 * `window.__eggBugScreen`. A roll can be rigged with `window.__eggRoll`.
 */

/** Where the bug is asked to appear: open land on the side of the planet the overview faces. */
const BUG_AT = { lat: 4, lon: -20 }

const said = (page: Page) => page.locator('#egg-said')

/** The planet, as an already-greeted visitor sees it, in `theme`, with the bug out (by day) if `bug`. */
async function planet(page: Page, theme: 'day' | 'night', { bug = false } = {}) {
  await page.addInitScript(
    ({ theme, bug, at }) => {
      sessionStorage.setItem('kym-guide-greeted', '1')
      sessionStorage.setItem('kym-theme', theme)
      if (bug) Object.assign(window, { __eggBug: { at } })
    },
    { theme, bug, at: BUG_AT },
  )
  await page.goto('/')
  await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit', { timeout: 60_000 })
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}

/** Where the bug is on the screen once it is out on the near side, uncovered. */
async function bugOnScreen(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const at = (window as unknown as { __eggBugScreen?: { x: number; y: number; front: boolean } }).__eggBugScreen
          return at?.front && document.elementFromPoint(at.x, at.y)?.tagName === 'CANVAS' ? 'ready' : 'not yet'
        }),
      { timeout: 30_000 },
    )
    .toBe('ready')
  return page.evaluate(() => (window as unknown as { __eggBugScreen: { x: number; y: number } }).__eggBugScreen)
}

/** A press where the visitor would make it: a tap on a phone, a click elsewhere. */
async function press(page: Page, at: { x: number; y: number }) {
  if (test.info().project.name === 'mobile') await page.touchscreen.tap(at.x, at.y)
  else await page.mouse.click(at.x, at.y)
}

/** Catches the bug: reads where it is and presses it there at once, a few times if it walked off. */
async function catchBug(page: Page) {
  for (let i = 0; i < 4; i++) {
    await press(page, await bugOnScreen(page))
    if ((await said(page).textContent())?.includes(eggWords.feature)) return
  }
}

test.describe('the bug, by day', () => {
  test('pressing it shows the line and a count kept on the device, and the count goes on next visit', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'day', { bug: true })
    await catchBug(page)
    await expect(said(page)).toHaveText(`${eggWords.feature} ${eggWords.squashed(1)}.`)
    const bubble = page.locator('.egg-bubble')
    await expect(bubble).toBeVisible()
    await expect(bubble).toContainText(eggWords.feature)
    await expect(bubble).toContainText(eggWords.squashed(1))
    // Caught, it is gone; its words go after a moment.
    await expect(page.locator('.egg-bubble')).toBeHidden({ timeout: 10_000 })
    expect(await page.evaluate((key) => localStorage.getItem(key), BUGS_STORAGE_KEY)).toBe('1')

    // Another visit: the count carries on.
    await page.reload()
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit', { timeout: 60_000 })
    await catchBug(page)
    await expect(said(page)).toHaveText(`${eggWords.feature} ${eggWords.squashed(2)}.`)
  })

  test('is not out at night: it sleeps', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'night', { bug: true })
    await page.waitForFunction(() => ((window as unknown as { __worldFrames?: number }).__worldFrames ?? 0) > 10)
    expect(await page.evaluate(() => (window as unknown as { __eggBugScreen?: unknown }).__eggBugScreen ?? null)).toBeNull()
  })
})

test.describe('the d20', () => {
  test('at night, pressing The Natural 20 rolls the die, and the result is told', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'night')
    // Its name is shown on the sky; pressing just over it, on its stars, rolls.
    const name = page.locator('#label-const-the-natural-20')
    await expect(name).toHaveAttribute('data-on', '', { timeout: 30_000 })
    const box = (await name.boundingBox())!
    const at = { x: box.x + box.width / 2, y: box.y - 30 }
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, at)).toBe('CANVAS')
    await press(page, at)
    await expect(said(page)).toHaveText(/^You rolled (\d|1\d|20)\./, { timeout: 15_000 })
    const value = Number((await said(page).textContent())!.match(/\d+/)![0])
    expect(value).toBeGreaterThanOrEqual(1)
    expect(value).toBeLessThanOrEqual(20)
    await expect(page.locator('.egg-roll')).toContainText(eggWords.rolled(value))
  })

  test('typing roll rolls it, by day too; a natural 20 has its celebration', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'day')
    await page.evaluate(() => Object.assign(window, { __eggRoll: 20 }))
    await page.keyboard.type('roll')
    await expect(said(page)).toHaveText(`${eggWords.rolled(20)} ${eggWords.natural20}`, { timeout: 15_000 })
    await expect(page.locator('.egg-roll')).toContainText(eggWords.natural20)
    // The fireworks are drawn while the show lasts, and gone after.
    await expect(page.locator('.egg-bursts')).toBeAttached()
    await expect(page.locator('.egg-bursts')).not.toBeAttached({ timeout: 15_000 })
    await expect(page.locator('.egg-roll')).toBeHidden({ timeout: 15_000 })
  })

  test('typing roll into a field does not roll', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/post')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 60_000 })
    const field = page.getByRole('textbox').first()
    await field.click()
    await page.keyboard.type('roll')
    await expect(field).toHaveValue(/roll/)
    await page.waitForTimeout(500)
    await expect(said(page)).toHaveText('')
    await expect(page.locator('.egg-die')).toHaveCount(0)
  })
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('a roll simply appears at rest with its result, with no fireworks; a natural 1 has its line', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'night')
    await page.evaluate(() => Object.assign(window, { __eggRoll: 1 }))
    await page.keyboard.type('roll')
    await expect(said(page)).toHaveText(`${eggWords.rolled(1)} ${eggWords.natural1}`)
    await expect(page.locator('.egg-roll')).toBeVisible()
    await expect(page.locator('.egg-bursts')).toHaveCount(0)
    await page.evaluate(() => Object.assign(window, { __eggRoll: 20 }))
    await expect(page.locator('.egg-roll')).toBeHidden({ timeout: 15_000 })
    await page.keyboard.type('roll')
    await expect(said(page)).toHaveText(`${eggWords.rolled(20)} ${eggWords.natural20}`)
    await expect(page.locator('.egg-bursts')).toHaveCount(0)
  })

  test('the bug stands still, and caught it shows its words with no confetti', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'day', { bug: true })
    const first = await bugOnScreen(page)
    await page.waitForTimeout(1500)
    const later = await bugOnScreen(page)
    expect(Math.hypot(later.x - first.x, later.y - first.y)).toBeLessThan(2)
    await press(page, later)
    await expect(said(page)).toHaveText(`${eggWords.feature} ${eggWords.squashed(1)}.`)
    await expect(page.locator('.egg-bubble')).toBeVisible()
    await expect(page.locator('.egg-bursts')).toHaveCount(0)
  })
})
