'use client'

import { useEffect, useRef, useState } from 'react'
import { announcedAs, shouldAnnounce, spoken, type GuideRoute } from '@/lib/world/guide'
import { GuestPicker } from './GuestPicker'
import { GuideBubble, useGuideLine } from './GuideBubble'

/** The id of the guide's live region: what a screen reader hears her say. */
export const GUIDE_SAID_ID = 'guide-said'

/**
 * Everything the characters put over the page, while the canvas draws them:
 * the guide's speech bubble (with the character control at its corner) in its
 * dock, the one polite live region a screen reader hears her through, and the
 * character picker.
 *
 * The live region is apart from the bubble, which moves and hides while the
 * camera flies (a change inside a hidden live region is never announced). It
 * is written once for each new line (`shouldAnnounce`): not again for a change
 * of theme, never while hints are hidden.
 */
export function GuideLayer({ route }: { route: GuideRoute }) {
  const { says, closed, close } = useGuideLine(route)
  const [announced, setAnnounced] = useState('')
  const heard = useRef<string | null>(null)
  useEffect(() => {
    if (!says) {
      // Silent: nothing is said, and the next line is heard even if it was heard before hints were hidden.
      heard.current = null
      setAnnounced('')
      return
    }
    if (!shouldAnnounce(heard.current, says)) return
    heard.current = announcedAs(says)
    setAnnounced(`Kylee says: ${spoken(says)}`)
  }, [says])
  return (
    <>
      <div id={GUIDE_SAID_ID} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announced}
      </div>
      <div className="guide-dock" data-where={route.kind === 'place' ? 'place' : 'overview'}>
        <GuideBubble route={route} says={says} closed={closed} onAlone={close} />
      </div>
      <GuestPicker />
    </>
  )
}
