import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ReactElement } from 'react'
import { Box3 } from 'three'
import { landmark } from '@/content/sky'
import {
  Beam,
  Blob,
  Block,
  Brickwork,
  ContactShadow,
  Rain,
  RainCloud,
  Tufted,
  Die,
  Door,
  Extruded,
  SnowPeak,
  Flag,
  Flame,
  Glass,
  Lit,
  Peak,
  Picture,
  Ring,
  Swept,
  Rod,
  Roof,
  Signal,
  StreetLamp,
  Striped,
  Truss,
  Rounded,
  Tube,
  Turned,
  Water,
  Window,
  ellipseOutline,
  starOutline,
} from '@/components/world/models/kit'
import { triangleCount } from '@/lib/world/kit'
import { mount } from './r3f'

/*
 * The modelling README's cost column, kept honest: each figure it states is
 * measured here from the part it names, built as the kit builds it, its line
 * included. A figure must be within `TOLERANCE` of what the part draws, and
 * must appear in that part's row of the table as it is written here.
 */

const TOLERANCE = 0.1
const C = landmark.coral

/** Each stated cost: the row's part (how the row begins), the figure as written, and a part that it describes. */
const COSTS: Array<{ part: string; figure: string; element: ReactElement }> = [
  { part: 'Block(', figure: '88', element: <Block size={[0.3, 0.3, 0.3]} color={C} /> },
  { part: 'Tube(', figure: '720 at 0.2 round', element: <Tube top={0.2} bottom={0.2} height={0.5} color={C} /> },
  { part: 'Tube(', figure: '1,300 at 0.6', element: <Tube top={0.6} bottom={0.6} height={0.5} color={C} /> },
  { part: 'Tube(', figure: '520 faceted (6 sides)', element: <Tube top={0.2} bottom={0.2} height={0.5} sides={6} color={C} /> },
  { part: 'Peak(', figure: '790 at 0.25 round', element: <Peak radius={0.25} height={0.5} color={C} /> },
  { part: 'Peak(', figure: '280 as a pyramid', element: <Peak radius={0.25} height={0.5} sides={4} color={C} /> },
  { part: 'Blob(', figure: '224 for a knob', element: <Blob radius={0.02} color={C} /> },
  { part: 'Blob(', figure: '112 without its line', element: <Blob radius={0.02} color={C} outline={false} /> },
  { part: 'Blob(', figure: '336 at 0.05', element: <Blob radius={0.05} color={C} /> },
  { part: 'Blob(', figure: '600 at 0.075', element: <Blob radius={0.075} color={C} /> },
  { part: 'Blob(', figure: '1,040 at 0.2', element: <Blob radius={0.2} color={C} /> },
  { part: 'Blob(', figure: '2,400 at 0.45', element: <Blob radius={0.45} color={C} /> },
  { part: 'Rounded(', figure: '450 for a 0.1 head', element: <Rounded size={[0.1, 0.1, 0.1]} color={C} /> },
  { part: 'Rounded(', figure: '720 at 0.4 across', element: <Rounded size={[0.4, 0.4, 0.4]} color={C} /> },
  { part: 'Tufted(', figure: '3,040 for a 0.2 body with 40 tufts', element: <Tufted radius={0.2} tufts={40} color={C} /> },
  { part: 'Brickwork(', figure: '1,700 for a 1-unit wall', element: <Brickwork size={[1, 1, 0.1]} color={C} mortar={C} /> },
  { part: 'Rain(', figure: '240 for 120 streaks', element: <Rain radius={0.4} fall={1} /> },
  { part: 'RainCloud(', figure: '2,430 with its rain (350 streaks)', element: <RainCloud size={[0.9, 0.35, 0.5]} fall={1} /> },
  { part: 'Turned(', figure: '720 for a small pot', element: <Turned profile={[[0, 0], [0.05, 0], [0.065, 0.09], [0.07, 0.1], [0, 0.1]]} color={C} /> },
  {
    part: 'Turned(',
    figure: '1,150 for a vase',
    element: <Turned profile={[[0, 0], [0.1, 0], [0.14, 0.15], [0.08, 0.3], [0.1, 0.4], [0, 0.4]]} color={C} />,
  },
  {
    part: 'Striped(',
    figure: '1,650 for a 1-unit tent roof',
    element: <Striped profile={[[0, 0], [0.5, 0], [0.45, 0.05], [0.18, 0.3], [0, 0.42]]} stripe={landmark.cream} color={C} />,
  },
  { part: 'Roof(', figure: '450 for the body', element: <Roof size={[1, 0.4, 0.84]} courses={0} ridge={false} color={C} /> },
  { part: 'Roof(', figure: '1,600 for a 1-unit gable with its courses and ridge', element: <Roof size={[1, 0.4, 0.84]} color={C} /> },
  { part: 'Roof(', figure: '2,350 with gable walls', element: <Roof size={[1, 0.4, 0.84]} gable={C} color={C} /> },
  { part: 'Extruded(', figure: '230 for a star', element: <Extruded shape={starOutline(5, 0.036, 0.016)} depth={0.012} color={C} /> },
  { part: 'Ring(', figure: '1,000 at 0.3 round', element: <Ring radius={0.3} thickness={0.02} color={C} /> },
  { part: 'Ring(', figure: '580 with `sides={6} around={24}`', element: <Ring radius={0.3} thickness={0.02} sides={6} around={24} color={C} /> },
  { part: 'Ring(', figure: '380 for a small hoop at 6 by 16', element: <Ring radius={0.056} thickness={0.01} sides={6} around={16} color={C} /> },
  {
    part: 'Swept(',
    figure: '550 for a twelve-point lock at six sides, two steps a point',
    element: <Swept path={Array.from({ length: 12 }, (_, i): [number, number, number] => [Math.sin(i) * 0.01, -i * 0.01, 0])} widths={Array.from({ length: 12 }, (): [number, number] => [0.03, 0.015])} sides={6} steps={22} color={C} />,
  },
  { part: 'Truss(', figure: '2,800 for a 1-unit mast of 5 bays', element: <Truss height={1} width={0.2} bays={5} color={C} /> },
  { part: 'Truss(', figure: '2,100 for a three-sided jib of 5 bays', element: <Truss height={1} width={0.2} sides={3} bays={5} color={C} /> },
  { part: 'Flag(', figure: '216 (100 for the cloth, 116 for its line)', element: <Flag size={[0.22, 0.13]} color={C} /> },
  {
    part: 'Flag(',
    figure: '720 with a small square emblem',
    element: <Flag size={[0.36, 0.24]} color={C} emblem={{ pieces: [[[-0.05, -0.05], [0.05, -0.05], [0.05, 0.05], [-0.05, 0.05]]], color: landmark.cream }} />,
  },
  { part: 'SnowPeak(', figure: '288 for a 0.8 peak', element: <SnowPeak radius={0.8} height={1.6} cap={landmark.offWhite} color={C} /> },
  { part: 'Die(', figure: '232 for a 0.12 die', element: <Die radius={0.12} color={C} /> },
  { part: 'Flame(', figure: '940 with its core', element: <Flame radius={0.05} height={0.16} color={C} core={landmark.gold} /> },
  { part: 'Beam(', figure: '32', element: <Beam length={1} near={0.05} far={0.2} color={C} /> },
  { part: 'Signal(', figure: '6 for three rings', element: <Signal radius={1} rings={3} color={C} /> },
  { part: 'Water(', figure: '170 for a 24-point oval', element: <Water shape={ellipseOutline(0.2, 0.2, 24)} /> },
  { part: 'Glass(', figure: '88', element: <Glass size={[0.1, 0.1, 0.02]} /> },
  { part: 'Lit(', figure: '88', element: <Lit size={[0.05, 0.07, 0.05]} color={C} /> },
  { part: 'Window(', figure: '350', element: <Window size={[0.15, 0.2]} /> },
  { part: 'Door(', figure: '664', element: <Door size={[0.24, 0.34]} color={C} /> },
  { part: 'StreetLamp(', figure: '860', element: <StreetLamp height={0.36} color={C} /> },
  { part: 'StreetLamp(', figure: '950 with its foot', element: <StreetLamp height={0.36} foot={C} color={C} /> },
  { part: 'Rod(', figure: '520 for a 6-sided rod', element: <Rod from={[0, 0, 0]} to={[0.3, 0.4, 0]} radius={0.016} sides={6} color={C} /> },
  { part: 'Picture(', figure: '2', element: <Picture src="/media/missing.jpg" size={[0.6, 0.4]} /> },
  { part: 'ContactShadow', figure: '288', element: <ContactShadow /> },
]

/** The README's part table, a row per part. */
const readme = readFileSync(resolve(__dirname, '../../../components/world/models/README.md'), 'utf8').replace(/\r\n/g, '\n')
const rowOf = (part: string) => readme.split('\n').find((line) => line.startsWith(`| \`${part}`))

/** The first number in a figure ("1,300 at 0.6" is 1300). */
const amountOf = (figure: string) => Number(figure.replace(/,/g, '').match(/\d+(\.\d+)?/)![0])

describe('a door’s frame', () => {
  /** How wide a door `size` with this frame stands, from its real geometry. */
  async function width(border?: number) {
    const app = await mount(
      <group name="door">
        <Door size={[0.15, 0.3]} color={C} border={border} />
      </group>,
    )
    const box = new Box3().setFromObject(app.scene.getObjectByName('door')!)
    await app.unmount()
    return box.max.x - box.min.x
  }

  it('is as wide as it was by default, and slimmer when asked, the door itself the same', async () => {
    const usual = await width()
    const slim = await width(0.02)
    // The frame stands `border` out each side of the door; the step reaches past it by the same amount either way.
    expect(usual - slim).toBeCloseTo(2 * (0.036 - 0.02), 3)
  })
})

/** The part table's rows (each part's own row, from `| \`Part` to the end of the table), and each one's cost cell, the last. */
function partRows(): Array<{ row: string; cost: string }> {
  const lines = readme.split('\n')
  const start = lines.findIndex((line) => line.startsWith('| Part | For |'))
  const rows: Array<{ row: string; cost: string }> = []
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break
    const cells = line.split('|').map((c) => c.trim())
    rows.push({ row: line, cost: cells[cells.length - 2] })
  }
  return rows
}

describe('the modelling README’s costs', () => {
  it('measures every figure the part table states: none goes unchecked', () => {
    const rows = partRows()
    expect(rows.length).toBeGreaterThan(10)
    const unmeasured = rows.flatMap(({ row, cost }) => {
      // What is left of the cost once every figure measured below for this row is taken out: it should hold no number.
      const left = COSTS.filter(({ part }) => rowOf(part) === row).reduce((rest, { figure }) => rest.replace(figure, ''), cost)
      return /\d/.test(left) ? [`${row.split('|')[1].trim()}: "${left.trim()}"`] : []
    })
    expect(unmeasured).toEqual([])
  })

  it.each(COSTS)('$part says $figure', async ({ part, figure, element }) => {
    const row = rowOf(part)
    expect(row, `a row for ${part}`).toBeDefined()
    expect(row, `${part}'s row states "${figure}"`).toContain(figure)
    const app = await mount(<group name="part">{element}</group>)
    const drawn = triangleCount(app.scene.getObjectByName('part')!)
    await app.unmount()
    const stated = amountOf(figure)
    expect(Math.abs(drawn - stated) / stated, `${part} ${figure}: draws ${drawn}`).toBeLessThanOrEqual(TOLERANCE)
  })
})
