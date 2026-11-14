'use client'

import { useEffect, useRef } from 'react'
import { arrivalCopy, hero } from '@/content/about'
import { ARRIVAL } from '@/lib/arrival'
import { arrival, useArrivalStage } from './arrivalStore'
import { PROOF_ROW, Proof } from './Proof'

/** How many of the arrival's components are mounted: leaving the home page while it plays ends it. */
let mounted = 0

/**
 * Where `from` must move, and how much it must shrink, to sit exactly on
 * `to`: their top-left corners together and its type at `to`'s size. Set as
 * `--land-x`, `--land-y` and `--land-s`, which the settle (`arrival-land`,
 * globals.css) moves it by. Measured before the settle begins, while `from`
 * stands where it is laid out.
 */
function landOn(from: HTMLElement | null, to: Element | null | undefined) {
  if (!from || !to) return
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  const scale = parseFloat(getComputedStyle(to).fontSize) / parseFloat(getComputedStyle(from).fontSize)
  if (!Number.isFinite(scale) || scale <= 0) return
  from.style.setProperty('--land-x', `${b.left - a.left}px`)
  from.style.setProperty('--land-y', `${b.top - a.top}px`)
  from.style.setProperty('--land-s', String(scale))
}

/**
 * The arrival's statement, over the sky on the home page's first load in a
 * visit (the init script decides, `arrivalInitScript`): the headline in large
 * type with the proof figures counting up under it, which then settle onto
 * the header's own headline and proof row and give way to them. It runs in
 * CSS on the timeline's times (globals.css, `.arrival`), so it plays even
 * before this script arrives; this measures where it settles and listens for
 * the skip. Without the mark on <html> it is not shown at all.
 *
 * It is decoration: the header's headline and figures are the real text,
 * there all along. The one thing exposed is the Skip control, a real button;
 * any key, click or tap skips too, and links and buttons go on working while
 * it plays (the press that follows one skips it as well). Under reduced
 * motion it never plays.
 */
export function Arrival() {
  const playing = useArrivalStage() !== 'done'
  const line = useRef<HTMLParagraphElement>(null)
  const figures = useRef<HTMLDivElement>(null)

  // Leaving the home page while it plays ends it (counted, so React's development remount does not).
  useEffect(() => {
    mounted++
    return () => {
      mounted--
      window.setTimeout(() => {
        if (mounted === 0) arrival.skip()
      })
    }
  }, [])

  useEffect(() => {
    if (!playing) return
    const skip = () => arrival.skip()
    const land = () => {
      const row = document.querySelector(`[${PROOF_ROW}]`)
      landOn(line.current, row?.previousElementSibling)
      landOn(figures.current?.firstElementChild as HTMLElement | null, row)
    }
    land()
    // Again just before it settles, once the type has surely arrived, and whenever the window changes.
    const ms = arrival.elapsed(performance.now())
    const settle = window.setTimeout(land, Math.max(0, ARRIVAL.settle.at - ms - 60))
    window.addEventListener('resize', land)
    window.addEventListener('keydown', skip, true)
    window.addEventListener('pointerdown', skip, true)
    return () => {
      window.clearTimeout(settle)
      window.removeEventListener('resize', land)
      window.removeEventListener('keydown', skip, true)
      window.removeEventListener('pointerdown', skip, true)
    }
  }, [playing])

  return (
    <div className="arrival">
      <div aria-hidden className="arrival-statement">
        <p ref={line} className="arrival-line">
          {hero.headline}
        </p>
        <div ref={figures} className="arrival-figures">
          <Proof counting />
        </div>
      </div>
      <button type="button" className="arrival-skip hud-btn glass" onClick={() => arrival.skip()}>
        {arrivalCopy.skip}
      </button>
    </div>
  )
}
