import { test, expect, type Page } from './canvas'

/**
 * On a local production build the two /_vercel/... scripts 404 and log console
 * errors; that is expected off Vercel. Nothing else is excused.
 */
const offVercel = (text: string) => text.includes('/_vercel/')

/** Collect every policy violation the browser reports, from the console and from the event itself. */
async function watchForBlocked(page: Page) {
  const blocked: string[] = []
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} blocked ${event.blockedURI}`)
    })
  })
  page.on('console', (message) => {
    const text = message.text()
    if (/Content Security Policy|CSP violation/i.test(text) && !offVercel(text)) blocked.push(text)
  })
  return blocked
}

test('sends the security headers', async ({ request }) => {
  const h = (await request.get('/')).headers()
  const csp = h['content-security-policy']
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("object-src 'none'")
  expect(csp).toContain('challenges.cloudflare.com')
  expect(csp).toContain("frame-ancestors 'self'")
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(h['x-frame-options']).toBe('SAMEORIGIN')
  expect(h['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')
})

test('a production build does not allow eval', async ({ request }) => {
  const csp = (await request.get('/')).headers()['content-security-policy']
  expect(csp).not.toContain('unsafe-eval')
})

test('every route carries the policy', async ({ request }) => {
  for (const path of ['/places/beacon', '/places/post', '/nope']) {
    const response = await request.get(path)
    expect(response.headers()['content-security-policy'], path).toContain("default-src 'self'")
  }
})

for (const path of ['/', '/places/post', '/places/art']) {
  test(`nothing on ${path} is blocked by the policy`, async ({ page }) => {
    const blocked = await watchForBlocked(page)
    await page.goto(path)
    await page.waitForTimeout(2500)
    expect(blocked).toEqual([])
  })
}
