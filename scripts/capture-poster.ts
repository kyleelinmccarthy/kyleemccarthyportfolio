/**
 * Retakes the pictures of the planet that stand in for the 3D world
 * (public/world/poster-day.webp and poster-night.webp): what a visitor sees
 * before the 3D code arrives, without WebGL, and if the canvas fails.
 *
 *   npx playwright install chromium
 *   npm run capture:poster                 # builds the site, takes both pictures
 *   npm run capture:poster -- --no-build   # reuse the last normal build in .next
 *
 * It starts the production site itself, opens `/` at 1600x1000 at the full
 * quality tier (never the test render-scale hook), under reduced motion so the
 * sea and the sky stand still and a retake matches the last, with the HUD and
 * the map labels hidden so only the world is in the picture. The clock is
 * fixed at 14:00 for the day picture and 23:00 for the night one. It waits for
 * the canvas's first real frame, saves a WebP under 250KB (stepping the
 * quality down until it fits), and stops with an error, writing nothing, if
 * either picture is blank, over budget, not the size it should be, or was shot
 * after the world dropped below full quality. Both are taken and checked
 * before either is written, so a failure never leaves a mismatched pair. It
 * refuses a port that is already in use (it could be a stale server) and a
 * build made for the e2e tests (`NEXT_PUBLIC_E2E=1`; `--no-build` would
 * otherwise reuse one left in `.next`; the e2e suite builds elsewhere).
 *
 * Retake the pictures whenever the planet or its landmarks change a lot.
 */
import { chromium, type Browser, type Page } from '@playwright/test'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { isE2eBuild } from './lib/e2eBuild'

const WIDTH = 1600
const HEIGHT = 1000
/** The same budget as the committed images (see tests/unit/content.test.ts). */
const MAX_BYTES = 250_000
/** WebP qualities to try, best first; the first that fits the budget is kept. */
const QUALITIES = [92, 88, 84, 80, 76, 72, 68, 62, 56, 50]
const PORT = 3199
const ORIGIN = `http://localhost:${PORT}`

/** The two pictures. The clock is fixed, so each shows the sky the site shows at that hour. */
const PICTURES = [
  { name: 'poster-day', time: '2026-11-10T14:00:00Z' },
  { name: 'poster-night', time: '2026-11-10T23:00:00Z' },
] as const

/** A picture needs at least this much variation in brightness, and this many different colours, to count as a picture of something. */
const BLANK = { minDeviation: 10, minColours: 200 }

/**
 * The environment for building and serving the site as a visitor gets it: the shell's own, without
 * `NEXT_PUBLIC_E2E`. The flag changes where the site is built and served from (`.next-e2e`; see
 * next.config.mjs), so with it set for `next start` alone the pictures would come from a test build.
 */
function visitorEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  delete env.NEXT_PUBLIC_E2E
  return env
}

function build(): void {
  console.log('Building the site...')
  const result = spawnSync('npm run build', { stdio: 'inherit', shell: true, env: visitorEnv() })
  if (result.status !== 0) throw new Error('The build failed.')
}

/** The page the site serves at `/`, or null if nothing answers on the port. */
async function fetchHome(): Promise<string | null> {
  try {
    const response = await fetch(ORIGIN)
    return response.ok ? await response.text() : null
  } catch {
    return null
  }
}

/** Waits for the server this script started, and returns its home page. */
async function waitForServer(server: ChildProcess): Promise<string> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error('The site stopped before it came up.')
    const html = await fetchHome()
    if (html !== null) return html
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`The site did not come up at ${ORIGIN}.`)
}

/** Stops the server and everything it started. Runs once: a second call (from the exit handler after `finally`) does nothing. */
let stopped = false
function stop(server: ChildProcess | null): void {
  if (stopped || !server || server.pid === undefined) return
  stopped = true
  // `shell: true` puts the server under a shell (and npx): take the whole tree down.
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'])
  else {
    try {
      process.kill(-server.pid, 'SIGTERM') // the server leads its own process group (see `detached`)
    } catch {
      server.kill('SIGTERM')
    }
  }
}

/**
 * Hides everything on the page except the canvas, so the picture holds the world alone.
 * Run in the page as source text: a function passed to `evaluate` is compiled by tsx with
 * helpers that do not exist there.
 */
const HIDE_THE_HUD = `(() => {
  const world = document.querySelector('[data-rig-mode]')
  if (!world) throw new Error('The canvas is not on the page.')
  const hide = (parent) => {
    for (const child of Array.from(parent.children)) {
      if (child === world) continue
      if (child.contains(world)) hide(child)
      else child.style.setProperty('display', 'none', 'important')
    }
  }
  hide(document.body)
})()`

/** Waits for some frames to be drawn after the first, so the picture is of a settled world. Source text, as above. */
const framesPassed = (n: number) => `new Promise((done) => {
  let left = ${n}
  const tick = () => (--left <= 0 ? done() : requestAnimationFrame(tick))
  requestAnimationFrame(tick)
})`

/** Stops the run if the picture is flat, or nearly: a failed canvas, a sky with no planet in it, a page that never drew. */
async function assertNotBlank(png: Buffer, name: string): Promise<void> {
  const { data, info } = await sharp(png).resize(160, 100, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const luma: number[] = []
  const colours = new Set<number>()
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    luma.push(0.2126 * r + 0.7152 * g + 0.0722 * b)
    colours.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3))
  }
  const mean = luma.reduce((a, b) => a + b, 0) / luma.length
  const deviation = Math.sqrt(luma.reduce((a, b) => a + (b - mean) ** 2, 0) / luma.length)
  console.log(`  ${name}: brightness deviation ${deviation.toFixed(1)}, ${colours.size} colours`)
  if (deviation < BLANK.minDeviation || colours.size < BLANK.minColours) {
    throw new Error(`${name} looks blank (deviation ${deviation.toFixed(1)}, ${colours.size} colours). The world did not draw.`)
  }
}

/** The best WebP of the picture that fits the budget; throws if none does. */
async function encode(png: Buffer, name: string): Promise<{ webp: Buffer; quality: number }> {
  for (const quality of QUALITIES) {
    const webp = await sharp(png).webp({ quality, effort: 6, smartSubsample: true }).toBuffer()
    if (webp.length < MAX_BYTES) return { webp, quality }
  }
  throw new Error(`${name} is over ${MAX_BYTES} bytes even at WebP quality ${QUALITIES[QUALITIES.length - 1]}.`)
}

/** What was shot, checked and encoded, ready to write. */
interface Shot {
  name: string
  webp: Buffer
  quality: number
}

/** The quality tier the world says it is drawing at (`data-quality` on its wrapper). */
const worldQuality = (page: Page) => page.locator('[data-rig-mode]').getAttribute('data-quality')

async function shoot(browser: Browser, name: string, time: string): Promise<Shot> {
  console.log(`Capturing ${name} (${time})`)
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    timezoneId: 'UTC',
  })
  try {
    // Whatever machine this runs on, the site must choose its full quality tier.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 })
      Object.defineProperty(navigator, 'deviceMemory', { value: 8 })
    })
    const page = await context.newPage()
    await page.clock.setFixedTime(new Date(time))
    await page.goto(ORIGIN, { waitUntil: 'load' })
    // The wrapper is hidden until the canvas has drawn its first frame; the labels come after it.
    await page.locator('[data-rig-mode]').waitFor({ state: 'visible', timeout: 120_000 })
    await page.locator('#labels').waitFor({ state: 'attached', timeout: 120_000 })
    await page.evaluate(framesPassed(15))
    await page.evaluate(HIDE_THE_HUD)
    await page.evaluate(framesPassed(5))

    const size = await page.evaluate<number[]>(`(() => { const c = document.querySelector('canvas'); return [c.width, c.height] })()`)
    if (size[0] !== WIDTH || size[1] !== HEIGHT) {
      throw new Error(`The canvas is ${size[0]}x${size[1]}, not ${WIDTH}x${HEIGHT}: it was not drawn at full size.`)
    }
    // Full quality at the moment of the shot, and still after it: a drop to low (slow software drawing) changes the picture.
    const before = await worldQuality(page)
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } })
    const after = await worldQuality(page)
    if (before !== 'high' || after !== 'high') {
      throw new Error(`${name} was shot with the world at "${before}" quality (then "${after}"), not "high".`)
    }

    await assertNotBlank(png, name)
    const { webp, quality } = await encode(png, name)
    return { name, webp, quality }
  } finally {
    await context.close()
  }
}

async function main(): Promise<void> {
  const reuse = process.argv.includes('--no-build')
  if (!reuse) build()

  if ((await fetchHome()) !== null) {
    throw new Error(`Something already answers on ${ORIGIN}: it could be a stale server, and the pictures would come from it. Stop it and run this again.`)
  }
  console.log(`Starting the site on ${ORIGIN}...`)
  const server = spawn(`npx next start --port ${PORT}`, {
    shell: true,
    stdio: 'ignore',
    detached: process.platform !== 'win32',
    env: visitorEnv(),
  })
  // Whatever ends this process (an error, Ctrl-C, a kill), the server it started must not outlive it.
  const cleanUp = () => stop(server)
  process.on('exit', cleanUp)
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(signal, () => {
      cleanUp()
      process.exit(130)
    })
  }
  try {
    const html = await waitForServer(server)
    if (isE2eBuild(html)) {
      throw new Error('The build in .next was made for the e2e tests (NEXT_PUBLIC_E2E=1), not as a visitor gets it. Run this again without --no-build.')
    }
    const shots: Shot[] = []
    const browser = await chromium.launch()
    try {
      for (const { name, time } of PICTURES) shots.push(await shoot(browser, name, time))
    } finally {
      await browser.close()
    }
    // Every picture is in hand and checked; only now is anything written.
    const outDir = resolve(process.cwd(), 'public/world')
    mkdirSync(outDir, { recursive: true })
    for (const { name, webp, quality } of shots) {
      writeFileSync(resolve(outDir, `${name}.webp`), webp)
      console.log(`  saved public/world/${name}.webp: ${Math.round(webp.length / 1024)}KB at quality ${quality}`)
    }
  } finally {
    cleanUp()
  }
}

main().catch((error) => {
  console.error(`\ncapture:poster failed: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
})
