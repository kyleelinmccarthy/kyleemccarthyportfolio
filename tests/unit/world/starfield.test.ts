import { describe, it, expect } from 'vitest'
import { Matrix4, Vector3 } from 'three'
import { constellations } from '@/content/sky'
import { overviewDistance } from '@/lib/world/camera'
import { angleDeg, dirOf, latLonOf, surfaceFrame } from '@/lib/world/geo'
import { WORLD_SEED, mulberry32 } from '@/lib/world/rng'
import {
  CLOUD_SEEDS,
  FAR_CLOUDS,
  SKY_RADIUS,
  buildStarField,
  constellationAnchor,
  constellationPoints,
  cumulus,
  farCloudSpheres,
  farClouds,
  lowClouds,
  puffMatrix,
  starCounts,
} from '@/lib/world/starfield'

describe('star field', () => {
  it('is identical for the same seed and smaller at low quality', () => {
    const a = buildStarField(WORLD_SEED, 'high'),
      b = buildStarField(WORLD_SEED, 'high'),
      low = buildStarField(WORLD_SEED, 'low')
    expect(Array.from(a.positions.slice(0, 30))).toEqual(Array.from(b.positions.slice(0, 30)))
    expect(a.sizes.length).toBe(4450)
    expect(low.sizes.length).toBe(2225)
  })

  it('differs for another seed', () => {
    const a = buildStarField(WORLD_SEED, 'high')
    const b = buildStarField(WORLD_SEED + 1, 'high')
    expect(Array.from(a.positions.slice(0, 30))).not.toEqual(Array.from(b.positions.slice(0, 30)))
  })

  it('gives every star a position, a colour, a size and a phase', () => {
    for (const quality of ['high', 'low'] as const) {
      const s = buildStarField(WORLD_SEED, quality)
      const n = s.sizes.length
      expect(s.positions.length).toBe(n * 3)
      expect(s.colors.length).toBe(n * 3)
      expect(s.phases.length).toBe(n)
      for (const v of [...s.positions, ...s.colors, ...s.sizes, ...s.phases]) expect(Number.isFinite(v)).toBe(true)
    }
  })

  it('puts every star on the sky sphere', () => {
    const s = buildStarField(WORLD_SEED, 'high')
    for (let i = 0; i < s.positions.length; i += 3) expect(Math.hypot(s.positions[i], s.positions[i + 1], s.positions[i + 2])).toBeCloseTo(40, 3)
    expect(SKY_RADIUS).toBe(40)
  })

  it('counts half of each layer at low quality, with the dust last', () => {
    expect(starCounts('high')).toEqual({ scattered: 1700, band: 2600, dust: 150 })
    expect(starCounts('low')).toEqual({ scattered: 850, band: 1300, dust: 75 })
    // The dust is the large, faint glow: every star after the band is one, and none before it.
    const s = buildStarField(WORLD_SEED, 'high')
    const { scattered, band } = starCounts('high')
    const before = Array.from(s.sizes.slice(0, scattered + band))
    const dust = Array.from(s.sizes.slice(scattered + band))
    expect(Math.max(...before)).toBeLessThan(4)
    expect(Math.min(...dust)).toBeGreaterThanOrEqual(90)
  })
})

describe('constellations', () => {
  it('lays a constellation out around its sky position', () => {
    for (const c of constellations) {
      const pts = constellationPoints(c, 40)
      expect(pts).toHaveLength(c.points.length)
      for (const p of pts) expect(angleDeg(p.clone().normalize(), dirOf(c.at))).toBeLessThan(6)
    }
  })

  it('keeps a figure the right way up and the right way round, as seen from the planet', () => {
    // Looked at through the planet from outside, as the camera does, a figure's +x runs to the right (the
    // sky's local west) and its +y runs up (north), so it reads as drawn.
    const crown = constellations.find((c) => c.name === 'The Crown')!
    const pts = constellationPoints(crown, 40)
    const { south, east } = surfaceFrame(dirOf(crown.at))
    // Point 3 is the crown's top (0, 3); point 0 its bottom-left (-4, -2).
    expect(pts[3].dot(south)).toBeLessThan(pts[0].dot(south))
    expect(pts[0].dot(east)).toBeGreaterThan(pts[6].dot(east))
  })

  it('keeps the same angular size at any radius', () => {
    const c = constellations[0]
    const near = constellationPoints(c, 20)
    const far = constellationPoints(c, 40)
    near.forEach((p, i) => expect(angleDeg(p.clone().normalize(), far[i].clone().normalize())).toBeCloseTo(0, 4))
  })

  it('anchors the label just under the figure', () => {
    for (const c of constellations) {
      const at = constellationAnchor(c, 40)
      const centre = dirOf(c.at)
      const { south } = surfaceFrame(centre)
      expect(at.clone().sub(centre.clone().multiplyScalar(40)).normalize().dot(south)).toBeCloseTo(1, 6)
      expect(angleDeg(at.clone().normalize(), centre)).toBeLessThan(6)
    }
  })
})

describe('cumulus', () => {
  it('gives a cloud a flat base and a tapering top', () => {
    const c = cumulus(mulberry32(1), 8, 2)
    expect(c.length).toBe(13)
    expect(c.filter((p) => p.position[1] === 0)).toHaveLength(5)
  })

  it('stacks its puffs higher and smaller as it rises', () => {
    const c = cumulus(mulberry32(7), 10, 3)
    const tops = c.slice(5)
    for (let i = 1; i < tops.length; i++) expect(tops[i].position[1]).toBeGreaterThan(tops[i - 1].position[1])
    // The last puff is at most the top size, the first at least the bottom of the range.
    expect(tops[tops.length - 1].scale[0]).toBeLessThan(tops[0].scale[0])
    expect(Math.max(...c.map((p) => p.position[1]))).toBeLessThanOrEqual(0.35 + 3)
  })

  it('squashes each puff: wide, a little shorter, and shallow', () => {
    for (const p of cumulus(mulberry32(3), 6, 1.5)) {
      const [x, y, z] = p.scale
      expect(y).toBeCloseTo(x * 0.84, 9)
      expect(z).toBeCloseTo(x * 0.62, 9)
    }
  })

  it('is the same cloud for the same generator state', () => {
    expect(cumulus(mulberry32(5), 7, 2)).toEqual(cumulus(mulberry32(5), 7, 2))
  })
})

describe('cloud layers', () => {
  // Always the seeds the scene draws with, so these check the clouds that are on the screen.
  const centreOf = (m: Matrix4) => new Vector3().setFromMatrixPosition(m)

  it('rings the sky with thirteen far clouds, or seven at low quality, all 14 to 20 units out', () => {
    for (const [quality, count] of [['high', 13], ['low', 7]] as const) {
      const far = farClouds(CLOUD_SEEDS.far, quality)
      expect(far).toHaveLength(count)
      expect(FAR_CLOUDS[quality]).toBe(count)
      for (const c of far) {
        const r = centreOf(c.matrix).length()
        expect(r).toBeGreaterThanOrEqual(14)
        expect(r).toBeLessThan(20)
        expect(c.puffs.length).toBeGreaterThanOrEqual(5 + 7)
        expect(c.puffs.length).toBeLessThanOrEqual(5 + 12)
      }
      // Spread all the way round, not bunched on one side.
      const lons = far.map((c) => latLonOf(centreOf(c.matrix)).lon).sort((a, b) => a - b)
      const gaps = lons.map((lon, i) => (i === 0 ? lon + 360 - lons[lons.length - 1] : lon - lons[i - 1]))
      expect(Math.max(...gaps)).toBeLessThan(90)
    }
  })

  it('keeps every puff of every far cloud beyond the furthest the camera can zoom out', () => {
    // A narrow phone's overview, plus the rig's 2.5 of zoom-out room.
    const cameraReach = overviewDistance(360 / 800) + 2.5
    for (const quality of ['high', 'low'] as const) {
      for (const c of farClouds(CLOUD_SEEDS.far, quality)) {
        for (const p of c.puffs) {
          const m = puffMatrix(c.matrix, p)
          const nearest = centreOf(m).length() - m.getMaxScaleOnAxis()
          expect(nearest).toBeGreaterThan(cameraReach)
        }
      }
    }
  })

  it('gives every puff of every far cloud as a sphere round it, for what a cloud can hide', () => {
    for (const quality of ['high', 'low'] as const) {
      const clouds = farClouds(CLOUD_SEEDS.far, quality)
      const spheres = farCloudSpheres(CLOUD_SEEDS.far, quality)
      expect(spheres).toHaveLength(clouds.reduce((n, c) => n + c.puffs.length, 0))
      const first = puffMatrix(clouds[0].matrix, clouds[0].puffs[0])
      expect(spheres[0].centre.distanceTo(centreOf(first))).toBeLessThan(1e-9)
      expect(spheres[0].radius).toBeCloseTo(first.getMaxScaleOnAxis())
      for (const s of spheres) {
        expect(s.radius).toBeGreaterThan(0)
        expect(s.centre.length()).toBeGreaterThan(13)
      }
    }
  })

  it('stands each far cloud upright, its base towards the bottom of the sky', () => {
    for (const c of farClouds(CLOUD_SEEDS.far, 'high')) {
      const up = new Vector3(0, 1, 0).transformDirection(c.matrix)
      expect(up.y).toBeGreaterThan(0.85)
      // Its face is towards the planet.
      const facing = new Vector3(0, 0, 1).transformDirection(c.matrix)
      expect(facing.dot(centreOf(c.matrix).normalize())).toBeCloseTo(-1, 6)
    }
  })

  it('floats eight small clouds just over the planet, upright on it, each turning slowly about its own axis', () => {
    const low = lowClouds(CLOUD_SEEDS.low)
    expect(low).toHaveLength(8)
    for (const c of low) {
      const at = centreOf(c.matrix)
      expect(at.length()).toBeGreaterThanOrEqual(1.19)
      expect(at.length()).toBeLessThan(1.24)
      // Its base lies on the planet and its puffs rise away from it.
      const up = new Vector3(0, 1, 0).transformDirection(c.matrix)
      expect(up.dot(at.normalize())).toBeCloseTo(1, 6)
      expect(c.axis.length()).toBeCloseTo(1, 9)
      expect(c.speed).toBeGreaterThanOrEqual(0.012)
      expect(c.speed).toBeLessThan(0.032)
      expect(c.puffs).toHaveLength(8)
    }
  })

  it('is the same sky on every visit', () => {
    expect(farClouds(CLOUD_SEEDS.far, 'high')).toEqual(farClouds(CLOUD_SEEDS.far, 'high'))
    expect(lowClouds(CLOUD_SEEDS.low)).toEqual(lowClouds(CLOUD_SEEDS.low))
  })
})
