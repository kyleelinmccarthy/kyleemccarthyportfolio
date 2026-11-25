'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3, type Group } from 'three'
import { DRAGON } from '@/content/eggs'
import type { District, Place } from '@/content/types'
import { dragonThrough } from '@/lib/eggs/hooks'
import { bugScale } from '@/lib/world/bug'
import { MODEL_SCALE } from '@/lib/world/camera'
import { DRAGON_SEED, dragonAt, dragonBank, dragonHold, dragonRadius, dragonWing } from '@/lib/world/dragon'
import { dirOf } from '@/lib/world/geo'
import { testHooksOn } from '@/lib/world/quality'
import { MAX_TICK, isClick } from '@/lib/world/rig'
import { DragonDie } from './DragonDie'
import { rollForVisitor, useEggs } from './eggStore'

/** The test hooks are live only in an e2e build (`testHooksOn`). */
const TEST_HOOKS = testHooksOn(process.env.NEXT_PUBLIC_E2E)
/** Its own forward, about which it leans into a turn. */
const FORWARD = new Vector3(0, 0, 1)

interface DragonProps {
  districts: District[]
  places: Place[]
  /** Reduced motion: it holds still in one spot, its wings held at their tilt. */
  reducedMotion: boolean
}

/**
 * The dragon die easter egg, by day: a d20 with dragon wings (`DragonDie`)
 * flying a slow, wandering loop round the planet over every landmark
 * (`lib/world/dragon.ts`), flapping and gliding by turns and leaning into its
 * turns. It is drawn a little larger far out, as the bee is. Pressing it (not
 * dragging across it) rolls the d20 (`rollForVisitor`); while the roll is out
 * it is hidden, as if it had become the die tumbling across the screen, and a
 * press goes through to whatever is behind. Its invisible hit shape takes the
 * press and shows a pointer; the nearest thing under the pointer takes a
 * press. It keeps its own time on the canvas's clock, so it stops while the tab
 * is hidden, and holds still over open land under reduced motion. A pointer
 * extra: it is decorative, and the page's content is all reached without it.
 */
export function Dragon({ districts, places, reducedMotion }: DragonProps) {
  const canvas = useThree((state) => state.gl.domElement)
  const { roll } = useEggs()
  const rolling = roll !== null
  const hidden = useRef(rolling)
  hidden.current = rolling
  const body = useRef<Group>(null)
  const wingR = useRef<Group>(null)
  const wingL = useRef<Group>(null)
  const radius = useMemo(() => dragonRadius(places, districts), [places, districts])
  const hold = useMemo(() => dragonHold(places, districts), [places, districts])
  // In an e2e build a test may ask for its loop to start through a given spot, read once.
  const [hook] = useState(() => (typeof window === 'undefined' ? undefined : window.__eggDragon))
  const through = useMemo(() => {
    const at = dragonThrough(process.env.NEXT_PUBLIC_E2E, hook)
    return at ? dirOf(at) : undefined
  }, [hook])
  const hit = useMemo(() => ({ geometry: new SphereGeometry(1, 10, 8), material: new MeshBasicMaterial({ visible: false }) }), [])
  const time = useRef(0)
  const scratch = useMemo(
    () => ({ flight: { at: new Vector3(), ahead: new Vector3() }, up: new Vector3(), side: new Vector3(), basis: new Matrix4(), lean: new Quaternion(), screen: new Vector3() }),
    [],
  )

  useEffect(
    () => () => {
      hit.geometry.dispose()
      hit.material.dispose()
    },
    [hit],
  )
  // A roll hides it: no pointer over where it was.
  useEffect(() => {
    if (rolling) canvas.style.cursor = ''
  }, [rolling, canvas])
  useEffect(
    () => () => {
      canvas.style.cursor = ''
      if (TEST_HOOKS) window.__eggDragonScreen = undefined
    },
    [canvas],
  )

  useFrame(({ camera, size }, delta) => {
    const g = body.current
    if (!g) return
    const s = scratch
    let bank = 0
    let wing: number = DRAGON.open
    if (reducedMotion) {
      // Still, over its spot, facing along the ground.
      s.flight.at.copy(hold).multiplyScalar(radius)
      s.flight.ahead.set(0, 1, 0).addScaledVector(hold, -hold.y)
      if (s.flight.ahead.lengthSq() < 1e-6) s.flight.ahead.set(1, 0, 0)
      s.flight.ahead.normalize()
    } else {
      time.current += Math.min(delta, MAX_TICK)
      const t = time.current
      dragonAt(DRAGON_SEED, t, radius, s.flight, through)
      bank = dragonBank(DRAGON_SEED, t, through)
      wing = dragonWing(t)
    }
    s.up.copy(s.flight.at).normalize()
    // Its own +X, +Y and +Z (its front): right-handed, as the side is up × front; then leaned into its turn.
    s.side.crossVectors(s.up, s.flight.ahead).normalize()
    s.basis.makeBasis(s.side, s.up, s.flight.ahead)
    g.quaternion.setFromRotationMatrix(s.basis).multiply(s.lean.setFromAxisAngle(FORWARD, bank))
    g.position.copy(s.flight.at)
    g.scale.setScalar(MODEL_SCALE * bugScale(camera.position.length()))
    g.visible = !hidden.current
    if (wingR.current) wingR.current.rotation.z = wing
    if (wingL.current) wingL.current.rotation.z = -wing

    if (TEST_HOOKS) {
      if (hidden.current) window.__eggDragonScreen = undefined
      else {
        const front = g.position.clone().sub(camera.position).dot(s.up) < 0
        const p = s.screen.copy(g.position).project(camera)
        window.__eggDragonScreen = { x: ((p.x + 1) / 2) * size.width, y: ((1 - p.y) / 2) * size.height, front }
      }
    }
  })

  return (
    <group ref={body} name="dragon">
      <DragonDie wings={[wingR, wingL]} />
      <mesh
        name="dragon-hit"
        geometry={hit.geometry}
        material={hit.material}
        scale={DRAGON.hit}
        dispose={null}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (hidden.current) return
          e.stopPropagation()
          canvas.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          canvas.style.cursor = ''
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (hidden.current) return
          e.stopPropagation()
          if (isClick(e.delta)) rollForVisitor()
        }}
      />
    </group>
  )
}
