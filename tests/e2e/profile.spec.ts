import { expect, scaleRender, test, type Page } from './canvas'
import { profileSections } from '../../content/profile'
import { site } from '../../content/site'
import { employer } from '../../content/timeline'

/**
 * The profile: About, Experience and Contact, one press from the header on
 * every page, each at its own address, readable without JavaScript or WebGL.
 */

/** A control clicked before React has hydrated is a dead click: wait for React to own the header's links. */
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const link = document.querySelector('nav[aria-label="Main"] a')
    return !!link && Object.keys(link).some((key) => key.startsWith('__reactProps'))
  })
}

/** The header's way to a section: the link itself on a wide screen, or the Profile menu and then the link on a phone. */
async function openFromHeader(page: Page, label: string, isMobile: boolean) {
  const nav = page.getByRole('navigation', { name: 'Main' })
  if (isMobile) {
    const menu = nav.locator('summary', { hasText: 'Profile' })
    await expect(menu).toBeVisible()
    await menu.click()
    await nav.locator('.profile-menu').getByRole('link', { name: label, exact: true }).click()
  } else {
    await nav.getByRole('group', { name: 'Profile' }).getByRole('link', { name: label, exact: true }).click()
  }
}

const panel = (page: Page) => page.locator('article.profile-panel')

test.describe('from the header', () => {
  for (const section of profileSections) {
    test(`opens ${section.label} over the planet, and closing goes back with focus on the control that opened it`, async ({ page, isMobile }) => {
      await page.goto('/places/beacon')
      await hydrated(page)
      await openFromHeader(page, section.label, isMobile)
      await expect(page).toHaveURL(section.href)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(section.title)
      await expect(panel(page)).toBeVisible()
      // Focus moves into the panel, at its heading.
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
      await page.getByRole('link', { name: 'Close' }).click()
      await expect(page).toHaveURL('/places/beacon')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beacon')
      const opener = isMobile ? page.locator('nav[aria-label="Main"] summary') : page.locator(`nav[aria-label="Main"] [data-profile-opener="${section.id}"]`)
      await expect(opener).toBeFocused()
    })
  }

  test('Escape closes it, back to where the visitor was', async ({ page, isMobile }) => {
    await page.goto('/')
    await hydrated(page)
    await openFromHeader(page, 'Experience', isMobile)
    await expect(page).toHaveURL('/experience')
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL('/')
  })

  test('its tabs move between the sections in the one panel, the tab keeping focus', async ({ page }) => {
    await page.goto('/about')
    await hydrated(page)
    const tabs = panel(page).getByRole('navigation', { name: 'Profile' })
    await expect(tabs.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page')
    await tabs.getByRole('link', { name: 'Contact' }).click()
    await expect(page).toHaveURL('/contact')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Get in touch')
    await expect(tabs.getByRole('link', { name: 'Contact' })).toHaveAttribute('aria-current', 'page')
    await expect(tabs.getByRole('link', { name: 'Contact' })).toBeFocused()
  })

  test('on a phone the Profile button keeps clear of the name, and the panel of the controls', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the phone layout')
    const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
    await page.goto('/')
    const menu = (await page.locator('nav[aria-label="Main"] summary').boundingBox())!
    expect(overlaps(menu, (await page.locator('.hud-name').boundingBox())!)).toBe(false)
    await page.goto('/about')
    const sheet = (await panel(page).boundingBox())!
    for (const control of await page.locator('nav[aria-label="Main"] > a, nav[aria-label="Main"] > button, nav[aria-label="Main"] summary').all()) {
      const box = await control.boundingBox()
      if (box) expect(overlaps(box, sheet), (await control.textContent()) ?? '').toBe(false)
    }
  })
})

type Box = { x: number; y: number; width: number; height: number }

test.describe('each section at its own address', () => {
  for (const section of profileSections) {
    test(`${section.href} opens ${section.label}, titled and described`, async ({ page }) => {
      await page.goto(section.href)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(section.title)
      await expect(page.getByRole('article', { name: section.title })).toBeVisible()
      await expect(page).toHaveTitle(new RegExp(`^${section.label} — `))
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', section.description)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${section.href}$`))
    })
  }

  test('Contact’s links go where they say, and other sites open safely in a new tab', async ({ page }) => {
    await page.goto('/contact')
    const email = page.getByRole('link', { name: new RegExp(site.email) })
    await expect(email).toHaveAttribute('href', `mailto:${site.email}`)
    for (const [name, href] of [
      [/LinkedIn/, site.linkedin],
      [/GitHub/, site.github],
    ] as const) {
      const link = page.getByRole('link', { name })
      await expect(link).toHaveAttribute('href', href)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    await expect(page.getByRole('link', { name: /Résumé/ })).toHaveAttribute('href', site.resumePath)
    await page.getByRole('link', { name: /Send me a letter/ }).click()
    await expect(page).toHaveURL('/places/post')
  })

  test('the Navigation list stays places only', async ({ page }) => {
    await page.goto('/')
    for (const section of profileSections) await expect(page.locator(`#index a[href="${section.href}"]`)).toHaveCount(0)
  })

  test('the old contact page leads to Contact', async ({ page }) => {
    await page.goto('/connect')
    await expect(page).toHaveURL('/contact')
  })
})

test('without JavaScript every section reads in full, and its links work', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  await scaleRender(ctx)
  const page = await ctx.newPage()
  await page.goto('/experience')
  await expect(page.getByRole('heading', { level: 2, name: employer.name })).toBeVisible()
  await expect(page.getByText(/Nov 2022 – Present/)).toBeVisible()
  await page.getByRole('navigation', { name: 'Profile' }).getByRole('link', { name: 'About' }).click()
  await expect(page).toHaveURL('/about')
  await expect(page.getByText('Western Governors University').first()).toBeVisible()
  await page.goto('/contact')
  await expect(page.getByText(site.email)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Close' })).toHaveAttribute('href', '/')
  await ctx.close()
})

test('without JavaScript on a phone, the Profile menu opens and leads to a section', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  await scaleRender(ctx)
  const page = await ctx.newPage()
  await page.goto('/')
  await page.locator('nav[aria-label="Main"] summary').click()
  await page.locator('.profile-menu').getByRole('link', { name: 'Contact' }).click()
  await expect(page).toHaveURL('/contact')
  await expect(page.getByText(site.email)).toBeVisible()
  await ctx.close()
})

test('without WebGL the profile still reads over the picture', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null
  })
  await page.goto('/about')
  await expect(page.getByTestId('world-poster')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About me')
  await expect(panel(page)).toBeVisible()
})
