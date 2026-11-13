'use client'

import { useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Camera } from 'three'
import { constellations } from '@/content/sky'
import type { District, Place } from '@/content/types'
import { overviewDistance } from '@/lib/world/camera'
import { formatCoord, latLonOf } from '@/lib/world/geo'
import {
  CONSTELLATION_LABELS_FROM,
  LABELS_ID,
  NEARBY,
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
  landmarkBoxes,
  landmarkTop,
  layoutTags,
  nearestPlaces,
  openBand,
  placeAnchor,
  spreadEdgePins,
  type ScreenPoint,
  type TagItem,
  type TagSize,
} from '@/lib/world/labels'
import { PHONE_WIDTH, type Quality } from '@/lib/world/quality'
import { CLOUD_SEEDS, FAR_DRIFT, SKY_RADIUS, constellationAnchor, constellationPoints, farCloudSpheres } from '@/lib/world/starfield'
import { groundOf } from '@/lib/world/terrain'
import type { RigReport } from './CameraRig'
import { HUD_AWAY, useLabelGestures, useLabelMeasures, useLabelTaps, useLabelsCleanup, useReadout, type ProjectorState } from './labelHooks'
import { projectToScreen } from './screenProject'
import { freshWritten, writeLabel, type Written } from './labelWrite'
import { lookUniforms } from './lookUniforms'

/** The readout changes at most this often, in seconds: it is read, not watched. */
const READOUT_EVERY = 0.1
/** A tag's size until it has been measured: about a place's. */
const TAG_GUESS: TagSize = { width: 170, height: 38 }
/** A constellation's name hides once at least this share of its stars is behind a far cloud. */
const CLOUDED = 0.5

/** One label, kept from frame to frame: its link (found once), where it is pinned in the world, its layout and what was written. */
interface LabelRecord {
  kind: 'place' | 'district' | 'constellation'
  placeId: string | null
  anchor: Vector3
  el: HTMLElement | null
  item: TagItem
  written: Written
  /** For a place: its ground and its landmark's top. For a constellation: its stars. */
  ground?: Vector3
  top?: Vector3
  stars?: Vector3[]
}

function record(kind: LabelRecord['kind'], id: string, anchor: Vector3, extra: Partial<LabelRecord> = {}): LabelRecord {
  return {
    kind,
    placeId: null,
    anchor,
    el: null,
    item: { id, form: kind, on: false, at: { x: 0, y: 0 }, held: false, size: TAG_GUESS, shift: 0, rise: 0, flipX: false, flipY: false, tagless: false },
    written: freshWritten(),
    ...extra,
  }
}

interface LabelProjectorProps {
  places: Place[]
  districts: District[]
  /** The place the URL has open, whose own label stays hidden: the panel names it. */
  placeId: string | null
  /** What the camera rig last reported. */
  rig: RefObject<RigReport | null>
  /** The far clouds drawn at this quality are the ones that can hide a constellation. */
  quality: Quality
}

const ahead = new Vector3()
const focus = { x: 0, y: 0, behind: false, inView: false }

/** A point in the world on the screen (`projectToScreen`, shared with the guide's bubble). */
const project = projectToScreen

/**
 * Pins the HTML labels (see `Labels`) to the planet. Each frame it projects
 * every label's anchor, decides whether it can be seen (in the tier the
 * camera's distance calls for, in front of the planet, on screen, not under
 * anything that covers the map), lays out the tags (`layoutTags` in
 * lib/world/labels.ts holds every rule) and writes only what changed to each
 * link (`writeLabel`): its `transform`, `data-on` (visibility: a hidden label
 * leaves the tab order and the accessibility tree), `data-tier`, the tag's
 * flips, slide and leader line, and `data-tagless`. It never sets React state and never reads the page's
 * layout: what covers the map and the tags' sizes are measured when they
 * change (`useLabelMeasures`).
 *
 * On a phone at a place the nearest places show as pins in the open view
 * between the header and the panel, at its edge when they are off it or over
 * the horizon. Constellation names show well into the night, unless the
 * planet or a far cloud hides their stars. The layer is a navigation landmark
 * only while a link in it shows. While the camera is in close it sets
 * `data-hud-away` on <html>, and the headline, greeting, role line and legend
 * give way. It also keeps the map readout up to date.
 */
export function LabelProjector({ places, districts, placeId, rig, quality }: LabelProjectorProps) {
  const records = useMemo(
    () => [
      ...places.map((place) =>
        record('place', labelId(place.id), placeAnchor(place, districts), {
          placeId: place.id,
          ground: groundOf(place.at, districts),
          top: landmarkTop(place, districts),
        }),
      ),
      ...districts.map((district) => record('district', districtLabelId(district.id), districtAnchor(district))),
      ...constellations.map((c) =>
        record('constellation', constellationLabelId(c.name), constellationAnchor(c, SKY_RADIUS), { stars: constellationPoints(c, SKY_RADIUS) }),
      ),
    ],
    [places, districts],
  )
  const placeRecords = useMemo(() => records.filter((r) => r.kind === 'place'), [records])
  const items = useMemo(() => records.map((r) => r.item), [records])
  const clouds = useMemo(() => farCloudSpheres(CLOUD_SEEDS.far, quality), [quality])
  const nearby = useMemo(
    () => new Set(placeId ? nearestPlaces(placeId, places, NEARBY.count, NEARBY.within).map((p) => p.id) : []),
    [placeId, places],
  )

  const measured = useLabelMeasures()
  const readout = useReadout(places.length, districts.length, placeId !== null)
  useLabelTaps()
  useLabelGestures(useThree((s) => s.gl.domElement))
  const state = useRef<ProjectorState>({ away: false, landmark: false, layer: null })
  useLabelsCleanup(state)

  useFrame((frame, delta) => {
    const { camera, size } = frame
    // The rig has moved the camera this frame; the matrices catch up before anything is projected.
    camera.updateMatrixWorld()
    const mode = rig.current?.mode ?? 'orbit'
    const distance = camera.position.length()
    const tier = labelTier(distance, mode !== 'orbit')
    const s = state.current
    if (!s.layer?.isConnected) s.layer = document.getElementById(LABELS_ID)
    s.layer?.toggleAttribute('data-flying', mode === 'fly')

    const away = hudGivesWay(distance, s.away)
    if (away !== s.away) {
      s.away = away
      document.documentElement.toggleAttribute(HUD_AWAY, away)
    }
    const active = document.activeElement
    const covers = coversInForce(
      measured.current.covers.map((c) => ({ rect: c.rect, givesWay: c.givesWay, holdsFocus: active !== null && c.el.contains(active) })),
      away,
    )
    const view = { width: size.width, height: size.height }
    const band = placeId !== null && size.width <= PHONE_WIDTH && mode !== 'orbit' ? openBand(view, covers) : null
    // The middle of the view: a point straight ahead of the camera, wherever the panel has shifted the view.
    project(ahead.set(0, 0, -3).applyMatrix4(camera.matrixWorld), camera, view, focus)
    const starry = lookUniforms.numbers.star.value > CONSTELLATION_LABELS_FROM
    const drift = lookUniforms.time.value * FAR_DRIFT

    for (const r of records) {
      if (!r.el?.isConnected) {
        r.el = document.getElementById(r.item.id)
        r.written.fresh = true
      }
      const it = r.item
      const el = r.el
      it.held = el !== null && (el.hasAttribute('data-hot') || el.hasAttribute('data-open') || el === active || el.matches(':hover'))
      it.size = measured.current.tags.get(it.id) ?? TAG_GUESS
      let wanted: boolean
      if (r.kind === 'place') {
        if (band) {
          it.form = 'nearby'
          wanted = r.placeId !== null && nearby.has(r.placeId)
          if (wanted) {
            const p = project(r.anchor, camera, view, it.at)
            const pinned = edgePin(p, p.behind, band, isOccluded(camera.position, r.anchor))
            it.at.x = pinned.x
            it.at.y = pinned.y
          }
          it.on = wanted
          continue
        }
        it.form = tier === 'place' ? 'place' : 'dot'
        wanted = r.placeId !== placeId
      } else if (r.kind === 'district') {
        wanted = tier === 'district'
      } else {
        wanted = starry && cloudedShare(r.stars ?? [], camera.position, drift, clouds) < CLOUDED
      }
      it.on = wanted && !isOccluded(camera.position, r.anchor) && inView(r.anchor, camera, view, it.at, covers)
    }
    if (band) spreadNearby(placeRecords, band)

    const toScreen = (v: Vector3) => project(v, camera, view, { x: 0, y: 0 })
    const landmarks = tier === 'district' ? landmarkBoxes(placeRecords as Array<{ top: Vector3; ground: Vector3 }>, camera.position, toScreen) : []
    // At a place, the landmark the visitor came to see: no neighbour's tag may stand over it.
    const here = placeId !== null && mode !== 'orbit' ? placeRecords.find((r) => r.placeId === placeId) : undefined
    const focused = here ? (landmarkBoxes([here as { top: Vector3; ground: Vector3 }], camera.position, toScreen)[0] ?? null) : null
    const { links } = layoutTags(items, { view, covers, landmarks, focus, focused })

    for (const r of records) if (r.el) writeLabel(r.el, r.item, r.written)
    const landmark = labelsLandmark(links)
    if (s.layer && (landmark !== null) !== s.landmark) {
      s.landmark = landmark !== null
      if (landmark) {
        s.layer.setAttribute('role', landmark.role)
        s.layer.setAttribute('aria-label', landmark.name)
      } else {
        s.layer.removeAttribute('role')
        s.layer.removeAttribute('aria-label')
      }
    }

    const out = readout.current
    if (out) {
      out.wait -= delta
      if (out.wait <= 0) {
        out.wait = READOUT_EVERY
        const zoom = overviewDistance(size.width / size.height) / distance
        out.view.textContent = `View ${formatCoord(latLonOf(camera.position))} · ${zoom.toFixed(1)}×`
      }
    }
  })

  return null
}

/** Projects `at` into `out`; true when it is in view and not under anything that covers the map. */
function inView(at: Vector3, camera: Camera, view: TagSize, out: ScreenPoint, covers: Array<{ left: number; top: number; right: number; bottom: number }>): boolean {
  const p = project(at, camera, view, out)
  return p.inView && !covers.some((r) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom)
}

/** Spreads neighbours' pins on the same edge of the open view apart (`spreadEdgePins`), in place. */
function spreadNearby(placeRecords: LabelRecord[], band: { left: number; top: number; right: number; bottom: number }) {
  const shown = placeRecords.filter((r) => r.item.on)
  const spread = spreadEdgePins(
    shown.map((r) => ({ x: r.item.at.x, y: r.item.at.y, edge: true })),
    band,
  )
  shown.forEach((r, i) => {
    r.item.at.x = spread[i]!.x
    r.item.at.y = spread[i]!.y
  })
}
