'use client'

import { useEffect, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  IcosahedronGeometry,
  LineBasicMaterial,
  ShaderMaterial,
  Sphere,
  SphereGeometry,
  Vector3,
  type Intersection,
  type Mesh,
  type Raycaster,
} from 'three'
import { terrain } from '@/content/sky'
import type { District } from '@/content/types'
import { D2R } from '@/lib/world/geo'
import { buildLand, indexDirections, shoreValues } from '@/lib/world/landMesh'
import type { Quality } from '@/lib/world/quality'
import { lookUniforms } from './lookUniforms'
import { NOISE_GLSL, celMaterial } from './materials'

/** Icosphere subdivisions for the land and the sea at each quality. */
const DETAIL: Record<Quality, { land: number; sea: number }> = {
  high: { land: 56, sea: 48 },
  low: { land: 40, sea: 32 },
}

/** The User Timing entry the whole terrain build (land and sea) is recorded under, for the performance panel. */
export const TERRAIN_BUILD_MEASURE = 'world:terrain-build'

/** Frees a geometry and a material when the component holding them goes away. */
function useDisposal(geometry: BufferGeometry, material?: { dispose(): void }) {
  useEffect(
    () => () => {
      geometry.dispose()
      material?.dispose()
    },
    [geometry, material],
  )
}

/**
 * A unit icosphere as an indexed geometry: each direction appears once, so the
 * terrain is evaluated once per direction, and it doubles as the normal.
 */
function indexedSphere(detail: number): { geometry: BufferGeometry; directions: Float32Array } {
  const soup = new IcosahedronGeometry(1, detail)
  const { directions, index } = indexDirections(soup.getAttribute('position').array as Float32Array)
  soup.dispose()
  const geometry = new BufferGeometry()
  geometry.setIndex(new BufferAttribute(index, 1))
  geometry.setAttribute('normal', new BufferAttribute(directions, 3))
  return { geometry, directions }
}

/**
 * The ground: an icosphere pushed out to the land's height, with smooth vertex
 * colours (grass, district tint, sand) and sphere normals, so the cel bands
 * follow the globe rather than every bump.
 */
function landGeometry(districts: District[], detail: number): BufferGeometry {
  const { geometry, directions } = indexedSphere(detail)
  const { positions, colors } = buildLand(directions, districts)
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.computeBoundingSphere()
  return geometry
}

/** The sea: a unit sphere whose every vertex carries the land value beneath it. */
function seaGeometry(districts: District[], detail: number): BufferGeometry {
  const { geometry, directions } = indexedSphere(detail)
  geometry.setAttribute('position', new BufferAttribute(directions, 3))
  geometry.setAttribute('aShore', new BufferAttribute(shoreValues(directions, districts), 1))
  geometry.computeBoundingSphere()
  return geometry
}

/** Sea level: no ground lies inside it, so it stands in for the planet when picking. */
const SEA_LEVEL = new Sphere(new Vector3(), 1)

/**
 * Picks the planet as the sphere at sea level instead of its tens of thousands
 * of triangles, which would be tested on every pointer move. Nothing on the far
 * side can be seen past it, which is all picking needs of the planet.
 */
function pickAtSeaLevel(this: Mesh, raycaster: Raycaster, intersects: Intersection[]) {
  const point = raycaster.ray.intersectSphere(SEA_LEVEL, new Vector3())
  if (!point) return
  const distance = raycaster.ray.origin.distanceTo(point)
  if (distance >= raycaster.near && distance <= raycaster.far) intersects.push({ distance, point, object: this })
}

/**
 * The planet takes the pointer itself, so a landmark round the back is never
 * hovered or clicked through it. Clicking the sea or bare land does nothing.
 */
const stopAtPlanet = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation()

/** The land's mesh. Its material is shared through the cache, which frees it with the world. */
function Land({ geometry }: { geometry: BufferGeometry }) {
  useDisposal(geometry)
  return (
    <mesh
      geometry={geometry}
      material={celMaterial({ vertexColors: true }, 'land')}
      dispose={null}
      raycast={pickAtSeaLevel}
      onPointerOver={stopAtPlanet}
      onClick={stopAtPlanet}
    />
  )
}

const seaVertexShader = /* glsl */ `
  attribute float aShore; varying float vShore; varying vec3 vN, vView, vObj;
  void main() { vShore = aShore; vObj = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = -mv.xyz; gl_Position = projectionMatrix * mv; }`

/*
 * Ported from the look test. Depth bands from deep to shallow by the land value
 * under each point, a slow painted swell, rings of surf rolling in to a white
 * line at the shore, two-band cel light, sun glitter and the rim. Every `pow`
 * base is kept above zero and every `smoothstep` runs low edge to high edge:
 * either one undefined gives NaN pixels, which the bloom smears across the
 * screen. The foam colour comes in as a uniform; `colorspace_fragment` converts
 * to sRGB when drawing straight to the screen at low quality.
 */
const seaFragmentShader = /* glsl */ `
  uniform float uTime; uniform vec3 uDeep, uMid, uShallow, uShade, uKey, uRim, uLight, uGlint, uFoam; varying float vShore; varying vec3 vN, vView, vObj;
  ${NOISE_GLSL}
  void main() {
    vec3 n = normalize(vN), view = normalize(vView); float s = vShore;
    vec3 c = mix(uDeep, uMid, smoothstep(-0.5, 0.0, s)); c = mix(c, uShallow, smoothstep(0.02, 0.19, s));
    c += vec3(0.03, 0.05, 0.07) * step(0.3, n3(vObj * 26.0 + vec3(uTime * 0.12, 0.0, uTime * 0.07)));
    float surf = step(0.55, sin(s * 85.0 - uTime * 1.3 + n3(vObj * 40.0) * 2.0)) * smoothstep(0.09, 0.19, s) * 0.55;
    c = mix(c, uFoam, clamp(surf + smoothstep(0.186, 0.196, s), 0.0, 1.0));
    float l = dot(n, uLight); c *= uShade + uKey * (0.6 * smoothstep(0.0, 0.03, l) + 0.4 * smoothstep(0.25, 0.28, l));
    float spec = pow(max(dot(n, normalize(uLight + view)), 0.0001), 26.0); vec3 cell = floor(vObj * 240.0);
    float tw = step(0.9, h3(cell)) * (0.5 + 0.5 * sin(uTime * 3.0 + h3(cell + 7.0) * 60.0));
    c += uGlint * (smoothstep(0.45, 0.75, spec) * 0.22 + tw * smoothstep(0.12, 0.6, spec) * 2.4);
    c += uRim * pow(max(1.0 - clamp(dot(n, view), 0.0, 1.0), 0.0001), 2.6) * 0.5;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`

/**
 * The sea: a plain sphere at sea level that the land rises through. Each
 * vertex carries the land value beneath it (see `seaGeometry`), which sets the depth colour and
 * where the surf breaks. Surf and glitter move with the shared clock, which
 * stands still under reduced motion.
 */
function Sea({ geometry }: { geometry: BufferGeometry }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: lookUniforms.time,
          uDeep: lookUniforms.colors.deep,
          uMid: lookUniforms.colors.sea,
          uShallow: lookUniforms.colors.shallow,
          uShade: lookUniforms.colors.shade,
          uKey: lookUniforms.key,
          uRim: lookUniforms.colors.rim,
          uLight: lookUniforms.lightView,
          uGlint: lookUniforms.colors.glint,
          uFoam: { value: new Color(terrain.foam) },
        },
        vertexShader: seaVertexShader,
        fragmentShader: seaFragmentShader,
      }),
    [],
  )
  useDisposal(geometry, material)

  return (
    <mesh
      geometry={geometry}
      material={material}
      raycast={pickAtSeaLevel}
      onPointerOver={stopAtPlanet}
      onClick={stopAtPlanet}
    />
  )
}

/** How far out the halo reaches, in planet radii. */
const ATMOSPHERE_RADIUS = 1.17

/*
 * The halo: the back faces of a larger sphere, opaque nearest the planet's
 * edge and fading outward. `pow` gets a base above zero, as everywhere.
 */
const atmosphereVertexShader = /* glsl */ `
  varying vec3 vN, vView;
  void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = -mv.xyz; gl_Position = projectionMatrix * mv; }`
const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uCol; varying vec3 vN, vView;
  void main() {
    float k = clamp(-dot(normalize(vN), normalize(vView)) / 0.52, 0.0, 1.0);
    gl_FragColor = vec4(uCol, pow(max(k, 0.0001), 2.4) * 0.9);
    #include <colorspace_fragment>
  }`

/** A soft glowing halo round the planet in the look's atmosphere colour. */
function Atmosphere() {
  const geometry = useMemo(() => new SphereGeometry(ATMOSPHERE_RADIUS, 96, 64), [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uCol: lookUniforms.colors.atmo },
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        side: BackSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )
  useDisposal(geometry, material)

  return <mesh geometry={geometry} material={material} />
}

/** Lines of latitude and longitude every 30°, just above the water and below the land. */
const GRATICULE = { step: 30, maxLat: 60, lift: 1.002, opacity: 0.13, segments: 160 }

/** A faint white map grid over the sea. Every line is the same unit circle, placed and scaled. */
function Graticule() {
  const geometry = useMemo(() => {
    const points: Vector3[] = []
    // A line loop closes itself, so the circle's last point is not repeated.
    for (let i = 0; i < GRATICULE.segments; i++) {
      const a = (i / GRATICULE.segments) * Math.PI * 2
      points.push(new Vector3(Math.cos(a), 0, Math.sin(a)))
    }
    return new BufferGeometry().setFromPoints(points)
  }, [])
  const material = useMemo(
    () => new LineBasicMaterial({ color: terrain.graticule, transparent: true, opacity: GRATICULE.opacity }),
    [],
  )
  useDisposal(geometry, material)

  const parallels: number[] = []
  for (let lat = -GRATICULE.maxLat; lat <= GRATICULE.maxLat; lat += GRATICULE.step) parallels.push(lat)
  const meridians: number[] = []
  for (let lon = 0; lon < 180; lon += GRATICULE.step) meridians.push(lon)

  return (
    <group>
      {parallels.map((lat) => {
        const r = Math.cos(lat * D2R) * GRATICULE.lift
        return (
          <lineLoop
            key={`lat${lat}`}
            geometry={geometry}
            material={material}
            position={[0, Math.sin(lat * D2R) * GRATICULE.lift, 0]}
            scale={[r, 1, r]}
          />
        )
      })}
      {meridians.map((lon) => (
        <lineLoop
          key={`lon${lon}`}
          geometry={geometry}
          material={material}
          rotation={[Math.PI / 2, lon * D2R, 0, 'YXZ']}
          scale={GRATICULE.lift}
        />
      ))}
    </group>
  )
}

/** The tiny planet: land rising out of an animated sea, under a glowing atmosphere and a faint map grid. */
export function Planet({ districts, quality }: { districts: District[]; quality: Quality }) {
  const detail = DETAIL[quality]
  const ground = useMemo(() => {
    const start = performance.now()
    const land = landGeometry(districts, detail.land)
    const sea = seaGeometry(districts, detail.sea)
    performance.measure(TERRAIN_BUILD_MEASURE, {
      start,
      detail: { land: land.getAttribute('position').count, sea: sea.getAttribute('position').count },
    })
    return { land, sea }
  }, [districts, detail])
  return (
    <group>
      <Land geometry={ground.land} />
      <Sea geometry={ground.sea} />
      <Atmosphere />
      <Graticule />
    </group>
  )
}
