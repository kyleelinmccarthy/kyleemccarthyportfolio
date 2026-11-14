'use client'

import { useEffect, useRef } from 'react'
import { CONFETTI, FIREWORKS } from '@/content/eggs'
import { confetti, fireworks, pieceAt, shellAt, showLength, type Piece, type Point, type Shell } from '@/lib/eggs/particles'
import { mulberry32 } from '@/lib/world/rng'

/** A burst to set off: confetti popped at a point, or a show of fireworks. */
export type BurstKind = { kind: 'confetti'; at: Point } | { kind: 'fireworks' }
/** One burst on the screen; `id` tells them apart. */
export type Burst = BurstKind & { id: number }

/** The most pixels drawn per CSS pixel: the bursts are soft, and need no more. */
const MOST_DPR = 2
/** A firework's spark leaves a short streak behind it: where it was this long ago, in seconds. */
const STREAK = 0.07

/** A burst laid out, with when it started (milliseconds) and how long it lasts (seconds). */
type Laid = { id: number; start: number; seconds: number } & ({ kind: 'confetti'; at: Point; pieces: Piece[] } | { kind: 'fireworks'; shells: Shell[] })

/** Lays a burst out for a screen `view`, from a seed of its own. */
function lay(burst: Burst, now: number, view: { width: number; height: number }): Laid {
  const rand = mulberry32(Math.floor(now) ^ (burst.id * 2654435761))
  if (burst.kind === 'confetti') return { id: burst.id, kind: 'confetti', at: burst.at, start: now, seconds: CONFETTI.seconds, pieces: confetti(rand, CONFETTI) }
  return { id: burst.id, kind: 'fireworks', start: now, seconds: showLength(FIREWORKS), shells: fireworks(rand, view, FIREWORKS) }
}

/** Draws `burst` at `t` seconds in. */
function draw(ctx: CanvasRenderingContext2D, burst: Laid, t: number) {
  if (burst.kind === 'confetti') {
    ctx.globalCompositeOperation = 'source-over'
    for (const p of burst.pieces) {
      const now = pieceAt(p, burst.at, t, CONFETTI)
      if (now.alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = now.alpha
      ctx.translate(now.x, now.y)
      ctx.rotate(now.turn)
      // A flutter: it turns over, so it narrows and widens.
      ctx.scale(1, Math.cos(now.turn * 1.7))
      ctx.fillStyle = p.color
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height)
      ctx.restore()
    }
    return
  }
  // Light adds to light.
  ctx.globalCompositeOperation = 'lighter'
  for (const shell of burst.shells) {
    const now = shellAt(shell, t, FIREWORKS)
    ctx.fillStyle = shell.color
    ctx.strokeStyle = shell.color
    if (now.phase === 'rising') {
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(now.at.x, now.at.y, 2.2, 0, Math.PI * 2)
      ctx.fill()
    } else if (now.phase === 'burst') {
      const before = shellAt(shell, t - STREAK, FIREWORKS)
      const tails = before.phase === 'burst' ? before.sparks : null
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      for (let i = 0; i < now.sparks.length; i++) {
        const p = now.sparks[i]
        ctx.globalAlpha = now.alpha * 0.85
        ctx.beginPath()
        ctx.moveTo(tails ? tails[i].x : shell.at.x, tails ? tails[i].y : shell.at.y)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
        ctx.globalAlpha = now.alpha * 0.25
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      // The flash at its heart, gone in a moment.
      if (now.age < 0.18) {
        ctx.globalAlpha = (1 - now.age / 0.18) * 0.5
        ctx.beginPath()
        ctx.arc(shell.at.x, shell.at.y, 18, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.globalAlpha = 1
}

/**
 * The eggs' bursts, drawn on one plain 2D canvas over the world and under the
 * page's panels: the confetti a caught bug pops into and the fireworks of a
 * natural 20 (`lib/eggs/particles.ts`). Mounted only while there is a burst to
 * draw; it draws on the page's animation frames until the last one is over,
 * then hands each back (`onDone`) and stops. A tab hidden mid-burst ends it.
 * Decorative, never pressed, and never mounted under reduced motion.
 */
export function Bursts({ bursts, onDone }: { bursts: Burst[]; onDone(id: number): void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const laid = useRef(new Map<number, Laid>())
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) {
      for (const b of bursts) done.current(b.id)
      return
    }
    const now = performance.now()
    const view = { width: window.innerWidth, height: window.innerHeight }
    for (const b of bursts) if (!laid.current.has(b.id)) laid.current.set(b.id, lay(b, now, view))
    for (const id of [...laid.current.keys()]) if (!bursts.some((b) => b.id === id)) laid.current.delete(id)

    const dpr = Math.min(MOST_DPR, window.devicePixelRatio || 1)
    el.width = Math.round(view.width * dpr)
    el.height = Math.round(view.height * dpr)
    let frame = 0
    const step = (time: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, view.width, view.height)
      for (const b of laid.current.values()) {
        const t = (time - b.start) / 1000
        if (t >= b.seconds) {
          laid.current.delete(b.id)
          done.current(b.id)
        } else draw(ctx, b, Math.max(0, t))
      }
      if (laid.current.size > 0) frame = window.requestAnimationFrame(step)
    }
    frame = window.requestAnimationFrame(step)
    const hidden = () => {
      if (document.visibilityState !== 'hidden') return
      for (const id of [...laid.current.keys()]) done.current(id)
      laid.current.clear()
    }
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [bursts])

  return <canvas ref={canvas} className="egg-bursts" aria-hidden />
}
