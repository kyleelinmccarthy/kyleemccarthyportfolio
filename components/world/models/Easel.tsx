'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Extruded, Lit, Peak, Picture, Rod, Tube, Turned, blend, ellipseOutline, heightWithin, pictureAspect, pointing, type Point2, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/**
 * The canvas: the painting's width, the primed canvas round it (`rim`, also
 * how far it stands clear of the tray and the clamp), its thickness, and how
 * far the painting stands in front of its face.
 */
const CANVAS = { width: 1.36, rim: 0.03, thick: 0.05, lift: 0.004 }
/** How far the easel leans back from upright (radians): the painting turns a little up to the camera and the district's view above. */
const LEAN = 0.2
/**
 * The mast: its section, where its foot stands (z), the finial on top, how
 * far its top stands over the canvas, the peg holes down its front under the
 * tray, and their spacing.
 */
const MAST = { width: 0.07, depth: 0.045, z: -0.05, finial: 0.045, above: 0.15, holes: 3, pitch: 0.09 }
/** The front legs: how far apart their feet stand, where they meet the mast (below its top), how far behind it they run, and their turned section. */
const LEGS = { spread: 0.5, top: 0.17, behind: 0.035, radius: 0.026, stretcher: 0.14, sides: 10 }
/** The back leg: where its foot stands behind the mast, and the stay from it to the mast. */
const BACK_LEG = { reach: 0.6, stay: 0.33 }
/** The tray the canvas stands on: its width, depth, thickness, the lip along its front (kept under the canvas's rim) and the pegs under it. */
const TRAY = { width: 1.62, depth: 0.13, thick: 0.03, lip: 0.022, peg: 0.012 }
/** The clamp holding the canvas's top: its block on the mast and the lip over the canvas's rim. */
const CLAMP = { width: 0.12, height: 0.045, lip: 0.026 }
/** The picture lamp over the canvas: how far out its arm reaches, how high over the canvas it hangs, its shade and its tilt toward the painting. */
const LAMP = { out: 0.17, over: 0.07, shade: [0.42, 0.04, 0.075] as Vec3, tilt: 0.55, tube: 0.02 }
/** The brushes lying on the tray, along its front: across, how long, the handle's radius and its colour's name. */
const TRAY_BRUSHES: Array<{ x: number; length: number; radius: number; paint: Paint }> = [
  { x: -0.42, length: 0.26, radius: 0.009, paint: 'red' },
  { x: -0.12, length: 0.22, radius: 0.008, paint: 'blue' },
  { x: 0.3, length: 0.28, radius: 0.0095, paint: 'wood' },
]
/** The paint pots at the tray's ends, beyond the canvas: their profile and paint. */
const POT_PROFILE: Point2[] = [
  [0, 0],
  [0.034, 0],
  [0.036, 0.055],
  [0.031, 0.06],
  [0, 0.06],
]
const POTS: Array<{ side: number; paint: Paint }> = [
  { side: -1, paint: 'teal' },
  { side: 1, paint: 'gold' },
]
/** The stool at the easel's side: where it stands, its seat, its legs' splay; the palette, its dabs of paint and the jar of brushes on it. */
const STOOL = { at: [0.92, 0, 0.2] as Vec3, seat: 0.4, radius: 0.16, top: 0.035, splay: 0.05 }
const PALETTE = { at: [-0.04, 0.05] as [number, number], size: [0.12, 0.085] as [number, number], notch: 0.45, turn: 0.5 }
const DABS: Array<{ at: [number, number]; paint: Paint }> = [
  { at: [-0.12, 0.04], paint: 'red' },
  { at: [-0.08, 0.1], paint: 'gold' },
  { at: [0.0, 0.11], paint: 'teal' },
  { at: [0.05, 0.07], paint: 'purple' },
  { at: [-0.11, -0.02], paint: 'blue' },
]
const JAR = { at: [0.07, -0.06] as [number, number], profile: [[0, 0], [0.035, 0], [0.038, 0.09], [0.033, 0.095], [0, 0.095]] as Point2[] }
const JAR_BRUSHES: Array<{ lean: [number, number]; length: number; paint: Paint }> = [
  { lean: [-0.12, 0.05], length: 0.2, paint: 'wood' },
  { lean: [0.1, -0.04], length: 0.17, paint: 'red' },
  { lean: [0.02, 0.13], length: 0.22, paint: 'blue' },
]
/** The drop cloth under the easel (thick enough to stand over the contact shadow's middle), and the splashes of paint on it. */
const CLOTH = { width: 1.56, depth: 1.04, z: -0.24, thick: 0.026 }
const SPLASHES: Array<{ at: [number, number]; size: [number, number]; paint: Paint }> = [
  { at: [-0.5, 0.12], size: [0.07, 0.045], paint: 'purple' },
  { at: [0.36, 0.2], size: [0.05, 0.035], paint: 'red' },
  { at: [-0.18, -0.55], size: [0.06, 0.04], paint: 'teal' },
]

type Paint = 'red' | 'blue' | 'teal' | 'gold' | 'purple' | 'wood'
type Colours = Record<'wood' | 'deep' | 'canvas' | 'metal' | 'cloth' | 'stool' | 'ferrule' | 'dark', string> & Record<Paint, string>

/** A turned leg from its foot to its top: a ferrule at the foot, swelling a little above it and tapering to the top. */
function TurnedLeg({ foot, top, colour }: { foot: Vec3; top: Vec3; colour: Colours }) {
  const leg = pointing(foot, top)
  const r = LEGS.radius
  const L = leg.length
  return (
    <Turned
      at={leg.at}
      rot={leg.rot}
      profile={[
        [0, 0],
        [r * 0.85, 0],
        [r * 1.15, 0.07],
        [r, 0.12],
        [r * 0.6, L],
        [0, L],
      ]}
      sides={LEGS.sides}
      color={colour.wood}
    />
  )
}

/** A brush lying along x, its middle at `at`: a handle, a metal ferrule and a bristle tip dipped in paint. */
function LyingBrush({ at, length, radius, handle, tip, colour }: { at: Vec3; length: number; radius: number; handle: string; tip: string; colour: Colours }) {
  const ferrule = length * 0.16
  const bristles = length * 0.14
  const handleL = length - ferrule - bristles
  return (
    <group position={at} rotation={[0, 0, -Math.PI / 2]}>
      <Tube at={[0, -length / 2, 0]} height={handleL} bottom={radius * 0.7} top={radius} sides={6} bevel={radius * 0.3} color={handle} />
      <Block size={[radius * 2.1, ferrule + 0.002, radius * 2.1]} at={[0, -length / 2 + handleL + ferrule / 2 - 0.001, 0]} color={colour.ferrule} bevel={radius * 0.4} outline={false} />
      <Peak at={[0, -length / 2 + handleL + ferrule - 0.002, 0]} radius={radius * 1.05} height={bristles} sides={6} bevel={radius * 0.3} color={tip} outline={false} />
    </group>
  )
}

/**
 * Art: the owner's paintings, so its landmark is a painter's easel at
 * landmark scale holding one of her real pieces (`place.poster`, through
 * `Picture`, at the image's own shape). A tall three-legged studio easel in
 * warm wood: a mast with a turned finial, two turned front legs splaying from
 * it and a back leg with a stay, a tray on pegs carrying brushes and two paint
 * pots, a clamp holding the canvas's top, and a picture lamp over it that
 * comes on at dusk. A stool at its side carries a palette with dabs of paint
 * and a jar of brushes; a drop cloth splashed with paint lies under it all.
 *
 * Three levels of detail. The main mass: the canvas and the easel's frame.
 * The secondary forms: the tray and its lip, the clamp, the stretcher bars at
 * the canvas's back, the stretcher between the legs and the stay, the stool.
 * The props: brushes, pots, the palette and its paint, the jar, the lamp, the
 * peg holes and pegs, the splashes.
 *
 * The painting faces +Z, leaning back with the easel (`LEAN`) so it turns up
 * a little to the camera; nothing stands in front of its face (its own test
 * holds that), and it is drawn at its own colours (`Picture`'s `lit`), as the
 * lamp over it would show it at night. Built from the top down: the finial
 * stands at the place's height, from 1.4 to 1.8 (`Easel.heights`); the
 * canvas hangs from the clamp under the mast's top, and the tray, the pegs and
 * where the legs meet the mast follow it.
 */
export function Easel({ place, district }: ModelProps) {
  const colour: Colours = {
    wood: landmark.wood,
    deep: blend(landmark.wood, landmark.indigo, 0.3),
    canvas: landmark.cream,
    metal: blend(landmark.slate, landmark.indigo, 0.35),
    cloth: blend(landmark.sand, landmark.offWhite, 0.45),
    stool: blend(district.color, landmark.cream, 0.4),
    ferrule: blend(landmark.slate, landmark.stone, 0.4),
    dark: blend(landmark.indigo, landmark.wood, 0.15),
    red: landmark.red,
    blue: landmark.blue,
    teal: landmark.teal,
    gold: landmark.gold,
    purple: district.color,
  }

  const height = heightWithin(place.height, Easel.heights)
  const [cos, sin] = [Math.cos(LEAN), Math.sin(LEAN)]
  // Everything on the mast is built upright in the mast's own frame (y up it from its foot, z out of its front) and leans back
  // with it; `lean` gives where a point of that frame stands.
  const lean = (x: number, y: number, z: number): Vec3 => [x, y * cos + z * sin, MAST.z - y * sin + z * cos]
  const mast = (height - MAST.finial) / cos
  // The painting at its own shape (`place.posterSize`), never stretched.
  const artH = CANVAS.width / pictureAspect(place.posterSize)
  const canvas = { w: CANVAS.width + 2 * CANVAS.rim, h: artH + 2 * CANVAS.rim }
  const canvasTop = mast - MAST.above
  const trayTop = canvasTop - canvas.h
  const canvasFront = MAST.depth / 2 + CANVAS.thick
  const legTop = mast - LEGS.top
  const feet = { y: -0.004, z: MAST.z - LEGS.behind }
  const front = [-1, 1].map((s) => ({ foot: [s * LEGS.spread, feet.y, feet.z] as Vec3, top: lean(s * MAST.width * 0.6, legTop, -LEGS.behind) }))
  const along = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  const backTop = lean(0, legTop + 0.02, -MAST.depth / 2 - 0.02)
  const backFoot: Vec3 = [0, feet.y, MAST.z - BACK_LEG.reach]
  // Where the front legs pass the tray, its pegs go through them.
  const pegT = trayTop / legTop
  const stoolTop = STOOL.seat

  return (
    <group>
      {/* The drop cloth, and the paint splashed on it. */}
      <Block size={[CLOTH.width, CLOTH.thick, CLOTH.depth]} at={[0, CLOTH.thick / 2, CLOTH.z]} color={colour.cloth} bevel={0.005} />
      {SPLASHES.map(({ at: [x, z], size: [w, d], paint }) => (
        <Extruded key={`${x}${z}`} shape={ellipseOutline(w, d, 14)} depth={0.004} at={[x, CLOTH.thick + 0.001, z]} rot={[-Math.PI / 2, 0, 0]} color={colour[paint]} bevel={0.0015} outline={false} />
      ))}

      {/* The legs: two turned front legs from the mast's head, a stretcher between them, the back leg and its stay to the mast. */}
      {front.map(({ foot, top }) => (
        <TurnedLeg key={foot[0]} foot={foot} top={top} colour={colour} />
      ))}
      <Rod from={along(front[0].foot, front[0].top, LEGS.stretcher)} to={along(front[1].foot, front[1].top, LEGS.stretcher)} radius={0.016} sides={6} color={colour.deep} />
      <TurnedLeg foot={backFoot} top={backTop} colour={colour} />
      <Rod from={lean(0, BACK_LEG.stay, -MAST.depth / 2)} to={along(backFoot, backTop, BACK_LEG.stay / legTop)} radius={0.012} sides={6} color={colour.deep} />
      {/* The pegs through the front legs that carry the tray. */}
      {front.map(({ foot, top }) => {
        const p = along(foot, top, pegT)
        return <Rod key={foot[0]} from={[p[0], p[1] - 0.02, p[2] - 0.03]} to={[p[0], p[1] - 0.02 - 0.04 * sin, p[2] + 0.12]} radius={TRAY.peg} sides={6} color={colour.deep} outline={false} />
      })}

      {/* The mast and all it carries, leaning back. */}
      <group position={[0, 0, MAST.z]} rotation={[-LEAN, 0, 0]}>
        <Block size={[MAST.width, mast, MAST.depth]} at={[0, mast / 2, 0]} color={colour.wood} bevel={0.012} />
        <Turned profile={[[0, 0], [0.03, 0], [0.032, 0.012], [0.02, 0.02], [0.03, 0.032], [0.016, MAST.finial], [0, MAST.finial]]} at={[0, mast - 0.002, 0]} color={colour.deep} />
        {Array.from({ length: MAST.holes }, (_, k) => (
          <Block key={k} size={[0.02, 0.02, 0.006]} at={[0, trayTop - TRAY.thick - (k + 1) * MAST.pitch, MAST.depth / 2 - 0.001]} color={colour.dark} bevel={0.002} outline={false} />
        ))}

        {/* The tray, its lip, a bracket under it on the mast, and what lies on it. */}
        <Block size={[TRAY.width, TRAY.thick, TRAY.depth]} at={[0, trayTop - TRAY.thick / 2, MAST.depth / 2 + TRAY.depth / 2 - 0.01]} color={colour.wood} bevel={0.008} />
        <Block size={[TRAY.width, TRAY.lip, 0.018]} at={[0, trayTop + TRAY.lip / 2 - 0.004, MAST.depth / 2 + TRAY.depth - 0.019]} color={colour.deep} bevel={0.006} />
        <Block size={[MAST.width + 0.02, 0.07, 0.06]} at={[0, trayTop - TRAY.thick - 0.035, MAST.depth / 2 + 0.028]} color={colour.deep} bevel={0.01} />
        {TRAY_BRUSHES.map(({ x, length, radius, paint }) => (
          <LyingBrush
            key={x}
            at={[x, trayTop + radius - 0.001, canvasFront + 0.035]}
            length={length}
            radius={radius}
            handle={paint === 'wood' ? colour.deep : colour[paint]}
            tip={paint === 'wood' ? colour.purple : colour.wood}
            colour={colour}
          />
        ))}
        {POTS.map(({ side, paint }) => (
          <group key={side} position={[side * (TRAY.width / 2 - 0.05), trayTop - 0.002, MAST.depth / 2 + TRAY.depth / 2 - 0.005]}>
            <Turned profile={POT_PROFILE} color={colour.ferrule} />
            <Blob radius={0.03} squash={[1, 0.3, 1]} at={[0, 0.058, 0]} color={colour[paint]} outline={false} />
          </group>
        ))}

        {/* The canvas: primed canvas round the painting, stretcher bars across its back, and the painting itself. */}
        <Block size={[canvas.w, canvas.h, CANVAS.thick]} at={[0, trayTop + canvas.h / 2, MAST.depth / 2 + CANVAS.thick / 2]} color={colour.canvas} bevel={0.01} />
        <Block size={[canvas.w - 0.06, 0.05, 0.02]} at={[0, trayTop + canvas.h * 0.55, MAST.depth / 2 - 0.006]} color={colour.deep} bevel={0.006} outline={false} />
        {[-1, 1].map((s) => (
          <Block key={s} size={[0.05, canvas.h - 0.06, 0.02]} at={[s * (canvas.w / 2 - 0.04), trayTop + canvas.h / 2, MAST.depth / 2 - 0.006]} color={colour.deep} bevel={0.006} outline={false} />
        ))}
        {place.poster ? <Picture src={place.poster} size={[CANVAS.width, artH]} at={[0, trayTop + canvas.h / 2, canvasFront + CANVAS.lift]} lit /> : null}

        {/* The clamp on the canvas's top, with its lip over the rim and a wing screw at the back. */}
        <Block size={[CLAMP.width, CLAMP.height, canvasFront + MAST.depth / 2 + 0.016]} at={[0, canvasTop + CLAMP.height / 2 - 0.004, (canvasFront - MAST.depth / 2 + 0.016) / 2]} color={colour.deep} bevel={0.01} />
        <Block size={[CLAMP.width - 0.02, CLAMP.lip, 0.014]} at={[0, canvasTop - CLAMP.lip / 2 + 0.004, canvasFront + 0.008]} color={colour.deep} bevel={0.005} outline={false} />
        <Blob radius={0.022} squash={[1.4, 1, 0.6]} at={[0, canvasTop + CLAMP.height / 2, -MAST.depth / 2 - 0.016]} color={colour.metal} />

        {/* The picture lamp: an arm from the mast's head out over the canvas, its shade turned down onto the painting. */}
        <Rod from={[0, mast - 0.04, MAST.depth / 2]} to={[0, canvasTop + LAMP.over + 0.02, canvasFront + LAMP.out]} radius={0.009} sides={8} color={colour.metal} />
        <group position={[0, canvasTop + LAMP.over, canvasFront + LAMP.out]} rotation={[LAMP.tilt, 0, 0]}>
          <Block size={LAMP.shade} color={colour.metal} bevel={0.012} />
          {/* Its glowing tube along the shade's lower front lip, where it shows from the front. */}
          <Lit size={[LAMP.shade[0] - 0.04, LAMP.tube, LAMP.tube]} at={[0, -LAMP.shade[1] / 2, LAMP.shade[2] / 2 - LAMP.tube / 2]} color={landmark.lit} outline={false} />
        </group>
      </group>

      {/* The stool at the side: a seat on three splayed legs, the palette and its paint, a jar of brushes. */}
      <group position={STOOL.at}>
        {[0, 1, 2].map((k) => {
          const a = (k / 3) * Math.PI * 2 + 0.3
          const top: Vec3 = [Math.sin(a) * STOOL.radius * 0.6, stoolTop - STOOL.top + 0.004, Math.cos(a) * STOOL.radius * 0.6]
          const foot: Vec3 = [Math.sin(a) * (STOOL.radius * 0.6 + STOOL.splay), -0.004, Math.cos(a) * (STOOL.radius * 0.6 + STOOL.splay)]
          return <Rod key={k} from={foot} to={top} radius={0.016} sides={6} color={colour.deep} />
        })}
        <Tube at={[0, stoolTop - STOOL.top, 0]} height={STOOL.top} bottom={STOOL.radius} top={STOOL.radius} bevel={0.012} color={colour.stool} />
        <group position={[0, stoolTop, 0]}>
          <Extruded
            shape={ellipseOutline(PALETTE.size[0], PALETTE.size[1], 22, PALETTE.notch)}
            depth={0.012}
            at={[PALETTE.at[0], 0.006, PALETTE.at[1]]}
            rot={[-Math.PI / 2, 0, PALETTE.turn]}
            color={colour.wood}
            bevel={0.003}
          />
          {DABS.map(({ at: [x, z], paint }) => (
            <Blob key={paint} radius={0.017} squash={[1, 0.4, 1]} at={[PALETTE.at[0] + x * 0.7, 0.014, PALETTE.at[1] + z * 0.6 - 0.03]} color={colour[paint]} outline={false} />
          ))}
          <Turned profile={JAR.profile} at={[JAR.at[0], -0.002, JAR.at[1]]} color={colour.ferrule} />
          {JAR_BRUSHES.map(({ lean: [dx, dz], length, paint }) => (
            <Rod key={paint} from={[JAR.at[0], 0.02, JAR.at[1]]} to={[JAR.at[0] + dx * length, 0.02 + length, JAR.at[1] + dz * length]} radius={0.007} sides={4} color={paint === 'wood' ? colour.deep : colour[paint]} outline={false} />
          ))}
        </group>
      </group>
    </group>
  )
}

/** Its shadow covers the drop cloth and the stool. */
Easel.shadow = 1.05
/** The heights it follows: the finial stands at the place's height, the canvas, the tray and the legs' head hanging from it. */
Easel.heights = [1.4, 1.8] as const
