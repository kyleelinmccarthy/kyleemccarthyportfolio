import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'
import { PerspectiveCamera, type Vector3 } from 'three'
// Relative imports: Playwright does not know the `@/` alias.
import { DEFAULT_GUEST } from '../../content/characters'
import { districts, placeById, places } from '../../content/world'
import { guestLook } from '../../lib/guests'
import { CAMERA_FOV, MODEL_SCALE } from '../../lib/world/camera'
import { characterHeight, onTheGround, standingFor, worldAt } from '../../lib/world/characters'
import { dirOf } from '../../lib/world/geo'
import { PHONE_WIDTH } from '../../lib/world/quality'
import { placeGoal, placeOrbit } from '../../lib/world/rig'
import { sheetViewOffset } from '../../lib/world/sheet'

/** How far a wide screen shifts the view left of an open place's panel (`VIEW_OFFSET` in CameraRig). */
const VIEW_SHIFT = 215

/**
 * Headless Chromium draws in software, which costs per pixel. Every test draws the world at this fraction of the
 * pixel ratio (the `window.__worldRenderScale` hook in `WorldCanvas`), so the canvas tests measure the app, not the machine.
 */
export const RENDER_SCALE = 0.5

const setRenderScale = (scale: number) => {
  Object.assign(window, { __worldRenderScale: scale })
}

/**
 * For a test that makes its own context (`browser.newContext()`): apply the render scale to every page in it.
 * Tests that use the `page` fixture get it automatically.
 */
export async function scaleRender(context: BrowserContext): Promise<void> {
  await context.addInitScript(setRenderScale, RENDER_SCALE)
}

/** Playwright's `test`, with the render scale set before any page script runs. Every spec imports this, not Playwright's. */
export const test = base.extend<{ renderScale: void }>({
  renderScale: [
    async ({ page }, use) => {
      await page.addInitScript(setRenderScale, RENDER_SCALE)
      await use()
    },
    { auto: true },
  ],
})

export { expect }
export type { Page }

/**
 * For a test that drives the canvas or waits on the rig. Headless Chromium renders in software at a few frames a second,
 * so these timings measure the test machine; real-device frame rate is measured separately.
 */
export const drivesTheCanvas = () => test.slow()

/** The canvas's wrapper, which reports what the camera rig is doing. */
export const rig = (page: Page) => page.locator('[data-rig-mode]')

/**
 * At a place, the camera's swing, tilt (radians) and distance from the landmark's middle, and whether it rests at the
 * furthest so a new gesture out would leave (the `window.__rigView` hook); null elsewhere.
 */
export const rigView = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __rigView?: { azimuth: number; elevation: number; distance: number; armed: boolean } }).__rigView ?? null,
  )

/** Real touch input through the DevTools protocol: one finger or two, by their points. */
export async function touchOf(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: Array<{ x: number; y: number }>) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, id) => ({ ...p, id, radiusX: 4, radiusY: 4, force: 1 })) })
  return {
    /** One finger from `from`, moved by (dx, dy) in `steps`. */
    async drag(from: { x: number; y: number }, dx: number, dy: number, steps = 12) {
      await send('touchStart', [from])
      for (let i = 1; i <= steps; i++) await send('touchMove', [{ x: from.x + (dx * i) / steps, y: from.y + (dy * i) / steps }])
      await send('touchEnd', [])
    },
    /** Two fingers either side of `centre`, level, going from `from` to `to` pixels apart. */
    async pinch(centre: { x: number; y: number }, from: number, to: number, steps = 12) {
      const at = (d: number) => [
        { x: centre.x - d / 2, y: centre.y },
        { x: centre.x + d / 2, y: centre.y },
      ]
      await send('touchStart', at(from))
      for (let i = 1; i <= steps; i++) await send('touchMove', at(from + ((to - from) * i) / steps))
      await send('touchEnd', [])
    },
    /** Two quick taps at one point. */
    async doubleTap(at: { x: number; y: number }) {
      for (let i = 0; i < 2; i++) {
        await send('touchStart', [at])
        await send('touchEnd', [])
      }
    },
  }
}

/** Where the page is scrolled to and how far the browser has zoomed it: neither may move while the canvas is touched. */
export const pageAt = (page: Page) => page.evaluate(() => ({ x: scrollX, y: scrollY, scale: visualViewport?.scale ?? 1 }))

/**
 * The guards that keep the page still under a finger, each checked for itself: the world's pages cannot scroll, so
 * an unchanged scroll position alone would prove little. The canvas and the map's labels take no touch gestures of
 * the browser's (`touch-action: none`); the canvas cancels a touch's moves (for browsers that ignore touch-action);
 * and the page does not bounce or pull to refresh (`overscroll-behavior: none`).
 */
export async function expectThePageHeld(page: Page) {
  const held = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const label = document.querySelector('#labels .lm')
    const box = canvas.getBoundingClientRect()
    const touch = new Touch({ identifier: 9, target: canvas, clientX: box.left + box.width / 2, clientY: box.top + box.height / 3 })
    const move = new TouchEvent('touchmove', { cancelable: true, bubbles: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] })
    canvas.dispatchEvent(move)
    return {
      canvas: getComputedStyle(canvas).touchAction,
      label: label ? getComputedStyle(label).touchAction : null,
      html: getComputedStyle(document.documentElement).overscrollBehaviorY,
      body: getComputedStyle(document.body).overscrollBehaviorY,
      moveCancelled: move.defaultPrevented,
    }
  })
  expect(held).toEqual({ canvas: 'none', label: 'none', html: 'none', body: 'none', moveCancelled: true })
}

/** Records every mode the rig reports from the page's first moment, so a passing one is not missed. Call before `goto`. */
export async function recordRigModes(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = ((window as unknown as { rigModes: string[] }).rigModes = [])
    new MutationObserver((records) => {
      for (const r of records) seen.push((r.target as Element).getAttribute('data-rig-mode') ?? '')
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-rig-mode'] })
  })
  return () => page.evaluate(() => (window as unknown as { rigModes: string[] }).rigModes)
}

/**
 * At place `id`, with the camera at the view it lands on (and still: reduced motion, so the view's shift for the
 * panel is in place at once), where the landmark's middle and the visitor's character (the default look, its
 * middle) fall on the screen.
 */
export async function atLandingView(page: Page, id: string) {
  const { width, height } = page.viewportSize()!
  const place = placeById(id)!
  const pose = placeGoal(place, districts)
  const camera = new PerspectiveCamera(CAMERA_FOV, width / height, 0.05, 300)
  camera.position.copy(pose.position)
  camera.quaternion.copy(pose.quaternion)
  camera.updateMatrixWorld()
  // The view is shifted clear of the panel: left of it on a wide screen, up above the sheet on a phone.
  const sheetTop = (await page.locator('article').boundingBox())!.y
  const shift = width > PHONE_WIDTH ? { x: VIEW_SHIFT, y: 0 } : { x: 0, y: sheetViewOffset(sheetTop, height) }
  const onScreen = (p: Vector3) => {
    const v = p.clone().project(camera)
    return { x: (v.x * 0.5 + 0.5) * width - shift.x, y: (-v.y * 0.5 + 0.5) * height - shift.y }
  }
  const stand = onTheGround(place, districts, standingFor(id).guest)
  const feet = worldAt(place, districts, stand.at)
  const tall = characterHeight(guestLook(DEFAULT_GUEST)) * MODEL_SCALE
  return {
    landmark: onScreen(placeOrbit(place, districts, places).centre),
    guest: onScreen(feet.clone().addScaledVector(dirOf(place.at), tall / 2)),
  }
}
