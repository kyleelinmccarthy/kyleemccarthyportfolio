'use client'

import { landmark } from '@/content/sky'
import {
  Blob,
  Block,
  Door,
  Extruded,
  Roof,
  StreetLamp,
  Turned,
  Water,
  Window,
  blend,
  ellipseOutline,
  heightWithin,
  stackUp,
  type Point2,
  type Vec3,
} from './kit'
import type { ModelProps } from './registry'

/** The hall: its walls (the cella) behind the portico, its width left to right and where its back and front walls stand. */
const HALL = { width: 1.12, back: -0.5, front: 0.1 }
/** The portico in front of it: how far out the colonnade stands. */
const PORTICO = { front: 0.4 }
/** The three steps of the plinth it stands on, each this tall, each reaching this far past the one above. */
const STEPS = { count: 3, rise: 0.05, reach: 0.045 }
/** How far the plinth's top step reaches past the walls and the colonnade. */
const PLINTH_REACH = { side: 0.08, front: 0.1, back: 0.06 }
/** The four columns across the front: their radius, and the base and capital as shares of their height. */
const COLUMN = { radius: 0.05, count: 4, base: 0.05, capital: 0.06, sides: 9 }
/** The entablature over the columns, bottom to top: architrave, frieze, cornice. */
const ENTABLATURE = { architrave: 0.05, frieze: 0.045, cornice: 0.03, reach: 0.03 }
/** The pediment roof's rise, and the finial on its front apex. */
const PEDIMENT = { rise: 0.2, overhang: 0.05, courses: 5 }
const FINIAL = { height: 0.07, radius: 0.026 }
/** The fountain on the forecourt: its basin's radius and height, the spout's height. */
const FOUNTAIN = { z: 0.86, radius: 0.15, basin: 0.07, spout: 0.11 }
/** The lamps either side of the steps, and how tall and wide their lanterns are. */
const LAMPS: Vec3[] = [
  [-0.5, 0, 0.74],
  [0.5, 0, 0.74],
]
const LAMP = { height: 0.37, lantern: 0.04 }
/** The door, as shares of the wall: its height, and its width as a share of its height. */
const DOOR = { tall: 0.58, wide: 0.53 }
/** Clipped shrubs at the plinth's corners. */
const SHRUBS: Array<[number, number]> = [
  [-0.86, 0.42],
  [0.86, 0.42],
  [-0.86, -0.46],
  [0.86, -0.46],
]

type Colours = Record<'stone' | 'marble' | 'plinth' | 'roof' | 'frieze' | 'door' | 'gold' | 'metal' | 'green', string>

/** A column turned with a moulded base, a slight taper and a flaring capital, under a square abacus. */
function Column({ at, height, colour }: { at: Vec3; height: number; colour: Colours }) {
  const r = COLUMN.radius
  const base = COLUMN.base
  const capital = height - COLUMN.capital
  const profile: Point2[] = [
    [0, 0],
    [r + 0.022, 0],
    [r + 0.022, base * 0.45],
    [r + 0.008, base],
    [r, base + 0.01],
    [r * 0.88, capital - 0.012],
    [r * 0.95, capital],
    [r + 0.024, height - 0.022],
    [0, height - 0.022],
  ]
  return (
    <group position={at}>
      <Turned profile={profile} sides={COLUMN.sides} color={colour.marble} />
      <Block size={[2 * r + 0.06, 0.026, 2 * r + 0.06]} at={[0, height - 0.013, 0]} color={colour.marble} bevel={0.008} />
    </group>
  )
}

/**
 * NBS Website. It is a company's website, sixty-six pages rebuilt, so its
 * landmark is the company's civic front door: a classical hall on a stepped
 * plinth, a colonnade of four columns, an entablature with a band of the
 * district's blue, and a pediment roof, with a fountain on the forecourt.
 *
 * Three levels of detail. The main mass: the plinth, the hall, the colonnade,
 * the roof. The secondary forms: the three steps, the columns' bases and
 * capitals, the architrave, frieze and cornice, the pediment's tympanum with
 * its medallion, tall windows on every side and the doors. The props: the
 * finial on the apex, lamps either side of the steps, the fountain, clipped
 * shrubs.
 *
 * Built from the ground up (`stackUp`): the columns take what the place's
 * height leaves under the entablature and the pediment, so the finial tops
 * out at the place's height, from 1.0 to 1.25 (`Civic.heights`). The door
 * is a share of the wall, so it grows with the columns; the columns keep their
 * radius, so the range stops where they would turn from sturdy to slender.
 */
export function Civic({ place, district }: ModelProps) {
  const colour: Colours = {
    stone: landmark.cream,
    marble: landmark.offWhite,
    plinth: blend(landmark.stone, landmark.slate, 0.22),
    // Dusty slate with the district's blue in it, so the frieze stays the brightest blue on the building.
    roof: blend(blend(district.color, landmark.slate, 0.55), landmark.indigo, 0.22),
    frieze: blend(district.color, landmark.offWhite, 0.35),
    door: blend(district.color, landmark.indigo, 0.45),
    gold: landmark.gold,
    metal: blend(landmark.slate, landmark.indigo, 0.4),
    green: landmark.green,
  }

  const height = heightWithin(place.height, Civic.heights)
  const plinth = STEPS.count * STEPS.rise
  const entablature = ENTABLATURE.architrave + ENTABLATURE.frieze + ENTABLATURE.cornice
  const columns = height - plinth - entablature - PEDIMENT.rise - FINIAL.height
  const [, architraveY, friezeY, corniceY, roofY] = stackUp(plinth, [columns, ENTABLATURE.architrave, ENTABLATURE.frieze, ENTABLATURE.cornice])
  const apexY = roofY + PEDIMENT.rise

  const { width, back, front } = HALL
  const halfW = width / 2
  // The whole temple, plinth to roof, runs from the back wall to the colonnade's front.
  const templeBack = back - COLUMN.radius
  const templeFront = PORTICO.front + COLUMN.radius + 0.02
  const templeDepth = templeFront - templeBack
  const templeZ = (templeFront + templeBack) / 2
  const hall = (back + front) / 2
  const wall = columns
  const spacing = (width - 2 * COLUMN.radius) / (COLUMN.count - 1)

  return (
    <group>
      {/* The plinth: three steps, each a little in from the one below, all round. */}
      {Array.from({ length: STEPS.count }, (_, k) => {
        const out = (STEPS.count - 1 - k) * STEPS.reach
        const w = width + 2 * PLINTH_REACH.side + 2 * out
        const z0 = templeBack - PLINTH_REACH.back - out
        const z1 = templeFront + PLINTH_REACH.front + out
        return <Block key={k} size={[w, STEPS.rise + 0.004, z1 - z0]} at={[0, STEPS.rise * (k + 0.5), (z0 + z1) / 2]} color={colour.plinth} bevel={0.012} />
      })}

      {/* The hall: cream walls, a doorway with tall windows either side, tall windows down each side and across the back. */}
      <Block size={[width - 0.04, wall + 0.01, front - back]} at={[0, plinth + wall / 2 - 0.005, hall]} color={colour.stone} bevel={0.02} />
      <Door size={[wall * DOOR.tall * DOOR.wide, wall * DOOR.tall]} at={[0, plinth, front]} color={colour.door} frame={colour.marble} step={colour.plinth} />
      {[-1, 1].map((s) => (
        <Window key={s} size={[0.1, wall * 0.42]} at={[s * spacing * 0.95, plinth + wall * 0.5, front]} frame={colour.marble} />
      ))}
      {[-1, 1].flatMap((s) =>
        [-0.32, -0.04].map((z) => (
          <Window key={`${s}${z}`} size={[0.1, wall * 0.42]} at={[s * (halfW - 0.02), plinth + wall * 0.5, z]} rot={[0, (s * Math.PI) / 2, 0]} frame={colour.marble} />
        )),
      )}
      {[-0.22, 0.22].map((x) => (
        <Window key={x} size={[0.1, wall * 0.42]} at={[x, plinth + wall * 0.5, back]} rot={[0, Math.PI, 0]} frame={colour.marble} />
      ))}

      {/* The colonnade: four columns across the front. */}
      {Array.from({ length: COLUMN.count }, (_, k) => (
        <Column key={k} at={[-halfW + COLUMN.radius + k * spacing, plinth, PORTICO.front]} height={columns} colour={colour} />
      ))}
      {/* Pilasters at the hall's corners, answering the columns. */}
      {[-1, 1].map((s) => (
        <Block key={s} size={[0.07, wall, 0.07]} at={[s * (halfW - 0.035), plinth + wall / 2, front - 0.02]} color={colour.marble} bevel={0.012} />
      ))}

      {/* The entablature: architrave, a frieze of the district's blue, a cornice. */}
      <Block size={[width + 0.02, ENTABLATURE.architrave, templeDepth]} at={[0, architraveY + ENTABLATURE.architrave / 2, templeZ]} color={colour.marble} bevel={0.012} />
      <Block size={[width + 0.03, ENTABLATURE.frieze, templeDepth + 0.01]} at={[0, friezeY + ENTABLATURE.frieze / 2, templeZ]} color={colour.frieze} bevel={0.01} />
      {/* Triglyph blocks along the frieze's front. */}
      {Array.from({ length: 7 }, (_, k) => (
        <Block key={k} size={[0.04, ENTABLATURE.frieze - 0.008, 0.012]} at={[-halfW + 0.02 + (k * (width - 0.04)) / 6, friezeY + ENTABLATURE.frieze / 2, templeFront + 0.008]} color={colour.marble} bevel={0.004} outline={false} />
      ))}
      <Block
        size={[width + 2 * ENTABLATURE.reach, ENTABLATURE.cornice, templeDepth + 2 * ENTABLATURE.reach]}
        at={[0, corniceY + ENTABLATURE.cornice / 2, templeZ]}
        color={colour.marble}
        bevel={0.01}
      />

      {/* The pediment roof: a gable turned so its end faces the front, the tympanum in marble with a gold medallion. */}
      <Roof
        size={[templeDepth + 0.02, PEDIMENT.rise, width + 0.02]}
        at={[0, roofY, templeZ]}
        rot={[0, Math.PI / 2, 0]}
        overhang={PEDIMENT.overhang}
        fascia={0.035}
        courses={PEDIMENT.courses}
        gable={colour.marble}
        color={colour.roof}
      />
      <Extruded shape={ellipseOutline(0.05, 0.05, 16)} depth={0.016} at={[0, roofY + PEDIMENT.rise * 0.38, templeFront + 0.018]} color={colour.gold} />
      {/* The finial on the apex. */}
      <Turned
        profile={[[0, 0], [FINIAL.radius, 0], [FINIAL.radius * 0.6, FINIAL.height * 0.4], [FINIAL.radius * 1.1, FINIAL.height * 0.7], [0, FINIAL.height]]}
        at={[0, apexY - 0.012, templeFront + PEDIMENT.overhang - 0.02]}
        color={colour.gold}
      />

      {/* The forecourt: lamps either side of the steps, a round fountain, clipped shrubs at the plinth's corners. */}
      {LAMPS.map((at) => (
        <StreetLamp key={at[0]} at={at} height={LAMP.height} lantern={LAMP.lantern} foot={colour.plinth} color={colour.metal} />
      ))}
      {/* The fountain: a round basin with a lip, water in it, and a spout with a bowl on top. */}
      <group position={[0, 0, FOUNTAIN.z]}>
        <Turned
          profile={[[0, 0], [FOUNTAIN.radius, 0], [FOUNTAIN.radius + 0.01, FOUNTAIN.basin], [FOUNTAIN.radius - 0.025, FOUNTAIN.basin - 0.02], [0, FOUNTAIN.basin - 0.02]]}
          color={colour.plinth}
        />
        <Water shape={ellipseOutline(FOUNTAIN.radius - 0.025, FOUNTAIN.radius - 0.025, 20)} rings={3} at={[0, FOUNTAIN.basin - 0.012, 0]} />
        <Turned profile={[[0, 0], [0.024, 0], [0.016, FOUNTAIN.spout * 0.7], [0.05, FOUNTAIN.spout - 0.01], [0, FOUNTAIN.spout]]} at={[0, FOUNTAIN.basin - 0.02, 0]} color={colour.marble} />
      </group>
      {/* Clipped shrubs, with their own thin line, so they hold their shape beside the plinth as everything else does. */}
      {SHRUBS.map(([x, z]) => (
        <Blob key={`${x}${z}`} radius={0.08} squash={[1, 0.85, 1]} at={[x, 0.068, z]} color={colour.green} />
      ))}
    </group>
  )
}

/** Its shadow covers the plinth and the forecourt. */
Civic.shadow = 1.05
/** The heights it follows: the columns take up the difference, the door following the wall. */
Civic.heights = [1.0, 1.25] as const
