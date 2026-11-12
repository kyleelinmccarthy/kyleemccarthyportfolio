/** WCAG 2 relative luminance of a `#RRGGBB` colour. */
function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) throw new Error(`Not a #RRGGBB colour: ${hex}`)
  const value = parseInt(match[1]!, 16)
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function channels(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) throw new Error(`Not a #RRGGBB colour: ${hex}`)
  const value = parseInt(match[1]!, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** `hex` at `alpha` (0..1) over an opaque `backdrop`, blended channel by channel in sRGB as a browser does, as `#RRGGBB`. */
export function composite(hex: string, alpha: number, backdrop: string): string {
  const a = Math.min(1, Math.max(0, alpha))
  const top = channels(hex)
  const under = channels(backdrop)
  return `#${top.map((c, i) => Math.round(c * a + under[i]! * (1 - a)).toString(16).padStart(2, '0')).join('')}`
}

/** WCAG 2 contrast ratio between two `#RRGGBB` colours, from 1 (identical) to 21. */
export function contrastRatio(hexA: string, hexB: string): number {
  const [a, b] = [luminance(hexA), luminance(hexB)]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
