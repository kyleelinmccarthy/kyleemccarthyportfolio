import { test, expect } from '@playwright/test'

test('the door is a real link and reaches the room', async ({ page }) => {
  await page.goto('/')
  const door = page.getByRole('link', { name: /another room/i })
  await expect(door).toHaveAttribute('href', '/room')
})

test('the room renders its sections', async ({ page }) => {
  await page.goto('/room')
  await expect(page.getByRole('heading', { name: /built after hours/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /things I draw/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /tattoo flash/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /off the clock/i })).toBeVisible()
})

test('the room refers to family generically', async ({ page }) => {
  await page.goto('/room')
  const text = (await page.locator('main').innerText()).toLowerCase()
  // The spec's privacy constraint: relationships, never names. This pins the
  // intended vocabulary so a later copy edit that swaps in a name gets caught
  // by the missing generic phrase.
  expect(text).toContain('my kids')
  expect(text).toContain('my husband')
  expect(text).toContain('my daughter')
})
