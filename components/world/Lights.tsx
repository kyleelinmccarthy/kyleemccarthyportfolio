'use client'

import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AmbientLight, DirectionalLight } from 'three'
import { lookUniforms } from './lookUniforms'

/** Where the key light sits relative to the camera: above, right and behind it, so the lit side faces the viewer. */
const KEY_FROM_CAMERA = [2.6, 2.8, 2.4] as const

/**
 * The world's light, as the look test has it. The ambient light is the look's
 * shade colour, so every shadow is tinted; the key light, riding with the
 * camera, adds `lit - shade` on top, so the lit side reaches the look's lit
 * colour. Both at intensity π, which makes a colour of 1 mean exactly that.
 */
export function Lights() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const lights = useMemo(() => {
    const ambient = new AmbientLight(0xffffff, Math.PI)
    const key = new DirectionalLight(0xffffff, Math.PI)
    key.position.set(...KEY_FROM_CAMERA)
    return { ambient, key }
  }, [])

  useEffect(() => {
    // The key light aims at its target, which stays at the centre of the world.
    camera.add(lights.key)
    // A light only shines if it is in the scene, so the camera joins it.
    const cameraWasLoose = camera.parent === null
    if (cameraWasLoose) scene.add(camera)
    scene.add(lights.ambient)
    return () => {
      camera.remove(lights.key)
      if (cameraWasLoose) scene.remove(camera)
      scene.remove(lights.ambient)
    }
  }, [camera, scene, lights])

  useEffect(
    () => () => {
      lights.ambient.dispose()
      lights.key.dispose()
    },
    [lights],
  )

  useFrame(() => {
    lights.ambient.color.copy(lookUniforms.colors.shade.value)
    lights.key.color.copy(lookUniforms.key.value)
  })

  return null
}
