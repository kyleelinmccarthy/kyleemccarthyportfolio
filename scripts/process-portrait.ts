/**
 * The tall portrait on /about.
 *
 * The previous version (process-headshot.ts) did rather a lot to a different
 * photograph: an elliptical face mask keeping the face sharp while the room
 * behind it was blurred and dimmed, a gold rim around the outside, and a
 * feather to transparency. All of it was hand-tuned to that frame's geometry
 * and none of those numbers mean anything on a new photo.
 *
 * This does the part that was actually earning its keep — the soft edge, so
 * the portrait sits on the page instead of being a rectangle stuck to it — and
 * leaves the photograph alone otherwise. Kylee's colours are already right.
 *
 * Run:  npm run process:portrait
 * In:   assets/kylee-2026-08.jpg   (phone photo, EXIF-rotated)
 * Out:  public/kylee-portrait-2026.webp (+ .avif)
 *
 * WebP rather than PNG for the source Next optimises from: the feather needs
 * an alpha channel, and a photograph in PNG is 2.7MB where the same pixels in
 * WebP are under 200KB.
 */
import sharp from 'sharp'
import { resolve } from 'node:path'
import { statSync } from 'node:fs'

const SRC = resolve(process.cwd(), 'assets/kylee-2026-08.jpg')
const OUT_WEBP = resolve(process.cwd(), 'public/kylee-portrait-2026.webp')
const OUT_AVIF = resolve(process.cwd(), 'public/kylee-portrait-2026.avif')

const W = 900
const H = 1125

/**
 * A 4:5 crop in the coordinates of the *rotated* image. The source is a phone
 * photo with EXIF orientation 6 — stored landscape, displayed portrait — so
 * rotate() runs first and gives 2544x3392. Same framing as the nav avatar,
 * carried further down for the shoulders.
 */
const CROP = { left: 115, top: 200, width: 2100, height: 2625 }

async function main() {
  // rotate() with no argument applies the EXIF orientation and strips it, so
  // the output is upright everywhere rather than only where EXIF is honoured.
  const upright = await sharp(SRC).rotate().toBuffer()

  const base = await sharp(upright)
    .extract(CROP)
    .resize(W, H, { fit: 'cover' })
    .modulate({ saturation: 1.03 })
    .linear(1.03, -3)
    .png()
    .toBuffer()

  // The feather: opaque through the middle, falling away at the very edge.
  // Applied as an alpha mask rather than a drawn border, so what softens is
  // the photograph itself and there is no frame to clash with the page.
  const feather = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="soft" cx="50%" cy="44%" r="72%">
          <stop offset="0%" stop-color="#fff" stop-opacity="1" />
          <stop offset="72%" stop-color="#fff" stop-opacity="1" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" rx="24" fill="url(#soft)" />
    </svg>`
  )

  const out = sharp(base).composite([{ input: feather, blend: 'dest-in' }])

  await out.clone().webp({ quality: 84 }).toFile(OUT_WEBP)
  await out.clone().avif({ quality: 62 }).toFile(OUT_AVIF)

  for (const f of [OUT_WEBP, OUT_AVIF]) {
    console.log(`portrait -> ${f} (${Math.round(statSync(f).size / 1024)}KB)`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
