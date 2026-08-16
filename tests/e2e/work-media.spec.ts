import { test, expect } from '@playwright/test'

test('project cards render real imagery with alt text', async ({ page }) => {
  await page.goto('/work')
  const hero = page.getByAltText('The 403HQ client portal sign-in screen')
  await expect(hero).toBeVisible()
})

test('every image is either described or explicitly decorative', async ({ page }) => {
  await page.goto('/work')

  // alt="" is the correct marking for a decorative image — it tells a screen
  // reader to skip it. A MISSING alt is the defect, because then the reader
  // falls back to announcing the filename. So: every image must carry an alt
  // attribute, and any image not hidden from assistive tech must say something.
  const images = await page.locator('img').evaluateAll((els) =>
    els.map((e) => ({
      src: (e as HTMLImageElement).getAttribute('src')?.slice(-60) ?? '',
      alt: (e as HTMLImageElement).getAttribute('alt'),
      hidden: e.closest('[aria-hidden="true"]') !== null,
    }))
  )

  expect(images.length).toBeGreaterThan(0)
  for (const img of images) {
    expect(img.alt, `${img.src} has no alt attribute at all`).not.toBeNull()
    if (!img.hidden) {
      expect(img.alt!.trim(), `${img.src} is exposed to AT but says nothing`).toBeTruthy()
    }
  }
})
