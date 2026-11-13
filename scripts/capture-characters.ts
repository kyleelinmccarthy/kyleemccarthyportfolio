/**
 * Takes the pictures the character picker shows, one for every character a
 * visitor can make: each age, style and skin tone together
 * (public/world/characters/guest-<age>-<style>-<skin>.webp, from the option
 * lists `guestOptions` in content/characters.ts), and the guide's face for her
 * folded bubble. The picker shows a picture rather than a 3D view, so it never
 * opens a second WebGL context.
 *
 *   npx playwright install chromium
 *   npm run capture:characters                 # builds the site, takes every picture
 *   npm run capture:characters -- --no-build   # reuse the last e2e build in .next-e2e
 *   CAPTURE_PORT=3298 npm run capture:characters   # on another port (3198 unless said)
 *
 * The figure is drawn by the site itself, in the landmarks' own materials and
 * light, alone on a transparent background: the `window.__characterPortrait`
 * hook (`PortraitCanvas`), which exists only in a build made with
 * `NEXT_PUBLIC_E2E=1`, so a visitor's build never has it. This is therefore
 * the one capture that needs that build (it is built into `.next-e2e`, as the
 * e2e suite's is), and it refuses a server that is not one. Everything the
 * hook draws is the same code a visitor's build draws.
 *
 * Each picture is 192 by 240 (twice the 96 by 120 the picker shows), at the
 * afternoon's light, under reduced motion so nothing moves. It stops with an
 * error, writing nothing, if any picture is blank or over 40KB, or if the port
 * is already in use (it could be a stale server). Every picture is taken and
 * checked before any is written. Retake them when a look or the builder changes.
 */
import { chromium, type Browser } from '@playwright/test'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import type { GuestChoice } from '../content/characters'
import { everyGuest, guestKey } from '../lib/guests'
import { isE2eBuild } from './lib/e2eBuild'

const WIDTH = 192
const HEIGHT = 240
/** Each picture's budget. */
const MAX_BYTES = 40_000
const QUALITIES = [90, 85, 80, 74, 68, 60]
/** The port the site is started on: `CAPTURE_PORT` if it is a port number, else 3198. */
const PORT = portFrom(process.env.CAPTURE_PORT, 3198)
const ORIGIN = `http://localhost:${PORT}`
/** How many pictures are taken at once. */
const AT_ONCE = 4

function portFrom(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return value && Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback
}

/** The build with the test hooks: the shell's environment with `NEXT_PUBLIC_E2E=1`. */
function hookedEnv(): NodeJS.ProcessEnv {
  return { ...process.env, NEXT_PUBLIC_E2E: '1' }
}

function build(): void {
  console.log('Building the site with the test hooks...')
  const result = spawnSync('npm run build', { stdio: 'inherit', shell: true, env: hookedEnv() })
  if (result.status !== 0) throw new Error('The build failed.')
}

async function fetchHome(): Promise<string | null> {
  try {
    const response = await fetch(ORIGIN)
    return response.ok ? await response.text() : null
  } catch {
    return null
  }
}

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

let stopped = false
function stop(server: ChildProcess | null): void {
  if (stopped || !server || server.pid === undefined) return
  stopped = true
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'])
  else {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      server.kill('SIGTERM')
    }
  }
}

/** Stops the run if a picture shows (nearly) nothing: too few pixels drawn on its transparent ground. */
async function assertNotBlank(png: Buffer, name: string, most = 0.6): Promise<void> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let drawn = 0
  const colours = new Set<number>()
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3]! < 128) continue
    drawn++
    colours.add(((data[i]! >> 3) << 10) | ((data[i + 1]! >> 3) << 5) | (data[i + 2]! >> 3))
  }
  const share = drawn / (info.width * info.height)
  console.log(`  ${name}: ${(share * 100).toFixed(1)}% drawn, ${colours.size} colours`)
  if (share < 0.08 || colours.size < 40) throw new Error(`${name} looks blank (${(share * 100).toFixed(1)}% drawn, ${colours.size} colours).`)
  // A figure is narrow: a picture drawn nearly edge to edge has the page behind it, not a clear ground.
  if (share > most) throw new Error(`${name} is ${(share * 100).toFixed(1)}% drawn: the page shows behind the figure.`)
}

async function encode(png: Buffer, name: string): Promise<Buffer> {
  for (const quality of QUALITIES) {
    const webp = await sharp(png).webp({ quality, alphaQuality: 90, effort: 6 }).toBuffer()
    if (webp.length < MAX_BYTES) return webp
  }
  throw new Error(`${name} is over ${MAX_BYTES} bytes even at WebP quality ${QUALITIES[QUALITIES.length - 1]}.`)
}

/** What is shot: a character's whole figure (for the picker), or the guide's face (for her folded bubble). */
interface Shot {
  name: string
  look: 'guide' | GuestChoice
  frame: number
  width: number
  height: number
}

/** The guide's face: head and shoulders, small and square. */
const GUIDE_FACE: Shot = { name: 'guide-face', look: 'guide', frame: 0.42, width: 96, height: 96 }

async function shoot(browser: Browser, shot: Shot): Promise<Buffer> {
  const context = await browser.newContext({ viewport: { width: shot.width, height: shot.height }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  try {
    await context.addInitScript(({ look, frame }) => Object.assign(window, { __characterPortrait: { look, sky: 'afternoon', frame } }), shot)
    const page = await context.newPage()
    await page.goto(ORIGIN, { waitUntil: 'load' })
    await page.locator('[data-portrait="ready"]').waitFor({ timeout: 120_000 })
    // Only the portrait's canvas, on nothing: everything else on the page is hidden (whenever it appears), and the page's own ground made clear.
    await page.addStyleTag({
      content: `body * { visibility: hidden !important; } [data-portrait], [data-portrait] * { visibility: visible !important; } html, body { background: transparent !important; }`,
    })
    if ((await page.locator('[data-portrait] canvas').count()) !== 1) throw new Error('The portrait is not on the page.')
    // The style has taken: the page's ground is clear and nothing but the portrait shows.
    await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(document.body.firstElementChild ?? document.body).visibility === 'hidden')
    const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: shot.width, height: shot.height } })
    // A whole figure is narrow; a face fills more of its square, but still not all of it.
    await assertNotBlank(png, shot.name, shot.frame < 1 ? 0.9 : 0.6)
    return await encode(png, shot.name)
  } finally {
    await context.close()
  }
}

/** Every shot, in the option lists' order, and the guide's face last. */
const SHOTS: Shot[] = [...everyGuest().map((g): Shot => ({ name: guestKey(g), look: g, frame: 1, width: WIDTH, height: HEIGHT })), GUIDE_FACE]

/** Stops the run if two pictures are the same: a character the hook did not draw (it fell back to the default), or a stale page. */
async function assertAllDiffer(shots: Array<{ name: string; webp: Buffer }>): Promise<void> {
  const seen = new Map<string, string>()
  for (const { name, webp } of shots) {
    const { data } = await sharp(webp).raw().toBuffer({ resolveWithObject: true })
    const key = createHash('sha256').update(data).digest('hex')
    const twin = seen.get(key)
    if (twin) throw new Error(`${name} is the same picture as ${twin}.`)
    seen.set(key, name)
  }
}

async function main(): Promise<void> {
  if (!process.argv.includes('--no-build')) build()
  if ((await fetchHome()) !== null) {
    throw new Error(`Something already answers on ${ORIGIN}: it could be a stale server. Stop it and run this again.`)
  }
  console.log(`Starting the site on ${ORIGIN}...`)
  const server = spawn(`npx next start --port ${PORT}`, { shell: true, stdio: 'ignore', detached: process.platform !== 'win32', env: hookedEnv() })
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
    if (!isE2eBuild(html)) throw new Error('The build in .next-e2e was not made with the test hooks (NEXT_PUBLIC_E2E=1). Run this again without --no-build.')
    const shots: Array<{ name: string; webp: Buffer }> = new Array(SHOTS.length)
    const browser = await chromium.launch()
    try {
      // A few at a time, each into its own place in the list, so the order stays the lists' order.
      let next = 0
      const worker = async () => {
        while (next < SHOTS.length) {
          const i = next++
          const shot = SHOTS[i]!
          console.log(`Capturing ${shot.name} (${i + 1} of ${SHOTS.length})`)
          shots[i] = { name: shot.name, webp: await shoot(browser, shot) }
        }
      }
      await Promise.all(Array.from({ length: AT_ONCE }, worker))
    } finally {
      await browser.close()
    }
    await assertAllDiffer(shots)
    const outDir = resolve(process.cwd(), 'public/world/characters')
    mkdirSync(outDir, { recursive: true })
    for (const { name, webp } of shots) {
      writeFileSync(resolve(outDir, `${name}.webp`), webp)
      console.log(`  saved public/world/characters/${name}.webp: ${Math.round(webp.length / 1024)}KB`)
    }
  } finally {
    cleanUp()
  }
}

main().catch((error) => {
  console.error(`\ncapture:characters failed: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
})
