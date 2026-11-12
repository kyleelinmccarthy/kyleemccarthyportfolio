import { describe, it, expect } from 'vitest'
import { Vector3, type BufferGeometry } from 'three'
import { extrudedGeometry } from '@/components/world/models/kit'
import {
  archOutline,
  beamMesh,
  blobAxes,
  blockMesh,
  cleanPlate,
  clothMesh,
  clothOffset,
  clothWave,
  dieMesh,
  ellipseOutline,
  emblemMesh,
  flowerOutline,
  snowPeakMeshes,
  flameOutline,
  flameProfile,
  turnedMesh,
  gableRoofParts,
  ringMesh,
  roofCourses,
  roofParts,
  roundedMesh,
  brickCourses,
  puffCloudMesh,
  rainColumn,
  rainMesh,
  rainTravel,
  SIGNAL,
  signalMesh,
  stripedMeshes,
  tuftedMesh,
  streetLampParts,
  trussMesh,
  starOutline,
  waterMesh,
  type MeshData,
  type Point2,
  type RoofStyle,
  type Vec3,
} from '@/lib/world/kit'

/** Every position finite; every triangle with area has unit normals that do not face apart. */
function sound(positions: ArrayLike<number>, normals: ArrayLike<number>, index?: ArrayLike<number> | null): string | null {
  for (let i = 0; i < positions.length; i++) if (!Number.isFinite(positions[i])) return 'non-finite position'
  const count = positions.length / 3
  const v = (arr: ArrayLike<number>, i: number) => new Vector3(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2])
  const ids = index ? Array.from(index) : Array.from({ length: count }, (_, i) => i)
  for (let t = 0; t < ids.length; t += 3) {
    const [a, b, c] = [ids[t], ids[t + 1], ids[t + 2]]
    const area = v(positions, b).sub(v(positions, a)).cross(v(positions, c).sub(v(positions, a))).length()
    if (area < 1e-12) continue
    const ns = [v(normals, a), v(normals, b), v(normals, c)]
    for (const n of ns) if (!(Math.abs(n.length() - 1) < 0.01)) return `normal length ${n.length()}`
    if (Math.min(ns[0].dot(ns[1]), ns[1].dot(ns[2]), ns[0].dot(ns[2])) < -1e-6) return 'normals facing apart'
  }
  return null
}
const soundMesh = (m: MeshData) => sound(m.positions, m.normals, m.index)
const soundGeometry = (g: BufferGeometry) =>
  sound(g.getAttribute('position').array as ArrayLike<number>, g.getAttribute('normal').array as ArrayLike<number>, g.index?.array)

const finite = (xs: number[]) => xs.every((x) => Number.isFinite(x))

describe('a whole roof survives every prop', () => {
  it('body, tile courses and ridge, for any size, overhang, fascia, bevel, course count and ridge', () => {
    const sizes: Vec3[] = [[1, 0.4, 0.8], [1, 0.4, 0], [0, 0.4, 0.8], [1, 0, 0.8], [0, 0, 0], [1, NaN, 0.8], [-1, 0.4, 0.8]]
    for (const style of ['gable', 'hip', 'shed'] as RoofStyle[]) {
      for (const size of sizes) {
        for (const [overhang, fascia] of [[0.08, 0.06], [0, 0], [NaN, NaN], [-0.5, 2], [Infinity, 0.06]]) {
          for (const courses of [undefined, 0, 3, 2.5, -1, NaN, Infinity, 1e9]) {
            for (const ridge of [true, false]) {
              const label = `${style} ${size} overhang ${overhang} fascia ${fascia} courses ${courses} ridge ${ridge}`
              let parts: ReturnType<typeof roofParts> | null = null
              expect(() => (parts = roofParts(style, size, overhang, fascia, 0.03, courses, ridge)), label).not.toThrow()
              const { body, tiles, cap } = parts!
              expect(soundMesh(body), label).toBeNull()
              expect(tiles.length, label).toBeLessThanOrEqual(80)
              for (const tile of [...tiles, ...(cap ? [cap] : [])]) {
                expect(finite([...tile.at, ...tile.size, ...tile.rot]), label).toBe(true)
                for (const s of tile.size) expect(s, label).toBeGreaterThanOrEqual(0)
                expect(soundMesh(blockMesh(tile.size, 0.01)), label).toBeNull()
              }
            }
          }
        }
      }
    }
  })

  it('a gabled roof with gable walls: slabs and attic sound or empty, for any size, overhang, fascia and bevel', () => {
    const sizes: Vec3[] = [[1, 0.4, 0.8], [1, 0.4, 0], [0, 0.4, 0.8], [1, 0, 0.8], [0, 0, 0], [1, NaN, 0.8], [-1, 0.4, 0.8], [1, 0.01, 0.8]]
    for (const size of sizes) {
      for (const [overhang, fascia] of [[0.08, 0.06], [0, 0], [NaN, NaN], [-0.5, 2], [Infinity, 0.06], [0.08, 0.4]]) {
        for (const bevel of [0.03, 0, -1, NaN, 5]) {
          const label = `${size} overhang ${overhang} fascia ${fascia} bevel ${bevel}`
          let parts: ReturnType<typeof gableRoofParts> | null = null
          expect(() => (parts = gableRoofParts(size, overhang, fascia, bevel)), label).not.toThrow()
          expect(soundMesh(parts!.slabs), label).toBeNull()
          expect(soundMesh(parts!.attic), label).toBeNull()
        }
      }
    }
  })

  it('caps the course count, and gives a zero-depth roof or a fascia that is not a number no tiles at all', () => {
    expect(roofCourses('gable', [1, 0.4, 0.8], 0.08, 0.06, Infinity).length).toBeLessThanOrEqual(80)
    expect(roofCourses('gable', [1, 0, 0], 0, 0.06, 4)).toEqual([])
    for (const tile of roofCourses('gable', [1, 0.4, 0.8], 0.08, NaN, 4)) expect(finite([...tile.at, ...tile.size, ...tile.rot])).toBe(true)
  })

  it('keeps the ridge cap and the courses independent', () => {
    expect(roofParts('gable', [1, 0.4, 0.8], 0.08, 0.06, 0.03, 0, true).cap).not.toBeNull()
    expect(roofParts('gable', [1, 0.4, 0.8], 0.08, 0.06, 0.03, 0, true).tiles).toHaveLength(0)
    expect(roofParts('gable', [1, 0.4, 0.8], 0.08, 0.06, 0.03, 4, false).cap).toBeNull()
    expect(roofParts('gable', [1, 0.4, 0.8], 0.08, 0.06, 0.03, 4, false).tiles).toHaveLength(8)
    expect(roofParts('hip', [1, 0.4, 0.8], 0.08, 0.06, 0.03, 4, true).cap).toBeNull()
  })
})

describe('a shaped plate survives every prop', () => {
  const shapes: Point2[][] = [
    starOutline(5, 0.2, 0.09),
    [[0, 0], [1, 0], [1, 1], [0, 1]],
    [[0, 0], [1, 0]],
    [],
    [[0, 0], [1, 0], [2, 0]], // no area
    [[0, 0], [NaN, 0], [1, 1], [0, 1]],
    [[0, 0], [0, 0], [0, 0], [0, 0]],
    [[0, 0], [1, 1], [1, 0], [0, 1]], // crosses itself
  ]
  it('draws a sound shape or nothing, for any outline, depth and bevel', () => {
    for (const shape of shapes) {
      for (const depth of [0.05, 0, -1, NaN, 1e-5, 3]) {
        for (const bevel of [0.012, 0, -1, NaN, 5]) {
          for (const grow of [0, 0.009]) {
            const label = `${JSON.stringify(shape)} depth ${depth} bevel ${bevel} grow ${grow}`
            let g: BufferGeometry | null = null
            expect(() => (g = extrudedGeometry(shape, depth, bevel, grow)), label).not.toThrow()
            expect(soundGeometry(g!), label).toBeNull()
          }
        }
      }
    }
  })

  it('keeps a usable plate as it is and drops one with no area', () => {
    expect(cleanPlate(starOutline(5, 0.2, 0.09), 0.05, 0.012)).not.toBeNull()
    expect(cleanPlate([[0, 0], [1, 0], [2, 0]], 0.05, 0.012)).toBeNull()
    expect(cleanPlate([[0, 0], [1, 0], [1, 1]], 0, 0.012)).toBeNull()
    const plate = cleanPlate([[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]], 0.05, 5)!
    // The bevel never eats the shape: at most a quarter of its narrowest side, and under half its depth.
    expect(plate.bevel).toBeLessThanOrEqual(0.025)
    expect(plate.bevel).toBeLessThan(0.025 + 1e-9)
  })
})

describe('a ring, a beam, water and a flag survive every prop', () => {
  const values = [0.3, 0, -1, NaN, Infinity, 1e-9, 5]
  const counts = [8, 0, -3, NaN, Infinity, 2.5, 1e9]

  it('a ring draws a sound hoop or nothing, for any radius, thickness and side counts', () => {
    for (const radius of values) {
      for (const thickness of values) {
        for (const sides of counts) {
          const label = `radius ${radius} thickness ${thickness} sides ${sides}`
          let mesh: MeshData | null = null
          expect(() => (mesh = ringMesh(radius, thickness, sides, sides)), label).not.toThrow()
          expect(soundMesh(mesh!), label).toBeNull()
          expect(mesh!.bevel.length * 3, label).toBe(mesh!.positions.length)
        }
      }
    }
  })

  it('a truss draws a sound lattice or nothing, for any height, width, side count, bays and bar', () => {
    for (const height of values) {
      for (const width of values) {
        for (const sides of [3, NaN, 9]) {
          for (const bays of [2, 0, NaN, 1e9]) {
            for (const bar of [0.014, -1, 5]) {
              const label = `height ${height} width ${width} sides ${sides} bays ${bays} bar ${bar}`
              let mesh: MeshData | null = null
              expect(() => (mesh = trussMesh(height, width, sides, bays, bar)), label).not.toThrow()
              expect(soundMesh(mesh!), label).toBeNull()
              expect(mesh!.bevel.length * 3, label).toBe(mesh!.positions.length)
            }
          }
        }
      }
    }
  })

  it('a street lamp stands sound, inside its height and on the ground, or is nothing, for any height and lantern, with a foot or without', () => {
    for (const height of values) {
      for (const lantern of values) {
        for (const foot of [false, true]) {
          const label = `height ${height} lantern ${lantern} foot ${foot}`
          let lamp: ReturnType<typeof streetLampParts> = null
          expect(() => (lamp = streetLampParts(height, lantern, foot)), label).not.toThrow()
          if (!lamp) continue
          const { post, lantern: glass, cap, foot: base } = lamp as NonNullable<ReturnType<typeof streetLampParts>>
          const boxes = [glass, cap, ...(base ? [base] : [])]
          const numbers = [post.bottom, post.top, post.height, ...post.at, ...boxes.flatMap((b) => [...b.size, ...b.at])]
          expect(numbers.every(Number.isFinite), label).toBe(true)
          expect(boxes.every((b) => b.size.every((s) => s > 0) && b.at[1] - b.size[1] / 2 >= -1e-9), label).toBe(true)
          expect(post.height > 0 && post.bottom > 0 && post.top > 0, label).toBe(true)
          expect(cap.at[1] + cap.size[1] / 2, label).toBeCloseTo(height, 9)
        }
      }
    }
  })

  it('a turned shape in stripes draws sound gores or nothing, for any profile, side count, bevel and gore count', () => {
    const profiles: Point2[][] = [
      [[0, 0], [0.5, 0], [0.5, 0.4], [0, 0.8]],
      [[0, 0], [0, 1]],
      [],
      [[0, 0], [NaN, 0.2], [0.3, 0.4], [0, 0.5]],
      [[0, 0], [-1, 0.2], [0.3, 0.4], [0, 0.5]],
      [[0, 0], [0.3, 0], [0.3, 0], [0, 0]],
    ]
    for (const profile of profiles) {
      for (const sides of counts) {
        for (const bevel of [0.02, 0, -1, NaN, 5]) {
          for (const stripes of counts) {
            const label = `${JSON.stringify(profile)} sides ${sides} bevel ${bevel} stripes ${stripes}`
            let parts: ReturnType<typeof stripedMeshes> | null = null
            expect(() => (parts = stripedMeshes(profile, sides, bevel, stripes)), label).not.toThrow()
            const { whole, gores } = parts!
            for (const mesh of [whole, ...gores]) {
              expect(soundMesh(mesh), label).toBeNull()
              expect(mesh.bevel.length * 3, label).toBe(mesh.positions.length)
            }
            expect((gores[0].index?.length ?? 0) + (gores[1].index?.length ?? 0), label).toBe(whole.index?.length ?? 0)
          }
        }
      }
    }
  })

  it('rings of light draw sound squares or nothing, for any radius and ring count', () => {
    for (const radius of values) {
      for (const rings of counts) {
        const label = `radius ${radius} rings ${rings}`
        let mesh: ReturnType<typeof signalMesh> | null = null
        expect(() => (mesh = signalMesh(radius, rings)), label).not.toThrow()
        expect(soundMesh(mesh!), label).toBeNull()
        expect(mesh!.ring.length * 3, label).toBe(mesh!.positions.length)
        expect(mesh!.corner.length * 3, label).toBe(mesh!.positions.length * 2)
        expect(finite([...Array.from(mesh!.ring), ...Array.from(mesh!.corner)]), label).toBe(true)
        expect(mesh!.positions.length / 12, label).toBeLessThanOrEqual(SIGNAL.most)
      }
    }
  })

  it('a beam draws a sound cone or nothing, for any length, widths and side count', () => {
    for (const length of values) {
      for (const near of values) {
        for (const far of values) {
          for (const sides of [16, 0, NaN, 1e9]) {
            const label = `length ${length} near ${near} far ${far} sides ${sides}`
            let mesh: ReturnType<typeof beamMesh> | null = null
            expect(() => (mesh = beamMesh(length, near, far, sides)), label).not.toThrow()
            expect(soundMesh(mesh!), label).toBeNull()
            expect(mesh!.along.length * 3, label).toBe(mesh!.positions.length)
            expect(finite(Array.from(mesh!.along)), label).toBe(true)
          }
        }
      }
    }
  })

  it('water draws a sound surface or nothing, for any outline and ring count', () => {
    const shapes: Point2[][] = [
      ellipseOutline(0.3, 0.2, 20),
      ellipseOutline(0, 0.2, 20),
      ellipseOutline(NaN, NaN, NaN),
      [],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [NaN, 0], [1, 1], [0, 1]],
      [[0, 0], [0, 0], [0, 0]],
    ]
    for (const shape of shapes) {
      for (const rings of counts) {
        const label = `${JSON.stringify(shape)} rings ${rings}`
        let mesh: ReturnType<typeof waterMesh> | null = null
        expect(() => (mesh = waterMesh(shape, rings)), label).not.toThrow()
        expect(soundMesh(mesh!), label).toBeNull()
        expect(mesh!.edge.length * 3, label).toBe(mesh!.positions.length)
        expect(finite(Array.from(mesh!.edge)), label).toBe(true)
      }
    }
  })

  it('a flag’s cloth is a sound slab or nothing, and its ripple finite, for any size, columns, grow, amount and speed', () => {
    for (const w of values) {
      for (const h of values) {
        for (const n of counts) {
          for (const grow of [0, 0.005, -1, NaN]) {
            for (const taper of [0, 0.6, 1, -1, NaN, Infinity, 5]) {
              const label = `${w} ${h} ${n} ${grow} taper ${taper}`
              let mesh: MeshData | null = null
              expect(() => (mesh = clothMesh(w, h, n, grow, taper)), label).not.toThrow()
              expect(soundMesh(mesh!), label).toBeNull()
            }
          }
        }
        for (const amount of values) {
          for (const speed of values) {
            const wave = clothWave(w, amount, speed)
            expect(finite([wave.amplitude, wave.speed, wave.width, clothOffset(0.1, 2, wave), clothOffset(w, 1e6, wave)]), `${w} ${amount} ${speed}`).toBe(true)
          }
        }
      }
    }
  })

  it('a flame is a sound turned teardrop or nothing, and its flat outline a plate or nothing, for any size', () => {
    for (const r of values) {
      for (const h of values) {
        const label = `${r} ${h}`
        const profile = flameProfile(r, h)
        expect(finite(profile.flat()), label).toBe(true)
        if (profile.length) expect(soundMesh(turnedMesh(profile, 12, Math.min(r, h) * 0.15)), label).toBeNull()
        const shape = flameOutline(r, h)
        expect(finite(shape.flat()), label).toBe(true)
        expect(soundGeometry(extrudedGeometry(shape, 0.01, 0.002, 0)), label).toBeNull()
      }
    }
  })

  it('a snow-capped peak, a die and a flag’s emblem draw sound shapes or nothing, for any size, sides, snow line, seed, bevel and piece', () => {
    for (const r of values) {
      for (const h of values) {
        for (const sides of counts) {
          for (const snow of [0.7, 0, 1, -1, NaN, 5]) {
            const label = `peak ${r} ${h} ${sides} ${snow}`
            let m: ReturnType<typeof snowPeakMeshes> | null = null
            expect(() => (m = snowPeakMeshes(r, h, sides, snow, sides)), label).not.toThrow()
            for (const part of [m!.rock, m!.cap, m!.shell]) expect(soundMesh(part), label).toBeNull()
          }
        }
        let die: MeshData | null = null
        expect(() => (die = dieMesh(r, h)), `die ${r} ${h}`).not.toThrow()
        expect(soundMesh(die!), `die ${r} ${h}`).toBeNull()
        for (const piece of [starOutline(5, 0.05, 0.02), [], [[0, 0], [NaN, 1], [1, 1]] as Point2[], [[0, 0], [0, 0], [0, 0]] as Point2[], ellipseOutline(r, h, 8)]) {
          let emblem: MeshData | null = null
          expect(() => (emblem = emblemMesh([piece], r, h)), `emblem ${r} ${h}`).not.toThrow()
          expect(soundMesh(emblem!), `emblem ${r} ${h}`).toBeNull()
        }
      }
    }
  })

  it('arches and ovals stay finite, and make plates or nothing, for any size', () => {
    for (const a of values) {
      for (const b of values) {
        for (const steps of counts) {
          for (const shape of [archOutline(a, b, steps), ellipseOutline(a, b, steps), ellipseOutline(a, b, steps, a), flowerOutline(steps, a, b)]) {
            expect(finite(shape.flat()), `${a} ${b} ${steps}`).toBe(true)
            expect(soundGeometry(extrudedGeometry(shape, 0.03, 0.01, 0)), `${a} ${b} ${steps}`).toBeNull()
          }
        }
      }
    }
  })
})

describe('a soft shape survives every prop', () => {
  const counts = [24, 0, -3, NaN, Infinity, 2.5, 1e9]

  it('a rounded box draws a sound soft shape or nothing, for any size, rounding and step counts', () => {
    for (const size of [[0.3, 0.2, 0.25], [0, 0.2, 0.2], [0.2, -1, 0.2], [NaN, 0.2, 0.2], [Infinity, 0.2, 0.2], [1e-9, 1e-9, 1e-9], [5, 0.01, 5]] as Vec3[]) {
      for (const round of [0.4, 0, -1, NaN, Infinity, 1, 5]) {
        for (const steps of counts) {
          const label = `${size} round ${round} steps ${steps}`
          let mesh: MeshData | null = null
          expect(() => (mesh = roundedMesh(size, round, steps, steps)), label).not.toThrow()
          expect(soundMesh(mesh!), label).toBeNull()
          expect(mesh!.bevel.length * 3, label).toBe(mesh!.positions.length)
          expect(finite(Array.from(mesh!.bevel)), label).toBe(true)
        }
      }
    }
  })
})

describe('fur, bricks, rain and a cloud survive every prop', () => {
  const values = [0.3, 0, -1, NaN, Infinity, 1e-9, 5]
  const counts = [40, 0, -3, NaN, Infinity, 2.5, 1e9]

  it('a tufted ball draws a sound lumpy shape or nothing, for any radius, squash, tufts, depth and steps', () => {
    for (const radius of values) {
      for (const squash of [[1, 1, 1], [1, 0, 1], [NaN, 1, 1], [-1, 1, 1], [2, 0.5, 1]] as Vec3[]) {
        for (const tufts of counts) {
          for (const depth of [0.12, 0, -1, NaN, Infinity, 3]) {
            const label = `${radius} ${squash} ${tufts} ${depth}`
            let mesh: MeshData | null = null
            expect(() => (mesh = tuftedMesh(radius, squash, tufts, depth, 16, 8)), label).not.toThrow()
            expect(soundMesh(mesh!), label).toBeNull()
            expect(finite(Array.from(mesh!.bevel)), label).toBe(true)
          }
        }
      }
    }
  })

  it('brick courses are sound bricks or none, for any wall, brick, joint, depth and shades', () => {
    for (const w of values) {
      for (const brick of [[0.11, 0.045], [0, 0.045], [NaN, 1], [-1, 0.04], [5, 5], [1e-9, 1e-9]] as Array<[number, number]>) {
        for (const joint of [0.012, 0, -1, NaN, 5]) {
          for (const shades of [3, 0, NaN, 1e9]) {
            const label = `${w} ${brick} ${joint} ${shades}`
            let meshes: MeshData[] = []
            expect(() => (meshes = brickCourses(w, 0.4, brick, joint, 0.01, shades)), label).not.toThrow()
            expect(meshes.length, label).toBeGreaterThan(0)
            for (const mesh of meshes) expect(soundMesh(mesh), label).toBeNull()
          }
        }
      }
    }
  })

  it('rain is sound streaks or none, and a cloud sound puffs or none, for any size', () => {
    for (const n of counts) {
      for (const r of values) {
        for (const fall of values) {
          for (const length of [0.14, 0, NaN, -1, 9]) {
            const label = `${n} ${r} ${fall} ${length}`
            let mesh: ReturnType<typeof rainMesh> | null = null
            expect(() => (mesh = rainMesh(n, r, fall, length, NaN)), label).not.toThrow()
            expect(finite([...mesh!.positions, ...mesh!.corner, ...mesh!.phase]), label).toBe(true)
            expect(finite([rainTravel(fall, length)]), label).toBe(true)
          }
        }
      }
    }
    for (const across of [1, 0, -1, NaN, Infinity, 5]) {
      const mesh = rainMesh(50, 0.4, 1, 0.14, 3, across)
      expect(finite([...mesh.positions]), `across ${across}`).toBe(true)
      expect(finite(Object.values(rainColumn(0.4, 1, across))), `across ${across}`).toBe(true)
    }
    for (const a of values) for (const b of values) expect(soundMesh(puffCloudMesh(a, b, 0.4)), `${a} ${b}`).toBeNull()
  })
})

describe('a ball survives every prop', () => {
  it('has finite, positive axes and outline, or draws nothing', () => {
    for (const radius of [0.2, 0, -1, NaN, Infinity, 1e-9]) {
      for (const squash of [[1, 1, 1], [1, 0, 1], [NaN, 1, 1], [-1, 1, 1], [2, 0.5, 1]] as Vec3[]) {
        const axes = blobAxes(radius, squash)
        if (axes === null) continue
        expect(finite([...axes.body, ...axes.shell])).toBe(true)
        for (const a of [...axes.body, ...axes.shell]) expect(a).toBeGreaterThan(0)
      }
    }
    expect(blobAxes(0.2, [1, 1, 1])).not.toBeNull()
    expect(blobAxes(0, [1, 1, 1])).toBeNull()
    expect(blobAxes(0.2, [1, 0, 1])).toBeNull()
  })
})
