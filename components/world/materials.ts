import {
  BackSide,
  Color,
  CustomBlending,
  DataTexture,
  DoubleSide,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  ShaderMaterial,
  SrcColorFactor,
  ZeroFactor,
} from 'three'
import type { Material, Texture, WebGLProgramParametersWithUniforms } from 'three'
import { terrain } from '@/content/sky'
import { BEAM, CLOTH, FLAME, GLASS, PAINT, SHADOW, SIGNAL, WATER, WATER_PERIODS, wrapTime, type ClothWave } from '@/lib/world/kit'
import { lookUniforms } from './lookUniforms'

/**
 * Value noise in GLSL: `h3` hashes a lattice point to [0, 1), `n3` is smooth
 * noise in [-1, 1]. The same functions as `noise3` in lib/world/rng.ts.
 */
export const NOISE_GLSL = /* glsl */ `
float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z) * 2.0 - 1.0; }`

/**
 * Cel shading's light ramp: shadow up to half lit, one narrow half-tone band,
 * then full light. Sampled by the toon material at (n·l + 1) / 2.
 */
const gradient = new DataTexture(new Uint8Array([0, 0, 0, 0, 150, 255, 255, 255]), 8, 1, RedFormat)
gradient.minFilter = NearestFilter
gradient.magFilter = NearestFilter
gradient.needsUpdate = true

/*
 * A soft rim of sky light round every silhouette, in the look's rim colour.
 * The base of `pow` is kept above zero: a zero or negative base is undefined
 * in GLSL, and one NaN pixel is smeared across the screen by the bloom.
 */
const RIM_PARS = 'uniform vec3 uRim; uniform float uRimK;\n#include <common>'
const RIM_FRAGMENT = `float rimF = pow(max(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 0.0001), 2.6);
outgoingLight += uRim * rimF * uRimK;
#include <opaque_fragment>`

/*
 * Painted grass: crisp darker patches and a few sunlit ones over the vertex
 * colours, from noise on the model-space position so they stay put as the
 * planet turns. Both smoothsteps run low edge to high edge; reversed edges are
 * undefined in GLSL.
 */
const GRASS_VERTEX_PARS = 'varying vec3 vObj;\n#include <common>'
const GRASS_VERTEX = '#include <begin_vertex>\nvObj = position;'
const GRASS_FRAGMENT_PARS = `varying vec3 vObj;${NOISE_GLSL}\n`
const GRASS_FRAGMENT = `#include <color_fragment>
float pn = n3(vObj * 13.0) + 0.5 * n3(vObj * 31.0);
diffuseColor.rgb *= mix(vec3(0.83, 0.92, 0.9), vec3(1.0), smoothstep(0.0, 0.035, pn));
diffuseColor.rgb *= mix(vec3(1.0), vec3(1.07, 1.06, 0.94), smoothstep(0.52, 0.56, pn));`

/*
 * The landmark kit's painted edge light. Kit geometry carries a bevel weight
 * per vertex (1 on rounded edges, 0 on flat faces); where a bevel turns toward
 * the key light it is lifted part of the way to the look's lit colour, so
 * edges catch a soft highlight the way they are painted in anime backgrounds.
 * Lifting toward the lit colour, rather than adding to it, never takes a
 * surface past white, so the bloom is left to things that really shine.
 */
const EDGE_LIFT = 0.42
const EDGE_VERTEX_PARS = 'attribute float aBevel;\nattribute float aHeight;\nvarying float vBevel;\nvarying float vHeight;\n#include <common>'
const EDGE_VERTEX = '#include <begin_vertex>\nvBevel = aBevel;\nvHeight = aHeight;'
const EDGE_FRAGMENT_PARS = 'varying float vBevel;\nvarying float vHeight;\nuniform vec3 uEdge;\n'

/** A number as a GLSL float literal. */
const glsl = (n: number) => n.toFixed(4)

/*
 * The kit's painted surfaces: a slight gradient with height in the landmark's
 * own space (`aHeight`, written when a landmark is batched), a little deeper
 * and cooler at the ground and a little lighter toward the top, as
 * `paintColour` in lib/world/kit.ts. It works on the paint before the light, and
 * only ever multiplies down or lifts toward white, so nothing passes white.
 */
const PAINT_FRAGMENT = `#include <color_fragment>
float paintT = clamp(vHeight / ${glsl(PAINT.span)}, 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb * vec3(${PAINT.low.map(glsl).join(', ')}), mix(diffuseColor.rgb, vec3(1.0), ${glsl(PAINT.high)}), paintT);`
const EDGE_FRAGMENT = `#if NUM_DIR_LIGHTS > 0
float edgeFacing = smoothstep(0.05, 0.55, dot(normalize(normal), directionalLights[0].direction));
outgoingLight = mix(outgoingLight, max(outgoingLight, uEdge), clamp(vBevel, 0.0, 1.0) * edgeFacing * ${EDGE_LIFT.toFixed(2)});
#endif
`

/** `land` adds the painted grass; `kit` the painted edge light of the landmark kit's bevelled parts. */
export type CelVariant = 'default' | 'land' | 'kit'

const celCache = new Map<string, MeshToonMaterial>()
const glowCache = new Map<string, MeshBasicMaterial>()
const shellCache = new Map<number, MeshBasicMaterial>()
const glassCache = new Map<string, MeshBasicMaterial>()
const beamCache = new Map<string, MeshBasicMaterial>()
const waterCache = new Map<string, MeshBasicMaterial>()
const clothCache = new Map<string, MeshToonMaterial>()
const clothOutlineCache = new Map<string, MeshBasicMaterial>()
let shadow: MeshBasicMaterial | null = null

/** A new cel material, owned by whoever asked for it. */
function makeCel(opts: { color?: string; vertexColors?: boolean; map?: Texture }, variant: CelVariant): MeshToonMaterial {
  const material = new MeshToonMaterial({ gradientMap: gradient, vertexColors: opts.vertexColors ?? false, map: opts.map ?? null })
  if (opts.color !== undefined) material.color.set(opts.color)
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uRim = lookUniforms.colors.rim
    shader.uniforms.uRimK = lookUniforms.numbers.rimK
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', RIM_PARS)
      .replace('#include <opaque_fragment>', RIM_FRAGMENT)
    if (variant === 'land') {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', GRASS_VERTEX_PARS)
        .replace('#include <begin_vertex>', GRASS_VERTEX)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `${GRASS_FRAGMENT_PARS}#include <common>`)
        .replace('#include <color_fragment>', GRASS_FRAGMENT)
    }
    if (variant === 'kit') {
      shader.uniforms.uEdge = lookUniforms.colors.lit
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', EDGE_VERTEX_PARS)
        .replace('#include <begin_vertex>', EDGE_VERTEX)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `${EDGE_FRAGMENT_PARS}#include <common>`)
        .replace('#include <color_fragment>', PAINT_FRAGMENT)
        .replace('#include <opaque_fragment>', `${EDGE_FRAGMENT}#include <opaque_fragment>`)
    }
  }
  material.customProgramCacheKey = () => `cel-${variant}`
  return material
}

/**
 * The look's cel material: two tones and a half-tone band under the ambient
 * shade and the key light, with a rim of sky light. `land` adds the painted
 * grass; `kit` the edge light on bevels. One material per (colour, vertex
 * colours, variant), shared by everything that asks for it.
 *
 * Shared means no mesh owns it. react-three-fiber disposes of what a mesh holds
 * when the mesh unmounts, so every mesh drawn with this, `outlineMaterial`,
 * `outlineShellMaterial` or `glowMaterial` passes `dispose={null}`; otherwise
 * one landmark leaving would free the material under all the others. The
 * materials are freed together by `disposeMaterials`, when the world goes.
 */
export function celMaterial(opts: { color?: string; vertexColors?: boolean }, variant: CelVariant = 'default'): MeshToonMaterial {
  const key = `${opts.color ?? ''}|${opts.vertexColors ? 'vertex' : ''}|${variant}`
  const cached = celCache.get(key)
  if (cached) return cached

  const material = makeCel(opts, variant)
  celCache.set(key, material)
  return material
}

/**
 * A cel material showing `map`, for a picture on a surface: it takes the
 * light like any painted surface. Not shared: the caller owns it and
 * disposes of it (and of the texture) when done.
 */
export function pictureMaterial(map: Texture): MeshToonMaterial {
  return makeCel({ map }, 'default')
}

/** Thin outlines: drawn on the back faces of a slightly larger copy, in dark indigo. */
export const outlineMaterial = new MeshBasicMaterial({ color: terrain.outline, side: BackSide })

/**
 * Thin outlines that keep one width however long, flat or hollow the part:
 * the part's own geometry drawn again on its back faces, every vertex pushed
 * `thickness` model units out along its normal. Needs a geometry whose normals
 * are continuous (rounded edges); a hard edge would open a crack in the line.
 * The mesh must not be scaled, or the width scales with it. One material per
 * thickness, shared like `celMaterial`.
 */
export function outlineShellMaterial(thickness: number): MeshBasicMaterial {
  const cached = shellCache.get(thickness)
  if (cached) return cached

  const material = new MeshBasicMaterial({ color: terrain.outline, side: BackSide })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uThickness = { value: thickness }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'uniform float uThickness;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uThickness;')
  }
  material.customProgramCacheKey = () => `outline-shell-${thickness}`
  shellCache.set(thickness, material)
  return material
}

/**
 * Unlit colour that brightens with the look's `glow`, so lamps and windows
 * shine harder as the light falls. One material per colour.
 */
export function glowMaterial(color: string): MeshBasicMaterial {
  const cached = glowCache.get(color)
  if (cached) return cached

  const material = new MeshBasicMaterial({ color })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uGlow = lookUniforms.numbers.glow
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', 'uniform float uGlow;\n#include <common>')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= uGlow;')
  }
  material.customProgramCacheKey = () => 'glow'
  glowCache.set(color, material)
  return material
}

const flameCache = new Map<string, MeshBasicMaterial>()

/**
 * The breath every flame shares (`flameBreath`'s glow, a factor near 1). One
 * clock drives every flame, so one uniform: whatever draws a flame sets it
 * each frame from the clock wrapped to the flame's period.
 */
export const flameUniforms = { breath: { value: 1 } }

/**
 * The flame's breath as the shader takes it: `uBreath` clamped to the limits
 * of `flameBreath`'s glow, 1 ± `FLAME.glow`, so no value written to the
 * uniform (a bad clock, a stray write) can push a flame past them. The
 * uniform is only ever set from `flameBreath`, which is finite for any clock
 * (tested), so no NaN reaches the clamp.
 */
export const FLAME_BREATH_GLSL = `clamp(uBreath, ${glsl(1 - FLAME.glow)}, ${glsl(1 + FLAME.glow)})`

/**
 * A flame of `color`: unlit colour that brightens with the look's `glow` as a
 * lamp that is always lit does (`glowMaterial`), times its gentle breath
 * (`flameUniforms.breath`, held in the shader to 1 ± `FLAME.glow`,
 * `FLAME_BREATH_GLSL`). One material per colour.
 *
 * The breath scales the flame's colour by at most 8% either way. At night the
 * flame is already above the bloom's threshold, and the bloom grows with how
 * far past the threshold a pixel is, not with the pixel itself, so the flame's
 * bloom swells and settles by proportionally more than 8% (still slowly, once
 * every three seconds, and never past what its brightest breath allows).
 */
export function flameMaterial(color: string): MeshBasicMaterial {
  const cached = flameCache.get(color)
  if (cached) return cached
  const material = new MeshBasicMaterial({ color })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uGlow = lookUniforms.numbers.glow
    shader.uniforms.uBreath = flameUniforms.breath
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', 'uniform float uGlow, uBreath;\n#include <common>')
      .replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb *= uGlow * ${FLAME_BREATH_GLSL};`)
  }
  material.customProgramCacheKey = () => 'flame'
  flameCache.set(color, material)
  return material
}

/*
 * Window glass. By day a pane is cool glass with the sky in it: the palette's
 * glass colour, darker toward the bottom, one soft highlight band from corner
 * to corner, all tinted by the look's lit colour (so it warms at sunset). As
 * the look's `glow` rises through dusk it turns into the warm lit glow, which
 * at night is brighter than white and blooms. By day nothing passes white.
 * `aPane` is each vertex's place across its pane, -1..1 (`paneCoords`).
 */
const GLASS_VERTEX_PARS = 'attribute vec2 aPane;\nvarying vec2 vPane;\n#include <common>'
const GLASS_VERTEX = '#include <begin_vertex>\nvPane = aPane;'
const GLASS_FRAGMENT_PARS = 'uniform float uGlow;\nuniform vec3 uTint, uDay, uShine, uLit;\nvarying vec2 vPane;\n'
const GLASS_FRAGMENT = `#include <color_fragment>
float night = smoothstep(${glsl(GLASS.dayGlow)}, ${glsl(GLASS.nightGlow)}, uGlow);
vec3 sky = uDay * mix(${glsl(GLASS.bottom)}, 1.0, clamp(vPane.y * 0.5 + 0.5, 0.0, 1.0));
float band = 1.0 - smoothstep(0.0, ${glsl(GLASS.band.width)}, abs(vPane.x + vPane.y * 0.8 - ${glsl(GLASS.band.offset)}));
sky = min(mix(sky, uShine, band * ${glsl(GLASS.band.strength)}) * uTint, vec3(1.0));
diffuseColor.rgb = mix(sky, uLit * uGlow, night);`

/**
 * The material for window glass (see above): `day` is the glass colour by
 * day, `shine` its highlight, `lit` the glow it turns to at night. One per
 * set of colours, shared like `celMaterial`.
 */
export function glassMaterial(day: string, shine: string, lit: string): MeshBasicMaterial {
  const key = `${day}|${shine}|${lit}`
  const cached = glassCache.get(key)
  if (cached) return cached

  const material = new MeshBasicMaterial({ color: '#FFFFFF' })
  const uniforms = { uDay: { value: new Color(day) }, uShine: { value: new Color(shine) }, uLit: { value: new Color(lit) } }
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms, { uGlow: lookUniforms.numbers.glow, uTint: lookUniforms.colors.lit })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', GLASS_VERTEX_PARS)
      .replace('#include <begin_vertex>', GLASS_VERTEX)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `${GLASS_FRAGMENT_PARS}#include <common>`)
      .replace('#include <color_fragment>', GLASS_FRAGMENT)
  }
  material.customProgramCacheKey = () => 'glass'
  glassCache.set(key, material)
  return material
}

/*
 * A lighthouse beam: an open cone, drawn from both sides without writing
 * depth, in its colour. It is most opaque where it is seen face on and fades
 * to nothing where it is seen edge on, so its sides are soft and it all but
 * vanishes when it points at the camera (no flash as it sweeps past); it fades
 * along its length too (`aAlong`). Soft and pale by day, stronger and brighter
 * than white at night, so it blooms then (`beamStrength`). Both vectors are
 * normalised only once their length is known to be above zero.
 */
const BEAM_VERTEX_PARS = 'attribute float aAlong;\nvarying float vAlong;\nvarying vec3 vBeamNormal;\nvarying vec3 vBeamView;\n#include <common>'
const BEAM_VERTEX = '#include <project_vertex>\nvAlong = aAlong;\nvBeamNormal = normalMatrix * normal;\nvBeamView = -mvPosition.xyz;'
const BEAM_FRAGMENT_PARS = 'uniform float uGlow;\nvarying float vAlong;\nvarying vec3 vBeamNormal;\nvarying vec3 vBeamView;\n'
const BEAM_FRAGMENT = `#include <color_fragment>
float beamNight = smoothstep(${glsl(GLASS.dayGlow)}, ${glsl(GLASS.nightGlow)}, uGlow);
vec3 beamN = vBeamNormal / max(length(vBeamNormal), 0.0001);
vec3 beamV = vBeamView / max(length(vBeamView), 0.0001);
float beamFacing = abs(dot(beamN, beamV));
float beamFade = 1.0 - smoothstep(0.0, 1.0, clamp(vAlong, 0.0, 1.0));
diffuseColor.rgb *= mix(${glsl(BEAM.day.gain)}, ${glsl(BEAM.night.gain)}, beamNight);
diffuseColor.a *= beamFacing * beamFacing * beamFade * mix(${glsl(BEAM.day.alpha)}, ${glsl(BEAM.night.alpha)}, beamNight);`

/** The material for a lighthouse beam of `color` (see above). One per colour, shared like `celMaterial`. */
export function beamMaterial(color: string): MeshBasicMaterial {
  const cached = beamCache.get(color)
  if (cached) return cached

  const material = new MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: DoubleSide })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uGlow = lookUniforms.numbers.glow
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', BEAM_VERTEX_PARS)
      .replace('#include <project_vertex>', BEAM_VERTEX)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `${BEAM_FRAGMENT_PARS}#include <common>`)
      .replace('#include <color_fragment>', BEAM_FRAGMENT)
  }
  material.customProgramCacheKey = () => 'beam'
  beamCache.set(color, material)
  return material
}

/*
 * Rings of light going out from a mast (`Signal`), as `signalAge`,
 * `signalFade`, `signalBand` and `signalStrength` in lib/world/kit.ts work
 * them out. Each ring is drawn on its own square, turned in the vertex shader
 * to face the camera round the signal's origin and sized by the model's own
 * scale, so it reads as a ring from every side. Its age runs from the shared
 * clock wrapped to one period (`clock`; so it stands still under reduced
 * motion and stays smooth on a page left open for days): it grows from the
 * mast to its full size, fading in as it leaves and out to nothing before it
 * wraps, a soft line at its front with a fainter glow behind. Pale by day,
 * a little brighter than white at night, so it glows softly in the bloom.
 * Every division is guarded, and the age is clamped.
 */
const SIGNAL_VERTEX = /* glsl */ `
  attribute vec2 aCorner;
  attribute float aRing;
  uniform float uTime, uPeriod;
  varying vec2 vCorner;
  varying float vAge;
  void main() {
    vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float scale = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
    vec3 p = centre.xyz + vec3(aCorner * abs(position.x) * scale, 0.0);
    vCorner = aCorner;
    vAge = fract(uTime / max(uPeriod, 0.0001) + aRing);
    gl_Position = projectionMatrix * vec4(p, 1.0);
  }`
const SIGNAL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor, uNight;
  uniform float uGlow;
  varying vec2 vCorner;
  varying float vAge;
  void main() {
    float d = length(vCorner);
    float age = clamp(vAge, 0.0, 1.0);
    float fade = smoothstep(0.0, ${glsl(SIGNAL.rise)}, age) * (1.0 - smoothstep(${glsl(SIGNAL.fall)}, 1.0, age));
    float ahead = d - age;
    float front = 1.0 - smoothstep(0.0, ${glsl(SIGNAL.width)}, abs(ahead));
    float trail = ahead < 0.0 ? ${glsl(SIGNAL.trailK)} * (1.0 - smoothstep(0.0, ${glsl(SIGNAL.trail)}, -ahead)) : 0.0;
    float night = smoothstep(${glsl(GLASS.dayGlow)}, ${glsl(GLASS.nightGlow)}, uGlow);
    float alpha = max(front, trail) * fade * mix(${glsl(SIGNAL.day.alpha)}, ${glsl(SIGNAL.night.alpha)}, night);
    gl_FragColor = vec4(mix(uColor, uNight, night) * mix(${glsl(SIGNAL.day.gain)}, ${glsl(SIGNAL.night.gain)}, night), clamp(alpha, 0.0, 1.0));
    #include <colorspace_fragment>
  }`

const signalCache = new Map<string, ShaderMaterial>()

/**
 * The material for rings of light of `color` by day, turning to `night` (the
 * same by default) through dusk as window glass does (see above). One per
 * pair of colours, shared like `celMaterial`.
 */
export function signalMaterial(color: string, night: string = color): ShaderMaterial {
  const key = `${color}|${night}`
  const cached = signalCache.get(key)
  if (cached) return cached
  const material = new ShaderMaterial({
    uniforms: {
      // Wrapped to one period, so the rings stay smooth on a page left open for days (`clock`).
      uTime: clock(SIGNAL.period),
      uPeriod: { value: SIGNAL.period },
      uGlow: lookUniforms.numbers.glow,
      uColor: { value: new Color(color) },
      uNight: { value: new Color(night) },
    },
    vertexShader: SIGNAL_VERTEX,
    fragmentShader: SIGNAL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
  signalCache.set(key, material)
  return material
}

/*
 * A flag's cloth, rippled in the vertex shader as `clothOffset` in
 * lib/world/kit.ts: still at the hoist, standing out of its plane more toward
 * the fly end, waves running outward from the shared clock wrapped to one ripple (`clock`; so it holds still
 * under reduced motion). It is lit from its own flat normal, so the cel ramp's
 * hard step never bands across a fold; the folds are painted instead, a soft
 * darkening that follows the ripple's slope (`clothFold`), interpolated
 * smoothly between the cloth's columns. The division is guarded.
 */
const CLOTH_GLSL = `uniform float uTime, uClothAmp, uClothSpeed, uClothWidth;
varying float vClothFold;
float clothK(float x) { return clamp(x / max(uClothWidth, 0.0001), 0.0, 1.0); }
float clothPhase(float k) { return ${glsl(Math.PI * 2 * CLOTH.waves)} * k - uTime * uClothSpeed; }
float clothZ(float x) { float k = clothK(x); return uClothAmp * k * sin(clothPhase(k)); }
float clothFold(float x) {
  float k = clothK(x);
  float ph = clothPhase(k);
  float slope = (sin(ph) + k * ${glsl(Math.PI * 2 * CLOTH.waves)} * cos(ph)) / ${glsl(1 + Math.PI * 2 * CLOTH.waves)};
  return 1.0 - step(0.000001, uClothAmp) * ${glsl(CLOTH.fold * 0.5)} * (slope + 1.0);
}
#include <common>`
const CLOTH_VERTEX = '#include <begin_vertex>\ntransformed.z += clothZ(position.x);\nvClothFold = clothFold(position.x);'
const CLOTH_FRAGMENT_PARS = 'varying float vClothFold;\n'
const CLOTH_FRAGMENT = '#include <color_fragment>\ndiffuseColor.rgb *= clamp(vClothFold, 0.0, 1.0);'

/** How often a cloth's ripple repeats, in seconds: once round at its speed (none for a still flag). */
export const clothPeriod = (wave: ClothWave) => (wave.speed > 0 ? (Math.PI * 2) / wave.speed : 0)

/** The ripple's uniforms for `wave`, shared by a flag's cloth and its outline: its clock wrapped to its period (`clock`). */
function clothUniforms(wave: ClothWave) {
  return { uClothAmp: { value: wave.amplitude }, uClothSpeed: { value: wave.speed }, uClothWidth: { value: wave.width }, uTime: clock(clothPeriod(wave)) }
}

const clocks = new Map<number, { value: number }>()

/**
 * A shader clock for a motion that repeats every `period` seconds: the shared
 * clock wrapped within one period in double precision (`wrapTime`), so a fall
 * or a ripple stays smooth on a page left open for days. One uniform per
 * period, shared by every material with that period; whatever draws with one
 * sets it each frame (`tickClock`).
 */
export function clock(period: number): { value: number } {
  const found = clocks.get(period)
  if (found) return found
  const made = { value: 0 }
  clocks.set(period, made)
  return made
}

/** Brings the clock for `period` to the shared clock's time, wrapped. */
export function tickClock(period: number): void {
  clock(period).value = wrapTime(lookUniforms.time.value, period)
}

const clothKey = (wave: ClothWave) => `${wave.amplitude}|${wave.speed}|${wave.width}`

/**
 * The cel material for a flag's cloth of `color`, rippling as `wave` says
 * (see above). It shades as any cel surface from the cloth's flat normal, with
 * the rim light and the painted folds; it carries no painted edge light, so
 * the cloth reads as one piece of fabric. One per
 * colour and ripple, shared like `celMaterial`.
 */
export function clothMaterial(color: string, wave: ClothWave): MeshToonMaterial {
  const key = `${color}|${clothKey(wave)}`
  const cached = clothCache.get(key)
  if (cached) return cached
  const material = makeCel({ color }, 'default')
  const cel = material.onBeforeCompile
  const uniforms = clothUniforms(wave)
  material.onBeforeCompile = (shader, renderer) => {
    cel(shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader.replace('#include <common>', CLOTH_GLSL).replace('#include <begin_vertex>', CLOTH_VERTEX)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `${CLOTH_FRAGMENT_PARS}#include <common>`)
      .replace('#include <color_fragment>', CLOTH_FRAGMENT)
  }
  material.customProgramCacheKey = () => 'cel-cloth'
  clothCache.set(key, material)
  return material
}

/** A flag's outline: its grown copy drawn on its back faces, rippling with it. One per ripple, shared. */
export function clothOutlineMaterial(wave: ClothWave): MeshBasicMaterial {
  const key = clothKey(wave)
  const cached = clothOutlineCache.get(key)
  if (cached) return cached
  const material = new MeshBasicMaterial({ color: terrain.outline, side: BackSide })
  const uniforms = clothUniforms(wave)
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader.replace('#include <common>', CLOTH_GLSL).replace('#include <begin_vertex>', CLOTH_VERTEX)
  }
  material.customProgramCacheKey = () => 'cloth-outline'
  clothOutlineCache.set(key, material)
  return material
}

/*
 * Still water: the look's own sea colours, so a pond is the sea's blue by
 * day, warmer at sunset and deep at night. Deeper in the middle and turning
 * to the shallows toward the bank (`aEdge`: 0 in the middle, 1 at the bank),
 * with faint rings of light drifting out across it from the shared clock
 * (wrapped to each motion's own period, `WATER_PERIODS`), so they stand still
 * under reduced motion and stay smooth on a page left open for days. A `tint` (a palette colour, lit by
 * the look's light) is mixed in, most in the middle, for water that is not
 * the open sea: a garden pond's green. Unlit, and never past white.
 */
const WATER_VERTEX_PARS = 'attribute float aEdge;\nvarying float vEdge;\nvarying vec2 vWaterP;\n#include <common>'
const WATER_VERTEX = '#include <begin_vertex>\nvEdge = aEdge;\nvWaterP = position.xz;'
// Each motion runs from its own clock, the shared one wrapped to that motion's period (`WATER_PERIODS`, `clock`).
const WATER_FRAGMENT_PARS = 'uniform vec3 uSea, uShallow, uGlint, uTint, uLitColour;\nuniform float uRingTime, uDriftTime, uTintK;\nvarying float vEdge;\nvarying vec2 vWaterP;\n'
const WATER_FRAGMENT = `#include <color_fragment>
float waterE = clamp(vEdge, 0.0, 1.0);
vec3 water = mix(uSea, uShallow, smoothstep(${glsl(WATER.shallows)}, 1.0, waterE));
water = mix(water, uTint * uLitColour, clamp(uTintK, 0.0, 1.0) * (1.0 - 0.2 * waterE));
float waterR = fract(waterE * ${glsl(WATER.rings)} - uRingTime * ${glsl(WATER.speed)});
float waterRing = smoothstep(0.0, 0.06, waterR) * (1.0 - smoothstep(0.06, 0.2, waterR)) * (1.0 - waterE * 0.6);
// Broken into arcs across the surface, so the rings never read as a target.
waterRing *= smoothstep(0.35, 0.85, 0.5 + 0.5 * sin(dot(vWaterP, vec2(${glsl(WATER.breakup)}, ${glsl(WATER.breakup * 0.7)})) + uDriftTime * ${glsl(WATER.drift)}));
diffuseColor.rgb = min(mix(water, uGlint, waterRing * ${glsl(WATER.ripple)}), vec3(1.0));`

/** The material for still water (see above), tinted by `tint` if given. One per tint, shared like `celMaterial`. */
export function waterMaterial(tint?: string): MeshBasicMaterial {
  const key = tint ?? ''
  const cached = waterCache.get(key)
  if (cached) return cached
  const material = new MeshBasicMaterial({ color: '#FFFFFF' })
  const own = { uTint: { value: new Color(tint ?? '#FFFFFF') }, uTintK: { value: tint ? WATER.tint : 0 } }
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, own)
    shader.uniforms.uSea = lookUniforms.colors.sea
    shader.uniforms.uShallow = lookUniforms.colors.shallow
    shader.uniforms.uGlint = lookUniforms.colors.glint
    shader.uniforms.uLitColour = lookUniforms.colors.lit
    shader.uniforms.uRingTime = clock(WATER_PERIODS.rings)
    shader.uniforms.uDriftTime = clock(WATER_PERIODS.drift)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', WATER_VERTEX_PARS)
      .replace('#include <begin_vertex>', WATER_VERTEX)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `${WATER_FRAGMENT_PARS}#include <common>`)
      .replace('#include <color_fragment>', WATER_FRAGMENT)
  }
  material.customProgramCacheKey = () => 'water'
  waterCache.set(key, material)
  return material
}

/*
 * Rain: soft streaks falling through a column, as `rainMesh` in
 * lib/world/kit.ts lays them out. Each streak's four corners sit on its axis;
 * here they are carried down the column from the streak's own moment
 * (`aPhase`) on the shared clock wrapped to one fall (`clock`; so the rain
 * stands still under reduced motion, and stays smooth on a page left open for
 * days), wrapping from the foot back to the top, and spread across, square
 * to the way it falls and to the line of sight, so a streak always faces the
 * camera. It fades in at the top and out at the foot (so the wrap never pops),
 * and is soft across and along, in the look's lit cloud colour, never past
 * white. Every division and normalisation is guarded.
 */
const RAIN_VERTEX = /* glsl */ `
  attribute vec2 aCorner;
  attribute float aPhase;
  uniform float uTime, uSpeed, uTravel, uWidth;
  varying vec2 vCorner;
  varying float vFall;
  void main() {
    float fallen = fract(aPhase + uTime * uSpeed / max(uTravel, 0.0001));
    vec4 centre = modelViewMatrix * vec4(position + vec3(0.0, (0.5 - fallen) * uTravel, 0.0), 1.0);
    vec3 up = (modelViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
    float scale = length(up);
    vec3 upward = up / max(scale, 0.0001);
    vec3 side = cross(upward, centre.xyz);
    float sideLength = length(side);
    side = sideLength > 0.0001 ? side / sideLength : vec3(1.0, 0.0, 0.0);
    vec3 p = centre.xyz + side * aCorner.x * 0.5 * uWidth * scale;
    vCorner = aCorner;
    vFall = fallen;
    gl_Position = projectionMatrix * vec4(p, 1.0);
  }`
const RAIN_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vCorner;
  varying float vFall;
  void main() {
    float across = 1.0 - smoothstep(0.0, 1.0, abs(vCorner.x));
    float along = smoothstep(0.0, 0.3, vCorner.y) * (1.0 - smoothstep(0.7, 1.0, vCorner.y));
    float life = smoothstep(0.0, 0.12, vFall) * (1.0 - smoothstep(0.85, 1.0, vFall));
    gl_FragColor = vec4(min(uColor, vec3(1.0)), clamp(uOpacity * across * along * life, 0.0, 1.0));
    #include <colorspace_fragment>
  }`

const rainCache = new Map<string, ShaderMaterial>()

/** How often a streak's fall repeats, in seconds: its travel at its speed (none for rain that does not fall). */
export const rainPeriod = (travel: number, speed: number) => (travel > 0 && speed > 0 ? travel / speed : 0)

/** How solid a streak of rain is at its middle. */
const RAIN_OPACITY = 0.5

/**
 * The material for rain (see above): streaks `width` across travelling
 * `travel` down their column at `speed` model units a second. One per set of
 * numbers, shared like `celMaterial`.
 */
export function rainMaterial(travel: number, width: number, speed: number): ShaderMaterial {
  const [t, w, s] = [travel, width, speed].map((n) => (Number.isFinite(n) ? Math.max(0, n) : 0))
  const key = `${t}|${w}|${s}`
  const cached = rainCache.get(key)
  if (cached) return cached
  const material = new ShaderMaterial({
    uniforms: {
      // Wrapped to one fall, so the rain stays smooth on a page left open for days (`clock`).
      uTime: clock(rainPeriod(t, s)),
      uColor: lookUniforms.colors.cloudLit,
      uSpeed: { value: s },
      uTravel: { value: t },
      uWidth: { value: w },
      uOpacity: { value: RAIN_OPACITY },
    },
    vertexShader: RAIN_VERTEX,
    fragmentShader: RAIN_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
  rainCache.set(key, material)
  return material
}

/*
 * A rain cloud: the sky's own cloud painting (two tones from the look's cloud
 * colours, split softly by the view-space light, a lit cap and a paler edge
 * where the surface turns away), greyed toward `tint`, so it is the same kind
 * of cloud as those drifting over the planet, heavier. Never past white; the
 * pow base is held above zero and the normal's length is guarded.
 */
const STORM_VERTEX = /* glsl */ `
  varying vec3 vN;
  void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <project_vertex>
    vN = transformedNormal;
  }`
const STORM_FRAGMENT = /* glsl */ `
  uniform vec3 uLit, uShade, uLight, uTint;
  varying vec3 vN;
  void main() {
    vec3 n = vN / max(length(vN), 0.0001);
    float l = dot(n, uLight);
    vec3 c = mix(uShade, uLit, smoothstep(-0.2, 0.3, l));
    c = mix(c, uLit * 1.05, smoothstep(0.62, 0.8, l));
    c += uLit * pow(max(1.0 - abs(n.z), 0.0001), 2.5) * 0.15;
    c *= mix(vec3(1.0), uTint, 0.75);
    gl_FragColor = vec4(min(c, vec3(1.0)), 1.0);
    #include <colorspace_fragment>
  }`

const stormCache = new Map<string, ShaderMaterial>()

/** The material for a rain cloud greyed toward `tint` (a palette colour). One per tint, shared like `celMaterial`. */
export function stormCloudMaterial(tint: string): ShaderMaterial {
  const cached = stormCache.get(tint)
  if (cached) return cached
  const material = new ShaderMaterial({
    uniforms: {
      uLit: lookUniforms.colors.cloudLit,
      uShade: lookUniforms.colors.cloudShade,
      uLight: lookUniforms.lightView,
      uTint: { value: new Color(tint) },
    },
    vertexShader: STORM_VERTEX,
    fragmentShader: STORM_FRAGMENT,
  })
  stormCache.set(tint, material)
  return material
}

/*
 * The contact shadow under a landmark: it multiplies the ground by a tint
 * that takes it from lit to shaded (the look's `shade` over its `lit`, so blue
 * by day and violet at sunset), most in the middle and fading to nothing at the
 * edge (`shadowFalloff`), and only faintly at night (`shadowStrength`). It can
 * only darken, so it never feeds the bloom. The division is guarded so a black
 * channel can never make it Inf or NaN.
 */
const SHADOW_VERTEX_PARS = 'varying vec2 vShadowUv;\n#include <common>'
const SHADOW_VERTEX = '#include <begin_vertex>\nvShadowUv = uv;'
const SHADOW_FRAGMENT_PARS = 'uniform vec3 uShade, uLitColour;\nuniform float uSunK;\nvarying vec2 vShadowUv;\n'
const SHADOW_FRAGMENT = `#include <color_fragment>
float shadowR = length(vShadowUv * 2.0 - 1.0);
float shadowA = 1.0 - smoothstep(${glsl(SHADOW.inner)}, 1.0, shadowR);
float shadowK = mix(${glsl(SHADOW.night)}, ${glsl(SHADOW.day)}, clamp(uSunK, 0.0, 1.0));
vec3 shadowTint = clamp(uShade / max(uLitColour, vec3(0.001)), 0.0, 1.0);
diffuseColor = vec4(mix(vec3(1.0), shadowTint, shadowA * shadowK), 1.0);`

/**
 * The one contact-shadow material: drawn after the opaque world, multiplied
 * onto what is beneath it, never writing depth, pulled a little toward the
 * camera so it never fights the ground. Shared like `celMaterial`.
 */
export function contactShadowMaterial(): MeshBasicMaterial {
  if (shadow) return shadow
  const material = new MeshBasicMaterial({
    color: '#FFFFFF',
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: ZeroFactor,
    blendDst: SrcColorFactor,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uShade = lookUniforms.colors.shade
    shader.uniforms.uLitColour = lookUniforms.colors.lit
    shader.uniforms.uSunK = lookUniforms.numbers.sunK
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', SHADOW_VERTEX_PARS)
      .replace('#include <begin_vertex>', SHADOW_VERTEX)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `${SHADOW_FRAGMENT_PARS}#include <common>`)
      .replace('#include <color_fragment>', SHADOW_FRAGMENT)
  }
  material.customProgramCacheKey = () => 'contact-shadow'
  shadow = material
  return material
}

/**
 * Frees every shared material's GPU resources and empties the caches. For when
 * the world goes away; materials still held elsewhere would simply be
 * uploaded again on their next use.
 */
export function disposeMaterials(): void {
  const all: Material[] = [
    ...celCache.values(),
    ...glowCache.values(),
    ...flameCache.values(),
    ...shellCache.values(),
    ...glassCache.values(),
    ...beamCache.values(),
    ...signalCache.values(),
    ...waterCache.values(),
    ...clothCache.values(),
    ...clothOutlineCache.values(),
    ...rainCache.values(),
    ...stormCache.values(),
    outlineMaterial,
  ]
  if (shadow) all.push(shadow)
  for (const material of all) material.dispose()
  celCache.clear()
  glowCache.clear()
  flameCache.clear()
  shellCache.clear()
  glassCache.clear()
  beamCache.clear()
  signalCache.clear()
  waterCache.clear()
  clothCache.clear()
  clothOutlineCache.clear()
  rainCache.clear()
  stormCache.clear()
  clocks.clear()
  shadow = null
  gradient.dispose()
}
