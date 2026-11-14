'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { DIE } from '@/content/eggs'
import { blend } from '@/lib/world/kit'
import { d20Faces, dieFlight, faceTone, showing, tumble, tumbleAxis, type Tone } from '@/lib/eggs/d20'

/** A face laid out flat: an equilateral triangle this wide, as a share of its edge, and its height. */
const TRIANGLE = { width: 100, height: 100 * (Math.sqrt(3) / 2) }
/** An icosahedron 1 from its middle to each corner has edges this long. */
const EDGE = 1 / Math.sin((2 * Math.PI) / 5)

/** A matrix as CSS's `matrix3d()` takes it: column by column. */
const css = (m: Matrix4) => `matrix3d(${m.elements.map((v) => (Math.abs(v) < 1e-10 ? 0 : +v.toFixed(6))).join(',')})`

/** The die's colours for each band of light, its numbers and its edges, from the palette. */
const COLORS: Record<Tone, string> & { number: string; edge: string } = {
  lit: blend(DIE.colors.lit.from, DIE.colors.lit.toward, DIE.colors.lit.k),
  mid: blend(DIE.colors.mid.from, DIE.colors.mid.toward, DIE.colors.mid.k),
  shade: blend(DIE.colors.shade.from, DIE.colors.shade.toward, DIE.colors.shade.k),
  number: DIE.colors.number,
  edge: DIE.colors.edge,
}

interface DieProps {
  value: number
  /** Reduced motion: it is simply there, at rest, showing its number. */
  still: boolean
  /** Its size across, in pixels. */
  size: number
  /** It has come to rest (at once, when still). */
  onLanded(): void
}

/**
 * The d20, drawn in the page's own 3D: twenty triangular faces (`d20Faces`),
 * each a small picture of its number, laid on the faces of an icosahedron by
 * CSS transforms. Faces turned away are not drawn, so the solid needs no
 * sorting. It tumbles in from the left, bouncing, and settles over the planet
 * with `value` square to the visitor (`tumble`, `dieFlight`); every frame each
 * face takes the colour of the light it is turned to (`faceTone`), as a cel
 * shader's bands. Under reduced motion it simply sits at rest. It moves on the
 * page's animation frames, which the browser stops while the tab is hidden;
 * it lands at once if it comes back late. Decorative: the result is told in
 * words (`EggsOnPage`).
 */
export function Die({ value, still, size, onLanded }: DieProps) {
  const root = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const fills = useRef<Array<SVGPolygonElement | null>>([])
  const faces = d20Faces()
  const edge = (EDGE * size) / 2
  // Each face carried from its flat picture onto the solid: its centroid at its place, its right, down and out.
  const layout = useMemo(
    () =>
      faces.map((f) => {
        const at = f.centre.clone().multiplyScalar(size / 2)
        return css(new Matrix4().makeBasis(f.right, f.down, f.normal).setPosition(at))
      }),
    [faces, size],
  )
  const landed = useRef(onLanded)
  landed.current = onLanded

  useEffect(() => {
    const el = root.current
    const solid = body.current
    if (!el || !solid) return
    const axis = tumbleAxis(Math.random)
    const turn = new Quaternion()
    const normal = new Vector3()
    const matrix = new Matrix4()
    const draw = (t: number) => {
      const view = { width: window.innerWidth, height: window.innerHeight }
      const { x, y } = dieFlight(t, view, { settle: DIE.settle, bounces: DIE.bounces, hop: DIE.hop, size })
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      if (t >= 1) turn.copy(showing(value))
      else tumble(t, value, axis, DIE.turns, turn)
      solid.style.transform = css(matrix.makeRotationFromQuaternion(turn))
      faces.forEach((f, i) => {
        const fill = fills.current[i]
        if (fill) fill.style.fill = COLORS[faceTone(normal.copy(f.normal).applyQuaternion(turn))]
      })
    }
    if (still) {
      draw(1)
      landed.current()
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = (now - start) / DIE.tumbleMs
      draw(Math.min(1, t))
      if (t >= 1) {
        landed.current()
        return
      }
      frame = window.requestAnimationFrame(step)
    }
    draw(0)
    frame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frame)
  }, [value, still, size, faces])

  return (
    <div ref={root} className="egg-die" aria-hidden style={{ width: 0, height: 0 }}>
      <div ref={body} className="egg-die-body">
        {faces.map((f, i) => (
          <svg
            key={f.value}
            className="egg-die-face"
            viewBox={`0 0 ${TRIANGLE.width} ${TRIANGLE.height}`}
            width={edge}
            height={(edge * TRIANGLE.height) / TRIANGLE.width}
            style={{
              left: -edge / 2,
              top: (-edge * TRIANGLE.height * (2 / 3)) / TRIANGLE.width,
              // About its centroid, which `layout` carries to the face's middle on the solid.
              transformOrigin: `${edge / 2}px ${(edge * TRIANGLE.height * (2 / 3)) / TRIANGLE.width}px`,
              transform: layout[i],
            }}
          >
            <polygon
              ref={(el) => {
                fills.current[i] = el
              }}
              points={`50,1.5 98.5,${TRIANGLE.height - 1} 1.5,${TRIANGLE.height - 1}`}
              fill={COLORS.mid}
              stroke={COLORS.edge}
              strokeWidth={3}
              strokeLinejoin="round"
            />
            <text x="50" y={TRIANGLE.height * 0.69} textAnchor="middle" fill={COLORS.number} className="egg-die-number">
              {f.value}
            </text>
            {/* A 6 and a 9 are underlined, as on a real die, so neither is taken for the other. */}
            {f.value === 6 || f.value === 9 ? <rect x="42" y={TRIANGLE.height * 0.74} width="16" height="3" rx="1.5" fill={COLORS.number} /> : null}
          </svg>
        ))}
      </div>
    </div>
  )
}
