export interface ParsedStat {
  prefix: string
  target: number
  suffix: string
  /** false when the value has no leading number to animate (render literally). */
  animatable: boolean
}

/**
 * Split a display stat into an animatable leading number plus the surrounding
 * text, so values like "$1,600+/yr", "6 weeks", "2×+" and "50/quarter" animate
 * the numeral while preserving their decoration.
 */
export function parseStatValue(raw: string): ParsedStat {
  const match = raw.match(/^([^\d]*)([\d,]+)(.*)$/)
  if (!match) {
    return { prefix: raw, target: 0, suffix: '', animatable: false }
  }
  const [, prefix, digits, suffix] = match
  return {
    prefix,
    target: Number.parseInt(digits.replace(/,/g, ''), 10),
    suffix,
    animatable: true,
  }
}

/** Render the current animated value back into the original display shape. */
export function formatCountValue(parsed: ParsedStat, current: number): string {
  if (!parsed.animatable) return parsed.prefix
  const rounded = Math.round(current)
  return `${parsed.prefix}${rounded.toLocaleString('en-US')}${parsed.suffix}`
}
