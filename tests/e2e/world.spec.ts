import { drivesTheCanvas, expect, rig, test, type Page } from './canvas'
import { PerspectiveCamera, type Vector3 } from 'three'
// Relative imports: Playwright does not know the `@/` alias.
import { districts, places } from '../../content/world'
import { MODEL_SCALE, orbitPose, overviewDistance } from '../../lib/world/camera'
import { angleDeg, dirOf } from '../../lib/world/geo'
import { landmarkBox, landmarkTop, tagOverLandmark } from '../../lib/world/labels'
import { groundOf, isLand } from '../../lib/world/terrain'

/**
 * On a local production build the two /_vercel/... scripts 404 and log console
 * errors; that is expected off Vercel. Nothing else is excused.
 */
const offVercel = (text: string) => text.includes('/_vercel/')

function watchForErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !offVercel(`${m.text()} ${m.location().url}`)) errors.push(`${m.text()} (${m.location().url})`)
  })
  return errors
}

test('the planet renders without errors', async ({ page }) => {
  const errors = watchForErrors(page)
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(3000)
  await page.goto('/places/beacon')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(3000)
  expect(errors).toEqual([])
})

test('once the canvas runs it replaces the picture and is hidden from assistive technology', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('world-poster')).toHaveCount(0)
  await expect(page.locator('canvas').locator('xpath=ancestor-or-self::*[@aria-hidden="true"]')).not.toHaveCount(0)
})

test('the canvas paints a sky, not a black screen', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-10T14:00:00'))
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(1500)
  // Sample the top and bottom of the drawn sky from a screenshot of the canvas alone.
  const shot = await page.locator('canvas').screenshot()
  const pixels = await page.evaluate(async (png) => {
    const image = new Image()
    image.src = `data:image/png;base64,${png}`
    await image.decode()
    const c = document.createElement('canvas')
    c.width = image.width
    c.height = image.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(image, 0, 0)
    const at = (y: number) => Array.from(ctx.getImageData(Math.floor(image.width * 0.2), Math.floor(image.height * y), 1, 1).data)
    return { top: at(0.03), bottom: at(0.97) }
  }, shot.toString('base64'))
  // Afternoon: a blue zenith over a pale horizon.
  const [tr, tg, tb] = pixels.top
  const [br, bg, bb] = pixels.bottom
  expect(tb).toBeGreaterThan(200)
  expect(tr).toBeLessThan(tb)
  expect(br + bg + bb).toBeGreaterThan(tr + tg + tb)
})

/**
 * A point near (x, y) where the pointer reaches the canvas: not a map label, nor
 * any of the page's own controls. Labels sit over the planet wherever it puts them.
 */
async function canvasPointNear(page: Page, x: number, y: number) {
  const point = await page.evaluate(
    ([x0, y0]) => {
      for (let r = 0; r <= 240; r += 8) {
        for (let k = 0; k < (r === 0 ? 1 : 16); k++) {
          const x = x0 + r * Math.cos((k * Math.PI) / 8)
          const y = y0 + r * Math.sin((k * Math.PI) / 8)
          if (document.elementFromPoint(x, y)?.tagName === 'CANVAS') return { x, y }
        }
      }
      return null
    },
    [x, y],
  )
  expect(point, `a point on the canvas near ${x}, ${y}`).not.toBeNull()
  return point!
}

/** The first of `points` that falls on the canvas, clear of every label and control. */
async function firstOnCanvas<T extends { x: number; y: number }>(page: Page, points: T[]): Promise<T> {
  const at = await page.evaluate(
    (list) => list.find(({ x, y }) => document.elementFromPoint(x, y)?.tagName === 'CANVAS') ?? null,
    points,
  )
  expect(at, 'a point on the canvas').not.toBeNull()
  return at as T
}

test('clicks pass through empty sky to the canvas while the controls still work', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  const viewport = page.viewportSize()!
  // Under the middle of the screen, past any map label there, the page's content layer lets the pointer through.
  const hit = await page.evaluate(
    ([x, y]) => document.elementsFromPoint(x, y).find((el) => !el.closest('#labels'))?.tagName ?? null,
    [Math.round(viewport.width / 2), Math.round(viewport.height / 2)],
  )
  expect(hit).toBe('CANVAS')
  await page.getByRole('button', { name: 'Index' }).click()
  await expect(page.locator('#index')).toBeVisible()
})

/** Records every mode the rig reports from the page's first moment, so a passing one is not missed. */
async function recordRigModes(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = ((window as unknown as { rigModes: string[] }).rigModes = [])
    new MutationObserver((records) => {
      for (const r of records) seen.push((r.target as Element).getAttribute('data-rig-mode') ?? '')
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-rig-mode'] })
  })
  return () => page.evaluate(() => (window as unknown as { rigModes: string[] }).rigModes)
}

test('an island link turns the planet to it and leaves it in orbit', async ({ page }) => {
  drivesTheCanvas()
  const errors = watchForErrors(page)
  const modes = await recordRigModes(page)
  await page.goto('/?district=frenzy')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  // A flight advances at most 0.1s a frame, and software WebGL under a full suite draws only a few frames a second.
  await expect.poll(async () => (await modes()).at(-1), { timeout: 20000 }).toBe('orbit')
  // It flew there, and never came down to a place.
  expect(await modes()).toContain('fly')
  expect(await modes()).not.toContain('focus')
  await expect(rig(page)).toHaveAttribute('data-rig-target', '')
  // Held still on the island for a while after landing.
  await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'false')
  expect(errors).toEqual([])
})

test('dragging the planet stops it turning and goes nowhere', async ({ page }) => {
  drivesTheCanvas()
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit')
  await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'true')
  const { width, height } = page.viewportSize()!
  const from = await canvasPointNear(page, width * 0.5, height * 0.5)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 120, from.y + 20, { steps: 8 })
  await page.mouse.up()
  await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'false')
  await page.waitForTimeout(500)
  await expect(page).toHaveURL('/')
  await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit')
})

test.describe('with reduced motion', () => {
  // `test.use({ reducedMotion })` does not reach matchMedia under these device presets; this does.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('the planet holds still and the camera cuts to a place', async ({ page }) => {
    drivesTheCanvas()
    const modes = await recordRigModes(page)
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit')
    await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'false')
    await page.goto('/places/beacon')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus')
    await expect(rig(page)).toHaveAttribute('data-rig-target', 'beacon')
    // Straight to focus on arriving at the place: never a flight.
    expect(await modes()).not.toContain('fly')
    expect((await modes()).at(-1)).toBe('focus')
  })

  test('clicking the sea or bare land does nothing, a drag across a landmark goes nowhere, and a click on one goes there', async ({
    page,
  }) => {
    // Two loads of the planet in software WebGL.
    drivesTheCanvas()
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'false')
    await page.waitForTimeout(500)
    // Held still, the camera is exactly where it opens: the overview over 8°N 6°W.
    const { width, height } = page.viewportSize()!
    const camera = new PerspectiveCamera(35, width / height, 0.05, 300)
    const pose = orbitPose(dirOf({ lat: 8, lon: -6 }), overviewDistance(width / height))
    camera.position.copy(pose.position)
    camera.quaternion.copy(pose.quaternion)
    camera.updateMatrixWorld()
    const onScreen = (p: Vector3) => {
      const v = p.clone().project(camera)
      return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height }
    }

    // Sea and ground on the near side, at least 8° from every place, so no landmark stands there.
    const clear: Array<{ lat: number; lon: number }> = []
    for (let lat = -30; lat <= 40; lat += 5) {
      for (let lon = -45; lon <= 35; lon += 5) {
        if (places.every((p) => angleDeg(dirOf(p.at), dirOf({ lat, lon })) > 8)) clear.push({ lat, lon })
      }
    }
    const sea = await firstOnCanvas(page, clear.filter((p) => !isLand(dirOf(p), districts)).map((p) => onScreen(dirOf(p))))
    const land = await firstOnCanvas(
      page,
      clear.filter((p) => isLand(dirOf(p), districts)).map((p) => onScreen(groundOf(p, districts))),
    )
    for (const point of [sea, land]) {
      await page.mouse.click(point.x, point.y)
      await page.waitForTimeout(300)
      await expect(page).toHaveURL('/')
    }

    // The middle of a landmark on the near side, where its hit sphere is.
    const target = await firstOnCanvas(
      page,
      places
        .filter((p) => angleDeg(dirOf(p.at), dirOf({ lat: 8, lon: -6 })) < 40)
        .map((p) => ({
          id: p.id,
          ...onScreen(groundOf(p.at, districts).addScaledVector(dirOf(p.at), (p.height / 2) * MODEL_SCALE)),
        })),
    )
    await page.mouse.move(target.x, target.y)
    await expect(page.locator(`#label-${target.id}`)).toHaveAttribute('data-hot', '')
    await expect(page.locator('canvas')).toHaveCSS('cursor', 'pointer')
    // From afar its label shows itself while the landmark is hovered, and leaves the pointer on the landmark.
    await expect(page.locator(`#label-${target.id} .lm-tag`)).toBeVisible()
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, target)).toBe('CANVAS')
    // Pressed on the landmark and dragged 40px: a drag, not a click.
    await page.mouse.down()
    await page.mouse.move(target.x + 40, target.y, { steps: 4 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    await expect(page).toHaveURL('/')
    // Back to the opening view, and a click on it.
    await page.reload()
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(500)
    await page.mouse.click(target.x, target.y)
    await expect(page).toHaveURL(`/places/${target.id}`)
  })
})

test.describe('on a wide screen, at a place', () => {
  // On a phone the panel is a bottom sheet over the ground round the place, and no label shows under it.
  test.skip(({ isMobile }) => isMobile, 'the panel covers the neighbouring places on a phone')
  // Every test here tracks labels or waits on the rig.
  drivesTheCanvas()

  test('labels track the planet through a resize', async ({ page }) => {
    // Review Focus 4
    await page.goto('/places/beacon')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3500)
    // Landed, so the labels have stopped moving.
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 10000 })
    const vis = async () => await page.locator('#labels a:visible').count()
    expect(await vis()).toBeGreaterThan(0)
    await page.setViewportSize({ width: 700, height: 900 })
    await page.waitForTimeout(800)
    for (const box of await page
      .locator('#labels a:visible')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left)))
      expect(box).toBeLessThan(700)
  })

  test('clicking a visible label flies there', async ({ page }) => {
    await page.goto('/places/beacon')
    await page.waitForTimeout(3500)
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 10000 })
    const other = page.locator('#labels a:visible').first()
    const href = await other.getAttribute('href')
    await other.click()
    await expect(page).toHaveURL(href!)
  })

  test('every place and district has a named label link, and the place in focus hides its own', async ({ page }) => {
    await page.goto('/places/beacon')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 10000 })
    const labels = page.locator('#labels')
    await expect(labels.locator('a')).toHaveCount(19 + 5)
    const beacon = labels.getByRole('link', {
      name: 'Beacon Engineering operations platform',
      exact: true,
      includeHidden: true,
    })
    await expect(beacon).toHaveId('label-beacon')
    await expect(beacon).toHaveAttribute('href', '/places/beacon')
    await expect(beacon).toBeHidden()
    // A neighbour is named the same way, and can be seen.
    await expect(labels.getByRole('link', { name: 'NBS Website Company site, 66 pages rebuilt', exact: true })).toBeVisible()
    await expect(
      labels.getByRole('link', { name: 'The Works 06 places · What I build for a living', exact: true, includeHidden: true }),
    ).toHaveAttribute('href', '/?district=works')
  })

  test('no label shows under the panel', async ({ page }) => {
    await page.goto('/places/beacon')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 10000 })
    await page.waitForTimeout(500)
    const panel = (await page.locator('article').boundingBox())!
    const pins = await page.locator('#labels a:visible').evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      }),
    )
    for (const p of pins) {
      const under = p.x >= panel.x && p.x <= panel.x + panel.width && p.y >= panel.y && p.y <= panel.y + panel.height
      expect(under, `a label at ${p.x}, ${p.y}`).toBe(false)
    }
  })
})

test('from afar the districts are labelled, places are dots, and the far side is hidden', async ({ page }) => {
  drivesTheCanvas()
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(1500)
  // The links to be seen and pressed are the districts'.
  const links = await page.locator('#labels a:visible').evaluateAll((els) => els.map((e) => e.getAttribute('data-tier')))
  expect(links.length).toBeGreaterThan(0)
  expect(links.every((tier) => tier === 'district')).toBe(true)
  // Every place on the near side is a pin: a mark on the map, out of the tab order.
  const dots = page.locator('#labels a[data-tier="dot"][data-on]')
  const shown = await dots.count()
  expect(shown).toBeGreaterThan(0)
  // Some of the 19 are round the back.
  expect(shown).toBeLessThan(19)
  await expect(dots.locator('.lm-pin').first()).toBeVisible()
  await expect(dots.first()).toBeHidden()
  await expect(page.locator('#labels a[data-tier="place"][data-on]')).toHaveCount(0)
})

test('hovering a landmark lights its label, and clicking it, even after a six-pixel slip, goes there', async ({ page }) => {
  drivesTheCanvas()
  await page.goto('/?district=works')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit', { timeout: 10000 })
  await page.waitForTimeout(500)
  // The visible label nearest the middle of the screen, and the point on its building just under its pin.
  const target = await page.locator('#labels a[data-tier="place"]:visible').evaluateAll((els) => {
    const mid = { x: innerWidth / 2, y: innerHeight / 2 }
    const at = els.map((e) => {
      const r = e.getBoundingClientRect()
      return { id: e.id, x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
    at.sort((a, b) => Math.hypot(a.x - mid.x, a.y - mid.y) - Math.hypot(b.x - mid.x, b.y - mid.y))
    return at[0]
  })
  expect(target).toBeTruthy()
  const below = { x: target.x, y: target.y + 22 }
  await page.mouse.move(below.x, below.y)
  await expect(page.locator(`#${target.id}`)).toHaveAttribute('data-hot', '')
  await expect(page.locator('canvas')).toHaveCSS('cursor', 'pointer')
  await page.mouse.down()
  await page.mouse.move(below.x + 6, below.y)
  await page.mouse.up()
  await expect(page).toHaveURL(`/places/${target.id.replace(/^label-/, '')}`)
})

test('the map readout names the plate and the view, and steps aside for a place', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  const readout = page.locator('#view-readout')
  await expect(readout).toContainText('Plate 01 · 5 districts · 19 places')
  await expect(readout).toContainText(/View \d+°[NS] \d{3}°[EW] · \d+\.\d×/)
  await page.goto('/places/beacon')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await expect(readout).toHaveCSS('visibility', 'hidden')
})

test('the hint shows on the planet until the visitor first touches it', async ({ page }) => {
  drivesTheCanvas()
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  const hint = page.getByText('Drag to spin · Scroll to zoom · Click a place')
  await expect(hint).toHaveCount(1)
  const { width, height } = page.viewportSize()!
  // From a point on the canvas itself, clear of every label and control wherever the planet has put them.
  const from = await canvasPointNear(page, width * 0.5, height * 0.15)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 80, from.y, { steps: 4 })
  await page.mouse.up()
  await expect(hint).toHaveCount(0)
})

/** Whether a label's tag has been opened by a tap. */
const isOpen = (label: ReturnType<Page['locator']>) => label.evaluate((el) => el.hasAttribute('data-open'))

/** The opacity the stylesheet has settled on for an element. */
const opacityOf = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => Number(getComputedStyle(el).opacity))

test('in close, the headline, greeting and legend give way, and come back for focus and when the camera pulls out', async ({ page }) => {
  drivesTheCanvas()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // An island turned toward the visitor: closer than 3.25.
  await page.goto('/?district=works')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit', { timeout: 15000 })
  await expect(page.locator('html')).toHaveAttribute('data-hud-away', '')
  await expect.poll(() => opacityOf(page, 'header [data-gives-way]')).toBe(0)
  await expect.poll(() => opacityOf(page, 'main [data-gives-way]')).toBe(0)
  // The role line goes with them (R31).
  expect(await page.getByText('Director of Technology Operations · Builder · Artist').evaluate((el) => el.closest('[data-gives-way]') !== null)).toBe(true)
  // The name and the controls never fade, and the name stands on its plate.
  expect(await page.getByRole('heading', { level: 1 }).evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1)
  await expect.poll(() => page.locator('.hud-name').evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  // A faded legend lets the pointer through to the planet.
  const legendLink = page.locator('main [data-gives-way] a').first()
  const box = (await legendLink.boundingBox())!
  const under = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('a')?.closest('[data-gives-way]') ?? null, [
    box.x + box.width / 2,
    box.y + box.height / 2,
  ])
  expect(under).toBeNull()
  // Focus inside it brings it back to full strength while focus stays there, so no focused link is ever invisible,
  // and while it is back no map label shows under it.
  await legendLink.focus()
  await expect.poll(() => opacityOf(page, 'main [data-gives-way]')).toBe(1)
  const legend = (await page.locator('main [data-gives-way]').boundingBox())!
  await expect
    .poll(() =>
      page.locator('#labels a[data-on] .lm-pin').evaluateAll(
        (pins, r) =>
          pins.filter((p) => {
            const b = p.getBoundingClientRect()
            const x = b.left + b.width / 2
            const y = b.top + b.height / 2
            return getComputedStyle(p).visibility === 'visible' && x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height
          }).length,
        legend,
      ),
    )
    .toBe(0)
  await legendLink.blur()
  await expect.poll(() => opacityOf(page, 'main [data-gives-way]')).toBe(0)
  // Back out at the overview, everything is there again.
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await expect(rig(page)).toHaveAttribute('data-rig-mode', 'orbit', { timeout: 15000 })
  await expect(page.locator('html')).not.toHaveAttribute('data-hud-away', '')
  await expect.poll(() => opacityOf(page, 'header [data-gives-way]')).toBe(1)
  await expect.poll(() => opacityOf(page, 'main [data-gives-way]')).toBe(1)
})

test('every label tag that shows stays wholly on the screen', async ({ page }) => {
  drivesTheCanvas()
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(1500)
  const { width, height } = page.viewportSize()!
  const tags = await page.locator('#labels a[data-on]:not([data-tagless]) .lm-tag:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    }),
  )
  expect(tags.length).toBeGreaterThan(0)
  for (const t of tags) {
    expect(t.left).toBeGreaterThanOrEqual(0)
    expect(t.top).toBeGreaterThanOrEqual(0)
    expect(t.right).toBeLessThanOrEqual(width)
    expect(t.bottom).toBeLessThanOrEqual(height)
  }
  // No two tags that show overlap.
  for (const [i, a] of tags.entries()) {
    for (const b of tags.slice(i + 1)) {
      expect(a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom).toBe(false)
    }
  }
})

test.describe('the labels landmark', () => {
  // The empty view below is worked out for a desktop window.
  test.use({ viewport: { width: 1280, height: 720 } })

  test('is a landmark only while a link in it shows; constellation names alone do not count', async ({ page }) => {
    drivesTheCanvas()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // By night, so the constellations' names are up whenever the planet and the clouds leave them be.
    await page.clock.setFixedTime(new Date('2026-11-10T23:00:00'))
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'false')
    const state = () =>
      page.evaluate(() => {
        const layer = document.getElementById('labels')!
        return { role: layer.getAttribute('role'), links: layer.querySelectorAll('a[data-on]:not([data-tier="dot"])').length }
      })
    await expect.poll(async () => (await state()).links).toBeGreaterThan(0)
    await expect(page.getByRole('navigation', { name: 'Places on the map' })).toHaveCount(1)
    // Turn the planet 132 degrees west, to open sea between the islands, and come in as close as the controls allow:
    // no district label (too close) and no place on screen.
    const { width, height } = page.viewportSize()!
    const dx = -((132 / 360) * height) / 0.55
    const from = await canvasPointNear(page, width * 0.7, height * 0.5)
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + dx, from.y, { steps: 12 })
    await page.mouse.up()
    // Zoom in over the canvas itself, not over a label.
    const middle = await canvasPointNear(page, width * 0.5, height * 0.5)
    await page.mouse.move(middle.x, middle.y)
    // Wheel until the controls stop at their nearest (the readout's zoom stops growing at 2.1×).
    for (let i = 0; i < 60 && !/2\.1×/.test((await page.locator('#view-readout').textContent()) ?? ''); i++) {
      await page.mouse.wheel(0, -200)
      await page.waitForTimeout(80)
    }
    await expect(page.locator('#view-readout')).toContainText(/2\.1×/, { timeout: 20000 })
    await expect.poll(async () => (await state()).links, { timeout: 20000 }).toBe(0)
    expect((await state()).role).toBeNull()
    await expect(page.getByRole('navigation', { name: 'Places on the map' })).toHaveCount(0)
    // Whatever is on the sky, nothing in the layer is a link the visitor could reach.
    await expect(page.locator('#labels a:visible')).toHaveCount(0)
  })
})

test.describe('with reduced motion, from afar', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  /** The overview camera, held still, and where a point in the world falls on the screen from it. */
  async function overview(page: Page) {
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'false')
    await page.waitForTimeout(500)
    const { width, height } = page.viewportSize()!
    const camera = new PerspectiveCamera(35, width / height, 0.05, 300)
    const pose = orbitPose(dirOf({ lat: 8, lon: -6 }), overviewDistance(width / height))
    camera.position.copy(pose.position)
    camera.quaternion.copy(pose.quaternion)
    camera.updateMatrixWorld()
    return (p: Vector3) => {
      const v = p.clone().project(camera)
      return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height }
    }
  }

  test('a hovered landmark’s tag waits for the pointer to reach it, and stays while the pointer is on it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'hovering needs a mouse')
    drivesTheCanvas()
    const onScreen = await overview(page)
    const target = await firstOnCanvas(
      page,
      places
        .filter((p) => angleDeg(dirOf(p.at), dirOf({ lat: 8, lon: -6 })) < 40)
        .map((p) => ({ id: p.id, ...onScreen(groundOf(p.at, districts).addScaledVector(dirOf(p.at), (p.height / 2) * MODEL_SCALE)) })),
    )
    const label = page.locator(`#label-${target.id}`)
    await page.mouse.move(target.x, target.y)
    await expect(label).toHaveAttribute('data-hot', '')
    const tag = label.locator('.lm-tag')
    await expect(tag).toBeVisible()
    const box = (await tag.boundingBox())!
    // Off the landmark onto bare canvas beside it, a moment there, then up onto the tag, as a hand often goes: the label is
    // still there when the pointer arrives.
    const beside = { x: box.x + box.width / 2, y: target.y }
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, beside)).toBe('CANVAS')
    await page.mouse.move(beside.x, beside.y, { steps: 3 })
    await page.waitForTimeout(250)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 })
    await expect(tag).toBeVisible()
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.lm')?.id, { x: box.x + box.width / 2, y: box.y + box.height / 2 })).toBe(
      `label-${target.id}`,
    )
    // On the tag, it stays well past the grace period.
    await page.waitForTimeout(1500)
    await expect(tag).toBeVisible()
    // Away from both, it goes once the grace runs out.
    const away = await canvasPointNear(page, 40, page.viewportSize()!.height - 40)
    await page.mouse.move(away.x, away.y, { steps: 4 })
    await expect(tag).toBeHidden({ timeout: 5000 })
  })

  test('a district’s tag never stands over a landmark: it rises clear or collapses to its pin, and a live tag takes its own clicks (R33)', async ({
    page,
  }) => {
    drivesTheCanvas()
    const onScreen = await overview(page)
    // Every landmark on the near side, as a box on the screen from its ground to its top.
    const boxes = places
      .filter((p) => angleDeg(dirOf(p.at), dirOf({ lat: 8, lon: -6 })) < 70)
      .map((p) => landmarkBox(onScreen(groundOf(p.at, districts)), onScreen(landmarkTop(p, districts))))
    const districtLabels = page.locator('#labels a.lm-district[data-on]')
    await expect.poll(() => districtLabels.count()).toBeGreaterThan(0)
    const count = await districtLabels.count()
    for (let i = 0; i < count; i++) {
      const link = districtLabels.nth(i)
      const tag = link.locator('.lm-tag')
      const collapsed = (await link.getAttribute('data-tagless')) !== null
      if (collapsed) {
        expect(await tag.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0)
        expect(await tag.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
      } else {
        const r = (await tag.boundingBox())!
        expect(tagOverLandmark({ left: r.x, top: r.y, right: r.x + r.width, bottom: r.y + r.height }, boxes), (await link.getAttribute('id'))!).toBe(false)
        // A tag that can be seen takes the click itself: nothing under it gets it.
        for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.3], [0.85, 0.7]]) {
          const owner = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.lm')?.id ?? null, {
            x: r.x + r.width * fx!,
            y: r.y + r.height * fy!,
          })
          expect(owner).toBe(await link.getAttribute('id'))
        }
      }
      // Focused, its tag shows in full, collapsed or not.
      await link.focus()
      await expect(link).toBeFocused()
      await expect.poll(() => tag.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1)
      await link.blur()
    }
  })
})

test.describe('on a phone, from afar', () => {
  // The narrowest phone, the planet turned a little west: After Hours' tag has nowhere to go but over a landmark or a pin.
  test.use({ viewport: { width: 320, height: 900 }, hasTouch: true })

  test('a district’s tag that would stand over a landmark collapses to a named pin; a tap shows it, the next goes there (R33)', async ({
    page,
  }) => {
    drivesTheCanvas()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-autorotate', 'false')
    // Held still (reduced motion: no coasting), a 60px drag turns the planet the same way every time.
    const from = await canvasPointNear(page, 160, 558)
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(from.x - 6 * i, from.y)
    await page.mouse.up()
    const collapsed = page.locator('#labels a.lm-district[data-on][data-tagless]')
    // This view is known to crowd at least one district: zero would mean the rule was never reached.
    await expect.poll(() => collapsed.count()).toBeGreaterThan(0)
    const id = (await collapsed.first().getAttribute('id'))!
    // By its id: once opened it is held, and no longer collapsed.
    const link = page.locator(`#${id}`)
    const district = districts.find((d) => id === `label-district-${d.id}`)!
    // Collapsed, it keeps its name for a screen reader.
    await expect(page.locator('#labels').getByRole('link', { name: new RegExp(`^${district.name}`) })).toHaveAttribute('id', id)
    const tag = link.locator('.lm-tag')
    expect(await tag.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0)
    await link.locator('.lm-pin').tap()
    await expect.poll(() => isOpen(link)).toBe(true)
    await expect(page).toHaveURL('/')
    await expect.poll(() => tag.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1)
    // A tap elsewhere closes it.
    const away = await canvasPointNear(page, 40, 600)
    await page.touchscreen.tap(away.x, away.y)
    await expect.poll(() => isOpen(link)).toBe(false)
    // A moment between taps, as a hand takes: two quick taps are a double tap to a phone.
    await page.waitForTimeout(500)
    await link.locator('.lm-pin').tap()
    await expect.poll(() => isOpen(link)).toBe(true)
    await tag.tap()
    await expect(page).toHaveURL(`/?district=${district.id}`)
  })
})

test.describe('on a phone, at a place', () => {
  test.use({ viewport: { width: 412, height: 915 }, hasTouch: true })

  test('the nearest places show as pins in the open view; a tap shows the tag and the next goes there', async ({ page }) => {
    drivesTheCanvas()
    await page.goto('/places/kingdoms-and-crowns')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 15000 })
    const pins = page.locator('#labels a[data-tier="nearby"][data-on]')
    await expect(pins).toHaveCount(2)
    const panel = (await page.locator('article').boundingBox())!
    const ids: string[] = []
    for (let i = 0; i < 2; i++) {
      const pin = (await pins.nth(i).locator('.lm-pin').boundingBox())!
      // Above the panel and on the screen.
      expect(pin.y + pin.height).toBeLessThan(panel.y)
      expect(pin.x).toBeGreaterThanOrEqual(0)
      expect(pin.x + pin.width).toBeLessThanOrEqual(412)
      ids.push((await pins.nth(i).getAttribute('id'))!)
    }
    expect(ids.sort()).toEqual(['label-ember-tattoo', 'label-the-budget'])
    const first = pins.first()
    const href = (await first.getAttribute('href'))!
    // A finger finds the pin across 44px, though it is drawn small.
    const pin = (await first.locator('.lm-pin').boundingBox())!
    const centre = { x: pin.x + pin.width / 2, y: pin.y + pin.height / 2 }
    for (const [ox, oy] of [[-20, 0], [20, 0], [0, -20], [0, 20]]) {
      expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.lm')?.id ?? null, { x: centre.x + ox!, y: centre.y + oy! })).toBe(
        await first.getAttribute('id'),
      )
    }
    // The tag waits for a tap.
    expect(await first.locator('.lm-tag').evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0)
    await first.locator('.lm-pin').tap()
    await expect.poll(() => isOpen(first)).toBe(true)
    await expect(page).toHaveURL('/places/kingdoms-and-crowns')
    await expect.poll(() => first.locator('.lm-tag').evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1)
    // A tap elsewhere closes it; the next tap opens it again, and a tap on the tag goes there.
    const elsewhere = await canvasPointNear(page, 206, 180)
    await page.touchscreen.tap(elsewhere.x, elsewhere.y)
    await expect.poll(() => isOpen(first)).toBe(false)
    await page.waitForTimeout(500)
    await first.locator('.lm-pin').tap()
    await expect.poll(() => isOpen(first)).toBe(true)
    await first.locator('.lm-tag').tap()
    await expect(page).toHaveURL(href)
  })
})

test.describe('in the narrowest window', () => {
  test.use({ viewport: { width: 320, height: 900 } })

  test('the legend’s plate stays inside the frame', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    const plate = (await page.locator('ul.hud-plate').boundingBox())!
    // The frame is the thin line inset round the view.
    const frame = (await page.locator('div[aria-hidden].pointer-events-none.fixed.border-ink').first().boundingBox())!
    expect(plate.x).toBeGreaterThanOrEqual(frame.x)
    expect(plate.x + plate.width).toBeLessThanOrEqual(frame.x + frame.width)
  })
})
