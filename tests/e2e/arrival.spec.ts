import { arrivalCopy, hero, proof } from '../../content/about'
import { drivesTheCanvas, expect, test, type Page } from './canvas'

/*
 * The arrival: on the home page's first load in a visit, the statement lands,
 * the figures count, the planet builds itself, then the guide greets. Every
 * other spec starts as a visitor who has seen it (`arrivalSeen` in canvas.ts);
 * this one starts as a new visitor.
 */
test.use({ arrivalSeen: false })

/** The mark the init script puts on <html> while it plays. */
const playing = (page: Page) => page.evaluate(() => document.documentElement.getAttribute('data-arrival') === 'play')
/** The header's headline, figures, role line and greeting: hidden while the statement holds the screen. */
const headerPart = (page: Page) => page.locator('header [data-gives-way]')
const statement = (page: Page) => page.locator('.arrival-statement')

/** The page as it always is: the header's own headline and figures in full view, the statement gone. */
async function expectAtRest(page: Page) {
  expect(await playing(page)).toBe(false)
  await expect(statement(page)).toBeHidden()
  await expect(page.getByRole('button', { name: arrivalCopy.skip })).toBeHidden()
  await expect(headerPart(page)).toHaveCSS('opacity', '1')
  await expect(page.locator('header').getByText(hero.headline)).toBeVisible()
}

test('plays on the first load of the home page, then never again in the visit', async ({ page }) => {
  await page.goto('/')
  expect(await playing(page)).toBe(true)
  await expect(statement(page)).toBeVisible()
  await expect(page.getByRole('button', { name: arrivalCopy.skip })).toBeVisible()
  // It ends by itself, in about four seconds.
  await expect.poll(() => playing(page), { timeout: 15_000 }).toBe(false)
  await expectAtRest(page)

  await page.reload()
  await expectAtRest(page)
})

test('any key skips it, at once', async ({ page }) => {
  await page.goto('/')
  expect(await playing(page)).toBe(true)
  await page.keyboard.press('Shift')
  await expectAtRest(page)
})

test('its Skip control skips it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: arrivalCopy.skip }).click()
  await expectAtRest(page)
})

test('the header’s links and buttons work while it plays', async ({ page }) => {
  await page.goto('/')
  expect(await playing(page)).toBe(true)
  const index = page.getByRole('button', { name: 'Index' })
  await index.click()
  await expect(index).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')

  await page.goto('/')
  // A new load in the same visit: seen already. Start a new visit to try the tour link while it plays.
  await page.evaluate(() => sessionStorage.clear())
  await page.goto('/')
  expect(await playing(page)).toBe(true)
  await page.getByRole('link', { name: /Take the tour/ }).click()
  await expect(page).toHaveURL(/\/places\/home$/)
  expect(await playing(page)).toBe(false)
})

test('under reduced motion it does not play: the still page at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expectAtRest(page)
  for (const { value } of proof) await expect(page.locator('header').getByText(value, { exact: true })).toBeVisible()
})

test('a deep link never plays it, nor does coming home from there', async ({ page }) => {
  for (const url of ['/places/beacon', '/?district=works', '/#index']) {
    await page.goto(url)
    expect(await playing(page)).toBe(false)
  }
  await page.goto('/places/beacon')
  await page.locator('header').getByRole('link', { name: 'Kylee McCarthy' }).click()
  await expect(page).toHaveURL(/\/$/)
  expect(await playing(page)).toBe(false)
  await expect(statement(page)).toBeHidden()
})

test('the figures’ final values are what assistive technology finds, throughout; the counting is hidden from it', async ({ page }) => {
  await page.goto('/')
  expect(await playing(page)).toBe(true)
  await expect(statement(page)).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('header ul')).toMatchAriaSnapshot(
    proof.map(({ value, label }) => `- listitem: ${value} ${label}`).reduce((all, line) => `${all}\n  ${line}`, '- list:'),
  )
  // Only the header's figures are in the tree, never the statement's.
  for (const { value, label } of proof) await expect(page.getByRole('listitem').filter({ hasText: `${value} ${label}` })).toHaveCount(1)
})

test('leaves nothing more to draw once the world is at rest', async ({ page }) => {
  drivesTheCanvas()
  const meshes = async () => {
    await page.waitForFunction(() => typeof window.__worldMeshesDrawn === 'function' && (window.__worldFrames ?? 0) > 2, null, { timeout: 60_000 })
    return page.evaluate(() => ({ count: window.__worldMeshesDrawn!(), quality: document.querySelector('[data-quality]')?.getAttribute('data-quality') }))
  }
  await page.goto('/')
  await expect.poll(() => playing(page), { timeout: 15_000 }).toBe(false)
  const after = await meshes()
  // The same page for a visitor who has seen it: the world never built itself.
  await page.reload()
  const still = await meshes()
  test.skip(after.quality !== still.quality, 'the world dropped to low quality on one load only, so the two cannot be compared')
  expect(after.count).toBe(still.count)
})
