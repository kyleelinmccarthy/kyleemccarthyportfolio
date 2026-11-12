'use client'

import { Block } from './kit'

/**
 * The shell of a two-storey shop on its paving, shared by the landmarks that
 * are shops on a street (the Studio, the Tattoo shop): the paving, the plinth
 * course round the shop's foot, its walls, the band between the storeys, the
 * cornice capping the walls and the parapet round the flat roof, with a
 * coping along its front and back runs if it has one.
 *
 * Not a kit part: every measure here is a choice those shops make together
 * (a shop's proportions, not a general shape), and each passes its own. What
 * stands on the shell (windows, the door, a sign, a marquee) stays with the
 * shop.
 */

/** The cornice capping the walls: how tall it is and how far it reaches out past them. */
export const CORNICE = { height: 0.05, reach: 0.03 }

/** The paving a shop stands on: its width, depth, where its middle stands, and its height (the shop's floor). */
export type Paving = { width: number; depth: number; z: number; height: number }
/** The shop: its width, depth, where its middle stands, and its plinth course's height. */
export type Building = { width: number; depth: number; z: number; plinth: number }
/** The ground floor's share of the walls, never less than `least` tall; the band between the storeys. */
export type Storey = { share: number; least: number; band: number }
/** The parapet round the roof: its height, thickness, the bevel on its runs and, if it has one, the coping's height. */
export type Parapet = { height: number; thick: number; bevel: number; coping?: number }

/** Where a shop's ground floor ends: a share of the walls from `floor` to `wallTop`, never less than `least`. */
export function groundTopOf(floor: number, wallTop: number, storey: Storey): number {
  return floor + Math.max(storey.least, (wallTop - floor) * storey.share)
}

export type ShellColours = { paving: string; plinth: string; wall: string; band: string; cornice: string; parapet: string; coping?: string }

/**
 * The shell: the paving, the plinth and the walls up to `wallTop`, the band
 * at `groundTop`, the cornice on the walls and the parapet on the cornice.
 */
export function ShopShell({
  paving,
  building,
  storey,
  parapet,
  wallTop,
  groundTop,
  colour,
}: {
  paving: Paving
  building: Building
  storey: Storey
  parapet: Parapet
  wallTop: number
  groundTop: number
  colour: ShellColours
}) {
  const floor = paving.height
  const walls = wallTop - floor
  const { width, depth, z } = building
  const parapetY = wallTop + CORNICE.height + parapet.height / 2 - 0.006
  const runZ = depth / 2 + CORNICE.reach - 0.01 - parapet.thick / 2
  const runX = width / 2 + CORNICE.reach - 0.01 - parapet.thick / 2
  return (
    <group>
      <Block size={[paving.width, floor, paving.depth]} at={[0, floor / 2, paving.z]} color={colour.paving} bevel={0.016} />
      <Block size={[width + 0.04, building.plinth, depth + 0.04]} at={[0, floor + building.plinth / 2 - 0.004, z]} color={colour.plinth} bevel={0.014} />
      <Block size={[width, walls + 0.004, depth]} at={[0, floor + walls / 2 - 0.002, z]} color={colour.wall} bevel={0.024} />
      <Block size={[width + 0.03, storey.band, depth + 0.03]} at={[0, groundTop, z]} color={colour.band} bevel={0.01} />
      <Block size={[width + 2 * CORNICE.reach, CORNICE.height, depth + 2 * CORNICE.reach]} at={[0, wallTop + CORNICE.height / 2 - 0.004, z]} color={colour.cornice} bevel={0.014} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Block size={[width + 2 * CORNICE.reach - 0.02, parapet.height, parapet.thick]} at={[0, parapetY, z + s * runZ]} color={colour.parapet} bevel={parapet.bevel} />
          <Block size={[parapet.thick, parapet.height, depth + 2 * CORNICE.reach - 0.02 - 2 * parapet.thick]} at={[s * runX, parapetY, z]} color={colour.parapet} bevel={parapet.bevel} />
          {parapet.coping ? (
            <Block
              size={[width + 2 * CORNICE.reach, parapet.coping, parapet.thick + 0.016]}
              at={[0, wallTop + CORNICE.height + parapet.height - 0.006 + parapet.coping / 2 - 0.004, z + s * runZ]}
              color={colour.coping ?? colour.parapet}
              bevel={0.006}
            />
          ) : null}
        </group>
      ))}
    </group>
  )
}
