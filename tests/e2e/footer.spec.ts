import { test, expect } from '@playwright/test'

test.describe('footer layout', () => {
  test('both nav rows sit on a shared baseline on desktop', async ({ page }, testInfo) => {
    // Two-column layout is lg-and-up; the mobile project stacks them, where a
    // shared baseline is neither expected nor meaningful.
    test.skip(testInfo.project.name !== 'chromium', 'desktop two-column layout only')

    await page.goto('/')

    const left = page.getByRole('navigation', { name: 'Footer' }).getByRole('link').first()
    const right = page.getByRole('navigation', { name: 'Sections' }).getByRole('link').first()

    const leftBox = await left.boundingBox()
    const rightBox = await right.boundingBox()
    expect(leftBox, 'left footer nav should render').not.toBeNull()
    expect(rightBox, 'right footer nav should render').not.toBeNull()

    // The columns have different headings — a large script wordmark on the left,
    // a small uppercase label on the right — so nothing aligns the link rows
    // unless the flex row bottom-aligns them.
    expect(
      Math.abs(leftBox!.y - rightBox!.y),
      'footer link rows are on different baselines'
    ).toBeLessThanOrEqual(2)
  })

  test('the two columns stack on mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile stacked layout only')

    await page.goto('/')

    const left = page.getByRole('navigation', { name: 'Footer' }).getByRole('link').first()
    const right = page.getByRole('navigation', { name: 'Sections' }).getByRole('link').first()

    const leftBox = await left.boundingBox()
    const rightBox = await right.boundingBox()
    expect(rightBox!.y).toBeGreaterThan(leftBox!.y)
  })
})
