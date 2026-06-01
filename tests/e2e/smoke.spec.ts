import { test, expect } from '@playwright/test'

test('home page renders with a main landmark and an h1', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main#main')).toBeVisible()
  await expect(page.locator('h1')).toHaveCount(1)
})

test('a theme is applied before the page is interactive', async ({ page }) => {
  await page.goto('/')
  const theme = await page.locator('html').getAttribute('data-theme')
  expect(theme === 'light' || theme === 'dark').toBe(true)
})
