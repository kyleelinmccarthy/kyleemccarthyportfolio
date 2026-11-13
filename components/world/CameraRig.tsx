'use client'

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, TOUCH } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { District, DistrictId, Place } from '@/content/types'
import { placeSheet } from '@/components/hud/sheetEdge'
import { keyIsThePages } from '@/lib/keys'
import { flightSeconds, maxDistance, orbitPose, overviewDistance, type Pose } from '@/lib/world/camera'
import { dirOf } from '@/lib/world/geo'
import {
  AUTO_ROTATE_FROM,
  COAST,
  ORBIT_NEAREST,
  STILL,
  coastStep,
  flickSpin,
  orbitRotateSpeed,
  orbitZoomSpeed,
  placeKey,
  sheetViewOffset,
  wheelZoom,
  type Spin,
  type TurnSample,
} from '@/lib/world/gestures'
import { POINTERS_START, pointerReduce, type PointerEventIn, type PointerState } from '@/lib/world/pointers'
import {
  MAX_TICK,
  POLAR_LIMIT,
  RIG_START,
  districtGoal,
  homeGoal,
  placeGoal,
  placeOrbit,
  rigArmed,
  rigAutoRotates,
  rigLeaves,
  rigPose,
  rigReduce,
  retargetFlight,
  sceneryObstacles,
  type RigEvent,
  type RigMode,
  type RigState,
} from '@/lib/world/rig'
import { PHONE_WIDTH, testHooksOn } from '@/lib/world/quality'

/** The test hook `window.__rigView` is written only in an e2e build; see `testHooksOn`. */
const TEST_HOOKS = testHooksOn(process.env.NEXT_PUBLIC_E2E)

/** The view on arrival: a little north of the equator, just west of the meridian. */
const OVERVIEW_AT = { lat: 8, lon: -6 }
/** The look test's slow turn. How fast a drag turns and a pinch or the wheel zooms follows the distance (`orbitRotateSpeed`, `orbitZoomSpeed`). */
const ORBIT = { autoRotateSpeed: 0.55, minDistance: ORBIT_NEAREST }
/** On a wide screen, an open place shifts the view this many pixels left, clear of the panel. */
const VIEW_OFFSET = 215
/** The shift eases by this fraction of what is left every second: the look test's rate. */
const OFFSET_REMAINING_PER_SECOND = 0.002

/** What the rig is doing, for the page to show on the canvas's wrapper. */
export interface RigReport {
  mode: RigMode
  target: string | null
  autoRotate: boolean
}

interface CameraRigProps {
  /** The place the URL names, or null on the home page. */
  placeId: string | null
  /** The island the home page's URL asks for, or null. */
  district: DistrictId | null
  places: Place[]
  districts: District[]
  reducedMotion: boolean
  /** Zooming out past the furthest at a place asks to go back to the planet. */
  onLeave(): void
  /** Called whenever what the rig is doing changes. */
  onReport(report: RigReport): void
}

type Route = { placeId: string | null; district: DistrictId | null }

const routeKey = ({ placeId, district }: Route) =>
  placeId !== null ? `place:${placeId}` : district !== null ? `district:${district}` : 'home'

/** Hands the rig a gesture at a place, and asks to go back to the planet, once, if it zoomed out far enough. */
function handGesture(rig: RefObject<RigState>, leaving: RefObject<boolean>, onLeave: () => void, event: RigEvent) {
  rig.current = rigReduce(rig.current, event)
  if (rigLeaves(rig.current) && !leaving.current) {
    leaving.current = true
    onLeave()
  }
}

/**
 * The camera. The URL says where it should be; the rig gets it there. At the
 * planet, three's OrbitControls hold it: drag to spin (the ground staying
 * under the finger), pinch or scroll to zoom, a flick coasting on, and it
 * turns slowly by itself until touched. When the route changes it flies, from
 * wherever the camera is at that moment, to the place or to an island or back
 * out to the planet, where it hands the controls the pose it ended on. At a
 * place, a drag swings it round and tilts it, a pinch or the wheel brings it
 * in and out (on out past the furthest goes back to the planet), a double tap
 * sets it back, and so do keys (`placeKey`). The decisions are the rig's and
 * the gestures' (lib/world); this wires the events to them.
 */
export function CameraRig({ placeId, district, places, districts, reducedMotion, onLeave, onReport }: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const size = useThree((state) => state.size)
  const aspect = size.width / size.height

  const rig = useRef<RigState>(RIG_START)
  const controls = useRef<OrbitControls | null>(null)
  const overview = useRef(overviewDistance(aspect))
  // The furthest the visitor may zoom out, for this shape of window.
  const reach = useRef(maxDistance(aspect))
  const pending = useRef<Route | null>(null)
  const lastRoute = useRef('home')
  const leaving = useRef(false)
  // Whether the flight under way, if any, is going back out to the overview.
  const homeBound = useRef(false)
  const offset = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const reported = useRef<RigReport | null>(null)
  // The planet's coast after a flick, and whether a finger (not a mouse) holds the controls.
  const spin = useRef<Spin>(STILL)
  const touching = useRef(false)
  // The pointers on the canvas at a place (`pointerReduce`).
  const pointers = useRef<PointerState>(POINTERS_START)
  // The latest callbacks and settings, so the listeners below need not be re-attached when they change.
  const latest = useRef({ onLeave, onReport, reducedMotion })
  latest.current = { onLeave, onReport, reducedMotion }

  // On arrival: at the overview, looking at the centre, with the controls in hand.
  useLayoutEffect(() => {
    const start = orbitPose(dirOf(OVERVIEW_AT), overview.current)
    camera.position.copy(start.position)
    camera.quaternion.copy(start.quaternion)
    // The controls read the camera's up once, when made: it must be the world's.
    camera.up.copy(start.up)

    const orbit = new OrbitControls(camera, canvas)
    Object.assign(orbit, ORBIT, {
      enablePan: false,
      // The rig coasts the planet itself after a flick (below): damping would leave it trailing the finger.
      enableDamping: false,
      maxDistance: reach.current,
      minPolarAngle: POLAR_LIMIT,
      maxPolarAngle: Math.PI - POLAR_LIMIT,
      // Two fingers pinch and turn together, as on a globe.
      touches: { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE },
    })
    // Where the planet was turned to over the drag so far, for the speed it is flicked at.
    let samples: TurnSample[] = []
    const down = (e: PointerEvent) => {
      if (!orbit.enabled) return
      touching.current = e.pointerType === 'touch'
      orbit.zoomSpeed = orbitZoomSpeed(camera.position.length(), touching.current)
    }
    const grab = () => {
      rig.current = rigReduce(rig.current, { type: 'touch' })
      // A hand on a coasting planet stops it.
      spin.current = STILL
      samples = []
    }
    const change = () => {
      if (samples.length > 0 && performance.now() - samples[samples.length - 1].t > COAST.window * 2) samples = []
      samples.push({ t: performance.now(), theta: orbit.getAzimuthalAngle(), phi: orbit.getPolarAngle() })
      if (samples.length > 32) samples.shift()
    }
    const end = () => {
      rig.current = rigReduce(rig.current, { type: 'touch' })
      spin.current = latest.current.reducedMotion ? STILL : flickSpin(samples, performance.now())
      samples = []
      touching.current = false
    }
    canvas.addEventListener('pointerdown', down)
    orbit.addEventListener('start', grab)
    orbit.addEventListener('change', change)
    orbit.addEventListener('end', end)
    orbit.update()
    controls.current = orbit
    return () => {
      canvas.removeEventListener('pointerdown', down)
      orbit.removeEventListener('start', grab)
      orbit.removeEventListener('change', change)
      orbit.removeEventListener('end', end)
      orbit.dispose()
      controls.current = null
      camera.clearViewOffset()
    }
  }, [camera, canvas])

  // The buildings and trees the camera keeps out of at a place: made ready while the browser is idle, so the first
  // arrival at a place does not stop to work them out. (The planet has already laid them out to draw them.)
  useEffect(() => {
    const ready = () => void sceneryObstacles(districts, places)
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(ready, { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(ready, 200)
    return () => window.clearTimeout(id)
  }, [districts, places])

  // Reduced motion: nothing coasts after the hand lets go.
  useEffect(() => {
    if (reducedMotion) spin.current = STILL
  }, [reducedMotion])

  // A new shape of screen: the overview and the furthest zoom move with it, and so does the camera in
  // orbit. A flight home lands at the new overview.
  useEffect(() => {
    const next = overviewDistance(aspect)
    reach.current = maxDistance(aspect)
    const orbit = controls.current
    if (orbit) {
      orbit.maxDistance = reach.current
      if (rig.current.mode === 'orbit') {
        camera.position.multiplyScalar(next / overview.current)
        orbit.update()
      }
    }
    if (rig.current.mode === 'fly' && homeBound.current) rig.current = retargetFlight(rig.current, next)
    overview.current = next
  }, [aspect, camera])

  // The URL changed: the next frame starts a flight to wherever it now names. A layout
  // effect, so even the canvas's first frame already knows where it is going.
  useLayoutEffect(() => {
    const route = { placeId, district }
    const key = routeKey(route)
    if (key === lastRoute.current) return
    lastRoute.current = key
    pending.current = route
    leaving.current = false
  }, [placeId, district])

  // At a place: one finger or the mouse swings and tilts, two fingers pinch, a double tap sets the view back. What
  // each pointer event does is `pointerReduce`'s to decide; this feeds it and does what it says.
  useEffect(() => {
    const gesture = (event: RigEvent) => handGesture(rig, leaving, () => latest.current.onLeave(), event)
    const feed = (event: PointerEventIn) => {
      const out = pointerReduce(pointers.current, event)
      pointers.current = out.state
      for (const action of out.actions) {
        if (action.type === 'capture') {
          // A pointer can go before its down is handled (a synthetic one, or one already lifted): nothing to capture then.
          try {
            canvas.setPointerCapture(action.id)
          } catch {}
        } else if (action.type === 'release') {
          if (canvas.hasPointerCapture(action.id)) canvas.releasePointerCapture(action.id)
        } else if (action.type === 'reset') gesture({ type: 'reset', ease: !latest.current.reducedMotion })
        else gesture(action)
      }
    }
    const down = (e: PointerEvent) => {
      if (rig.current.mode !== 'focus') return
      const kind = e.pointerType === 'touch' || e.pointerType === 'pen' ? e.pointerType : 'mouse'
      // The only presses the page makes itself are those a map label hands over (`useLabelGestures`): never a new touch.
      feed({ type: 'down', id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, kind, primary: e.isPrimary, button: e.button, handedOver: !e.isTrusted })
    }
    const move = (e: PointerEvent) => feed({ type: 'move', id: e.pointerId, x: e.clientX, y: e.clientY })
    const up = (e: PointerEvent) => feed({ type: 'up', id: e.pointerId, t: e.timeStamp, cancel: e.type !== 'pointerup' })
    // Lifts that never arrive: the window losing focus, the page going out of sight.
    const clear = () => feed({ type: 'clear' })
    const hidden = () => {
      if (document.visibilityState === 'hidden') clear()
    }
    // The wheel, or a trackpad's pinch (a wheel with ctrlKey), zooms at a place. While the controls are
    // not holding the camera nothing else may take it: the page would zoom.
    const wheel = (e: WheelEvent) => {
      if (controls.current?.enabled) return
      e.preventDefault()
      if (rig.current.mode !== 'focus' || leaving.current) return
      gesture({ type: 'zoom', scale: wheelZoom(e.deltaY, e.deltaMode, e.ctrlKey, canvas.clientHeight) })
    }
    // On a finger, the canvas takes every move: no scroll, no pull to refresh, no page zoom (`touch-action: none`
    // does this where it is honoured; this covers the rest). Safari's own pinch gesture, too.
    const touchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault()
    }
    const gestureStart = (e: Event) => e.preventDefault()
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    // Capture lost (by another element, or by the browser): that pointer's lift will not come here.
    canvas.addEventListener('lostpointercapture', up)
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('touchmove', touchMove, { passive: false })
    canvas.addEventListener('gesturestart', gestureStart)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('lostpointercapture', up)
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('touchmove', touchMove)
      canvas.removeEventListener('gesturestart', gestureStart)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [canvas])

  // At a place, keys do what the hands do (`placeKey`). The arrows and Escape are the tour's.
  useEffect(() => {
    const gesture = (event: RigEvent) => handGesture(rig, leaving, () => latest.current.onLeave(), event)
    const key = (e: KeyboardEvent) => {
      if (rig.current.mode !== 'focus' || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented || !keyIsThePages(e.target)) return
      const action = placeKey(e.key)
      if (!action) return
      gesture(action.type === 'reset' ? { type: 'reset', ease: !latest.current.reducedMotion } : action)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  useFrame((_, delta) => {
    const orbit = controls.current
    if (!orbit) return
    const before = rig.current
    let state: RigState
    // Where this frame's flight ends, if it ends in orbit this frame.
    let landing: Pose | undefined

    const route = pending.current
    if (route) {
      pending.current = null
      // From the camera as it is now, mid-flight or not.
      const current: Pose = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone() }
      const goal = goalFor(route, current)
      homeBound.current = goal.home
      spin.current = STILL
      state = rigReduce(before, {
        type: 'route',
        placeId: goal.placeId,
        current,
        goal: goal.pose,
        seconds: flightSeconds(current, goal.pose, reducedMotion),
        orbit: goal.placeId !== null ? placeOrbit(places.find((p) => p.id === goal.placeId)!, districts, places) : null,
      })
      landing = goal.pose
    } else {
      state = rigReduce(before, { type: 'tick', dt: delta })
      landing = before.flight?.to
    }
    rig.current = state
    // Away from a place (flying off, or back at the planet) no pointer is followed there any more.
    if (state.mode !== 'focus' && pointers.current !== POINTERS_START) pointers.current = POINTERS_START

    // The rig holds the camera in flight and at a place; the controls hold it in orbit.
    // A flight with no length lands in this same frame.
    const pose = rigPose(state)
    if (pose) {
      orbit.enabled = false
      camera.position.copy(pose.position)
      camera.quaternion.copy(pose.quaternion)
      if (state.mode === 'focus' && state.flight) camera.up.copy(state.flight.to.up)
    } else {
      if ((before.mode !== 'orbit' || route) && landing) {
        // Landed: the camera takes the flight's last pose exactly, an orbit pose looking at the
        // centre with world up, which is what the controls keep. So they take over without a jump.
        camera.position.copy(landing.position)
        camera.quaternion.copy(landing.quaternion)
        camera.up.set(0, 1, 0)
        orbit.enabled = true
      }
      const distance = camera.position.length()
      // The ground under the finger stays under it, at every distance.
      orbit.rotateSpeed = orbitRotateSpeed(distance)
      orbit.zoomSpeed = orbitZoomSpeed(distance, touching.current)
      orbit.autoRotate = !reducedMotion && rigAutoRotates(state, distance < overview.current * AUTO_ROTATE_FROM)
      // A flick coasts on, slowing away.
      const step = coastStep(spin.current, Math.min(delta, MAX_TICK))
      spin.current = step.spin
      if (step.turn.theta !== 0 || step.turn.phi !== 0) {
        orbit.rotateLeft(-step.turn.theta)
        orbit.rotateUp(-step.turn.phi)
      }
      orbit.update(Math.min(delta, MAX_TICK))
    }

    applyViewOffset(delta)
    report(state, orbit.enabled && orbit.autoRotate)
    if (TEST_HOOKS) {
      window.__rigView =
        state.mode === 'focus' ? { azimuth: state.azimuth, elevation: state.elevation, distance: state.distance, armed: rigArmed(state) } : undefined
    }
  })

  function goalFor(route: Route, current: Pose): { placeId: string | null; pose: Pose; home: boolean } {
    const place = route.placeId !== null ? places.find((p) => p.id === route.placeId) : undefined
    if (place) return { placeId: place.id, pose: placeGoal(place, districts), home: false }
    const island = route.district !== null ? districts.find((d) => d.id === route.district) : undefined
    if (island) return { placeId: null, pose: districtGoal(island), home: false }
    return { placeId: null, pose: homeGoal(current.position, overview.current), home: true }
  }

  /**
   * Eases the view's shift towards where the URL and the panel want it, and re-applies it when the screen changes
   * size. On a wide screen an open place moves the view left of the panel; on a phone it moves it up, so the
   * landmark stands in the middle of what the sheet leaves, however far the sheet is open.
   */
  function applyViewOffset(delta: number) {
    const phone = size.width <= PHONE_WIDTH
    const goal =
      placeId === null ? { x: 0, y: 0 } : phone ? { x: 0, y: sheetViewOffset(placeSheet.top(), size.height) } : { x: VIEW_OFFSET, y: 0 }
    const now = offset.current
    const k = reducedMotion ? 1 : 1 - Math.pow(OFFSET_REMAINING_PER_SECOND, Math.min(delta, MAX_TICK))
    const ease = (from: number, to: number) => {
      if (from === to) return to
      const next = MathUtils.lerp(from, to, k)
      return Math.abs(next - to) <= 0.5 ? to : next
    }
    const x = ease(now.x, goal.x)
    const y = ease(now.y, goal.y)
    if (x === now.x && y === now.y && size.width === now.width && size.height === now.height) return
    offset.current = { x, y, width: size.width, height: size.height }
    camera.setViewOffset(size.width, size.height, x, y, size.width, size.height)
    camera.updateProjectionMatrix()
  }

  function report(state: RigState, autoRotate: boolean) {
    const last = reported.current
    if (last && last.mode === state.mode && last.target === state.target && last.autoRotate === autoRotate) return
    const next = { mode: state.mode, target: state.target, autoRotate }
    reported.current = next
    latest.current.onReport(next)
  }

  return null
}
