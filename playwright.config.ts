import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const baseURL = `http://localhost:${PORT}`

/**
 * What the build and the server need for the e2e suite to run from a clean
 * shell. The Turnstile keys are Cloudflare's published test keys (they always
 * pass) and the sender is Resend's sandbox address: none of them is a secret.
 * A value already in the environment wins, so CI can override any of them.
 * `NEXT_PUBLIC_*` values are inlined when the site is built, which is why the
 * server command below builds with them.
 */
const TEST_ENV: Record<string, string> = {
  TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  CONTACT_TO_EMAIL: 'test@example.com',
  CONTACT_FROM_EMAIL: 'Test <onboarding@resend.dev>',
  NEXT_PUBLIC_SITE_URL: baseURL,
}
const serverEnv: Record<string, string> = {
  ...Object.fromEntries(Object.entries(TEST_ENV).map(([key, value]) => [key, process.env[key] ?? value])),
  // Always on, never overridden: it switches on the test hooks the suite is written against (see `testHooksOn`).
  NEXT_PUBLIC_E2E: '1',
}

export default defineConfig({
  testDir: './tests/e2e',
  // Fails the run at once if a server left over from an earlier session was built without the test hooks.
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // Build + start so e2e/a11y run against the production output.
    command: `npm run build && npm run start -- --port ${PORT}`,
    env: serverEnv,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
