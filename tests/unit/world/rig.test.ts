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
  placeOrbit,
  rigArmed,
  rigAutoRotates,
  rigLeaves,
  rigPose,
  rigReduce,
  retargetFlight,
  sceneryObstacles,
  type RigState,
} from '@/lib/world/rig'
import { FOCUS_REACH, LEAVE, farDistance, nearDistance, orbitPose } from '@/lib/world/gestures'
import { districts, placeById, places } from '@/content/world'
import { SCATTER_SEEDS, sceneryLayout, scatterBlocks, scatterTrees } from '@/lib/world/scatter'

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

describe('looking at a place', () => {
  const beacon = placeById('beacon')!
  const orbit = placeOrbit(beacon, districts, places)
  /** At beacon, landed, with the orbit the canvas hands the rig. */
  const at = (): RigState => rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 0, orbit })
  const distanceOf = (s: RigState) => rigPose(s)!.position.distanceTo(orbit.centre)
  const elevationOf = (s: RigState) => {
    const offset = rigPose(s)!.position.sub(orbit.centre)
    return Math.asin(offset.dot(orbit.up) / offset.length())
  }

  it('lands on the pose the place has always had', () => {
    expect(rigPose(at())!.position.distanceTo(b.position)).toBeLessThan(1e-9)
    expect(at().elevation).toBeCloseTo(orbit.elevation, 12)
    expect(at().distance).toBeCloseTo(orbit.distance, 12)
  })

  it('tilts up as the drag goes down and down as it goes up, between its lowest and nearly overhead', () => {
    const up = rigReduce(at(), { type: 'drag', dx: 0, dy: 40 })
    expect(elevationOf(up)).toBeCloseTo(orbit.elevation + 40 * FOCUS_REACH.tilt, 9)
    const down = rigReduce(at(), { type: 'drag', dx: 0, dy: -10 })
    expect(elevationOf(down)).toBeLessThan(orbit.elevation)
    expect(elevationOf(rigReduce(at(), { type: 'drag', dx: 0, dy: 10000 }))).toBeCloseTo(FOCUS_REACH.high, 9)
    expect(elevationOf(rigReduce(at(), { type: 'drag', dx: 0, dy: -10000 }))).toBeCloseTo(orbit.lowest, 9)
    // Tilting leaves the distance and the swing as they were.
    expect(distanceOf(up)).toBeCloseTo(orbit.distance, 9)
    expect(up.azimuth).toBe(0)
  })

  it('zooms in and out between its nearest and its furthest, keeping its tilt', () => {
    const tilted = rigReduce(at(), { type: 'drag', dx: 0, dy: 60 })
    const inward = rigReduce(tilted, { type: 'zoom', scale: 0.8 })
    expect(distanceOf(inward)).toBeCloseTo(orbit.distance * 0.8, 9)
    expect(elevationOf(inward)).toBeCloseTo(elevationOf(tilted), 9)
    const closest = rigReduce(tilted, { type: 'zoom', scale: 0.001 })
    expect(distanceOf(closest)).toBeCloseTo(nearDistance(orbit, tilted.elevation), 9)
    const furthest = rigReduce(tilted, { type: 'zoom', scale: 1000 })
    expect(distanceOf(furthest)).toBeCloseTo(farDistance(orbit), 9)
    // Still at the place.
    expect(furthest.mode).toBe('focus')
    expect(furthest.target).toBe('beacon')
  })

  it('stays clear of the landmark when tilted down close in', () => {
    const close = rigReduce(rigReduce(at(), { type: 'drag', dx: 0, dy: 3000 }), { type: 'zoom', scale: 0.001 })
    const low = rigReduce(close, { type: 'drag', dx: 0, dy: -3000 })
    expect(low.distance).toBeCloseTo(nearDistance(orbit, low.elevation), 9)
    expect(low.distance).toBeGreaterThan(close.distance)
  })

  /**
   * A stream of zoom events `every` seconds apart, a frame ticking between each: `steps` of them, each scaling the
   * distance by `scale`. Stops early if the rig asks to leave. Returns the state and whether it asked.
   */
  function stream(s: RigState, steps: number, scale: number, every = 1 / 60, byKey = false) {
    for (let i = 0; i < steps; i++) {
      s = rigReduce(s, { type: 'zoom', scale, byKey })
      if (rigLeaves(s)) return { s, left: true }
      s = run(s, every, Math.min(every, 0.05))
    }
    return { s, left: false }
  }
  /** Fingers going from `from` to `to` pixels apart over `steps` moves at 60 a second. */
  const pinchOut = (s: RigState, from: number, to: number, steps = 30) => stream(s, steps, Math.pow(from / to, 1 / steps))

  it('stays at the place through one long pinch out, however far it goes', () => {
    // 2.5 times as far apart as they end: well past the furthest and the pull together.
    const { s, left } = pinchOut(at(), 300, 120)
    expect(left).toBe(false)
    expect(distanceOf(s)).toBeCloseTo(farDistance(orbit), 9)
    // Even five times over, in one go.
    expect(pinchOut(at(), 500, 100, 60).left).toBe(false)
  })

  it('stays through a trackpad flick and all of its slowing tail', () => {
    let s = at()
    // A flick: 1800px of scroll in events a frame apart, each smaller than the last.
    for (let i = 0, d = 120; i < 80 && d > 1; i++, d *= 0.93) {
      s = rigReduce(s, { type: 'zoom', scale: Math.exp(d * 0.0012) })
      expect(rigLeaves(s)).toBe(false)
      s = run(s, 1 / 60, 1 / 60)
    }
    expect(distanceOf(s)).toBeCloseTo(farDistance(orbit), 9)
  })

  it('never leaves by the keys, pressed or held down', () => {
    // Key repeat: thirty presses 1/30s apart, then more after a pause at the furthest.
    let { s, left } = stream(at(), 30, 1.18, 1 / 30, true)
    expect(left).toBe(false)
    s = run(s, LEAVE.rest + 0.2)
    expect(stream(s, 30, 1.18, 1 / 30, true).left).toBe(false)
  })

  it('leaves on a new gesture begun once the camera rests at the furthest', () => {
    let { s } = pinchOut(at(), 300, 100)
    expect(rigArmed(s)).toBe(false)
    // A pause there: now a pinch out means leave.
    s = run(s, LEAVE.rest + 0.05)
    expect(rigArmed(s)).toBe(true)
    const second = pinchOut(s, 300, 150)
    expect(second.left).toBe(true)
  })

  it('needs several events of a gesture to leave, so a single large one cannot', () => {
    let { s } = pinchOut(at(), 300, 100)
    s = run(s, LEAVE.rest + 0.05)
    const once = rigReduce(s, { type: 'zoom', scale: 50 })
    expect(rigLeaves(once)).toBe(false)
    expect(once.pull).toBeCloseTo(LEAVE.step, 12)
    const events = Math.ceil(LEAVE.pull / LEAVE.step)
    expect(stream(s, events - 1, 50).left).toBe(false)
    expect(stream(s, events, 50).left).toBe(true)
  })

  it('forgets a pull after a pause, and stops meaning to leave when the visitor zooms back in', () => {
    let { s } = pinchOut(at(), 300, 100)
    s = run(s, LEAVE.rest + 0.05)
    // Most of the way, then a pause: the pull is let go (it still rests at the furthest, so a fresh gesture may leave).
    let partial = stream(s, Math.ceil(LEAVE.pull / LEAVE.step) - 1, 50).s
    expect(partial.pull).toBeGreaterThan(0)
    partial = run(partial, LEAVE.rest + 0.05)
    expect(partial.pull).toBe(0)
    // Back in a little: no longer at the furthest, so not armed, and a pinch out from there does not leave.
    const back = rigReduce(s, { type: 'zoom', scale: 0.98 })
    expect(rigArmed(back)).toBe(false)
    expect(pinchOut(back, 300, 100).left).toBe(false)
  })

  it('does not arm while the visitor is zooming out to the furthest, only once they have stopped there', () => {
    // A slow pinch, an event every fifth of a second: never a pause as long as the rest.
    const { s, left } = stream(at(), 30, 1.05, 0.2)
    expect(left).toBe(false)
    expect(rigArmed(s)).toBe(false)
  })

  it('goes back to the view it landed on: at once, or eased', () => {
    const moved = rigReduce(rigReduce(rigReduce(at(), { type: 'drag', dx: 300, dy: 80 }), { type: 'zoom', scale: 0.5 }), { type: 'drag', dx: 900, dy: 0 })
    const instant = rigReduce(moved, { type: 'reset', ease: false })
    expect(rigPose(instant)!.position.distanceTo(b.position)).toBeLessThan(1e-9)
    let eased = rigReduce(moved, { type: 'reset', ease: true })
    // Not there at once...
    expect(rigPose(eased)!.position.distanceTo(b.position)).toBeGreaterThan(0.01)
    eased = run(eased, 0.2, 1 / 60)
    const partway = rigPose(eased)!.position.distanceTo(b.position)
    expect(partway).toBeGreaterThan(1e-6)
    expect(partway).toBeLessThan(rigPose(moved)!.position.distanceTo(b.position))
    // ...but there in the end, exactly, and the short way round.
    eased = run(eased, 2, 1 / 60)
    expect(rigPose(eased)!.position.distanceTo(b.position)).toBeLessThan(1e-9)
    expect(eased.resetting).toBe(false)
    expect(Math.abs(eased.azimuth)).toBeLessThan(1e-9)
    // A gesture during the ease takes over from it.
    const grabbed = rigReduce(rigReduce(moved, { type: 'reset', ease: true }), { type: 'drag', dx: 1, dy: 0 })
    expect(grabbed.resetting).toBe(false)
  })

  it('opens every new place on its own landing view', () => {
    let s = rigReduce(rigReduce(at(), { type: 'drag', dx: 50, dy: 50 }), { type: 'zoom', scale: 0.5 })
    s = rigReduce(s, { type: 'route', placeId: 'aura', current: b, goal: c, seconds: 0, orbit: placeOrbit(placeById('aura')!, districts, places) })
    expect(rigPose(s)!.position.distanceTo(c.position)).toBeLessThan(1e-9)
  })

  it('does nothing with a tilt, a zoom or a reset away from a place', () => {
    for (const event of [{ type: 'drag', dx: 0, dy: 40 }, { type: 'zoom', scale: 2 }, { type: 'reset', ease: false }] as const) {
      expect(rigReduce(start, event)).toEqual(start)
      const flying = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 2, orbit })
      expect(rigReduce(flying, event)).toEqual(flying)
    }
  })

  it.each(places.map((p) => [p.id, p] as const))('never tilts the camera at %s into the ground, a building or a tree', (_, place) => {
    const o = placeOrbit(place, districts, places)
    expect(o.lowest).toBeGreaterThanOrEqual(FOCUS_REACH.low)
    expect(o.lowest).toBeLessThanOrEqual(o.elevation)
    const obstacles = sceneryObstacles(districts, places)
    const faults: string[] = []
    for (let k = 0; k < 48 && faults.length < 3; k++) {
      for (const d of [nearDistance(o, o.lowest), (nearDistance(o, o.lowest) + o.distance) / 2, o.distance, farDistance(o)]) {
        const eye = orbitPose(o, (k / 48) * Math.PI * 2, o.lowest, d).position
        const dir = eye.clone().normalize()
        const ground = 1 + heightAt(dir, districts)
        if (eye.length() < ground + 0.03) faults.push(`azimuth ${k}: ${(eye.length() - ground).toFixed(3)} above the ground`)
        for (const ob of obstacles) {
          if (dir.angleTo(ob.dir) <= ob.reach && eye.length() < ob.top + 0.03) faults.push(`azimuth ${k}, distance ${d.toFixed(2)}: in something`)
        }
      }
    }
    expect(faults).toEqual([])
  })

  it('keeps out of the very buildings and trees the planet draws, laid out once', () => {
    const layout = sceneryLayout(districts, places)
    // The renderer's layout: the same seeds and arguments as Scatter draws with.
    const buildings = scatterBlocks(SCATTER_SEEDS.blocks, districts, places)
    expect(layout.buildings).toEqual(buildings)
    expect(layout.trees).toEqual(scatterTrees(SCATTER_SEEDS.trees, districts, places, buildings))
    // Laid out once, and shared.
    expect(sceneryLayout(districts, places)).toBe(layout)
    const obstacles = sceneryObstacles(districts, places)
    expect(obstacles).toHaveLength(layout.buildings.length + layout.trees.length)
    expect(obstacles[0].dir.distanceTo(layout.buildings[0].dir.clone().normalize())).toBeCloseTo(0, 12)
  })

  it('tilts lower than it lands wherever the ground round the place is open', () => {
    const open = places.filter((p) => placeOrbit(p, districts, places).lowest < placeOrbit(p, districts, places).elevation - 0.05)
    expect(open.length).toBeGreaterThan(places.length / 2)
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

  it('holds still for as long as the visitor is zoomed in on something', () => {
    const s = run(rigReduce(start, { type: 'touch' }), AUTO_ROTATE_IDLE + 5)
    expect(rigAutoRotates(s, false)).toBe(true)
    expect(rigAutoRotates(s, true)).toBe(false)
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
