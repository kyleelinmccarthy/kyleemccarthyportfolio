import { describe, it, expect, vi } from 'vitest'
import { Box3, Vector3, type Mesh, type Object3D } from 'three'
import { Companions } from '@/components/world/Companions'
import { DEFAULT_GUEST, guestOptions, type GuestChoice } from '@/content/characters'
import { guestKey } from '@/lib/guests'
import { districts, places } from '@/content/world'
import { COMPANION_DRAW_BUDGET, COMPANION_TRIANGLE_BUDGET } from '@/lib/world/characters'
import { PLANET_DRAW_BUDGET, PLANET_TRIANGLE_BUDGET, triangleCount } from '@/lib/world/kit'
import { drawCalls, survey } from './landmarkChecks'
import { mount } from './r3f'

/** The two characters as the world mounts them at `placeId` (shadows, sway, batching and all), and what they draw. */
async function companionsAt(placeId: string | null, guest: GuestChoice) {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const app = await mount(
    <group name="pair">
      <Companions places={places} districts={districts} placeId={placeId} guest={guest} onPickGuest={() => undefined} />
    </group>,
  )
  const root = app.scene.getObjectByName('pair')!
  root.updateWorldMatrix(true, true)
  const result = { root, triangles: triangleCount(root), draws: drawCalls(root), errors: errors.mock.calls.length, unmount: app.unmount }
  errors.mockRestore()
  return result
}

/** The box, in `frame`'s own space, of everything under `o` that is drawn (not the batch's merged copies). */
function boxOf(o: Object3D, frame: Object3D): Box3 {
  const box = new Box3()
  const v = new Vector3()
  const toFrame = frame.matrixWorld.clone().invert()
  o.traverse((c) => {
    const mesh = c as Mesh
    if (!mesh.isMesh || mesh.userData.batched || !mesh.geometry.getAttribute('position')) return
    const p = mesh.geometry.getAttribute('position')
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toFrame))
  })
  return box
}

/** Every outfit, in the default skin tone (a tone changes no part: character.test.tsx). */
const outfits = guestOptions.age.flatMap((age) => guestOptions.style.map((style): GuestChoice => ({ ...DEFAULT_GUEST, age: age.id, style: style.id })))

describe('the characters as the world draws them', () => {
  it.each(outfits.map((c) => [guestKey(c), c] as const))('at a place with the visitor as %s, the pair (their shadows included) keeps to its budget', async (_, choice) => {
    const s = await companionsAt('beacon', choice)
    try {
      expect(s.errors).toBe(0)
      expect(s.triangles).toBeLessThanOrEqual(COMPANION_TRIANGLE_BUDGET)
      expect(s.draws).toBeLessThanOrEqual(COMPANION_DRAW_BUDGET)
    } finally {
      await s.unmount()
    }
  })

  it.each(['adult', 'kid', 'elder'] as const)('the visitor’s character’s hit shape, as %s, claims only the character: it lies within the figure, not beside it', async (age) => {
    const s = await companionsAt('beacon', { ...DEFAULT_GUEST, age })
    try {
      const guest = s.root.getObjectByName('companion:guest')!
      const hit = s.root.getObjectByName('companion:guest-hit') as Mesh
      // Both in the character's own frame (it stands turned toward the landmark).
      const figure = boxOf(guest.getObjectByName('character')!, guest)
      const claim = boxOf(hit, guest)
      // Its hit shape is no wider, deeper or taller than the figure.
      const tolerance = 1e-4
      expect(claim.min.x).toBeGreaterThanOrEqual(figure.min.x - tolerance)
      expect(claim.max.x).toBeLessThanOrEqual(figure.max.x + tolerance)
      expect(claim.min.z).toBeGreaterThanOrEqual(figure.min.z - tolerance)
      expect(claim.max.z).toBeLessThanOrEqual(figure.max.z + tolerance)
      expect(claim.max.y).toBeLessThanOrEqual(figure.max.y + tolerance)
      // And it follows the figure's height: most of it is claimed.
      expect(claim.max.y - claim.min.y).toBeGreaterThan((figure.max.y - figure.min.y) * 0.8)
    } finally {
      await s.unmount()
    }
  })

  it('over the planet nothing of theirs takes a press', async () => {
    const s = await companionsAt(null, DEFAULT_GUEST)
    try {
      expect(s.root.getObjectByName('companion:guest-hit')).toBeUndefined()
    } finally {
      await s.unmount()
    }
  })
})

describe('the planet with the characters on it', () => {
  it('keeps within the planet’s totals: every landmark, and the pair at their heaviest', async () => {
    let triangles = 0
    let draws = 0
    for (const place of places) {
      const s = await survey(place, false)
      triangles += s.triangles
      draws += s.draws
    }
    let heaviest = { triangles: 0, draws: 0 }
    for (const choice of outfits) {
      const s = await companionsAt('beacon', choice)
      if (s.triangles > heaviest.triangles) heaviest = { triangles: s.triangles, draws: Math.max(heaviest.draws, s.draws) }
      heaviest.draws = Math.max(heaviest.draws, s.draws)
      await s.unmount()
    }
    expect(triangles + heaviest.triangles).toBeLessThanOrEqual(PLANET_TRIANGLE_BUDGET)
    expect(draws + heaviest.draws).toBeLessThanOrEqual(PLANET_DRAW_BUDGET)
  }, 120_000)
})
