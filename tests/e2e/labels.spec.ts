import { drivesTheCanvas, expect, rig, test, type Page } from './canvas'

/** How many times the labels have measured the page, and how many frames the world has drawn (e2e-build hooks). */
const counters = (page: Page) =>
  page.evaluate(() => ({ measures: window.__labelMeasures ?? 0, frames: window.__worldFrames ?? 0 }))

/** Waits until the world has drawn `n` more frames. */
async function framesPass(page: Page, n: number) {
  const start = (await counters(page)).frames
  await expect.poll(async () => (await counters(page)).frames - start, { timeout: 60000 }).toBeGreaterThanOrEqual(n)
}

test.describe('on a phone, from afar', () => {
  test.use({ viewport: { width: 412, height: 915 } })

  test('district tags are compact, their names alone, and never over a place’s pin', async ({ page }) => {
    drivesTheCanvas()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'false')
    await framesPass(page, 10)
    const found = await page.evaluate(() => {
      const shown = (el: Element) => Number(getComputedStyle(el).opacity) > 0 && getComputedStyle(el).visibility === 'visible'
      const tags = Array.from(document.querySelectorAll('#labels a.lm-district[data-on] .lm-tag'))
        .filter(shown)
        .map((t) => {
          const r = t.getBoundingClientRect()
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, note: getComputedStyle(t.querySelector('.lm-note')!).display }
        })
      const pins = Array.from(document.querySelectorAll('#labels a[data-on]:not(.lm-district) .lm-pin'))
        .filter((p) => getComputedStyle(p).visibility === 'visible')
        .map((p) => {
          const r = p.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        })
      return { tags, pins }
    })
    expect(found.tags.length).toBeGreaterThan(0)
    for (const t of found.tags) {
      expect(t.note).toBe('none')
      expect(t.right - t.left).toBeLessThanOrEqual(412 * 0.4)
      for (const p of found.pins) expect(p.x > t.left && p.x < t.right && p.y > t.top && p.y < t.bottom, 'a pin under a district tag').toBe(false)
    }
  })
})

test.describe('label measuring', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('measures the page only when it changes, never frame by frame', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'false')
    // Let the first measures (mount, fonts, the first observations) settle.
    await framesPass(page, 10)
    await page.waitForTimeout(500)
    const before = await counters(page)
    await framesPass(page, 40)
    const after = await counters(page)
    const measures = after.measures - before.measures
    console.log(`label measures over ${after.frames - before.frames} idle frames: ${measures}`)
    expect(measures).toBeLessThanOrEqual(2)
  })

  test('measures again when the page changes, and the tags stay where they can be read', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the index drawer and the panel are laid out differently on a phone; the phone views have their own tests')
    drivesTheCanvas()
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'false')
    await framesPass(page, 10)

    /** Does `change`, then waits for a measure and a few frames, and checks every tag that can be seen. */
    const after = async (what: string, change: () => Promise<void>) => {
      const before = (await counters(page)).measures
      await change()
      await expect.poll(async () => (await counters(page)).measures, { message: `a measure after ${what}` }).toBeGreaterThan(before)
      // Settled: no new measure over a few frames (a panel or drawer that slides in is measured again when it stops).
      for (let last = -1; ; ) {
        const now = (await counters(page)).measures
        if (now === last) break
        last = now
        await framesPass(page, 6)
        await page.waitForTimeout(300)
      }
      const { width, height } = page.viewportSize()!
      const found = await page.evaluate(() => {
        const box = (el: Element) => {
          const r = el.getBoundingClientRect()
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
        }
        const shown = (el: Element) => {
          for (let e: Element | null = el; e; e = e.parentElement) {
            const s = getComputedStyle(e)
            if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false
          }
          return true
        }
        const tags = Array.from(document.querySelectorAll('#labels a[data-on] .lm-tag'))
          .filter(shown)
          .map((t) => ({ ...box(t), id: t.closest('.lm')!.id, tier: t.closest('.lm')!.getAttribute('data-tier') }))
        const covers = Array.from(document.querySelectorAll('[data-covers-labels]'))
          .filter(shown)
          .map((c) => ({ ...box(c), id: c.tagName + '.' + (c.getAttribute('aria-label') ?? c.className.toString().slice(0, 40)) }))
        return { tags, covers }
      })
      const meets = (a: (typeof found.tags)[number], b: (typeof found.tags)[number]) =>
        a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
      for (const t of found.tags) {
        expect(t.left, what).toBeGreaterThanOrEqual(0)
        expect(t.top, what).toBeGreaterThanOrEqual(0)
        expect(t.right, what).toBeLessThanOrEqual(width)
        expect(t.bottom, what).toBeLessThanOrEqual(height)
        for (const c of found.covers) expect(meets(t, c), `${what}: ${JSON.stringify(t)} under ${JSON.stringify(c)}`).toBe(false)
      }
      for (const [i, a] of found.tags.entries()) for (const b of found.tags.slice(i + 1)) expect(meets(a, b), `${what}: two tags overlap`).toBe(false)
    }

    await after('a resize', () => page.setViewportSize({ width: 1100, height: 760 }))
    await after('opening the index', () => page.getByRole('button', { name: 'Index' }).click())
    await after('closing the index', () => page.keyboard.press('Escape'))
    await after('the theme flipping', () => page.getByRole('button', { name: /night|day/i }).click())
    await after('the HUD giving way', async () => {
      const at = { x: 550, y: 380 }
      await page.mouse.move(at.x, at.y)
      for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -200)
      await expect(page.locator('html')).toHaveAttribute('data-hud-away', '')
    })
    await after('a place opening', async () => {
      // In the page, as a visitor does it: the tour's first stop opens its panel.
      await page.getByRole('link', { name: /take the tour/i }).click()
      await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 20000 })
      await expect(page.locator('article')).toBeVisible()
    })
  })
})
