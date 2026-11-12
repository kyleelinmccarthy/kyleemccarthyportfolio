import { test, expect } from './canvas'

const retired: Array<[from: string, to: string]> = [
  ['/about', '/places/home'],
  ['/connect', '/places/post'],
  ['/room', '/places/art'],
  ['/work', '/#index'],
]

for (const [from, to] of retired) {
  test(`${from} redirects to ${to}`, async ({ page }) => {
    await page.goto(from)
    await expect(page).toHaveURL(to)
  })

  test(`${from} is a permanent redirect`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(response.headers()['location']).toBe(to)
  })
}
