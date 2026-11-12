'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  LineBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  type Group,
} from 'three'
import { constellations, night, type LinearRgb } from '@/content/sky'
import { dirOf } from '@/lib/world/geo'
import type { Quality } from '@/lib/world/quality'
import { WORLD_SEED, mulberry32 } from '@/lib/world/rng'
import { SKY_RADIUS, buildStarField, constellationPoints, starCounts } from '@/lib/world/starfield'
import { lookUniforms } from './lookUniforms'

/** Below this night amount the sky has no stars to draw, so none of it is drawn. */
const DARK_ENOUGH = 0.001
/** The constellation lines at full night: a little fainter than the stars at their corners. */
const LINE_OPACITY = 0.6
/** The bright stars: at a constellation's corners, and the comet's head. Sizes in pixels at a pixel ratio of 1. */
const FIGURE_STAR_SIZE = 7.5
const COMET_HEAD_SIZE = 11
/** The comet's head, its two tails (length, width, turn off the long tail's line) and how it lies across the sky. */
const COMET = {
  at: { lat: -2, lon: -160 },
  tilt: -2.6,
  tails: [
    { length: 6.5, width: 1.5, turn: 0, color: night.cometTail },
    { length: 4.4, width: 0.8, turn: -0.16, color: night.cometTailShort },
  ],
} as const

/*
 * The look test's stars: round soft points that swell and shrink a little on
 * the shared clock (which stands still under reduced motion), added onto the
 * sky. `uK` is the look's night amount; nothing in here is undefined at any
 * value of it, so at 0 every star adds exactly nothing.
 */
const starVertexShader = /* glsl */ `
  attribute vec3 aCol; attribute float aSize, aPhase; uniform float uTime, uPR; varying vec3 vCol;
  void main() { vCol = aCol; gl_PointSize = aSize * uPR * (0.72 + 0.28 * sin(uTime * 1.6 + aPhase)); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const starFragmentShader = /* glsl */ `
  uniform float uK; varying vec3 vCol;
  void main() {
    float a = 1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(vCol * 1.7 * a * uK, 1.0);
    #include <colorspace_fragment>
  }`

/*
 * A comet tail: a ribbon brightest at its head (u = 1), narrowing towards it,
 * whitening into the head. `t` is held off zero before `pow` (a zero base
 * with some exponents is undefined, and one NaN pixel is smeared across the
 * screen by the bloom); the width divisor never falls below 0.1.
 */
const tailVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const tailFragmentShader = /* glsl */ `
  uniform vec3 uCol, uCore; uniform float uK; varying vec2 vUv;
  void main() {
    float t = clamp(vUv.x, 0.0001, 1.0), w = abs(vUv.y - 0.5) * 2.0;
    float a = pow(t, 2.4) * (1.0 - smoothstep(0.0, 1.0, w / mix(1.0, 0.1, t)));
    gl_FragColor = vec4(mix(uCol, uCore, pow(t, 6.0)) * a * 1.5 * uK, 1.0);
    #include <colorspace_fragment>
  }`

/** The seeded bright stars' twinkle phases: a stream apart from the star field's. */
const FIGURE_SEED = WORLD_SEED + 7

/**
 * Every star in one buffer: the bright ones first (each constellation's
 * corners, then the comet's head), then the star field, whose dust comes
 * last so that low quality can leave it off by drawing fewer points.
 */
function starGeometry(quality: Quality): BufferGeometry {
  const field = buildStarField(WORLD_SEED, quality)
  const rand = mulberry32(FIGURE_SEED)
  const bright: Array<{ at: number[]; size: number; color: LinearRgb }> = [
    ...constellations.flatMap((c) =>
      constellationPoints(c, SKY_RADIUS).map((p) => ({ at: p.toArray(), size: FIGURE_STAR_SIZE, color: night.figureStar })),
    ),
    { at: dirOf(COMET.at).multiplyScalar(SKY_RADIUS).toArray(), size: COMET_HEAD_SIZE, color: night.cometHead },
  ]
  const n = bright.length + field.sizes.length
  const positions = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const sizes = new Float32Array(n)
  const phases = new Float32Array(n)
  bright.forEach((star, i) => {
    positions.set(star.at, i * 3)
    colors.set(star.color, i * 3)
    sizes[i] = star.size
    phases[i] = rand() * Math.PI * 2
  })
  positions.set(field.positions, bright.length * 3)
  colors.set(field.colors, bright.length * 3)
  sizes.set(field.sizes, bright.length)
  phases.set(field.phases, bright.length)

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aCol', new BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
  if (quality === 'low') geometry.setDrawRange(0, n - starCounts('low').dust)
  return geometry
}

/** Every constellation's lines as one set of segments. */
function lineGeometry(): BufferGeometry {
  const ends = constellations.flatMap((c) => {
    const points = constellationPoints(c, SKY_RADIUS)
    return c.lines.flatMap(([a, b]) => [points[a], points[b]])
  })
  return new BufferGeometry().setFromPoints(ends)
}

/** Where the comet hangs: at its head on the sky sphere, its face to the centre, laid across the sky at its tilt. */
function cometPlacement(): { position: [number, number, number]; quaternion: Quaternion } {
  const o = new Object3D()
  o.position.copy(dirOf(COMET.at).multiplyScalar(SKY_RADIUS))
  o.lookAt(0, 0, 0)
  o.rotateZ(COMET.tilt)
  return { position: o.position.toArray(), quaternion: o.quaternion }
}

/**
 * The night sky, from the look test: a twinkling star field with the Milky
 * Way's band and the dust behind it, four named constellations, and a comet
 * with a long blue tail and a short pink one. All of it brightens with the
 * look's night amount, so it fades in and out with the theme, and none of it
 * is drawn by day. It sits on a sphere far beyond the planet and the clouds,
 * so they hide it where they stand in front. The names are HTML labels (see
 * `Labels`). Low quality draws half the stars and no dust.
 */
export function NightSky({ quality }: { quality: Quality }) {
  const group = useRef<Group>(null)
  const uniforms = useMemo(
    () => ({ uTime: lookUniforms.time, uK: lookUniforms.numbers.star, uPR: { value: 1 } }),
    [],
  )

  const stars = useMemo(() => starGeometry(quality), [quality])
  const lines = useMemo(lineGeometry, [])
  const tail = useMemo(() => new PlaneGeometry(1, 1).translate(-0.5, 0, 0), [])
  const comet = useMemo(cometPlacement, [])

  const materials = useMemo(
    () => ({
      stars: new ShaderMaterial({
        uniforms,
        vertexShader: starVertexShader,
        fragmentShader: starFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      lines: new LineBasicMaterial({ color: night.constellationLine, transparent: true, opacity: 0, depthWrite: false }),
      tails: COMET.tails.map(
        (t) =>
          new ShaderMaterial({
            uniforms: {
              uK: lookUniforms.numbers.star,
              uCol: { value: new Color(t.color) },
              uCore: { value: new Color().fromArray(night.cometCore) },
            },
            vertexShader: tailVertexShader,
            fragmentShader: tailFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            side: DoubleSide,
          }),
      ),
    }),
    [uniforms],
  )

  useEffect(() => () => stars.dispose(), [stars])
  useEffect(
    () => () => {
      lines.dispose()
      tail.dispose()
      materials.stars.dispose()
      materials.lines.dispose()
      for (const m of materials.tails) m.dispose()
    },
    [lines, tail, materials],
  )

  useFrame(({ gl }) => {
    const k = lookUniforms.numbers.star.value
    if (group.current) group.current.visible = k > DARK_ENOUGH
    materials.lines.opacity = k * LINE_OPACITY
    uniforms.uPR.value = gl.getPixelRatio()
  })

  return (
    <group ref={group}>
      <points geometry={stars} material={materials.stars} frustumCulled={false} />
      <lineSegments geometry={lines} material={materials.lines} />
      <group position={comet.position} quaternion={comet.quaternion}>
        {COMET.tails.map((t, i) => (
          <mesh key={i} geometry={tail} material={materials.tails[i]} scale={[t.length, t.width, 1]} rotation-z={t.turn} />
        ))}
      </group>
    </group>
  )
}

