import { Vector3 } from 'three'
import type { District, Place } from '@/content/types'
import { MODEL_SCALE } from './camera'
import { D2R, dirOf } from './geo'
import { groundOf } from './terrain'

/** Closer than this, every place gets its own label; further out, the districts do. */
export const PLACE_TIER_DISTANCE = 3.25
/** A place's label sits this many model units above the top of its landmark. */
const ANCHOR_CLEARANCE = 0.3
/** A district's label floats over its centre at this many planet radii. */
const DISTRICT_ANCHOR_RADIUS = 1.1

export type LabelTier = 'district' | 'place'

/** Marks a part of the page that stands over the map, such as the panel: no label shows under it. */
export const COVERS_LABELS = 'data-covers-labels'
/** The id of the layer the labels sit in, over the canvas. */
export const LABELS_ID = 'labels'
/** The name the labels' layer is announced by, while it is a navigation landmark (while any label shows). */
export const LABELS_NAME = 'Places on the map'

/**
 * The landmark role and name the labels' layer should carry: navigation,
 * named, while `shown` labels (any that can be seen and read) are in it;
 * nothing at all while it is empty, so it is never announced empty.
 */
export function labelsLandmark(shown: number): { role: 'navigation'; name: string } | null {
  return shown > 0 ? { role: 'navigation', name: LABELS_NAME } : null
}
/** The id of a place's label link, by which the canvas finds it. */
export const labelId = (placeId: string) => `label-${placeId}`
/** The id of a district's label link. Apart from the places', as a place and a district may share a name. */
export const districtLabelId = (districtId: string) => `label-district-${districtId}`
/** The id of a constellation's name on the sky, from the name: `The Natural 20` is `label-const-the-natural-20`. */
export const constellationLabelId = (name: string) =>
  `label-const-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`
/** The constellations are named only when the night is at least this far in (the look's `star` amount, 0 to 1). */
export const CONSTELLATION_LABELS_FROM = 0.5

const along = new Vector3()

/**
 * True if the planet stands between the camera and an anchor: the sight line
 * from one to the other passes closer to the centre than `radius`. The default
 * sits just under sea level, so a label at the very edge of the planet still shows.
 */
export function isOccluded(camera: Vector3, anchor: Vector3, radius = 0.992): boolean {
  along.subVectors(anchor, camera)
  // The point of the segment nearest the centre, as a fraction of the way along it.
  const t = Math.min(1, Math.max(0, -camera.dot(along) / along.lengthSq()))
  const x = camera.x + along.x * t
  const y = camera.y + along.y * t
  const z = camera.z + along.z * t
  return x * x + y * y + z * z < radius * radius
}

/** Which labels show: the districts from afar, the places up close or whenever the camera is not in orbit. */
export function labelTier(distance: number, focused: boolean): LabelTier {
  return focused || distance < PLACE_TIER_DISTANCE ? 'place' : 'district'
}

/**
 * Closer than this, the headline, the greeting and the legend give way: the
 * planet fills the view behind them. The same distance at which the places
 * get their own labels.
 */
export const HUD_FADE_DISTANCE = PLACE_TIER_DISTANCE

/** Once faded, the HUD comes back only when the camera is this much further out than `HUD_FADE_DISTANCE`. */
export const HUD_FADE_BAND = 0.1

/**
 * True when the camera is close enough that the headline, greeting and legend
 * should fade out. `wasAway` is whether they are faded now: once faded they
 * come back only past `HUD_FADE_BAND` further out, so a camera resting at the
 * threshold cannot make them flicker.
 */
export function hudGivesWay(distance: number, wasAway = false): boolean {
  return distance < HUD_FADE_DISTANCE + (wasAway ? HUD_FADE_BAND : 0)
}

/** A part of the page that covers the map, as last measured, and whether it is one that gives way and holds the focus now. */
export interface Cover {
  rect: ScreenRect
  givesWay: boolean
  holdsFocus: boolean
}

/**
 * Which parts of the page cover the map this frame: all of them, except those
 * that have given way to the planet (`away`), unless focus has brought one
 * back, when it covers the map again.
 */
export function coversInForce(covers: Cover[], away: boolean): ScreenRect[] {
  return covers.filter((c) => !(away && c.givesWay && !c.holdsFocus)).map((c) => c.rect)
}

/** After the pointer leaves a landmark, its label stays lit this long, so the pointer can travel onto its tag. */
export const HOVER_GRACE_MS = 700

/* ───────────── placing tags on the screen ───────────── */

export interface ScreenPoint {
  x: number
  y: number
}
export interface ScreenRect {
  left: number
  top: number
  right: number
  bottom: number
}
export interface TagSize {
  width: number
  height: number
}
export type TagKind = 'place' | 'district'

/**
 * Where the stylesheet draws a tag from its pin (see `.lm` in globals.css), in
 * CSS pixels: its near edge `side` past the pin's centre (to the right, or to
 * the left when flipped), and its near edge `rise` above the pin (or below it
 * when flipped). The leader line runs that far from the pin's centre: 30px
 * for a place, 38px (or a longer `DISTRICT_RISES`) for a district (globals.css
 * `--tag-rise`).
 */
export const TAG_GEOMETRY = { side: 1, rise: { place: 30, district: 38 } } as const
/**
 * The leader-line lengths a district's tag may take, shortest first: it rises
 * further from its pin when that keeps the tag and its whole line off the
 * landmarks, the pins and the other tags, before it would collapse to its pin.
 */
export const DISTRICT_RISES = [38, 86, 134] as const
/** Half the width the layout keeps clear along a leader line, in pixels: the 1px line and a little room either side. */
const STEM_HALF = 3
/** A tag keeps at least this far inside the screen's edges. */
const SCREEN_MARGIN = 6

export interface TagPlacement {
  /** The tag runs to the left of its pin. */
  flipX: boolean
  /** The tag hangs below its pin. */
  flipY: boolean
  /** How far the tag is slid across, in pixels, to fit the screen. */
  shift: number
  /** How far its near edge stands from the pin's centre, up (or down when flipped): the leader line's reach. */
  rise: number
  /** Where the tag then is on the screen. */
  rect: ScreenRect
  /** Where its leader line runs beyond its usual length, as a slim box (empty for a line of the usual length; `stemBox`). */
  stem: ScreenRect
}

/**
 * The slim box the part of a leader line beyond its usual length takes: from
 * `base` (the kind's usual rise) out to `rise` from the pin's centre, up (or
 * down when flipped). The usual stretch belongs with the pin (where the pin
 * may stand, so may it), so a line of the usual length claims nothing; what
 * a longer one claims is checked like the tag.
 */
function stemBox(pin: ScreenPoint, rise: number, flipY: boolean, base: number): ScreenRect {
  const from = Math.min(base, rise)
  return flipY
    ? { left: pin.x - STEM_HALF, right: pin.x + STEM_HALF, top: pin.y + from, bottom: pin.y + rise }
    : { left: pin.x - STEM_HALF, right: pin.x + STEM_HALF, top: pin.y - rise, bottom: pin.y - from }
}

const area = (r: ScreenRect) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top)
const overlapArea = (a: ScreenRect, b: ScreenRect) =>
  area({ left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) })

/** Whether two rectangles overlap at all. */
export function overlaps(a: ScreenRect, b: ScreenRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

/**
 * How much each pixel of a tag costs where it lands: off the screen worst of
 * all (a tag there cannot be read, where one that gives way still has its
 * pin), on another tag next, on anything else in the way least.
 */
const OFF_SCREEN_WEIGHT = 8
const AVOID_WEIGHT = 4

/**
 * Where a tag goes so that it can be read: above and to the right of its pin
 * if it fits there, otherwise on whichever side of its pin (left, below, or
 * both) keeps it on the screen and out of `keepOut` (the header, the tour
 * bar, for a district the landmarks) and, more than anything, out of `avoid`
 * (tags already placed). A tag too wide for either side slides across to fit
 * the screen, never so far that it leaves its pin's column. A tag may also
 * stand further from its pin (`rises`, shortest first and preferred). Where
 * nothing fits, the placement that hides least of it.
 */
export function placeTag(
  pin: ScreenPoint,
  size: TagSize,
  kind: TagKind,
  view: TagSize,
  keepOut: ScreenRect[],
  avoid: ScreenRect[] = [],
  rises: readonly number[] = [TAG_GEOMETRY.rise[kind]],
): TagPlacement {
  const { x, y } = pin
  const { width: w, height: h } = size
  const side = TAG_GEOMETRY.side
  const first = rises[0] ?? TAG_GEOMETRY.rise[kind]
  const plain: TagPlacement = {
    flipX: false,
    flipY: false,
    shift: 0,
    rise: first,
    rect: { left: x - side, right: x - side + w, top: y - first - h, bottom: y - first },
    stem: stemBox(pin, first, false, TAG_GEOMETRY.rise[kind]),
  }
  if (![x, y, w, h, view.width, view.height].every(Number.isFinite)) return plain
  const screen = { left: SCREEN_MARGIN, top: SCREEN_MARGIN, right: view.width - SCREEN_MARGIN, bottom: view.height - SCREEN_MARGIN }

  let best = { placement: plain, cost: Infinity }
  const sides = [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ] as const
  const options = rises.flatMap((rise, reach) => sides.map(([flipX, flipY]) => [flipX, flipY, rise, reach] as const))
  for (const [order, [flipX, flipY, rise, reach]] of options.entries()) {
    const left = flipX ? x + side - w : x - side
    const top = flipY ? y + rise : y - rise - h
    // Slide it to fit across the screen, but never off its pin's column.
    let shift = 0
    if (left < screen.left) shift = screen.left - left
    else if (left + w > screen.right) shift = screen.right - (left + w)
    shift = Math.min(Math.max(shift, x - (left + w)), x - left)
    const rect = { left: left + shift, right: left + shift + w, top, bottom: top + h }
    const stem = stemBox(pin, rise, flipY, TAG_GEOMETRY.rise[kind])
    // The tag and its leader line both: a line run through a landmark or a pin hides it as surely as the tag would.
    const hidden =
      OFF_SCREEN_WEIGHT * (area(rect) - overlapArea(rect, screen)) +
      keepOut.reduce((sum, k) => sum + overlapArea(rect, k) + overlapArea(stem, k), 0) +
      avoid.reduce((sum, k) => sum + AVOID_WEIGHT * (overlapArea(rect, k) + overlapArea(stem, k)), 0)
    // What it hides first; then a longer leader line is worse than a slide, a slide worse than a flip; then the order above.
    const cost = hidden * 1e3 + reach * 100 + (shift !== 0 ? 10 : 0) + order
    if (cost < best.cost) best = { placement: { flipX, flipY, shift, rise, rect, stem }, cost }
  }
  return best.placement
}

/** The top of a place's landmark: straight up from its ground by its height. */
export function landmarkTop(place: Place, districts: District[]): Vector3 {
  return groundOf(place.at, districts).addScaledVector(dirOf(place.at), place.height * MODEL_SCALE)
}

/**
 * A landmark as a box on the screen, from where its foot and its top fall:
 * as tall as it stands and as wide (most landmarks are about as wide as they
 * are tall), never smaller than a few pixels.
 */
export function landmarkBox(foot: ScreenPoint, top: ScreenPoint): ScreenRect {
  const tall = Math.max(Math.hypot(foot.x - top.x, foot.y - top.y), 8)
  const cx = (foot.x + top.x) / 2
  return { left: cx - tall / 2, right: cx + tall / 2, top: Math.min(foot.y, top.y), bottom: Math.max(foot.y, top.y, Math.min(foot.y, top.y) + 8) }
}

/**
 * Each landmark on the near side and in front of the camera, as a box on the
 * screen (`landmarkBox`). `project` puts a point in the world on the screen
 * and says whether it is behind the camera.
 */
export function landmarkBoxes(
  anchors: ReadonlyArray<{ top: Vector3; ground: Vector3 }>,
  eye: Vector3,
  project: (v: Vector3) => ScreenPoint & { behind: boolean },
): ScreenRect[] {
  const boxes: ScreenRect[] = []
  for (const { top, ground } of anchors) {
    if (isOccluded(eye, top)) continue
    const head = project(top)
    const foot = project(ground)
    if (!head.behind && !foot.behind) boxes.push(landmarkBox(foot, head))
  }
  return boxes
}

/**
 * A tag only brushing a landmark's box by this many pixels or fewer is not
 * over it: the boxes are a little larger than the landmarks they stand for.
 */
export const LANDMARK_TOLERANCE = 4

/**
 * True when a tag stands over a landmark (R33): its box overlaps a
 * landmark's box on the screen by more than `LANDMARK_TOLERANCE` pixels.
 */
export function tagOverLandmark(rect: ScreenRect, landmarks: ScreenRect[]): boolean {
  const t = LANDMARK_TOLERANCE
  return landmarks.some((l) => overlaps(rect, { left: l.left + t, top: l.top + t, right: l.right - t, bottom: l.bottom - t }))
}

/* ───────────── laying out every tag ───────────── */

/**
 * How a label is drawn: a place's whole callout, a place's pin alone (seen
 * from afar), a district's, a neighbour's pin on a phone at a place, or a
 * constellation's name on the sky.
 */
export type LabelForm = 'place' | 'dot' | 'district' | 'nearby' | 'constellation'

/**
 * One label as the layout sees it this frame: whether it shows, where its pin
 * is, whether the visitor holds it (hovers, focuses or has opened it) and its
 * tag's size. `layoutTags` fills in the rest: the tag's slide and flips, and
 * whether it gives way to its pin alone (`tagless`).
 */
export interface TagItem {
  id: string
  form: LabelForm
  on: boolean
  at: ScreenPoint
  held: boolean
  size: TagSize
  shift: number
  /** The leader line's reach, from the pin's centre to the tag's near edge. */
  rise: number
  flipX: boolean
  flipY: boolean
  tagless: boolean
}

/**
 * What the tags are laid out in: the screen, what covers the map, the
 * landmarks on it, the middle of the view, and at a place the box of the
 * landmark the visitor has come to see (`focused`), which no neighbouring
 * place's tag may stand over.
 */
export interface TagContext {
  view: TagSize
  covers: ScreenRect[]
  landmarks: ScreenRect[]
  focus: ScreenPoint
  focused?: ScreenRect | null
}

/** A place's pin with the ring round it, as a square on the screen, in pixels. */
const PIN_BOX = 18

const pinBox = (p: ScreenPoint): ScreenRect => ({ left: p.x - PIN_BOX / 2, top: p.y - PIN_BOX / 2, right: p.x + PIN_BOX / 2, bottom: p.y + PIN_BOX / 2 })

/** Whether a label's tag is placed this frame: a shown place, district or neighbour, or a dot while it is held. Never a constellation name. */
const isPlaced = (i: TagItem) => i.on && (i.form === 'place' || i.form === 'district' || i.form === 'nearby' || (i.form === 'dot' && i.held))

/**
 * Lays out every label's tag for this frame, filling in each item. The rules:
 *
 * - Only shown places, districts and neighbours are placed, and a dot only
 *   while it is held; a constellation's name never is. Anything not placed is
 *   reset (no slide, no flips, not tagless).
 * - Held tags go first, then the rest by their pin's distance from the middle
 *   of the view, so the one nearer the focus wins (ties by id, so the order
 *   the labels come in does not matter).
 * - A tag is its box together with any leader line longer than usual (a
 *   district's raised tag), in every rule below.
 * - Every tag keeps out of what covers the map (`placeTag`); a district's also
 *   keeps off the landmarks and every other pin that shows (places' and other
 *   districts').
 * - Places' and districts' tags claim room: each keeps clear of those placed
 *   before it, and one that still lands on a kept one gives way to its pin.
 *   A tag that gave way claims no room. Dots' and neighbours' tags show on
 *   demand and claim none.
 * - A district's tag that still stands (or runs its line) over a landmark or
 *   another pin collapses to its pin (R33), unless it is held.
 * - At a place, a neighbouring place's tag (its callout, or on a phone its
 *   neighbour pin's tag) keeps off the landmark the visitor came to see
 *   (`focused`): it turns to a free side, or gives way to its pin if none is
 *   clear, unless it is held.
 *
 * Returns how many links show (places, districts, neighbours, a dot while
 * held; never a constellation name), for the labels' landmark role.
 */
export function layoutTags(items: TagItem[], ctx: TagContext): { links: number } {
  let links = 0
  const placed: TagItem[] = []
  // Every pin that shows, districts' too: a tag over one would leave it out of the pointer's reach.
  const pins: Array<{ item: TagItem; box: ScreenRect }> = []
  for (const i of items) {
    i.shift = 0
    i.rise = TAG_GEOMETRY.rise[i.form === 'district' ? 'district' : 'place']
    i.flipX = false
    i.flipY = false
    i.tagless = false
    if (!i.on) continue
    if (i.form !== 'constellation') pins.push({ item: i, box: pinBox(i.at) })
    if (isPlaced(i)) placed.push(i)
    if (i.form === 'place' || i.form === 'district' || i.form === 'nearby' || (i.form === 'dot' && i.held)) links++
  }
  const rank = (i: TagItem) => (i.held ? -1 : Math.hypot(i.at.x - ctx.focus.x, i.at.y - ctx.focus.y))
  placed.sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const kept: ScreenRect[] = []
  const focused = ctx.focused ?? null
  for (const i of placed) {
    const district = i.form === 'district'
    // A neighbouring place's tag, in its callout or as a phone's neighbour pin, at a place.
    const neighbour = (i.form === 'place' || i.form === 'nearby') && focused !== null
    const others = pins.filter((p) => p.item !== i).map((p) => p.box)
    const keepOut = district ? [...ctx.covers, ...ctx.landmarks, ...others] : neighbour ? [...ctx.covers, focused] : ctx.covers
    const p = placeTag(i.at, i.size, district ? 'district' : 'place', ctx.view, keepOut, kept, district ? DISTRICT_RISES : undefined)
    i.shift = p.shift
    i.rise = p.rise
    i.flipX = p.flipX
    i.flipY = p.flipY
    // The tag and its leader line together.
    const claim = [p.rect, p.stem]
    const overFocused = neighbour && !i.held && claim.some((c) => tagOverLandmark(c, [focused]))
    // A dot's or a neighbour pin's tag shows on demand and claims no room, but still keeps off the focused landmark.
    if (i.form === 'dot' || i.form === 'nearby') {
      i.tagless = overFocused
      continue
    }
    const crowded = !i.held && kept.some((r) => claim.some((c) => overlaps(r, c)))
    const overLandmark = district && !i.held && claim.some((c) => tagOverLandmark(c, ctx.landmarks) || others.some((r) => overlaps(r, c)))
    i.tagless = crowded || overLandmark || overFocused
    if (!i.tagless) kept.push(...claim)
  }
  return { links }
}

/* ───────────── a phone at a place ───────────── */

/** A phone at a place points to at most `count` of the nearest places, those within `within` degrees: its neighbours. */
export const NEARBY = { count: 3, within: 20 } as const
/** An edge pin keeps this far inside the open view: far enough that its whole 44px tap target is on the screen. */
export const EDGE_PIN_MARGIN = 24

/**
 * The part of the screen left open between what covers the top (the tour
 * bar, the name, the controls) and what covers the bottom (the panel): the
 * whole width, from the lowest bottom of anything in the top half to the
 * highest top of anything in the bottom half.
 */
export function openBand(view: TagSize, covers: ScreenRect[]): ScreenRect {
  let top = 0
  let bottom = view.height
  for (const r of covers) {
    if ((r.top + r.bottom) / 2 < view.height / 2) top = Math.max(top, r.bottom)
    else bottom = Math.min(bottom, r.top)
  }
  return { left: 0, top, right: view.width, bottom: Math.max(top, bottom) }
}

/** Two neighbours' pins on the same edge keep at least this far apart: the size of a finger's tap target. */
export const EDGE_PIN_GAP = 44

/** The open band drawn in by the edge pins' margin: the box their middles may stand in. */
function pinArea(band: ScreenRect): ScreenRect {
  return {
    left: band.left + EDGE_PIN_MARGIN,
    top: band.top + EDGE_PIN_MARGIN,
    right: Math.max(band.left + EDGE_PIN_MARGIN, band.right - EDGE_PIN_MARGIN),
    bottom: Math.max(band.top + EDGE_PIN_MARGIN, band.bottom - EDGE_PIN_MARGIN),
  }
}

/**
 * Where a neighbour's pin goes in the open view: where it is, if that is in
 * the band; otherwise on the band's edge, on the line from the band's middle
 * toward it, so it points the way to go. A point behind the camera projects
 * mirrored through the middle, so it is mirrored back and always sent to the
 * edge; so is one over the horizon (`hidden`), which would otherwise be drawn
 * on the planet's face.
 */
export function edgePin(point: ScreenPoint, behind: boolean, band: ScreenRect, hidden = false): ScreenPoint & { edge: boolean } {
  const inner = pinArea(band)
  const cx = (inner.left + inner.right) / 2
  const cy = (inner.top + inner.bottom) / 2
  let dx = point.x - cx
  let dy = point.y - cy
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { x: cx, y: cy, edge: true }
  if (behind) {
    dx = -dx
    dy = -dy
  }
  const isInside = !behind && !hidden && point.x >= inner.left && point.x <= inner.right && point.y >= inner.top && point.y <= inner.bottom
  if (isInside) return { x: point.x, y: point.y, edge: false }
  // Straight above or below the middle, with nothing to steer by: it goes to the nearer side edge.
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) dx = -1
  // Out along the line from the middle until it meets the band's edge.
  const hx = inner.right - cx
  const hy = inner.bottom - cy
  const k = Math.min(dx === 0 ? Infinity : hx / Math.abs(dx), dy === 0 ? Infinity : hy / Math.abs(dy))
  if (!Number.isFinite(k)) return { x: cx, y: cy, edge: true }
  return { x: cx + dx * k, y: cy + dy * k, edge: true }
}

/**
 * Spreads neighbours' pins that landed on the same edge of the open view so
 * no two stack: along that edge, each at least `EDGE_PIN_GAP` from the next,
 * kept within the edge. Pins in the open are left where they are. Returns new
 * points in the same order.
 */
export function spreadEdgePins<T extends ScreenPoint & { edge: boolean }>(pins: T[], band: ScreenRect): T[] {
  const inner = pinArea(band)
  const out = pins.map((p) => ({ ...p }))
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6
  const sides: Array<{ on: (p: T) => boolean; axis: 'x' | 'y'; lo: number; hi: number }> = [
    { on: (p) => near(p.x, inner.left), axis: 'y', lo: inner.top, hi: inner.bottom },
    { on: (p) => near(p.x, inner.right), axis: 'y', lo: inner.top, hi: inner.bottom },
    { on: (p) => near(p.y, inner.top), axis: 'x', lo: inner.left, hi: inner.right },
    { on: (p) => near(p.y, inner.bottom), axis: 'x', lo: inner.left, hi: inner.right },
  ]
  const done = new Set<number>()
  for (const side of sides) {
    const group = out.map((p, i) => ({ p, i })).filter(({ p, i }) => p.edge && !done.has(i) && side.on(p))
    if (group.length < 2) continue
    group.sort((a, b) => a.p[side.axis] - b.p[side.axis])
    // Push each on from the one before, then back from the far end if the run spilled over it.
    for (let k = 1; k < group.length; k++) group[k]!.p[side.axis] = Math.max(group[k]!.p[side.axis], group[k - 1]!.p[side.axis] + EDGE_PIN_GAP)
    const spill = group[group.length - 1]!.p[side.axis] - side.hi
    if (spill > 0) for (const g of group) g.p[side.axis] = Math.max(side.lo, g.p[side.axis] - spill)
    for (const g of group) done.add(g.i)
  }
  return out
}

/** The `count` places nearest to `id` across the ground and within `within` degrees of it, nearest first; none if there is no such place. */
export function nearestPlaces(id: string, places: Place[], count: number, within = 180): Place[] {
  const place = places.find((p) => p.id === id)
  if (!place) return []
  const here = dirOf(place.at)
  return places
    .filter((p) => p !== place)
    .map((p) => ({ p, angle: here.angleTo(dirOf(p.at)) / D2R }))
    .filter(({ angle }) => angle <= within)
    .sort((a, b) => a.angle - b.angle)
    .slice(0, count)
    .map(({ p }) => p)
}

/* ───────────── sky names behind the far clouds ───────────── */

const toCentre = new Vector3()
const sight = new Vector3()

/**
 * True if any of `spheres` stands on the straight line from `from` to `to`
 * (between them, not behind either end): a far cloud in front of a
 * constellation. Neither argument is changed.
 */
export function sightBlocked(from: Vector3, to: Vector3, spheres: ReadonlyArray<{ centre: Vector3; radius: number }>): boolean {
  sight.subVectors(to, from)
  const length2 = sight.lengthSq()
  if (!(length2 > 0)) return false
  for (const { centre, radius } of spheres) {
    toCentre.subVectors(centre, from)
    // The nearest point of the segment to the sphere's centre, as a fraction of the way along it.
    const t = Math.min(1, Math.max(0, toCentre.dot(sight) / length2))
    const dx = toCentre.x - sight.x * t
    const dy = toCentre.y - sight.y * t
    const dz = toCentre.z - sight.z * t
    if (t > 0 && t < 1 && dx * dx + dy * dy + dz * dz < radius * radius) return true
  }
  return false
}

const UP = new Vector3(0, 1, 0)
const turnedEye = new Vector3()
const turnedStar = new Vector3()

/**
 * The share of a constellation's `stars` that a far cloud stands in front of,
 * seen from `eye`. The far clouds have turned `turn` radians about the world's
 * up since they were laid out, so the eye and the stars are turned back by as
 * much into the clouds' own frame. Neither argument is changed.
 */
export function cloudedShare(stars: Vector3[], eye: Vector3, turn: number, clouds: ReadonlyArray<{ centre: Vector3; radius: number }>): number {
  if (stars.length === 0) return 0
  turnedEye.copy(eye).applyAxisAngle(UP, -turn)
  let hidden = 0
  for (const s of stars) if (sightBlocked(turnedEye, turnedStar.copy(s).applyAxisAngle(UP, -turn), clouds)) hidden++
  return hidden / stars.length
}

/** Where a place's label is pinned: straight up from its ground, a little above the top of its landmark. */
export function placeAnchor(place: Place, districts: District[]): Vector3 {
  const ground = groundOf(place.at, districts)
  return ground.addScaledVector(dirOf(place.at), (place.height + ANCHOR_CLEARANCE) * MODEL_SCALE)
}

/** Where a district's label is pinned: over the middle of its island. */
export function districtAnchor(district: District): Vector3 {
  return dirOf(district.center).multiplyScalar(DISTRICT_ANCHOR_RADIUS)
}
