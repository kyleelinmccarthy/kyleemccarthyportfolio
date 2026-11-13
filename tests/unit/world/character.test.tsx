import { describe, it, expect, vi } from 'vitest'
import { Box3, Vector3, type Mesh } from 'three'
import { Character } from '@/components/world/models/Character'
import { Batched } from '@/components/world/models/kit'
import { DEFAULT_GUEST, guestOptions, guideLook, type Look } from '@/content/characters'
import { guestKey, guestLook } from '@/lib/guests'
import { COMPANION_DRAW_BUDGET, COMPANION_TRIANGLE_BUDGET, characterHeight } from '@/lib/world/characters'
import { OUTLINE, triangleCount } from '@/lib/world/kit'
import { drawCalls, hiddenParts } from './landmarkChecks'
import { mount } from './r3f'

/** A figure mounted as the world mounts it (batched), and what it draws. */
async function survey(looks: Array<{ look: Look; waving?: boolean }>) {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const app = await mount(
    <group name="pair">
      {looks.map(({ look, waving }, i) => (
        <group key={i} position={[i * 0.5, 0, 0]}>
          <Batched>
            <Character look={look} waving={waving} />
          </Batched>
        </group>
      ))}
    </group>,
  )
  const root = app.scene.getObjectByName('pair')!
  root.updateWorldMatrix(true, true)
  const boxes = root.children.map((g) => {
    const box = new Box3()
    const v = new Vector3()
    g.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh || mesh.userData.batched) return
      const p = mesh.geometry.getAttribute('position')
      for (let k = 0; k < p.count; k++) box.expandByPoint(v.fromBufferAttribute(p, k).applyMatrix4(mesh.matrixWorld).sub(g.position))
    })
    return box
  })
  const result = { triangles: triangleCount(root), draws: drawCalls(root), boxes, hidden: hiddenParts(root, 1.6), errors: errors.mock.calls.length }
  errors.mockRestore()
  await app.unmount()
  return result
}

/**
 * Every outfit the visitor can make, in the default skin tone: a tone changes
 * only colours (and the hair's), never a part, so a figure's shape and cost
 * are its age's and style's (tested below).
 */
const outfits: Array<[string, Look]> = guestOptions.age.flatMap((age) =>
  guestOptions.style.map((style) => {
    const choice = { ...DEFAULT_GUEST, age: age.id, style: style.id }
    return [guestKey(choice), guestLook(choice)] as [string, Look]
  }),
)
const everyLook: Array<[string, Look]> = [['the guide', guideLook], ...outfits]

/**
 * What the most expensive of the six looks a visitor could pick before cost,
 * alone and batched (measured at the commit before the composer): no
 * character they make now may cost more.
 */
const GUEST_TRIANGLES = 9088
const GUEST_DRAWS = 12

describe('a character', () => {
  it.each(everyLook)('%s stands on the ground, as tall as its look says, narrow as a person, and every part of it can be seen', async (_, look) => {
    const s = await survey([{ look }])
    const box = s.boxes[0]!
    expect(s.errors).toBe(0)
    expect(box.min.y).toBeGreaterThanOrEqual(-OUTLINE.max)
    expect(box.min.y).toBeLessThan(0.005)
    const h = characterHeight(look)
    expect(box.max.y).toBeGreaterThan(h * 0.97)
    expect(box.max.y).toBeLessThan(h * 1.12)
    expect(Math.max(-box.min.x, box.max.x)).toBeLessThan(0.08)
    expect(Math.max(-box.min.z, box.max.z)).toBeLessThan(0.08)
    expect(s.hidden).toEqual([])
  })

  it('a kid is clearly smaller than an adult beside it, and an elder about as tall', async () => {
    const at = (age: 'kid' | 'adult' | 'elder') => guestLook({ ...DEFAULT_GUEST, age })
    const s = await survey([{ look: at('adult') }, { look: at('kid') }, { look: at('elder') }])
    const [adult, kid, elder] = s.boxes.map((b) => b.max.y)
    expect(kid! / adult!).toBeLessThan(0.7)
    expect(elder! / adult!).toBeGreaterThan(0.9)
  })

  it('raises its right arm to wave, beside its head, and keeps within reach', async () => {
    const s = await survey([{ look: guideLook, waving: true }])
    const box = s.boxes[0]!
    expect(box.min.x).toBeLessThan(-0.07)
    expect(box.min.x).toBeGreaterThan(-0.12)
  })
})

describe('the characters’ budget', () => {
  it.each(outfits)('%s costs no more than the most expensive of the old looks', async (_, look) => {
    const s = await survey([{ look }])
    expect(s.triangles).toBeLessThanOrEqual(GUEST_TRIANGLES)
    expect(s.draws).toBeLessThanOrEqual(GUEST_DRAWS)
  })

  it('a skin tone changes no part of a figure, only its colours', async () => {
    for (const { age, style } of [DEFAULT_GUEST, { age: 'kid', style: 'masculine' } as const, { age: 'elder', style: 'feminine' } as const]) {
      const costs = new Set<string>()
      for (const { id: skin } of guestOptions.skin) {
        const s = await survey([{ look: guestLook({ age, style, skin }) }])
        costs.add(`${s.triangles}/${s.draws}`)
      }
      expect(costs.size, `${age} ${style}`).toBe(1)
    }
  })

  it.each(outfits)('the guide waving beside the visitor as %s draws within the pair’s triangles and draw calls', async (_, look) => {
    const s = await survey([{ look: guideLook, waving: true }, { look }])
    expect(s.triangles).toBeLessThanOrEqual(COMPANION_TRIANGLE_BUDGET)
    expect(s.draws).toBeLessThanOrEqual(COMPANION_DRAW_BUDGET)
  })
})
