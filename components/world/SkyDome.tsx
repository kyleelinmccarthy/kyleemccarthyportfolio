'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, ShaderMaterial, SphereGeometry, Vector2, Vector4 } from 'three'
import { celestial } from '@/content/sky'
import { lookUniforms } from './lookUniforms'

const vertexShader = 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'

/*
 * Ported from the look test as it stands. Its guards matter: `abs()` before
 * `pow()` (a negative base is undefined), `1.0 - smoothstep(a, b, x)` rather
 * than a reversed `smoothstep(b, a, x)` (also undefined), and the tiny offset
 * that keeps `atan(0, 0)` off the sun's centre. Without them one NaN pixel is
 * smeared across the screen by the bloom blur and the sky goes black.
 * The additions are `colorspace_fragment` (a no-op into the bloom pass's
 * linear target, and the sRGB conversion when drawing straight to the screen
 * at low quality) and the disc, halo and streak colours coming in as uniforms
 * from the `celestial` palette rather than written in.
 */
const fragmentShader = /* glsl */ `
  uniform vec2 uRes, uSun; uniform vec3 uTop, uMid, uBot, uSunCol, uSunDisc, uMoonHalo, uMoonDisc, uShootCol; uniform float uTime, uSunK, uMoonK, uShootT, uSunSize; uniform vec4 uShoot;
  void main() {
    vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
    vec3 c = mix(uBot, uMid, smoothstep(0.0, 0.5, uv.y)); c = mix(c, uTop, smoothstep(0.42, 1.0, uv.y));
    vec2 p = (uv - uSun) * vec2(asp, 1.0) / max(uSunSize, 0.05) + vec2(0.00001); float d = length(p), a = atan(p.y, p.x);
    float halo = exp(-d * 4.6) * 0.26 + exp(-d * 14.0) * 0.5;
    float rays = pow(abs(sin(a * 4.0 + uTime * 0.04)), 16.0) * exp(-d * 2.6) * 0.15 + pow(abs(sin(a * 9.0 - uTime * 0.03)), 30.0) * exp(-d * 4.2) * 0.12;
    c += uSunCol * (halo + rays) * uSunK;
    c = mix(c, uSunDisc, (1.0 - smoothstep(0.044, 0.05, d)) * uSunK);
    float moon = (1.0 - smoothstep(0.047, 0.05, d)) * smoothstep(0.04, 0.044, length(p - vec2(0.027, 0.012)));
    c += uMoonHalo * (exp(-d * 8.0) * 0.5 + exp(-d * 28.0) * 0.5) * uMoonK;
    c = mix(c, uMoonDisc, moon * uMoonK);
    vec2 q = (uv - uShoot.xy) * vec2(asp, 1.0), dir = normalize(uShoot.zw);
    float along = dot(q, dir), across = abs(dot(q, vec2(-dir.y, dir.x))), head = uShootT * 0.75;
    float streak = smoothstep(head - 0.24, head, along) * step(along, head) * (1.0 - smoothstep(0.0, 0.003, across)) * sin(3.14159 * clamp(uShootT, 0.0, 1.0));
    c += uShootCol * streak;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`

/** A streak runs for 0.9 s; past 1.2 on its clock it is spent and the next may fire. */
const SHOOT_SECONDS = 0.9
const SHOOT_SPENT = 1.2
/** Shooting stars fire every 2.5 to 7 seconds. */
const SHOOT_GAP = { min: 2.5, spread: 4.5 }

/**
 * The sky behind the planet: a screen-space gradient with the sun or moon in
 * it and, at night, the odd shooting star. It reads the look's colours from
 * the shared uniforms, so it eases with everything else.
 */
export function SkyDome({ night, reducedMotion }: { night: boolean; reducedMotion: boolean }) {
  const uniforms = useMemo(
    () => ({
      uRes: { value: new Vector2(2, 2) },
      uTime: lookUniforms.time,
      uTop: lookUniforms.colors.top,
      uMid: lookUniforms.colors.mid,
      uBot: lookUniforms.colors.bot,
      uSun: lookUniforms.sun,
      uSunSize: lookUniforms.sunSize,
      uSunCol: lookUniforms.colors.sunCol,
      uSunK: lookUniforms.numbers.sunK,
      uMoonK: lookUniforms.numbers.moonK,
      uShoot: { value: new Vector4(0.3, 0.8, 1, -0.4) },
      uShootT: { value: 2 },
      // Linear values as they stand: `fromArray` does no sRGB conversion.
      uSunDisc: { value: new Color().fromArray(celestial.sunDisc) },
      uMoonHalo: { value: new Color().fromArray(celestial.moonHalo) },
      uMoonDisc: { value: new Color().fromArray(celestial.moonDisc) },
      uShootCol: { value: new Color().fromArray(celestial.shootingStar) },
    }),
    [],
  )
  const geometry = useMemo(() => new SphereGeometry(200, 16, 12), [])
  const material = useMemo(
    () =>
      new ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: BackSide, depthWrite: false, depthTest: false }),
    [uniforms],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const shootAt = useRef(3)

  useFrame(({ gl, clock }, delta) => {
    gl.getDrawingBufferSize(uniforms.uRes.value)

    const shootT = uniforms.uShootT
    if (shootT.value < SHOOT_SPENT) {
      shootT.value += Math.min(delta, 0.05) / SHOOT_SECONDS
    } else if (night && !reducedMotion && clock.elapsedTime > shootAt.current) {
      const left = Math.random() > 0.5
      uniforms.uShoot.value.set(0.1 + Math.random() * 0.8, 0.55 + Math.random() * 0.4, left ? -1 : 1, -0.25 - Math.random() * 0.4)
      shootT.value = 0
      shootAt.current = clock.elapsedTime + SHOOT_GAP.min + Math.random() * SHOOT_GAP.spread
    }
  })

  return <mesh geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />
}
