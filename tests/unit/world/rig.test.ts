import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { overviewDistance, type Pose } from '@/lib/world/camera'
import { dirOf } from '@/lib/world/geo'
import { heightAt } from '@/lib/world/terrain'
import {
  AUTO_ROTATE_IDLE,
  CLICK_SLOP,
  POLAR_LIMIT,
  RIG_START,
  districtGoal,
  homeGoal,
  isClick,
  placeGoal,
  rigAutoRotates,
  rigPose,
  rigReduce,
  retargetFlight,
  type RigState,
} from '@/lib/world/rig'
import { districts, placeById } from '@/content/world'

const start: RigState = RIG_START
/** The overview the canvas opens on. */
const a: Pose = homeGoal(dirOf({ lat: 8, lon: -6 }), overviewDistance(16 / 9))
const b: Pose = placeGoal(placeById('beacon')!, districts)
const c: Pose = placeGoal(placeById('aura')!, districts)

/** Ticks a state forward `seconds` in frames of `dt`. */
function run(s: RigState, seconds: number, dt = 0.1): RigState {
  for (let t = 0; t < seconds - 1e-9; t += dt) s = rigReduce(s, { type: 'tick', dt })
  return s
}

describe('rigReduce', () => {
  it('starts in orbit, looking at nothing, with the controls holding the camera', () => {
    expect(start.mode).toBe('orbit')
    expect(start.target).toBeNull()
    expect(start.flight).toBeNull()
    expect(rigPose(start)).toBeNull()
  })

  it('flies when the route changes and lands in focus on that place', () => {
    let s = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 2 })
    expect(s.mode).toBe('fly')
    // 2.1 seconds of frames. (One 2.1 s frame would be clamped: see the last test.)
    s = run(s, 2.1)
    expect(s.mode).toBe('focus')
    expect(s.target).toBe('beacon')
    expect(rigPose(s)!.position.distanceTo(b.position)).toBeCloseTo(0)
  })

  it('starts the flight from the pose it is given and passes through the middle', () => {
    let s = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 2 })
    expect(rigPose(s)!.position.distanceTo(a.position)).toBeCloseTo(0)
    s = run(s, 1)
    const mid = rigPose(s)!.position
    expect(mid.distanceTo(a.position)).toBeGreaterThan(0.1)
    expect(mid.distanceTo(b.position)).toBeGreaterThan(0.1)
  })

  it('follows the latest route when clicked again mid-flight', () => {
    let s = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 2 })
    s = rigReduce(s, { type: 'tick', dt: 0.5 })
    const mid = rigPose(s)!
    s = rigReduce(s, { type: 'route', placeId: 'aura', current: { ...mid, up: a.up }, goal: c, seconds: 2 })
    // The new flight leaves from where the camera was, not from where the old one began.
    expect(s.mode).toBe('fly')
    expect(rigPose(s)!.position.distanceTo(mid.position)).toBeCloseTo(0)
    for (let i = 0; i < 40; i++) s = rigReduce(s, { type: 'tick', dt: 0.1 })
    expect(s.mode).toBe('focus')
    expect(s.target).toBe('aura')
    expect(rigPose(s)!.position.distanceTo(c.position)).toBeCloseTo(0)
  })

  it('returns to orbit when the route goes home', () => {
    let s = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 0 })
    expect(s.mode).toBe('focus')
    s = rigReduce(s, { type: 'route', placeId: null, current: b, goal: a, seconds: 1.5 })
    expect(s.mode).toBe('fly')
    expect(s.target).toBeNull()
    s = run(s, 1.4)
    expect(s.mode).toBe('fly')
    s = run(s, 0.2)
    expect(s.mode).toBe('orbit')
    expect(s.target).toBeNull()
    expect(s.flight).toBeNull()
    expect(rigPose(s)).toBeNull()
  })

  it('flies to an island and stays in orbit there', () => {
    const goal = districtGoal(districts.find((d) => d.id === 'frenzy')!)
    let s = rigReduce(start, { type: 'route', placeId: null, current: a, goal, seconds: 1.5 })
    expect(s.mode).toBe('fly')
    // The last pose of the flight is the island's, so the controls take over from exactly there.
    s = run(s, 1.4)
    const last = rigPose(s)!
    s = run(s, 0.2)
    expect(s.mode).toBe('orbit')
    expect(s.target).toBeNull()
    expect(last.position.distanceTo(goal.position)).toBeLessThan(0.02)
  })

  it('cuts instantly when the flight has no duration', () => {
    const s = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 0 })
    expect(s.mode).toBe('focus')
    expect(s.target).toBe('beacon')
    expect(rigPose(s)!.position.distanceTo(b.position)).toBeCloseTo(0)
    const home = rigReduce(s, { type: 'route', placeId: null, current: b, goal: a, seconds: 0 })
    expect(home.mode).toBe('orbit')
    expect(home.flight).toBeNull()
  })

  it('circles the place on drag only while in focus', () => {
    const focused = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 0 })
    const dragged = rigReduce(focused, { type: 'drag', dx: 100 })
    expect(dragged.azimuth).not.toBeCloseTo(focused.azimuth)
    // Dragging right walks the camera round to the left, as in the look test.
    expect(dragged.azimuth).toBeCloseTo(focused.azimuth - 0.6)

    // It walks round the place: same height above it, same distance from its axis, a different spot.
    const up = b.up
    const before = rigPose(focused)!.position
    const after = rigPose(dragged)!.position
    expect(after.distanceTo(before)).toBeGreaterThan(0.1)
    expect(after.dot(up)).toBeCloseTo(before.dot(up))
    const offAxis = (p: Vector3) => p.clone().addScaledVector(up, -p.dot(up)).length()
    expect(offAxis(after)).toBeCloseTo(offAxis(before))

    expect(rigReduce(start, { type: 'drag', dx: 100 })).toEqual(start)
    const flying = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 2 })
    expect(rigReduce(flying, { type: 'drag', dx: 100 }).azimuth).toBe(flying.azimuth)
  })

  it('faces the place again on the next route', () => {
    let s = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 0 })
    s = rigReduce(s, { type: 'drag', dx: 100 })
    s = rigReduce(s, { type: 'route', placeId: 'aura', current: b, goal: c, seconds: 0 })
    expect(s.azimuth).toBe(0)
    expect(rigPose(s)!.position.distanceTo(c.position)).toBeCloseTo(0)
  })

  it('clamps a long frame so a background tab does not teleport the camera', () => {
    const flying = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 2 })
    const long = rigReduce(flying, { type: 'tick', dt: 30 })
    const short = rigReduce(flying, { type: 'tick', dt: 0.1 })
    expect(long.flight!.elapsed).toBeCloseTo(0.1)
    expect(long).toEqual(short)
    // Nor does a long frame count as nine idle seconds.
    const touched = rigReduce(start, { type: 'touch' })
    expect(rigReduce(touched, { type: 'tick', dt: 30 }).idle).toBeCloseTo(0.1)
  })
})

describe('auto-rotation', () => {
  it('turns from the start, stops on touch and resumes after nine idle seconds', () => {
    expect(rigAutoRotates(start)).toBe(true)
    let s = rigReduce(start, { type: 'touch' })
    expect(rigAutoRotates(s)).toBe(false)
    s = run(s, AUTO_ROTATE_IDLE - 0.2)
    expect(rigAutoRotates(s)).toBe(false)
    s = run(s, 0.3)
    expect(rigAutoRotates(s)).toBe(true)
    expect(AUTO_ROTATE_IDLE).toBe(9)
  })

  it('never turns away from a place, and holds still a while after landing in orbit', () => {
    let s = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 1 })
    expect(rigAutoRotates(s)).toBe(false)
    s = run(s, 1.1)
    expect(s.mode).toBe('focus')
    s = run(s, 20)
    expect(rigAutoRotates(s)).toBe(false)
    s = rigReduce(s, { type: 'route', placeId: null, current: b, goal: a, seconds: 0 })
    expect(rigAutoRotates(s)).toBe(false)
    s = run(s, AUTO_ROTATE_IDLE + 0.1)
    expect(rigAutoRotates(s)).toBe(true)
  })
})

describe('goals', () => {
  it('stands over a place, above its ground, looking at it', () => {
    const place = placeById('beacon')!
    const dir = dirOf(place.at)
    const ground = 1 + heightAt(dir, districts)
    const forward = new Vector3(0, 0, -1).applyQuaternion(b.quaternion)
    expect(b.position.dot(dir)).toBeGreaterThan(ground + 0.2)
    // Looking down a little, across the ground, not straight down at it.
    expect(forward.dot(dir)).toBeLessThan(0)
    expect(forward.dot(dir)).toBeGreaterThan(-0.6)
    expect(b.up.distanceTo(dir)).toBeCloseTo(0)
  })

  it('turns an island towards the camera from a little south of its centre', () => {
    const frenzy = districts.find((d) => d.id === 'frenzy')!
    const goal = districtGoal(frenzy)
    expect(goal.position.length()).toBeCloseTo(2.75)
    const expected = dirOf({ lat: frenzy.center.lat - 9, lon: frenzy.center.lon })
    expect(goal.position.clone().normalize().distanceTo(expected)).toBeCloseTo(0)
  })

  it('pulls straight back out from where the camera is, at the overview distance', () => {
    const from = b.position
    const goal = homeGoal(from, 4.5)
    expect(goal.position.length()).toBeCloseTo(4.5)
    expect(goal.position.clone().normalize().distanceTo(from.clone().normalize())).toBeCloseTo(0)
  })

  it('keeps home inside the controls’ polar limits so they take over without a jump', () => {
    const limit = Math.cos(POLAR_LIMIT)
    for (const dir of [new Vector3(0, 1, 0), new Vector3(0.1, 1, 0.1), new Vector3(0.2, -1, 0), dirOf({ lat: 80, lon: 30 })]) {
      const p = homeGoal(dir, 5).position
      expect(p.length()).toBeCloseTo(5)
      expect(Math.abs(p.y / p.length())).toBeLessThanOrEqual(limit + 1e-9)
    }
    expect(POLAR_LIMIT).toBeCloseTo(0.15 * Math.PI)
  })
})

describe('clicks', () => {
  it('a pointer that moved more than six pixels is a drag, not a click', () => {
    expect(CLICK_SLOP).toBe(6)
    expect(isClick(0)).toBe(true)
    expect(isClick(5.9)).toBe(true)
    expect(isClick(6)).toBe(true)
    expect(isClick(6.1)).toBe(false)
    expect(isClick(7)).toBe(false)
    expect(isClick(40)).toBe(false)
  })
})

describe('retargetFlight', () => {
  it('moves the end of a flight under way to a new distance, in the same direction and facing', () => {
    const home = homeGoal(b.position, 4.5)
    const s = run(rigReduce(start, { type: 'route', placeId: null, current: b, goal: home, seconds: 1.5 }), 0.5)
    const r = retargetFlight(s, 6)
    expect(r.flight!.to.position.length()).toBeCloseTo(6)
    expect(r.flight!.to.position.clone().normalize().distanceTo(home.position.clone().normalize())).toBeCloseTo(0)
    expect(r.flight!.to.quaternion.angleTo(home.quaternion)).toBeCloseTo(0)
    // The flight keeps its start, its progress and its length.
    expect(r.flight!.from).toBe(s.flight!.from)
    expect(r.flight!.elapsed).toBe(s.flight!.elapsed)
    expect(r.flight!.seconds).toBe(s.flight!.seconds)
    // The state it was given is left as it was.
    expect(s.flight!.to.position.length()).toBeCloseTo(4.5)
    // The last moment of the flight is at the new distance.
    const last = run(r, 0.9)
    expect(last.mode).toBe('fly')
    expect(rigPose(rigReduce(last, { type: 'tick', dt: 0.0999 }))!.position.length()).toBeCloseTo(6, 2)
  })

  it('leaves the rig alone when it is not flying', () => {
    expect(retargetFlight(start, 6)).toBe(start)
    const focused = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 0 })
    expect(retargetFlight(focused, 6)).toBe(focused)
  })
})
