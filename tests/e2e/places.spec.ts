import { drivesTheCanvas, expect, rig, scaleRender, test, type Page } from './canvas'
// Relative imports: Playwright does not know the `@/` alias.
import { hero } from '../../content/about'
import { placeById, places } from '../../content/world'
import { formatCoord } from '../../lib/world/geo'

/**
 * A control clicked before React has hydrated is a dead click. React marks the
 * DOM nodes it has taken over with a `__reactProps$…` key, so wait for that on a button.
 */
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const button = document.querySelector('button')
    return !!button && Object.keys(button).some((key) => key.startsWith('__reactProps'))
  })
}

test('the home page names her and lists every place', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kylee McCarthy')
  await expect(page.getByText(hero.headline)).toBeVisible()
  await page.getByRole('button', { name: 'Index' }).click()
  await expect(page.locator('#index')).toBeVisible()
  await expect(page.locator('#index a')).toHaveCount(19)
})

test('a place opens from the index, has its own heading, and the back button returns', async ({ page }) => {
  await page.goto('/')
  await hydrated(page)
  await page.getByRole('button', { name: 'Index' }).click()
  await page.getByRole('link', { name: /Beacon/ }).click()
  await expect(page).toHaveURL('/places/beacon')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beacon')
  await expect(page.getByText(formatCoord(placeById('beacon')!.at))).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('/')
})

test('the Index link on a place page opens the index on the home page', async ({ page }) => {
  await page.goto('/places/beacon')
  await hydrated(page)
  await page.getByRole('link', { name: 'Index' }).click()
  await expect(page).toHaveURL('/#index')
  await expect(page.locator('#index')).toBeVisible()
})

test('a place URL loads directly and the tour steps from it', async ({ page }) => {
  await page.goto('/places/home')
  await hydrated(page)
  await page.getByRole('link', { name: 'Next place' }).click()
  await expect(page).toHaveURL('/places/three-things')
  await hydrated(page)
  await page.keyboard.press('ArrowLeft')
  await expect(page).toHaveURL('/places/home')
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/')
})

test('each page has exactly one h1', async ({ page }) => {
  for (const path of ['/', '/places/beacon', '/places/post']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  }
})

test('an unknown place is a 404', async ({ page }) => {
  expect((await page.goto('/places/nope'))?.status()).toBe(404)
})

test('the sky and the greeting follow the visitor’s clock, and the button overrides it for the visit', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-10T23:10:00'))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await expect(page.getByText('Up late? So am I.')).toBeVisible()
  await page.getByRole('button', { name: 'Switch to day' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  await page.goto('/places/beacon')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
})

test('at half past five it is still night, and the greeting is already Morning', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-10T05:30:00'))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await expect(page.getByText('Morning.')).toBeVisible()
})

test('the index is readable without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  await scaleRender(ctx)
  const page = await ctx.newPage()
  await page.goto('/')
  await expect(page.locator('#index a').first()).toBeVisible()
  await expect(page.locator('#index a')).toHaveCount(19)
  await ctx.close()
})

test('on a phone the panel leaves the tour controls reachable', async ({ page }) => {
  await page.goto('/places/eliminated')
  const next = page.getByRole('link', { name: 'Next place' })
  await expect(next).toBeVisible()
  await next.click()
  await expect(page).toHaveURL('/places/eliminated-site')
})

test('a place with a project hero and a place without one both have a share image', async ({ page }) => {
  for (const path of ['/places/three-things', '/places/eliminated']) {
    await page.goto(path)
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute('content', /\S/)
  }
})

test('every place has a share image, and a project place shows its own hero', async ({ request }) => {
  for (const place of places) {
    const html = await (await request.get(`/places/${place.id}`)).text()
    expect(html, place.id).toMatch(/<meta property="og:image" content="[^"]+"/)
    expect(html, place.id).toMatch(/<meta name="twitter:image" content="[^"]+"/)
  }
  const hero = (await (await request.get('/places/eliminated')).text()).match(/property="og:image" content="([^"]+)"/)
  expect(hero?.[1]).toContain('/media/eliminated/')
  const fallback = (await (await request.get('/places/three-things')).text()).match(/property="og:image" content="([^"]+)"/)
  expect(fallback?.[1]).toContain('/opengraph-image')
})

test('without JavaScript on a phone, the first index link clears the name and the headline', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  await scaleRender(ctx)
  const page = await ctx.newPage()
  await page.goto('/')
  const link = page.locator('#index a').first()
  await expect(link).toBeVisible()
  const linkBox = await link.boundingBox()
  const nameBox = await page.locator('h1').boundingBox()
  const headlineBox = await page.getByText(hero.headline).boundingBox()
  expect(linkBox && nameBox && headlineBox).toBeTruthy()
  const overlaps = (a: Box, b: Box) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  expect(overlaps(linkBox!, nameBox!), 'index link over the name').toBe(false)
  expect(overlaps(linkBox!, headlineBox!), 'index link over the headline').toBe(false)
  await ctx.close()
})

type Box = { x: number; y: number; width: number; height: number }

test('hammering next on the tour ends on the place the URL names', async ({ page }) => {
  drivesTheCanvas()
  // Review Focus 3
  await page.goto('/places/home')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL('/places/ruckus')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ruckus')
  // The camera lands on the place the URL names, not on one it was sent to on the way. Both are
  // read together, so a camera stuck in focus somewhere else cannot pass.
  await expect
    .poll(async () => [await rig(page).getAttribute('data-rig-target'), await rig(page).getAttribute('data-rig-mode')], {
      timeout: 10000,
    })
    .toEqual(['ruckus', 'focus'])
})

test.describe('on a wide screen, at a place', () => {
  test.skip(({ isMobile }) => isMobile, 'the panel is a bottom sheet on a phone')

  test('the open view takes the pointer, and the panel scrolls under the wheel without moving the camera', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/beacon')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 10000 })
    const { width, height } = page.viewportSize()!
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.tagName ?? null,
      [Math.round(width * 0.3), Math.round(height * 0.5)],
    )
    expect(hit).toBe('CANVAS')

    const body = page.locator('article [tabindex="0"]')
    expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
    const box = (await body.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, 400)
    await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    await page.waitForTimeout(500)
    await expect(page).toHaveURL('/places/beacon')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus')
  })

  test('scrolling out over the planet returns to it', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/beacon')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 10000 })
    const { width, height } = page.viewportSize()!
    await page.mouse.move(width * 0.3, height * 0.5)
    await page.mouse.wheel(0, 200)
    await expect(page).toHaveURL('/')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit', { timeout: 10000 })
    await expect(rig(page)).toHaveAttribute('data-rig-target', '')
  })
})
