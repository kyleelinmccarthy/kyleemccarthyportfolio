import { describe, it, expect } from 'vitest'
import type { Group, Mesh, Object3D } from 'three'
import { landmark } from '@/content/sky'
import { lookUniforms } from '@/components/world/lookUniforms'
import { Batched, Block, Gesture } from '@/components/world/models/kit'
import type { Move } from '@/lib/world/gesture'
import { drawCalls } from './landmarkChecks'
import { mount, settle } from './r3f'

/*
 * A `Gesture` as the app runs it: batched with the landmark's still parts
 * while at rest (no draw calls of its own), a live moving part only while it
 * plays, and batched again once it has played.
 */

const HOP: Move = { seconds: 0.5, beats: 1, lift: 0.04 }

/** A landmark of two blocks, one of them in a gesture played on `cue`. */
const scene = (cue: number) => (
  <group name="landmark">
    <Batched>
      <Block size={[0.2, 0.2, 0.2]} color={landmark.coral} />
      <Gesture at={[1, 0, 0]} cue={cue} move={HOP}>
        <Block size={[0.1, 0.1, 0.1]} color={landmark.blue} />
      </Gesture>
    </Batched>
  </group>
)

/** Whether the actor's own mesh is drawn (live), rather than hidden behind the batch's merged copy. */
const live = (root: Object3D) => {
  let shown = false
  root.traverse((o) => {
    const mesh = o as Mesh
    if (mesh.isMesh && mesh.userData.batch && mesh.visible && mesh.parent?.name !== 'landmark') {
      let inGesture = false
      for (let p: Object3D | null = mesh.parent; p; p = p.parent) if (p.userData.motion === 'gesture') inGesture = true
      if (inGesture) shown = true
    }
  })
  return shown
}

/** The group the gesture moves. */
const actorGroup = (root: Object3D) => {
  let found: Group | null = null
  root.traverse((o) => {
    if (o.userData.motion === 'gesture') found = o as Group
  })
  return found as Group | null
}

describe('a gesture', () => {
  it('at rest is merged with the landmark: it costs no draw calls of its own', async () => {
    const still = await mount(
      <group name="landmark">
        <Batched>
          <Block size={[0.2, 0.2, 0.2]} color={landmark.coral} />
          <Block size={[0.1, 0.1, 0.1]} at={[1, 0, 0]} color={landmark.blue} />
        </Batched>
      </group>,
    )
    const baseline = drawCalls(still.scene)
    await still.unmount()
    const app = await mount(scene(0))
    try {
      expect(drawCalls(app.scene)).toBe(baseline)
      expect(live(app.scene)).toBe(false)
    } finally {
      await app.unmount()
    }
  })

  it('plays its move once when its cue changes, live while it plays, and is merged again at rest once it has played', async () => {
    const app = await mount(scene(0))
    try {
      const start = lookUniforms.time.value
      await app.rerender(scene(1))
      await app.frame()
      await settle()
      expect(live(app.scene)).toBe(true)
      // Half way through the hop: up off the ground.
      lookUniforms.time.value = start + HOP.seconds / 2
      await app.frame()
      expect(actorGroup(app.scene)!.position.y).toBeGreaterThan(HOP.lift! * 0.9)
      // Past its end: back where it rests, and merged again.
      lookUniforms.time.value = start + HOP.seconds * 1.2
      await app.frame()
      await settle()
      await app.frame()
      expect(actorGroup(app.scene)).toBeNull()
      expect(live(app.scene)).toBe(false)
    } finally {
      lookUniforms.time.value = 0
      await app.unmount()
    }
  })

  it('does nothing while its cue stays the same: under reduced motion the pets never change it', async () => {
    const app = await mount(scene(3))
    try {
      await app.rerender(scene(3))
      await app.frame()
      await settle()
      expect(live(app.scene)).toBe(false)
    } finally {
      await app.unmount()
    }
  })
})
