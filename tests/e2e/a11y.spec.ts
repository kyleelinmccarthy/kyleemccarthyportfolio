import { test, expect, type Page } from './canvas'
import AxeBuilder from '@axe-core/playwright'

const ROUTES = [
  '/',
  '/places/beacon',
  '/places/on-the-go',
  '/places/home',
  '/places/three-things',
  '/places/art',
  '/places/off-the-clock',
  '/places/post',
]

/**
 * The page as a visitor sees it once the world has drawn: the map labels are part of it, and are added only after the
 * canvas's first frame, so a scan before then would leave them unchecked.
 */
async function settled(page: Page, theme: 'day' | 'night') {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  await expect(page.locator('#labels')).toBeAttached({ timeout: 30_000 })
}

/** Violations only: where a gradient sits behind text axe reports "incomplete", which is not a failure. */
async function violationsOn(page: Page): Promise<string | null> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // Turnstile injects a third-party iframe we don't control; scope it out.
    .exclude('iframe[src*="challenges.cloudflare.com"]')
    .analyze()
  if (results.violations.length === 0) return null
  return results.violations
    .map((v) => `${v.id} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'}: ${v.nodes[0]?.target.join(' ')})`)
    .join(', ')
}

test.describe('axe sweep', () => {
  for (const theme of ['day', 'night'] as const) {
    test(`no axe violations in ${theme} mode`, async ({ page }) => {
      // Eight routes, each drawing the planet in software WebGL while other workers run: give it the slow budget.
      test.slow()
      await page.addInitScript((t) => sessionStorage.setItem('kym-theme', t), theme)

      const failures: string[] = []
      for (const route of ROUTES) {
        await page.goto(route)
        await settled(page, theme)
        const found = await violationsOn(page)
        if (found) failures.push(`${route}: ${found}`)
      }

      expect(failures, `axe violations by route (${theme} mode):\n${failures.join('\n')}`).toEqual([])
    })
  }

  // With no stored theme the clock picks the sky, so check all four.
  for (const [time, theme] of [
    ['09:00', 'day'],
    ['14:00', 'day'],
    ['18:00', 'day'],
    ['23:00', 'night'],
  ] as const) {
    test(`no axe violations on the home page at ${time}`, async ({ page }) => {
      // The scan waits for the world's first frame, which software rendering draws slowly.
      test.slow()
      await page.clock.setFixedTime(new Date(`2026-11-10T${time}:00`))
      await page.goto('/')
      await settled(page, theme)
      expect(await violationsOn(page)).toBeNull()
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
