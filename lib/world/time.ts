import { dayHours, greetings } from '@/content/sky'
import type { Band, LookKey, Theme } from '@/content/types'

/** One name per entry in `greetings`, in the same order. */
const BANDS: readonly Band[] = ['morning', 'afternoon', 'evening', 'late']

const NOON = 12

/**
 * Hours are 0 up to, but not including, 24. Fractions are fine (5.5 is half
 * past five). Anything else, including NaN, is treated as noon so a bad clock
 * reading never leaves the sky or the greeting undefined.
 */
function clean(hour: number): number {
  return Number.isFinite(hour) && hour >= 0 && hour < 24 ? hour : NOON
}

/** Index into `greetings` for an hour. The small hours belong to the last band. */
function bandIndex(hour: number): number {
  const h = clean(hour)
  let index = greetings.length - 1
  greetings.forEach((band, i) => {
    if (h >= band.from) index = i
  })
  return index
}

/** The part of the day an hour falls in: morning, afternoon, evening or late. */
export function bandOf(hour: number): Band {
  return BANDS[bandIndex(hour)]!
}

/** Day runs from `dayHours.from` up to, but not including, `dayHours.to`. */
export function themeForHour(hour: number): Theme {
  const h = clean(hour)
  return h >= dayHours.from && h < dayHours.to ? 'day' : 'night'
}

/** The sky to draw. Night is one sky; by day the band picks it, and late-day reads as afternoon. */
export function lookFor(theme: Theme, band: Band): LookKey {
  if (theme === 'night') return 'night'
  return band === 'late' ? 'afternoon' : band
}

/** The salutation for an hour. */
export function greetingFor(hour: number): string {
  return greetings[bandIndex(hour)]!.text
}
