'use client'

import { landmark } from '@/content/sky'
import { Block, Door, Extruded, Lit, Ring, Roof, Rod, Sway, Turned, Window, blend, ellipseOutline, heightWithin, roundedRectOutline, turnedTop, type Point2, type Vec3 } from './kit'
import { Pip, SITTING } from './Pip'
import type { ModelProps } from './registry'

/**
 * The tavern's ground floor: its width, depth and where its middle stands
 * (back from the place's middle, so the door, the barrel and Pip have room in
 * front). The half storey above juts out past it all round by `jetty`, as a
 * timber-framed house's upper floor does.
 */
const BODY = { width: 0.9, depth: 0.64, z: -0.12, jetty: 0.04 }
/** The stone footing the walls stand on, a little wider than them all round. */
const FOOTING = { height: 0.08, reach: 0.025 }
/** The roof: its rise a share of the height (about a third: steep), reaching `overhang` past the walls. */
const ROOF = { share: 0.34, overhang: 0.08 }
/** The chimney: up through the right-hand slope from `from` of the way up it, its cap `above` the ridge. */
const CHIMNEY = { size: 0.13, x: 0.24, z: -0.13, above: 0.16, cap: 0.035, from: 0.35 }
/** The ground floor's share of the walls under the eaves; the half storey takes the rest. */
const GROUND_SHARE = 0.6
/** The dark timbers: posts and beams, how thick across and how far proud of the plaster they stand. */
const TIMBER = { width: 0.036, proud: 0.014 }
/** The beam under the jutting half storey, and the joists' ends showing under it along the front. */
const JETTY_BEAM = 0.05
const JOISTS = 7
/** The door, right of the middle, never taller than `most` and always a little under the jetty. */
const DOOR = { x: 0.12, width: 0.18, most: 0.36 }
/** Windows: a wide one left of the door, one in the half storey over the door, one in the gable; one down each side and at the back. */
const WINDOW = { ground: { x: -0.28, size: [0.17, 0.2] as [number, number] }, upper: [0.17, 0.17] as [number, number], gable: [0.1, 0.1] as [number, number], side: [0.15, 0.18] as [number, number], border: 0.026 }
/** The lamp on the wall right of the door. */
const LAMP = { x: 0.33, size: [0.04, 0.06, 0.04] as Vec3 }
/** The sign's iron bracket, out from the front right corner, and the board hanging from it, showing a tankard. */
const SIGN = { reach: 0.24, board: [0.17, 0.15] as [number, number], drop: 0.035 }
/** The tankard on the sign, in the district's colour, with its foam and handle. */
const TANKARD = { size: [0.062, 0.07] as [number, number], foam: [0.04, 0.016] as [number, number], handle: 0.019 }
/** The barrel Pip sits on, left of the door: turned with a belly, two iron hoops; Pip sits toward its front edge. */
const BARREL = { x: -0.13, out: 0.1, profile: [[0, 0], [0.05, 0], [0.058, 0.065], [0.05, 0.13], [0, 0.13]] as Point2[], hoops: [0.024, 0.106], hoop: 0.054, seat: 0.022 }
/** From her seat to her hat's tip, Pip is a third of the door's height. */
const PIP_SHARE = 1 / 3

type Colours = Record<'plaster' | 'timber' | 'stone' | 'chimney' | 'roof' | 'door' | 'iron' | 'wood' | 'accent' | 'foam', string>

/** A dark timber laid flat on a wall's face from `a` to `b` ([x, y] across the face), standing proud of it; `z` is the face. */
function Beam({ a, b, z, colour }: { a: [number, number]; b: [number, number]; z: number; colour: string }) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  return (
    <Block
      size={[TIMBER.width, Math.hypot(dx, dy) + TIMBER.width * 0.5, TIMBER.proud + 0.01]}
      at={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z + TIMBER.proud / 2 - 0.005]}
      rot={[0, 0, -Math.atan2(dx, dy)]}
      color={colour}
      bevel={0.006}
    />
  )
}

/** The hanging sign: a dark board on two short hangers, a tankard in the district's colour with its foam and handle. Built round the hangers' top. */
function Sign({ colour }: { colour: Colours }) {
  const [w, h] = SIGN.board
  const mid = -SIGN.drop - h / 2
  const [tw, th] = TANKARD.size
  return (
    <>
      {[-1, 1].map((s) => (
        <Block key={s} size={[0.008, SIGN.drop + 0.01, 0.008]} at={[s * w * 0.32, -SIGN.drop / 2, 0]} color={colour.iron} bevel={0.003} outline={false} />
      ))}
      <Extruded shape={roundedRectOutline(w, h, 0.03)} depth={0.024} at={[0, mid, -0.012]} color={colour.timber} />
      <Extruded shape={roundedRectOutline(tw, th, 0.012)} depth={0.008} at={[-0.01, mid - 0.012, 0.012]} color={colour.accent} bevel={0.002} outline={false} />
      <Extruded shape={ellipseOutline(...TANKARD.foam, 16)} depth={0.008} at={[-0.01, mid - 0.012 + th / 2, 0.013]} color={colour.foam} bevel={0.002} outline={false} />
      <Ring radius={TANKARD.handle} thickness={0.009} sides={4} around={14} at={[-0.01 + tw / 2, mid - 0.012, 0.016]} rot={[Math.PI / 2, 0, 0]} color={colour.accent} outline={false} />
    </>
  )
}

/**
 * dnd4noobs, a site that teaches the owner's family to play Dungeons &
 * Dragons, with Pip, a goblin bard, as its guide. Its landmark is the tavern
 * every adventure starts in: a timber-framed tavern of a storey and a half
 * on a stone footing, plastered walls between dark timbers, its half storey
 * jutting out over the ground floor, a steep shingled roof with its gable to
 * the front, a brick chimney, and a sign with a tankard on it hung from an
 * iron bracket. Pip sits on a barrel beside the door with her lute.
 *
 * Three levels of detail. The main mass: the footing, the walls and the
 * roof. The secondary forms: the timber framing, the jetty beam and its
 * joists, the door and its stone step, windows on every side and in the
 * gable, the chimney. The props: Pip on her barrel, the lamp by the door, the
 * hanging sign, rocking a little.
 *
 * The chimney's cap stands at the place's height, from 1.5 to 1.9
 * (`Tavern.heights`); the roof's rise is a share of it, the walls take what
 * is left under the eaves and the ground floor a share of them.
 */
export function Tavern({ place, district }: ModelProps) {
  const colour: Colours = {
    plaster: blend(district.color, landmark.cream, 0.86),
    // Dark oak: the wood warmed with brick, deepened toward indigo (not so far that it turns violet).
    timber: blend(blend(landmark.wood, landmark.brick, 0.35), landmark.indigo, 0.5),
    // Fieldstone: grey, warmed a little by the wood.
    stone: blend(blend(landmark.slate, landmark.stone, 0.4), landmark.wood, 0.15),
    // The chimney's old brick, softened toward the stone.
    chimney: blend(landmark.brick, landmark.stone, 0.25),
    // Weathered shingles: the district's orange reddened toward brick and deepened toward indigo.
    roof: blend(blend(district.color, landmark.brick, 0.5), landmark.indigo, 0.4),
    door: blend(blend(district.color, landmark.brick, 0.4), landmark.indigo, 0.35),
    iron: landmark.indigo,
    wood: landmark.wood,
    accent: district.color,
    foam: landmark.cream,
  }

  const height = heightWithin(place.height, Tavern.heights)
  const chimneyTop = height - CHIMNEY.cap / 2
  const ridge = height - CHIMNEY.above
  const rise = height * ROOF.share
  const eaves = ridge - rise
  const groundTop = FOOTING.height + (eaves - FOOTING.height) * GROUND_SHARE
  const upper = eaves - groundTop
  const door = Math.min(DOOR.most, groundTop - FOOTING.height - 0.07)

  const { width, depth, z, jetty } = BODY
  const front = z + depth / 2
  const back = z - depth / 2
  const upperWidth = width + 2 * jetty
  const upperDepth = depth + 2 * jetty
  const upperFront = front + jetty
  const upperBack = back - jetty
  const upperWindow: [number, number] = [WINDOW.upper[0], Math.min(WINDOW.upper[1], upper * 0.5)]
  const groundWindowY = FOOTING.height + (groundTop - FOOTING.height) * 0.55
  const upperWindowY = groundTop + JETTY_BEAM / 2 + (upper - JETTY_BEAM / 2) * 0.48
  // The gable's timbers: a collar across it, a king post from the collar to near its apex, struts from the tie beam's ends to the collar.
  const collar = eaves + rise * 0.42
  const collarHalf = (upperWidth / 2) * (1 - 0.42) - 0.05
  const apex = eaves + rise * 0.8
  const gableWindowY = eaves + rise * 0.2
  const chimneyFoot = eaves + rise * CHIMNEY.from
  const seat = turnedTop(BARREL.profile)

  // Corner posts and studs on each storey; braces in the half storey's outer panels.
  const groundPosts = [-1, 1].map((s) => s * (width / 2 - TIMBER.width / 2))
  const upperPosts = [-1, 1].map((s) => s * (upperWidth / 2 - TIMBER.width / 2))
  const upperStuds = [-1, 1].map((s) => s * (WINDOW.upper[0] / 2 + WINDOW.border + 0.03))
  const upperFoot = groundTop + JETTY_BEAM / 2
  const upperHead = eaves - TIMBER.width

  return (
    <group>
      {/* The main mass: the footing, the ground floor's walls, the jutting half storey, the roof with its plastered gables. */}
      <Block size={[width + 2 * FOOTING.reach, FOOTING.height, depth + 2 * FOOTING.reach]} at={[0, FOOTING.height / 2, z]} color={colour.stone} bevel={0.02} />
      <Block size={[width, groundTop - FOOTING.height + 0.01, depth]} at={[0, (groundTop + FOOTING.height) / 2, z]} color={colour.plaster} bevel={0.02} />
      <Block size={[upperWidth, upper, upperDepth]} at={[0, groundTop + upper / 2, z]} color={colour.plaster} bevel={0.02} />
      <Roof size={[upperDepth, rise, upperWidth]} rot={[0, Math.PI / 2, 0]} at={[0, eaves, z]} overhang={ROOF.overhang} gable={colour.plaster} color={colour.roof} />

      {/* The jetty: a beam round the foot of the half storey, the joists' ends under it along the front. */}
      <Block size={[upperWidth + 0.012, JETTY_BEAM, upperDepth + 0.012]} at={[0, groundTop, z]} color={colour.timber} bevel={0.012} />
      {Array.from({ length: JOISTS }, (_, k) => {
        const x = (k / (JOISTS - 1) - 0.5) * (width - 0.08)
        return <Block key={k} size={[0.026, 0.026, jetty + 0.02]} at={[x, groundTop - JETTY_BEAM / 2 - 0.012, front + jetty / 2]} color={colour.timber} bevel={0.006} />
      })}

      {/* The ground floor's timbers: corner posts showing on two faces, a sill beam on the footing. */}
      {groundPosts.flatMap((x) =>
        [front, back].map((fz) => (
          <Block key={`${x}${fz}`} size={[TIMBER.width + 0.01, groundTop - FOOTING.height, TIMBER.width + 0.01]} at={[x, (groundTop + FOOTING.height) / 2, fz - Math.sign(fz - z) * (TIMBER.width / 2 - 0.007)]} color={colour.timber} bevel={0.008} />
        )),
      )}
      <Block size={[width + 0.012, 0.03, depth + 0.012]} at={[0, FOOTING.height + 0.015, z]} color={colour.timber} bevel={0.008} />

      {/* The half storey's timbers, front and back: corner posts, studs by the window, braces, the tie beam under the gable. */}
      {[0, Math.PI].map((turn) => (
        <group key={turn} position={[0, 0, z]} rotation={[0, turn, 0]}>
          {[...upperPosts, ...upperStuds].map((x) => (
            <Beam key={x} a={[x, upperFoot]} b={[x, upperHead]} z={upperDepth / 2} colour={colour.timber} />
          ))}
          {[-1, 1].map((s) => (
            <Beam key={s} a={[s * (upperWidth / 2 - 0.06), upperFoot + 0.02]} b={[s * (Math.abs(upperStuds[0]) + 0.04), upperHead - 0.02]} z={upperDepth / 2} colour={colour.timber} />
          ))}
          <Beam a={[-upperWidth / 2 + 0.01, eaves - TIMBER.width / 2]} b={[upperWidth / 2 - 0.01, eaves - TIMBER.width / 2]} z={upperDepth / 2} colour={colour.timber} />
          {/* The gable: a collar, a king post over it, struts from the tie beam's ends up to the collar. */}
          <Beam a={[-collarHalf, collar]} b={[collarHalf, collar]} z={upperDepth / 2} colour={colour.timber} />
          <Beam a={[0, collar]} b={[0, apex]} z={upperDepth / 2} colour={colour.timber} />
          {[-1, 1].map((s) => (
            <Beam key={s} a={[s * (upperWidth / 2 - 0.08), eaves + 0.01]} b={[s * (collarHalf - 0.06), collar]} z={upperDepth / 2} colour={colour.timber} />
          ))}
        </group>
      ))}

      {/* Down each side: a post in the half storey with a brace either side of it and a plate under the eaves, a window on the ground floor. */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, z]} rotation={[0, (s * Math.PI) / 2, 0]}>
          {[-1, 1].map((k) => (
            <Beam key={k} a={[k * (upperDepth / 2 - 0.06), upperFoot + 0.02]} b={[k * 0.06, upperHead - 0.02]} z={upperWidth / 2} colour={colour.timber} />
          ))}
          <Beam a={[0, upperFoot]} b={[0, upperHead]} z={upperWidth / 2} colour={colour.timber} />
          <Beam a={[-upperDepth / 2 + 0.01, eaves - TIMBER.width / 2]} b={[upperDepth / 2 - 0.01, eaves - TIMBER.width / 2]} z={upperWidth / 2} colour={colour.timber} />
          <Window size={WINDOW.side} at={[0, groundWindowY, width / 2]} frame={colour.timber} border={WINDOW.border} />
        </group>
      ))}

      {/* The front: the door on its stone step, the wide window, the half storey's window and the gable's. */}
      <Block size={[DOOR.width + 0.2, FOOTING.height, 0.15]} at={[DOOR.x, FOOTING.height / 2, front + 0.075]} color={colour.stone} bevel={0.014} />
      <Door size={[DOOR.width, door]} at={[DOOR.x, FOOTING.height, front]} color={colour.door} frame={colour.timber} step={colour.stone} border={0.03} />
      <Window size={WINDOW.ground.size} at={[WINDOW.ground.x, groundWindowY, front]} frame={colour.timber} border={WINDOW.border} />
      <Window size={upperWindow} at={[0, upperWindowY, upperFront]} frame={colour.timber} border={WINDOW.border} />
      <Window size={WINDOW.gable} at={[0, gableWindowY, upperFront]} frame={colour.timber} border={WINDOW.border} sill={false} />

      {/* The back: a window on each floor. */}
      <Window size={WINDOW.side} at={[0, groundWindowY, back]} rot={[0, Math.PI, 0]} frame={colour.timber} border={WINDOW.border} />
      <Window size={upperWindow} at={[0, upperWindowY, upperBack]} rot={[0, Math.PI, 0]} frame={colour.timber} border={WINDOW.border} />

      {/* The brick chimney up through the right-hand slope, clear of the ridge, with its cap. */}
      <Block size={[CHIMNEY.size, chimneyTop - chimneyFoot, CHIMNEY.size]} at={[CHIMNEY.x, (chimneyTop + chimneyFoot) / 2, CHIMNEY.z]} color={colour.chimney} bevel={0.02} />
      <Block size={[CHIMNEY.size + 0.04, CHIMNEY.cap, CHIMNEY.size + 0.04]} at={[CHIMNEY.x, chimneyTop, CHIMNEY.z]} color={colour.timber} bevel={0.012} />

      {/* The lamp right of the door. */}
      <Block size={[0.05, 0.03, 0.05]} at={[LAMP.x, FOOTING.height + door * 0.72, front + 0.02]} color={colour.iron} bevel={0.01} />
      <Lit size={LAMP.size} at={[LAMP.x, FOOTING.height + door * 0.72 + 0.045, front + 0.035]} color={landmark.lit} />

      {/* The sign: an iron bracket out from the front right corner with a strut under it, the board rocking a little below. */}
      <Block size={[SIGN.reach, 0.022, 0.022]} at={[width / 2 + SIGN.reach / 2, groundTop - JETTY_BEAM, front - 0.03]} color={colour.iron} bevel={0.007} />
      <Rod from={[width / 2, groundTop - JETTY_BEAM - 0.14, front - 0.03]} to={[width / 2 + SIGN.reach * 0.6, groundTop - JETTY_BEAM, front - 0.03]} radius={0.007} sides={6} color={colour.iron} />
      <Sway at={[width / 2 + SIGN.reach * 0.6, groundTop - JETTY_BEAM - 0.011, front - 0.03]} axis="x" amount={0.06} speed={1.0}>
        <Sign colour={colour} />
      </Sway>

      {/* Pip on her barrel beside the door. */}
      <group position={[BARREL.x, 0, front + BARREL.out]}>
        <Turned profile={BARREL.profile} color={colour.wood} />
        {BARREL.hoops.map((y) => (
          <Ring key={y} radius={BARREL.hoop} thickness={0.008} sides={4} around={16} at={[0, y, 0]} color={colour.iron} />
        ))}
        <group position={[0, seat, BARREL.seat]}>
          <Pip scale={(door * PIP_SHARE) / SITTING} />
        </group>
      </group>
    </group>
  )
}

/** Its shadow covers the tavern, its step and Pip's barrel. */
Tavern.shadow = 0.95
/** The heights it follows: the chimney's cap stands at the place's height, the roof's rise a share of it, the walls under it. */
Tavern.heights = [1.5, 1.9] as const
