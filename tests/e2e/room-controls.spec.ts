import { test, expect } from '@playwright/test'
import { rooms } from '@/content/rooms'

/**
 * The controls that float over a room rather than sitting in its flow — the
 * way back, and the label on the staircase — must never land on the copy.
 *
 * They are positioned against the room's box, and the room's box is as wide as
 * the screen and as tall as its content. On a phone the copy fills that box,
 * so a control pinned to the box's edge sits on top of the words: the way back
 * covered the last line of every room that overran a screen, and the staircase
 * still said "Upstairs" across the middle of a paragraph on screens where it
 * is decoration and cannot be pressed at all.
 *
 * Measured rather than asserted room by room: the fault is geometric, it
 * appeared in four rooms on the home page and two in the library at once, and
 * a per-room assertion would have to be written again for every room added.
 */

/** Copy a reader is meant to read. Headings, prose, lists, links. */
const COPY = 'p, dt, dd, h1, h2, h3, li, figcaption, blockquote'

interface Overlap {
  control: string
  copy: string
}

/**
 * Every floating control currently on screen that sits on a piece of copy.
 *
 * Runs in the page because it is a question about laid-out geometry, which
 * only the browser can answer.
 *
 * "On screen" is `checkVisibility`, not a hand-read of the computed styles.
 * The browser still hands you a full-sized rectangle for the contents of a
 * closed `<details>` — every case study on the gallery wall has one — so
 * measuring boxes alone reports the way back as covering three paragraphs
 * nobody can see. `checkVisibility` knows the disclosure is shut, and knows
 * about a room still faded out on the way in.
 */
async function overlapsOnScreen(
  page: import('@playwright/test').Page,
  stairsLabel: string
): Promise<Overlap[]> {
  return page.evaluate(
    ({ copySelector, label }) => {
      const onScreen = (el: Element) => {
        // Rooms the reader is not standing in are `inert` on the camera path.
        if (el.closest('[inert]')) return false
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height) return false
        if (r.bottom <= 0 || r.top >= innerHeight) return false
        return el.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
          contentVisibilityAuto: true,
        })
      }

      const controls: { el: Element; name: string }[] = [
        ...[...document.querySelectorAll('button[aria-label^="Back to"]')].map((el) => ({
          el,
          name: el.getAttribute('aria-label')!,
        })),
        // The pill hanging off the staircase. Found by its words rather than by
        // a hook put there for the test — it is the words that overlap.
        ...[...document.querySelectorAll('span')]
          .filter((el) => el.textContent?.trim().startsWith(label))
          .map((el) => ({ el, name: `the ${label} label` })),
      ]

      const found: { control: string; copy: string }[] = []
      for (const { el: control, name } of controls) {
        if (!onScreen(control)) continue
        const c = control.getBoundingClientRect()
        for (const copy of document.querySelectorAll(copySelector)) {
          if (control.contains(copy) || copy.contains(control)) continue
          const text = copy.textContent?.trim()
          if (!text || !onScreen(copy)) continue
          const t = copy.getBoundingClientRect()
          const clear =
            c.right <= t.left || c.left >= t.right || c.bottom <= t.top || c.top >= t.bottom
          if (!clear) found.push({ control: name, copy: text.slice(0, 60) })
        }
      }
      return found
    },
    { copySelector: COPY, label: stairsLabel }
  )
}

/**
 * Walk the whole page and collect every overlap seen along the way.
 *
 * Stepping rather than jumping to the end: on the camera path a room only
 * exists on screen while the camera is parked at it, so its way back is only
 * measurable during its own slice of the scroll.
 */
async function overlapsThroughout(page: import('@playwright/test').Page) {
  const seen = new Map<string, Overlap>()
  const max = await page.evaluate(() => document.body.scrollHeight - window.innerHeight)
  for (let step = 0; step <= 50; step++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((max * step) / 50))
    await page.waitForTimeout(120)
    for (const o of await overlapsOnScreen(page, rooms.landing.stairs.label)) {
      seen.set(`${o.control} :: ${o.copy}`, o)
    }
  }
  return [...seen.values()]
}

const JOURNEYS = [
  ['the house', '/'],
  ['the library', '/room'],
] as const

function report(overlaps: Overlap[]) {
  return overlaps.map((o) => `“${o.control}” sits on “${o.copy}”`).join('\n')
}

for (const [journey, path] of JOURNEYS) {
  test(`nothing floating over ${journey} covers its copy`, async ({ page }) => {
    await page.goto(path)
    await page.waitForTimeout(1200)

    const overlaps = await overlapsThroughout(page)
    expect(overlaps, report(overlaps)).toEqual([])
  })

  /**
   * A tablet is neither project's viewport and was broken in its own right:
   * wide enough for the camera path, too narrow for the centred column to have
   * pulled clear of the left edge, so the way back sat mid-copy there too.
   */
  test(`nothing floating over ${journey} covers its copy on a tablet`, async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one run of this width is enough')
    const context = await browser.newContext({ viewport: { width: 820, height: 1180 } })
    const page = await context.newPage()
    await page.goto(path)
    await page.waitForTimeout(1200)

    const overlaps = await overlapsThroughout(page)
    expect(overlaps, report(overlaps)).toEqual([])
    await context.close()
  })
}
