import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GenericModel } from '@/components/world/models/GenericModel'
import { Block, Bob, Drop, Flag, Flame, Rain, Sway } from '@/components/world/models/kit'
import { landmark } from '@/content/sky'
import { MODELS } from '@/components/world/models/registry'
import type { ModelKey } from '@/content/types'
import { places } from '@/content/world'
import { CLOTH, DRAW_BUDGET, PLANET_DRAW_BUDGET, PLANET_TRIANGLE_BUDGET, TRIANGLE_BUDGET } from '@/lib/world/kit'
import { hiddenParts, survey, sweptOut } from './landmarkChecks'
import { mount } from './r3f'

/*
 * The landmarks as a whole. Each built landmark's own checks run in its own
 * file (`landmark.<key>.test.tsx`, one line: `describeLandmark(key)`, from
 * `landmarkChecks.tsx`), so they run in parallel; this file makes sure every
 * built landmark has one, and holds what is planet-wide: the budgets, and that
 * every place's weather is drawn.
 */

const RED = landmark.coral

/** Every landmark that has been built: its model key no longer draws the generic building. */
const built = (Object.keys(MODELS) as ModelKey[]).filter((key) => MODELS[key] !== GenericModel)

describe('the built landmarks', () => {
  it.each(built)('%s has its own test file running every landmark check', (key) => {
    const file = resolve(__dirname, `landmark.${key}.test.tsx`)
    expect(existsSync(file), `tests/unit/world/landmark.${key}.test.tsx`).toBe(true)
    expect(readFileSync(file, 'utf8')).toContain(`describeLandmark('${key}')`)
  })
})

describe('the check of where moving parts reach', () => {
  /** What leaves a 1.0 footprint of `element`, mounted as a landmark. */
  async function leaves(element: React.ReactElement) {
    const app = await mount(<group name="model">{element}</group>)
    const out = sweptOut(app.scene.getObjectByName('model')!, 1.0)
    await app.unmount()
    return out
  }

  it('counts how far a Bob carries its parts up and down', async () => {
    // Its block's top at rest is 2.5, under 2.6; bobbing 0.2 takes it to 2.7.
    expect(await leaves(<Bob at={[0, 2.45, 0]} amount={0.2}><Block size={[0.1, 0.1, 0.1]} color={RED} /></Bob>)).not.toEqual([])
    expect(await leaves(<Bob at={[0, 2.3, 0]} amount={0.2}><Block size={[0.1, 0.1, 0.1]} color={RED} /></Bob>)).toEqual([])
  })

  it('counts how far a Drop carries its parts down, and only down', async () => {
    // A coin resting at 0.3 dropping 0.4 would sink 0.1 under the ground; dropping 0.2 it stays above.
    expect(await leaves(<Drop at={[0, 0.3, 0]} fall={0.4}><Block size={[0.1, 0.1, 0.1]} color={RED} /></Drop>)).not.toEqual([])
    expect(await leaves(<Drop at={[0, 0.3, 0]} fall={0.2}><Block size={[0.1, 0.1, 0.1]} color={RED} /></Drop>)).toEqual([])
    // Near the top of the footprint it never rises: resting at 2.5 it stays under 2.6 however far it falls.
    expect(await leaves(<Drop at={[0, 2.5, 0]} fall={0.6}><Block size={[0.1, 0.1, 0.1]} color={RED} /></Drop>)).toEqual([])
  })

  it('holds a flame to no footprint: it is light, as a beam is', async () => {
    expect(await leaves(<Flame at={[0, 2.55, 0.98]} radius={0.05} height={0.2} color={RED} />)).toEqual([])
  })

  it('counts how far rain carries its streaks down its column, and only that far', async () => {
    // A column 1.2 tall from 2.5 rests its streaks round 1.9; falling, they reach from 2.5 down to 1.3. Lifted 0.2, its top is 2.7.
    expect(await leaves(<Rain at={[0, 2.7, 0]} radius={0.3} fall={1.2} />)).not.toEqual([])
    expect(await leaves(<Rain at={[0, 2.5, 0]} radius={0.3} fall={1.2} />)).toEqual([])
    // Its streaks' feet reach the ground and no further.
    expect(await leaves(<Rain at={[0, 1.2, 0]} radius={0.3} fall={1.2} />)).toEqual([])
    expect(await leaves(<Rain at={[0, 1.0, 0]} radius={0.3} fall={1.2} />)).not.toEqual([])
  })

  it('counts how far a flag’s ripple carries its cloth out of its plane, from the same limit the shader uses', async () => {
    // A flag flying along the footprint's edge, 0.9 out: its ripple moves the cloth out across the edge (its +Z).
    const flag = (amount: number, z = 0.9) => <Flag size={[0.3, 0.2]} at={[0, 1, z]} amount={amount} color={RED} />
    expect(await leaves(flag(0.4))).not.toEqual([])
    expect(await leaves(flag(0.01))).toEqual([])
    // An amount past the limit counts as the limit: the most a ripple can be is CLOTH.maxAmount of its width (0.12
    // here), so a flag 0.83 out stays in (its line and thickness included), though nine times its width would carry it far out.
    expect(0.3 * CLOTH.maxAmount).toBeCloseTo(0.12)
    expect(await leaves(flag(9, 0.83))).toEqual([])
    expect(await leaves(flag(9, 0.9))).not.toEqual([])
    // A tapering pennant ripples just as far, its point included.
    const pennant = (amount: number) => <Flag size={[0.3, 0.2]} taper={1} at={[0, 1, 0.9]} amount={amount} color={RED} />
    expect(await leaves(pennant(0.4))).not.toEqual([])
    expect(await leaves(pennant(0.01))).toEqual([])
  })
})

describe('the check that no part is buried', () => {
  it('looks inside moving parts too, in their rest pose: an eye sunk in a turning head is found', async () => {
    const head = (eye: number) => (
      <group name="model">
        <Block size={[1, 0.1, 1]} color={RED} />
        <Sway at={[0, 0.5, 0]} axis="y" amount={0.4}>
          <Block size={[0.3, 0.3, 0.3]} color={RED} />
          <Block size={[0.04, 0.04, 0.04]} at={[0, 0, eye]} color={RED} />
        </Sway>
      </group>
    )
    const buried = await mount(head(0))
    expect(hiddenParts(buried.scene.getObjectByName('model')!, 1).length).toBe(1)
    await buried.unmount()
    const proud = await mount(head(0.16))
    expect(hiddenParts(proud.scene.getObjectByName('model')!, 1)).toEqual([])
    await proud.unmount()
  })
})

describe('every place on the planet (R36, R40)', () => {
  it('keeps each landmark under the triangle and draw-call caps, all nineteen under the planet totals, and draws the weather each place asks for', async () => {
    let triangles = 0
    let draws = 0
    const over: string[] = []
    const weather: string[] = []
    for (const place of places) {
      const s = await survey(place, false)
      if (s.triangles > TRIANGLE_BUDGET) over.push(`${place.id}: ${s.triangles} triangles`)
      if (s.draws > DRAW_BUDGET) over.push(`${place.id}: ${s.draws} draw calls`)
      // Weather is content: a place that asks for rain gets it, whatever model it has, and a place that does not, does not.
      if (s.weather !== place.weather) weather.push(`${place.id} asks for ${place.weather ?? 'none'}, draws ${s.weather ?? 'none'}`)
      triangles += s.triangles
      draws += s.draws
    }
    expect(weather).toEqual([])
    expect(over).toEqual([])
    expect(triangles).toBeLessThanOrEqual(PLANET_TRIANGLE_BUDGET)
    expect(draws).toBeLessThanOrEqual(PLANET_DRAW_BUDGET)
  })
})
