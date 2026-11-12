import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { MODEL_SCALE } from '@/lib/world/camera'
import { dirOf } from '@/lib/world/geo'
import { constellations } from '@/content/sky'
import {
  DISTRICT_RISES,
  EDGE_PIN_GAP,
  EDGE_PIN_MARGIN,
  HUD_FADE_BAND,
  HUD_FADE_DISTANCE,
  LANDMARK_TOLERANCE,
  NEARBY,
  TAG_GEOMETRY,
  cloudedShare,
  constellationLabelId,
  coversInForce,
  districtAnchor,
  districtLabelId,
  edgePin,
  hudGivesWay,
  isOccluded,
  labelId,
  labelTier,
  labelsLandmark,
  landmarkBox,
  landmarkBoxes,
  landmarkTop,
  layoutTags,
  nearestPlaces,
  openBand,
  placeAnchor,
  placeTag,
  sightBlocked,
  spreadEdgePins,
  tagOverLandmark,
  type LabelForm,
  type ScreenRect,
  type TagContext,
  type TagItem,
} from '@/lib/world/labels'
import { groundOf } from '@/lib/world/terrain'
import { districts, places } from '@/content/world'

describe('occlusion', () => {
  it('hides labels behind the planet and shows those in front', () => {
    const cam = new Vector3(4.5, 0, 0)
    expect(isOccluded(cam, new Vector3(1.1, 0, 0))).toBe(false)
    expect(isOccluded(cam, new Vector3(-1.1, 0, 0))).toBe(true)
    expect(isOccluded(cam, new Vector3(0, 1.1, 0))).toBe(false)
  })

  it('takes the planet’s radius as given', () => {
    const cam = new Vector3(4.5, 0, 0)
    // The sight line to (0, 1.1, 0) passes about 1.07 from the centre.
    expect(isOccluded(cam, new Vector3(0, 1.1, 0), 1.0)).toBe(false)
    expect(isOccluded(cam, new Vector3(0, 1.1, 0), 1.1)).toBe(true)
  })

  it('leaves its arguments alone', () => {
    const cam = new Vector3(4.5, 0, 0)
    const anchor = new Vector3(-1.1, 0, 0)
    isOccluded(cam, anchor)
    expect(cam.toArray()).toEqual([4.5, 0, 0])
    expect(anchor.toArray()).toEqual([-1.1, 0, 0])
  })
})

describe('label tiers', () => {
  it('shows districts from afar and places up close', () => {
    expect(labelTier(4.5, false)).toBe('district')
    expect(labelTier(3.0, false)).toBe('place')
    expect(labelTier(4.5, true)).toBe('place')
  })

  it('switches at 3.25', () => {
    expect(labelTier(3.25, false)).toBe('district')
    expect(labelTier(3.249, false)).toBe('place')
  })
})

describe('the HUD giving way', () => {
  it('fades the headline, greeting and legend once the camera is closer than the place tier', () => {
    expect(HUD_FADE_DISTANCE).toBe(3.25)
    expect(hudGivesWay(3.249)).toBe(true)
    expect(hudGivesWay(3.25)).toBe(false)
    // An island turned to the visitor, and a place, are closer still.
    expect(hudGivesWay(2.75)).toBe(true)
    expect(hudGivesWay(1.3)).toBe(true)
    // The overview, at any shape of window.
    expect(hudGivesWay(4.5)).toBe(false)
    expect(hudGivesWay(NaN)).toBe(false)
  })

  it('does not flicker for a camera resting at the threshold: once faded, it comes back only past a small band', () => {
    expect(HUD_FADE_BAND).toBeGreaterThan(0)
    expect(HUD_FADE_BAND).toBeLessThanOrEqual(0.2)
    // Faded, the camera drifts just past 3.25: still faded.
    expect(hudGivesWay(3.26, true)).toBe(true)
    expect(hudGivesWay(HUD_FADE_DISTANCE + HUD_FADE_BAND - 0.001, true)).toBe(true)
    expect(hudGivesWay(HUD_FADE_DISTANCE + HUD_FADE_BAND + 0.001, true)).toBe(false)
    // Not faded, it needs to come inside 3.25 to fade.
    expect(hudGivesWay(3.26, false)).toBe(false)
    expect(hudGivesWay(3.24, false)).toBe(true)
    expect(hudGivesWay(NaN, true)).toBe(false)
  })

  it('treats a faded part of the page as covering the map only while focus is inside it', () => {
    const legend = { left: 40, top: 800, right: 400, bottom: 880 }
    const name = { left: 40, top: 30, right: 400, bottom: 80 }
    const covers = [
      { rect: name, givesWay: false, holdsFocus: false },
      { rect: legend, givesWay: true, holdsFocus: false },
    ]
    expect(coversInForce(covers, false)).toEqual([name, legend])
    expect(coversInForce(covers, true)).toEqual([name])
    expect(coversInForce([covers[0]!, { ...covers[1]!, holdsFocus: true }], true)).toEqual([name, legend])
  })
})

describe('anchors', () => {
  it('anchors a label above its landmark', () => {
    for (const p of places) expect(placeAnchor(p, districts).length(), p.id).toBeGreaterThan(1 + p.height * MODEL_SCALE)
  })

  it('anchors it straight up from the ground under the place, just above its top', () => {
    for (const p of places) {
      const anchor = placeAnchor(p, districts)
      const ground = groundOf(p.at, districts)
      expect(anchor.clone().normalize().angleTo(dirOf(p.at)), p.id).toBeLessThan(1e-6)
      const above = anchor.length() - ground.length()
      expect(above, p.id).toBeGreaterThan(p.height * MODEL_SCALE)
      expect(above, p.id).toBeLessThan((p.height + 0.5) * MODEL_SCALE)
    }
  })

  it('anchors a district label above its centre', () => {
    for (const d of districts) {
      const anchor = districtAnchor(d)
      expect(anchor.clone().normalize().angleTo(dirOf(d.center)), d.id).toBeLessThan(1e-6)
      expect(anchor.length(), d.id).toBeCloseTo(1.1)
    }
  })
})

const view = { width: 1440, height: 900 }
const tag = { width: 180, height: 40 }
const inside = (r: ScreenRect, v = view) => r.left >= 0 && r.top >= 0 && r.right <= v.width && r.bottom <= v.height
const meets = (a: ScreenRect, b: ScreenRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

describe('tag placement', () => {
  it('sits above and to the right of its pin where there is room, as the stylesheet draws it', () => {
    const p = placeTag({ x: 600, y: 500 }, tag, 'place', view, [])
    expect(p).toMatchObject({ flipX: false, flipY: false, shift: 0 })
    expect(p.rect).toEqual({ left: 600 - TAG_GEOMETRY.side, right: 600 - TAG_GEOMETRY.side + 180, bottom: 500 - TAG_GEOMETRY.rise.place, top: 500 - TAG_GEOMETRY.rise.place - 40 })
    // A district's tag stands higher on its longer stem.
    expect(placeTag({ x: 600, y: 500 }, tag, 'district', view, []).rect.bottom).toBe(500 - TAG_GEOMETRY.rise.district)
  })

  it('flips to the left of its pin at the right edge', () => {
    const p = placeTag({ x: 1400, y: 500 }, tag, 'place', view, [])
    expect(p.flipX).toBe(true)
    expect(p.flipY).toBe(false)
    expect(inside(p.rect)).toBe(true)
    expect(p.rect.right).toBe(1400 + TAG_GEOMETRY.side)
  })

  it('stays to the right at the left edge, where it already fits', () => {
    const p = placeTag({ x: 12, y: 500 }, tag, 'place', view, [])
    expect(p).toMatchObject({ flipX: false, flipY: false, shift: 0 })
    expect(inside(p.rect)).toBe(true)
  })

  it('drops below its pin at the top edge', () => {
    const p = placeTag({ x: 600, y: 40 }, tag, 'place', view, [])
    expect(p.flipY).toBe(true)
    expect(p.rect.top).toBe(40 + TAG_GEOMETRY.rise.place)
    expect(inside(p.rect)).toBe(true)
  })

  it('stays above at the bottom edge, where it already fits', () => {
    const p = placeTag({ x: 600, y: 890 }, tag, 'place', view, [])
    expect(p.flipY).toBe(false)
    expect(inside(p.rect)).toBe(true)
  })

  it('turns down and in at a top corner', () => {
    const p = placeTag({ x: 1430, y: 30 }, tag, 'place', view, [])
    expect(p).toMatchObject({ flipX: true, flipY: true })
    expect(inside(p.rect)).toBe(true)
  })

  it('keeps out of the header and the tour bar', () => {
    const header = { left: 40, top: 36, right: 480, bottom: 200 }
    const tourBar = { left: 520, top: 820, right: 920, bottom: 880 }
    // Above-right of this pin would run into the header; it goes below instead.
    const p = placeTag({ x: 300, y: 230 }, tag, 'place', view, [header, tourBar])
    expect(meets(p.rect, header)).toBe(false)
    expect(inside(p.rect)).toBe(true)
    // A pin just above the tour bar keeps its tag above, clear of it.
    const q = placeTag({ x: 600, y: 812 }, tag, 'place', view, [header, tourBar])
    expect(meets(q.rect, tourBar)).toBe(false)
  })

  it('steers clear of a tag already placed before anything else in the way', () => {
    // Near the bottom of the screen, so below is no choice. Above-right runs over a landmark, above-left into a nearer
    // tag: it takes the landmark rather than the tag.
    const landmarkAbove = { left: 600, top: 800, right: 700, bottom: 850 }
    const tagToTheLeft = { left: 380, top: 800, right: 605, bottom: 850 }
    const p = placeTag({ x: 610, y: 880 }, tag, 'district', view, [landmarkAbove], [tagToTheLeft])
    expect(meets(p.rect, tagToTheLeft)).toBe(false)
    expect(p.flipX).toBe(false)
    // With no tag placed there yet, it would rather go left than over the landmark.
    expect(placeTag({ x: 610, y: 880 }, tag, 'district', view, [landmarkAbove]).flipX).toBe(true)
  })

  it('shifts a tag too wide for either side to fit the screen, still over its pin', () => {
    const phone = { width: 412, height: 915 }
    const wide = { width: 300, height: 52 }
    const p = placeTag({ x: 230, y: 500 }, wide, 'district', phone, [])
    expect(inside(p.rect, phone)).toBe(true)
    expect(p.shift).not.toBe(0)
    expect(p.rect.left).toBeLessThanOrEqual(230)
    expect(p.rect.right).toBeGreaterThanOrEqual(230)
  })

  it('does the best it can when nothing fits, and never returns a number that is not one', () => {
    const tiny = { width: 100, height: 60 }
    const p = placeTag({ x: 50, y: 30 }, tag, 'place', tiny, [])
    for (const n of [p.shift, p.rect.left, p.rect.top, p.rect.right, p.rect.bottom]) expect(Number.isFinite(n)).toBe(true)
    expect(placeTag({ x: NaN, y: 30 }, tag, 'place', view, []).shift).toBe(0)
  })
})

describe('landmarks on the screen', () => {
  it('sees a landmark as a box as wide as it stands, from its ground to its top', () => {
    expect(landmarkBox({ x: 100, y: 200 }, { x: 100, y: 150 })).toEqual({ left: 75, right: 125, top: 150, bottom: 200 })
    // Seen from right overhead, it is still a few pixels across.
    const flat = landmarkBox({ x: 100, y: 200 }, { x: 100, y: 200 })
    expect(flat.right - flat.left).toBe(8)
    expect(flat.bottom - flat.top).toBe(8)
    for (const p of places) {
      const top = landmarkTop(p, districts)
      expect(top.length() - groundOf(p.at, districts).length(), p.id).toBeCloseTo(p.height * MODEL_SCALE, 6)
    }
  })

  it('boxes only the landmarks on the near side and in front of the camera', () => {
    const anchors = [
      { top: new Vector3(1.1, 0, 0), ground: new Vector3(1, 0, 0) },
      { top: new Vector3(-1.1, 0, 0), ground: new Vector3(-1, 0, 0) },
    ]
    const eye = new Vector3(4, 0, 0)
    // A plain projection looking down -X: screen x from z, screen y from y.
    const project = (v: Vector3) => ({ x: 500 + v.z * 100, y: 400 - v.y * 100, behind: v.x > eye.x })
    const boxes = landmarkBoxes(anchors, eye, project)
    expect(boxes).toHaveLength(1)
    expect(boxes[0]!.left).toBeLessThan(500)
    expect(boxes[0]!.right).toBeGreaterThan(500)
  })

  it('counts a tag as over a landmark when the boxes overlap by more than a few pixels', () => {
    const landmark = { left: 100, top: 100, right: 140, bottom: 160 }
    expect(LANDMARK_TOLERANCE).toBeGreaterThan(0)
    expect(LANDMARK_TOLERANCE).toBeLessThanOrEqual(6)
    expect(tagOverLandmark({ left: 130, top: 90, right: 300, bottom: 120 }, [landmark])).toBe(true)
    // Brushing the box's edge within the tolerance is not over it.
    expect(tagOverLandmark({ left: 140 - LANDMARK_TOLERANCE + 1, top: 90, right: 300, bottom: 120 }, [landmark])).toBe(false)
    expect(tagOverLandmark({ left: 300, top: 300, right: 400, bottom: 340 }, [landmark])).toBe(false)
    expect(tagOverLandmark(landmark, [])).toBe(false)
  })
})

/** Where a laid-out item's tag stands on the screen, as the stylesheet draws it. */
function tagRect(i: TagItem): ScreenRect {
  const left = (i.flipX ? i.at.x + TAG_GEOMETRY.side - i.size.width : i.at.x - TAG_GEOMETRY.side) + i.shift
  const top = i.flipY ? i.at.y + i.rise : i.at.y - i.rise - i.size.height
  return { left, top, right: left + i.size.width, bottom: top + i.size.height }
}
const overlapsRect = (a: ScreenRect, b: ScreenRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/** A label as `layoutTags` takes it, with the placement it fills in left at rest. */
function item(id: string, form: LabelForm, x: number, y: number, extra: Partial<TagItem> = {}): TagItem {
  return { id, form, on: true, at: { x, y }, held: false, size: { width: 160, height: 40 }, shift: 0, rise: 30, flipX: false, flipY: false, tagless: false, ...extra }
}
const context = (extra: Partial<TagContext> = {}): TagContext => ({
  view: { width: 1440, height: 900 },
  covers: [],
  landmarks: [],
  focus: { x: 720, y: 450 },
  ...extra,
})

describe('laying out the tags', () => {
  // Pins at the foot of the screen, where a tag cannot drop below: two close together cannot both keep a tag.
  const FOOT = 880

  it('lets the tag nearer the middle of the view keep its place; the other shows only its pin', () => {
    const near = item('near', 'place', 700, FOOT)
    const far = item('far', 'place', 760, FOOT)
    layoutTags([far, near], context({ focus: { x: 720, y: FOOT } }))
    expect(near.tagless).toBe(false)
    expect(far.tagless).toBe(true)
  })

  it('moves a tag to a free side rather than giving way, where there is one', () => {
    const near = item('near', 'place', 700, 500)
    const far = item('far', 'place', 760, 500)
    layoutTags([far, near], context())
    expect(near.tagless).toBe(false)
    expect(far.tagless).toBe(false)
    expect(far.flipX || far.flipY).toBe(true)
  })

  it('puts a hovered, focused or opened tag first, whatever its distance', () => {
    const near = item('near', 'place', 760, FOOT)
    const held = item('held', 'place', 700, FOOT, { held: true })
    layoutTags([near, held], context({ focus: { x: 780, y: FOOT } }))
    expect(held.tagless).toBe(false)
    expect(near.tagless).toBe(true)
  })

  it('places a dot’s tag only while it is held, and never lets a dot or a neighbour’s pin claim room', () => {
    const dot = item('dot', 'dot', 700, 500)
    layoutTags([dot], context({ view: { width: 1440, height: 900 } }))
    expect(dot).toMatchObject({ shift: 0, flipX: false, flipY: false, tagless: false })
    // A held dot at the right edge is placed (flipped in) ...
    const heldDot = item('dot', 'dot', 1430, 500, { held: true })
    const nearby = item('nb', 'nearby', 700, 500)
    const place = item('place', 'place', 705, 505)
    layoutTags([heldDot, nearby, place], context())
    expect(heldDot.flipX).toBe(true)
    // ... and neither it nor the neighbour's pin hides the place's tag.
    expect(place.tagless).toBe(false)
    expect(nearby.tagless).toBe(false)
  })

  it('does not let a tag that gave way take room from the next', () => {
    // b, between a and c, gives way to a; its tag would have run over c's.
    const a = item('a', 'place', 500, FOOT)
    const b = item('b', 'place', 600, FOOT)
    const c = item('c', 'place', 700, FOOT)
    layoutTags([a, b, c], context({ focus: { x: 400, y: FOOT } }))
    expect(a.tagless).toBe(false)
    expect(b.tagless).toBe(true)
    expect(b.flipX).toBe(false)
    // c keeps its tag, in its usual place.
    expect(c.tagless).toBe(false)
    expect(c.flipX).toBe(false)
  })

  it('keeps a neighbouring place’s tag off the landmark the visitor has come to see (item 11)', () => {
    // At a place: the focused landmark stands just right of a neighbour's pin, where its tag would run.
    const focused = { left: 760, top: 380, right: 1000, bottom: 640 }
    const neighbour = item('budget', 'place', 700, 520)
    layoutTags([neighbour], context({ focused }))
    // It turns to a free side and stays clear of the landmark.
    expect(neighbour.tagless).toBe(false)
    expect(overlapsRect(tagRect(neighbour), focused)).toBe(false)
    // Hemmed in by the landmark on every side it could take, it shows only its pin.
    const around = { left: 400, top: 300, right: 1000, bottom: 700 }
    const hemmed = item('hemmed', 'place', 700, 520)
    layoutTags([hemmed], context({ focused: around }))
    expect(hemmed.tagless).toBe(true)
    // Unless the visitor holds it: then it shows wherever it must.
    const held = item('held', 'place', 700, 520, { held: true })
    layoutTags([held], context({ focused: around }))
    expect(held.tagless).toBe(false)
    // Away from a place there is no focused landmark, and nothing changes.
    const free = item('free', 'place', 700, 520)
    layoutTags([free], context())
    expect(free).toMatchObject({ tagless: false, flipX: false, flipY: false })
  })

  it('keeps a neighbour’s tag off the focused landmark on a phone too, where neighbours show as pins', () => {
    const focused = { left: 760, top: 380, right: 1000, bottom: 640 }
    const neighbour = item('nb', 'nearby', 700, 520)
    layoutTags([neighbour], context({ focused }))
    expect(neighbour.tagless).toBe(false)
    expect(overlapsRect(tagRect(neighbour), focused)).toBe(false)
    // Hemmed in, it shows only its pin; held (tapped), it shows its tag.
    const around = { left: 400, top: 300, right: 1000, bottom: 700 }
    const hemmed = item('hemmed', 'nearby', 700, 520)
    layoutTags([hemmed], context({ focused: around }))
    expect(hemmed.tagless).toBe(true)
    const held = item('held', 'nearby', 700, 520, { held: true })
    layoutTags([held], context({ focused: around }))
    expect(held.tagless).toBe(false)
  })

  it('keeps every tag out of what covers the map, and a district’s also off the landmarks and the place pins', () => {
    const header = { left: 0, top: 0, right: 1440, bottom: 200 }
    const p = item('p', 'place', 700, 240)
    layoutTags([p], context({ covers: [header] }))
    expect(p.flipY).toBe(true)
    // A district whose tag would sit on a landmark above-right turns away from it.
    const landmark = { left: 690, top: 420, right: 760, bottom: 470 }
    const d = item('d', 'district', 700, 500)
    layoutTags([d], context({ landmarks: [landmark] }))
    expect(d.tagless).toBe(false)
    expect(d.flipX || d.flipY).toBe(true)
  })

  it('lets a district’s tag rise further from its pin, past landmarks to either side, where its leader line runs clear', () => {
    // Landmarks just above the pin to the left and to the right, with a gap over the pin itself for the line; below is off the screen.
    const left = { left: 520, top: 420, right: 690, bottom: 475 }
    const right = { left: 710, top: 420, right: 880, bottom: 475 }
    const d = item('d', 'district', 700, 880, { size: { width: 160, height: 40 } })
    layoutTags([d], context({ landmarks: [{ ...left, top: 800, bottom: 855 }, { ...right, top: 800, bottom: 855 }], focus: { x: 700, y: 100 } }))
    expect(d.tagless).toBe(false)
    expect(d.rise).toBeGreaterThan(DISTRICT_RISES[0])
    expect(DISTRICT_RISES[0]).toBe(TAG_GEOMETRY.rise.district)
    // A place's tag keeps its usual leader line.
    const p = item('p', 'place', 300, 300)
    layoutTags([p], context())
    expect(p.rise).toBe(TAG_GEOMETRY.rise.place)
  })

  it('counts a long leader line as part of the tag: one that would cross a landmark or a pin is not taken', () => {
    // Above the pin, a landmark across the whole width the short tag would use; below, the screen's foot.
    const across = { left: 400, top: 815, right: 1000, bottom: 860 }
    const d = item('d', 'district', 700, 880, { size: { width: 160, height: 40 } })
    layoutTags([d], context({ landmarks: [across], focus: { x: 700, y: 100 } }))
    // Rising past the landmark would leave the tag clear but its line through the landmark: it collapses instead.
    expect(d.tagless).toBe(true)
    // So does one whose line would run through another place's pin.
    const d2 = item('d2', 'district', 700, 880, { size: { width: 160, height: 40 } })
    const wide = { left: 400, top: 825, right: 1000, bottom: 860 }
    const pin = item('pin', 'dot', 700, 812)
    layoutTags([d2, pin], context({ landmarks: [wide], focus: { x: 700, y: 100 } }))
    expect(d2.tagless).toBe(true)
  })

  it('lets the usual stretch of line stand where its pin stands: a landmark beside the pin does not collapse a tag that clears it', () => {
    // A landmark box hugging the pin, across the first 38px of the line; the tag above-right clears it.
    const beside = { left: 640, top: 468, right: 712, bottom: 496 }
    const d = item('d', 'district', 700, 500)
    layoutTags([d], context({ landmarks: [beside], focus: { x: 700, y: 100 } }))
    expect(d.tagless).toBe(false)
    expect(d.rise).toBe(TAG_GEOMETRY.rise.district)
  })

  it('keeps a district’s tag off another district’s pin', () => {
    // B is nearer the focus, so it is placed first; A's usual tag would stand on B's pin.
    const a = item('a', 'district', 700, 500)
    const b = item('b', 'district', 760, 455)
    layoutTags([a, b], context({ focus: { x: 760, y: 455 } }))
    const pinB = { left: 751, top: 446, right: 769, bottom: 464 }
    expect(a.tagless || !overlapsRect(tagRect(a), pinB)).toBe(true)
  })

  it('collapses a district tag that cannot keep off a landmark or a place pin to its pin, unless it is held (R33)', () => {
    // Landmarks on every side of the pin, further than any leader line reaches: there is nowhere to go.
    const around = [
      { left: 300, top: 200, right: 1100, bottom: 800 },
    ]
    const d = item('d', 'district', 700, 500)
    layoutTags([d], context({ landmarks: around }))
    expect(d.tagless).toBe(true)
    const held = item('d', 'district', 700, 500, { held: true })
    layoutTags([held], context({ landmarks: around }))
    expect(held.tagless).toBe(false)
    // Places' pins wherever the tag could go collapse it the same way.
    const pins = Array.from({ length: 15 * 14 }, (_, i) => item(`p${i}`, 'dot', 400 + (i % 15) * 44, 300 + Math.floor(i / 15) * 30))
    const d2 = item('d2', 'district', 700, 500)
    layoutTags([d2, ...pins], context())
    expect(d2.tagless).toBe(true)
  })

  it('counts the links that show: places, districts and neighbours, a dot only while held, never a constellation name', () => {
    const items = [
      item('a', 'place', 100, 300),
      item('b', 'district', 900, 300),
      item('c', 'nearby', 500, 600),
      item('d', 'dot', 300, 700),
      item('e', 'dot', 1200, 700, { held: true }),
      item('f', 'constellation', 700, 100),
      item('g', 'place', 400, 400, { on: false }),
    ]
    expect(layoutTags(items, context()).links).toBe(4)
    expect(layoutTags([item('f', 'constellation', 700, 100)], context()).links).toBe(0)
    expect(labelsLandmark(layoutTags([item('f', 'constellation', 700, 100)], context()).links)).toBeNull()
  })

  it('resets a label that is not shown', () => {
    const off = item('off', 'place', 700, 500, { on: false, shift: 12, flipX: true, flipY: true, tagless: true })
    layoutTags([off], context())
    expect(off).toMatchObject({ shift: 0, flipX: false, flipY: false, tagless: false })
  })

  it('gives the same answer whatever order the labels come in', () => {
    const make = () => [item('x', 'place', 700, 500), item('y', 'place', 740, 510), item('z', 'district', 300, 300)]
    const one = make()
    const two = make().reverse()
    layoutTags(one, context())
    layoutTags(two, context())
    const byId = (list: TagItem[]) => Object.fromEntries(list.map((i) => [i.id, [i.tagless, i.flipX, i.flipY, i.shift]]))
    expect(byId(one)).toEqual(byId(two))
  })
})

describe('the open view on a phone at a place', () => {
  const phone = { width: 412, height: 915 }
  const covers: ScreenRect[] = [
    { left: 14, top: 14, right: 398, bottom: 58 },
    { left: 14, top: 68, right: 140, bottom: 95 },
    { left: 160, top: 68, right: 398, bottom: 96 },
    { left: 14, top: 370, right: 398, bottom: 901 },
  ]

  it('is the band between what covers the top and what covers the bottom', () => {
    expect(openBand(phone, covers)).toEqual({ left: 0, top: 96, right: 412, bottom: 370 })
    expect(openBand(phone, [])).toEqual({ left: 0, top: 0, right: 412, bottom: 915 })
  })

  it('pins a neighbour in the band where it is, and one outside it to the band’s edge, toward it', () => {
    const band = openBand(phone, covers)
    expect(edgePin({ x: 200, y: 200 }, false, band)).toEqual({ x: 200, y: 200, edge: false })
    const left = edgePin({ x: -300, y: 233 }, false, band)
    expect(left.edge).toBe(true)
    expect(left.x).toBe(band.left + EDGE_PIN_MARGIN)
    expect(left.y).toBeCloseTo(233)
    const below = edgePin({ x: 206, y: 700 }, false, band)
    expect(below.y).toBe(band.bottom - EDGE_PIN_MARGIN)
    // Behind the camera, a projection comes out mirrored: the pin goes to the opposite side.
    const behind = edgePin({ x: 500, y: 233 }, true, band)
    expect(behind.edge).toBe(true)
    expect(behind.x).toBe(band.left + EDGE_PIN_MARGIN)
  })

  it('sends a neighbour over the horizon to the edge, never onto the planet’s face', () => {
    const band = openBand(phone, covers)
    const over = edgePin({ x: 230, y: 240 }, false, band, true)
    expect(over.edge).toBe(true)
    const onEdge =
      Math.abs(over.x - (band.left + EDGE_PIN_MARGIN)) < 1e-9 ||
      Math.abs(over.x - (band.right - EDGE_PIN_MARGIN)) < 1e-9 ||
      Math.abs(over.y - (band.top + EDGE_PIN_MARGIN)) < 1e-9 ||
      Math.abs(over.y - (band.bottom - EDGE_PIN_MARGIN)) < 1e-9
    expect(onEdge).toBe(true)
  })

  it('spreads pins that land on the same edge so they never stack', () => {
    const band = openBand(phone, covers)
    const x = band.left + EDGE_PIN_MARGIN
    const pins = [
      { x, y: 230, edge: true },
      { x, y: 236, edge: true },
      { x: 200, y: 200, edge: false },
    ]
    const spread = spreadEdgePins(pins, band)
    expect(Math.abs(spread[0]!.y - spread[1]!.y)).toBeGreaterThanOrEqual(EDGE_PIN_GAP)
    for (const p of spread.slice(0, 2)) {
      expect(p.x).toBe(x)
      expect(p.y).toBeGreaterThanOrEqual(band.top + EDGE_PIN_MARGIN)
      expect(p.y).toBeLessThanOrEqual(band.bottom - EDGE_PIN_MARGIN)
    }
    // A pin in the open is left where it is.
    expect(spread[2]).toEqual(pins[2])
    // Two at the bottom edge spread across.
    const y = band.bottom - EDGE_PIN_MARGIN
    const bottom = spreadEdgePins([{ x: 300, y, edge: true }, { x: 302, y, edge: true }], band)
    expect(Math.abs(bottom[0]!.x - bottom[1]!.x)).toBeGreaterThanOrEqual(EDGE_PIN_GAP)
    expect(EDGE_PIN_GAP).toBeGreaterThanOrEqual(44)
    // An edge pin's whole 44px tap target is on the screen.
    expect(EDGE_PIN_MARGIN).toBeGreaterThanOrEqual(22)
  })

  it('takes the nearest places, not the place itself', () => {
    const near = nearestPlaces('kingdoms-and-crowns', places, 2)
    expect(near.map((p) => p.id)).toEqual(['the-budget', 'ember-tattoo'])
    expect(nearestPlaces('nowhere', places, 3)).toEqual([])
    // Only neighbours: After Hours stands alone, so its castle has two, not three.
    expect(nearestPlaces('kingdoms-and-crowns', places, NEARBY.count, NEARBY.within).map((p) => p.id)).toEqual(['the-budget', 'ember-tattoo'])
    for (const p of places) expect(nearestPlaces(p.id, places, NEARBY.count, NEARBY.within).length, p.id).toBeGreaterThan(0)
  })
})

describe('constellation names and the far clouds', () => {
  it('is hidden when a cloud stands on the line of sight, and not otherwise', () => {
    const puffs = [{ centre: new Vector3(0, 0, 14), radius: 1.2 }]
    const eye = new Vector3(0, 0, 4)
    expect(sightBlocked(eye, new Vector3(0, 0, 40), puffs)).toBe(true)
    expect(sightBlocked(eye, new Vector3(0, 30, 30), puffs)).toBe(false)
    // A cloud behind the eye, or beyond the target, does not block.
    expect(sightBlocked(new Vector3(0, 0, 20), new Vector3(0, 0, 40), puffs)).toBe(false)
    expect(sightBlocked(eye, new Vector3(0, 0, 10), puffs)).toBe(false)
  })

  it('measures the share of a figure’s stars behind the clouds, with the clouds turned by their drift', () => {
    const puffs = [{ centre: new Vector3(0, 0, 14), radius: 1.2 }]
    const stars = [new Vector3(0, 0, 40), new Vector3(0, 30, 30)]
    const eye = new Vector3(0, 0, 4)
    expect(cloudedShare(stars, eye, 0, puffs)).toBe(0.5)
    // Turned half way round, the cloud is behind the eye and hides nothing.
    expect(cloudedShare(stars, eye, Math.PI, puffs)).toBe(0)
    expect(cloudedShare([], eye, 0, puffs)).toBe(0)
    // Its arguments are left as they were.
    expect(eye.toArray()).toEqual([0, 0, 4])
    expect(stars[0]!.toArray()).toEqual([0, 0, 40])
  })
})

describe('label ids', () => {
  it('gives each constellation its own id, apart from every place and district', () => {
    expect(constellationLabelId('The Natural 20')).toBe('label-const-the-natural-20')
    expect(constellationLabelId('Jimothy Major')).toBe('label-const-jimothy-major')
    const ids = [
      ...constellations.map((c) => constellationLabelId(c.name)),
      ...places.map((p) => labelId(p.id)),
      ...districts.map((d) => districtLabelId(d.id)),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })
})
