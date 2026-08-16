import { test, expect } from '@playwright/test'

test('the welcome is readable with animations disabled', async ({ browser }) => {
  // The door opening must never gate the content behind it.
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByText(/come in/i)).toBeVisible()
  await context.close()
})

test('the window states all three principles on the home page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /how i go about it/i })).toBeAttached()
  for (const title of ['Keep moving', 'Nothing is sacred', 'AI is a tool, not the problem']) {
    await expect(page.getByText(title, { exact: true })).toBeAttached()
  }
})
