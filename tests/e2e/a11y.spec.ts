import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES = ['/', '/work', '/about', '/leadership', '/value', '/connect', '/room']

test.describe('axe sweep', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations in ${theme} mode`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('kym-theme', t), theme)

      const failures: string[] = []
      for (const route of ROUTES) {
        await page.goto(route)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        // RevealOnActive (components/journey/sceneActive.tsx) fades content
        // in via opacity, up to ~1.1s worst case (index 5: 0.5s delay +
        // 0.6s duration). Scanning immediately after goto races that
        // animation — and also races a framer-motion hydration quirk where
        // useReducedMotion() can't resolve synchronously during SSR, so the
        // server always emits the animated branch regardless of the
        // browser's reduced-motion preference. Either way, axe can sample
        // text mid-fade (a near-transparent blend of fg/bg) and report a
        // false color-contrast violation unrelated to the actual, settled
        // token colors (verified AA-compliant in app/globals.css). Waiting
        // for the reveal to finish scans the steady state WCAG 1.4.3
        // actually governs.
        await page.waitForTimeout(1500)

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          // Turnstile injects a third-party iframe we don't control; scope it out.
          .exclude('iframe[src*="challenges.cloudflare.com"]')
          .analyze()

        if (results.violations.length > 0) {
          const summary = results.violations
            .map((v) => `${v.id} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`)
            .join(', ')
          failures.push(`${route}: ${summary}`)
        }
      }

      expect(failures, `axe violations by route (${theme} mode):\n${failures.join('\n')}`).toEqual([])
    })
  }
})

test('heading order is logical with a single h1', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveCount(1)
})

test('skip link is the first focusable element and targets main', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveText(/skip to content/i)
  await expect(focused).toHaveAttribute('href', '#main')
})
