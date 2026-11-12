import { describe, it, expect, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { BackSide, Box3, DoubleSide, Matrix4, Raycaster, Texture, TextureLoader, Vector3, type Material, type Mesh, type Object3D } from 'three'
import { FOCUS, MODEL_SCALE } from '@/lib/world/camera'
import { GenericModel } from '@/components/world/models/GenericModel'
import { Batched } from '@/components/world/models/kit'
import { MODELS } from '@/components/world/models/registry'
import type { ModelKey, Place } from '@/content/types'
import { districts, places } from '@/content/world'
import { DRAW_BUDGET, FOOTPRINT, OUTLINE, TRIANGLE_BUDGET, footprintRadius, triangleCount, withinFootprint } from '@/lib/world/kit'
import { jpegSize } from './jpeg'
import { mount } from './r3f'

/*
 * The checks every built landmark passes, shared by the per-landmark test
 * files (`landmark.<key>.test.tsx`, each one line: `describeLandmark(key)`),
 * so they run in parallel and a new landmark adds one small file, not a copy
 * of the checks. `landmarks.test.tsx` makes sure every built key has its file,
 * and holds the planet-wide budgets.
 */

/** The azimuths the hidden-part check looks from: all the way round, as the visitor can circle. */
const LOOK_FROM = 8
/** How many points on a part's surface it tries: enough to find a small face showing out of a large part (a dormer out of its roof). */
const SAMPLES = 96
/**
 * The least share of a flat plate's facing surface (an `Extruded`: a sign, a
 * banner, a crown, a door) some visitor must see. A plate flush on a wall shows
 * about half (its back is against the wall); the most covered by design here is
 * a hut's door frame round its door, about 29%; a plate buried behind a
 * gatehouse showed 13%. Round and solid parts may be pressed into each other
 * by design (a cat's eye into its head), so for them only "none of it shows"
 * is a fault.
 */
const PLATE_MIN_SEEN = 0.2

/** A mesh's triangles in the world: its corners, its outward normal (by its winding) and its area. */
function trianglesOf(mesh: Mesh): Array<{ corners: Vector3[]; normal: Vector3; area: number }> {
  const position = mesh.geometry.getAttribute('position')
  const index = mesh.geometry.index
  const count = index ? index.count : position.count
  const id = (k: number) => (index ? index.getX(k) : k)
  const out: Array<{ corners: Vector3[]; normal: Vector3; area: number }> = []
  for (let k = 0; k + 2 < count; k += 3) {
    const [a, b, c] = [0, 1, 2].map((j) => new Vector3().fromBufferAttribute(position, id(k + j)).applyMatrix4(mesh.matrixWorld))
    const cross = b.clone().sub(a).cross(c.clone().sub(a))
    const area = cross.length() / 2
    if (!(area > 1e-10)) continue
    out.push({ corners: [a, b, c], normal: cross.normalize(), area })
  }
  return out
}

/**
 * The `k`th of a spread of points across a triangle (the R2 low-discrepancy
 * sequence, folded into the triangle): not its middle, since a tall sliver's
 * middle always falls a third of the way up it.
 */
function pointIn(corners: Vector3[], k: number): Vector3 {
  let u = ((k + 1) * 0.7548776662) % 1
  let v = ((k + 1) * 0.569840291) % 1
  if (u + v > 1) {
    u = 1 - u
    v = 1 - v
  }
  const [a, b, c] = corners
  return a.clone().addScaledVector(b.clone().sub(a), u).addScaledVector(c.clone().sub(a), v)
}

/**
 * The kit parts of a landmark that no visitor can see: from the place camera
 * (`FOCUS`, at its height and distance for a landmark `height` tall) at every
 * one of `LOOK_FROM` azimuths round it, every sample of the part's surface is
 * blocked by some other part. A part buried inside others (a banner behind a
 * gatehouse) is a fault that no footprint or budget check sees. Parts inside a
 * motion helper are checked in their rest pose, as mounted (a head that turns
 * still shows its eyes facing front). Rays start a hair out from the part along
 * each sample's normal and hit only front faces, so a part touching or set into
 * its neighbour still shows wherever it does.
 */
export function hiddenParts(root: Object3D, height: number): string[] {
  root.updateWorldMatrix(true, true)
  const parts: Mesh[] = []
  root.traverse((o) => {
    const mesh = o as Mesh
    // Kit parts' own bodies only: not their outline shells, not the batch's merged copies, not light or water.
    if (!mesh.isMesh || !mesh.userData.batch || mesh.userData.batched) return
    if ((mesh.material as Material).side === BackSide) return
    mesh.geometry.computeBoundingSphere()
    parts.push(mesh)
  })
  const h = height * MODEL_SCALE
  const back = (FOCUS.back + FOCUS.backPerHeight * h) / MODEL_SCALE
  const up = (FOCUS.up + FOCUS.upPerHeight * h) / MODEL_SCALE
  const eyes = Array.from({ length: LOOK_FROM }, (_, k) => {
    const a = (k / LOOK_FROM) * Math.PI * 2
    return new Vector3(back * Math.sin(a), up, back * Math.cos(a)).applyMatrix4(root.matrixWorld)
  })
  const ray = new Raycaster()
  const p = new Vector3()
  const n = new Vector3()
  const hidden: string[] = []
  // A sample buried inside another part must not see out through that part's faces from within: every part
  // stops a ray from either side while this looks (the materials are shared, so each is put back after).
  const materials = new Map<Material, Material['side']>()
  for (const part of parts) materials.set(part.material as Material, (part.material as Material).side)
  for (const m of materials.keys()) m.side = DoubleSide
  try {
    for (const part of parts) {
      const others = parts.filter((o) => o !== part)
      // Samples on its surface, not its corners: the middles of its triangles, chosen by area so that each stands for an
      // equal share of the surface, spread by the golden ratio. Each with its triangle's own normal.
      const tris = trianglesOf(part)
      const total = tris.reduce((s, t) => s + t.area, 0)
      if (!(total > 0)) continue
      const picks = Array.from({ length: SAMPLES }, (_, k) => {
        let at = (((k + 0.5) * 0.6180339887) % 1) * total
        for (const t of tris) {
          at -= t.area
          if (at <= 0) return t
        }
        return tris[tris.length - 1]
      })
      // Of the samples facing some eye (the underside of a post faces none), how many some eye sees.
      let facing = 0
      let seen = 0
      for (const [k, t] of picks.entries()) {
        n.copy(t.normal)
        p.copy(pointIn(t.corners, k)).addScaledVector(n, 0.003)
        let faces = false
        for (const eye of eyes) {
          const to = eye.clone().sub(p)
          // A face turned away from this eye cannot be seen from it.
          if (to.dot(n) <= 0) continue
          faces = true
          const far = to.length()
          ray.set(p, to.normalize())
          ray.far = far
          if (ray.intersectObjects(others, false).length === 0) {
            seen++
            break
          }
        }
        if (faces) facing++
      }
      const share = facing > 0 ? seen / facing : 1
      const plate = part.geometry.type === 'ExtrudeGeometry'
      if (seen === 0 || (plate && share < PLATE_MIN_SEEN)) {
        part.geometry.computeBoundingBox()
        const size = part.geometry.boundingBox!.getSize(new Vector3())
        const at = part.getWorldPosition(new Vector3()).applyMatrix4(root.matrixWorld.clone().invert())
        hidden.push(`a part ${size.toArray().map((x) => x.toFixed(3)).join('×')} at ${at.toArray().map((x) => x.toFixed(3)).join(', ')}, ${Math.round(share * 100)}% seen`)
      }
    }
  } finally {
    for (const [m, side] of materials) m.side = side
  }
  return hidden
}

/**
 * A moving part is seen in one pose only; this checks everywhere its motion
 * can take it (light aside) against the footprint, across the ground and under
 * 2.6. A turn about the upright (a `Spin`, a `Sway` about y) sweeps a circle
 * round its pivot and keeps every height; a `Bob` moves every vertex up and
 * down by its amount, and `Rain` its streaks by half their travel; a `Drop`
 * carries its parts down by its fall (never up); a `Flag`'s
 * cloth moves each vertex out of its plane by its ripple's depth; any other
 * turn is held to the whole sphere of its reach round its pivot. Returns what
 * leaves.
 */
export function sweptOut(root: Object3D, radius: number): string[] {
  root.updateWorldMatrix(true, true)
  const v = new Vector3()
  const along = new Vector3()
  const out: string[] = []
  const leaves = (p: Vector3) => !withinFootprint(p, radius)
  root.traverse((group) => {
    if (!group.userData.moving || !group.parent) return
    const motion = group.userData.motion as string
    const pivot = group.parent.getWorldPosition(new Vector3())
    const reachOf = Number(group.userData.reach) || 0
    // The direction a bob, falling rain or a ripple moves things: the bob's or the rain's parent's up, the cloth's own +Z.
    const lifts = motion === 'bob' || motion === 'fall' || motion === 'cloth' || motion === 'drop'
    if (motion === 'bob' || motion === 'fall' || motion === 'drop') along.set(0, 1, 0).transformDirection(group.parent.matrixWorld)
    // A drop only ever carries its parts down from where they rest.
    const ways = motion === 'drop' ? [-1] : [-1, 1]
    if (motion === 'cloth') along.set(0, 0, 1).transformDirection(group.matrixWorld)
    let reach = 0
    let top = -Infinity
    let fault = ''
    group.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh || mesh.userData.light || fault) return
      const position = mesh.geometry.getAttribute('position')
      for (let i = 0; i < position.count && !fault; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld)
        if (lifts) {
          for (const s of ways) if (leaves(v.clone().addScaledVector(along, s * reachOf))) fault = `${motion} at ${v.toArray().map((x) => x.toFixed(2))} moving ${reachOf.toFixed(3)}`
          continue
        }
        reach = Math.max(reach, motion === 'y' ? Math.hypot(v.x - pivot.x, v.z - pivot.z) : v.distanceTo(pivot))
        top = Math.max(top, v.y)
      }
    })
    if (fault) {
      out.push(fault)
      return
    }
    if (lifts) return
    const across = Math.hypot(pivot.x, pivot.z) + reach
    const highest = motion === 'y' ? top : pivot.y + reach
    if (across > radius + OUTLINE.max || highest > FOOTPRINT.height + OUTLINE.max) out.push(`pivot ${pivot.toArray().map((x) => x.toFixed(2))} reach ${reach.toFixed(3)}`)
  })
  return out
}

/**
 * How many draw calls a landmark makes once batched: every mesh that is shown
 * and has something in it. The contact shadow `Places` draws under every
 * landmark (one call each, nineteen in all) is not the model's and is left out
 * of this and of the budget (R40), as the README says.
 */
export function drawCalls(root: Object3D): number {
  let draws = 0
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || !mesh.geometry.getAttribute('position')?.count) return
    let shown = mesh.visible
    for (let p = mesh.parent; p; p = p.parent) if (!p.visible) shown = false
    if (shown) draws++
  })
  return draws
}

/** What weather a mounted landmark draws: rain, if some group in it says it falls. */
function weatherOf(root: Object3D): Place['weather'] {
  let rain = false
  root.traverse((o) => {
    if (o.userData.moving && o.userData.motion === 'fall') rain = true
  })
  return rain ? 'rain' : undefined
}

/**
 * What a landmark draws, from its real geometry as react-three-fiber builds it,
 * batched as `Places` batches it; with `look`, which of its parts no visitor
 * can see (the slow check).
 */
export async function survey(place: Place, look = true) {
  const district = districts.find((d) => d.id === place.district)!
  const Model = MODELS[place.model]
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const app = await mount(
    <group name="model">
      <Batched>
        <Model place={place} district={district} />
      </Batched>
    </group>,
  )
  const root = app.scene.getObjectByName('model')!
  root.updateWorldMatrix(true, true)
  const radius = footprintRadius(place.id, places)
  const v = new Vector3()
  const n = new Vector3()
  const found = { outside: [] as number[][], top: -Infinity, bottom: Infinity, nonFinite: 0, zeroNormals: 0, meshes: 0 }
  root.traverse((o) => {
    const mesh = o as Mesh
    // The batch's merged copies repeat parts already counted; their originals are checked instead.
    if (!mesh.isMesh || mesh.userData.batched) return
    // Light (a beam) is not solid, and is held to no footprint (R37); its triangles are counted below all the same.
    const light = Boolean(mesh.userData.light)
    found.meshes++
    const position = mesh.geometry.getAttribute('position')
    const normal = mesh.geometry.getAttribute('normal')
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i)
      if (![v.x, v.y, v.z].every(Number.isFinite)) {
        found.nonFinite++
        continue
      }
      v.applyMatrix4(mesh.matrixWorld)
      if (normal && !(n.fromBufferAttribute(normal, i).length() > 0.5)) found.zeroNormals++
      if (light) continue
      if (!withinFootprint(v, radius) && found.outside.length < 3) found.outside.push(v.toArray().map((x) => +x.toFixed(3)))
      found.top = Math.max(found.top, v.y)
      found.bottom = Math.min(found.bottom, v.y)
    }
  })
  const swept = sweptOut(root, radius)
  const hidden = look ? hiddenParts(root, place.height) : []
  const triangles = triangleCount(root)
  const draws = drawCalls(root)
  const weather = weatherOf(root)
  const errorCount = errors.mock.calls.length
  errors.mockRestore()
  await app.unmount()
  return { ...found, swept, hidden, triangles, draws, weather, errorCount }
}

/** The checks every landmark passes, at its place's height (or any it is mounted at). */
export function expectSound(s: Awaited<ReturnType<typeof survey>>, height: number) {
  expect(s.errorCount, 'console errors while mounting').toBe(0)
  expect(s.meshes).toBeGreaterThan(0)
  // Inside the place's allowed radius across the ground, and between the ground and 2.6 (rocks may bed in by a line's width).
  expect(s.outside, 'vertices outside the footprint').toEqual([])
  expect(s.swept, 'moving parts that sweep out of the footprint').toEqual([])
  expect(s.hidden, 'parts no visitor can see from any side').toEqual([])
  expect(s.bottom).toBeGreaterThanOrEqual(-OUTLINE.max)
  expect(s.top).toBeLessThanOrEqual(FOOTPRINT.height)
  // Its tallest point at or near the height it is given, which the camera and label are placed from.
  expect(s.top).toBeGreaterThanOrEqual(height * 0.95)
  expect(s.top).toBeLessThanOrEqual(height + 0.15)
  expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  expect(s.draws, 'draw calls (R40)').toBeLessThanOrEqual(DRAW_BUDGET)
  expect(s.nonFinite, 'non-finite positions').toBe(0)
  expect(s.zeroNormals, 'zero-length normals').toBe(0)
}

/**
 * The landmark `key` mounted at `height`: the poster (its `Picture`, the one
 * plane), its world normal and up, its size, and the box of every other mesh as
 * seen in the poster's own frame (x across it, y up it, z out of its face), so
 * "in front of the face" means in front as the poster faces. With `loads`, the
 * pictures it asked for.
 */
async function posterSurvey(key: ModelKey, height: number) {
  const place = places.find((p) => p.model === key)!
  const district = districts.find((d) => d.id === place.district)!
  const Model = MODELS[key]
  const load = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(() => new Texture())
  const app = await mount(
    <group name="model">
      <Model place={{ ...place, height }} district={district} />
    </group>,
  )
  const loads = load.mock.calls.map(([src]) => src)
  load.mockRestore()
  const root = app.scene.getObjectByName('model')!
  root.updateWorldMatrix(true, true)
  const planes: Mesh[] = []
  const meshes: Mesh[] = []
  root.traverse((o: Object3D) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    if (mesh.geometry.type === 'PlaneGeometry') planes.push(mesh)
    else meshes.push(mesh)
  })
  const result = { loads, planes: planes.length, normal: new Vector3(), up: new Vector3(), size: [0, 0], others: [] as string[], scaled: false }
  const face = planes[0]
  if (face) {
    result.normal.set(0, 0, 1).transformDirection(face.matrixWorld)
    result.up.set(0, 1, 0).transformDirection(face.matrixWorld)
    // A mirrored picture is drawn through a matrix that turns space inside out.
    result.scaled = face.matrixWorld.determinant() < 0
    face.geometry.computeBoundingBox()
    const { min, max } = face.geometry.boundingBox!
    const [w, h] = [max.x - min.x, max.y - min.y]
    result.size = [w, h]
    const toFace = new Matrix4().copy(face.matrixWorld).invert()
    const v = new Vector3()
    for (const mesh of meshes) {
      const position = mesh.geometry.getAttribute('position')
      const box = new Box3()
      for (let i = 0; i < position.count; i++) box.expandByPoint(v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toFace))
      // Seen square on, nothing standing out in front of the face overlaps it.
      if (box.max.z > 1e-4 && box.min.x < w / 2 && box.max.x > -w / 2 && box.min.y < h / 2 && box.max.y > -h / 2) {
        result.others.push(`${mesh.geometry.type} at ${box.min.toArray().map((n) => n.toFixed(2))}`)
      }
    }
  }
  await app.unmount()
  return result
}

/**
 * The checks for a landmark that shows the owner's own picture (`place.poster`):
 * at its place's height and both ends of its range it loads that picture and
 * no other, shows it upright, unmirrored, at the image's own shape, facing the
 * front and turned up to the camera by at least `up` (the y of its normal),
 * and nothing stands in front of its face.
 */
export function describePoster(key: ModelKey, { up }: { up: number }) {
  const place = places.find((p) => p.model === key)!
  describe(`the ${key}’s picture`, () => {
    it('is the place’s own poster, a picture of the owner’s', () => {
      expect(place.poster).toMatch(/^\/media\//)
      expect(existsSync(resolve(__dirname, '../../../public', `.${place.poster}`))).toBe(true)
    })

    it.each([[place.height], ...(MODELS[key].heights ?? []).map((h) => [h])])(
      'at %s tall shows it whole, upright, unmirrored, at its own shape, facing the camera, with nothing in front',
      async (height) => {
        const s = await posterSurvey(key, height)
        expect(s.loads).toEqual([place.poster])
        expect(s.planes).toBe(1)
        expect(s.scaled).toBe(false)
        const [pw, ph] = jpegSize(resolve(__dirname, '../../../public', `.${place.poster}`))
        expect(s.size[0] / s.size[1]).toBeCloseTo(pw / ph, 3)
        // Upright: its top is up, never sideways or upside down.
        expect(s.up.y).toBeGreaterThan(0.5)
        expect(Math.abs(s.up.x)).toBeLessThan(1e-6)
        // Facing the front (+Z), turned up toward the camera above.
        expect(s.normal.z).toBeGreaterThan(0.3)
        expect(s.normal.y).toBeGreaterThanOrEqual(up)
        expect(Math.abs(s.normal.x)).toBeLessThan(1e-6)
        expect(s.others).toEqual([])
      },
    )
  })
}

/**
 * Every check for the landmark `key` (footprint, height, budgets, soundness,
 * and that no part is buried): at each place that uses it, with its place's
 * weather, and at the two ends of the range of heights it states it is built
 * for, where every dependent part has moved furthest.
 */
export function describeLandmark(key: ModelKey) {
  const uses = places.filter((p) => p.model === key)
  describe(`the ${key} landmark`, () => {
    it('has its own model, and a place that uses it', () => {
      expect(MODELS[key]).not.toBe(GenericModel)
      expect(uses.length).toBeGreaterThan(0)
    })

    it('states the heights it is built for, within 1.0 to 2.6, its places’ among them', () => {
      const range = MODELS[key].heights
      expect(range, 'a built landmark says what heights it follows (LandmarkComponent.heights)').toBeDefined()
      const [low, high] = range!
      expect(low).toBeGreaterThanOrEqual(1.0)
      expect(high).toBeLessThanOrEqual(FOOTPRINT.height)
      expect(low).toBeLessThan(high)
      for (const p of uses) {
        expect(p.height, p.id).toBeGreaterThanOrEqual(low)
        expect(p.height, p.id).toBeLessThanOrEqual(high)
      }
    })

    // At its place's own height too, with the buried-part check: the pose visitors see, and a model's clamps can kink inside its range.
    it.each(uses.map((p) => [p.id, p] as const))('at %s: fits its footprint, stands as tall as its place, none is buried, is in budget and sound', async (_, place) => {
      const s = await survey(place)
      expect(s.weather, 'the weather its place asks for').toBe(place.weather)
      expectSound(s, place.height)
    })

    const range = MODELS[key].heights ?? [uses[0].height, uses[0].height]
    it.each(range.map((h) => [h] as const))('at %s tall: every part follows the height, none is buried, and it is still sound', async (height) => {
      const place = { ...uses[0], height }
      expectSound(await survey(place), height)
    })
  })
}
