import { drivesTheCanvas, expect, rig, test, touchOf, type Page } from './canvas'
// Relative imports: Playwright does not know the `@/` alias.
import { BEE_CONSTELLATION, ROLL_CONSTELLATION, eggWords } from '../../content/eggs'
import { BUGS_STORAGE_KEY } from '../../lib/eggs/bugCount'

/*
 * The two easter eggs. By day a bumblebee bumbles over the planet: pressing it shows
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

/** The planet, as an already-greeted visitor sees it, in `theme`, with the bug out (by day) if `bug` and the dragon die if `dragon`. */
async function planet(page: Page, theme: 'day' | 'night', { bug = false, dragon = false } = {}) {
  await page.addInitScript(
    ({ theme, bug, dragon, at }) => {
      sessionStorage.setItem('kym-guide-greeted', '1')
      sessionStorage.setItem('kym-theme', theme)
      if (bug) Object.assign(window, { __eggBug: { at } })
      if (dragon) Object.assign(window, { __eggDragon: { at } })
    },
    { theme, bug, dragon, at: BUG_AT },
  )
  await page.goto('/')
  await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit', { timeout: 60_000 })
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  // The eggs load once the world has drawn.
  await expect(said(page)).toBeAttached({ timeout: 30_000 })
}

/**
 * Turns the planet with short drags to the right (the camera going west) until the constellation `title`'s name
 * shows on the sky. The Natural 20 hangs beyond Tiny Frenzy, so from the opening view it is behind the camera.
 */
async function turnToConstellation(page: Page, title: string) {
  // As `constellationLabelId` names it.
  const name = page.locator(`#label-const-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`)
  const { width, height } = page.viewportSize()!
  const from = { x: width * 0.3, y: height * 0.5 }
  const step = height * 0.09
  for (let i = 0; i < 12 && (await name.getAttribute('data-on')) === null; i++) {
    if (test.info().project.name === 'mobile') await (await touchOf(page)).drag(from, step, 0, 4)
    else {
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x + step, from.y, { steps: 4 })
      await page.mouse.up()
    }
    await page.waitForTimeout(400)
  }
  await expect(name).toHaveAttribute('data-on', '', { timeout: 10_000 })
  return name
}

/** Where the dragon die is on the screen once it is out on the near side, uncovered. */
async function dragonOnScreen(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const at = (window as unknown as { __eggDragonScreen?: { x: number; y: number; front: boolean } }).__eggDragonScreen
          return at?.front && document.elementFromPoint(at.x, at.y)?.tagName === 'CANVAS' ? 'ready' : 'not yet'
        }),
      { timeout: 60_000 },
    )
    .toBe('ready')
  return page.evaluate(() => (window as unknown as { __eggDragonScreen: { x: number; y: number } }).__eggDragonScreen)
}

/** Where the dragon die is said to be this frame, or null when it is not out. */
const dragonScreen = (page: Page) => page.evaluate(() => (window as unknown as { __eggDragonScreen?: unknown }).__eggDragonScreen ?? null)

/** Presses the dragon die where it is, a few times if it flew off, until a roll is told. */
async function pressDragon(page: Page) {
  for (let i = 0; i < 4; i++) {
    await press(page, await dragonOnScreen(page))
    if (/^You rolled/.test((await said(page).textContent()) ?? '')) return
    await page.waitForTimeout(300)
  }
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
  test('it is out only on the overview: gone at a place, back on the overview', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'day', { bug: true })
    const at = await bugOnScreen(page)
    // The pointer over it, then into a place by its link (a client-side visit, as a visitor's own).
    await page.mouse.move(at.x, at.y)
    await expect(page.locator('[data-quality] canvas')).toHaveCSS('cursor', 'pointer')
    await page.evaluate(() => (document.querySelector('a[href="/places/post"]') as HTMLAnchorElement).click())
    await expect(page).toHaveURL('/places/post')
    await expect.poll(() => page.evaluate(() => (window as unknown as { __eggBugScreen?: unknown }).__eggBugScreen ?? null)).toBeNull()
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => (window as unknown as { __eggBugScreen?: unknown }).__eggBugScreen ?? null)).toBeNull()
    expect(await page.evaluate(() => document.querySelector<HTMLCanvasElement>('[data-quality] canvas')!.style.cursor)).toBe('')
    // Back on the overview, it is out again.
    await page.goBack()
    await expect(page).toHaveURL('/')
    await bugOnScreen(page)
  })

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

test.describe('the bumblebee constellation', () => {
  test('at night, pressing The Bumblebee counts a bug, as catching the bee does', async ({ page }) => {
    // On a phone's tall view a figure on this side of the sky is named over only about 10° of turning, too narrow
    // for the drags to land in reliably. The press itself is the same code as The Natural 20's, tested on a phone.
    test.skip(test.info().project.name === 'mobile', 'the press is shared with The Natural 20, which runs on a phone')
    drivesTheCanvas()
    await planet(page, 'night')
    const name = await turnToConstellation(page, BEE_CONSTELLATION)
    await page.waitForTimeout(800)
    const box = (await name.boundingBox())!
    const at = { x: box.x + box.width / 2, y: box.y - 50 }
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, at)).toBe('CANVAS')
    await press(page, at)
    await expect(said(page)).toHaveText(`${eggWords.feature} ${eggWords.squashed(1)}.`)
    await expect(page.locator('.egg-bubble')).toBeVisible()
    // It stays on the sky: a second press counts again.
    await expect(page.locator('.egg-bubble')).toBeHidden({ timeout: 10_000 })
    await press(page, at)
    await expect(said(page)).toHaveText(`${eggWords.feature} ${eggWords.squashed(2)}.`)
  })
})

test.describe('the dragon die, by day', () => {
  test('pressing it rolls the die; while the roll is out it is hidden, then it is back', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'day', { dragon: true })
    await page.evaluate(() => Object.assign(window, { __eggRoll: 7 }))
    await pressDragon(page)
    await expect(said(page)).toHaveText(eggWords.rolled(7), { timeout: 15_000 })
    // While the die is out on the screen, the dragon die is not: no screen point, no pointer (read together, in one frame's reading).
    await expect
      .poll(() =>
        page.evaluate(() => {
          const roll = document.querySelector('.egg-roll') !== null
          const dragon = (window as unknown as { __eggDragonScreen?: unknown }).__eggDragonScreen ?? null
          const cursor = document.querySelector<HTMLCanvasElement>('[data-quality] canvas')!.style.cursor
          return roll && dragon === null && cursor !== 'pointer' ? 'hidden while rolling' : roll ? 'still out' : 'no roll'
        }),
      )
      .toBe('hidden while rolling')
    // Once the roll has gone, it is back (flying on, wherever it has got to).
    await expect(page.locator('.egg-roll')).toBeHidden({ timeout: 15_000 })
    await expect.poll(() => dragonScreen(page), { timeout: 30_000 }).not.toBeNull()
  })

  test('it is out only on the overview: gone at a place, back on the overview', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'day', { dragon: true })
    await dragonOnScreen(page)
    await page.evaluate(() => (document.querySelector('a[href="/places/post"]') as HTMLAnchorElement).click())
    await expect(page).toHaveURL('/places/post')
    await expect.poll(() => dragonScreen(page)).toBeNull()
    await page.waitForTimeout(500)
    expect(await dragonScreen(page)).toBeNull()
    await page.goBack()
    await expect(page).toHaveURL('/')
    await dragonOnScreen(page)
  })

  test('is not out at night', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'night', { dragon: true })
    await page.waitForFunction(() => ((window as unknown as { __worldFrames?: number }).__worldFrames ?? 0) > 10)
    await page.waitForTimeout(500)
    expect(await dragonScreen(page)).toBeNull()
  })
})

test.describe('the d20', () => {
  test('at night, pressing The Natural 20 rolls the die, and the result is told', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'night')
    // Its name is shown on the sky once the planet is turned; pressing just over it, on its stars, rolls.
    const name = await turnToConstellation(page, ROLL_CONSTELLATION)
    await page.waitForTimeout(800)
    const box = (await name.boundingBox())!
    const at = { x: box.x + box.width / 2, y: box.y - 50 }
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
  test.beforeEach(({ page }) => page.emulateMedia({ reducedMotion: 'reduce' }))

  test('the dragon die holds still, and pressed it rolls', async ({ page }) => {
    drivesTheCanvas()
    await planet(page, 'day', { dragon: true })
    await page.waitForTimeout(2000)
    const first = await dragonOnScreen(page)
    await page.waitForTimeout(1500)
    const later = await dragonOnScreen(page)
    expect(Math.hypot(later.x - first.x, later.y - first.y)).toBeLessThan(2)
    await press(page, later)
    await expect(said(page)).toHaveText(/^You rolled/, { timeout: 15_000 })
  })

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
    // Once the view has settled, it stays where it stands.
    await page.waitForTimeout(2000)
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
