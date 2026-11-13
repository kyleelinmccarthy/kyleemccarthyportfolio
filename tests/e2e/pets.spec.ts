import AxeBuilder from '@axe-core/playwright'
import { atLandingView, drivesTheCanvas, expect, rig, test, type Page } from './canvas'
// Relative imports: Playwright does not know the `@/` alias.
import { pets, type PetId } from '../../content/pets'
import { CLICK_SLOP } from '../../lib/world/rig'
import { SOUND_STORAGE_KEY } from '../../lib/soundPrefs'
import { petMiddle } from '../../lib/world/pets'

/*
 * The owner's pets at Home: pressing one makes it say its word (in a bubble
 * over it, and to a screen reader) and, unless muted, a short sound. The
 * sound itself cannot be heard here; what is checked is that the page makes
 * no audio context until a pet is pressed, makes one on the press, and makes
 * none while muted. The words are the content file's.
 */

const said = (page: Page) => page.locator('#pet-said')
const bubble = (page: Page) => page.locator('#pet-bubble')
const mute = (page: Page) => page.getByRole('button', { name: 'Mute' })

/** Counts the audio contexts the page makes, from its first moment (`window.__audioContexts`). */
async function countAudioContexts(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __audioContexts: number; AudioContext?: typeof AudioContext }
    w.__audioContexts = 0
    const Real = w.AudioContext
    if (!Real) return
    w.AudioContext = class extends Real {
      constructor(options?: AudioContextOptions) {
        super(options)
        w.__audioContexts++
      }
    }
  })
  return () => page.evaluate(() => (window as unknown as { __audioContexts: number }).__audioContexts)
}

/** Home, with the camera landed and still (reduced motion), and where `pet` falls on the screen once nothing covers it. */
async function atHome(page: Page, pet: PetId) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/places/home')
  await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 60_000 })
  const at = (await atLandingView(page, 'home')).at(petMiddle(pet))
  await expect.poll(() => page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, at), { timeout: 15_000 }).toBe('CANVAS')
  return at
}

/** A press where the visitor would make it: a tap on a phone, a click elsewhere. */
async function press(page: Page, at: { x: number; y: number }) {
  if (test.info().project.name === 'mobile') await page.touchscreen.tap(at.x, at.y)
  else await page.mouse.click(at.x, at.y)
}

test.describe('the pets at Home', () => {
  test('pressing a pet shows its word over it, tells a screen reader, and only then makes a sound', async ({ page }) => {
    drivesTheCanvas()
    const contexts = await countAudioContexts(page)
    const at = await atHome(page, 'largeDog')
    // Nothing is said, and no sound is readied, on load.
    await expect(bubble(page)).toBeHidden()
    expect(await contexts()).toBe(0)

    await press(page, at)
    const { who, says } = pets.largeDog
    await expect(said(page)).toHaveText(`${who} says: ${says[0].word}`)
    await expect(bubble(page)).toBeVisible()
    await expect(bubble(page)).toHaveText(says[0].word)
    // Over the pet: its tail points down at its head, close above where it was pressed.
    const box = (await bubble(page).boundingBox())!
    expect(box.y + box.height).toBeLessThan(at.y)
    expect(Math.abs(box.x + box.width / 2 - at.x)).toBeLessThan(box.width)
    expect(await contexts()).toBe(1)

    // The next press, its next word; and the bubble goes after a moment.
    await press(page, at)
    await expect(said(page)).toHaveText(`${who} says: ${says[1 % says.length].word}`)
    await expect(bubble(page)).toBeHidden({ timeout: 5_000 })
    expect(await contexts()).toBe(1)
  })

  test('a drag across a pet is not a press', async ({ page }) => {
    drivesTheCanvas()
    test.skip(test.info().project.name === 'mobile', 'a mouse drag; the touch drag is the camera’s own test')
    const at = await atHome(page, 'largeDog')
    // From one side of it to the other, a little further than a click may wander (`CLICK_SLOP`): down and up both on the pet.
    const across = CLICK_SLOP + 4
    await page.mouse.move(at.x - across / 2, at.y)
    await page.mouse.down()
    await page.mouse.move(at.x + across / 2, at.y, { steps: 4 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    await expect(said(page)).toHaveText('')
    await expect(bubble(page)).toBeHidden()
    // The same, wandering less than that, is a press: so the drag above was on the pet, and was turned down as a drag.
    const wobble = CLICK_SLOP - 2
    await page.mouse.move(at.x - wobble / 2, at.y)
    await page.mouse.down()
    await page.mouse.move(at.x + wobble / 2, at.y, { steps: 2 })
    await page.mouse.up()
    await expect(said(page)).toHaveText(`${pets.largeDog.who} says: ${pets.largeDog.says[0].word}`)
  })

  test('the mute button mutes, is remembered across a reload, and a muted pet makes no sound but still says its word', async ({ page }) => {
    drivesTheCanvas()
    const contexts = await countAudioContexts(page)
    const at = await atHome(page, 'kitten')
    await expect(mute(page)).toHaveAttribute('aria-pressed', 'false')
    const size = (await mute(page).boundingBox())!
    expect(size.width).toBeGreaterThanOrEqual(44)
    expect(size.height).toBeGreaterThanOrEqual(44)

    await mute(page).click()
    await expect(mute(page)).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SOUND_STORAGE_KEY)).toBe('off')
    await press(page, at)
    await expect(said(page)).toHaveText(`${pets.kitten.who} says: ${pets.kitten.says[0].word}`)
    expect(await contexts()).toBe(0)

    await page.reload()
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 60_000 })
    await expect(mute(page)).toHaveAttribute('aria-pressed', 'true')
    await mute(page).click()
    await expect(mute(page)).toHaveAttribute('aria-pressed', 'false')
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SOUND_STORAGE_KEY)).toBeNull()
  })

  test('the mute button keeps clear of the header’s controls and the guide’s bubble', async ({ page }) => {
    drivesTheCanvas()
    await atHome(page, 'largeDog')
    const button = (await mute(page).boundingBox())!
    const overlaps = (b: { x: number; y: number; width: number; height: number }) =>
      b.x < button.x + button.width && button.x < b.x + b.width && b.y < button.y + button.height && button.y < b.y + b.height
    for (const other of await page.locator('nav[aria-label="Main"] a, nav[aria-label="Main"] button, #guide-bubble').all()) {
      const box = await other.boundingBox()
      if (box) expect(overlaps(box), await other.textContent()).toBe(false)
    }
  })

  for (const theme of ['day', 'night'] as const) {
    test(`no axe violations at Home in ${theme} mode, sound muted and a pet’s word showing`, async ({ page }) => {
      drivesTheCanvas()
      await page.addInitScript((t) => sessionStorage.setItem('kym-theme', t), theme)
      const at = await atHome(page, 'largeDog')
      await mute(page).click()
      await press(page, at)
      await expect(bubble(page)).toBeVisible()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .exclude('iframe[src*="challenges.cloudflare.com"]')
        .analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
    })
  }

  test('the mute button is only at Home, where there is something to hear', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/beacon')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 60_000 })
    await expect(mute(page)).toHaveCount(0)
  })
})
