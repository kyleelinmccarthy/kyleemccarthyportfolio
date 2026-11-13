import { overlaps, type ScreenPoint, type ScreenRect, type TagSize } from './labels'

/*
 * Where the guide's speech bubble goes on the screen, from where her head
 * falls. Pure, so every rule is a unit test; the canvas projects her head each
 * frame and writes the result to the bubble (transforms only, no layout read).
 */

/** The id of the guide's speech bubble on the page (`GuideBubble`), by which the canvas finds it. */
export const BUBBLE_ID = 'guide-bubble'

/** The gap between the bubble and the point over her head, where its tail runs: in pixels. */
export const BUBBLE_GAP = 14
/** The bubble keeps at least this far inside the screen's edges. */
const MARGIN = 10
/** The part of the landmark's box (as `landmarkBox` gives it) that counts as its middle, which the bubble never covers: this share of its width and height, round its centre. */
export const LANDMARK_MIDDLE = 0.5

/** Which side of her head the bubble stands: above it, or beside it to the left or right. */
export type BubbleSide = 'above' | 'left' | 'right'

/**
 * Where the bubble goes: `docked` when it cannot stand by her (her head is off
 * the screen, behind the planet or under the panel, or no side of it is
 * clear), when the page puts it in the HUD instead; otherwise the top-left
 * corner of its box, the side of her head it stands, and where along its edge
 * its tail is (pixels from its left, or for a side bubble from its top).
 */
export type BubblePlacement = { docked: true } | { docked: false; x: number; y: number; side: BubbleSide; tail: number }

/** The middle of a landmark's box on the screen: what the bubble must never cover. */
export function landmarkMiddle(box: ScreenRect, share = LANDMARK_MIDDLE): ScreenRect {
  const w = ((box.right - box.left) * share) / 2
  const h = ((box.bottom - box.top) * share) / 2
  const cx = (box.left + box.right) / 2
  const cy = (box.top + box.bottom) / 2
  return { left: cx - w, right: cx + w, top: cy - h, bottom: cy + h }
}

const inside = (p: ScreenPoint, r: ScreenRect) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom

/**
 * Where the bubble of `size` goes for her head at `head` (on the screen if
 * `visible`), in a `view`, keeping clear of `keepOut` (what covers the map:
 * the panel, the tour bar, the header) and of `middle` (the middle of the
 * landmark the visitor came to see). It tries, in order: above her head,
 * slid along so it stays on the screen (its tail still over her head); then
 * to her right; then to her left. The first that is wholly on the screen and
 * clear wins. If none is, or her head itself cannot be seen (off the screen,
 * round the planet, under something), it docks.
 */
export function placeBubble(
  head: ScreenPoint,
  visible: boolean,
  size: TagSize,
  view: TagSize,
  keepOut: readonly ScreenRect[],
  middle: ScreenRect | null,
): BubblePlacement {
  const numbers = [head.x, head.y, size.width, size.height, view.width, view.height]
  if (!visible || !numbers.every(Number.isFinite)) return { docked: true }
  if (keepOut.some((r) => inside(head, r))) return { docked: true }
  const { width: w, height: h } = size
  const screen = { left: MARGIN, top: MARGIN, right: view.width - MARGIN, bottom: view.height - MARGIN }
  const clear = (r: ScreenRect) =>
    r.left >= screen.left && r.right <= screen.right && r.top >= screen.top && r.bottom <= screen.bottom && !keepOut.some((k) => overlaps(r, k)) && !(middle && overlaps(r, middle))
  // Above: centred over her head, slid to fit across the screen, its tail kept over her head (and off its rounded corners).
  const corner = Math.min(16, w / 2)
  const left = Math.min(Math.max(head.x - w / 2, screen.left), screen.right - w)
  const slid = Math.min(Math.max(left, head.x - w + corner), head.x - corner)
  const above: ScreenRect = { left: slid, right: slid + w, top: head.y - BUBBLE_GAP - h, bottom: head.y - BUBBLE_GAP }
  if (clear(above)) return { docked: false, x: above.left, y: above.top, side: 'above', tail: head.x - slid }
  // Beside her head, level with it.
  const top = Math.min(Math.max(head.y - h / 2, screen.top), screen.bottom - h)
  const tail = Math.min(Math.max(head.y - top, corner), h - corner)
  const right: ScreenRect = { left: head.x + BUBBLE_GAP, right: head.x + BUBBLE_GAP + w, top, bottom: top + h }
  if (clear(right)) return { docked: false, x: right.left, y: right.top, side: 'right', tail }
  const leftSide: ScreenRect = { left: head.x - BUBBLE_GAP - w, right: head.x - BUBBLE_GAP, top, bottom: top + h }
  if (clear(leftSide)) return { docked: false, x: leftSide.left, y: leftSide.top, side: 'left', tail }
  return { docked: true }
}
