'use client'

import { useState } from 'react'
import { BEE_CONSTELLATION, ROLL_CONSTELLATION } from '@/content/eggs'
import type { District, Place } from '@/content/types'
import { dragonOn } from '@/lib/eggs/hooks'
import { Bug } from './Bug'
import { Dragon } from './Dragon'
import { eggs, rollForVisitor } from './eggStore'
import { PressStars } from './PressStars'

export interface EggsInWorldProps {
  districts: District[]
  places: Place[]
  /** The theme is night: the bug and the dragon die sleep (they are not there) and the two constellations that take a press are. */
  night: boolean
  /** The planet's overview is showing (no district or place open): only then are the bug and the dragon die out. */
  overview: boolean
  reducedMotion: boolean
}

/**
 * What the easter eggs put in the world, two by day and two by night. By day,
 * while the overview is showing: the bug wandering the planet (pressing it
 * counts a bug) and the dragon die flying round it (pressing it rolls the d20).
 * By night: the stars of "The Natural 20", which roll the die, and of "The
 * Bumblebee", which count a bug as catching the bee does.
 */
export default function EggsInWorld({ districts, places, night, overview, reducedMotion }: EggsInWorldProps) {
  // In an e2e build the dragon die is out only when a test asks for it, read once.
  const [dragonHook] = useState(() => (typeof window === 'undefined' ? undefined : window.__eggDragon))
  if (night)
    return (
      <>
        <PressStars name={ROLL_CONSTELLATION} onPress={() => rollForVisitor()} />
        <PressStars name={BEE_CONSTELLATION} onPress={(at) => eggs.squash(at)} />
      </>
    )
  if (!overview) return null
  return (
    <>
      <Bug districts={districts} places={places} reducedMotion={reducedMotion} />
      {dragonOn(process.env.NEXT_PUBLIC_E2E, dragonHook) ? <Dragon districts={districts} places={places} reducedMotion={reducedMotion} /> : null}
    </>
  )
}
