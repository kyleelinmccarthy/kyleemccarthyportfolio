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

// Between 768px (max-w-3xl) and the lg breakpoint the container is text-center,
// so a max-width child without mx-auto centres inside its own left-pinned box
// rather than the container — and disagrees with the copy beneath it.
for (const width of [820, 900, 1000]) {
  test(`headline and lead paragraph share a centre at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.waitForTimeout(1800) // let RevealOnActive settle before measuring

    const heading = await page.locator('h1').first().boundingBox()
    const para = await page
      .locator('main p')
      .filter({ hasText: /that’s the good part/ })
      .first()
      .boundingBox()

    expect(heading, 'headline should render').not.toBeNull()
    expect(para, 'lead paragraph should render').not.toBeNull()

    const headingCentre = heading!.x + heading!.width / 2
    const paraCentre = para!.x + para!.width / 2
    expect(
      Math.abs(headingCentre - paraCentre),
      `headline centre ${headingCentre} vs paragraph centre ${paraCentre}`
    ).toBeLessThanOrEqual(2)
  })
}

test('résumé link is present and points to the PDF', async ({ page }) => {
  await page.goto('/')
  const link = page.getByRole('link', { name: /résumé/i }).first()
  await expect(link).toHaveAttribute('href', '/Kylee-McCarthy-Resume.pdf')
})
