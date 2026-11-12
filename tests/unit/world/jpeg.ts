import { readFileSync } from 'node:fs'

/**
 * A JPEG's width and height in pixels, read from its frame header, as its
 * pixels are stored. It does not read EXIF: a file whose EXIF says to turn it
 * on its side is drawn turned by a browser that honours that tag, so its shape
 * on screen would be this size turned. None of the posters in use carries an
 * orientation tag; a new one that does must be saved upright first.
 */
export function jpegSize(file: string): [number, number] {
  const bytes = readFileSync(file)
  let at = 2
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) {
      at++
      continue
    }
    const marker = bytes[at + 1]
    const length = bytes.readUInt16BE(at + 2)
    // A start-of-frame marker (C0 to CF, less the DHT, JPG and DAC markers) carries the height, then the width.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return [bytes.readUInt16BE(at + 7), bytes.readUInt16BE(at + 5)]
    at += 2 + length
  }
  throw new Error(`no frame header in ${file}`)
}
