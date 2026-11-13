/*
 * The place's sheet on a phone. These import nothing, not even three's maths:
 * the panel uses them, and anything it imports from three would load three.js
 * on every place page, ahead of the canvas (and without WebGL, for nothing).
 * The camera's own gestures are in `./gestures`, which re-exports these.
 */

/**
 * How far up the view moves, in pixels, so what the camera looks at sits in the
 * middle of the screen above the place's sheet: half the height the sheet
 * covers from its top edge (`sheetTop`, from the top of a screen `height` tall)
 * down. None without a sheet.
 */
export function sheetViewOffset(sheetTop: number | null, height: number): number {
  if (sheetTop === null || !Number.isFinite(sheetTop) || !(height > 0)) return 0
  return Math.min(height, Math.max(0, height - sheetTop)) / 2
}

/** The sheet's handle's accessible name, the same open or not: whether the sheet is open is its `aria-expanded`. */
export const SHEET_HANDLE_NAME = 'Details'

/** The sheet's two heights: a peek, or open in full. */
export type SheetState = 'peek' | 'full'

/**
 * The sheet's heights, as shares of the dynamic viewport (`dvh`, which follows the browser's bars as they come and
 * go): open in full, the panel's `max-[820px]:max-h-[58dvh]`; at its peek, `.place-sheet[data-sheet='peek']` in
 * globals.css, `share` of it but never under `least` pixels, so on a phone on its side the name still shows. A
 * unit test holds the stylesheet and the panel to these.
 */
export const SHEET_FULL = 0.58
export const SHEET_PEEK = { share: 0.25, least: 150 } as const

/** A drag on the sheet's handle further than this many pixels sets it; a shorter one is a tap. */
export const SHEET_DRAG = 24

/** Where the sheet settles after its handle is dragged `dy` pixels (down is positive) from `from`. */
export function sheetAfterDrag(from: SheetState, dy: number): SheetState {
  if (dy <= -SHEET_DRAG) return 'full'
  if (dy >= SHEET_DRAG) return 'peek'
  return from
}
