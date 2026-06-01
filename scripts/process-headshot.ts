/**
 * Art-directs the selfie while keeping Kylee's natural colors:
 *   tight 4:5 crop  ->  keep face sharp + true color, dim & blur the background
 *   ->  terracotta highlight rimming the outer edge  ->  soft feather to transparent.
 *
 * Run:  npm run process:headshot
 * Output: public/kylee-portrait-2.png (+ .avif), with transparency.
 */
import sharp from 'sharp'
import { resolve } from 'node:path'

const SRC = resolve(process.cwd(), 'Snapchat-351522414.jpg')
const OUT_PNG = resolve(process.cwd(), 'public/kylee-portrait-6.png')
const OUT_AVIF = resolve(process.cwd(), 'public/kylee-portrait-6.avif')

const W = 900
const H = 1125

async function main() {
  // Cropped, gently graded color base (natural skin tones preserved).
  const baseColor = await sharp(SRC)
    // Pulled back (uses most of the frame) so it reads as a portrait, not a zoom.
    .extract({ left: 30, top: 70, width: 1020, height: 1275 })
    .resize(W, H, { fit: 'cover' })
    .modulate({ saturation: 1.04 })
    .linear(1.04, -4)
    .png()
    .toBuffer()

  // Background: blurred AND dimmed so the room/bookshelf recedes.
  const bg = await sharp(baseColor)
    .blur(16)
    .modulate({ brightness: 0.72, saturation: 0.85 })
    .png()
    .toBuffer()

  // Focus mask: face + hair stay sharp & natural; everything else uses bg.
  const focusMask = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="f" cx="50%" cy="40%" r="56%">
          <stop offset="48%" stop-color="#fff"/>
          <stop offset="86%" stop-color="#000"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#f)"/>
    </svg>`
  )
  const focusAlpha = await sharp(focusMask).resize(W, H).greyscale().extractChannel(0).png().toBuffer()
  const sharpFace = await sharp(baseColor).joinChannel(focusAlpha).png().toBuffer()
  const composed = await sharp(bg).composite([{ input: sharpFace, blend: 'over' }]).png().toBuffer()

  // RECTANGULAR feather: most of the photo stays fully visible; only a band
  // near each edge softens. A big blur on the mask makes that band gradual.
  const mx = Math.round(W * 0.04)
  const my = Math.round(H * 0.04)
  const featherSvg = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="#000"/>
      <rect x="${mx}" y="${my}" width="${W - 2 * mx}" height="${H - 2 * my}" rx="36" fill="#fff"/>
    </svg>`
  )
  const featherAlpha = await sharp(featherSvg)
    .resize(W, H)
    .blur(34)
    .greyscale()
    .extractChannel(0)
    .png()
    .toBuffer()

  // Terracotta tint ONLY where the photo is fading (inverse of the feather),
  // so the soft edges bleed into terracotta and tie the photo to the site.
  const terraAlpha = await sharp(featherAlpha).negate().linear(0.88, 0).png().toBuffer()
  const terraLayer = await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 0xbf, g: 0x4d, b: 0x3a } },
  })
    .joinChannel(terraAlpha)
    .png()
    .toBuffer()

  const tinted = await sharp(composed)
    .removeAlpha()
    .composite([{ input: terraLayer, blend: 'over' }])
    .png()
    .toBuffer()
  const final = sharp(tinted).joinChannel(featherAlpha)

  await final.clone().png().toFile(OUT_PNG)
  await final.clone().avif({ quality: 62 }).toFile(OUT_AVIF)
  console.log('Wrote', OUT_PNG, 'and', OUT_AVIF)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
