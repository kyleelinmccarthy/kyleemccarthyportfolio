import { drivesTheCanvas, expect, test, type Page } from './canvas'
// Relative imports: Playwright does not know the `@/` alias.
import { guide } from '../../content/guide'

/*
 * The welcome pair: on a first visit, while the guide's greeting is open, she
 * and the visitor's own character stand large beside it, waving, the
 * visitor's carrying the "This is you" control that opens the picker.
 */

const pair = (page: Page) => page.locator('.welcome')
const you = (page: Page) => page.getByRole('button', { name: `${guide.controls.you}. ${guide.controls.change}` })
const said = (page: Page) => page.locator('#guide-said')

test.describe('the welcome pair', () => {
  test('stands beside the greeting on a first visit, drawn live, with a "this is you" control that opens the picker and takes focus back', async ({ page }) => {
    drivesTheCanvas()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/')
    await expect(said(page)).toContainText('Hi, I’m Kylee.', { timeout: 60_000 })
    await expect(pair(page)).toBeVisible()
    await expect(pair(page).locator('canvas')).toHaveCount(1, { timeout: 30_000 })
    // Decorative: only the button is exposed.
    await expect(pair(page).locator('.welcome-figures')).toHaveAttribute('aria-hidden', 'true')
    const button = you(page)
    await expect(button).toBeVisible()
    await expect(button).toContainText(guide.controls.you)
    const box = (await page.locator('.you-label').boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    // It is the one character control while the pair stands: the bubble's gives way to it.
    await expect(page.locator('#guide-bubble').getByRole('button', { name: guide.controls.change })).toHaveCount(0)
    await button.click()
    const dialog = page.getByRole('dialog', { name: guide.controls.pickerTitle })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(button).toBeFocused()
    expect(errors).toEqual([])
  })

  test('the pair does not cover the header, the legend or the bubble', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/')
    await expect(you(page)).toBeVisible({ timeout: 60_000 })
    // Its pop-in done.
    await expect.poll(() => pair(page).evaluate((el) => el.getAnimations().every((a) => a.playState === 'finished'))).toBe(true)
    const welcome = (await pair(page).boundingBox())!
    const overlaps = (b: { x: number; y: number; width: number; height: number }) =>
      welcome.x < b.x + b.width && b.x < welcome.x + welcome.width && welcome.y < b.y + b.height && b.y < welcome.y + welcome.height
    // The header's name block and its buttons, each fixed in a corner.
    for (const selector of ['#guide-bubble', 'header > div', 'header > nav', '.legend']) {
      for (const el of await page.locator(selector).all()) {
        const b = await el.boundingBox()
        if (b) expect(overlaps(b), selector).toBe(false)
      }
    }
  })

  test('goes when the visitor chooses to look around, and the bubble’s own control comes back', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/')
    await expect(you(page)).toBeVisible({ timeout: 60_000 })
    await page.locator('#guide-bubble').getByRole('button', { name: guide.tour.alone }).click()
    await expect(pair(page)).toHaveCount(0, { timeout: 15_000 })
    await expect(page.locator('#guide-bubble').getByRole('button', { name: guide.controls.change })).toBeVisible()
  })

  test('goes when the visitor starts the tour', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/')
    await expect(you(page)).toBeVisible({ timeout: 60_000 })
    await page.locator('#guide-bubble').getByRole('link', { name: /Start the tour/ }).click()
    await expect(page).toHaveURL('/places/home')
    // Software rendering draws the world slowly while the camera flies: allow it time.
    await expect(pair(page)).toHaveCount(0, { timeout: 15_000 })
  })

  test('a returning visitor, already greeted this visit, does not get it', async ({ page }) => {
    drivesTheCanvas()
    await page.addInitScript(() => sessionStorage.setItem('kym-guide-greeted', '1'))
    await page.goto('/')
    await expect(page.locator('#guide-bubble')).toBeVisible({ timeout: 60_000 })
    await expect(said(page)).not.toContainText('Want the tour')
    await expect(pair(page)).toHaveCount(0)
  })

  test('without a second WebGL context it shows the pair as still pictures', async ({ page }) => {
    drivesTheCanvas()
    // The world's canvas is made first; every later one is refused.
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        if ((kind === 'webgl2' || kind === 'webgl') && this.closest('.welcome')) return null
        return (real as (...a: unknown[]) => RenderingContext | null).call(this, kind, ...rest)
      } as typeof real
    })
    await page.goto('/')
    await expect(you(page)).toBeVisible({ timeout: 60_000 })
    await expect(pair(page).locator('.welcome-stills img')).toHaveCount(2, { timeout: 30_000 })
  })
})

/*
 * A phone's browser shows far less than its screen: its own bars take a fifth of the height. These are the page
 * sizes real phones give (a small Android, a large one, an iPhone), where everything has to share the screen.
 */
for (const viewport of [
  { width: 360, height: 636 },
  { width: 412, height: 732 },
  { width: 390, height: 664 },
]) {
  test.describe(`on a phone showing ${viewport.width} by ${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true })

    test('the pair stands clear of the header, the bubble, the legend and the controls, and no map label shows over her greeting', async ({ page }) => {
      drivesTheCanvas()
      await page.goto('/')
      await expect(you(page)).toBeVisible({ timeout: 60_000 })
      await expect.poll(() => pair(page).evaluate((el) => el.getAnimations().every((a) => a.playState === 'finished'))).toBe(true)
      type Box = { x: number; y: number; width: number; height: number }
      const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
      const welcome = (await pair(page).boundingBox())!
      const bubble = (await page.locator('#guide-bubble').boundingBox())!
      for (const selector of ['header > div', 'header > nav', '.legend']) {
        for (const el of await page.locator(selector).all()) {
          const b = await el.boundingBox()
          if (!b) continue
          expect(overlap(welcome, b), `the pair over ${selector}`).toBe(false)
          expect(overlap(bubble, b), `the bubble over ${selector}`).toBe(false)
        }
      }
      expect(overlap(welcome, bubble), 'the pair over the bubble').toBe(false)
      // Both of the bubble's choices can be seen and pressed.
      await expect(page.locator('#guide-bubble').getByRole('button', { name: guide.tour.alone })).toBeInViewport({ ratio: 1 })
      // Every label that shows has its pin outside the bubble.
      await expect
        .poll(() =>
          page.evaluate(() => {
            const b = document.getElementById('guide-bubble')!.getBoundingClientRect()
            return Array.from(document.querySelectorAll<HTMLElement>('#labels .lm[data-on]')).filter((el) => {
              const at = new DOMMatrixReadOnly(getComputedStyle(el).transform)
              return at.m41 > b.left && at.m41 < b.right && at.m42 > b.top && at.m42 < b.bottom
            }).length
          }),
        )
        .toBe(0)
    })
  })
}

test.describe('on a phone too short for the pair', () => {
  test.use({ viewport: { width: 375, height: 553 }, hasTouch: true })

  test('her greeting comes without it, clear of the header, with the bubble’s own character control', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/')
    await expect(said(page)).toContainText('Hi, I’m Kylee.', { timeout: 60_000 })
    const bubble = page.locator('#guide-bubble')
    await expect(bubble.getByRole('button', { name: guide.controls.change })).toBeVisible()
    await expect(pair(page)).toHaveCount(0)
    const b = (await bubble.boundingBox())!
    const header = (await page.locator('header > div').boundingBox())!
    expect(b.y).toBeGreaterThanOrEqual(header.y + header.height)
  })
})
