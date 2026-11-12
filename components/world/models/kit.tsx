'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ExtrudeGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Shape,
  Sphere,
  SphereGeometry,
  TextureLoader,
  Vector2,
  Vector3,
  type Group,
  type Material,
  type Object3D,
  type Texture,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { landmark } from '@/content/sky'
import { MODEL_SCALE } from '@/lib/world/camera'
import {
  BEVEL,
  FOOTPRINT,
  OUTLINE,
  SHADOW,
  SharedCache,
  TRIANGLE_BUDGET,
  beamMesh,
  blobSegments,
  blockMesh,
  lineWidth,
  CLOTH,
  clothMesh,
  clothWave,
  gableRoofParts,
  ringMesh,
  waterMesh,
  geometryKey,
  outlineScale,
  paneCoords,
  peakMesh,
  blobAxes,
  cleanPlate,
  roofParts,
  roundSides,
  roundedMesh,
  shadowDisc,
  softSegments,
  RAIN,
  WATER_PERIODS,
  blend,
  brickCourses,
  puffCloudMesh,
  rainColumn,
  rainMesh,
  rainTravel,
  SIGNAL,
  signalMesh,
  signalRings,
  snowPeakMeshes,
  dieMesh,
  emblemLift,
  emblemMesh,
  STREET_LAMP,
  STRIPES,
  streetLampParts,
  stripedMeshes,
  tuftSegments,
  tuftedMesh,
  spinAngle,
  triangleCount,
  TRUSS,
  trussMesh,
  tubeMesh,
  turnedMesh,
  wave,
  withinFootprint,
  pointing,
  FLAME,
  dropPose,
  flameBreath,
  flameProfile,
  type MeshData,
  type Opening,
  type Point2,
  type RoofStyle,
  type Vec3,
} from '@/lib/world/kit'
import { lookUniforms } from '../lookUniforms'
import {
  beamMaterial,
  celMaterial,
  clothMaterial,
  clothOutlineMaterial,
  contactShadowMaterial,
  clock,
  flameMaterial,
  flameUniforms,
  glassMaterial,
  glowMaterial,
  outlineMaterial,
  outlineShellMaterial,
  pictureMaterial,
  clothPeriod,
  rainMaterial,
  rainPeriod,
  signalMaterial,
  stormCloudMaterial,
  tickClock,
  waterMaterial,
} from '../materials'
import type { Place } from '@/content/types'

/**
 * The modelling kit: the parts every landmark is built from. All sizes and
 * places are in model units, with the ground at y = 0, +Y up and +Z the front
 * (south, toward the arriving camera). See README.md beside this file for the
 * rules and for which part to reach for.
 *
 * Every solid part is bevelled, cel shaded in its `color` with a painted edge
 * light on its bevels, and drawn with a thin dark indigo outline unless
 * `outline={false}`. Identical parts share one geometry. The materials are the
 * shared ones, so every mesh passes `dispose={null}`; shared geometries are
 * freed by the cache when their last user unmounts.
 */

export {
  BEVEL,
  DIE,
  FOOTPRINT,
  SNOW_PEAK,
  OUTLINE,
  TRIANGLE_BUDGET,
  archOutline,
  blend,
  ellipseOutline,
  flameOutline,
  flowerOutline,
  heightWithin,
  pictureAspect,
  peakTop,
  pointing,
  stackUp,
  turnedTop,
  outlineScale,
  roundedRectOutline,
  starOutline,
} from '@/lib/world/kit'
export type { Opening, Point2, RoofStyle, Vec3 } from '@/lib/world/kit'

/** A window pane's or lamp's small bevel. */
const LIT_BEVEL = 0.012

/**
 * Marks a kit mesh that `Batched` may merge. react-three-fiber assigns
 * `userData` by reference, so every kit mesh shares this one object: it is
 * frozen, and nothing may ever be written to it (per-mesh state lives in
 * `liftedFrom` below, keyed by the mesh).
 */
const BATCH = Object.freeze({ batch: true })
/** Marks a moving group (`Bob`, `Spin`, `Sway`): `Batched` leaves it and all inside it alone. Shared and frozen, as `BATCH`. */
const MOVING = Object.freeze({ moving: true, motion: 'bob' })
/**
 * The same, for a group turning about one axis through its pivot (`Spin` about
 * y, `Sway` about any): it says which, so a check of where its parts can
 * reach knows what the motion keeps (a turn about y keeps every height).
 */
const TURNING = {
  x: Object.freeze({ moving: true, motion: 'x' }),
  y: Object.freeze({ moving: true, motion: 'y' }),
  z: Object.freeze({ moving: true, motion: 'z' }),
} as const
/**
 * Marks a part that is light, not solid (a `Beam`, a `Signal`): the footprint holds
 * solid geometry only, so the check leaves it out (its triangles still count).
 * Shared and frozen, as `BATCH`.
 */
const LIGHT = Object.freeze({ light: true })

/* ───────────── shared geometry ───────────── */

const geometries = new SharedCache<BufferGeometry>((geometry) => geometry.dispose())

/** The geometry for `key`, built once and shared by every part that asks for the same key. */
function useShared(key: string, build: () => BufferGeometry): BufferGeometry {
  const geometry = geometries.peek(key, build)
  useEffect(() => {
    geometries.hold(key, geometry)
    return () => geometries.release(key, geometry)
  }, [key, geometry])
  return geometry
}

function fromMeshData(data: MeshData): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(data.normals, 3))
  geometry.setAttribute('aBevel', new BufferAttribute(data.bevel, 1))
  if (data.index) geometry.setIndex(new BufferAttribute(data.index, 1))
  return geometry
}

/** Marks as bevel every vertex whose normal is not square to a face (`flat` says which are). */
function markBevel(geometry: BufferGeometry, flat: (n: Vector3) => boolean): BufferGeometry {
  const normals = geometry.getAttribute('normal')
  const bevel = new Float32Array(normals.count)
  const n = new Vector3()
  for (let i = 0; i < normals.count; i++) bevel[i] = flat(n.fromBufferAttribute(normals, i)) ? 0 : 1
  geometry.setAttribute('aBevel', new BufferAttribute(bevel, 1))
  return geometry
}

const capOrWall = (n: Vector3) => Math.abs(n.z) > 0.98 || Math.abs(n.z) < 0.02

/* ───────────── the solid parts ───────────── */

interface Placed {
  /** Where the part's origin goes (see each part for where its origin is). */
  at?: Vec3
  /** Its turn, as Euler angles in radians. */
  rot?: Vec3
}

interface Solid extends Placed {
  color: string
  /** False for no outline: tiny details, or faces set into another part. */
  outline?: boolean
}

/** The three extents of a geometry's bounding box, for its line width (`lineWidth`). */
function extentsOf(geometry: BufferGeometry): number[] {
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  return [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z]
}

/**
 * A cel-shaded part with an outline pushed out along its normals, thinner on a
 * small part (`lineWidth`), or as thin as the members it is built of (`members`).
 */
function Inked({ geometry, color, at, rot, outline = true, members }: Solid & { geometry: BufferGeometry; members?: Vec3 }) {
  const line = useMemo(() => lineWidth(members ?? extentsOf(geometry)), [geometry, members])
  useRebatch(`${geometry.id}|${color}|${at}|${rot}|${outline}`)
  return (
    <mesh geometry={geometry} material={celMaterial({ color }, 'kit')} position={at} rotation={rot} userData={BATCH} dispose={null}>
      {outline && <mesh geometry={geometry} material={outlineShellMaterial(line)} userData={BATCH} dispose={null} />}
    </mesh>
  )
}

/**
 * A box with bevelled edges, centred on `at`: walls, slabs, trim, posts. The
 * bevel defaults to 0.04 and never passes half the thinnest side. One chamfer
 * whose shading turns smoothly across it, which at a landmark's size reads as
 * a rounded edge for a fraction of a rounded box's triangles.
 */
export function Block({ size, bevel = BEVEL.block, ...rest }: Solid & { size: Vec3; bevel?: number }) {
  const geometry = useShared(geometryKey('block', size, bevel), () => fromMeshData(blockMesh(size, bevel)))
  return <Inked geometry={geometry} {...rest} />
}


/**
 * A cylinder or tapering column standing on `at` (its base centre): towers,
 * posts, pipes, drums. Its rims are rounded. Eight sides or fewer make a
 * faceted prism with a flat face to the front.
 */
export function Tube({
  top,
  bottom,
  height,
  sides = roundSides(Math.max(top, bottom)),
  bevel = BEVEL.round,
  ...rest
}: Solid & { top: number; bottom: number; height: number; sides?: number; bevel?: number }) {
  const geometry = useShared(geometryKey('tube', top, bottom, height, sides, bevel), () => fromMeshData(tubeMesh(top, bottom, height, sides, bevel)))
  return <Inked geometry={geometry} {...rest} />
}

/**
 * A straight rod of `radius` laid from `from` to `to` (`pointing`): an easel's
 * stretcher, a lamp's arm, a cable, a brace. A `Tube` of even radius, so
 * `sides` ≤ 8 makes a faceted bar (4: a square bar, a face to the front);
 * `bevel` is a share of its radius by default (0.4). Two points in one place
 * draw nothing.
 */
export function Rod({ from, to, radius, sides, bevel, color, outline }: { from: Vec3; to: Vec3; radius: number; sides?: number; bevel?: number; color: string; outline?: boolean }) {
  const rod = pointing(from, to)
  if (!(rod.length > 0)) return null
  return <Tube at={rod.at} rot={rod.rot} height={rod.length} bottom={radius} top={radius} sides={sides} bevel={bevel ?? radius * 0.4} color={color} outline={outline} />
}

/**
 * A cone or pyramid standing on `at` (its base centre): spires, turret roofs,
 * mountain peaks. Its base rim and tip are rounded. Eight sides or fewer make
 * a faceted pyramid with a flat face to the front.
 */
export function Peak({ radius, height, sides = roundSides(radius), bevel = BEVEL.round, ...rest }: Solid & { radius: number; height: number; sides?: number; bevel?: number }) {
  const geometry = useShared(geometryKey('peak', radius, height, sides, bevel), () => fromMeshData(peakMesh(radius, height, sides, bevel)))
  return <Inked geometry={geometry} {...rest} />
}

/**
 * A snow-capped mountain standing on `at` (its foot's middle): a faceted peak
 * `radius` across its foot and `height` to its tip, craggy (the same for one
 * `seed`), in `color` below its jagged snow line and `cap` above it (`snow`,
 * a share of its height; 1 for no snow), lit facet by facet
 * (`snowPeakMeshes`). One line round the whole peak, from a shell with
 * smooth normals so it never cracks at a facet; the colour change is the
 * snow's edge. Its tip is exactly `height` up: stand a flag's pole on it.
 */
export function SnowPeak({
  radius,
  height,
  sides = 9,
  snow = 0.7,
  seed = 0,
  cap,
  color,
  at,
  rot,
  outline = true,
}: Solid & { radius: number; height: number; sides?: number; snow?: number; seed?: number; cap: string }) {
  const key = geometryKey('snow-peak', radius, height, sides, snow, seed)
  const parts = () => snowPeakMeshes(radius, height, sides, snow, seed)
  const rock = useShared(`${key}|rock`, () => fromMeshData(parts().rock))
  const top = useShared(`${key}|cap`, () => fromMeshData(parts().cap))
  useRebatch(`snow-peak|${rock.id}|${at}|${rot}|${outline}`)
  return (
    <group position={at} rotation={rot}>
      <Inked geometry={rock} color={color} outline={false} />
      <Inked geometry={top} color={cap} outline={false} />
      {outline && <SnowPeakLine shellKey={`${key}|shell`} build={() => parts().shell} />}
    </group>
  )
}

/** A `SnowPeak`'s line, its shell built only for a peak that draws one. */
function SnowPeakLine({ shellKey, build }: { shellKey: string; build: () => MeshData }) {
  const shell = useShared(shellKey, () => fromMeshData(build()))
  const line = useMemo(() => lineWidth(extentsOf(shell)), [shell])
  useRebatch(`snow-peak-line|${shell.id}|${line}`)
  return <mesh geometry={shell} material={outlineShellMaterial(line)} userData={BATCH} dispose={null} />
}

/**
 * A twenty-sided die resting on one face on `at` (the middle of that face):
 * `radius` from its middle to its corners, so `2 × DIE.inradius × radius`
 * tall, every edge and corner bevelled (`dieMesh`). Turn it in a `Spin` and it
 * keeps standing on its face.
 */
export function Die({ radius, bevel = BEVEL.round * 0.4, ...rest }: Solid & { radius: number; bevel?: number }) {
  const geometry = useShared(geometryKey('die', radius, bevel), () => fromMeshData(dieMesh(radius, bevel)))
  return <Inked geometry={geometry} {...rest} />
}

/**
 * Anything round and shaped, turned on a lathe from `profile`: (distance from
 * the axis, height) pairs running from the bottom to the top, starting and
 * ending on the axis. Its origin is the axis at height 0. Every corner of the
 * profile is softened by `bevel`, so a hard corner in the profile still turns
 * out with a highlight on it.
 */
export function Turned({ profile, sides = roundSides(Math.max(...profile.map(([r]) => r))), bevel = BEVEL.round * 0.6, ...rest }: Solid & { profile: Point2[]; sides?: number; bevel?: number }) {
  const geometry = useShared(geometryKey('turned', profile.flat(), sides, bevel), () => fromMeshData(turnedMesh(profile, sides, bevel)))
  return <Inked geometry={geometry} {...rest} />
}

/**
 * A turned shape in stripes: `profile` turned on a lathe as `Turned` turns
 * it, its surface parted into `stripes` gores (an even number, 8 by default)
 * running from bottom to top in `color` and `stripe` by turns, a gore of
 * `color` centred on the front (`stripedMeshes`): a circus tent's canvas, a
 * parasol, an awning. One line round the whole shape, as thin as a `Turned`
 * part's; the colour change is the border between gores.
 */
export function Striped({
  profile,
  stripe,
  stripes = STRIPES.gores,
  sides = roundSides(Math.max(...profile.map(([r]) => r))),
  bevel = BEVEL.round * 0.6,
  color,
  at,
  rot,
  outline = true,
}: Solid & { profile: Point2[]; stripe: string; stripes?: number; sides?: number; bevel?: number }) {
  const key = geometryKey('striped', profile.flat(), sides, bevel, stripes)
  // Each is built once for every part of this shape, and shared.
  const parts = () => stripedMeshes(profile, sides, bevel, stripes)
  const whole = useShared(`${key}|whole`, () => fromMeshData(parts().whole))
  const first = useShared(`${key}|0`, () => fromMeshData(parts().gores[0]))
  const second = useShared(`${key}|1`, () => fromMeshData(parts().gores[1]))
  const line = useMemo(() => lineWidth(extentsOf(whole)), [whole])
  useRebatch(`striped|${whole.id}|${line}|${at}|${rot}|${outline}`)
  return (
    <group position={at} rotation={rot}>
      <Inked geometry={first} color={color} outline={false} />
      <Inked geometry={second} color={stripe} outline={false} />
      {outline && <mesh geometry={whole} material={outlineShellMaterial(line)} userData={BATCH} dispose={null} />}
    </group>
  )
}

/**
 * A roof standing on `at` (the middle of its underside), over walls `size`
 * [width, rise, depth], reaching `overhang` past them all round, with a
 * fascia board at the eaves. A gable's ridge runs left to right; `hip` slopes
 * on all four sides; `shed` (a lean-to) rises from the front to the back.
 * Gable and lean-to roofs get tile courses (`courses`, 0 for none) and a gable
 * gets a ridge cap (`ridge={false}` for none); the two are independent. A
 * gable roof given `gable` (the walls' colour) is built hollow, as two sloped
 * slabs, with a gable wall in that colour under them (`gableRoofParts`), so
 * its ends read as wall under the overhang rather than as solid roof.
 */
export function Roof({
  size,
  style = 'gable',
  overhang = 0.08,
  fascia = 0.06,
  bevel = BEVEL.round,
  courses,
  ridge = true,
  gable,
  color,
  at,
  rot,
  outline = true,
}: Solid & { size: Vec3; style?: RoofStyle; overhang?: number; fascia?: number; bevel?: number; courses?: number; ridge?: boolean; gable?: string }) {
  const parts = roofParts(style, size, overhang, fascia, bevel, courses, ridge)
  const open = gable !== undefined && style === 'gable'
  const geometry = useShared(geometryKey('roof', style, size, overhang, fascia, bevel, open), () =>
    fromMeshData(open ? gableRoofParts(size, overhang, fascia, bevel).slabs : parts.body),
  )
  // Hooks run whatever the props, so a roof without gable walls shares one empty attic.
  const attic = useShared(open ? geometryKey('attic', size, overhang, fascia, bevel) : 'attic|none', () =>
    open ? fromMeshData(gableRoofParts(size, overhang, fascia, bevel).attic) : emptyGeometry(),
  )
  useRebatch(`roof|${at}|${rot}`)
  return (
    <group position={at} rotation={rot}>
      <Inked geometry={geometry} color={color} outline={outline} />
      {open && <Inked geometry={attic} color={gable} outline={outline} />}
      {parts.tiles.map((tile, i) => (
        <Block key={i} size={tile.size} at={tile.at} rot={tile.rot} color={color} bevel={0.01} outline={outline} />
      ))}
      {parts.cap && <Block size={parts.cap.size} at={parts.cap.at} rot={parts.cap.rot} color={color} bevel={0.012} outline={outline} />}
    </group>
  )
}

/**
 * A soft rounded box centred on `at`: `size` [width, height, depth], its edges
 * and corners rounded off by `round`, from nearly square (0.15) to an
 * ellipsoid (1). One smooth shape with true normals, so it shades and outlines
 * as a single soft form: a doll's head and hair, a cushion, a character's body.
 * Its rounded edges catch the edge light. Drawn at a detail that suits its
 * size (`softSegments`).
 */
export function Rounded({ size, round = 0.4, ...rest }: Solid & { size: Vec3; round?: number }) {
  const { across, down } = softSegments(Math.max(0, ...size.map((s) => (Number.isFinite(s) ? s : 0))) / 2)
  const geometry = useShared(geometryKey('rounded', size, round, across, down), () => fromMeshData(roundedMesh(size, round, across, down)))
  return <Inked geometry={geometry} {...rest} />
}

/**
 * A hoop lying flat round the upright axis, its middle on `at`: a rail round
 * a gallery, the rim of a well, a lifebuoy. `radius` is from the axis to the
 * middle of its tube, `thickness` the tube's width. Round all over, so it
 * catches the edge light along its top.
 */
export function Ring({ radius, thickness, sides = 8, around, ...rest }: Solid & { radius: number; thickness: number; sides?: number; around?: number }) {
  const steps = around ?? roundSides(radius) + 8
  const geometry = useShared(geometryKey('ring', radius, thickness, sides, steps), () => fromMeshData(ringMesh(radius, thickness, sides, steps)))
  return <Inked geometry={geometry} {...rest} />
}

/**
 * A lattice girder standing on `at` (its base centre), `height` tall: a
 * crane's mast or jib, a pylon, a gantry. `sides` chords (3 to 8, a face to
 * the front) on a cross-section `width` across each face, braced by zigzag
 * diagonals in `bays` panels (about square by default) and a strut round each
 * end; every member a chamfered bar `bar` across (`trussMesh`). One mesh, so a
 * moving jib is one live part; its line is as thin as its bars, not as heavy
 * as its size.
 */
export function Truss({
  height,
  width,
  sides = 4,
  bays,
  bar = TRUSS.bar,
  ...rest
}: Solid & { height: number; width: number; sides?: number; bays?: number; bar?: number }) {
  const panels = bays ?? (width > 0 ? Math.round(height / width) : 1)
  const geometry = useShared(geometryKey('truss', height, width, sides, panels, bar), () => fromMeshData(trussMesh(height, width, sides, panels, bar)))
  const members = useMemo<Vec3>(() => [bar, bar, height], [bar, height])
  return <Inked geometry={geometry} members={members} {...rest} />
}

/** A geometry with nothing in it but the attributes a kit mesh has: what a part with no solid draws. */
function emptyGeometry(): BufferGeometry {
  return fromMeshData({ positions: new Float32Array(0), normals: new Float32Array(0), bevel: new Float32Array(0) })
}

/**
 * An extrusion of `shape`, `depth` deep and centred on z = 0, its edges
 * rounded by `bevel`, grown by `grow` all round (for its outline). The inputs
 * are made usable first (`cleanPlate`); a shape with no area or no depth, or
 * one three cannot extrude, gives an empty geometry rather than throwing.
 */
export function extrudedGeometry(shape: Point2[], depth: number, bevel: number, grow: number): BufferGeometry {
  const plate = cleanPlate(shape, depth, bevel)
  if (!plate) return emptyGeometry()
  const b = plate.bevel
  const core = Math.max(plate.depth - 2 * b, 1e-4)
  const out = Math.max(0, Number.isFinite(grow) ? grow : 0)
  try {
    const geometry = new ExtrudeGeometry(new Shape(plate.shape.map(([x, y]) => new Vector2(x, y))), {
      depth: core,
      bevelEnabled: true,
      bevelThickness: b + out,
      bevelSize: b,
      bevelOffset: -b + out,
      bevelSegments: 2,
      curveSegments: 1,
    })
    geometry.translate(0, 0, -core / 2)
    return markBevel(geometry, capOrWall)
  } catch {
    return emptyGeometry()
  }
}

/**
 * A flat shape given depth, centred on `at`: a star, a crown, an awning's
 * edge, a sign. `shape` is its outline in the XY plane, in order round it;
 * it faces +Z. Its edges are rounded by `bevel`. Its outline is a copy grown
 * by the outline's width, since its flat-shaded sides would crack a pushed one.
 */
export function Extruded({
  shape,
  depth,
  bevel = BEVEL.plate,
  color,
  at,
  rot,
  outline = true,
}: Solid & { shape: Point2[]; depth: number; bevel?: number }) {
  const key = geometryKey('extruded', shape.flat(), depth, bevel)
  const body = useShared(key, () => extrudedGeometry(shape, depth, bevel, 0))
  // Its line by its size, as every part's (`lineWidth`).
  const line = useMemo(() => lineWidth(extentsOf(body)), [body])
  const shell = useShared(`${key}|shell|${line}`, () => extrudedGeometry(shape, depth, bevel, line))
  useRebatch(`${body.id}|${color}|${at}|${rot}|${outline}`)
  return (
    <group position={at} rotation={rot}>
      <mesh geometry={body} material={celMaterial({ color }, 'kit')} userData={BATCH} dispose={null} />
      {outline && <mesh geometry={shell} material={outlineMaterial} userData={BATCH} dispose={null} />}
    </group>
  )
}

/** A unit sphere with `across` segments round and `down` from pole to pole, with no bevel on it. */
function sphere(across: number, down: number): BufferGeometry {
  const geometry = new SphereGeometry(1, across, down)
  geometry.setAttribute('aBevel', new BufferAttribute(new Float32Array(geometry.getAttribute('position').count), 1))
  return geometry
}

/**
 * A ball centred on `at`, stretched by `squash` on each axis: shrubs, heads,
 * knobs, clouds of foliage. It is drawn at a detail that suits its size
 * (`blobSegments`: a small one is 8 by 8). Its outline is a scaled shell
 * (`outlineScale`), the same width on every axis, and thinner on a small ball
 * (`lineWidth`).
 */
export function Blob({ radius, squash = [1, 1, 1], color, at, rot, outline = true }: Solid & { radius: number; squash?: Vec3 }) {
  // A ball with no size on some axis draws nothing: its shading would have no normals to work from.
  const size = blobAxes(radius, squash)
  const axes = size ? blobAxes(radius, squash, lineWidth(size.body.map((a) => a * 2))) : null
  const { across, down } = blobSegments(axes ? Math.max(...axes.body) : 0)
  const geometry = useShared(geometryKey('blob', across, down), () => sphere(across, down))
  useRebatch(`${geometry.id}|${color}|${axes?.body}|${at}|${rot}|${outline}`)
  if (!axes) return null
  return (
    <group position={at} rotation={rot}>
      <mesh geometry={geometry} material={celMaterial({ color }, 'kit')} scale={axes.body} userData={BATCH} dispose={null} />
      {outline && <mesh geometry={geometry} material={outlineMaterial} scale={axes.shell} userData={BATCH} dispose={null} />}
    </group>
  )
}

/**
 * A lamp, a lit sign or a screen, centred on `at`. By day it is switched off:
 * pale glass (`day`, the palette's glass by default). Through dusk it comes
 * on, and at night it glows in `color` (use `landmark.lit` for lamps),
 * brighter than white, into the bloom; it follows the look's `glow` as window
 * `Glass` does. `always` keeps it lit at every hour, brightening as the light
 * falls, for things that glow by day too (a neon sign, a screen). Windows are
 * `Glass`.
 */
export function Lit({
  size,
  color,
  day = landmark.glass,
  always = false,
  at,
  rot,
  outline = true,
}: Solid & { size: Vec3; day?: string; always?: boolean }) {
  const geometry = useShared(geometryKey('block', size, LIT_BEVEL), () => fromMeshData(blockMesh(size, LIT_BEVEL)))
  const material = always ? glowMaterial(color) : glassMaterial(day, day, color)
  useRebatch(`${geometry.id}|${material.id}|${at}|${rot}|${outline}`)
  return (
    <mesh geometry={geometry} material={material} position={at} rotation={rot} userData={BATCH} dispose={null}>
      {outline && <mesh geometry={geometry} material={outlineShellMaterial(lineWidth(size))} userData={BATCH} dispose={null} />}
    </mesh>
  )
}

/** A pane's small bevel. */
const GLASS_BEVEL = 0.01

/**
 * A window pane, centred on `at`: by day cool glass with the sky and one soft
 * highlight band in it, warming through dusk into the lit glow at night (as
 * `Lit`, it blooms then). `day` is the glass colour, `lit` the glow; both come
 * from the palette. For lamps and signs that should glow, use `Lit`.
 */
export function Glass({
  size,
  at,
  rot,
  day = landmark.glass,
  lit = landmark.lit,
  outline = true,
}: Placed & { size: Vec3; day?: string; lit?: string; outline?: boolean }) {
  const geometry = useShared(geometryKey('glass', size, GLASS_BEVEL), () => {
    const g = fromMeshData(blockMesh(size, GLASS_BEVEL))
    g.setAttribute('aPane', new BufferAttribute(paneCoords(g.getAttribute('position').array as Float32Array, [size[0], size[1]]), 2))
    return g
  })
  useRebatch(`${geometry.id}|${day}|${lit}|${at}|${rot}|${outline}`)
  return (
    <mesh geometry={geometry} material={glassMaterial(day, landmark.offWhite, lit)} position={at} rotation={rot} userData={BATCH} dispose={null}>
      {outline && <mesh geometry={geometry} material={outlineShellMaterial(lineWidth(size))} userData={BATCH} dispose={null} />}
    </mesh>
  )
}

/**
 * A beam of light from a lamp at `at`, running along its +Z (turn it with
 * `rot`): `length` long, `near` round at the lamp and `far` at its end, in
 * `color`. Soft-edged and fading along its length; a pale shaft by day and
 * brighter than white at night, so it blooms (`beamMaterial`). It has no
 * outline and is never batched. To sweep it, put it in a `Spin`.
 */
export function Beam({ length, near, far, color, sides = 16, at, rot }: Placed & { length: number; near: number; far: number; color: string; sides?: number }) {
  const geometry = useShared(geometryKey('beam', length, near, far, sides), () => {
    const data = beamMesh(length, near, far, sides)
    const g = fromMeshData(data)
    g.setAttribute('aAlong', new BufferAttribute(data.along, 1))
    return g
  })
  return <mesh geometry={geometry} material={beamMaterial(color)} position={at} rotation={rot} renderOrder={2} userData={LIGHT} dispose={null} />
}

/**
 * Rings of light going out from `at` (a mast's top): `rings` rings, one
 * leaving every few seconds, each growing steadily from nothing to `radius`
 * and fading in as it leaves and out to nothing before it reaches its full
 * size (`SIGNAL`, `signalMaterial`). Each ring faces the camera, so it reads
 * as a ring from every side; a soft pale light by day, glowing softly at
 * night, turning from `color` to `night` (the same by default) through dusk.
 * From the shared clock wrapped to one period (`tickClock`), so it
 * holds still under reduced motion. It is light, not solid: marked as such,
 * it is exempt from the footprint (its triangles still count). No outline,
 * never batched.
 */
export function Signal({ radius, color, night, rings = SIGNAL.rings, at }: { radius: number; color: string; night?: string; rings?: number; at?: Vec3 }) {
  // Keyed by the rings it draws, not those asked for, so counts past the cap share one geometry.
  const geometry = useShared(geometryKey('signal', radius, signalRings(rings)), () => {
    const data = signalMesh(radius, rings)
    const g = fromMeshData(data)
    g.setAttribute('aCorner', new BufferAttribute(data.corner, 2))
    g.setAttribute('aRing', new BufferAttribute(data.ring, 1))
    return g
  })
  useFrame(() => tickClock(SIGNAL.period))
  return <mesh geometry={geometry} material={signalMaterial(color, night)} position={at} renderOrder={2} userData={LIGHT} dispose={null} />
}

/**
 * Still water filling `shape` (its outline seen from above, as x and z
 * pairs; an oval from `ellipseOutline`, or any outline star-shaped about its
 * middle), its surface on `at`: a pond, a fountain's basin, a puddle. It
 * takes the look's sea colours, deeper in the middle and turning to the
 * shallows at the bank, with faint rings drifting across it (`waterMaterial`).
 * A `tint` (a palette or district colour) is mixed in for water that is not
 * the open sea, a garden pond's green. Set it in a rim of its own (stones, a
 * `Ring`, a turned basin); it has no outline and is never batched.
 */
export function Water({ shape, rings = 4, tint, at, rot }: Placed & { shape: Point2[]; rings?: number; tint?: string }) {
  const geometry = useShared(geometryKey('water', shape.flat(), rings), () => {
    const data = waterMesh(shape, rings)
    const g = fromMeshData(data)
    g.setAttribute('aEdge', new BufferAttribute(data.edge, 1))
    return g
  })
  // Its rings and arcs run from the shared clock wrapped to each one's period, so they stay smooth on a page left open for days.
  useFrame(() => {
    tickClock(WATER_PERIODS.rings)
    tickClock(WATER_PERIODS.drift)
  })
  return <mesh geometry={geometry} material={waterMaterial(tint)} position={at} rotation={rot} dispose={null} />
}

/**
 * A ball of fur or fluff centred on `at`: `radius` round, stretched by
 * `squash`, with `tufts` soft tufts standing out of it up to `depth` of its thinnest
 * radius. One smooth lumpy surface, so its outline runs unbroken round the
 * tufts and the cel shading picks out each one; their crests catch the edge
 * light. A round furry animal's body or head, a chick, a pompom.
 */
export function Tufted({ radius, squash = [1, 1, 1], tufts = 40, depth = 0.12, ...rest }: Solid & { radius: number; squash?: Vec3; tufts?: number; depth?: number }) {
  const widest = Math.max(0, ...squash.map((s) => (Number.isFinite(s) ? s : 0))) * (Number.isFinite(radius) ? Math.max(0, radius) : 0)
  const { across, down } = tuftSegments(widest, tufts)
  const geometry = useShared(geometryKey('tufted', radius, squash, tufts, depth, across, down), () => fromMeshData(tuftedMesh(radius, squash, tufts, depth, across, down)))
  return <Inked geometry={geometry} {...rest} />
}

/** One shade's bricks of a `Brickwork` wall, `index` of `shades`. */
function BrickShade({
  wall,
  brick,
  joint,
  depth,
  shades,
  index,
  openings,
  color,
}: {
  wall: [number, number]
  brick: [number, number]
  joint: number
  depth: number
  shades: number
  index: number
  openings: Opening[]
  color: string
}) {
  const geometry = useShared(geometryKey('bricks', wall, brick, joint, depth, shades, index, openings.flat()), () => {
    const course = brickCourses(wall[0], wall[1], brick, joint, depth, shades, openings)[index]
    return fromMeshData(course ?? { positions: new Float32Array(0), normals: new Float32Array(0), bevel: new Float32Array(0) })
  })
  return <Inked geometry={geometry} color={color} outline={false} />
}

/** The shades a brick wall is laid in, from its colour: as it is, a little deeper, a little paler. */
const brickShades = (color: string) => [color, blend(color, landmark.indigo, 0.12), blend(color, landmark.cream, 0.12)]

/**
 * A brick wall centred on `at`: `size` [width, height, thickness] of `mortar`,
 * with courses of bricks of `color` laid on its front face (and its back, with
 * `back`) in a running bond, each brick standing a little proud with a
 * bevelled edge that catches the light, in three shades of its colour
 * (`brickCourses`). `brick` is a brick's [length, height], `joint` the mortar
 * between them. `openings` are rectangles on its front face, [x, y, width,
 * height] round the wall's middle, that something stands over (a window, a
 * door, a poster): no brick is laid wholly inside one. The slab carries the
 * outline; the bricks draw none.
 */
export function Brickwork({
  size: [w, h, t],
  brick = [0.11, 0.045],
  joint = 0.012,
  depth = 0.01,
  openings = [],
  color,
  mortar,
  back = false,
  at,
  rot,
  outline = true,
}: Placed & { size: Vec3; brick?: [number, number]; joint?: number; depth?: number; openings?: Opening[]; color: string; mortar: string; back?: boolean; outline?: boolean }) {
  useRebatch(`brickwork|${at}|${rot}`)
  const shades = brickShades(color)
  const faces = back ? [1, -1] : [1]
  const thick = Number.isFinite(t) ? Math.max(0, t) : 0
  return (
    <group position={at} rotation={rot}>
      <Block size={[w, h, t]} color={mortar} bevel={Math.min(0.012, thick / 3)} outline={outline} />
      {faces.map((side) => (
        <group key={side} position={[0, 0, (side * thick) / 2]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          {shades.map((shade, i) => (
            <BrickShade key={i} wall={[w, h]} brick={brick} joint={joint} depth={depth} shades={shades.length} index={i} openings={side > 0 ? openings : []} color={shade} />
          ))}
        </group>
      ))}
    </group>
  )
}

/**
 * Rain falling from `at` (the top of its column): `count` soft streaks
 * `length` long through a column `radius` round and `fall` tall, at `speed`
 * model units a second (`rainMesh`, `rainMaterial`). Each streak turns to face
 * the camera and fades in at the top and out at the foot, so the rain never
 * flickers; it falls on the shared clock (wrapped to one fall, so it stays
 * smooth on a page left open for days), so it holds still under reduced
 * motion. `across` stretches the column's depth (z) as a share of its width:
 * an oval column under an oval cloud. Never batched; it is culled by a sphere
 * holding its whole column, and it says how far it carries its streaks, for
 * the check of where moving parts can reach.
 */
export function Rain({
  radius,
  fall,
  across = 1,
  count = 120,
  length = 0.14,
  speed = 1.6,
  seed = 1,
  at,
}: Placed & { radius: number; fall: number; across?: number; count?: number; length?: number; speed?: number; seed?: number }) {
  const streak = Math.min(Number.isFinite(length) ? Math.max(0, length) : 0, Number.isFinite(fall) ? Math.max(0, fall) : 0)
  const travel = rainTravel(fall, streak)
  const geometry = useShared(geometryKey('rain', count, radius, fall, streak, seed, across), () => {
    const data = rainMesh(count, radius, fall, streak, seed, across)
    const g = fromMeshData(data)
    g.setAttribute('aCorner', new BufferAttribute(data.corner, 2))
    g.setAttribute('aPhase', new BufferAttribute(data.phase, 1))
    // The streaks are drawn anywhere down the column, not where they rest: the sphere round the whole column.
    const column = rainColumn(radius, fall, across)
    g.boundingSphere = new Sphere(new Vector3(0, -column.half, 0), Math.hypot(column.round, column.half) + RAIN.width)
    return g
  })
  const material = rainMaterial(travel, RAIN.width, speed)
  const period = rainPeriod(travel, Number.isFinite(speed) ? Math.max(0, speed) : 0)
  useFrame(() => tickClock(period))
  // Frozen, as every motion marker: it carries each streak at most half its travel either way.
  const marker = useMemo(() => Object.freeze({ moving: true, motion: 'fall', reach: travel / 2 }), [travel])
  return (
    <group position={at}>
      <group userData={marker}>
        <mesh geometry={geometry} material={material} renderOrder={2} dispose={null} />
      </group>
    </group>
  )
}

/**
 * A grey rain cloud that never leaves, its base on `at`: puffs filling `size`
 * [width, height, depth], painted as the sky's own clouds are but heavier
 * (`stormCloudMaterial`), bobbing a little, with `Rain` falling `fall` from
 * just inside its base. Not batched and drawn with no outline, like the
 * clouds over the planet.
 */
export function RainCloud({ size: [w, h, d], fall, count = 350, at, rot }: Placed & { size: Vec3; fall: number; count?: number }) {
  const geometry = useShared(geometryKey('cloud', w, h, d), () => fromMeshData(puffCloudMesh(w, h, d)))
  const [width, height, depth] = [w, h, d].map((n) => (Number.isFinite(n) ? Math.max(0, n) : 0))
  const inside = height * 0.2
  // The rain falls from under the whole cloud: an oval column a little inside its puffs.
  const reach = width * RAIN.underCloud
  return (
    <group position={at} rotation={rot}>
      <Bob amount={0.015} speed={0.5}>
        <mesh geometry={geometry} material={stormCloudMaterial(landmark.slate)} dispose={null} />
      </Bob>
      <Rain at={[0, inside, 0]} radius={reach} across={width > 0 ? depth / width : 1} fall={fall + inside} count={count} />
    </group>
  )
}

/**
 * A place's weather (`place.weather`), its cloud's base on `at`, turned by
 * `rot`, `size` and `fall` as `RainCloud`'s: rain for `'rain'`, nothing for no
 * weather or a kind it does not know. Weather is content: a landmark passes
 * its place's field here, and a place that asks for rain gets it (the landmark
 * tests hold every place to the weather it asks for).
 */
export function Weather({ kind, ...rest }: Placed & { kind: Place['weather']; size: Vec3; fall: number; count?: number }) {
  return kind === 'rain' ? <RainCloud {...rest} /> : null
}

/** The planet's radius in model units, which the contact shadow bends to follow. */
const PLANET_RADIUS = 1 / MODEL_SCALE

/**
 * The soft shadow a landmark casts on the ground under it, `radius` model
 * units round (the footprint's by default): blue-violet by day, nearly gone at
 * night, fading to nothing at its edge. `Places` draws one under every
 * landmark; a model sets its own size, or none, with its `shadow` property
 * (see `LandmarkComponent` in registry.ts).
 */
export function ContactShadow({ radius = SHADOW.radius }: { radius?: number }) {
  const geometry = useShared(geometryKey('shadow', radius), () => {
    const disc = shadowDisc(radius, SHADOW.segments, PLANET_RADIUS)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(disc.positions, 3))
    g.setAttribute('uv', new BufferAttribute(disc.uvs, 2))
    g.setIndex(new BufferAttribute(disc.index, 1))
    return g
  })
  return <mesh geometry={geometry} material={contactShadowMaterial()} renderOrder={1} dispose={null} />
}

/* ───────────── composites ───────────── */

/** How a window is put together, in model units. */
const WINDOW = { border: 0.032, frameDepth: 0.05, pane: 0.02, bar: 0.022, sill: { height: 0.035, depth: 0.08, reach: 0.03 } }

/**
 * A framed window set on a wall: `at` is the middle of the opening on the
 * wall's surface and the window stands out toward its +Z. A frame, a pane of
 * `Glass` (sky by day, lit at night; `glass` is its night glow), glazing bars
 * (`bars`: a cross, or none) and a sill. `border` is the frame's width round
 * the pane (slimmer for a cottage's small windows).
 */
export function Window({
  size: [w, h],
  at,
  rot,
  frame = landmark.offWhite,
  glass = landmark.lit,
  bars = true,
  sill = true,
  border = WINDOW.border,
}: Placed & { size: [number, number]; frame?: string; glass?: string; bars?: boolean; sill?: boolean; border?: number }) {
  useRebatch(`window|${at}|${rot}`)
  const { frameDepth, pane, bar } = WINDOW
  const front = frameDepth - 0.01
  return (
    <group position={at} rotation={rot}>
      <Block size={[w + 2 * border, h + 2 * border, frameDepth]} at={[0, 0, frameDepth / 2 - 0.01]} color={frame} bevel={0.014} />
      <Glass size={[w, h, pane]} at={[0, 0, front]} lit={glass} />
      {bars && (
        <>
          <Block size={[bar, h, pane]} at={[0, 0, front + pane / 2]} color={frame} bevel={0.008} outline={false} />
          <Block size={[w, bar, pane]} at={[0, h * 0.12, front + pane / 2]} color={frame} bevel={0.008} outline={false} />
        </>
      )}
      {sill && (
        <Block
          size={[w + 2 * border + 2 * WINDOW.sill.reach, WINDOW.sill.height, WINDOW.sill.depth]}
          at={[0, -h / 2 - border - WINDOW.sill.height / 2 + 0.008, WINDOW.sill.depth / 2 - 0.01]}
          color={frame}
          bevel={0.012}
        />
      )}
    </group>
  )
}

/** How a door is put together, in model units. */
const DOOR = { border: 0.036, frameDepth: 0.05, slab: 0.03, step: { height: 0.045, depth: 0.13, reach: 0.05 } }

/**
 * A panelled door in a frame, with a knob and a step: `at` is the middle of
 * its threshold on the wall's surface, and it stands out toward its +Z.
 * `border` is the frame's width round the door (slimmer for a cottage).
 */
export function Door({
  size: [w, h],
  at,
  rot,
  color,
  frame = landmark.offWhite,
  knob = landmark.gold,
  step = landmark.stone,
  border = DOOR.border,
}: Placed & { size: [number, number]; color: string; frame?: string; knob?: string; step?: string; border?: number }) {
  useRebatch(`door|${at}|${rot}`)
  const { frameDepth, slab } = DOOR
  const face = frameDepth - 0.012 + slab / 2
  const panel: Vec3 = [w * 0.62, h * 0.3, 0.012]
  return (
    <group position={at} rotation={rot}>
      <Block size={[w + 2 * border, h + border, frameDepth]} at={[0, (h + border) / 2, frameDepth / 2 - 0.01]} color={frame} bevel={0.014} />
      <Block size={[w, h, slab]} at={[0, h / 2, frameDepth - 0.012]} color={color} bevel={0.01} />
      {[0.29, 0.69].map((y) => (
        <Block key={y} size={panel} at={[0, h * y, face]} color={color} bevel={0.005} />
      ))}
      <Blob radius={0.02} at={[w * 0.32, h * 0.48, face + 0.012]} color={knob} />
      <Block
        size={[w + 2 * border + 2 * DOOR.step.reach, DOOR.step.height, DOOR.step.depth]}
        at={[0, DOOR.step.height / 2, DOOR.step.depth / 2]}
        color={step}
        bevel={0.014}
      />
    </group>
  )
}

/**
 * A street lamp standing on `at` (its foot), `height` tall to the top of its
 * cap: a slim tapering post in `color`, a lantern `lantern` wide (`Lit`, off by
 * day and glowing `glow` at night) and a flat cap over it; with `foot`, it
 * stands on a square block of that colour (`streetLampParts`). Too short for
 * its lantern and cap, it draws nothing.
 */
export function StreetLamp({
  height,
  color,
  lantern = STREET_LAMP.lantern,
  foot,
  glow = landmark.lit,
  at,
  rot,
}: Placed & { height: number; color: string; lantern?: number; foot?: string; glow?: string }) {
  // Only a colour gives it a foot: an empty or missing one stands the post on the ground.
  const parts = streetLampParts(height, lantern, Boolean(foot))
  if (!parts) return null
  const { post, lantern: light, cap } = parts
  return (
    <group position={at} rotation={rot}>
      {parts.foot && foot && <Block size={parts.foot.size} at={parts.foot.at} color={foot} bevel={parts.foot.size[1] * 0.25} />}
      <Tube bottom={post.bottom} top={post.top} height={post.height + 0.002} at={post.at} sides={8} bevel={post.top * 0.4} color={color} />
      <Lit size={light.size} at={light.at} color={glow} />
      <Block size={cap.size} at={cap.at} color={color} bevel={cap.size[1] * 0.35} />
    </group>
  )
}

/* ───────────── pictures ───────────── */

/** The sharpest a picture's texture is filtered at a slant. */
const MAX_ANISOTROPY = 8
/**
 * A lit picture's brightness, a hair under its own colours: deliberately, so
 * a white texel (1.0) sits just under the bloom's threshold instead of exactly
 * on it, and a backlit poster reads at night without blooming.
 */
const LIT_PICTURE = 0.95

/**
 * A real image on a surface, centred on `at`, facing its +Z: capsule art on a
 * billboard, a painting on an easel. It takes the light like paint; `lit`
 * makes it a backlit sign that keeps its brightness at night. Until the image
 * arrives, or if it never does, a neutral plate stands in; nothing else waits
 * for it.
 */
export function Picture({ src, size, at, rot, lit = false }: Placed & { src: string; size: [number, number]; lit?: boolean }) {
  const [w, h] = size.map((n) => (Number.isFinite(n) ? Math.max(0, n) : 0))
  const gl = useThree((state) => state.gl)
  const [texture, setTexture] = useState<Texture | null>(null)
  useEffect(() => {
    let live = true
    let loaded: Texture | null = null
    new TextureLoader().load(
      src,
      (t) => {
        t.colorSpace = SRGBColorSpace
        t.anisotropy = Math.min(MAX_ANISOTROPY, gl.capabilities.getMaxAnisotropy())
        loaded = t
        if (live) setTexture(t)
        else t.dispose()
      },
      undefined,
      // A missing image leaves the plate in place.
      () => undefined,
    )
    return () => {
      live = false
      loaded?.dispose()
      setTexture(null)
    }
  }, [src, gl])
  const material = useMemo<Material | null>(
    () => (texture ? (lit ? new MeshBasicMaterial({ map: texture, color: new Color().setScalar(LIT_PICTURE) }) : pictureMaterial(texture)) : null),
    [texture, lit],
  )
  useEffect(() => () => material?.dispose(), [material])
  const plane = useShared(geometryKey('plane', w, h), () => new PlaneGeometry(w, h))
  return (
    <mesh geometry={plane} material={material ?? celMaterial({ color: landmark.stone })} position={at} rotation={rot} dispose={null} />
  )
}

/* ───────────── motion ───────────── */

/*
 * Motion runs from the shared clock, `lookUniforms.time`, which stands still
 * under reduced motion, so everything that moves holds still with it. Each
 * helper turns or moves its children about its own origin, put at `at`.
 */

interface Moving {
  children: ReactNode
  /** Where the pivot goes. */
  at?: Vec3
  /** Radians a second. */
  speed?: number
}

/** Floats its children up and down by `amount`. */
export function Bob({ children, at, amount = 0.05, speed = 1.6, phase = 0 }: Moving & { amount?: number; phase?: number }) {
  const ref = useRef<Group>(null)
  // Moving the pivot moves what is inside: the batch takes its parts' new heights.
  useRebatch(`motion|${at}`)
  useFrame(() => {
    if (ref.current) ref.current.position.y = wave(lookUniforms.time.value, amount, speed, phase)
  })
  // It says how far it carries its parts, for the check of where moving parts can reach. Frozen, as `MOVING`.
  const marker = useMemo(() => Object.freeze({ ...MOVING, reach: Math.abs(Number.isFinite(amount) ? amount : 0) }), [amount])
  return (
    <group position={at}>
      <group ref={ref} userData={marker}>{children}</group>
    </group>
  )
}

/** Turns its children steadily about their upright axis. */
export function Spin({ children, at, speed = 0.8 }: Moving) {
  const ref = useRef<Group>(null)
  // Moving the pivot moves what is inside: the batch takes its parts' new heights.
  useRebatch(`motion|${at}`)
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = spinAngle(lookUniforms.time.value, speed)
  })
  return (
    <group position={at}>
      <group ref={ref} userData={TURNING.y}>{children}</group>
    </group>
  )
}

/** Rocks its children `amount` radians either way about `axis`: a flag, a tail, a hanging sign. */
export function Sway({
  children,
  at,
  amount = 0.15,
  speed = 1.4,
  phase = 0,
  axis = 'z',
}: Moving & { amount?: number; phase?: number; axis?: 'x' | 'y' | 'z' }) {
  const ref = useRef<Group>(null)
  // Moving the pivot moves what is inside: the batch takes its parts' new heights.
  useRebatch(`motion|${at}`)
  useFrame(() => {
    if (ref.current) ref.current.rotation[axis] = wave(lookUniforms.time.value, amount, speed, phase)
  })
  return (
    <group position={at}>
      <group ref={ref} userData={TURNING[axis]}>{children}</group>
    </group>
  )
}

/** A `Flag`'s emblem, built only for a flag that has one: proud of the cloth by as much as its wave needs (`emblemLift`). */
function Emblem({ pieces, color, width, height, wave }: { pieces: Point2[][]; color: string; width: number; height: number; wave: ReturnType<typeof clothWave> }) {
  const lift = emblemLift(wave.amplitude)
  const painted = useShared(geometryKey('emblem', width, height, lift, pieces.flat(2)), () => fromMeshData(emblemMesh(pieces, width, height, lift)))
  return <mesh geometry={painted} material={clothMaterial(color, wave)} frustumCulled={false} dispose={null} />
}

/**
 * A flag of cloth flying from a pole: `at` is the top of its hoist (where it
 * meets the pole), and the cloth, `size` [width, height], runs out along its
 * +X and hangs down. One thin slab rippled in its vertex shader (`clothMesh`,
 * `clothMaterial`): still at the hoist, waves running out to the fly end
 * `amount` of its width deep at `speed`, from the shared clock (wrapped to one
 * ripple, `tickClock`), so it holds still under reduced motion. `taper` (0 to
 * 1) narrows it toward the fly end, 1 to a point: a pennant. Its outline is a grown copy that ripples with
 * it. It stays live (never batched).
 *
 * An `emblem` is painted on both faces in its own colour: `pieces`, outlines
 * round the cloth's middle, each star-shaped about its own middle (a convex
 * piece always is; build a ring or an arc from several), rippling with the
 * cloth point for point (`emblemMesh`). Plain shapes: never words or letters.
 */
export function Flag({
  size: [width, height],
  color,
  amount = 0.06,
  speed = 1.8,
  taper = 0,
  emblem,
  at,
  rot,
  outline = true,
}: Placed & { size: [number, number]; color: string; amount?: number; speed?: number; taper?: number; emblem?: { pieces: Point2[][]; color: string }; outline?: boolean }) {
  const wave = clothWave(width, amount, speed)
  const line = lineWidth([width, height, CLOTH.thickness])
  const narrow = Number.isFinite(taper) ? Math.min(1, Math.max(0, taper)) : 0
  const body = useShared(geometryKey('cloth', width, height, 0, narrow), () => fromMeshData(clothMesh(width, height, CLOTH.columns, 0, narrow)))
  const shell = useShared(geometryKey('cloth', width, height, line, narrow), () => fromMeshData(clothMesh(width, height, CLOTH.columns, line, narrow)))
  // It says how far its ripple carries the cloth out of its plane (the shader's own limit), for the check of where moving parts can reach.
  const marker = useMemo(() => Object.freeze({ moving: true, motion: 'cloth', reach: wave.amplitude }), [wave.amplitude])
  // Its ripple runs from the shared clock wrapped to one period, so it stays smooth on a page left open for days.
  const period = clothPeriod(wave)
  useFrame(() => tickClock(period))
  // It bends out of its bounds as it ripples, so it is never culled for leaving them.
  return (
    <group position={at} rotation={rot}>
      <group userData={marker}>
        <mesh geometry={body} material={clothMaterial(color, wave)} frustumCulled={false} dispose={null} />
        {emblem && emblem.pieces.length > 0 && <Emblem pieces={emblem.pieces} color={emblem.color} width={width} height={height} wave={wave} />}
        {outline && <mesh geometry={shell} material={clothOutlineMaterial(wave)} frustumCulled={false} dispose={null} />}
      </group>
    </group>
  )
}

/** A flame's paler core: its size as shares of the flame's, and how far it stands forward of the flame's axis (of its radius), so it shows at the front. */
const FLAME_CORE = { radius: 0.6, height: 0.62, forward: 0.6, lift: 0.04 }

/** The lathe for a flame `radius` wide and `height` tall (`flameProfile`), or nothing. */
function flameGeometry(radius: number, height: number): BufferGeometry {
  const profile = flameProfile(radius, height)
  return profile.length ? fromMeshData(turnedMesh(profile, 12, Math.min(radius, height) * 0.15)) : emptyGeometry()
}

/**
 * A flame standing on `at` (its foot): a teardrop of light `radius` wide and
 * `height` tall in `color`, with a paler `core` glowing at its front, always
 * lit and brightening as the light falls, as a lamp that is always lit does.
 * It breathes, slowly and gently (`FLAME`, `flameBreath`): once every three
 * seconds its size swells and settles by a few percent and its glow by
 * under a tenth, never a flicker or a flash (WCAG 2.3.1); from the shared
 * clock wrapped to its period (`tickClock`), so it holds still under reduced
 * motion. Light, not solid: marked as such, it is exempt from the footprint
 * (its triangles still count). No outline, never batched.
 */
export function Flame({ radius, height, color, core, at, rot }: Placed & { radius: number; height: number; color: string; core?: string }) {
  const outer = useShared(geometryKey('flame', radius, height), () => flameGeometry(radius, height))
  const inner = useShared(geometryKey('flame', radius * FLAME_CORE.radius, height * FLAME_CORE.height), () =>
    flameGeometry(radius * FLAME_CORE.radius, height * FLAME_CORE.height),
  )
  const ref = useRef<Group>(null)
  useFrame(() => {
    tickClock(FLAME.period)
    const breath = flameBreath(clock(FLAME.period).value)
    flameUniforms.breath.value = breath.glow
    ref.current?.scale.set(breath.width, breath.height, breath.width)
  })
  // It says how far its breath carries it (a share of its height), for the check of where moving parts can reach.
  const reach = (Number.isFinite(height) ? Math.max(0, height) : 0) * FLAME.size
  const marker = useMemo(() => Object.freeze({ moving: true, motion: 'breathe', reach }), [reach])
  const r = Number.isFinite(radius) ? Math.max(0, radius) : 0
  const h = Number.isFinite(height) ? Math.max(0, height) : 0
  return (
    <group position={at} rotation={rot}>
      <group ref={ref} userData={marker}>
        <mesh geometry={outer} material={flameMaterial(color)} userData={LIGHT} dispose={null} />
        {core && <mesh geometry={inner} material={flameMaterial(core)} position={[0, h * FLAME_CORE.lift, r * FLAME_CORE.forward]} userData={LIGHT} dispose={null} />}
      </group>
    </group>
  )
}

/**
 * Drops its children `fall` straight down on a slow loop (`DROP`,
 * `dropPose`): they rest whole at the top, fall smoothly the whole way,
 * shrink to nothing at the foot, go back to the top while hidden and grow
 * again from nothing, so it never pops: a coin into a money box's slot. Build
 * the children round the top of the fall, at `at`; put its foot where
 * something hides them. From the shared clock, so it holds still under
 * reduced motion, resting whole at the top.
 */
export function Drop({ children, at, fall }: { children: ReactNode; at?: Vec3; fall: number }) {
  const ref = useRef<Group>(null)
  const depth = Number.isFinite(fall) ? Math.max(0, fall) : 0
  // Moving the pivot moves what is inside: the batch takes its parts' new heights.
  useRebatch(`motion|${at}`)
  useFrame(() => {
    const group = ref.current
    if (!group) return
    const pose = dropPose(lookUniforms.time.value)
    group.position.y = -depth * pose.down
    group.scale.setScalar(Math.max(pose.scale, 1e-3))
    group.visible = pose.scale > 1e-3
  })
  // It says how far down it carries its parts, for the check of where moving parts can reach. Frozen, as `MOVING`.
  const marker = useMemo(() => Object.freeze({ moving: true, motion: 'drop', reach: depth }), [depth])
  return (
    <group position={at}>
      <group ref={ref} userData={marker}>{children}</group>
    </group>
  )
}

/* ───────────── the footprint check ───────────── */

/** What was last reported for each landmark, so a check that finds nothing new says nothing. */
const reported = new Map<string, string>()

/**
 * The development check of a landmark (`root`, in its own model units): warns
 * if any solid part of it (light, such as a `Beam`, is exempt) leaves its footprint (`radius` round, the place's allowed
 * radius, and 2.6 tall), and logs how many triangles it draws, warning above
 * the budget (`TRIANGLE_BUDGET`). It speaks only when the result differs from
 * what it last said for `name`, so a landmark is reported once per change,
 * however often the check runs. `Batched` runs it after every merge in
 * development; production never does.
 */
export function checkFootprint(root: Object3D, name: string, radius: number = FOOTPRINT.radius): void {
  root.updateWorldMatrix(true, true)
  const toLocal = root.matrixWorld.clone().invert()
  const v = new Vector3()
  let outside: Vector3 | null = null
  root.traverse((object) => {
    const mesh = object as Mesh
    // Light (a beam) is not solid: only solid geometry is held to the footprint.
    if (outside || !mesh.isMesh || mesh.userData.light) return
    const position = mesh.geometry.getAttribute('position')
    for (let i = 0; i < position.count && !outside; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toLocal)
      if (!withinFootprint(v, radius)) outside = v.clone()
    }
  })
  const triangles = Math.round(triangleCount(root))
  const where = outside ? (outside as Vector3).toArray().map((n) => n.toFixed(2)) : null
  const summary = `${triangles}|${where}|${radius}`
  if (reported.get(name) === summary) return
  reported.set(name, summary)
  if (where) console.warn(`The ${name} landmark leaves its footprint (${radius.toFixed(2)} round) at`, where)
  if (triangles > TRIANGLE_BUDGET) console.warn(`The ${name} landmark draws ${triangles} triangles, over the budget of ${TRIANGLE_BUDGET}`)
  else console.info(`The ${name} landmark draws ${triangles} triangles (budget ${TRIANGLE_BUDGET})`)
}

/* ───────────── batching ───────────── */

/**
 * For a moving part whose geometry `batchStatic` has replaced with a copy
 * carrying heights: the copy, and the geometry it was made from. Kept here,
 * never on the mesh's `userData`, which react-three-fiber shares between
 * every kit mesh.
 */
const liftedFrom = new WeakMap<Mesh, { original: BufferGeometry; copy: BufferGeometry }>()

/** The geometry a part was given: the original behind a lifted copy, or what it has now if it was given another since. */
function ownGeometry(mesh: Mesh): BufferGeometry {
  const lifted = liftedFrom.get(mesh)
  return lifted && mesh.geometry === lifted.copy ? lifted.original : mesh.geometry
}

/** A copy of `geometry` with only what the kit's materials read, carried by `matrix`. */
function baked(geometry: BufferGeometry, matrix: Matrix4): BufferGeometry {
  const out = new BufferGeometry()
  const count = geometry.getAttribute('position').count
  out.setAttribute('position', geometry.getAttribute('position').clone())
  out.setAttribute('normal', geometry.getAttribute('normal').clone())
  // Every merged geometry has the same attributes, or they cannot be merged.
  const bevel = geometry.getAttribute('aBevel')
  out.setAttribute('aBevel', bevel ? bevel.clone() : new BufferAttribute(new Float32Array(count), 1))
  const pane = geometry.getAttribute('aPane')
  out.setAttribute('aPane', pane ? pane.clone() : new BufferAttribute(new Float32Array(count * 2), 2))
  // Everything indexed, so shared vertices stay shared once merged.
  out.setIndex(geometry.index ? geometry.index.clone() : Array.from({ length: count }, (_, i) => i))
  out.applyMatrix4(matrix)
  out.setAttribute('aHeight', heights(out))
  return out
}

/** Each vertex's height in the landmark's space, for the painted gradient: the y of positions already in that space. */
function heights(geometry: BufferGeometry): BufferAttribute {
  const position = geometry.getAttribute('position')
  const out = new Float32Array(position.count)
  for (let i = 0; i < position.count; i++) out[i] = position.getY(i)
  return new BufferAttribute(out, 1)
}

/** A moving part's own copy of its geometry, with its heights in the landmark's space where it stands now. */
function withHeights(geometry: BufferGeometry, matrix: Matrix4): BufferGeometry {
  const copy = geometry.clone()
  const placed = geometry.clone().applyMatrix4(matrix)
  copy.setAttribute('aHeight', heights(placed))
  placed.dispose()
  return copy
}

/**
 * Merges the still kit meshes under `root` into one mesh per material, in
 * `root`'s own space, and hides the originals: a landmark of a hundred parts
 * and their outlines draws in about a dozen calls. Moving groups and anything
 * not flagged as a kit part (a picture) are left as they are. Every kit vertex
 * gets its height in the landmark (`aHeight`) for the painted gradient, moving
 * parts included. `undo` shows the originals again and frees what it made.
 */
export function batchStatic(root: Object3D): { meshes: Mesh[]; undo(): void } {
  root.updateWorldMatrix(true, true)
  const toRoot = root.matrixWorld.clone().invert()
  const byMaterial = new Map<Material, BufferGeometry[]>()
  const hidden: Mesh[] = []
  // Moving parts stay as they are, but take their height in the landmark for the painted gradient.
  const lifted: Array<{ mesh: Mesh; original: BufferGeometry; copy: BufferGeometry }> = []
  const lift = (object: Object3D) =>
    object.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh || !mesh.userData.batch) return
      const original = ownGeometry(mesh)
      const copy = withHeights(original, new Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld))
      lifted.push({ mesh, original, copy })
      liftedFrom.set(mesh, { original, copy })
      mesh.geometry = copy
    })
  const visit = (object: Object3D) => {
    if (object.userData.moving) {
      lift(object)
      return
    }
    const mesh = object as Mesh
    if (mesh.isMesh && mesh.userData.batch && mesh.visible && !Array.isArray(mesh.material)) {
      const material = mesh.material as Material
      const list = byMaterial.get(material) ?? []
      list.push(baked(mesh.geometry, new Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld)))
      byMaterial.set(material, list)
      hidden.push(mesh)
    }
    for (const child of object.children) visit(child)
  }
  visit(root)

  const meshes: Mesh[] = []
  for (const [material, list] of byMaterial) {
    const merged = mergeGeometries(list)
    for (const g of list) g.dispose()
    if (!merged) continue
    const mesh = new Mesh(merged, material)
    mesh.userData.batched = true
    meshes.push(mesh)
    root.add(mesh)
  }
  for (const mesh of hidden) mesh.visible = false
  return {
    meshes,
    undo() {
      for (const mesh of meshes) {
        root.remove(mesh)
        mesh.geometry.dispose()
      }
      for (const mesh of hidden) mesh.visible = true
      for (const { mesh, original, copy } of lifted) {
        // If the part has been given a new geometry since, that one stays.
        if (mesh.geometry === copy) mesh.geometry = original
        if (liftedFrom.get(mesh)?.copy === copy) liftedFrom.delete(mesh)
        copy.dispose()
      }
    },
  }
}

/** Rounds a matrix's numbers, so float noise does not count as a move. */
const matrixKey = (m: Matrix4) => m.elements.map((e) => Math.round(e * 1e5)).join(',')

/**
 * What a batch was made from: every kit part under `root` (not the merged
 * copies), the geometry it was given and its material, and where it stands in
 * the landmark. For a part inside a moving group, where it stands is its place
 * with the motion itself taken out (the moving group's own turn or bob), so
 * moving its pivot counts as a change but the motion does not.
 */
export function batchSignature(root: Object3D): string {
  root.updateWorldMatrix(true, true)
  const toRoot = root.matrixWorld.clone().invert()
  const parts: string[] = []
  const visit = (object: Object3D, motion: Object3D | null) => {
    const inMotion = motion ?? (object.userData.moving ? object : null)
    const mesh = object as Mesh
    if (mesh.isMesh && mesh.userData.batch && !mesh.userData.batched) {
      const material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.id).join('+') : mesh.material.id
      const place = new Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld)
      if (inMotion) {
        // Where the part is within its moving group, carried to where that group's pivot stands.
        const within = new Matrix4().multiplyMatrices(inMotion.matrixWorld.clone().invert(), mesh.matrixWorld)
        const pivot = inMotion.parent ? inMotion.parent.matrixWorld : new Matrix4()
        place.multiplyMatrices(toRoot, pivot).multiply(within)
      }
      parts.push(`${mesh.id}:${ownGeometry(mesh).id}:${material}:${matrixKey(place)}`)
    }
    for (const child of object.children) if (!child.userData.batched) visit(child, inMotion)
  }
  visit(root, null)
  return parts.join(';')
}

/**
 * Keeps a landmark's still parts batched (`batchStatic`) as they change. Call
 * `invalidate` when a part is added, removed or changed: after the current
 * task it compares what the parts are now with what was merged, and if they
 * differ, undoes the old merge and merges again. `dispose` undoes it for good.
 */
export class Batcher {
  private batch: { meshes: Mesh[]; undo(): void } | null = null
  private signature = ''
  private queued = false
  private live = true

  constructor(
    private readonly root: Object3D,
    private readonly onMerge?: (root: Object3D) => void,
  ) {}

  invalidate(): void {
    if (this.queued || !this.live) return
    this.queued = true
    queueMicrotask(() => {
      this.queued = false
      if (this.live) this.refresh()
    })
  }

  /** Merges again if the parts have changed since the last merge. */
  refresh(): void {
    const signature = batchSignature(this.root)
    if (this.batch && signature === this.signature) return
    this.batch?.undo()
    this.batch = batchStatic(this.root)
    this.signature = signature
    this.onMerge?.(this.root)
  }

  dispose(): void {
    this.live = false
    this.batch?.undo()
    this.batch = null
    this.signature = ''
  }
}

/** Lets a part tell the landmark it stands in that it has been added, changed or removed. */
const BatchContext = createContext<() => void>(() => undefined)

/**
 * Tells the enclosing `Batched` to look again whenever `key` (what the part
 * draws and where) changes, and when the part mounts or unmounts.
 */
function useRebatch(key: string): void {
  const invalidate = useContext(BatchContext)
  useLayoutEffect(() => {
    invalidate()
    return invalidate
  }, [invalidate, key])
}

/**
 * Holds a landmark and keeps its still parts batched (`Batcher`), following
 * them as they are added, changed or removed (so editing a landmark under
 * Fast Refresh shows the edit, not a stale copy). Given a `name` (and the
 * place's allowed `radius`), it checks the landmark after every merge in
 * development (`checkFootprint`). Anything that
 * moves goes in `Bob`, `Spin` or `Sway`, which stay live.
 */
export function Batched({ name, radius, children }: { name?: string; radius?: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const batcher = useRef<Batcher | null>(null)
  const invalidate = useCallback(() => batcher.current?.invalidate(), [])
  useLayoutEffect(() => {
    if (!ref.current) return
    // In development, check the landmark after every merge (see `checkFootprint`).
    const check = name && process.env.NODE_ENV !== 'production' ? (root: Object3D) => checkFootprint(root, name, radius) : undefined
    const current = new Batcher(ref.current, check)
    batcher.current = current
    current.invalidate()
    return () => {
      current.dispose()
      batcher.current = null
    }
  }, [name, radius])
  return (
    <BatchContext.Provider value={invalidate}>
      <group ref={ref}>{children}</group>
    </BatchContext.Provider>
  )
}
