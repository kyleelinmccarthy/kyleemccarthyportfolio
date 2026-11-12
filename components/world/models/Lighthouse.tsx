'use client'

import { landmark } from '@/content/sky'
import {
  Beam,
  Blob,
  Block,
  Door,
  Extruded,
  Lit,
  Peak,
  Ring,
  Roof,
  Spin,
  Tube,
  Turned,
  Window,
  blend,
  heightWithin,
  peakTop,
  stackUp,
  turnedTop,
  type Point2,
  type Vec3,
} from './kit'
import type { ModelProps } from './registry'

/** The stone platform the tower stands on, and the shaft's taper (its height is what the stack leaves). */
const PLATFORM = { radius: 0.4, height: 0.08 }
const SHAFT = { bottom: 0.24, top: 0.165, plinth: 0.07 }
/** The coral bands, as shares of the way up the shaft. */
const BANDS: Array<[number, number]> = [
  [0.2, 0.38],
  [0.58, 0.76],
]
const GALLERY = { corbel: 0.09, deck: 0.04, radius: 0.31, rail: 0.28, railHeight: 0.11, posts: 12 }
/** The lamp room: an iron base, open glazing between mullions round the lens, a cornice. */
const LANTERN = { base: 0.06, corner: 0.15, glazing: 0.2, cornice: 0.03 }
/** The lens at the lamp room's heart: eight lit facets round the lamp, between brass caps. */
const LENS = { radius: 0.07, height: 0.13, facets: 8 }
const DOME: Point2[] = [[0, 0], [LANTERN.corner + 0.01, 0], [LANTERN.corner, 0.035], [0.12, 0.1], [0.06, 0.145], [0, 0.165]]
const FINIAL = { ball: 0.035, spike: 0.14, spikeRadius: 0.012 }
/**
 * The beam: twice the tower's lamp-room reach, fading to nothing at its end.
 * It is light, so it is held to no footprint (R37); its length is its own.
 */
const BEAM = { length: 2.4, near: 0.06, far: 0.42, speed: 0.32 }
const COTTAGE = { x: -0.64, z: 0.14, width: 0.48, depth: 0.36, plinth: 0.04, wall: 0.42, rise: 0.22 }
/** Window and door frames on the cottage: slimmer than the kit's, as a small cottage's are. */
const COTTAGE_FRAME = 0.02

/** The radius of the shaft `y` up from the ground, between `from` and `to`. */
function shaftRadius(y: number, from: number, to: number): number {
  const k = Math.min(1, Math.max(0, (y - from) / (to - from)))
  return SHAFT.bottom + (SHAFT.top - SHAFT.bottom) * k
}

/** Where a point on the shaft's face is, `angle` round from the front, `y` up, `inset` in from its surface. */
function onShaft(angle: number, y: number, from: number, to: number, inset = 0): Vec3 {
  const r = shaftRadius(y, from, to) - inset
  return [r * Math.sin(angle), y, r * Math.cos(angle)]
}

/** A barrel: a turned stave body with two hoops. */
function Barrel({ at, color, hoop }: { at: Vec3; color: string; hoop: string }) {
  return (
    <group position={at}>
      <Turned profile={[[0, 0], [0.05, 0], [0.06, 0.06], [0.05, 0.12], [0, 0.12]]} color={color} />
      <Ring radius={0.056} thickness={0.01} sides={6} around={16} at={[0, 0.03, 0]} color={hoop} outline={false} />
      <Ring radius={0.056} thickness={0.01} sides={6} around={16} at={[0, 0.09, 0]} color={hoop} outline={false} />
    </group>
  )
}

/**
 * Beacon's lighthouse. Beacon's own home screen is called the Lighthouse, so
 * its landmark is one: a tall tapering tower in white and coral bands, a
 * gallery with a rail, a lamp room with a lit lens inside its mullions under a
 * dome, and two soft beams that sweep slowly round, reaching far past the
 * tower and fading to nothing (a pale shaft by day, blooming at night; still
 * under reduced motion). The keeper's cottage stands beside it.
 *
 * Three levels of detail. The main mass: the stone platform, the tower, the
 * lamp room and the cottage. The secondary forms: the bands, the corbelled
 * gallery and its rail, the lamp room's mullions, cornice and dome, the
 * stair windows up the tower, doors, the cottage's roof and chimney. The
 * props: a weathervane, a lifebuoy by the door, a lamp, a barrel and a crate,
 * a bench, stepping stones and the rocks the tower stands on.
 *
 * Built from the ground up as one stack (`stackUp`): the shaft takes whatever
 * height the place leaves after the fixed parts above it, so the weathervane's
 * spike tops out at the place's height, from 1.8 to 2.6 (`Lighthouse.heights`).
 */
export function Lighthouse({ place, district }: ModelProps) {
  const colour = {
    white: landmark.offWhite,
    // The cottage is limewashed a warmer white than the tower, so the two read apart.
    walls: landmark.cream,
    band: landmark.coral,
    // Painted iron: the district's blue greyed toward slate and deepened toward indigo.
    iron: blend(blend(district.color, landmark.slate, 0.4), landmark.indigo, 0.4),
    brass: blend(landmark.gold, landmark.wood, 0.35),
    dome: blend(landmark.coral, landmark.indigo, 0.12),
    stone: blend(landmark.stone, landmark.slate, 0.3),
    rock: blend(landmark.slate, landmark.indigo, 0.12),
    wood: landmark.wood,
    darkWood: blend(landmark.wood, landmark.indigo, 0.35),
    beam: blend(landmark.lit, landmark.offWhite, 0.55),
    // Slate, only a hint of the district's blue in it.
    roof: blend(blend(landmark.slate, district.color, 0.25), landmark.indigo, 0.3),
  }

  const height = heightWithin(place.height, Lighthouse.heights)
  // The fixed parts above the shaft, bottom to top, each on the true top of the one below.
  const domeTop = turnedTop(DOME)
  const spikeTop = peakTop(FINIAL.spikeRadius, FINIAL.spike, 0.005)
  const above = [GALLERY.corbel - 0.01, GALLERY.deck, LANTERN.base, LANTERN.glazing, LANTERN.cornice, domeTop, FINIAL.ball * 1.6, spikeTop]
  const fixed = above.reduce((sum, h) => sum + h, 0)
  const base = PLATFORM.height
  const shaft = height - base - fixed
  const [, shaftTop, deckY, lanternY, glazingY, corniceY, domeY, ballFoot, spikeFoot] = stackUp(base, [shaft, ...above])
  const corbelY = shaftTop - 0.01
  const ballY = ballFoot + FINIAL.ball * 0.8
  const lampY = glazingY + LANTERN.glazing / 2

  const from = base
  const to = shaftTop
  const span = to - from
  const apothem = LANTERN.corner * Math.cos(Math.PI / 8)

  return (
    <group>
      {/* The stone platform and the rocks it stands on. */}
      <Tube top={PLATFORM.radius - 0.04} bottom={PLATFORM.radius} height={base} sides={8} bevel={0.02} color={colour.stone} />
      {/* Faceted boulders the platform is built on, bedded a hair into the ground. */}
      {[
        [-0.4, -0.3, 0.14, 0.12],
        [-0.22, -0.44, 0.1, 0.08],
        [0.33, -0.33, 0.15, 0.13],
        [0.46, -0.08, 0.1, 0.08],
        [0.06, -0.47, 0.13, 0.09],
      ].map(([x, z, r, h], i) => (
        <Tube key={i} bottom={r} top={r * 0.6} height={h} sides={5} bevel={0.022} at={[x, -0.006, z]} rot={[0, i * 1.3, 0]} color={colour.rock} />
      ))}

      {/* The shaft: white, on a stone plinth course, with two coral bands standing a hair proud of it. */}
      <Tube top={shaftRadius(from + SHAFT.plinth, from, to) + 0.02} bottom={SHAFT.bottom + 0.025} height={SHAFT.plinth} at={[0, from, 0]} bevel={0.02} color={colour.stone} />
      <Tube top={SHAFT.top} bottom={SHAFT.bottom} height={span} at={[0, from, 0]} bevel={0.02} color={colour.white} />
      {BANDS.map(([a, b]) => {
        const y0 = from + span * a
        const y1 = from + span * b
        // No line of their own: the shaft's line already runs round them, and the colour change is the edge.
        return (
          <Tube
            key={a}
            top={shaftRadius(y1, from, to) + 0.005}
            bottom={shaftRadius(y0, from, to) + 0.005}
            height={y1 - y0}
            at={[0, y0, 0]}
            bevel={0.008}
            color={colour.band}
            outline={false}
          />
        )
      })}

      {/* The door, and the stair windows climbing round the tower. */}
      <Door size={[0.13, 0.25]} at={onShaft(0, from + 0.02, from, to, 0.02)} color={colour.iron} frame={colour.white} />
      <Lit size={[0.04, 0.06, 0.04]} at={onShaft(-0.42, from + 0.3, from, to, -0.03)} rot={[0, -0.42, 0]} color={landmark.lit} />
      <Block size={[0.03, 0.03, 0.05]} at={onShaft(-0.42, from + 0.26, from, to, -0.012)} rot={[0, -0.42, 0]} color={colour.iron} bevel={0.008} />
      {/* In the white between the bands, staggered as a stair climbs. */}
      {[
        [0.26, 0.48],
        [-0.2, 0.87],
        [Math.PI, 0.48],
        [Math.PI / 2, 0.87],
      ].map(([angle, k]) => (
        // Set deep into the wall in iron frames, as a tower's small windows are, rather than stuck on its face.
        <Window
          key={`${angle}${k}`}
          size={[0.045, 0.08]}
          at={onShaft(angle, from + span * k, from, to, 0.028)}
          rot={[0, angle, 0]}
          frame={colour.iron}
          bars={false}
          sill={false}
        />
      ))}
      {/* A lifebuoy hung by the door. */}
      <group rotation={[0, 0.62, 0]}>
        <Ring radius={0.05} thickness={0.022} sides={6} around={16} at={onShaft(0, from + 0.2, from, to, -0.014)} rot={[Math.PI / 2, 0, 0]} color={colour.band} />
      </group>

      {/* The gallery: a corbelled cornice, a deck and a rail of posts with a top rail. */}
      <Turned
        profile={[[0, 0], [SHAFT.top + 0.01, 0], [SHAFT.top + 0.03, 0.03], [GALLERY.radius - 0.05, 0.065], [GALLERY.radius - 0.02, GALLERY.corbel], [0, GALLERY.corbel]]}
        at={[0, corbelY, 0]}
        sides={18}
        color={colour.white}
      />
      <Tube top={GALLERY.radius} bottom={GALLERY.radius} height={GALLERY.deck} at={[0, deckY, 0]} sides={20} bevel={0.012} color={colour.iron} />
      {Array.from({ length: GALLERY.posts }, (_, k) => {
        const a = (k / GALLERY.posts) * Math.PI * 2
        return (
          <Block
            key={k}
            size={[0.016, GALLERY.railHeight, 0.016]}
            at={[GALLERY.rail * Math.sin(a), lanternY + GALLERY.railHeight / 2, GALLERY.rail * Math.cos(a)]}
            rot={[0, a, 0]}
            color={colour.iron}
            bevel={0.005}
          />
        )
      })}
      <Ring radius={GALLERY.rail} thickness={0.02} sides={6} around={24} at={[0, lanternY + GALLERY.railHeight, 0]} color={colour.iron} />

      {/* The lamp room: an iron base, mullions round the lens with a glazing bar, a cornice and a dome. */}
      <Tube top={LANTERN.corner + 0.015} bottom={LANTERN.corner + 0.02} height={LANTERN.base} at={[0, lanternY, 0]} sides={8} bevel={0.01} color={colour.iron} />
      {Array.from({ length: 8 }, (_, k) => {
        const c = ((k + 0.5) / 8) * Math.PI * 2
        return (
          <Block
            key={k}
            size={[0.018, LANTERN.glazing, 0.018]}
            at={[LANTERN.corner * Math.sin(c), lampY, LANTERN.corner * Math.cos(c)]}
            rot={[0, c, 0]}
            color={colour.iron}
            bevel={0.006}
          />
        )
      })}
      <Ring radius={apothem + 0.004} thickness={0.01} sides={6} around={24} at={[0, glazingY + LANTERN.glazing * 0.55, 0]} color={colour.iron} outline={false} />
      {/* The lens: lit facets round the lamp (glowing a little by day, as the beam does, and into the bloom at night), brass caps above and below. */}
      {Array.from({ length: LENS.facets }, (_, k) => {
        const a = (k / LENS.facets) * Math.PI * 2
        const side = 2 * LENS.radius * Math.tan(Math.PI / LENS.facets)
        return (
          <Lit
            key={k}
            size={[side, LENS.height, 0.012]}
            at={[LENS.radius * Math.sin(a), lampY, LENS.radius * Math.cos(a)]}
            rot={[0, a, 0]}
            color={landmark.lit}
            always
            outline={false}
          />
        )
      })}
      {[-1, 1].map((s) => (
        <Tube key={s} top={LENS.radius + 0.01} bottom={LENS.radius + 0.01} height={0.025} at={[0, lampY + s * (LENS.height / 2 + 0.0125) - 0.0125, 0]} bevel={0.008} color={colour.brass} />
      ))}
      <Tube top={LANTERN.corner + 0.025} bottom={LANTERN.corner + 0.025} height={LANTERN.cornice} at={[0, corniceY, 0]} sides={8} bevel={0.01} color={colour.iron} />
      <Turned profile={DOME} at={[0, domeY, 0]} sides={16} color={colour.dome} />
      <Blob radius={FINIAL.ball} at={[0, ballY, 0]} color={colour.iron} />
      <Peak radius={FINIAL.spikeRadius} height={FINIAL.spike} at={[0, spikeFoot, 0]} color={colour.iron} bevel={0.005} />
      {/* The weathervane turns slowly on the spike. */}
      <Spin at={[0, spikeFoot + spikeTop * 0.4, 0]} speed={0.18}>
        <Block size={[0.13, 0.008, 0.008]} at={[0.01, 0, 0]} color={colour.iron} bevel={0.003} outline={false} />
        <Extruded shape={[[0.03, 0], [0, 0.02], [0, -0.02]]} depth={0.008} at={[0.075, 0, 0]} color={colour.iron} bevel={0.002} />
        <Extruded shape={[[0, 0.022], [-0.04, 0.022], [-0.05, 0], [-0.04, -0.022], [0, -0.022]]} depth={0.008} at={[-0.04, 0, 0]} color={colour.dome} bevel={0.002} />
      </Spin>

      {/* The beam: two shafts from the lens, opposite each other, turning slowly round. */}
      <Spin at={[0, lampY, 0]} speed={BEAM.speed}>
        <Beam length={BEAM.length} near={BEAM.near} far={BEAM.far} rot={[0, Math.PI / 2, 0]} color={colour.beam} />
        <Beam length={BEAM.length} near={BEAM.near} far={BEAM.far} rot={[0, -Math.PI / 2, 0]} color={colour.beam} />
      </Spin>

      <Cottage colour={colour} />

      {/* Props: stepping stones from the cottage to the tower, a barrel and a crate, a bench. */}
      {[
        [-0.28, 0.42, 0.3],
        [-0.38, 0.4, -0.2],
        [-0.48, 0.38, 0.4],
      ].map(([x, z, r], i) => (
        <Block key={i} size={[0.1, 0.03, 0.075]} at={[x, 0.015, z]} rot={[0, r, 0]} color={colour.stone} bevel={0.012} />
      ))}
      <Barrel at={[0.3, base, 0.12]} color={colour.wood} hoop={colour.iron} />
      <Block size={[0.1, 0.1, 0.1]} at={[0.44, 0.05, 0.3]} rot={[0, 0.4, 0]} color={colour.wood} bevel={0.01} />
      <group position={[0.22, 0, 0.5]} rotation={[0, -0.35, 0]}>
        <Block size={[0.24, 0.022, 0.07]} at={[0, 0.09, 0]} color={colour.wood} bevel={0.008} />
        <Block size={[0.24, 0.06, 0.016]} at={[0, 0.14, -0.035]} color={colour.wood} bevel={0.006} />
        {[-0.09, 0.09].map((x) => (
          <Block key={x} size={[0.02, 0.09, 0.06]} at={[x, 0.045, 0]} color={colour.darkWood} bevel={0.006} />
        ))}
      </group>
    </group>
  )
}

/**
 * The keeper's cottage beside the tower: cream walls under a slate roof with
 * cream gable ends, a chimney, a door and one window at the front (slim
 * frames, room between them), a window at the side, and a lamp.
 */
function Cottage({ colour }: { colour: Record<'white' | 'walls' | 'iron' | 'stone' | 'roof', string> }) {
  const { x, z, width, depth, plinth, wall, rise } = COTTAGE
  const eaves = plinth + wall
  const front = z + depth / 2
  return (
    <group>
      <Block size={[width + 0.06, plinth, depth + 0.06]} at={[x, plinth / 2, z]} color={colour.stone} bevel={0.015} />
      <Block size={[width, wall + 0.02, depth]} at={[x, plinth + wall / 2 - 0.01, z]} color={colour.walls} bevel={0.025} />
      <Roof size={[width, rise, depth]} at={[x, eaves, z]} overhang={0.05} fascia={0.04} gable={colour.walls} color={colour.roof} />
      <Door size={[0.11, 0.26]} at={[x + 0.12, plinth, front]} color={colour.iron} frame={colour.white} border={COTTAGE_FRAME} />
      <Window size={[0.1, 0.13]} at={[x - 0.1, plinth + 0.25, front]} frame={colour.white} border={COTTAGE_FRAME} />
      <Window size={[0.1, 0.13]} at={[x - width / 2, plinth + 0.25, z]} rot={[0, -Math.PI / 2, 0]} frame={colour.white} border={COTTAGE_FRAME} />
      <Block size={[0.08, 0.3, 0.08]} at={[x - 0.15, eaves + rise * 0.55, z - 0.08]} color={landmark.brick} bevel={0.015} />
      <Block size={[0.11, 0.025, 0.11]} at={[x - 0.15, eaves + rise * 0.55 + 0.16, z - 0.08]} color={colour.white} bevel={0.01} />
    </group>
  )
}

/** Its shadow covers the platform, the cottage and the props. */
Lighthouse.shadow = 1.05
/** The heights it follows: the shaft takes up the difference. */
Lighthouse.heights = [1.8, 2.6] as const
