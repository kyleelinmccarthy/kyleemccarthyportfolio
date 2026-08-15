import { test, expect } from '@playwright/test'

test('home page renders with a main landmark and an h1', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main#main')).toBeVisible()
  await expect(page.locator('h1')).toHaveCount(1)
})

test('/about renders the dated résumé timeline, not undated role labels', async ({ page }) => {
  await page.goto('/about')
  const main = page.locator('main')
  // content/timeline.ts's milestones — the accurate arc authored for spec §8,
  // which was dead while journey.about.milestones (four undated labels) shipped.
  await expect(main.getByText('Mar 2015')).toBeVisible()
  await expect(main.getByText('Nov 2022')).toBeVisible()
  await expect(main.getByRole('heading', { name: 'Director of Technology Operations' })).toBeVisible()
  // education renders as a compact footnote
  await expect(main.getByText(/M\.S\. Technology Management/)).toBeVisible()
})

test('a theme is applied before the page is interactive', async ({ page }) => {
  await page.goto('/')
  const theme = await page.locator('html').getAttribute('data-theme')
  expect(theme === 'light' || theme === 'dark').toBe(true)
})
