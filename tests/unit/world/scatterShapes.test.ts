import { describe, it, expect } from 'vitest'
import { Color, Vector3 } from 'three'
import { scatter } from '@/content/sky'
import { districts, places } from '@/content/world'
import { MODEL_SCALE } from '@/lib/world/camera'
import { SHADOW } from '@/lib/world/kit'
import {
  BUILDING,
  SCATTER_SEEDS,
  TREE_FORMS,
  buildingHeight,
  reachOf,
  scatterBlocks,
  scatterTrees,
  type Building,
  type Rooftop,
  type Tree,
} from '@/lib/world/scatter'
import {
  SCATTER_DRAW_CALLS,
  SCATTER_LINES,
  SCATTER_TRIANGLE_BUDGET,
  buildingMesh,
  scatterMeshes,
  scatterTriangles,
  treeMesh,
  type LocalMesh,
} from '@/lib/world/scatterShapes'
import { heightAt } from '@/lib/world/terrain'

const buildings = scatterBlocks(SCATTER_SEEDS.blocks, districts, places)
const trees = scatterTrees(SCATTER_SEEDS.trees, districts, places, buildings)
const up = new Vector3(0, 1, 0)

const tree = (form: Tree['form'], radius: number, seed: number): Tree => ({
  dir: up,
  form,
  radius,
  trunk: TREE_FORMS[form].trunk[1],
  height: TREE_FORMS[form].trunk[1] + radius * TREE_FORMS[form].tall,
  yaw: 0.4,
  color: scatter.leaf[0],
  seed,
})

/** Every number finite, every normal a unit vector, every index in range. */
function expectSound(mesh: { position: Float32Array; normal?: Float32Array; index: Uint32Array }) {
  for (const v of mesh.position) expect(Number.isFinite(v)).toBe(true)
  if (mesh.normal) {
    for (let i = 0; i < mesh.normal.length; i += 3) expect(Math.hypot(mesh.normal[i], mesh.normal[i + 1], mesh.normal[i + 2])).toBeCloseTo(1, 4)
  }
  const count = mesh.position.length / 3
  for (const i of mesh.index) expect(i).toBeLessThan(count)
  expect(mesh.index.length % 3).toBe(0)
}

/** How far the mesh reaches across the ground from its middle, and its lowest and highest points. */
function extent(mesh: LocalMesh) {
  let reach = 0
  let low = Infinity
  let high = -Infinity
  for (let i = 0; i < mesh.position.length; i += 3) {
    reach = Math.max(reach, Math.hypot(mesh.position[i], mesh.position[i + 2]))
    low = Math.min(low, mesh.position[i + 1])
    high = Math.max(high, mesh.position[i + 1])
  }
  return { reach, low, high }
}

describe('a tree', () => {
  const forms = (['round', 'tall', 'conifer'] as const).flatMap((form) =>
    [TREE_FORMS[form].radius[0], TREE_FORMS[form].radius[1]].flatMap((r) => [1, 7, 99].map((seed) => tree(form, r, seed))),
  )

  it('is sound, and stays within the reach and height the layout keeps clear for it', () => {
    for (const t of forms) {
      const mesh = treeMesh(t)
      expectSound(mesh)
      const { reach, low, high } = extent(mesh)
      expect(reach).toBeLessThanOrEqual(reachOf(t) + 1e-6)
      expect(high).toBeLessThanOrEqual(t.height + 1e-6)
      // Its trunk starts a little below the ground, so it never floats on a slope.
      expect(low).toBeLessThan(0)
      expect(low).toBeGreaterThan(-0.1)
    }
  })

  it('has a canopy of overlapping lobes, not one ball, slightly squashed', () => {
    for (const t of forms.filter((x) => x.form !== 'conifer')) {
      const mesh = treeMesh(t)
      // Seen from above, a ball (squashed or not) is a circle; lobes make the outline bulge and dip round it.
      const sectors = new Array<number>(12).fill(0)
      let low = Infinity
      let high = -Infinity
      for (let i = 0; i < mesh.position.length; i += 3) {
        const [x, y, z] = [mesh.position[i], mesh.position[i + 1], mesh.position[i + 2]]
        if (y < t.trunk + 0.16 * t.radius) continue
        const s = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 12) % 12
        sectors[s] = Math.max(sectors[s], Math.hypot(x, z))
        low = Math.min(low, y)
        high = Math.max(high, y)
      }
      // Pronounced lobes: a broken silhouette, not a smooth lump.
      expect(Math.max(...sectors) / Math.min(...sectors)).toBeGreaterThan(1.15)
      // A round canopy is a little squashed: less tall than wide.
      if (t.form === 'round') expect(high - low).toBeLessThan(2 * reachOf(t))
    }
  })

  it('turns a conifer’s tiers smooth: no facets in their silhouette', () => {
    for (const t of forms.filter((x) => x.form === 'conifer')) {
      const mesh = treeMesh(t)
      // The widest ring of the lowest tier, seen from above: how much its distance from the axis varies round it.
      let rim = 0
      for (let i = 0; i < mesh.position.length; i += 3) rim = Math.max(rim, Math.hypot(mesh.position[i]!, mesh.position[i + 2]!))
      const ring: number[] = []
      for (let i = 0; i < mesh.position.length; i += 3) {
        const d = Math.hypot(mesh.position[i]!, mesh.position[i + 2]!)
        if (d > rim * 0.97) ring.push(Math.atan2(mesh.position[i + 2]!, mesh.position[i]!))
      }
      // Rim points every so often round: no gap wider than a twelfth of a turn, so no flat facet shows.
      ring.sort((a, b) => a - b)
      const gaps = ring.map((a, i) => (i === 0 ? a + Math.PI * 2 - ring[ring.length - 1]! : a - ring[i - 1]!))
      expect(Math.max(...gaps)).toBeLessThanOrEqual((Math.PI * 2) / 12 + 1e-6)
    }
  })

  it('is outlined more finely than a building, so a canopy’s long silhouette does not read as a sticker', () => {
    expect(SCATTER_LINES.tree).toBeLessThan(SCATTER_LINES.building)
    expect(SCATTER_LINES.tree).toBeGreaterThan(0)
  })

  it('differs from tree to tree', () => {
    const a = treeMesh(tree('round', 0.28, 1)).position
    const b = treeMesh(tree('round', 0.28, 2)).position
    expect(Array.from(a)).not.toEqual(Array.from(b))
  })

  it('is painted in its own leaf colour with a little variation between lobes, on a bark trunk', () => {
    const t = tree('round', 0.28, 5)
    const mesh = treeMesh(t)
    const leaf = new Color(t.color)
    const bark = new Color(scatter.trunk)
    const colours = new Set<string>()
    for (let i = 0; i < mesh.color.length; i += 3) {
      const c = new Color(mesh.color[i], mesh.color[i + 1], mesh.color[i + 2])
      colours.add(c.getHexString())
      const nearLeaf = Math.max(Math.abs(c.r - leaf.r), Math.abs(c.g - leaf.g), Math.abs(c.b - leaf.b)) < 0.06
      const isBark = Math.max(Math.abs(c.r - bark.r), Math.abs(c.g - bark.g), Math.abs(c.b - bark.b)) < 1e-6
      expect(nearLeaf || isBark).toBe(true)
    }
    expect(colours.size).toBeGreaterThan(10)
  })

  it('costs a few hundred triangles', () => {
    for (const t of forms) expect(treeMesh(t).index.length / 3).toBeLessThan(520)
  })
})

describe('a building', () => {
  const sample = (form: Building['form'], storeys: number, rooftop: Rooftop = 'tank'): Building => ({
    dir: up,
    form,
    width: 0.42,
    depth: 0.36,
    storeys,
    height: buildingHeight(form, storeys, 0.18, rooftop),
    yaw: 0,
    wall: scatter.walls[0],
    trim: scatter.trim[0],
    roof: scatter.roofs[form === 'house' ? 0 : 1],
    rooftop: form === 'house' ? 'none' : rooftop,
    rooftopAt: [0.8, -0.5],
    seed: 3,
  })
  const all = [
    sample('block', 2),
    sample('block', 3, 'hut'),
    sample('block', 1, 'skylight'),
    sample('block', 2, 'none'),
    sample('tower', 4),
    sample('house', 1),
    sample('house', 2),
    ...buildings,
  ]

  /** The top of a flat roof's deck, in model units. */
  const deckTop = (b: Building) => BUILDING.plinth + b.storeys * BUILDING.storey + BUILDING.cap + BUILDING.deck.lift

  it('lays its flat roof in its roof colour, darker than its walls, and puts its rooftop detail off the middle', () => {
    for (const kind of ['tank', 'hut', 'skylight'] as const) {
      const b = sample('block', 2, kind)
      const { body } = buildingMesh(b)
      const roof = new Color(b.roof)
      const top = deckTop(b)
      let deck = 0
      const above: Vector3[] = []
      for (let i = 0; i < body.position.length; i += 3) {
        const y = body.position[i + 1]!
        if (Math.abs(y - top) < 1e-4 && Math.abs(body.color[i]! - roof.r) < 1e-6 && Math.abs(body.color[i + 2]! - roof.b) < 1e-6) deck++
        if (y > top + 0.01) above.push(new Vector3().fromArray(body.position, i))
      }
      expect(deck, kind).toBeGreaterThan(0)
      expect(above.length, kind).toBeGreaterThan(0)
      const mid = above.reduce((a, p) => a.add(p), new Vector3()).divideScalar(above.length)
      // Toward a corner or an edge, not in the middle of the roof.
      expect(Math.max(Math.abs(mid.x), Math.abs(mid.z)), kind).toBeGreaterThan(0.06)
    }
    // Nothing on a roof that has nothing.
    const bare = sample('block', 2, 'none')
    const { body } = buildingMesh(bare)
    for (let i = 1; i < body.position.length; i += 3) expect(body.position[i]!).toBeLessThanOrEqual(deckTop(bare) + 1e-6)
  })

  it('is sound and stays within its reach and height', () => {
    for (const b of all) {
      const { body, glass } = buildingMesh(b)
      expectSound(body)
      expectSound(glass)
      const { reach, high, low } = extent(body)
      expect(reach).toBeLessThanOrEqual(reachOf(b) + 1e-6)
      expect(high).toBeLessThanOrEqual(b.height + 1e-6)
      expect(low).toBeLessThan(0)
    }
  })

  it('has windows on every storey and every side: some glass, some dark', () => {
    for (const b of all) {
      const { glass, body } = buildingMesh(b)
      const panes = glass.index.length / 6
      expect(panes).toBeGreaterThan(0)
      // Pane coordinates run -1..1 across each pane, for the glass's sky gradient and highlight.
      for (const v of glass.pane) expect(Math.abs(v)).toBeLessThanOrEqual(1 + 1e-6)
      // Glass faces out: every pane's normal points away from the building's middle.
      for (let i = 0; i < glass.index.length; i += 3) {
        const [a, bb, c] = [0, 1, 2].map((k) => new Vector3().fromArray(glass.position, glass.index[i + k] * 3))
        const n = bb.clone().sub(a).cross(c.clone().sub(a))
        expect(n.dot(new Vector3(a.x, 0, a.z))).toBeGreaterThan(0)
      }
      const dark = new Color(scatter.windowOff)
      let darkVerts = 0
      for (let i = 0; i < body.color.length; i += 3) if (Math.abs(body.color[i] - dark.r) < 1e-6 && Math.abs(body.color[i + 2] - dark.b) < 1e-6) darkVerts++
      if (b.storeys * 4 >= 6) expect(darkVerts).toBeGreaterThan(0)
    }
  })

  it('has bevelled edges that catch the light, as the kit does', () => {
    const { body } = buildingMesh(sample('block', 2))
    expect(body.bevel.some((v) => v === 1)).toBe(true)
    expect(body.bevel.some((v) => v === 0)).toBe(true)
  })
})

describe('the whole scatter', () => {
  const meshes = scatterMeshes(trees, buildings, districts)

  it('is sound', () => {
    expectSound(meshes.trees)
    expectSound(meshes.buildings)
    expectSound(meshes.glass)
    expectSound(meshes.shadows)
  })

  it('stays inside the budget: at most 60,000 triangles and 6 draw calls more than the round trees and plain blocks', () => {
    // The scatter it replaced: 210 round trees (180 triangles) and 33 boxes (12), each with an outline shell, in 4 draw calls.
    expect(SCATTER_TRIANGLE_BUDGET).toBe(210 * 180 * 2 + 33 * 12 * 2 + 60_000)
    const total = scatterTriangles(meshes)
    expect(total).toBeLessThanOrEqual(SCATTER_TRIANGLE_BUDGET)
    expect(SCATTER_DRAW_CALLS).toBeLessThanOrEqual(4 + 6)
  })

  it('stands every tree and building on the ground where it is planted, in world units', () => {
    // Every vertex is within a tree's or building's height of the ground below it, never far under it.
    for (const mesh of [meshes.trees, meshes.buildings]) {
      for (let i = 0; i < mesh.position.length; i += 3 * 7) {
        const p = new Vector3().fromArray(mesh.position, i)
        const ground = 1 + heightAt(p.clone().normalize(), districts)
        expect(p.length() - ground).toBeGreaterThan(-0.12 * MODEL_SCALE)
        expect(p.length() - ground).toBeLessThan(2 * MODEL_SCALE)
      }
    }
  })

  it('lays a soft shadow on the ground under each one, following the ground', () => {
    expect(meshes.shadows.index.length / 3).toBe((trees.length + buildings.length) * 8)
    for (let i = 0; i < meshes.shadows.position.length; i += 3) {
      const p = new Vector3().fromArray(meshes.shadows.position, i)
      const ground = 1 + heightAt(p.clone().normalize(), districts)
      expect(p.length() - ground).toBeCloseTo(SHADOW.lift * MODEL_SCALE, 6)
    }
    for (const v of meshes.shadows.uv) expect(v >= 0 && v <= 1).toBe(true)
  })

  it('draws half the trees, and their shadows, at low quality', () => {
    const half = Math.floor(trees.length / 2)
    expect(meshes.lowTrees).toBe(half === 0 ? 0 : meshes.treeEnds[half - 1])
    expect(meshes.treeEnds).toHaveLength(trees.length)
    expect(meshes.treeEnds[trees.length - 1]).toBe(meshes.trees.index.length)
    expect(meshes.lowShadows).toBe((buildings.length + half) * 8 * 3)
  })

  it('carries what the kit material needs: a bevel and a height above the ground in model units', () => {
    const verts = meshes.trees.position.length / 3
    expect(meshes.trees.bevel).toHaveLength(verts)
    expect(meshes.trees.height).toHaveLength(verts)
    expect(meshes.trees.color).toHaveLength(verts * 3)
    expect(Math.max(...meshes.trees.height)).toBeLessThanOrEqual(Math.max(...trees.map((t) => t.height)) + 1e-6)
  })
})
