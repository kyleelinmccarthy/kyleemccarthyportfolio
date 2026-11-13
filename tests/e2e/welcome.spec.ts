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
