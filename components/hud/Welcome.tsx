'use client'

import { Component, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { GUIDE_FIGURE, guestPicture } from '@/lib/guests'
import { WELCOME_TIMING, welcomeStage, type WelcomeStage } from '@/lib/world/welcome'
import { ChangeCharacter } from './ChangeCharacter'
import { useCompanions } from './companionStore'

// The live pair is its own chunk, fetched only when it is first wanted, and never on the server: it never delays the world.
const PairCanvas = dynamic(() => import('@/components/world/PairCanvas').then((m) => m.PairCanvas), { ssr: false })

/** The size of the stills, as the guests' pictures are taken (192 by 240). */
const STILL = { width: 192, height: 240 }

/** Anything thrown while fetching or making the live pair (no second WebGL context, a chunk that would not load) hands over to the stills. */
class PairBoundary extends Component<{ onError(): void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** The pair as still pictures, where a live canvas cannot be had: the visitor's character as it is now, and the guide's figure. */
function Stills() {
  const { guest } = useCompanions()
  return (
    <div className="welcome-stills">
      <Image src={guestPicture(guest)} alt="" width={STILL.width} height={STILL.height} unoptimized />
      <Image src={GUIDE_FIGURE} alt="" width={STILL.width} height={STILL.height} unoptimized />
    </div>
  )
}

/**
 * The welcome pair: while the guide's greeting is open (`welcomeShows`), she
 * and the visitor's own character pop up large beside her bubble, waving, a
 * moment after it appears, and shrink away when it goes (`welcomeStage`).
 * Under reduced motion they simply appear and go, and stand without waving.
 *
 * They are drawn live in a small canvas of their own (`PairCanvas`), the
 * visitor's character as it is chosen now; where that cannot be had, as two
 * still pictures. The figures are decorative (what she says is heard from
 * `GuideLayer`'s live region) and take no presses but the visitor's own: the
 * one thing exposed is the character control under it (`ChangeCharacter`),
 * which reaches up over the figure, so pressing the figure opens the picker
 * too. While it shows, it is the character control, in place of the
 * bubble's. No map label shows under the pair (`data-covers-labels`).
 */
export function Welcome({ shows, reducedMotion }: { shows: boolean; reducedMotion: boolean }) {
  const [stage, setStage] = useState<WelcomeStage>(shows ? 'in' : 'gone')
  const [still, setStill] = useState(false)
  const fail = useCallback(() => setStill(true), [])
  const { guest } = useCompanions()

  // Its next stage, taken as it renders (not an effect later), so it starts to go the moment the greeting does.
  const [asked, setAsked] = useState({ shows, reducedMotion })
  if (asked.shows !== shows || asked.reducedMotion !== reducedMotion) {
    setAsked({ shows, reducedMotion })
    setStage(welcomeStage(shows, stage, reducedMotion))
  }
  // Gone once it has shrunk away.
  useEffect(() => {
    if (stage !== 'out') return
    const id = window.setTimeout(() => setStage('gone'), WELCOME_TIMING.outMs)
    return () => window.clearTimeout(id)
  }, [stage])

  if (stage === 'gone') return null
  const timing = {
    '--welcome-delay': `${WELCOME_TIMING.delayMs}ms`,
    '--welcome-in': `${WELCOME_TIMING.inMs}ms`,
    '--welcome-out': `${WELCOME_TIMING.outMs}ms`,
  } as CSSProperties
  return (
    <div className="welcome" data-covers-labels data-stage={stage} data-still={still ? '' : undefined} inert={stage === 'out'} style={timing}>
      <div aria-hidden className="welcome-figures">
        {still ? (
          <Stills />
        ) : (
          <PairBoundary onError={fail}>
            <PairCanvas guest={guest} waving={!reducedMotion} onFail={fail} />
          </PairBoundary>
        )}
      </div>
      <ChangeCharacter kind="pair" active={stage === 'in'} />
    </div>
  )
}
