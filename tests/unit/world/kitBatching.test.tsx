import { describe, it, expect, vi } from 'vitest'
import { BackSide, Box3, Vector3, type Material, type Mesh, type Object3D } from 'three'
import { landmark } from '@/content/sky'
import { celMaterial } from '@/components/world/materials'
import { Batched, Beam, Block, Door, Roof, Signal, StreetLamp, Striped, Sway, Window } from '@/components/world/models/kit'
import { mount } from './r3f'

/*
 * Batching as the app runs it: real react-three-fiber, which hands every kit
 * mesh the same `userData` object, and real kit parts. Each test edits what a
 * landmark renders, as Fast Refresh does, and checks what is drawn.
 */

const RED = landmark.coral
const BLUE = landmark.blue

/** The landmark group named `name`: its batch's merged meshes are its descendants. */
function landmarkRoot(scene: Object3D, name: string): Object3D {
  const found = scene.getObjectByName(name)
  if (!found) throw new Error(`no ${name}`)
  return found
}

/** The merged meshes under a landmark, optionally only those drawn with `material`. */
function merged(root: Object3D, material?: Material): Mesh[] {
  const out: Mesh[] = []
  root.traverse((o) => {
    const mesh = o as Mesh
    if (mesh.isMesh && mesh.userData.batched && (!material || mesh.material === material)) out.push(mesh)
  })
  return out
}

/** The bounds of what is merged, in the landmark's space. */
function extent(meshes: Mesh[]): Box3 {
  const box = new Box3()
  const v = new Vector3()
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position')
    for (let i = 0; i < position.count; i++) box.expandByPoint(v.fromBufferAttribute(position, i))
  }
  return box
}

const width = (box: Box3) => box.max.x - box.min.x
const centreX = (box: Box3) => (box.min.x + box.max.x) / 2

describe('batching in the running app', () => {
  it('gives every kit mesh one frozen marker, as react-three-fiber shares it, so nothing can write to it', async () => {
    const app = await mount(
      <group name="one">
        <Batched>
          <Block size={[0.2, 0.2, 0.2]} color={RED} />
          <Block size={[0.3, 0.2, 0.2]} at={[1, 0, 0]} color={RED} />
        </Batched>
      </group>,
    )
    const kit: Mesh[] = []
    app.scene.traverse((o) => {
      if ((o as Mesh).isMesh && o.userData.batch) kit.push(o as Mesh)
    })
    expect(kit.length).toBeGreaterThan(2)
    expect(new Set(kit.map((m) => m.userData)).size).toBe(1)
    expect(Object.isFrozen(kit[0].userData)).toBe(true)
    await app.unmount()
  })

  it('redraws a part whose size alone changed, twice in a row, while another landmark has a moving part', async () => {
    const scene = (size: number) => (
      <>
        <group name="one">
          <Batched>
            <Block size={[0.2, 0.2, 0.2]} color={RED} />
            <Sway at={[0, 1, 0]}>
              <Block size={[0.1, 0.1, 0.1]} color={RED} />
            </Sway>
          </Batched>
        </group>
        <group name="two">
          <Batched>
            <Block size={[0.2, 0.2, 0.2]} color={RED} />
            <Block size={[size, 0.2, 0.2]} at={[2, 0, 0]} color={BLUE} />
          </Batched>
        </group>
      </>
    )
    const blue = celMaterial({ color: BLUE }, 'kit')
    const app = await mount(scene(0.1))
    const two = landmarkRoot(app.scene, 'two')
    expect(width(extent(merged(two, blue)))).toBeCloseTo(0.1, 4)

    await app.rerender(scene(0.5))
    expect(merged(two, blue)).toHaveLength(1)
    expect(width(extent(merged(two, blue)))).toBeCloseTo(0.5, 4)

    await app.rerender(scene(0.3))
    expect(merged(two, blue)).toHaveLength(1)
    expect(width(extent(merged(two, blue)))).toBeCloseTo(0.3, 4)
    await app.unmount()
  })

  it('stops drawing a part that was removed', async () => {
    const scene = (withBlue: boolean) => (
      <group name="one">
        <Batched>
          <Block size={[0.2, 0.2, 0.2]} color={RED} />
          {withBlue && <Block size={[0.2, 0.2, 0.2]} at={[1, 0, 0]} color={BLUE} />}
        </Batched>
      </group>
    )
    const blue = celMaterial({ color: BLUE }, 'kit')
    const app = await mount(scene(true))
    const one = landmarkRoot(app.scene, 'one')
    expect(merged(one, blue)).toHaveLength(1)
    await app.rerender(scene(false))
    expect(merged(one, blue)).toHaveLength(0)
    // The red block is still drawn, once.
    expect(merged(one, celMaterial({ color: RED }, 'kit'))).toHaveLength(1)
    await app.unmount()
  })

  it('redraws a window, a door and a roof where they have been moved to', async () => {
    const scene = (x: number) => (
      <>
        <group name="window">
          <Batched>
            <Window size={[0.15, 0.2]} at={[x, 0.5, 0]} />
          </Batched>
        </group>
        <group name="door">
          <Batched>
            <Door size={[0.24, 0.34]} at={[x, 0, 0]} color={BLUE} />
          </Batched>
        </group>
        <group name="roof">
          <Batched>
            <Roof size={[1, 0.4, 0.8]} at={[x, 1, 0]} color={RED} />
          </Batched>
        </group>
      </>
    )
    const app = await mount(scene(0.32))
    for (const name of ['window', 'door', 'roof']) expect(centreX(extent(merged(landmarkRoot(app.scene, name)))), name).toBeCloseTo(0.32, 3)
    await app.rerender(scene(0.4))
    for (const name of ['window', 'door', 'roof']) expect(centreX(extent(merged(landmarkRoot(app.scene, name)))), name).toBeCloseTo(0.4, 3)
    await app.unmount()
  })

  it('gives a moving part its new height when its pivot moves, and its new geometry when its size changes', async () => {
    const scene = (y: number, size: number) => (
      <group name="one">
        <Batched>
          <Block size={[0.2, 0.2, 0.2]} color={RED} />
          <Sway at={[0, y, 0]}>
            <Block size={[size, size, size]} color={BLUE} />
          </Sway>
        </Batched>
      </group>
    )
    const app = await mount(scene(1, 0.1))
    const swinging = () => {
      let found: Mesh | null = null
      landmarkRoot(app.scene, 'one').traverse((o) => {
        const mesh = o as Mesh
        if (mesh.isMesh && !mesh.userData.batched && mesh.material === celMaterial({ color: BLUE }, 'kit')) found = mesh
      })
      return found as unknown as Mesh
    }
    const heights = () => Array.from(swinging().geometry.getAttribute('aHeight').array as Float32Array)
    expect(Math.min(...heights())).toBeCloseTo(0.95, 3)

    await app.rerender(scene(2, 0.1))
    expect(Math.min(...heights())).toBeCloseTo(1.95, 3)

    await app.rerender(scene(2, 0.4))
    const mesh = swinging()
    expect(mesh.geometry.getAttribute('aHeight').count).toBe(mesh.geometry.getAttribute('position').count)
    expect(Math.min(...heights())).toBeCloseTo(1.8, 3)
    expect(Math.max(...heights())).toBeCloseTo(2.2, 3)
    await app.unmount()
  })
})

describe('the development check of a landmark', () => {
  it('reports each landmark once per change, however often it runs (strict mode runs effects twice)', async () => {
    const { checkFootprint } = await import('@/components/world/models/kit')
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      const app = await mount(
        <group name="one">
          <Block size={[0.2, 0.2, 0.2]} at={[0, 0.1, 0]} color={RED} />
        </group>,
      )
      const root = landmarkRoot(app.scene, 'one')
      checkFootprint(root, 'test-landmark', 1.3)
      checkFootprint(root, 'test-landmark', 1.3)
      const infos = () => info.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('test-landmark'))
      expect(infos()).toHaveLength(1)
      // A change is reported again: a part that leaves the footprint, and more triangles.
      await app.rerender(
        <group name="one">
          <Block size={[0.2, 0.2, 0.2]} at={[0, 0.1, 0]} color={RED} />
          <Block size={[0.2, 0.2, 0.2]} at={[2, 0.1, 0]} color={RED} />
        </group>,
      )
      checkFootprint(root, 'test-landmark', 1.3)
      checkFootprint(root, 'test-landmark', 1.3)
      expect(infos()).toHaveLength(2)
      // Only this check's own messages (three and react-three-fiber warn about other things).
      const ours = warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('test-landmark'))
      expect(ours).toHaveLength(1)
      expect(ours[0]).toContain('leaves its footprint')
      await app.unmount()
    } finally {
      info.mockRestore()
      warn.mockRestore()
    }
  })

  it('holds light to no footprint: a beam may reach past it, a solid part may not (R37)', async () => {
    const { checkFootprint } = await import('@/components/world/models/kit')
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const ours = () => warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('beam-landmark'))
    try {
      const app = await mount(
        <group name="lit">
          <Block size={[0.2, 0.2, 0.2]} at={[0, 0.1, 0]} color={RED} />
          <Beam length={2.4} near={0.05} far={0.3} at={[0, 1, 0]} color={RED} />
        </group>,
      )
      const root = landmarkRoot(app.scene, 'lit')
      checkFootprint(root, 'beam-landmark', 1.3)
      expect(ours()).toEqual([])
      // Its triangles still count.
      expect(info.mock.calls.map((c) => String(c[0])).find((m) => m.includes('beam-landmark'))).toContain(`${44 * 2 + 32} triangles`)
      // The same reach in solid geometry is a fault.
      await app.rerender(
        <group name="lit">
          <Block size={[0.2, 0.2, 0.2]} at={[0, 0.1, 0]} color={RED} />
          <Block size={[0.2, 0.2, 0.2]} at={[0, 1, 2.3]} color={RED} />
        </group>,
      )
      checkFootprint(root, 'beam-landmark', 1.3)
      expect(ours()).toHaveLength(1)
      await app.unmount()
    } finally {
      info.mockRestore()
      warn.mockRestore()
    }
  })

  it('draws a striped shape in its two colours and one line, each merged with the rest of its colour', async () => {
    const app = await mount(
      <group name="tent">
        <Batched>
          <Striped profile={[[0, 0], [0.5, 0], [0.5, 0.4], [0, 0.8]]} color={RED} stripe={BLUE} stripes={8} at={[0, 0, 0]} />
          <Block size={[0.2, 0.2, 0.2]} at={[0.8, 0.1, 0]} color={RED} />
        </Batched>
      </group>,
    )
    const root = landmarkRoot(app.scene, 'tent')
    const red = merged(root, celMaterial({ color: RED }, 'kit'))
    const blue = merged(root, celMaterial({ color: BLUE }, 'kit'))
    expect(red).toHaveLength(1)
    expect(blue).toHaveLength(1)
    // Half the shape's triangles in each colour; the block's with the red.
    const tris = (m: Mesh) => m.geometry.index!.count / 3
    expect(tris(red[0]) - 44).toBe(tris(blue[0]))
    await app.unmount()
  })

  it('holds rings of light to no footprint either, counts their triangles, and never batches them', async () => {
    const { checkFootprint } = await import('@/components/world/models/kit')
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const ours = () => warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('signal-landmark'))
    try {
      const app = await mount(
        <group name="lit">
          <Block size={[0.2, 0.2, 0.2]} at={[0, 0.1, 0]} color={RED} />
          <Signal radius={2} rings={3} at={[0, 2, 0]} color={RED} />
        </group>,
      )
      const root = landmarkRoot(app.scene, 'lit')
      checkFootprint(root, 'signal-landmark', 1.3)
      expect(ours()).toEqual([])
      expect(info.mock.calls.map((c) => String(c[0])).find((m) => m.includes('signal-landmark'))).toContain(`${44 * 2 + 6} triangles`)
      const rings: Mesh[] = []
      root.traverse((o) => {
        if ((o as Mesh).isMesh && o.userData.light) rings.push(o as Mesh)
      })
      // One live part, which a batch never merges: it is not marked as a kit part to merge.
      expect(rings).toHaveLength(1)
      expect(rings[0].userData.batch).toBeUndefined()
      await app.unmount()
    } finally {
      info.mockRestore()
      warn.mockRestore()
    }
  })
})

describe('a street lamp’s props as a landmark passes them', () => {
  /** Each mesh's lowest point, in order, for a lamp with this foot: where its post and its foot stand. */
  async function feet(foot: unknown): Promise<number[]> {
    const app = await mount(
      <group name="lamp">
        <StreetLamp height={0.4} color={RED} foot={foot as string} />
      </group>,
    )
    const out: number[] = []
    const v = new Vector3()
    app.scene.getObjectByName('lamp')!.updateWorldMatrix(true, true)
    app.scene.getObjectByName('lamp')!.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh || (mesh.material as Material).side === BackSide) return
      const position = mesh.geometry.getAttribute('position')
      let low = Infinity
      for (let i = 0; i < position.count; i++) low = Math.min(low, v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).y)
      // (+ 0 turns a -0 into 0.)
      out.push(+low.toFixed(4) + 0)
    })
    await app.unmount()
    return out
  }

  it('stands its post on the ground, with no foot, for a foot that is no colour (missing, empty or null)', async () => {
    const plain = await feet(undefined)
    expect(Math.min(...plain)).toBeCloseTo(0, 2)
    for (const none of ['', null]) expect(await feet(none), String(none)).toEqual(plain)
    // A colour does give it a foot, and raises the post onto it.
    const footed = await feet(BLUE)
    expect(footed.length).toBeGreaterThan(plain.length)
  })
})
