import { test, expect, type Page } from '@playwright/test'

// Stub the Turnstile widget so the form gets a token without the external
// Cloudflare script — keeps these UI tests deterministic and offline.
async function stubTurnstile(page: Page) {
  await page.addInitScript(() => {
    // @ts-expect-error injected test double
    window.turnstile = {
      render: (_el: HTMLElement, opts: { callback: (t: string) => void }) => {
        opts.callback('test-token')
        return 'widget-1'
      },
      reset: () => {},
      remove: () => {},
    }
  })
}

async function fillValid(page: Page) {
  await page.getByLabel('Name').fill('Jane Founder')
  await page.getByLabel('Email').fill('jane@acme.com')
  await page.getByLabel(/what kind of conversation/i).selectOption('advisory')
  await page.getByLabel('Message').fill('I would love to talk about an advisory engagement soon.')
}

test('shows inline validation errors on empty submit (no network)', async ({ page }) => {
  await stubTurnstile(page)
  await page.goto('/#contact')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText(/please enter your name/i)).toBeVisible()
  await expect(page.getByText(/valid email/i)).toBeVisible()
})

test('happy path: valid submit shows the success state', async ({ page }) => {
  await stubTurnstile(page)
  await page.route('**/api/contact', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'Thank you — your message is on its way.' }),
    })
  )
  await page.goto('/#contact')
  await fillValid(page)
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('Message sent.')).toBeVisible()
})

test('spam/blocked path: server 422 surfaces a "email me directly" message', async ({ page }) => {
  await stubTurnstile(page)
  await page.route('**/api/contact', (route) =>
    route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        message: 'This looked automated and was blocked. If you’re a real person, please email me directly.',
      }),
    })
  )
  await page.goto('/#contact')
  await fillValid(page)
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText(/email me directly/i)).toBeVisible()
})
