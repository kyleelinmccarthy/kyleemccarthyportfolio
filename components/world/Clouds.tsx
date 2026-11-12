'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Matrix4, ShaderMaterial, SphereGeometry, type BufferGeometry } from 'three'
import type { Quality } from '@/lib/world/quality'
import { CLOUD_SEEDS, FAR_DRIFT, cloudAt, easeShare, farClouds, lowClouds, puffMatrix, type CloudLayout, type PlaceView } from '@/lib/world/starfield'
import { lookUniforms } from './lookUniforms'

/**
 * Every puff is this one sphere. Coarser than the look test's 22 x 16: far
 * puffs are 13 or more units away and low ones tiny, so the facets do not show.
 */
const PUFF_SEGMENTS = { around: 16, down: 12 }
/** How fast a low cloud eases to the size `cloudAt` asks of it, as a share of the way a second. */
const CLOUD_EASE = 4

/*
 * The look test's cloud: two tones from the look (`cloudLit`, `cloudShade`)
 * split softly by the fixed view-space light, a lit cap, and a paler edge
 * where the surface turns away. The normal comes through three's own chunks,
 * which apply the instance's transform and undo its squash. The base of
 * `pow` is held above zero and every `smoothstep` runs low edge to high: either
 * one undefined gives NaN pixels, which the bloom smears across the screen.
 */
const cloudVertexShader = /* glsl */ `
  varying vec3 vN;
  void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <project_vertex>
    vN = normalize(transformedNormal);
  }`
const cloudFragmentShader = /* glsl */ `
  uniform vec3 uLit, uShade, uLight; varying vec3 vN;
  void main() {
    vec3 n = normalize(vN); float l = dot(n, uLight);
    vec3 c = mix(uShade, uLit, smoothstep(-0.2, 0.3, l));
    c = mix(c, uLit * 1.1, smoothstep(0.62, 0.8, l));
    c += uLit * pow(max(1.0 - abs(n.z), 0.0001), 2.5) * 0.2;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`

/** Every puff of every cloud, as one instanced mesh of the one sphere. */
function puffMesh(geometry: BufferGeometry, material: ShaderMaterial, clouds: CloudLayout[]): InstancedMesh {
  const count = clouds.reduce((n, c) => n + c.puffs.length, 0)
  const mesh = new InstancedMesh(geometry, material, count)
  const m = new Matrix4()
  let i = 0
  for (const cloud of clouds) for (const puff of cloud.puffs) mesh.setMatrixAt(i++, puffMatrix(cloud.matrix, puff, m))
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

/**
 * The clouds, from the look test: tall cumulus far behind the planet (13, or
 * 7 at low quality) turning slowly round the sky, and eight small ones low
 * over the planet, each drifting round it on its own axis. Their colours ease
 * with the look, so by night they are dim blue shapes with a paler edge.
 * Both drift on the shared clock, which stands still under reduced motion.
 * At a place (`view`), a low cloud that would come between the camera and the
 * landmark, or crowd the camera, shrinks away until it has drifted past
 * (`cloudAt`), easing as it goes; under reduced motion (`still`) it is gone
 * at once rather than shrinking.
 */
export function Clouds({ quality, still = false, view = null }: { quality: Quality; still?: boolean; view?: PlaceView | null }) {
  const geometry = useMemo(() => new SphereGeometry(1, PUFF_SEGMENTS.around, PUFF_SEGMENTS.down), [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uLit: lookUniforms.colors.cloudLit,
          uShade: lookUniforms.colors.cloudShade,
          uLight: lookUniforms.lightView,
        },
        vertexShader: cloudVertexShader,
        fragmentShader: cloudFragmentShader,
      }),
    [],
  )

  const far = useMemo(() => puffMesh(geometry, material, farClouds(CLOUD_SEEDS.far, quality)), [geometry, material, quality])
  const low = useMemo(() => {
    const clouds = lowClouds(CLOUD_SEEDS.low)
    const mesh = puffMesh(geometry, material, clouds)
    // They move every frame, so the bounds worked out from where they start would not hold.
    mesh.frustumCulled = false
    return { mesh, clouds }
  }, [geometry, material])

  useEffect(() => () => far.dispose(), [far])
  useEffect(
    () => () => {
      low.mesh.dispose()
      geometry.dispose()
      material.dispose()
    },
    [low, geometry, material],
  )

  // The time the low clouds were last laid out at; they are laid out again only when it moves on, or while one is still easing.
  const laidAt = useRef(-1)
  const turn = useMemo(() => ({ cloud: new Matrix4(), puff: new Matrix4(), scale: new Matrix4() }), [])
  // Each low cloud's size now: it eases toward what `cloudAt` asks, so arriving at a place does not snap a cloud away.
  const sizes = useMemo(() => new Float32Array(low.clouds.length).fill(1), [low])

  useFrame((_, delta) => {
    const t = lookUniforms.time.value
    far.rotation.y = t * FAR_DRIFT
    const ease = easeShare(delta, CLOUD_EASE, still)
    let easing = false
    for (const [c, cloud] of low.clouds.entries()) {
      const target = cloudAt(cloud, t, view).scale
      if (Math.abs(target - sizes[c]) > 1e-3) easing = true
      sizes[c] += (target - sizes[c]) * ease
    }
    if (t === laidAt.current && !easing) return
    laidAt.current = t
    let i = 0
    for (const [c, cloud] of low.clouds.entries()) {
      turn.cloud.copy(cloudAt(cloud, t, null).matrix).multiply(turn.scale.makeScale(sizes[c], sizes[c], sizes[c]))
      for (const puff of cloud.puffs) low.mesh.setMatrixAt(i++, puffMatrix(turn.cloud, puff, turn.puff))
    }
    low.mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <primitive object={far} />
      <primitive object={low.mesh} />
    </>
  )
}
