/**
 * The small round portrait in the nav bar.
 *
 * Separate from process-headshot.ts on purpose: that one art-directs a tall
 * portrait for /about, with a blurred background and a feathered edge. This is
 * a 40px circle. It needs a square crop of a face and nothing else — any of
 * that treatment would be invisible at this size and would only cost bytes.
 *
 * Run:  npm run process:nav-avatar
 * In:   assets/kylee-2026-08.jpg   (phone photo, EXIF-rotated)
 * Out:  public/kylee-nav.jpg
 */
import sharp from 'sharp'
import { resolve } from 'node:path'
import { statSync } from 'node:fs'

const SRC = resolve(process.cwd(), 'assets/kylee-2026-08.jpg')
const OUT = resolve(process.cwd(), 'public/kylee-nav.jpg')

/**
 * The crop, in the coordinates of the *rotated* image. The source is a phone
 * photo with EXIF orientation 6, so it is stored landscape and displayed
 * portrait; sharp's rotate() applies that first, giving 2544x3392. Head and
 * shoulders, centred a little above the middle so the circle does not cut the
 * top of her head off.
 */
const CROP = { left: 115, top: 200, width: 2100, height: 2100 }

/** 512 for a 40px circle: enough for a 4x display, still a small file. */
const SIZE = 512

async function main() {
  // rotate() with no argument applies the EXIF orientation and strips it, so
  // the output is upright everywhere rather than only where EXIF is honoured.
  const upright = await sharp(SRC).rotate().toBuffer()

  await sharp(upright)
    .extract(CROP)
    .resize(SIZE, SIZE)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(OUT)

  console.log(`nav avatar -> ${OUT} (${Math.round(statSync(OUT).size / 1024)}KB)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
