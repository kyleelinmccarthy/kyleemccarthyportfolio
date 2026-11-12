import { Color, Matrix3, Matrix4, Vector3 } from 'three'
import { landmark, scatter } from '@/content/sky'
import type { District } from '@/content/types'
import { MODEL_SCALE } from './camera'
import { surfaceFrame } from './geo'
import { OUTLINE, SHADOW, blend, chamferedBox, revolve, roofCorners, roundedHull, shadowDisc, softProfile, type MeshData, type SoftProfile } from './kit'
import { mulberry32 } from './rng'
import { BUILDING, ROOFTOP, reachOf, type Building, type Tree } from './scatter'
import { heightAt } from './terrain'

/**
 * The shapes of the scatter's trees and background buildings, and the whole
 * scatter merged into a few meshes on the planet. Pure maths: three's maths
 * classes and the kit's geometry, nothing that draws.
 *
 * A tree or a building is built in model units, as a landmark is (ground at
 * y = 0, +Y up, +Z its front), in the kit's look: soft bevels that catch the
 * light, normals that run on round every edge so an outline pushed out along
 * them stays even, and a colour on every vertex.
 */

/** One tree's or building's solid surface, in its own model units. */
export interface LocalMesh {
  position: Float32Array
  normal: Float32Array
  /** Linear colour per vertex. */
  color: Float32Array
  /** 1 on a rounded edge, 0 on a face: where the kit material lifts the edge light. */
  bevel: Float32Array
  index: Uint32Array
}

/** Window panes: positions, each vertex's place across its pane from -1 to 1 (`aPane`), and triangles. */
export interface PaneMesh {
  position: Float32Array
  pane: Float32Array
  index: Uint32Array
}

/* ───────────── building up a mesh ───────────── */

class MeshBuilder {
  position: number[] = []
  normal: number[] = []
  color: number[] = []
  bevel: number[] = []
  index: number[] = []
  private readonly p = new Vector3()
  private readonly n = new Vector3()
  private readonly normals = new Matrix3()

  /** Adds `mesh` moved by `matrix` (no scale), every vertex `colour` (or its own colour, by vertex). */
  add(mesh: MeshData, matrix: Matrix4, colour: Color | ((vertex: number) => Color)): void {
    const base = this.position.length / 3
    this.normals.getNormalMatrix(matrix)
    const count = mesh.positions.length / 3
    for (let i = 0; i < count; i++) {
      this.p.fromArray(mesh.positions, i * 3).applyMatrix4(matrix)
      this.n.fromArray(mesh.normals, i * 3).applyMatrix3(this.normals).normalize()
      const c = typeof colour === 'function' ? colour(i) : colour
      this.position.push(this.p.x, this.p.y, this.p.z)
      this.normal.push(this.n.x, this.n.y, this.n.z)
      this.color.push(c.r, c.g, c.b)
      this.bevel.push(mesh.bevel[i] ?? 0)
    }
    if (mesh.index) for (const i of mesh.index) this.index.push(base + i)
    else for (let i = 0; i < count; i++) this.index.push(base + i)
  }

  done(): LocalMesh {
    return {
      position: new Float32Array(this.position),
      normal: new Float32Array(this.normal),
      color: new Float32Array(this.color),
      bevel: new Float32Array(this.bevel),
      index: new Uint32Array(this.index),
    }
  }
}

const at = (x: number, y: number, z: number) => new Matrix4().makeTranslation(x, y, z)
const linear = (hex: string) => new Color(hex)

/** Smooth normals for an indexed mesh: each vertex's faces' normals, weighted by their area. */
function vertexNormals(position: Float32Array, index: Uint32Array): Float32Array {
  const normals = new Float32Array(position.length)
  const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()]
  for (let i = 0; i < index.length; i += 3) {
    a.fromArray(position, index[i] * 3)
    b.fromArray(position, index[i + 1] * 3)
    c.fromArray(position, index[i + 2] * 3)
    const n = b.sub(a).cross(c.sub(a))
    for (let k = 0; k < 3; k++) {
      const v = index[i + k] * 3
      normals[v] += n.x
      normals[v + 1] += n.y
      normals[v + 2] += n.z
    }
  }
  for (let v = 0; v < normals.length; v += 3) {
    const l = Math.hypot(normals[v], normals[v + 1], normals[v + 2])
    // A vertex no face touches (none here) would keep a zero normal; point it up rather than leave the shader a zero to normalise.
    if (l > 1e-12) for (let k = 0; k < 3; k++) normals[v + k] /= l
    else normals.set([0, 1, 0], v)
  }
  return normals
}

/* ───────────── a round sphere to shape canopies from ───────────── */

const ICOSAHEDRON = (() => {
  const t = (1 + Math.sqrt(5)) / 2
  const corners = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
    [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(([x, y, z]) => new Vector3(x, y, z).normalize())
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ]
  return { corners, faces }
})()

const sphereCache = new Map<number, { dirs: Vector3[]; index: Uint32Array }>()

/**
 * Directions over a sphere, evenly: an icosahedron with each face cut into
 * `cuts` x `cuts` triangles, every vertex shared by the faces round it (so
 * normals run on smoothly), wound outward. 20 x cuts² triangles.
 */
export function sphereDirections(cuts: number): { dirs: Vector3[]; index: Uint32Array } {
  const cached = sphereCache.get(cuts)
  if (cached) return cached
  const dirs: Vector3[] = []
  const seen = new Map<string, number>()
  const vertex = (v: Vector3) => {
    const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`
    let i = seen.get(key)
    if (i === undefined) {
      i = dirs.length
      dirs.push(v)
      seen.set(key, i)
    }
    return i
  }
  const index: number[] = []
  for (const [ia, ib, ic] of ICOSAHEDRON.faces) {
    const [a, b, c] = [ia, ib, ic].map((i) => ICOSAHEDRON.corners[i])
    const point = (i: number, j: number) =>
      vertex(a.clone().addScaledVector(b.clone().sub(a), i / cuts).addScaledVector(c.clone().sub(a), j / cuts).normalize())
    const tri = (x: number, y: number, z: number) => {
      // Wound to face out from the middle.
      const [p, q, r] = [dirs[x], dirs[y], dirs[z]]
      const out = q.clone().sub(p).cross(r.clone().sub(p)).dot(p) > 0
      index.push(...(out ? [x, y, z] : [x, z, y]))
    }
    for (let i = 0; i < cuts; i++) {
      for (let j = 0; i + j < cuts; j++) {
        tri(point(i, j), point(i + 1, j), point(i, j + 1))
        if (i + j < cuts - 1) tri(point(i + 1, j), point(i + 1, j + 1), point(i, j + 1))
      }
    }
  }
  const result = { dirs, index: new Uint32Array(index) }
  sphereCache.set(cuts, result)
  return result
}

/* ───────────── trees ───────────── */

/**
 * How trees are shaped. A canopy is a sphere cut `cuts` times on each
 * icosahedron face (320 triangles), pushed out to the soft union of its
 * lobes (`sharp` sets how crisp the creases between them are). Its lobes vary
 * the leaf colour by up to `tint` either way, so clumps read as painted. The
 * trunk is a tapering open tube of `sides`, sunk `sink` into the ground and
 * reaching up into the canopy. A conifer is three tiers, each a rounded cone.
 */
const CANOPY = { cuts: 4, sharp: 16, tint: 0.07 }
const TRUNK = { sides: 7, sink: 0.06, bottom: 0.055, top: 0.034 }
/** A conifer's tiers: smooth (12 sides), each a little narrower and higher than the last. */
const CONIFER = { tiers: 3, sides: 12, shrink: 0.27, rise: 0.62, tall: 1.7, underside: 0.22, bevel: 0.025 }

/**
 * The scatter's outline widths, in world units: a building's is the kit's
 * line at a landmark's scale; a tree's is finer, as a canopy's long, round
 * silhouette reads heavier on screen than a building's short straight edges.
 */
export const SCATTER_LINES = { building: OUTLINE.part * MODEL_SCALE, tree: OUTLINE.part * MODEL_SCALE * 0.6 } as const

interface Lobe {
  centre: Vector3
  radii: Vector3
  tint: number
}

/** Where a ray from the canopy's middle along `d` leaves `lobe`, or -Infinity if it never passes through it. */
function leaves(lobe: Lobe, d: Vector3): number {
  // In the lobe's own units (its radii scaled to 1), with no vectors made: this runs for every point of every canopy.
  const { centre, radii } = lobe
  const ox = -centre.x / radii.x
  const oy = -centre.y / radii.y
  const oz = -centre.z / radii.z
  const vx = d.x / radii.x
  const vy = d.y / radii.y
  const vz = d.z / radii.z
  const a = vx * vx + vy * vy + vz * vz
  const b = 2 * (ox * vx + oy * vy + oz * vz)
  const c = ox * ox + oy * oy + oz * oz - 1
  const disc = b * b - 4 * a * c
  if (disc < 0 || a < 1e-12) return -Infinity
  const t = (-b + Math.sqrt(disc)) / (2 * a)
  return t > 0 ? t : -Infinity
}

/** The lobes of a canopy, round its middle, in units of about its radius. */
function lobesOf(form: 'round' | 'tall', rand: () => number): Lobe[] {
  const tint = () => 1 + (rand() * 2 - 1) * CANOPY.tint
  if (form === 'round') {
    // A smaller heart, so the lobes round it stand out of the silhouette as clumps.
    const lobes: Lobe[] = [{ centre: new Vector3(0, 0, 0), radii: new Vector3(0.6, 0.56, 0.6), tint: tint() }]
    const n = 5 + Math.floor(rand() * 2)
    const turn = rand() * Math.PI * 2
    for (let k = 0; k < n; k++) {
      const a = turn + (k / n) * Math.PI * 2 + (rand() - 0.5) * 0.6
      const e = -0.2 + rand() * 0.75
      const r = 0.36 + rand() * 0.16
      lobes.push({ centre: new Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).multiplyScalar(0.64), radii: new Vector3(r, r * 0.88, r), tint: tint() })
    }
    lobes.push({ centre: new Vector3((rand() - 0.5) * 0.24, 0.42, (rand() - 0.5) * 0.24), radii: new Vector3(0.44, 0.4, 0.44), tint: tint() })
    return lobes
  }
  // Tall: lobes stacked up the trunk's line, narrowing toward the top, and two at the sides.
  const stack: Array<[number, number]> = [
    [-0.75, 0.72],
    [0, 0.7],
    [0.7, 0.56],
    [1.25, 0.38],
  ]
  const lobes: Lobe[] = stack.map(([y, r]) => ({
    centre: new Vector3((rand() - 0.5) * 0.18, y, (rand() - 0.5) * 0.18),
    radii: new Vector3(r, r * 1.1, r),
    tint: tint(),
  }))
  // Three clumps standing out at the sides, a third of a turn apart, at different heights.
  const turn = rand() * Math.PI * 2
  for (let k = 0; k < 3; k++) {
    const a = turn + (k / 3) * Math.PI * 2 + (rand() - 0.5) * 0.8
    const r = 0.34 + rand() * 0.1
    lobes.push({ centre: new Vector3(Math.cos(a) * 0.5, -0.45 + k * 0.5 + rand() * 0.2, Math.sin(a) * 0.5), radii: new Vector3(r, r * 1.1, r), tint: tint() })
  }
  return lobes
}

/**
 * A canopy: the sphere pushed out to the soft union of `lobes`, then fitted
 * to reach `reach` across the ground and to run from `bottom` to `top`.
 * Returns its surface and each vertex's tint (a blend of its lobes').
 */
function canopy(lobes: Lobe[], reach: number, bottom: number, top: number): { mesh: MeshData; tint: number[] } {
  const { dirs, index } = sphereDirections(CANOPY.cuts)
  const points: Vector3[] = []
  const tint: number[] = []
  for (const d of dirs) {
    const t = lobes.map((lobe) => leaves(lobe, d))
    const most = Math.max(...t)
    let sum = 0
    let tinted = 0
    for (let i = 0; i < t.length; i++) {
      const w = Number.isFinite(t[i]) ? Math.exp(CANOPY.sharp * (t[i] - most)) : 0
      sum += w
      tinted += w * lobes[i].tint
    }
    // The soft union: never inside any lobe, a little fuller where two meet, so the creases are soft.
    points.push(d.clone().multiplyScalar(most + Math.log(sum) / CANOPY.sharp))
    tint.push(tinted / sum)
  }
  // Fit it: as wide as `reach`, from `bottom` to `top`, so it keeps inside what the layout cleared for it.
  let wide = 0
  let low = Infinity
  let high = -Infinity
  for (const p of points) {
    wide = Math.max(wide, Math.hypot(p.x, p.z))
    low = Math.min(low, p.y)
    high = Math.max(high, p.y)
  }
  const across = reach / wide
  const up = (top - bottom) / (high - low)
  const position = new Float32Array(points.length * 3)
  points.forEach((p, i) => position.set([p.x * across, bottom + (p.y - low) * up, p.z * across], i * 3))
  return { mesh: { positions: position, normals: vertexNormals(position, index), bevel: new Float32Array(points.length), index }, tint }
}

/** A tapering open tube from below the ground up to `top`: the trunk. Its ends are hidden in the ground and the leaves. */
function trunk(top: number, scale: number): MeshData {
  const n = TRUNK.sides
  const rb = TRUNK.bottom * scale
  const rt = TRUNK.top * scale
  const y0 = -TRUNK.sink
  const slope = (rb - rt) / (top - y0)
  const positions: number[] = []
  const normals: number[] = []
  for (const [r, y] of [[rb, y0], [rt, top]]) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2
      positions.push(r * Math.sin(a), y, r * Math.cos(a))
      const l = Math.hypot(1, slope)
      normals.push(Math.sin(a) / l, slope / l, Math.cos(a) / l)
    }
  }
  const index: number[] = []
  for (let k = 0; k < n; k++) {
    const k1 = (k + 1) % n
    index.push(k, k1, n + k1, k, n + k1, n + k)
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), bevel: new Float32Array(n * 2), index: new Uint32Array(index) }
}

/**
 * One conifer tier's lathe profile, lean so it can turn on many sides: up the
 * axis from its shallow underside (`under` above the rim) out to a softly
 * rounded rim `r` from the axis, and in to its tip `h` up. Five points, each
 * with its true normal; the rim's is half way between the underside's and
 * the side's, so it catches the light as a rounded edge (bevel 1).
 */
function tierProfile(r: number, h: number, under: number): SoftProfile {
  const unit = (x: number, y: number): [number, number] => {
    const l = Math.hypot(x, y) || 1
    return [x / l, y / l]
  }
  const below = unit(-under, -r)
  const side = unit(h, r)
  const rim = unit(below[0] + side[0], below[1] + side[1])
  const soft = CONIFER.bevel
  return {
    points: [
      [0, under],
      [r - soft, soft * (under / r)],
      [r, soft * 0.5],
      [soft, h - soft * (h / r)],
      [0, h],
    ],
    normals: [[0, -1], below, rim, side, [0, 1]],
    bevel: [0, 0, 1, 0, 0],
  }
}

/** A colour multiplied by `k`, kept within 0..1, so a tint never brightens anything past white. */
const tinted = (c: Color, k: number) => new Color(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k))

/**
 * One tree in its own model units, turned by its yaw: a short trunk of bark
 * and, for a broad-leaved tree, a canopy of overlapping lobes of different
 * sizes, a little squashed (round) or stacked tall and narrow (tall), each
 * lobe a shade lighter or deeper than the next; for a conifer, three
 * rounded tiers, narrowing upward.
 */
export function treeMesh(tree: Tree): LocalMesh {
  const rand = mulberry32(tree.seed)
  const out = new MeshBuilder()
  const turn = new Matrix4().makeRotationY(tree.yaw)
  const leaf = linear(tree.color)
  const reach = reachOf(tree)
  const girth = Math.min(1.2, tree.radius / 0.26)

  if (tree.form === 'conifer') {
    out.add(trunk(tree.trunk + 0.2, girth), turn, linear(scatter.trunk))
    for (let k = 0; k < CONIFER.tiers; k++) {
      const r = tree.radius * (1 - CONIFER.shrink * k) * (1 - rand() * 0.06)
      const h = r * CONIFER.tall
      const base = tree.trunk + k * CONIFER.rise * tree.radius
      out.add(revolve(tierProfile(r, h, r * CONIFER.underside), CONIFER.sides), turn.clone().multiply(at(0, base, 0)).multiply(new Matrix4().makeRotationY(rand() * Math.PI)), tinted(leaf, 1 + 0.035 * k))
    }
    return out.done()
  }

  const bottom = tree.trunk - 0.1 * tree.radius
  const shape = canopy(lobesOf(tree.form, rand), reach, bottom, tree.height)
  out.add(trunk(tree.trunk + 0.15 * tree.radius, girth), turn, linear(scatter.trunk))
  out.add(shape.mesh, turn, (i) => tinted(leaf, shape.tint[i]))
  return out.done()
}

/* ───────────── buildings ───────────── */

/**
 * How background buildings are dressed, in model units: the plinth's bevel
 * and how far below the ground it starts, the walls' and caps' bevels, the
 * window panes' size and spacing and how far they stand off the wall, the
 * share of windows dark at night, a house's door, and how far a gable or hip
 * roof's fascia stands.
 */
const DRESS = {
  plinthBevel: 0.02,
  sink: 0.08,
  wallBevel: 0.03,
  capBevel: 0.02,
  pane: { width: 0.055, height: 0.12, pitch: 0.095, margin: 0.07, sill: 0.11, off: 0.004 },
  towerPane: { width: 0.05, height: 0.16, pitch: 0.085, margin: 0.06, sill: 0.09, off: 0.004 },
  /** The trim band at each floor line: how far it stands off the walls, how tall it is, and its bevel. */
  band: { reach: 0.008, height: 0.024, bevel: 0.008 },
  gable: 0.7,
  dark: 0.4,
  door: { width: 0.09, height: 0.19 },
  fascia: 0.035,
  roofBevel: 0.025,
} as const

/** The four walls, each by its outward normal and the axis running to its right, seen from outside. */
const FACES = [
  { normal: new Vector3(0, 0, 1), right: new Vector3(1, 0, 0) },
  { normal: new Vector3(0, 0, -1), right: new Vector3(-1, 0, 0) },
  { normal: new Vector3(1, 0, 0), right: new Vector3(0, 0, -1) },
  { normal: new Vector3(-1, 0, 0), right: new Vector3(0, 0, 1) },
]

/** A flat rectangle `w` x `h` centred on `centre`, facing `normal`, with `right` across it: four corners, two triangles, wound to face out. */
function quad(centre: Vector3, normal: Vector3, right: Vector3, w: number, h: number): MeshData {
  const upAxis = new Vector3(0, 1, 0)
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([u, v]) => centre.clone().addScaledVector(right, (u * w) / 2).addScaledVector(upAxis, (v * h) / 2))
  return {
    positions: new Float32Array(corners.flatMap((c) => [c.x, c.y, c.z])),
    normals: new Float32Array([0, 1, 2, 3].flatMap(() => [normal.x, normal.y, normal.z])),
    bevel: new Float32Array(4),
    index: new Uint32Array([0, 1, 2, 0, 2, 3]),
  }
}

const box = (size: [number, number, number], bevel: number) => chamferedBox(size, bevel)

/**
 * The rooftop details, in model units: a squat water tank (a drum with a
 * shallow cone for a lid), a stair hut with its own slab of roof, a low
 * skylight. Each fits under its `ROOFTOP` height and keeps `margin` inside
 * the roof deck's edge.
 */
const ROOF_KIT = {
  margin: 0.03,
  tank: { radius: 0.045, sides: 12, bevel: 0.008 },
  hut: { size: [0.1, 0.075, 0.085] as const, slab: 0.02, over: 0.012 },
  skylight: { size: [0.12, 0.028, 0.075] as const },
}

/**
 * Stands a building's rooftop detail on its deck (top at `deckY`, `deckW` by
 * `deckD`), at its `rooftopAt` spot across the room the deck leaves: a tank,
 * a stair hut, a skylight, or nothing.
 */
function addRooftop(body: MeshBuilder, b: Building, placed: (x: number, y: number, z: number) => Matrix4, deckY: number, deckW: number, deckD: number) {
  if (b.rooftop === 'none') return
  const tall = ROOFTOP[b.rooftop].height
  const foot: [number, number] =
    b.rooftop === 'tank' ? [ROOF_KIT.tank.radius * 2, ROOF_KIT.tank.radius * 2] : b.rooftop === 'hut' ? [ROOF_KIT.hut.size[0] + 2 * ROOF_KIT.hut.over, ROOF_KIT.hut.size[2] + 2 * ROOF_KIT.hut.over] : [ROOF_KIT.skylight.size[0], ROOF_KIT.skylight.size[2]]
  const x = b.rooftopAt[0] * Math.max(0, deckW / 2 - foot[0] / 2 - ROOF_KIT.margin)
  const z = b.rooftopAt[1] * Math.max(0, deckD / 2 - foot[1] / 2 - ROOF_KIT.margin)
  if (b.rooftop === 'tank') {
    const r = ROOF_KIT.tank.radius
    const profile = softProfile(
      [
        [0, 0],
        [r, 0],
        [r, tall * 0.78],
        [r * 0.25, tall],
        [0, tall],
      ],
      ROOF_KIT.tank.bevel,
    )
    body.add(revolve(profile, ROOF_KIT.tank.sides), placed(x, deckY, z), linear(blend(b.trim, landmark.indigo, 0.12)))
  } else if (b.rooftop === 'hut') {
    const [w, h, d] = ROOF_KIT.hut.size
    body.add(box([w, h, d], DRESS.capBevel), placed(x, deckY + h / 2, z), linear(blend(b.wall, b.trim, 0.5)))
    const slab = Math.min(ROOF_KIT.hut.slab, tall - h)
    body.add(box([w + 2 * ROOF_KIT.hut.over, slab, d + 2 * ROOF_KIT.hut.over], DRESS.capBevel / 2), placed(x, deckY + h + slab / 2, z), linear(b.roof))
  } else {
    const [w, h, d] = ROOF_KIT.skylight.size
    body.add(box([w, h, d], DRESS.capBevel / 2), placed(x, deckY + h / 2, z), linear(scatter.windowOff))
  }
}

/**
 * One background building in its own model units, turned by its yaw: a plinth
 * sunk into the ground, bevelled walls with a trim band at each floor line,
 * and on top a parapet round a deck in its roof colour with its rooftop detail
 * (a city block or tower) or a gable or hipped roof (a house); windows on
 * every storey of every wall, most of them glass (sky by day, lit at night)
 * and the rest dark panes; a house has a door. Returns the solid surface and
 * the glass panes apart, for the glass material.
 */
export function buildingMesh(b: Building): { body: LocalMesh; glass: PaneMesh } {
  const rand = mulberry32(b.seed)
  const body = new MeshBuilder()
  const turn = new Matrix4().makeRotationY(b.yaw)
  const placed = (x: number, y: number, z: number) => turn.clone().multiply(at(x, y, z))
  const [wall, trim, roof, dark] = [b.wall, b.trim, b.roof, scatter.windowOff].map(linear)
  const walls = b.storeys * BUILDING.storey
  const top = BUILDING.plinth + walls
  const house = b.form === 'house'
  const over = house ? BUILDING.house.overhang : BUILDING.capOver

  const plinth = BUILDING.plinth + DRESS.sink
  body.add(box([b.width + over * 0.6, plinth, b.depth + over * 0.6], DRESS.plinthBevel), placed(0, BUILDING.plinth - plinth / 2, 0), trim)
  body.add(box([b.width, walls, b.depth], DRESS.wallBevel), placed(0, BUILDING.plinth + walls / 2, 0), wall)

  if (house) {
    const rise = b.height - top
    const style = rand() < DRESS.gable ? 'gable' : 'hip'
    body.add(roundedHull(roofCorners(style, [b.width, rise, b.depth], over, DRESS.fascia), DRESS.roofBevel), placed(0, top, 0), roof)
  } else {
    // A thin trim band at every floor line above the ground floor.
    for (let s = 1; s < b.storeys; s++) {
      body.add(box([b.width + 2 * DRESS.band.reach, DRESS.band.height, b.depth + 2 * DRESS.band.reach], DRESS.band.bevel), placed(0, BUILDING.plinth + s * BUILDING.storey, 0), trim)
    }
    // A parapet in the trim colour round a roof deck in the roof's colour, darker than the walls.
    const { lift, inset } = BUILDING.deck
    const deckW = b.width + 2 * over - 2 * inset
    const deckD = b.depth + 2 * over - 2 * inset
    body.add(box([b.width + 2 * over, BUILDING.cap, b.depth + 2 * over], DRESS.capBevel), placed(0, top + BUILDING.cap / 2, 0), trim)
    body.add(box([deckW, BUILDING.cap, deckD], DRESS.capBevel), placed(0, top + BUILDING.cap / 2 + lift, 0), roof)
    addRooftop(body, b, placed, top + BUILDING.cap + lift, deckW, deckD)
  }

  // Windows: a row on every storey of every wall, glass or dark.
  const pane = b.form === 'tower' ? DRESS.towerPane : DRESS.pane
  const glass = { position: [] as number[], pane: [] as number[], index: [] as number[] }
  const addGlass = (m: MeshData) => {
    const base = glass.position.length / 3
    const p = new Vector3()
    for (let i = 0; i < 4; i++) {
      p.fromArray(m.positions, i * 3).applyMatrix4(turn)
      glass.position.push(p.x, p.y, p.z)
    }
    glass.pane.push(-1, -1, 1, -1, 1, 1, -1, 1)
    for (const i of m.index ?? []) glass.index.push(base + i)
  }
  FACES.forEach((face, f) => {
    const span = face.normal.x !== 0 ? b.depth : b.width
    const half = face.normal.x !== 0 ? b.width / 2 : b.depth / 2
    const count = Math.max(1, Math.floor((span - pane.margin) / pane.pitch))
    for (let s = 0; s < b.storeys; s++) {
      const y = BUILDING.plinth + s * BUILDING.storey + pane.sill + pane.height / 2
      for (let i = 0; i < count; i++) {
        let x = (i - (count - 1) / 2) * pane.pitch
        // A house's front door takes the middle of the ground floor; its windows move out to the sides.
        if (house && f === 0 && s === 0) {
          if (count % 2 === 1 && i === (count - 1) / 2) continue
          if (Math.abs(x) < pane.pitch * 0.75) x = Math.sign(x || 1) * pane.pitch * 0.9
        }
        const centre = face.normal.clone().multiplyScalar(half + pane.off).addScaledVector(face.right, x).setY(y)
        const m = quad(centre, face.normal, face.right, pane.width, pane.height)
        if (rand() < DRESS.dark) body.add(m, turn, dark)
        else addGlass(m)
      }
    }
  })
  if (house) {
    const { width, height } = DRESS.door
    const centre = new Vector3(0, BUILDING.plinth + height / 2, b.depth / 2 + DRESS.pane.off)
    body.add(quad(centre, FACES[0].normal, FACES[0].right, width, height), turn, roof)
  }

  return {
    body: body.done(),
    glass: { position: new Float32Array(glass.position), pane: new Float32Array(glass.pane), index: new Uint32Array(glass.index) },
  }
}

/* ───────────── the whole scatter on the planet ───────────── */

/** A solid layer of the scatter on the planet: world-unit positions, with what the kit's material reads. */
export interface PlacedMesh extends LocalMesh {
  /** Each vertex's height above the ground it stands on, in model units: the kit's painted gradient (`aHeight`). */
  height: Float32Array
}

export interface ScatterMeshes {
  trees: PlacedMesh
  buildings: PlacedMesh
  glass: PaneMesh
  /** The soft shadows under everything: positions on the ground and a 0..1 square of uv each, for the contact-shadow material. */
  shadows: { position: Float32Array; uv: Float32Array; index: Uint32Array }
  /** How far into the trees' index each tree ends, in order. */
  treeEnds: number[]
  /** How much of the trees' index to draw at low quality: the first half of the trees. */
  lowTrees: number
  /** How much of the shadows' index to draw at low quality: every building's and the first half of the trees'. */
  lowShadows: number
}

/**
 * How many draw calls the scatter takes: trees, their outlines, buildings,
 * their outlines, the window glass and the shadows.
 */
export const SCATTER_DRAW_CALLS = 6

/**
 * The most triangles the scatter may draw, outlines included: what the round
 * trees and plain blocks it replaced drew (210 trees of 180 triangles and 33
 * boxes of 12, each twice for its outline, 76,392 measured from the
 * renderer), and 60,000 more.
 */
export const SCATTER_TRIANGLE_BUDGET = 210 * 180 * 2 + 33 * 12 * 2 + 60_000

/** The triangles the scatter draws at full quality: the solids twice (once for the outline), the glass and the shadows once. */
export function scatterTriangles(m: ScatterMeshes): number {
  return (2 * (m.trees.index.length + m.buildings.index.length) + m.glass.index.length + m.shadows.index.length) / 3
}

/** How far a shadow reaches past what casts it, as a share of its reach across the ground. */
const SHADOW_SPREAD = { tree: 1.25, building: 1.15 }

/** Where something standing at `dir` goes: its model units onto the ground there, local +Y along the surface normal, +Z south. */
function placement(dir: Vector3, districts: District[]): { matrix: Matrix4; turn: Matrix4 } {
  const { up, south, east } = surfaceFrame(dir)
  const turn = new Matrix4().makeBasis(east, up, south)
  const ground = up.clone().multiplyScalar(1 + heightAt(up, districts))
  const matrix = new Matrix4().makeTranslation(ground.x, ground.y, ground.z).multiply(turn).multiply(new Matrix4().makeScale(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE))
  return { matrix, turn }
}

/** Accumulates world-placed solids into one mesh. */
/** Merges world-placed solids into one mesh, written straight into arrays sized for all of them up front. */
class PlacedBuilder {
  readonly mesh: PlacedMesh
  private vertices = 0
  private indices = 0
  private readonly p = new Vector3()
  private readonly n = new Vector3()

  constructor(locals: LocalMesh[]) {
    const v = locals.reduce((sum, m) => sum + m.position.length / 3, 0)
    const k = locals.reduce((sum, m) => sum + m.index.length, 0)
    this.mesh = {
      position: new Float32Array(v * 3),
      normal: new Float32Array(v * 3),
      color: new Float32Array(v * 3),
      bevel: new Float32Array(v),
      height: new Float32Array(v),
      index: new Uint32Array(k),
    }
  }

  /** Adds one, placed by `matrix` (its normals turned by `turn`), and returns how far into the index it ends. */
  add(local: LocalMesh, matrix: Matrix4, turn: Matrix4): number {
    const { p, n, mesh } = this
    const base = this.vertices
    const count = local.position.length / 3
    for (let i = 0; i < count; i++) {
      const o = (base + i) * 3
      p.fromArray(local.position, i * 3)
      mesh.height[base + i] = p.y
      p.applyMatrix4(matrix)
      n.fromArray(local.normal, i * 3).transformDirection(turn)
      mesh.position[o] = p.x
      mesh.position[o + 1] = p.y
      mesh.position[o + 2] = p.z
      mesh.normal[o] = n.x
      mesh.normal[o + 1] = n.y
      mesh.normal[o + 2] = n.z
      mesh.color[o] = local.color[i * 3]!
      mesh.color[o + 1] = local.color[i * 3 + 1]!
      mesh.color[o + 2] = local.color[i * 3 + 2]!
      mesh.bevel[base + i] = local.bevel[i]!
    }
    for (let j = 0; j < local.index.length; j++) mesh.index[this.indices + j] = base + local.index[j]!
    this.vertices += count
    this.indices += local.index.length
    return this.indices
  }
}

/**
 * The whole scatter on the planet, in world units, as a few merged meshes:
 * every tree in one, every building in another, their window glass, and a
 * soft shadow on the ground under each (buildings' first, then the trees'),
 * bent to follow the ground. The trees are in the layout's order, so the first
 * half of the index draws the first half of the trees.
 */
export function scatterMeshes(trees: Tree[], buildings: Building[], districts: District[]): ScatterMeshes {
  const treeShapes = trees.map(treeMesh)
  const treeOut = new PlacedBuilder(treeShapes)
  const treeEnds: number[] = []
  trees.forEach((tree, i) => {
    const { matrix, turn } = placement(tree.dir, districts)
    treeEnds.push(treeOut.add(treeShapes[i]!, matrix, turn))
  })

  const buildingShapes = buildings.map(buildingMesh)
  const buildingOut = new PlacedBuilder(buildingShapes.map((s) => s.body))
  const glass = { position: [] as number[], pane: [] as number[], index: [] as number[] }
  buildings.forEach((b, k) => {
    const { matrix, turn } = placement(b.dir, districts)
    const shape = buildingShapes[k]!
    buildingOut.add(shape.body, matrix, turn)
    const base = glass.position.length / 3
    const p = new Vector3()
    for (let i = 0; i < shape.glass.position.length / 3; i++) {
      p.fromArray(shape.glass.position, i * 3).applyMatrix4(matrix)
      glass.position.push(p.x, p.y, p.z)
    }
    glass.pane.push(...shape.glass.pane)
    for (const i of shape.glass.index) glass.index.push(base + i)
  })

  // The shadows: a 2 x 2 patch under each, every vertex dropped onto the ground and lifted a hair, as a landmark's is.
  const disc = shadowDisc(1, 2, Infinity)
  const shadow = { position: [] as number[], uv: [] as number[], index: [] as number[] }
  const lay = (dir: Vector3, size: number) => {
    const { matrix } = placement(dir, districts)
    const base = shadow.position.length / 3
    const p = new Vector3()
    for (let i = 0; i < disc.positions.length / 3; i++) {
      p.set(disc.positions[i * 3] * size, 0, disc.positions[i * 3 + 2] * size).applyMatrix4(matrix).normalize()
      p.multiplyScalar(1 + heightAt(p, districts) + SHADOW.lift * MODEL_SCALE)
      shadow.position.push(p.x, p.y, p.z)
    }
    shadow.uv.push(...disc.uvs)
    for (const i of disc.index) shadow.index.push(base + i)
  }
  for (const b of buildings) lay(b.dir, reachOf(b) * SHADOW_SPREAD.building)
  const shadowsBeforeTrees = shadow.index.length
  for (const tree of trees) lay(tree.dir, reachOf(tree) * SHADOW_SPREAD.tree)

  const half = Math.floor(trees.length / 2)
  const perShadow = disc.index.length
  return {
    trees: treeOut.mesh,
    buildings: buildingOut.mesh,
    glass: { position: new Float32Array(glass.position), pane: new Float32Array(glass.pane), index: new Uint32Array(glass.index) },
    shadows: { position: new Float32Array(shadow.position), uv: new Float32Array(shadow.uv), index: new Uint32Array(shadow.index) },
    treeEnds,
    lowTrees: half === 0 ? 0 : treeEnds[half - 1],
    lowShadows: shadowsBeforeTrees + half * perShadow,
  }
}
