import { rooms } from '@/content/rooms'

/**
 * Local hour (0–23) to the greeting on the front step.
 *
 * Bands are ordered by their first hour. Anything earlier than the first band
 * wraps to the last one, so 1am gets the late-night greeting rather than
 * falling through to nothing.
 *
 * Pure and hour-based rather than Date-based so it can be tested at every hour
 * without faking the clock.
 */
export function greetingForHour(hour: number): string {
  const bands = rooms.steps.greetings
  // Pre-dawn belongs to the last band, not the first.
  let match = bands[bands.length - 1]!
  for (const band of bands) {
    if (hour >= band.from) match = band
  }
  return match.text
}
