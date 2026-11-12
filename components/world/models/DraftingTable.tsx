'use client'

import { landmark } from '@/content/sky'
import { Blob, Block, Lit, Peak, Picture, Rod, Tube, Turned, blend, heightWithin, pictureAspect, pointing, type Point2, type Vec3 } from './kit'
import type { ModelProps } from './registry'

/** The design's height up the board; its width follows the picture's own shape (`place.posterSize`), never stretched. */
const ART = { height: 1.0 }
/**
 * The sheet of paper the design is drawn on, up the board's slope: where its
 * foot stands, the paper's margin round the drawing, and how far the drawing
 * stands in front of the paper; `top` is the board left above the sheet.
 */
const SHEET = { from: 0.13, margin: 0.025, thick: 0.004, lift: 0.005, top: 0.035 }
/**
 * The drawing board: the bare board left of and right of the sheet (`margin`),
 * its thickness, how far it is tilted up from flat (radians: well back toward
 * the camera, so the design shows from above too), where its front edge stands
 * (z), and how far its top edge stands under the place's height. Its width is
 * the sheet's and its margins, its length up the slope the sheet's and what is
 * left at its foot and top, so the design fills most of it.
 */
const BOARD = { margin: 0.1, thick: 0.04, tilt: 0.75, front: 0.42, under: 0.02 }
const SLOPE = SHEET.from + ART.height + 2 * SHEET.margin + SHEET.top
/** The tape at the sheet's corners. */
const TAPE: Vec3 = [0.05, 0.018, 0.003]
/** The parallel rule parked at the board's foot, under the sheet; its cable runs up the sides and across the top over pulleys. */
const RULE = { at: 0.075, width: 0.045, thick: 0.016, cable: 0.004, inset: 0.035 }
/** The pencil ledge along the board's front edge. */
const LEDGE = { height: 0.03, depth: 0.05 }
/**
 * The stand: two trestles `inset` in from the board's ends, the posts'
 * section, where they meet the board (a share of the way up its slope), the
 * foot bars and the stretcher.
 */
const STAND = { inset: 0.14, post: 0.06, frontAt: 0.19, backAt: 0.82, foot: [0.075, 0.05] as [number, number], stretcher: 0.16 }
/**
 * The lamp clamped to the board's top edge `clamp` in from its right end: its
 * arms meet at the elbow `rise` over the place's height, `out` past the clamp
 * and `back` behind it; the head hangs `head.past` the board's right edge,
 * `over` its face a share `along` of the way up its slope, its shade turned in
 * across the board onto the sheet's right edge a share `aim` up the slope, so
 * the bulb in its mouth shows from the front.
 */
const LAMP = { clamp: 0.09, rise: 0.08, out: 0.16, back: 0.14, head: { past: 0.07, along: 0.63, over: 0.2 }, aim: 0.44, arm: 0.011 }
const SHADE: Point2[] = [
  [0, 0],
  [0.075, 0],
  [0.07, 0.02],
  [0.032, 0.085],
  [0.02, 0.11],
  [0, 0.11],
]
/** Pencils lying on the ledge: across, length, colour's name. */
const LEDGE_PENCILS: Array<{ x: number; length: number; paint: Paint }> = [
  { x: -0.38, length: 0.18, paint: 'gold' },
  { x: -0.12, length: 0.15, paint: 'red' },
  { x: 0.42, length: 0.17, paint: 'teal' },
]
/** The taboret at the right: where it stands, its body, its drawers; the ink bottles, pencil cup and pencils on it. */
const TABORET = { at: [0.88, 0, 0.12] as Vec3, size: [0.28, 0.42, 0.28] as Vec3, drawers: 2 }
const INKS: Array<{ at: [number, number]; paint: Paint }> = [
  { at: [-0.06, 0.05], paint: 'indigo' },
  { at: [0.035, 0.07], paint: 'red' },
]
const INK_PROFILE: Point2[] = [
  [0, 0],
  [0.03, 0],
  [0.032, 0.04],
  [0.016, 0.055],
  [0.014, 0.07],
  [0, 0.07],
]
const CUP = { at: [0.05, -0.06] as [number, number], radius: 0.035, height: 0.08 }
const CUP_PENCILS: Array<{ lean: [number, number]; length: number; paint: Paint }> = [
  { lean: [-0.15, 0.08], length: 0.15, paint: 'gold' },
  { lean: [0.12, -0.05], length: 0.13, paint: 'teal' },
  { lean: [0.03, 0.16], length: 0.16, paint: 'red' },
]
/** The drafting stool at the left: where it stands, its seat, its post and its feet. */
const STOOL = { at: [-0.86, 0, 0.22] as Vec3, seat: 0.36, radius: 0.13, cushion: 0.045, post: 0.022, feet: 0.15 }

type Paint = 'gold' | 'red' | 'teal' | 'indigo'
type Colours = Record<'board' | 'edge' | 'stand' | 'paper' | 'tape' | 'rule' | 'cable' | 'metal' | 'wood' | 'taboret' | 'seat' | 'lead', string> & Record<Paint, string>

/** A hexagonal pencil from `from` (its end) to `to` (its point): painted body, bare wood cone, lead tip. */
function Pencil({ from, to, color, colour, outline = true }: { from: Vec3; to: Vec3; color: string; colour: Colours; outline?: boolean }) {
  const p = pointing(from, to)
  const r = 0.009
  const cone = Math.min(0.035, p.length * 0.22)
  return (
    <group position={p.at} rotation={p.rot}>
      <Tube height={p.length - cone} bottom={r} top={r} sides={6} bevel={0.002} color={color} outline={outline} />
      <Peak at={[0, p.length - cone - 0.001, 0]} radius={r} height={cone} sides={6} bevel={0.002} color={colour.wood} outline={false} />
    </group>
  )
}

/**
 * Tattoo designs: the owner's designs, drawn for the people who wore them, so
 * its landmark is a drafting table at landmark scale with one of her real
 * designs (`place.poster`, through `Picture`, at the image's own shape) taped
 * to its board. The board tilts well back toward the camera, so the design
 * shows from above as well, on a stand of two trestles; a parallel rule is
 * parked at its foot on its cable and pulleys, pencils lie on the ledge, and
 * an architect's lamp clamped to the board's top corner leans its shade over
 * it, lit at dusk. A taboret of drawers at the side carries ink bottles and a
 * cup of pencils; a drafting stool waits at the other side. The design is 1.0
 * up the slope (`ART`) and the board is cut to it, so the design fills most of
 * the board.
 *
 * Three levels of detail. The main mass: the board and its stand. The
 * secondary forms: the paper, the ledge, the rule and its cable, the
 * trestles' feet and stretcher, the lamp's arms, the taboret, the stool. The
 * props: pencils, tape, inks, the cup.
 *
 * The design faces +Z and up the board's tilt; nothing stands in front of its
 * face (its own test holds that: the lamp leans over the margin, the rule is
 * parked under the sheet). It is drawn at its own colours (`Picture`'s `lit`),
 * as the lamp over it shows it at night. Built from the top down: the board's
 * top edge stands just under the place's height, from 1.25 to 1.6
 * (`DraftingTable.heights`), the lamp's elbow a little over it; the stand's
 * posts take what the board leaves under it.
 */
export function DraftingTable({ place, district }: ModelProps) {
  const colour: Colours = {
    board: blend(landmark.stone, landmark.offWhite, 0.45),
    edge: landmark.wood,
    stand: blend(district.color, landmark.indigo, 0.45),
    paper: landmark.offWhite,
    tape: blend(landmark.sand, landmark.gold, 0.25),
    rule: blend(landmark.sky, landmark.offWhite, 0.35),
    cable: blend(landmark.slate, landmark.indigo, 0.3),
    metal: blend(landmark.slate, landmark.indigo, 0.35),
    wood: blend(landmark.wood, landmark.sand, 0.35),
    taboret: blend(district.color, landmark.cream, 0.4),
    seat: blend(district.color, landmark.indigo, 0.2),
    lead: landmark.indigo,
    gold: landmark.gold,
    red: landmark.red,
    teal: landmark.teal,
    indigo: blend(landmark.indigo, landmark.purple, 0.25),
  }

  const height = heightWithin(place.height, DraftingTable.heights)
  const [cos, sin] = [Math.cos(BOARD.tilt), Math.sin(BOARD.tilt)]
  const front = height - BOARD.under - SLOPE * sin
  // The board's own frame: x across, `along` up its slope from its front edge, `out` from its face. `tipped` gives where a point of it stands.
  const tipped = (x: number, along: number, out: number): Vec3 => [x, front + along * sin + out * cos, BOARD.front - along * cos + out * sin]
  // The design at its own shape, the sheet round it, the board round the sheet.
  const artH = ART.height
  const artW = artH * pictureAspect(place.posterSize)
  const sheet = { w: artW + 2 * SHEET.margin, h: artH + 2 * SHEET.margin }
  const boardW = sheet.w + 2 * BOARD.margin
  const standX = boardW / 2 - STAND.inset
  const artMid = SHEET.from + sheet.h / 2
  const cableX = boardW / 2 - RULE.inset
  const cableTop = SLOPE - 0.03
  const lampX = boardW / 2 - LAMP.clamp
  const elbow: Vec3 = [lampX + LAMP.out, height + LAMP.rise, tipped(0, SLOPE, 0)[2] - LAMP.back]
  const clamp = tipped(lampX, SLOPE, 0.02)
  const head = tipped(boardW / 2 + LAMP.head.past, LAMP.head.along * SLOPE, LAMP.head.over)
  const aim = tipped(sheet.w / 2, LAMP.aim * SLOPE, 0)
  // The shade's axis points away from the board, its mouth (y = 0) toward it.
  const shade = pointing(head, [2 * head[0] - aim[0], 2 * head[1] - aim[1], 2 * head[2] - aim[2]])

  return (
    <group>
      {/* The stand: on each side a front and a back post on a foot bar, a stretcher between the two sides. */}
      {[-1, 1].map((s) => {
        const [, yf, zf] = tipped(0, STAND.frontAt * SLOPE, -BOARD.thick)
        const [, yb, zb] = tipped(0, STAND.backAt * SLOPE, -BOARD.thick)
        const [fw, fh] = STAND.foot
        return (
          <group key={s} position={[s * standX, 0, 0]}>
            <Block size={[fw, fh, zf - zb + 0.24]} at={[0, fh / 2, (zf + zb) / 2]} color={colour.stand} bevel={0.014} />
            {[zf + 0.1, zb - 0.1].map((z) => (
              <Block key={z} size={[fw + 0.02, 0.018, 0.05]} at={[0, 0.006, z]} color={colour.metal} bevel={0.005} outline={false} />
            ))}
            <Block size={[STAND.post, yf - fh + 0.02, STAND.post]} at={[0, fh + (yf - fh + 0.02) / 2 - 0.004, zf]} color={colour.stand} bevel={0.012} />
            <Block size={[STAND.post, yb - fh + 0.02, STAND.post]} at={[0, fh + (yb - fh + 0.02) / 2 - 0.004, zb]} color={colour.stand} bevel={0.012} />
            {/* The tilt lock on the back post. */}
            <Blob radius={0.026} squash={[0.7, 1, 1]} at={[s * (STAND.post / 2 + 0.012), yb - 0.06, zb]} color={colour.metal} />
          </group>
        )
      })}
      {(() => {
        const [, , zf] = tipped(0, STAND.frontAt * SLOPE, 0)
        const [, , zb] = tipped(0, STAND.backAt * SLOPE, 0)
        return <Block size={[2 * standX, 0.05, 0.05]} at={[0, STAND.stretcher, (zf + zb) / 2]} color={colour.stand} bevel={0.012} />
      })()}

      {/* The board, tilted up toward the back, and all that lies on it. */}
      <group position={[0, front, BOARD.front]} rotation={[-(Math.PI / 2 - BOARD.tilt), 0, 0]}>
        <Block size={[boardW, SLOPE, BOARD.thick]} at={[0, SLOPE / 2, -BOARD.thick / 2]} color={colour.board} bevel={0.012} />
        {/* A wooden edge along its ends, and the pencil ledge along its foot. */}
        {[-1, 1].map((s) => (
          <Block key={s} size={[0.03, SLOPE, BOARD.thick + 0.006]} at={[s * (boardW / 2 + 0.013), SLOPE / 2, -BOARD.thick / 2]} color={colour.edge} bevel={0.008} />
        ))}
        <Block size={[boardW + 0.08, LEDGE.depth, LEDGE.height]} at={[0, -LEDGE.depth / 2 + 0.012, LEDGE.height / 2 - 0.022]} color={colour.edge} bevel={0.01} />
        {LEDGE_PENCILS.map(({ x, length, paint }) => (
          <Pencil key={x} from={[x - length / 2, -0.012, LEDGE.height - 0.012]} to={[x + length / 2, -0.012, LEDGE.height - 0.012]} color={colour[paint]} colour={colour} />
        ))}

        {/* The sheet, taped at its corners, and the design on it. */}
        <Block size={[sheet.w, sheet.h, SHEET.thick]} at={[0, artMid, SHEET.thick / 2 - 0.001]} color={colour.paper} bevel={0.0015} outline={false} />
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sy) => (
            <Block key={`${sx}${sy}`} size={TAPE} at={[(sx * sheet.w) / 2, artMid + (sy * sheet.h) / 2, SHEET.thick + TAPE[2] / 2 - 0.0015]} rot={[0, 0, sx * sy * (Math.PI / 4)]} color={colour.tape} bevel={0.001} outline={false} />
          )),
        )}
        {place.poster ? <Picture src={place.poster} size={[artW, artH]} at={[0, artMid, SHEET.thick + SHEET.lift]} lit /> : null}

        {/* The parallel rule on its cable: up both sides and across the top, over a pulley at each corner. */}
        <Block size={[2 * cableX - 0.02, RULE.width, RULE.thick]} at={[0, RULE.at, RULE.thick / 2]} color={colour.rule} bevel={0.005} />
        <Block size={[2 * cableX - 0.02, 0.008, 0.006]} at={[0, RULE.at + RULE.width / 2 - 0.004, RULE.thick + 0.002]} color={colour.cable} bevel={0.002} outline={false} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <Block size={[0.04, RULE.width + 0.012, RULE.thick + 0.008]} at={[s * cableX, RULE.at, RULE.thick / 2 + 0.002]} color={colour.metal} bevel={0.006} />
            <Rod from={[s * cableX, 0.03, 0.008]} to={[s * cableX, cableTop, 0.008]} radius={RULE.cable} sides={4} color={colour.cable} outline={false} />
            {[0.03, cableTop].map((y) => (
              <Block key={y} size={[0.03, 0.03, 0.014]} at={[s * cableX, y, 0.007]} color={colour.metal} bevel={0.008} outline={false} />
            ))}
          </group>
        ))}
        <Rod from={[-cableX, cableTop, 0.008]} to={[cableX, cableTop, 0.008]} radius={RULE.cable} sides={4} color={colour.cable} outline={false} />
      </group>

      {/* The lamp: a clamp on the board's top edge, two arms meeting at the elbow, the shade leaning over the right margin. */}
      <Block size={[0.06, 0.06, 0.07]} at={clamp} rot={[-(Math.PI / 2 - BOARD.tilt), 0, 0]} color={colour.metal} bevel={0.012} />
      <Rod from={clamp} to={elbow} radius={LAMP.arm} sides={8} color={colour.metal} />
      <Rod from={elbow} to={head} radius={LAMP.arm} sides={8} color={colour.metal} />
      <Blob radius={0.022} at={elbow} color={colour.seat} />
      <group position={shade.at} rotation={shade.rot}>
        <Turned profile={SHADE} color={colour.seat} />
        {/* The bulb, standing a little out of the shade's mouth so its glow shows from the side. */}
        <Lit size={[0.07, 0.07, 0.07]} at={[0, -0.028, 0]} color={landmark.lit} outline={false} />
      </group>

      {/* The taboret: drawers, knobs, inks, a cup of pencils. */}
      <group position={TABORET.at}>
        <Block size={TABORET.size} at={[0, TABORET.size[1] / 2, 0]} color={colour.taboret} bevel={0.016} />
        {Array.from({ length: TABORET.drawers }, (_, k) => {
          const h = (TABORET.size[1] - 0.08) / TABORET.drawers
          const y = 0.05 + h * (k + 0.5)
          return (
            <group key={k}>
              <Block size={[TABORET.size[0] - 0.05, h - 0.025, 0.014]} at={[0, y, TABORET.size[2] / 2 + 0.004]} color={colour.taboret} bevel={0.006} />
              <Blob radius={0.012} at={[0, y, TABORET.size[2] / 2 + 0.016]} color={colour.metal} />
            </group>
          )
        })}
        <group position={[0, TABORET.size[1], 0]}>
          {INKS.map(({ at: [x, z], paint }) => (
            <group key={paint} position={[x, -0.002, z]}>
              <Turned profile={INK_PROFILE} sides={10} color={colour[paint]} />
              <Block size={[0.032, 0.022, 0.032]} at={[0, 0.077, 0]} color={colour.lead} bevel={0.007} outline={false} />
            </group>
          ))}
          <Tube at={[CUP.at[0], -0.002, CUP.at[1]]} height={CUP.height} bottom={CUP.radius * 0.9} top={CUP.radius} bevel={0.008} color={colour.metal} />
          {CUP_PENCILS.map(({ lean: [dx, dz], length, paint }) => (
            <Pencil
              key={paint}
              from={[CUP.at[0], 0.02, CUP.at[1]]}
              to={[CUP.at[0] + dx * length, 0.02 + length, CUP.at[1] + dz * length]}
              color={colour[paint]}
              colour={colour}
              outline={false}
            />
          ))}
        </group>
      </group>

      {/* The drafting stool: a cushioned seat on a post, four feet. */}
      <group position={STOOL.at}>
        {[0, 1, 2, 3].map((k) => {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4
          return <Block key={k} size={[0.026, 0.022, STOOL.feet]} at={[(Math.sin(a) * STOOL.feet) / 2, 0.011, (Math.cos(a) * STOOL.feet) / 2]} rot={[0, a, 0]} color={colour.stand} bevel={0.007} />
        })}
        <Tube at={[0, 0.02, 0]} height={STOOL.seat - STOOL.cushion} bottom={STOOL.post} top={STOOL.post} sides={8} bevel={0.006} color={colour.metal} />
        <Tube at={[0, STOOL.seat - STOOL.cushion - 0.004, 0]} height={STOOL.cushion} bottom={STOOL.radius * 0.94} top={STOOL.radius} bevel={0.02} color={colour.seat} />
      </group>
    </group>
  )
}

/** Its shadow covers the stand, the taboret and the stool. */
DraftingTable.shadow = 1.05
/** The heights it follows: the board's top edge stands just under the place's height, the stand taking what the board leaves. */
DraftingTable.heights = [1.25, 1.6] as const
