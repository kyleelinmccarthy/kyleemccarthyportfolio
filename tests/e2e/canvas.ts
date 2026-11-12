import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'

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
