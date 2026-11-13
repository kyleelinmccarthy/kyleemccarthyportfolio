import { atLandingView, drivesTheCanvas, expect, expectThePageHeld, pageAt, recordRigModes, rig, rigView, scaleRender, test, touchOf, type Page } from './canvas'
// Relative imports: Playwright does not know the `@/` alias.
import { hero } from '../../content/about'
import { placeById, places } from '../../content/world'
import { formatCoord } from '../../lib/world/geo'
import { SHEET_HANDLE_NAME as SHEET_HANDLE } from '../../lib/world/sheet'

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

/**
 * At `id`'s stop with its keys listened for. The URL alone can change a moment before the new page's tour bar has
 * attached its key listener, and a key pressed in between is lost: the bar says when it is listening.
 */
async function atStop(page: Page, id: string) {
  await expect(page).toHaveURL(`/places/${id}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(placeById(id)!.name)
  // The tour bar marks itself once its keys are listened for, for this stop (`KEYS_READY` in TourBar).
  await expect(page.getByRole('navigation', { name: 'Tour' })).toHaveAttribute('data-keys-for', id)
}

test('a place URL loads directly and the tour steps from it', async ({ page }) => {
  await page.goto('/places/home')
  await hydrated(page)
  await atStop(page, 'home')
  await page.getByRole('link', { name: 'Next place' }).click()
  await atStop(page, 'three-things')
  await page.keyboard.press('ArrowLeft')
  await atStop(page, 'home')
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
  await expect(page).toHaveURL('/places/403hq')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('403HQ')
  // The camera lands on the place the URL names, not on one it was sent to on the way. Both are
  // read together, so a camera stuck in focus somewhere else cannot pass.
  await expect
    .poll(async () => [await rig(page).getAttribute('data-rig-target'), await rig(page).getAttribute('data-rig-mode')], {
      timeout: 10000,
    })
    .toEqual(['403hq', 'focus'])
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

  test('scrolling in comes closer; scrolling out stops at the furthest, and only scrolling on past it returns to the planet', async ({
    page,
  }) => {
    drivesTheCanvas()
    await page.goto('/places/beacon')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 10000 })
    const distance = async () => (await rigView(page))?.distance ?? null
    await expect.poll(distance).not.toBeNull()
    const landed = (await distance())!
    const { width, height } = page.viewportSize()!
    await page.mouse.move(width * 0.3, height * 0.5)
    await page.mouse.wheel(0, -200)
    await expect.poll(distance).toBeLessThan(landed * 0.9)
    // One scroll out no longer leaves the place (it did before the camera could zoom here): it comes back out.
    await page.mouse.wheel(0, 200)
    await expect.poll(distance).toBeGreaterThan(landed * 0.99)
    await expect(page).toHaveURL('/places/beacon')
    // On out to the furthest in one run of scrolling, however long (a burst, as a flick's events come): still at the place.
    await page.evaluate(
      ([x, y]) => {
        const canvas = document.querySelector('canvas')!
        for (let i = 0; i < 30; i++) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, clientX: x, clientY: y, bubbles: true, cancelable: true }))
      },
      [width * 0.3, height * 0.5],
    )
    await expect.poll(async () => (await rigView(page))?.armed ?? null, { timeout: 15000 }).toBe(true)
    await expect(page).toHaveURL('/places/beacon')
    // Rested at the furthest, scrolling out again leaves.
    for (let i = 0; i < 12 && new URL(page.url()).pathname !== '/'; i++) await page.mouse.wheel(0, 200)
    await expect(page).toHaveURL('/')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit', { timeout: 10000 })
    await expect(rig(page)).toHaveAttribute('data-rig-target', '')
  })

  test('a double-click goes back to the view the place opens on, and so do the keys', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/beacon')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 15000 })
    await expect.poll(() => rigView(page)).not.toBeNull()
    const landed = (await rigView(page))!
    const { width, height } = page.viewportSize()!
    const at = { x: width * 0.3, y: height * 0.5 }
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.move(at.x + 80, at.y + 60, { steps: 6 })
    await page.mouse.up()
    await expect.poll(async () => (await rigView(page))!.elevation).toBeGreaterThan(landed.elevation + 0.1)
    expect((await rigView(page))!.azimuth).not.toBeCloseTo(landed.azimuth)
    await page.mouse.dblclick(at.x, at.y)
    await expect.poll(async () => (await rigView(page))!.elevation, { timeout: 10000 }).toBeCloseTo(landed.elevation, 3)
    await expect.poll(async () => (await rigView(page))!.azimuth, { timeout: 10000 }).toBeCloseTo(0, 3)
    // The keys: a bracket swings, a brace tilts, plus comes in, and 0 goes back. The tour's arrows are left alone.
    await page.keyboard.press(']')
    await expect.poll(async () => (await rigView(page))!.azimuth).toBeGreaterThan(0.1)
    await page.keyboard.press('}')
    await expect.poll(async () => (await rigView(page))!.elevation).toBeGreaterThan(landed.elevation + 0.1)
    await page.keyboard.press('+')
    await expect.poll(async () => (await rigView(page))!.distance).toBeLessThan(landed.distance * 0.95)
    await page.keyboard.press('0')
    await expect.poll(async () => (await rigView(page))!.distance, { timeout: 10000 }).toBeCloseTo(landed.distance, 3)
    await expect(page).toHaveURL('/places/beacon')
  })
})

test.describe('on a phone, at a place, by touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch input on the phone profile')

  /**
   * A point on the canvas above the sheet where two fingers `spread` pixels apart (and one in the middle) all come
   * down on the canvas. Only where they come down matters: a touch stays with what it began on. The guide's bubble
   * settles where it stands a moment after the camera lands, so this waits until there is such a point.
   */
  async function openView(page: Page, spread = 100) {
    const find = () =>
      page.evaluate((half) => {
        const free = (x: number, y: number) => document.elementFromPoint(x, y)?.tagName === 'CANVAS'
        const x = innerWidth / 2
        for (let y = Math.round(innerHeight * 0.2); y < innerHeight * 0.72; y += 8) if ([-half, 0, half].every((d) => free(x + d, y))) return { x, y }
        return null
      }, spread / 2)
    await expect.poll(find, { message: 'a clear stretch of canvas above the sheet' }).not.toBeNull()
    return (await find())!
  }

  test('a pinch comes closer and stays, a drag up or down tilts, a double tap on the landmark goes back, and the page never moves', async ({
    page,
  }) => {
    drivesTheCanvas()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const modes = await recordRigModes(page)
    await page.goto('/places/beacon')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 15000 })
    await expect.poll(() => rigView(page)).not.toBeNull()
    const landed = (await rigView(page))!
    const still = await pageAt(page)
    await expectThePageHeld(page)
    const touch = await touchOf(page)
    const at = await openView(page)

    await touch.pinch(at, 100, 240)
    await expect.poll(async () => (await rigView(page))!.distance).toBeLessThan(landed.distance * 0.7)
    await expect(page).toHaveURL('/places/beacon')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus')
    expect(await pageAt(page)).toEqual(still)

    await touch.drag(at, 0, 140)
    await expect.poll(async () => (await rigView(page))!.elevation).toBeGreaterThan(landed.elevation + 0.3)
    expect(await pageAt(page)).toEqual(still)

    // A double tap on the landmark itself (where it stands at the landing view: the middle of what the sheet leaves).
    // Each tap on the landmark in front of the visitor goes nowhere: no new page, no flight.
    const middle = { x: page.viewportSize()!.width / 2, y: (await page.locator('article').boundingBox())!.y / 2 }
    const flightsBefore = (await modes()).filter((m) => m === 'fly').length
    const historyBefore = await page.evaluate(() => history.length)
    await expect.poll(() => page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, middle)).toBe('CANVAS')
    await touch.doubleTap(middle)
    await expect.poll(async () => (await rigView(page))!.elevation, { timeout: 10000 }).toBeCloseTo(landed.elevation, 3)
    await expect.poll(async () => (await rigView(page))!.distance, { timeout: 10000 }).toBeCloseTo(landed.distance, 3)
    await expect(page).toHaveURL('/places/beacon')
    expect((await modes()).filter((m) => m === 'fly').length).toBe(flightsBefore)
    expect(await page.evaluate(() => history.length)).toBe(historyBefore)
  })

  test('one long pinch out stays at the place, however far; a second, once the camera rests at the furthest, leaves', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/beacon')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 15000 })
    await expect.poll(() => rigView(page)).not.toBeNull()
    const still = await pageAt(page)
    const touch = await touchOf(page)
    const at = await openView(page, 320)
    // Fingers from far apart to nearly touching, in one go: out to the furthest and well past it.
    await touch.pinch(at, 320, 50, 24)
    await expect.poll(async () => (await rigView(page))?.armed ?? null, { timeout: 15000 }).toBe(true)
    await expect(page).toHaveURL('/places/beacon')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus')
    // Rested there, a second pinch out goes back to the planet.
    await touch.pinch(at, 320, 120, 24)
    await expect(page).toHaveURL('/', { timeout: 15000 })
    expect(await pageAt(page)).toEqual(still)
  })

  test('a drag that starts on the visitor’s character turns the camera; a tap on it opens the picker; the place’s keys wait while it is open', async ({
    page,
  }) => {
    drivesTheCanvas()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/places/beacon')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 15000 })
    await expect.poll(() => rigView(page)).not.toBeNull()
    const landed = (await rigView(page))!
    const guest = (await atLandingView(page, 'beacon')).guest
    // Once the HUD has settled (the guide's bubble finds its place a moment after the camera lands), nothing covers her.
    await expect.poll(() => page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, guest)).toBe('CANVAS')
    const touch = await touchOf(page)
    await touch.drag(guest, 60, 0)
    await expect.poll(async () => (await rigView(page))!.azimuth).not.toBeCloseTo(landed.azimuth, 2)
    // Back to the landing view, so the character stands where it was, and a tap on it.
    await page.keyboard.press('0')
    await expect.poll(async () => (await rigView(page))!.azimuth).toBeCloseTo(0, 3)
    await page.touchscreen.tap(guest.x, guest.y)
    const dialog = page.getByRole('dialog', { name: 'Pick your character' })
    await expect(dialog).toBeVisible()
    // While it is open the place's keys are the picker's business: the camera stays put.
    const before = (await rigView(page))!
    await page.keyboard.press(']')
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    expect(await rigView(page)).toEqual(before)
  })

  test('the guide’s bubble keeps clear of the sheet, at its peek and open in full', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/beacon')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 15000 })
    const bubble = page.locator('#guide-bubble')
    await expect(bubble).toBeVisible({ timeout: 15000 })
    const clear = async () => {
      const a = (await page.locator('article').boundingBox())!
      const b = (await bubble.boundingBox())!
      return b.y + b.height <= a.y + 1 || b.y >= a.y + a.height - 1
    }
    await expect.poll(clear).toBe(true)
    await page.getByRole('button', { name: SHEET_HANDLE }).tap()
    await expect(page.getByRole('button', { name: SHEET_HANDLE })).toHaveAttribute('aria-expanded', 'true')
    await expect.poll(clear, { timeout: 10000 }).toBe(true)
  })

  test('the sheet opens at a peek, opens in full and closes again by its handle, and scrolls when open', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/beacon')
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 15000 })
    const { height } = page.viewportSize()!
    const sheet = page.locator('article')
    const sheetHeight = async () => (await sheet.boundingBox())!.height
    // One name, open or not; its state is aria-expanded.
    const handle = page.getByRole('button', { name: SHEET_HANDLE })
    const open = handle
    await expect(handle).toHaveAttribute('aria-expanded', 'false')
    // At its peek: the name shows, and most of the screen is left to the landmark.
    await expect.poll(sheetHeight).toBeLessThanOrEqual(height * 0.28)
    expect(await sheetHeight()).toBeGreaterThanOrEqual(height * 0.2)
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
    const still = await pageAt(page)

    await handle.tap()
    await expect(open).toHaveAttribute('aria-expanded', 'true')
    await expect.poll(sheetHeight).toBeGreaterThan(height * 0.5)

    // Its content scrolls under a finger, and the page does not.
    const body = page.locator('#place-panel-body')
    expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
    const box = (await body.boundingBox())!
    const touch = await touchOf(page)
    await touch.drag({ x: box.x + box.width / 2, y: box.y + box.height * 0.8 }, 0, -box.height * 0.5)
    await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    expect(await pageAt(page)).toEqual(still)

    await open.tap()
    await expect(handle).toHaveAttribute('aria-expanded', 'false')
    await expect.poll(sheetHeight).toBeLessThanOrEqual(height * 0.28)

    // Dragged up by its handle, it opens; dragged down, it closes.
    const grip = (await handle.boundingBox())!
    await touch.drag({ x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }, 0, -120)
    await expect(open).toHaveAttribute('aria-expanded', 'true')
    const grip2 = (await open.boundingBox())!
    await touch.drag({ x: grip2.x + grip2.width / 2, y: grip2.y + grip2.height / 2 }, 0, 120)
    await expect(handle).toHaveAttribute('aria-expanded', 'false')
    expect(await pageAt(page)).toEqual(still)
  })
})

test('without JavaScript on a phone, the sheet is open in full and has no handle', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 412, height: 915 } })
  await scaleRender(ctx)
  const page = await ctx.newPage()
  await page.goto('/places/beacon')
  await expect(page.getByRole('button', { name: SHEET_HANDLE })).toHaveCount(0)
  await expect(page.getByRole('button', { name: SHEET_HANDLE, includeHidden: true })).toBeHidden()
  expect((await page.locator('article').boundingBox())!.height).toBeGreaterThan(915 * 0.5)
  await ctx.close()
})

test.describe('on a phone on its side, at a place', () => {
  test.use({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true })

  test('the sheet’s peek still shows the place’s name', async ({ page }) => {
    await page.goto('/places/kingdoms-and-crowns')
    await hydrated(page)
    await expect(page.getByRole('button', { name: SHEET_HANDLE })).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('article')).toHaveAttribute('data-sheet', 'peek')
    // Wholly in view: not clipped by the sheet's own height, nor off the screen.
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport({ ratio: 1 })
    const sheet = (await page.locator('article').boundingBox())!
    const name = (await page.getByRole('heading', { level: 1 }).boundingBox())!
    expect(name.y + name.height).toBeLessThanOrEqual(sheet.y + sheet.height)
  })
})
