/**
 * The text colours for each theme. app/globals.css declares the same values as
 * `--ink` and `--muted` (a test keeps the two in step); they live here so the
 * contrast test and the share image can read them.
 */
/**
 * The plate behind HUD text that can have anything behind it (the name over
 * the planet, the legend over a cloud): a colour and how opaque it is, as
 * `--plate` in app/globals.css (a test keeps the two in step). Opaque enough
 * that the text holds AA over pure white and pure black alike.
 */
export const plates = {
  day: { color: '#FFFFFF', alpha: 0.8 },
  night: { color: '#0D112E', alpha: 0.8 },
} as const

export const textColors = {
  day: { ink: '#16193A', muted: '#1E274B' },
  night: { ink: '#F2F0FF', muted: '#BAC1EE' },
} as const
