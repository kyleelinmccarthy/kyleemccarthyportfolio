import type { FullConfig } from '@playwright/test'
import { isE2eBuild } from '../../scripts/lib/e2eBuild'

/**
 * Locally the web server is reused if one is already running (see
 * `reuseExistingServer`), and a server left over from an ordinary build has
 * none of the test hooks the suite reads (`window.__worldFrames` and the rest;
 * see `testHooksOn`). The root layout marks an e2e build with `data-e2e` on
 * `<html>`; without it the tests would fail one by one, far from the cause.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL
  if (!baseURL) throw new Error('playwright.config.ts has no baseURL for the e2e suite.')
  const html = await (await fetch(baseURL)).text()
  if (!isE2eBuild(html)) {
    throw new Error(
      `The server at ${baseURL} was not built for the e2e suite (NEXT_PUBLIC_E2E=1), so the test hooks are missing. ` +
        'It is probably a leftover server from an earlier session: stop it and run the tests again, which builds and starts a fresh one.',
    )
  }
}
