'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { DIE, SQUASH_SAY_MS, eggWords } from '@/content/eggs'
import { keyIsThePages } from '@/lib/keys'
import { NOTHING_TYPED, typeKey } from '@/lib/eggs/typed'
import { PHONE_WIDTH } from '@/lib/world/quality'
import { Bursts, type Burst, type BurstKind } from './Bursts'
import { Die } from './Die'
import { eggs, rollForVisitor, useEggs, type ScreenPoint } from './eggStore'

/** The id of the eggs' live region: what a screen reader hears of a catch or a roll. */
export const EGG_SAID_ID = 'egg-said'
/** The space kept between the bug's words and the screen's edge, and over the point it was caught at, in pixels. */
const EDGE = 16
const OVER = 14

/** What a roll says: its result, and a line more for a natural 20 or a natural 1. */
export function rollWords(value: number): { result: string; more: string | null } {
  return { result: eggWords.rolled(value), more: value === 20 ? eggWords.natural20 : value === 1 ? eggWords.natural1 : null }
}

/** The bug's words, where it was caught: over the point, kept inside the screen; under it when there is no room above. */
function CatchBubble({ at, count }: { at: ScreenPoint; count: number }) {
  const el = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ left: number; top: number; side: 'above' | 'below'; tail: number } | null>(null)
  useLayoutEffect(() => {
    const box = el.current
    if (!box) return
    const { offsetWidth: w, offsetHeight: h } = box
    const left = Math.min(Math.max(at.x - w / 2, EDGE), Math.max(EDGE, window.innerWidth - w - EDGE))
    const above = at.y - OVER - h
    // The tail points at the bug, but never past the bubble's rounded corners.
    const tail = Math.min(Math.max(at.x - left, 14), w - 14)
    setPlace(above >= EDGE ? { left, top: above, side: 'above', tail } : { left, top: at.y + OVER, side: 'below', tail })
  }, [at])
  return (
    <div
      ref={el}
      className="egg-bubble"
      aria-hidden
      data-side={place?.side}
      style={place ? ({ left: place.left, top: place.top, '--tail': `${place.tail}px` } as CSSProperties) : { visibility: 'hidden' }}
    >
      <span className="egg-bubble-words">{eggWords.feature}</span>
      <span className="egg-bubble-count">{eggWords.squashed(count)}</span>
    </div>
  )
}

/** The roll under way: the die tumbling in and coming to rest, then what it came up, and fireworks for a 20. */
function Roll({ value, still, onSay, onFireworks }: { value: number; still: boolean; onSay(text: string): void; onFireworks(): void }) {
  const [landed, setLanded] = useState(false)
  const [size] = useState(() => (window.innerWidth <= PHONE_WIDTH ? DIE.phoneSize : DIE.size))
  const words = rollWords(value)
  const land = useCallback(() => setLanded(true), [])
  useEffect(() => {
    if (!landed) return
    eggs.landed()
    onSay(words.more ? `${words.result} ${words.more}` : words.result)
    if (value === 20 && !still) onFireworks()
    const id = window.setTimeout(() => eggs.putAway(), value === 20 ? DIE.showMs20 : DIE.showMs)
    return () => window.clearTimeout(id)
  }, [landed, value, still, onSay, onFireworks, words.result, words.more])
  return (
    <>
      <Die value={value} still={still} size={size} onLanded={land} />
      {landed ? (
        <div
          className="egg-roll"
          aria-hidden
          data-natural={value === 20 ? '20' : value === 1 ? '1' : undefined}
          style={{ left: `${DIE.settle.x * 100}%`, top: `calc(${DIE.settle.y * 100}% + ${size / 2 + 14}px)` }}
        >
          <span className="egg-roll-result">{words.result}</span>
          {words.more ? <span className="egg-roll-more">{words.more}</span> : null}
        </div>
      ) : null}
    </>
  )
}

/**
 * What the two easter eggs put over the page, once the world is drawn: the
 * bug's words where it was caught (with how many have been caught on this
 * device) and its confetti, the die rolling across the screen and what it
 * came up, the fireworks for a natural 20, and one polite live region that
 * tells a screen reader each catch and each roll in words. Typing `roll`
 * anywhere outside a field rolls the die, by day or night (`lib/eggs/typed.ts`),
 * so a keyboard can reach it. Under reduced motion there is no confetti,
 * tumbling or fireworks: the words and the die at rest simply appear.
 */
export function EggsOnPage({ reducedMotion }: { reducedMotion: boolean }) {
  const { caught, roll } = useEggs()
  const [told, setTold] = useState('')
  const [bursts, setBursts] = useState<Burst[]>([])
  const nextBurst = useRef(0)
  const say = useCallback((text: string) => setTold((before) => (before === text ? `${text} ` : text)), [])
  const burst = useCallback((b: BurstKind) => setBursts((all) => [...all, { ...b, id: ++nextBurst.current }]), [])
  const burstDone = useCallback((id: number) => setBursts((all) => all.filter((b) => b.id !== id)), [])
  const fireworks = useCallback(() => burst({ kind: 'fireworks' }), [burst])

  useEffect(() => eggs.load(), [])
  // Everything put away when the world goes.
  useEffect(
    () => () => {
      eggs.quietCatch()
      eggs.putAway()
    },
    [],
  )

  // The typed word.
  useEffect(() => {
    let typed = NOTHING_TYPED
    const onKey = (e: KeyboardEvent) => {
      const next = typeKey(typed, { key: e.key, at: e.timeStamp, modified: e.ctrlKey || e.altKey || e.metaKey, pages: keyIsThePages(e.target) }, eggWords.rollWord)
      typed = next.typed
      if (next.spelled) rollForVisitor()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // A catch: its words, told and shown for a while, and its confetti.
  useEffect(() => {
    if (!caught) return
    say(`${eggWords.feature} ${eggWords.squashed(caught.count)}.`)
    if (!reducedMotion) burst({ kind: 'confetti', at: caught.at })
    const id = window.setTimeout(() => eggs.quietCatch(), SQUASH_SAY_MS)
    return () => window.clearTimeout(id)
  }, [caught, reducedMotion, say, burst])

  return (
    <>
      <div id={EGG_SAID_ID} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {told}
      </div>
      {bursts.length > 0 ? <Bursts bursts={bursts} onDone={burstDone} /> : null}
      {caught ? <CatchBubble key={caught.n} at={caught.at} count={caught.count} /> : null}
      {roll ? <Roll key={roll.n} value={roll.value} still={reducedMotion} onSay={say} onFireworks={fireworks} /> : null}
    </>
  )
}
