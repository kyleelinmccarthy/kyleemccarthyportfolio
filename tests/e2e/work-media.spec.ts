import { test, expect } from '@playwright/test'

test('project cards render real imagery with alt text', async ({ page }) => {
  await page.goto('/work')
  const hero = page.getByAltText('The 403HQ client portal sign-in screen')
  await expect(hero).toBeVisible()
})

test('every image on the work page has a non-empty alt', async ({ page }) => {
  await page.goto('/work')
  const alts = await page.locator('img').evaluateAll((els) =>
    els.map((e) => (e as HTMLImageElement).getAttribute('alt'))
  )
  expect(alts.length).toBeGreaterThan(0)
  for (const a of alts) expect(a?.trim()).toBeTruthy()
})
