'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Lit, Picture, Rod, Truss, Tube, Turned, blend, heightWithin, pictureAspect, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/**
 * The poster (its height follows the picture's shape), its frame's width round it, and
 * the cap rail along its top. `lift` is how far the poster stands in front of
 * the panel: enough that the two never fight for the same depth from far away.
 */
export const POSTER = { width: 1.5, frame: 0.04, cap: 0.03, lift: 0.005 }
/**
 * The cap rail: how far its middle stands in from the panel's back, how much
 * deeper than the panel it is, how far it runs past the frame at each end in
 * all, and how far it is set down onto the panel's top.
 */
const CAP_RAIL = { in: 0.01, over: 0.05, past: 0.06, seat: 0.002 }
/**
 * The panel the poster is pasted on: how deep it is, where its face's foot
 * stands, and how far it is tipped back from upright (radians), so the poster
 * turns a little up to the camera and still reads from the district's view
 * above.
 */
const PANEL = { depth: 0.06, face: 0.05, ribs: 4, tilt: 0.35 }
/** The two posts behind the panel, and the concrete footing under each. */
const POSTS = { x: 0.45, z: -0.2, radius: 0.045, footing: [0.2, 0.07, 0.2] as Vec3 }
/** The lattice girder across the back of the panel, at its middle, where the posts meet it; `out` is how far behind the panel's back. */
const GIRDER = { width: 0.07, bays: 12, out: 0.05 }
/** The sill beam along the panel's foot. */
const SILL = { height: 0.06, depth: 0.09 }
/**
 * The catwalk along the front, under the poster: its floor stands `under`
 * below the panel's foot, so its rail stays below the poster's face; it
 * reaches `reach` out from the panel. Three brackets carry it from the sill.
 */
const CATWALK = { under: 0.12, reach: 0.18, floor: 0.02, rail: 0.1, posts: 5, brackets: [-0.62, 0, 0.62] }
/**
 * Where the catwalk's bars meet: the brackets hang from `hang` behind the
 * panel's face and reach to `front` short of the floor's front edge, a little
 * under it (`under`); the rail runs `rail` in from that edge and `past` beyond
 * the poster at each end; the floor reaches `back` behind the face and `wider`
 * past the poster in all.
 */
const WALK_BARS = { hang: 0.03, front: 0.02, under: 0.004, rail: 0.01, past: 0.05, back: 0.02, wider: 0.12 }
/**
 * The lamps on the catwalk's front edge: each on a short stem, its arm
 * leaning back toward the poster, its head tilted up to light the face. The
 * heads stand under the poster's lower edge, so none crosses it from the front.
 */
const LAMPS = { xs: [-0.5, 0, 0.5], stem: 0.09, head: [0.12, 0.035, 0.06] as Vec3, tilt: 0.9 }
/** The ladder up to the catwalk's right end; `lean` is how far its top stands back from its foot. */
const LADDER = { x: 0.7, z: 0.3, width: 0.09, rung: 0.08, lean: 0.11 }
/** A pot of paste left on the catwalk: its profile (radius, height pairs) and where it stands across and out from the panel's face. */
const PASTE_POT = {
  profile: [[0, 0], [0.026, 0], [0.03, 0.05], [0.026, 0.052], [0, 0.052]] as Array<[number, number]>,
  x: -0.28,
  out: 0.06,
}
/** The gravel pad under it all, and shrubs at the posts' feet. */
const PAD = { width: 1.8, depth: 0.86, z: 0.05, height: 0.03 }
const SHRUBS: Vec3[] = [
  [-0.62, 0, -0.14],
  [0.6, 0, -0.2],
  [-0.3, 0, -0.2],
]

type Colours = Record<'steel' | 'panel' | 'frame' | 'concrete' | 'pad' | 'grate' | 'green' | 'paint', string>

/**
 * A floodlight on the catwalk's front edge at `at`: a stem, an arm leaning
 * back toward the poster, and a head tilted up at its face. The head is a
 * lamp (`Lit`): off by day, lit at night.
 */
function Floodlight({ at, colour }: { at: Vec3; colour: Colours }) {
  const { stem, head, tilt } = LAMPS
  const top: Vec3 = [0, stem, -0.05]
  return (
    <group position={at}>
      <Tube height={stem} bottom={0.01} top={0.008} sides={8} bevel={0.003} color={colour.steel} outline={false} />
      <Rod sides={4} from={[0, stem - 0.004, 0]} to={top} radius={0.007} color={colour.steel} outline={false} />
      <Block size={[head[0] + 0.02, head[1] + 0.01, head[2]]} at={[0, top[1], top[2] + 0.006]} rot={[-tilt, 0, 0]} color={colour.panel} bevel={0.008} />
      <Lit size={head} at={[0, top[1] + 0.012, top[2] - 0.006]} rot={[-tilt, 0, 0]} color={landmark.lit} outline={false} />
    </group>
  )
}

/**
 * Eliminated, the website: the game's marketing site, so its landmark is a
 * billboard carrying the game's real capsule art (`place.poster`, through
 * `Picture`: a neutral plate until it loads), on two steel posts on concrete
 * footings, a lattice girder across its back, a framed panel, and a catwalk
 * along its foot with a rail, a ladder up to it and three floodlights aimed up
 * at the poster. At night the lamps glow and the poster is lit as a backlit
 * sign is (`Picture`'s `lit`), at its own colours, never brighter, so it reads
 * without blooming.
 *
 * Three levels of detail. The main mass: the posts and the poster's panel.
 * The secondary forms: the frame, the cap rail, the panel's ribs at the back,
 * the girder, the sill, the catwalk and its rail and brackets, the ladder. The
 * props: the floodlights, a paint pot on the catwalk, footings and shrubs.
 *
 * The poster faces +Z, toward the place camera, its panel tipped back a
 * little so it also reads from the district's view above, and nothing stands
 * in front of it (the billboard's own test holds that). Built from the top down: the cap
 * rail stands at the place's height, from 1.5 to 1.9 (`Billboard.heights`),
 * and the panel, the catwalk and the posts' length follow it.
 */
export function Billboard({ place, district }: ModelProps) {
  const colour: Colours = {
    steel: blend(landmark.slate, landmark.indigo, 0.4),
    panel: blend(landmark.indigo, landmark.slate, 0.3),
    // The game's own pink, deepened a little, for the frame.
    frame: blend(district.color, landmark.indigo, 0.18),
    concrete: blend(landmark.stone, landmark.slate, 0.3),
    pad: blend(landmark.sand, landmark.stone, 0.45),
    grate: blend(landmark.slate, landmark.stone, 0.35),
    green: landmark.green,
    paint: landmark.offWhite,
  }

  const height = heightWithin(place.height, Billboard.heights)
  const { width, frame, cap } = POSTER
  // The poster at its own shape (`place.posterSize`), never stretched.
  const posterH = width / pictureAspect(place.posterSize)
  const panelH = posterH + 2 * frame
  // The panel is built upright in its own frame (y up its face from its foot, z out of its face) and tipped back about its
  // foot; `tipped` gives where a point of that frame stands. Its highest point, the cap rail's front edge, is at the place's height.
  const [cos, sin] = [Math.cos(PANEL.tilt), Math.sin(PANEL.tilt)]
  const capRail = { z: -PANEL.depth / 2 + CAP_RAIL.in, depth: PANEL.depth + CAP_RAIL.over }
  const capFront = capRail.z + capRail.depth / 2
  const panelBottom = height - ((panelH + cap) * cos + capFront * sin)
  const tipped = (y: number, z: number): [number, number] => [panelBottom + y * cos + z * sin, PANEL.face - y * sin + z * cos]
  const girderLocal = { y: panelH / 2, z: -PANEL.depth - GIRDER.out }
  const [girderY, postZ] = tipped(girderLocal.y, girderLocal.z)
  const walkY = panelBottom - CATWALK.under
  const walkFront = PANEL.face + CATWALK.reach
  const ground = PAD.height
  const footing = POSTS.footing[1]

  return (
    <group>
      {/* The gravel pad, the footings and the two posts. */}
      <Block size={[PAD.width, ground, PAD.depth]} at={[0, ground / 2, PAD.z]} color={colour.pad} bevel={0.012} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * POSTS.x, ground, postZ]}>
          <Block size={POSTS.footing} at={[0, footing / 2, 0]} color={colour.concrete} bevel={0.016} />
          <Tube height={girderY - ground - footing} at={[0, footing - 0.002, 0]} bottom={POSTS.radius} top={POSTS.radius} sides={8} bevel={0.012} color={colour.steel} />
        </group>
      ))}
      {/* Cross bracing between the posts, under the panel, and a strut from each post to the sill at the panel's foot. */}
      {[-1, 1].map((s) => (
        <Rod sides={4} key={s} from={[-s * POSTS.x, ground + footing + 0.05, postZ]} to={[s * POSTS.x, panelBottom - 0.08, postZ]} radius={0.012} color={colour.steel} />
      ))}
      {[-1, 1].map((s) => (
        <Rod sides={4} key={`s${s}`} from={[s * POSTS.x, panelBottom - SILL.height / 2, postZ]} to={[s * POSTS.x, panelBottom - SILL.height / 2, PANEL.face - SILL.depth + 0.012]} radius={0.012} color={colour.steel} />
      ))}
      <Block size={[width + 2 * frame + 0.02, SILL.height, SILL.depth]} at={[0, panelBottom - SILL.height / 2 + 0.004, PANEL.face - SILL.depth / 2 + 0.01]} color={colour.steel} bevel={0.012} />

      {/* The panel, tipped back about its foot: its back, ribs and the girder behind, the frame, the cap rail and the poster. */}
      <group position={[0, panelBottom, PANEL.face]} rotation={[-PANEL.tilt, 0, 0]}>
        <Block size={[width + 2 * frame, panelH, PANEL.depth]} at={[0, panelH / 2, -PANEL.depth / 2]} color={colour.panel} bevel={0.014} />
        {Array.from({ length: PANEL.ribs }, (_, k) => (
          <Block
            key={k}
            size={[0.04, panelH - 0.04, 0.03]}
            at={[-width / 2 + (k + 0.5) * (width / PANEL.ribs), panelH / 2, -PANEL.depth - 0.014]}
            color={colour.steel}
            bevel={0.008}
          />
        ))}
        <Truss
          height={2 * POSTS.x + 0.2}
          width={GIRDER.width}
          sides={3}
          bays={GIRDER.bays}
          at={[-POSTS.x - 0.1, girderLocal.y, girderLocal.z]}
          rot={[0, 0, -Math.PI / 2]}
          color={colour.steel}
          outline={false}
        />
        {[-1, 1].map((s) => (
          <Block key={`h${s}`} size={[width + 2 * frame, frame - 0.002, 0.03]} at={[0, panelH / 2 + s * (posterH / 2 + frame / 2 + 0.001), 0.012]} color={colour.frame} bevel={0.008} />
        ))}
        {[-1, 1].map((s) => (
          <Block key={`v${s}`} size={[frame - 0.002, posterH, 0.03]} at={[s * (width / 2 + frame / 2 + 0.001), panelH / 2, 0.012]} color={colour.frame} bevel={0.008} />
        ))}
        <Block size={[width + 2 * frame + CAP_RAIL.past, cap, capRail.depth]} at={[0, panelH + cap / 2 - CAP_RAIL.seat, capRail.z]} color={colour.steel} bevel={0.01} />
        {place.poster ? <Picture src={place.poster} size={[width, posterH]} at={[0, panelH / 2, POSTER.lift]} lit /> : null}
      </group>

      {/* The catwalk: a grating on brackets hung from the sill, a rail along its front, the floodlights on its edge. */}
      <Block
        size={[width + WALK_BARS.wider, CATWALK.floor, CATWALK.reach + 2 * WALK_BARS.back]}
        at={[0, walkY, PANEL.face + CATWALK.reach / 2 - WALK_BARS.back]}
        color={colour.grate}
        bevel={0.006}
      />
      {CATWALK.brackets.map((x) => {
        const hang: Vec3 = [x, panelBottom - SILL.height + 0.01, PANEL.face - WALK_BARS.hang]
        return (
          <group key={x}>
            <Rod sides={4} from={hang} to={[x, walkY, PANEL.face - WALK_BARS.hang]} radius={0.01} color={colour.steel} />
            <Rod sides={4} from={hang} to={[x, walkY - WALK_BARS.under, walkFront - WALK_BARS.front]} radius={0.008} color={colour.steel} outline={false} />
          </group>
        )
      })}
      {Array.from({ length: CATWALK.posts }, (_, k) => {
        const span = width + 2 * (WALK_BARS.past - WALK_BARS.rail)
        const x = -span / 2 + (k * span) / (CATWALK.posts - 1)
        return <Rod sides={4} key={k} from={[x, walkY, walkFront - WALK_BARS.rail]} to={[x, walkY + CATWALK.rail, walkFront - WALK_BARS.rail]} radius={0.008} color={colour.steel} outline={false} />
      })}
      <Rod
        sides={4}
        from={[-width / 2 - WALK_BARS.past, walkY + CATWALK.rail, walkFront - WALK_BARS.rail]}
        to={[width / 2 + WALK_BARS.past, walkY + CATWALK.rail, walkFront - WALK_BARS.rail]}
        radius={0.009}
        color={colour.steel}
      />
      {LAMPS.xs.map((x) => (
        <Floodlight key={x} at={[x, walkY + CATWALK.floor / 2, walkFront - 0.04]} colour={colour} />
      ))}
      {/* A pot of paste on the catwalk, left from the last poster. */}
      <Turned profile={PASTE_POT.profile} at={[PASTE_POT.x, walkY + CATWALK.floor / 2, PANEL.face + PASTE_POT.out]} color={colour.paint} />

      {/* The ladder up to the catwalk's right end. */}
      {[-1, 1].map((s) => (
        <Rod sides={4} key={s} from={[LADDER.x + (s * LADDER.width) / 2, ground, LADDER.z]} to={[LADDER.x + (s * LADDER.width) / 2, walkY + CATWALK.rail, LADDER.z - LADDER.lean]} radius={0.009} color={colour.steel} />
      ))}
      {Array.from({ length: Math.floor((walkY - ground) / LADDER.rung) }, (_, k) => {
        const t = ((k + 1) * LADDER.rung) / (walkY + CATWALK.rail - ground)
        return (
          <Block key={k} size={[LADDER.width, 0.008, 0.008]} at={[LADDER.x, ground + t * (walkY + CATWALK.rail - ground), LADDER.z - LADDER.lean * t]} color={colour.steel} bevel={0.002} outline={false} />
        )
      })}

      {SHRUBS.map(([x, , z]) => (
        <Blob key={x} radius={0.08} squash={[1.1, 0.8, 1]} at={[x, ground + 0.05, z]} color={colour.green} />
      ))}
    </group>
  )
}

/** Its shadow covers the pad. */
Billboard.shadow = 0.95
/** The heights it follows: the cap rail stands at the place's height, the rest hanging from it. */
Billboard.heights = [1.5, 1.9] as const
