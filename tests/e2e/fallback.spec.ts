import { expect, scaleRender, test, type Page } from './canvas'

/** See world.spec.ts: Vercel's scripts are missing off Vercel, and nothing else is excused. */
const offVercel = (text: string) => text.includes('/_vercel/')

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

test('without WebGL the picture stands in and the site still works', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null
  })
  await page.goto('/places/eliminated')
  await hydrated(page)
  await expect(page.getByTestId('world-poster')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eliminated')
  await page.getByRole('link', { name: 'Next place' }).click()
  await expect(page).toHaveURL('/places/eliminated-site')
  // Still no canvas after the idle callback would have fired, and the 3D code was never fetched.
  await page.waitForTimeout(2500)
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.getByTestId('world-poster')).toBeVisible()
})

test('without WebGL the 3D code is never downloaded', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null
  })
  const threeChunks: string[] = []
  page.on('response', async (response) => {
    if (!response.url().includes('/_next/static/chunks/')) return
    const body = await response.text().catch(() => '')
    if (body.includes('WebGLRenderer')) threeChunks.push(response.url())
  })
  await page.goto('/')
  await hydrated(page)
  await page.waitForTimeout(3000)
  expect(threeChunks).toEqual([])
})

test('losing the graphics context mid-visit falls back to the picture', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await page.evaluate(() => document.querySelector('canvas')!.dispatchEvent(new Event('webglcontextlost')))
  await expect(page.getByTestId('world-poster')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await page.getByRole('button', { name: 'Index' }).click()
  await expect(page.locator('#index a')).toHaveCount(19)
  await expect(page.locator('#index')).toBeVisible()
})

test('the panel is readable before the 3D code arrives', async ({ page }) => {
  // Hold back exactly the chunks that carry three.js, whatever their hashed names.
  let held = 0
  let released = false
  await page.route('**/_next/static/chunks/**', async (route) => {
    const response = await route.fetch()
    const body = await response.text()
    if (body.includes('WebGLRenderer')) {
      held += 1
      await new Promise((r) => setTimeout(r, 4000))
      released = true
    }
    await route.fulfill({ response, body })
  })
  // Not the load event: under load the page's own scripts can start the 3D chunks before it fires, and `load` then waits for them.
  await page.goto('/places/beacon', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beacon')
  expect(released).toBe(false)
  await expect(page.getByTestId('world-poster')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  // The held chunk was the 3D code: the canvas arrives only once it is let through.
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20000 })
  expect(held).toBeGreaterThan(0)
  expect(released).toBe(true)
})

test('reduced motion runs clean', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  await scaleRender(ctx)
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !offVercel(`${m.text()} ${m.location().url}`)) errors.push(`${m.text()} (${m.location().url})`)
  })
  await page.goto('/places/beacon')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(2500)
  expect(errors).toEqual([])
  await ctx.close()
})

for (const theme of ['day', 'night'] as const) {
  test(`the stand-in picture matches the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((t) => {
      HTMLCanvasElement.prototype.getContext = () => null
      sessionStorage.setItem('kym-theme', t)
    }, theme)
    await page.goto('/')
    const picture = page.getByTestId('world-poster').locator('img')
    await expect(picture).toHaveAttribute('src', new RegExp(`poster-${theme}`))
    // The file is really there and really decodes to a picture, not a broken image.
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(1600)
  })
}

test('the stand-in picture follows the theme toggle', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null
    sessionStorage.setItem('kym-theme', 'day')
  })
  await page.goto('/')
  await hydrated(page)
  const picture = page.getByTestId('world-poster').locator('img')
  await expect(picture).toHaveAttribute('src', /poster-day/)
  await page.getByRole('button', { name: /night/i }).click()
  await expect(picture).toHaveAttribute('src', /poster-night/)
})

test.describe('while the tab is hidden', () => {
  /** Hides or shows the tab the way the browser reports it: the property, then the event. */
  const setHidden = (page: Page, hidden: boolean) =>
    page.evaluate((value) => {
      Object.defineProperty(document, 'hidden', { value, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }, hidden)
  const frames = (page: Page) => page.evaluate(() => window.__worldFrames ?? -1)

  test('the render loop stops, and carries on again when the tab comes back', async ({ page }) => {
    test.slow()
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect.poll(() => frames(page)).toBeGreaterThan(2)

    await setHidden(page, true)
    // A frame already under way when the tab was hidden may finish; none starts after that.
    await page.waitForTimeout(400)
    const stopped = await frames(page)
    await page.waitForTimeout(1500)
    expect(await frames(page)).toBe(stopped)

    await setHidden(page, false)
    await expect.poll(() => frames(page), { timeout: 15000 }).toBeGreaterThan(stopped + 2)
  })

  test('a resize while hidden draws nothing, and the picture is whole again once the tab returns', async ({ page }) => {
    test.slow()
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect.poll(() => frames(page)).toBeGreaterThan(2)

    await setHidden(page, true)
    await page.waitForTimeout(400)
    const stopped = await frames(page)
    await page.setViewportSize({ width: 900, height: 700 })
    await page.waitForTimeout(1500)
    expect(await frames(page)).toBe(stopped)

    await setHidden(page, false)
    await expect.poll(() => frames(page), { timeout: 15000 }).toBeGreaterThan(stopped + 2)
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('a tab opened hidden draws nothing until it is shown', async ({ page }) => {
    test.slow()
    await page.addInitScript(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // The 3D code has mounted (the counter is there, at zero) before the wait, so the wait proves something.
    await expect.poll(() => frames(page), { timeout: 20000 }).toBe(0)
    await expect(page.locator('canvas')).toBeAttached()
    await page.waitForTimeout(5000)
    expect(await frames(page)).toBe(0)
    await setHidden(page, false)
    await expect.poll(() => frames(page), { timeout: 20000 }).toBeGreaterThan(2)
    await expect(page.locator('canvas')).toBeVisible()
  })
})
