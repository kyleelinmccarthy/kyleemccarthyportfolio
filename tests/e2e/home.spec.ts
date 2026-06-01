import { test, expect } from '@playwright/test'

test('the journey and contact anchors render', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#top')).toHaveCount(1)
  await expect(page.locator('#contact')).toHaveCount(1)
})

test('theme toggle flips and persists the theme', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kym-theme', 'dark'))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('switch', { name: /turn the lights on/i }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('with reduced motion, content is visible immediately (no blank reveals)', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  // Reduced motion falls back to stacked scenes; their content must be visible.
  await expect(page.getByText(/I build the systems that make great work routine/)).toBeVisible()
  await context.close()
})

test('résumé link is present and points to the PDF', async ({ page }) => {
  await page.goto('/')
  const link = page.getByRole('link', { name: /résumé/i }).first()
  await expect(link).toHaveAttribute('href', '/Kylee-McCarthy-Resume.pdf')
})
