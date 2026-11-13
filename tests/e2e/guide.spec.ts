import { drivesTheCanvas, expect, rig, test, type Page } from './canvas'
// Relative imports: Playwright does not know the `@/` alias.
import { DEFAULT_GUEST, guestOptions } from '../../content/characters'
import { guide } from '../../content/guide'
import { GUEST_STORAGE_KEY } from '../../lib/companionPrefs'
import { guestPicture } from '../../lib/guests'

/*
 * The guide (Kylee, standing at each place, speaking in a bubble) and the
 * visitor's own character, chosen in the picker. The words are the content
 * file's, so the tests read them from the page's own copy where they can.
 */

const bubble = (page: Page) => page.locator('#guide-bubble')
/** What a screen reader hears her say: the one polite live region, apart from the bubble. */
const said = (page: Page) => page.locator('#guide-said')

/** At a place, once the camera has arrived: the bubble stands by her (or docks) and can be pressed. On a phone it starts folded: open it. */
async function arrived(page: Page, id: string) {
  await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 60_000 })
  await expect(rig(page)).toHaveAttribute('data-rig-target', id)
  const chip = page.getByRole('button', { name: 'What Kylee says' })
  if (await chip.isVisible()) await chip.click()
}

test.describe('the guide', () => {
  test('greets a first-time visitor over the planet, and her "start the tour" link goes to the first stop', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/')
    await expect(said(page)).toContainText('Hi, I’m Kylee.', { timeout: 60_000 })
    const start = bubble(page).getByRole('link', { name: /Start the tour/ })
    await expect(start).toHaveAttribute('href', '/places/home')
    await start.click()
    await expect(page).toHaveURL('/places/home')
    await expect(said(page)).toContainText('mind the koi')
    // The greeting is given once a visit: back over the planet she says something else.
    await page.goto('/')
    await expect(said(page)).not.toContainText('Want the tour', { timeout: 60_000 })
  })

  test('at a place says that place’s line, and her tour links step along the tour', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/beacon')
    await expect(said(page)).toContainText('Lighthouse', { timeout: 60_000 })
    await arrived(page, 'beacon')
    const next = bubble(page).getByRole('link', { name: /^Next/ })
    await expect(next).toHaveAttribute('href', '/places/403hq')
    await next.click()
    await expect(page).toHaveURL('/places/403hq')
    await expect(said(page)).toContainText('six weeks')
    await arrived(page, '403hq')
    await bubble(page).getByRole('link', { name: /^Back/ }).click()
    await expect(page).toHaveURL('/places/beacon')
    await expect(said(page)).toContainText('Lighthouse')
  })

  test('her line at a place is announced once she has landed: the live region is never inside a hidden bubble', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/ruckus')
    await arrived(page, 'ruckus')
    await expect(said(page)).toContainText('Ten multiplayer games')
    // Announced: in the page, not hidden, not inside the bubble that moves and hides while the camera flies.
    expect(await said(page).evaluate((el) => getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none' && !el.closest('#guide-bubble'))).toBe(true)
  })

  test('on a phone at a place the bubble starts folded to her face, and opens on a tap', async ({ page }) => {
    drivesTheCanvas()
    await page.setViewportSize({ width: 412, height: 915 })
    await page.goto('/places/eliminated')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 60_000 })
    const chip = page.getByRole('button', { name: 'What Kylee says' })
    await expect(chip).toBeVisible()
    await expect(bubble(page)).not.toContainText('pink bow')
    await chip.click()
    await expect(bubble(page)).toContainText('pink bow')
    await page.getByRole('button', { name: 'Fold away' }).click()
    await expect(chip).toBeVisible()
  })

  test('the panel’s own copy of her line never shows while the world can be drawn, not even before its first frame', async ({ page }) => {
    await page.goto('/places/eliminated', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.guide-note')).toBeHidden()
    await expect(page.locator('canvas')).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('.guide-note')).toBeHidden()
  })

  test('hidden hints stay hidden for the visit, and come back from the HUD', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/aura')
    await expect(said(page)).toContainText('script tag', { timeout: 60_000 })
    await arrived(page, 'aura')
    await page.getByRole('button', { name: 'Hide guide hints' }).click()
    await expect(said(page)).toHaveText('')
    await page.goto('/places/ruckus')
    await expect(rig(page)).toHaveAttribute('data-rig-target', 'ruckus', { timeout: 60_000 })
    const show = page.getByRole('button', { name: 'Show guide hints' })
    await expect(show).toBeVisible()
    await expect(said(page)).toHaveText('')
    await show.click()
    await expect(said(page)).toContainText('Ten multiplayer games')
  })
})

test.describe('the visitor’s character', () => {
  const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), GUEST_STORAGE_KEY)
  const picture = (page: Page) => page.getByRole('dialog').getByRole('img', { name: guide.controls.preview })

  test('the picker opens from the HUD button, works by keyboard (arrow keys within a group), applies each change at once, and survives a reload', async ({ page }) => {
    drivesTheCanvas()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/places/beacon')
    const change = page.getByRole('button', { name: guide.controls.change })
    await expect(change).toBeVisible({ timeout: 60_000 })
    await change.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: guide.controls.pickerTitle })
    await expect(dialog).toBeVisible()
    const group = (field: 'age' | 'style' | 'skin') => dialog.getByRole('group', { name: new RegExp(`^${guide.controls[field]}`) })
    const label = (field: 'age' | 'style' | 'skin', id: string) => guestOptions[field].find((o) => o.id === id)!.label
    for (const field of ['age', 'style', 'skin'] as const) await expect(group(field).getByRole('radio', { name: label(field, DEFAULT_GUEST[field]) })).toBeChecked()
    await expect(picture(page)).toHaveAttribute('src', guestPicture(DEFAULT_GUEST))
    // Escape closes it and gives focus back.
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(change).toBeFocused()
    // By keyboard alone: open, Tab to the ages, an arrow to the next age; it applies at once, and the picker stays open.
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    const ageNow = group('age').getByRole('radio', { name: label('age', DEFAULT_GUEST.age) })
    for (let i = 0; i < 6 && !(await ageNow.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
    await expect(ageNow).toBeFocused()
    const ages = guestOptions.age.map((o) => o.id)
    const nextAge = ages[(ages.indexOf(DEFAULT_GUEST.age) + 1) % ages.length]!
    await page.keyboard.press('ArrowRight')
    await expect(group('age').getByRole('radio', { name: label('age', nextAge) })).toBeChecked()
    await expect(group('age').getByRole('radio', { name: label('age', nextAge) })).toBeFocused()
    await expect(dialog).toBeVisible()
    expect(await stored(page)).toEqual({ ...DEFAULT_GUEST, age: nextAge })
    // Tab leaves the group for the next; an arrow there changes the style.
    await page.keyboard.press('Tab')
    await expect(group('style').getByRole('radio', { name: label('style', DEFAULT_GUEST.style) })).toBeFocused()
    const styles = guestOptions.style.map((o) => o.id)
    const prevStyle = styles[(styles.indexOf(DEFAULT_GUEST.style) + styles.length - 1) % styles.length]!
    await page.keyboard.press('ArrowLeft')
    const chosen = { ...DEFAULT_GUEST, age: nextAge, style: prevStyle }
    expect(await stored(page)).toEqual(chosen)
    await expect(picture(page)).toHaveAttribute('src', guestPicture(chosen))
    // On to Done, which closes it and gives focus back.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: guide.controls.done })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(change).toBeFocused()
    await page.reload()
    await expect(change).toBeVisible({ timeout: 60_000 })
    await change.click()
    await expect(group('age').getByRole('radio', { name: label('age', nextAge) })).toBeChecked()
    await expect(group('style').getByRole('radio', { name: label('style', prevStyle) })).toBeChecked()
    await expect(picture(page)).toHaveAttribute('src', guestPicture(chosen))
    expect(errors).toEqual([])
  })

  test('a click on a skin tone applies at once; the picker closes only on Done, Escape or a click outside', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/beacon')
    const change = page.getByRole('button', { name: guide.controls.change })
    await expect(change).toBeVisible({ timeout: 60_000 })
    await change.click()
    const dialog = page.getByRole('dialog', { name: guide.controls.pickerTitle })
    const tone = guestOptions.skin.find((o) => o.id !== DEFAULT_GUEST.skin)!
    await dialog.getByRole('radio', { name: tone.label }).click()
    await expect(dialog).toBeVisible()
    expect(await stored(page)).toEqual({ ...DEFAULT_GUEST, skin: tone.id })
    // A click outside closes it.
    await page.mouse.click(5, 5)
    await expect(dialog).toBeHidden()
  })

  test('the picker fits a narrow phone: every choice a 44px target, nothing off the side', async ({ page }) => {
    drivesTheCanvas()
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/places/beacon')
    const change = page.getByRole('button', { name: guide.controls.change })
    await expect(change).toBeAttached({ timeout: 60_000 })
    const chip = page.getByRole('button', { name: 'What Kylee says' })
    if (await chip.isVisible()) await chip.click()
    await change.click()
    const dialog = page.getByRole('dialog', { name: guide.controls.pickerTitle })
    await expect(dialog).toBeVisible()
    const targets = dialog.locator('label:has(input[type="radio"]), #guest-picker-done')
    expect(await targets.count()).toBe(guestOptions.age.length + guestOptions.style.length + guestOptions.skin.length + 1)
    for (const target of await targets.all()) {
      const box = (await target.boundingBox())!
      const name = await target.textContent()
      expect(box.width, name ?? '').toBeGreaterThanOrEqual(44)
      expect(box.height, name ?? '').toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(320)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  })

  test('a tampered stored choice falls back to the default, field by field, without an error', async ({ page }) => {
    drivesTheCanvas()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const age = guestOptions.age.find((o) => o.id !== DEFAULT_GUEST.age)!
    await page.addInitScript(
      ({ key, age }) => {
        localStorage.setItem(key, JSON.stringify({ age, style: '"><img src=x onerror=alert(1)>', skin: '__proto__' }))
        localStorage.setItem('kym-guest', 'plum-jumper')
      },
      { key: GUEST_STORAGE_KEY, age: age.id },
    )
    await page.goto('/')
    const change = page.getByRole('button', { name: guide.controls.change })
    await expect(change).toBeVisible({ timeout: 60_000 })
    await change.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('radio', { name: age.label })).toBeChecked()
    await expect(picture(page)).toHaveAttribute('src', guestPicture({ ...DEFAULT_GUEST, age: age.id }))
    expect(errors).toEqual([])
  })
})

test('without WebGL the guide’s line for a place is still on the page', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null
  })
  await page.goto('/places/eliminated')
  await expect(page.getByTestId('world-poster')).toBeVisible()
  await expect(page.locator('.guide-note')).toBeVisible()
  await expect(page.locator('.guide-note')).toContainText('boxed up with a little pink bow')
  await expect(page.locator('#guide-bubble')).toHaveCount(0)
})
