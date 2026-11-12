import { tourOrder } from '@/content/world'

/** Position of a place on the tour, or -1 if it is not a stop. */
export function tourIndex(id: string): number {
  return tourOrder.indexOf(id)
}

/** The next (1) or previous (-1) stop, wrapping round. From nowhere, or off the tour, it starts at the first stop. */
export function tourStep(id: string | null, delta: 1 | -1): string {
  const i = id === null ? -1 : tourIndex(id)
  if (i < 0) return tourOrder[0]!
  const n = tourOrder.length
  return tourOrder[(i + delta + n) % n]!
}
