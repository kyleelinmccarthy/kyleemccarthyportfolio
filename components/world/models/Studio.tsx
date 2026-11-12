'use client'

import { landmark } from '@/content/sky'
import { focusEye } from '@/lib/world/camera'
import {
  Blob,
  Block,
  Door,
  Extruded,
  Lit,
  Rounded,
  StreetLamp,
  Sway,
  Tube,
  Window,
  blend,
  heightWithin,
  pointing,
  starOutline,
  type Vec3,
} from './kit'
import type { ModelProps } from './registry'
import { CORNICE, ShopShell, groundTopOf, type Parapet, type Storey } from './shopfront'

/** The paved forecourt the studio stands on. */
const PAVING = { width: 1.7, depth: 1.36, z: 0.04, height: 0.04 }
/** The studio: its width, depth and where its middle stands; the plinth course round its foot. */
const BUILDING = { width: 1.16, depth: 0.78, z: -0.18, plinth: 0.08 }
/** The ground floor's share of the walls, never less than `least` tall (the door and the marquee need it). */
const STOREY: Storey = { share: 0.55, least: 0.44, band: 0.04 }
/** The gold parapet rail round the roof, on the shared cornice. */
const PARAPET: Parapet = { height: 0.05, thick: 0.035, bevel: 0.01 }
/**
 * The marquee over the ground floor: a gold canopy reaching out from the wall
 * `reach`, a fascia round its edge with a row of bulbs along it and a
 * sparkle (the studio's own four-point star) on its front. `drop` is how far its fascia's foot stands under the ground floor's top.
 */
const MARQUEE = { width: 1.12, reach: 0.2, fascia: 0.1, slab: 0.035, drop: 0.04, bulbs: 15, sideBulbs: 3, bulb: 0.03 }
/** The sparkles' outer radii (the big one fits between the fascia's trims), and how far out the small ones stand. */
const SPARKLE = { big: 0.034, small: 0.02, side: 0.11 }
/**
 * The joystick on the roof: its rounded base, the stick and the ball on top,
 * two buttons beside it. The stick wiggles gently about its foot, two sways
 * across each other at different speeds tracing a slow loop; both start
 * upright, so under reduced motion (the clock held at its start) it stands
 * straight. `pivot` is how far above the base's top the stick turns, `rise`
 * where the ball's middle sits above the stick's top, as a share of its
 * radius, and `seat` how far the base is set into the roof deck it stands on.
 */
const JOYSTICK = {
  x: 0.04,
  z: -0.2,
  base: [0.52, 0.12, 0.4] as Vec3,
  pivot: 0.012,
  stick: 0.3,
  stickRadius: 0.03,
  ball: 0.105,
  rise: 0.7,
  seat: 0.004,
  wiggle: 0.12,
  speed: 1.1,
  across: 0.7,
}
const BUTTONS: Array<{ x: number; z: number }> = [
  { x: 0.15, z: 0.08 },
  { x: 0.17, z: -0.07 },
]
/** The joystick's height above the roof deck: its base, the stick and the ball's top, less what is set into the deck. */
const JOYSTICK_TALL = JOYSTICK.base[1] + JOYSTICK.pivot + JOYSTICK.stick + JOYSTICK.ball * (JOYSTICK.rise + 1) - JOYSTICK.seat
/** The front: the shop window left of the door, three windows above. */
const FRONT = { window: { x: -0.27, width: 0.44 }, door: { x: 0.27, width: 0.19 }, upper: [-0.38, 0, 0.38] }
/**
 * The shop window under the marquee: its pane stands no lower than `lowest`
 * over the floor (its sill clear of the plinth) and is at most `most` tall;
 * its top, frame and all, stands `clear` under the line the place camera sees
 * along past the marquee's front edge, so the whole window shows from the
 * place view at every height the studio is built for. `frame` is the
 * window's frame above its pane. The side windows downstairs stand at `side`.
 */
const SHOP_WINDOW = { lowest: 0.12, most: 0.24, clear: 0.01, frame: 0.032, side: { y: 0.25, size: [0.26, 0.2] as [number, number] } }
/**
 * How the upper windows sit over the marquee: `under` is how far a window's
 * sill and frame reach below its pane, `over` its frame above, `clear` the
 * gap kept from the marquee's top below and from the cornice above, and
 * `most` the tallest pane.
 */
const UPPER = { width: 0.2, under: 0.05, over: 0.032, clear: 0.028, most: 0.3 }
/**
 * The arcade cabinet by the door: where it stands and how it is turned; its
 * body, screen, control deck, stick knob and the lit strip along its top,
 * each a size and the middle it stands on.
 */
const CABINET = {
  x: 0.58,
  z: 0.44,
  turn: -0.35,
  body: [0.16, 0.34, 0.14] as Vec3,
  screen: { size: [0.12, 0.09, 0.012] as Vec3, y: 0.25, tilt: 0.15 },
  deck: { size: [0.17, 0.03, 0.08] as Vec3, y: 0.17, z: 0.09, tilt: 0.25 },
  knob: { radius: 0.012, at: [-0.03, 0.2, 0.1] as Vec3 },
  strip: { size: [0.15, 0.03, 0.03] as Vec3, z: 0.05 },
}
/** The planter by the window: its box, and the two shrubs in it (their spacing, radius and how high their middles stand). */
const PLANTER = { at: [-0.62, 0, 0.36] as Vec3, box: [0.26, 0.09, 0.12] as Vec3, shrubs: 0.065, shrub: 0.07, shrubY: 0.13 }
const LAMP = { at: [-0.74, 0, 0.62] as Vec3, height: 0.48, lantern: 0.042 }

type Colours = Record<'wall' | 'trim' | 'deep' | 'gold' | 'ball' | 'sparkle' | 'orange' | 'green' | 'metal' | 'paving' | 'screen', string>

/**
 * The marquee: a gold canopy on the wall's face at `y` (its fascia's foot),
 * reaching out toward +Z, edged by a deep fascia carrying a row of bulbs, a
 * sparkle on its front and two tie rods to the wall.
 * The bulbs are steady lamps (`Lit`): off by day, glowing at night, never
 * chasing or blinking. `at` is the middle of its foot on the wall.
 */
function Marquee({ at, colour }: { at: Vec3; colour: Colours }) {
  const { width, reach, fascia, slab, bulbs, sideBulbs, bulb } = MARQUEE
  const step = (width - 0.1) / (bulbs - 1)
  const sideStep = (reach - 0.08) / (sideBulbs - 1)
  return (
    <group position={at}>
      {/* The canopy, a slab under the fascia's top, and the fascia round its front and sides. */}
      <Block size={[width, slab, reach]} at={[0, fascia - slab / 2, reach / 2]} color={colour.gold} bevel={0.01} />
      <Block size={[width + 0.02, fascia, 0.04]} at={[0, fascia / 2, reach]} color={colour.gold} bevel={0.012} />
      {[-1, 1].map((s) => (
        <Block key={s} size={[0.04, fascia, reach]} at={[s * (width / 2), fascia / 2, reach / 2]} color={colour.gold} bevel={0.012} />
      ))}
      {/* A deep trim along the fascia's top and foot. */}
      {[0.008, fascia - 0.008].map((y) => (
        <Block key={y} size={[width + 0.04, 0.016, 0.05]} at={[0, y, reach]} color={colour.deep} bevel={0.005} outline={false} />
      ))}
      {/* The bulbs: a row along the front, leaving the middle one out where the sparkle stands, and a few down each side. */}
      {Array.from({ length: bulbs }, (_, k) =>
        k === (bulbs - 1) / 2 ? null : (
          <Lit key={k} size={[bulb, bulb, bulb]} at={[-(width - 0.1) / 2 + k * step, fascia * 0.3, reach + 0.026]} color={landmark.lit} outline={false} />
        ),
      )}
      {[-1, 1].flatMap((s) =>
        Array.from({ length: sideBulbs }, (_, k) => (
          <Lit key={`${s}${k}`} size={[bulb, bulb, bulb]} at={[s * (width / 2 + 0.026), fascia * 0.5, 0.04 + k * sideStep]} color={landmark.lit} outline={false} />
        )),
      )}
      {/* The studio's sparkle in the middle of the fascia, in the gap left in the row of bulbs, between the trims, with a small orange one either side. */}
      <Extruded shape={starOutline(4, SPARKLE.big, SPARKLE.big * 0.32)} depth={0.014} at={[0, fascia / 2, reach + 0.026]} color={colour.sparkle} bevel={0.004} />
      {[-1, 1].map((s) => (
        <Extruded key={s} shape={starOutline(4, SPARKLE.small, SPARKLE.small * 0.35)} depth={0.012} at={[s * SPARKLE.side, fascia * 0.64, reach + 0.024]} color={colour.orange} bevel={0.003} />
      ))}
      {/* Tie rods from the wall above to the fascia's corners. */}
      {[-1, 1].map((s) => {
        const rod = pointing([s * (width / 2 - 0.04), fascia + 0.2, 0], [s * (width / 2 - 0.04), fascia - 0.01, reach - 0.02])
        return <Tube key={s} at={rod.at} rot={rod.rot} height={rod.length} bottom={0.007} top={0.007} sides={8} bevel={0.003} color={colour.metal} outline={false} />
      })}
    </group>
  )
}

/**
 * The joystick on the roof, standing on `at`: a rounded deep base, two arcade
 * buttons, and the stick with its ball, wiggling gently in a slow circle.
 */
function Joystick({ at, colour }: { at: Vec3; colour: Colours }) {
  const [w, h] = JOYSTICK.base
  return (
    <group position={at} name="joystick">
      <Rounded size={JOYSTICK.base} round={0.3} at={[0, h / 2, 0]} color={colour.deep} />
      {BUTTONS.map(({ x, z }, k) => (
        <Tube key={k} at={[x, h - 0.01, z]} top={0.04} bottom={0.045} height={0.045} bevel={0.014} color={k ? colour.gold : colour.ball} />
      ))}
      {/* The stick's collar on the base, and the stick and ball, swaying about its foot. */}
      <Tube at={[-w * 0.15, h - 0.012, 0]} top={0.045} bottom={0.055} height={0.03} sides={12} bevel={0.01} color={colour.trim} />
      <Sway at={[-w * 0.15, h + JOYSTICK.pivot, 0]} axis="x" amount={JOYSTICK.wiggle} speed={JOYSTICK.speed}>
        <Sway axis="z" amount={JOYSTICK.wiggle} speed={JOYSTICK.speed * JOYSTICK.across}>
          <Tube top={JOYSTICK.stickRadius * 0.85} bottom={JOYSTICK.stickRadius} height={JOYSTICK.stick} sides={10} bevel={0.01} color={colour.metal} />
          <Blob radius={JOYSTICK.ball} at={[0, JOYSTICK.stick + JOYSTICK.ball * JOYSTICK.rise, 0]} color={colour.ball} />
        </Sway>
      </Sway>
    </group>
  )
}

/**
 * An arcade cabinet by the door, built on its foot facing +Z: a deep cabinet
 * with a lit screen (a screen glows at every hour), a control deck with a
 * small stick and buttons, and a gold strip lit along its top.
 */
function Cabinet({ colour }: { colour: Colours }) {
  const { body, screen, deck, knob, strip } = CABINET
  return (
    <group position={[CABINET.x, PAVING.height, CABINET.z]} rotation={[0, CABINET.turn, 0]}>
      <Block size={body} at={[0, body[1] / 2, 0]} color={colour.deep} bevel={0.016} />
      <Lit size={screen.size} at={[0, screen.y, body[2] / 2 + 0.002]} rot={[-screen.tilt, 0, 0]} color={colour.screen} day={colour.screen} always />
      <Block size={deck.size} at={[0, deck.y, deck.z]} rot={[deck.tilt, 0, 0]} color={colour.wall} bevel={0.008} />
      <Blob radius={knob.radius} at={knob.at} color={colour.ball} />
      <Lit size={strip.size} at={[0, body[1] + strip.size[1] / 2, strip.z]} color={landmark.lit} outline={false} />
    </group>
  )
}

/**
 * Tiny Frenzy Games, the owner's one-person game studio: a pink studio on a
 * paved forecourt, under a gold marquee strung with bulbs, with a giant
 * arcade joystick on its roof that wiggles gently. The studio's own colours,
 * from its site: pink walls, butter-gold and cream trim, deep indigo-violet,
 * and the four-point sparkles of its logo.
 *
 * Three levels of detail. The main mass: the studio and its forecourt. The
 * secondary forms: the plinth course, the band between the storeys, the
 * cornice and the gold parapet, the shop window and door, the windows round
 * every side, the marquee and its fascia. The props: the joystick and its
 * buttons on the roof, the marquee's bulbs and sparkles, an arcade cabinet by
 * the door, a planter, a street lamp.
 *
 * Built from the ground up: the joystick stands on the roof deck (the
 * cornice's top) and its ball tops out at the place's height, from 1.45 to
 * 1.75 (`Studio.heights`; any lower and the first floor is too short for its
 * windows over the marquee); the walls take what it and the cornice leave,
 * the ground floor a share of them (never too low for the door and the
 * marquee), the first floor the rest, its windows standing clear of the
 * marquee's top as tall as the wall between allows.
 */
export function Studio({ place, district }: ModelProps) {
  const colour: Colours = {
    wall: blend(district.color, landmark.cream, 0.32),
    trim: landmark.cream,
    deep: blend(landmark.indigo, landmark.purple, 0.3),
    gold: landmark.gold,
    ball: blend(district.color, landmark.red, 0.35),
    sparkle: landmark.purple,
    orange: landmark.orange,
    green: landmark.green,
    metal: blend(landmark.slate, landmark.indigo, 0.4),
    // Warm paving a shade deeper than the cream trim, so the studio's foot reads on it.
    paving: blend(blend(landmark.sand, landmark.stone, 0.4), landmark.slate, 0.25),
    screen: blend(landmark.teal, landmark.sky, 0.4),
  }

  const height = heightWithin(place.height, Studio.heights)
  const floor = PAVING.height
  // The joystick stands on the roof deck, the cornice's top, so the walls take what it and the cornice leave.
  const wallTop = height - JOYSTICK_TALL - CORNICE.height
  const deck = wallTop + CORNICE.height - 0.004
  const groundTop = groundTopOf(floor, wallTop, STOREY)
  const { width, depth, z } = BUILDING
  const front = z + depth / 2
  const back = z - depth / 2
  const doorHeight = groundTop - floor - MARQUEE.drop - 0.07
  const marqueeY = groundTop - MARQUEE.drop
  // The place camera looks down past the marquee's front edge: on the wall it hides all above that line.
  const eye = focusEye(height)
  const edge = front + MARQUEE.reach
  const sightOnWall = marqueeY - (MARQUEE.reach * (eye.up - marqueeY)) / (eye.back - edge)
  const paneTop = sightOnWall - SHOP_WINDOW.clear - SHOP_WINDOW.frame
  const paneLow = floor + SHOP_WINDOW.lowest
  const shopWindow: [number, number] = [FRONT.window.width, Math.min(SHOP_WINDOW.most, paneTop - paneLow)]
  const windowY = paneTop - shopWindow[1] / 2
  // The upper windows stand clear of the marquee's top and the cornice, their panes as tall as the wall between allows.
  const marqueeTop = marqueeY + MARQUEE.fascia
  const room = wallTop - marqueeTop - 2 * UPPER.clear - UPPER.under - UPPER.over
  const upperWindow: [number, number] = [UPPER.width, Math.min(UPPER.most, room)]
  const upperY = marqueeTop + UPPER.clear + UPPER.under + room / 2

  return (
    <group>
      {/* The forecourt, the studio's plinth course and walls, the band between the storeys, the cornice and the gold parapet round the roof. */}
      <ShopShell
        paving={PAVING}
        building={BUILDING}
        storey={STOREY}
        parapet={PARAPET}
        wallTop={wallTop}
        groundTop={groundTop}
        colour={{ paving: colour.paving, plinth: colour.deep, wall: colour.wall, band: colour.trim, cornice: colour.trim, parapet: colour.gold }}
      />

      {/* The front: the shop window and the door under the marquee, three windows above. */}
      <Window size={shopWindow} at={[FRONT.window.x, windowY, front]} frame={colour.trim} />
      <Door size={[FRONT.door.width, doorHeight]} at={[FRONT.door.x, floor, front]} color={colour.deep} frame={colour.trim} step={colour.trim} />
      <Marquee at={[0, marqueeY, front]} colour={colour} />
      {FRONT.upper.map((x) => (
        <Window key={x} size={upperWindow} at={[x, upperY, front]} frame={colour.trim} />
      ))}
      {/* Windows down each side, upstairs and down, and across the back. */}
      {[-1, 1].flatMap((s) =>
        [-0.17, 0.12].map((wz) => (
          <Window key={`${s}${wz}`} size={upperWindow} at={[s * (width / 2), upperY, z + wz]} rot={[0, (s * Math.PI) / 2, 0]} frame={colour.trim} />
        )),
      )}
      {[-1, 1].map((s) => (
        <Window key={`g${s}`} size={SHOP_WINDOW.side.size} at={[s * (width / 2), floor + SHOP_WINDOW.side.y, z]} rot={[0, (s * Math.PI) / 2, 0]} frame={colour.trim} />
      ))}
      {[-0.3, 0.3].map((x) => (
        <Window key={`b${x}`} size={upperWindow} at={[x, upperY, back]} rot={[0, Math.PI, 0]} frame={colour.trim} />
      ))}

      <Joystick at={[JOYSTICK.x, deck - JOYSTICK.seat, JOYSTICK.z]} colour={colour} />

      {/* The forecourt's props: the arcade cabinet, a planter of shrubs, the lamp. */}
      <Cabinet colour={colour} />
      <group position={[PLANTER.at[0], floor, PLANTER.at[2]]}>
        <Block size={PLANTER.box} at={[0, PLANTER.box[1] / 2, 0]} color={colour.deep} bevel={0.012} />
        {[-1, 1].map((s) => (
          <Blob key={s} radius={PLANTER.shrub} squash={[1, 0.85, 0.9]} at={[s * PLANTER.shrubs, PLANTER.shrubY, 0]} color={colour.green} />
        ))}
      </group>
      <StreetLamp at={[LAMP.at[0], floor, LAMP.at[2]]} height={LAMP.height} lantern={LAMP.lantern} foot={colour.deep} color={colour.metal} />
    </group>
  )
}

/** Its shadow covers the forecourt. */
Studio.shadow = 1.05
/** The heights it follows: the walls take what the joystick leaves, the ground floor a share of them. */
Studio.heights = [1.45, 1.75] as const
