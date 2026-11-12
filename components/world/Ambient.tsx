'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Line,
  LineDashedMaterial,
  Matrix4,
  SphereGeometry,
  Vector3,
  type Material,
  type Mesh,
} from 'three'
import { scatter } from '@/content/sky'
import type { District, Place } from '@/content/types'
import { MODEL_SCALE } from '@/lib/world/camera'
import { easeShare, viewFade, type PlaceView } from '@/lib/world/starfield'
import type { Quality } from '@/lib/world/quality'
import { paddlePath, routes } from '@/lib/world/scatter'
import { restFraction, travellerFraction } from '@/lib/world/travellers'
import { celMaterial, glowMaterial, outlineMaterial } from './materials'
import { lookUniforms } from './lookUniforms'

/** Each route is drawn through this many points. */
const ROUTE_POINTS = 72
/** The route lines: dash and gap lengths in world units, and how solid they are. */
const DASH = { size: 0.02, gap: 0.022, opacity: 0.6 }
/** How fast a route's dashes fade into or out of a place's view, as a share of the way a second: settled in about 0.3 s. */
const DASH_EASE = 10
/** A traveller is a small ball; its thin outline stands this far proud of it. */
const TRAVELLER = { radius: 0.013, outline: 0.005, segments: [10, 8] as const }

/**
 * Six dashed routes arcing between the islands, each with a small traveller
 * (coloured by the district it leaves) moving along it on the shared clock
 * (`travellerFraction`). Travellers are left out at low quality; under reduced
 * motion (`still`) each rests high on its arc, where it stands in no place's
 * view of its landmark (`restFraction`). At a place (`view`), a route's dashes
 * and a traveller fade out where they would cross the view of the landmark or
 * crowd the camera (`viewFade`): close to a place camera, a few dashes showed
 * as long white streaks across the landmark. The dashes ease out on arrival
 * and back in on leaving, over about 0.3 s (at once under reduced motion).
 */
function Routes({ districts, places, quality, still, view }: { districts: District[]; places: Place[]; quality: Quality; still: boolean; view: PlaceView | null }) {
  const arcs = useMemo(() => routes(districts), [districts])
  const rests = useMemo(() => arcs.map((arc) => restFraction(arc, places, districts)), [arcs, places, districts])
  const lines = useMemo(() => {
    const material = new LineDashedMaterial({ color: scatter.route, dashSize: DASH.size, gapSize: DASH.gap, transparent: true, opacity: DASH.opacity, vertexColors: true })
    const geometries = arcs.map((arc) => {
      const g = new BufferGeometry().setFromPoints(Array.from({ length: ROUTE_POINTS }, (_, k) => arc.at(k / (ROUTE_POINTS - 1))))
      // White with an alpha per point, for fading the route out of a place's view.
      g.setAttribute('color', new BufferAttribute(new Float32Array(ROUTE_POINTS * 4).fill(1), 4))
      return g
    })
    const objects = geometries.map((g) => {
      const line = new Line(g, material)
      line.computeLineDistances()
      return line
    })
    return { material, geometries, objects }
  }, [arcs])
  useEffect(
    () => () => {
      lines.material.dispose()
      for (const g of lines.geometries) g.dispose()
    },
    [lines],
  )
  // Each point's alpha: where it is now, and where it is going (faded where it would cross the view of the place the visitor is at).
  const alphas = useMemo(
    () => lines.geometries.map((g) => ({ now: new Float32Array(g.getAttribute('position').count).fill(1), target: new Float32Array(g.getAttribute('position').count).fill(1) })),
    [lines],
  )
  const easing = useRef(false)
  useEffect(() => {
    const p = new Vector3()
    lines.geometries.forEach((g, i) => {
      const position = g.getAttribute('position')
      for (let k = 0; k < position.count; k++) alphas[i].target[k] = viewFade(p.fromBufferAttribute(position, k), view)
    })
    easing.current = true
  }, [lines, alphas, view])
  // The dashes ease to their new alpha, so arriving at or leaving a place pops nothing; under reduced motion, at once.
  useFrame((_, delta) => {
    if (!easing.current) return
    const share = easeShare(delta, DASH_EASE, still)
    let moving = false
    lines.geometries.forEach((g, i) => {
      const { now, target } = alphas[i]
      const color = g.getAttribute('color') as BufferAttribute
      for (let k = 0; k < now.length; k++) {
        const next = now[k] + (target[k] - now[k]) * share
        now[k] = Math.abs(target[k] - next) < 1e-3 ? target[k] : next
        if (now[k] !== target[k]) moving = true
        color.setW(k, now[k])
      }
      color.needsUpdate = true
    })
    easing.current = moving
  })

  const ball = useMemo(() => new SphereGeometry(TRAVELLER.radius, ...TRAVELLER.segments), [])
  useEffect(() => () => ball.dispose(), [ball])

  const travellers = useRef<Array<Mesh | null>>([])
  // What the travellers were last moved for; they move again only when the clock moves on, or they stop or start.
  const movedFor = useRef('')
  useFrame(() => {
    if (quality === 'low') return
    const t = lookUniforms.time.value
    const key = `${t}|${still}|${rests}|${view?.ground.x}`
    if (key === movedFor.current) return
    movedFor.current = key
    arcs.forEach((arc, i) => {
      const mesh = travellers.current[i]
      if (!mesh) return
      mesh.position.copy(arc.at(travellerFraction(t, i, still, rests[i])))
      // Shrunk away while it passes through the view of the place the visitor is at.
      const fade = viewFade(mesh.position, view)
      mesh.scale.setScalar(fade)
      mesh.visible = fade > 0.01
    })
  })

  const shell = 1 + TRAVELLER.outline / TRAVELLER.radius
  return (
    <>
      {lines.objects.map((line, i) => (
        <primitive key={arcs[i].from + arcs[i].to} object={line} />
      ))}
      {quality === 'high'
        ? arcs.map((arc, i) => {
            const from = districts.find((d) => d.id === arc.from)
            return (
              <mesh
                key={arc.from + arc.to}
                ref={(m) => {
                  travellers.current[i] = m
                }}
                geometry={ball}
                material={glowMaterial(from?.color ?? scatter.route)}
                dispose={null}
              >
                <mesh geometry={ball} material={outlineMaterial} scale={shell} dispose={null} />
              </mesh>
            )
          })
        : null}
    </>
  )
}

/** How the paddleboarder is built, in model units: a board, a body on it, a head and a paddle. Local +X is along the board. */
const BOARD = { length: 0.6, thickness: 0.05, width: 0.18 }
const BODY = { radius: 0.07, height: 0.34, at: 0.22 }
const HEAD = { radius: 0.09, at: 0.47 }
const PADDLE = { width: 0.03, length: 0.6, at: [0.14, 0.3, 0.05] as const }
/** The paddleboarder is a little smaller than a landmark. */
const FIGURE_SCALE = MODEL_SCALE * 0.9
/** How far the outline shells stand proud of each part, in model units. */
const OUTLINE = 0.02

type Size = [number, number, number]

/** One part of the figure with its thin outline: a copy of the same geometry grown by `OUTLINE` on every side. */
function Part({ geometry, material, size, position }: { geometry: BufferGeometry; material: Material; size: Size; position: Size }) {
  const shell = size.map((s) => 1 + (2 * OUTLINE) / s) as Size
  return (
    <mesh geometry={geometry} material={material} position={position} dispose={null}>
      <mesh geometry={geometry} material={outlineMaterial} scale={shell} dispose={null} />
    </mesh>
  )
}

const BASIS = new Matrix4()
const ACROSS = new Vector3()

/**
 * A generic paddleboarder, bobbing on the water and circling Home's coast. She
 * stays upright (her up is the surface normal) with the board pointing the way
 * she goes. Moves on the shared clock, so under reduced motion she sits still.
 */
function Paddleboarder({ home }: { home: District }) {
  const group = useRef<Group>(null)
  const parts = useMemo(
    () => ({
      board: new BoxGeometry(BOARD.length, BOARD.thickness, BOARD.width),
      body: new CylinderGeometry(BODY.radius, BODY.radius, BODY.height, 8),
      head: new SphereGeometry(HEAD.radius, 16, 12),
      paddle: new BoxGeometry(PADDLE.width, PADDLE.length, PADDLE.width),
    }),
    [],
  )
  useEffect(
    () => () => {
      for (const g of Object.values(parts)) g.dispose()
    },
    [parts],
  )

  const placedAt = useRef(-1)
  useFrame(() => {
    const g = group.current
    const t = lookUniforms.time.value
    if (!g || t === placedAt.current) return
    placedAt.current = t
    const { position, forward, up } = paddlePath(home, t)
    g.position.copy(position)
    // Board along +X, up along +Y, and +Z square to both (right-handed: x × y = z).
    g.quaternion.setFromRotationMatrix(BASIS.makeBasis(forward, up, ACROSS.crossVectors(forward, up)))
  })

  const { board, body, skin, blade } = scatter.paddle
  return (
    <group ref={group} scale={FIGURE_SCALE}>
      <Part
        geometry={parts.board}
        material={celMaterial({ color: board })}
        size={[BOARD.length, BOARD.thickness, BOARD.width]}
        position={[0, BOARD.thickness / 2, 0]}
      />
      <Part
        geometry={parts.body}
        material={celMaterial({ color: body })}
        size={[2 * BODY.radius, BODY.height, 2 * BODY.radius]}
        position={[0, BODY.at, 0]}
      />
      <Part
        geometry={parts.head}
        material={celMaterial({ color: skin })}
        size={[2 * HEAD.radius, 2 * HEAD.radius, 2 * HEAD.radius]}
        position={[0, HEAD.at, 0]}
      />
      <Part
        geometry={parts.paddle}
        material={celMaterial({ color: blade })}
        size={[PADDLE.width, PADDLE.length, PADDLE.width]}
        position={[...PADDLE.at]}
      />
    </group>
  )
}

/**
 * The small life between the islands: six dashed routes with a traveller on
 * each, and a paddleboarder circling Home's coast.
 */
export function Ambient({
  districts,
  places,
  quality,
  still,
  view = null,
}: {
  districts: District[]
  places: Place[]
  quality: Quality
  still: boolean
  view?: PlaceView | null
}) {
  const home = districts.find((d) => d.id === 'home')
  return (
    <>
      <Routes districts={districts} places={places} quality={quality} still={still} view={view} />
      {home ? <Paddleboarder home={home} /> : null}
    </>
  )
}
