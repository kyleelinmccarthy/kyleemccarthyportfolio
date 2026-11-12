'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { District, DistrictId, Place } from '@/content/types'
import { flightSeconds, maxDistance, orbitPose, overviewDistance, type Pose } from '@/lib/world/camera'
import { dirOf } from '@/lib/world/geo'
import {
  MAX_TICK,
  POLAR_LIMIT,
  RIG_START,
  districtGoal,
  homeGoal,
  placeGoal,
  rigAutoRotates,
  rigPose,
  rigReduce,
  retargetFlight,
  type RigMode,
  type RigState,
} from '@/lib/world/rig'
import { PHONE_WIDTH } from '@/lib/world/quality'

/** The view on arrival: a little north of the equator, just west of the meridian. */
const OVERVIEW_AT = { lat: 8, lon: -6 }
/** The look test's orbit: no panning, light damping, a slow turn. */
const ORBIT = { dampingFactor: 0.08, rotateSpeed: 0.55, zoomSpeed: 0.7, autoRotateSpeed: 0.55, minDistance: 2.1 }
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
  /** Scrolling out at a place asks to go back to the planet. */
  onLeave(): void
  /** Called whenever what the rig is doing changes. */
  onReport(report: RigReport): void
}

type Route = { placeId: string | null; district: DistrictId | null }

const routeKey = ({ placeId, district }: Route) =>
  placeId !== null ? `place:${placeId}` : district !== null ? `district:${district}` : 'home'

/**
 * The camera. The URL says where it should be; the rig gets it there. At the
 * planet, three's OrbitControls hold it: drag to spin, scroll to zoom, and it
 * turns slowly by itself until touched. When the route changes it flies, from
 * wherever the camera is at that moment, to the place (and stays low beside
 * it, a drag walking it round) or to an island or back out to the planet,
 * where it hands the controls the pose it ended on.
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
  const offset = useRef({ px: 0, width: 0, height: 0 })
  const reported = useRef<RigReport | null>(null)
  // The latest callbacks, so the listeners below need not be re-attached when they change.
  const callbacks = useRef({ onLeave, onReport })
  callbacks.current = { onLeave, onReport }

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
      maxDistance: reach.current,
      minPolarAngle: POLAR_LIMIT,
      maxPolarAngle: Math.PI - POLAR_LIMIT,
    })
    const touch = () => {
      rig.current = rigReduce(rig.current, { type: 'touch' })
    }
    orbit.addEventListener('start', touch)
    orbit.addEventListener('end', touch)
    orbit.update()
    controls.current = orbit
    return () => {
      orbit.removeEventListener('start', touch)
      orbit.removeEventListener('end', touch)
      orbit.dispose()
      controls.current = null
      camera.clearViewOffset()
    }
  }, [camera, canvas])

  // Damping keeps the planet coasting after a drag: motion the visitor did not ask for.
  useEffect(() => {
    if (controls.current) controls.current.enableDamping = !reducedMotion
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

  // At a place, a drag walks the camera round it and scrolling out goes back to the planet.
  useEffect(() => {
    let dragging: { id: number; x: number } | null = null
    const down = (e: PointerEvent) => {
      if (rig.current.mode !== 'focus' || dragging) return
      dragging = { id: e.pointerId, x: e.clientX }
      canvas.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== dragging.id) return
      rig.current = rigReduce(rig.current, { type: 'drag', dx: e.clientX - dragging.x })
      dragging.x = e.clientX
    }
    const up = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== dragging.id) return
      dragging = null
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    }
    const wheel = (e: WheelEvent) => {
      if (rig.current.mode !== 'focus' || e.deltaY <= 0 || leaving.current) return
      leaving.current = true
      callbacks.current.onLeave()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('wheel', wheel, { passive: true })
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('wheel', wheel)
    }
  }, [canvas])

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
      state = rigReduce(before, {
        type: 'route',
        placeId: goal.placeId,
        current,
        goal: goal.pose,
        seconds: flightSeconds(current, goal.pose, reducedMotion),
      })
      landing = goal.pose
    } else {
      state = rigReduce(before, { type: 'tick', dt: delta })
      landing = before.flight?.to
    }
    rig.current = state

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
      orbit.autoRotate = !reducedMotion && rigAutoRotates(state)
      orbit.update(Math.min(delta, MAX_TICK))
    }

    applyViewOffset(delta)
    report(state, orbit.enabled && orbit.autoRotate)
  })

  function goalFor(route: Route, current: Pose): { placeId: string | null; pose: Pose; home: boolean } {
    const place = route.placeId !== null ? places.find((p) => p.id === route.placeId) : undefined
    if (place) return { placeId: place.id, pose: placeGoal(place, districts), home: false }
    const island = route.district !== null ? districts.find((d) => d.id === route.district) : undefined
    if (island) return { placeId: null, pose: districtGoal(island), home: false }
    return { placeId: null, pose: homeGoal(current.position, overview.current), home: true }
  }

  /** Eases the view's shift towards where the URL wants it, and re-applies it when the screen changes size. */
  function applyViewOffset(delta: number) {
    const goal = placeId !== null && size.width > PHONE_WIDTH ? VIEW_OFFSET : 0
    const now = offset.current
    let px = now.px
    if (px !== goal) {
      const k = reducedMotion ? 1 : 1 - Math.pow(OFFSET_REMAINING_PER_SECOND, Math.min(delta, MAX_TICK))
      px = MathUtils.lerp(px, goal, k)
      if (Math.abs(px - goal) <= 0.5) px = goal
    }
    if (px === now.px && size.width === now.width && size.height === now.height) return
    offset.current = { px, width: size.width, height: size.height }
    camera.setViewOffset(size.width, size.height, px, 0, size.width, size.height)
    camera.updateProjectionMatrix()
  }

  function report(state: RigState, autoRotate: boolean) {
    const last = reported.current
    if (last && last.mode === state.mode && last.target === state.target && last.autoRotate === autoRotate) return
    const next = { mode: state.mode, target: state.target, autoRotate }
    reported.current = next
    callbacks.current.onReport(next)
  }

  return null
}
