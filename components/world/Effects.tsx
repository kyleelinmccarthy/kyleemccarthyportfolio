'use client'

import { useEffect, useMemo } from 'react'
import { useFrame, useStore, useThree } from '@react-three/fiber'
import { HalfFloatType, Vector2, WebGLRenderTarget, type Camera, type Scene, type WebGLRenderer } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

/**
 * The look test's bloom: strength 0.36, radius 0.8, threshold 1.0. Only what is
 * brighter than white glows: the sun, the moon, stars, glints and lit windows.
 *
 * The look test ran three r160, whose bloom pass blended its result weighted by
 * its own alpha, and that alpha was 3 x strength, so the glow it showed was
 * 3 x strength² of the blur. The pass in the three this site uses adds
 * 3 x strength of the blur, unweighted. Passing 0.36² keeps the approved glow;
 * passing 0.36 would make it 2.8 times as bright.
 */
const LOOK_TEST_STRENGTH = 0.36
const BLOOM = { strength: LOOK_TEST_STRENGTH ** 2, radius: 0.8, threshold: 1.0 }

/** What the composer is built for: whether it blooms, and the canvas's size (CSS pixels) and pixel ratio. */
export interface ComposerSpec {
  bloom: boolean
  width: number
  height: number
  dpr: number
}

/**
 * The composer and its passes, the size of the canvas from the moment they are
 * made. `EffectComposer` takes its size from the target it is given, which
 * here starts at 2 x 2, so it is sized before it is returned: a composer that
 * reached the frame loop unsized would draw one frame from a 2 x 2 target
 * stretched over the screen (a flash of flat colour, as when quality drops).
 */
export function buildComposer(gl: WebGLRenderer, scene: Scene, camera: Camera, spec: ComposerSpec) {
  const target = new WebGLRenderTarget(2, 2, { type: HalfFloatType, samples: 4 })
  const composer = new EffectComposer(gl, target)
  const render = new RenderPass(scene, camera)
  const bloom = spec.bloom ? new UnrealBloomPass(new Vector2(2, 2), BLOOM.strength, BLOOM.radius, BLOOM.threshold) : null
  const output = new OutputPass()
  composer.addPass(render)
  if (bloom) composer.addPass(bloom)
  composer.addPass(output)
  composer.setPixelRatio(spec.dpr)
  composer.setSize(spec.width, spec.height)
  return { composer, render, bloom, output }
}

/**
 * The look test's post-processing: the scene into a half-float, 4x multisampled
 * target, a soft bloom over anything brighter than white, then OutputPass for
 * tone mapping and the conversion to sRGB. Taking over the frame at priority 1
 * stops the canvas drawing the scene a second time itself.
 *
 * Without `bloom` the same target and output pass remain and the glow goes. A
 * canvas made for high quality has no multisampling of its own (the browser
 * fixes that when the context is made, and this target is what smooths the
 * edges), so when quality drops to low at runtime this is what keeps them
 * smooth (see `postProcessing`).
 */
export function Effects({ bloom }: { bloom: boolean }) {
  const store = useStore()
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)

  // Built at the canvas's size as it is now (read from the store, not a dependency: a resize is the effect below's job).
  const passes = useMemo(() => {
    const { size: now, viewport } = store.getState()
    return buildComposer(gl, scene, camera, { bloom, width: now.width, height: now.height, dpr: viewport.dpr })
  }, [store, gl, scene, camera, bloom])

  useEffect(() => {
    passes.composer.setPixelRatio(dpr)
    passes.composer.setSize(size.width, size.height)
  }, [passes, dpr, size.width, size.height])

  useEffect(
    () => () => {
      // The composer frees its two render targets; each pass frees its own targets and materials.
      passes.render.dispose()
      passes.bloom?.dispose()
      passes.output.dispose()
      passes.composer.dispose()
    },
    [passes],
  )

  useFrame((_, delta) => passes.composer.render(delta), 1)

  return null
}
