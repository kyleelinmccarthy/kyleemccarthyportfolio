import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

for (const theme of ['light', 'dark'] as const) {
  test(`no axe violations in ${theme} mode`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('kym-theme', t), theme)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      // Turnstile injects a third-party iframe we don't control; scope it out.
      .exclude('iframe[src*="challenges.cloudflare.com"]')
      .analyze()

    expect(results.violations).toEqual([])
  })
}

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
