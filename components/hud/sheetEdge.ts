/**
 * Where the place's sheet stands on a phone: the top edge of its box, in pixels
 * from the top of the window, or null while there is no sheet. The sheet
 * writes it as it moves; the camera reads it each frame to keep the landmark
 * in the middle of the screen above it. A single value, not a store: nothing
 * re-renders when it changes.
 */
let top: number | null = null

export const placeSheet = {
  top: (): number | null => top,
  set(next: number | null): void {
    top = next
  },
}
