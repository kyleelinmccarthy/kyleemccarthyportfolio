'use client'

import { BEE_CONSTELLATION, ROLL_CONSTELLATION } from '@/content/eggs'
import type { District, Place } from '@/content/types'
import { Bug } from './Bug'
import { eggs, rollForVisitor } from './eggStore'
import { PressStars } from './PressStars'

export interface EggsInWorldProps {
  districts: District[]
  places: Place[]
  /** The theme is night: the bug sleeps (it is not there) and the two constellations that take a press are. */
  night: boolean
  reducedMotion: boolean
}

/**
 * What the easter eggs put in the world: by day the bug wandering the planet;
 * by night the stars of "The Natural 20", which roll the die, and of "The
 * Bumblebee", which count a bug as catching the bee does.
 */
export default function EggsInWorld({ districts, places, night, reducedMotion }: EggsInWorldProps) {
  if (night)
    return (
      <>
        <PressStars name={ROLL_CONSTELLATION} onPress={() => rollForVisitor()} />
        <PressStars name={BEE_CONSTELLATION} onPress={(at) => eggs.squash(at)} />
      </>
    )
  return <Bug districts={districts} places={places} reducedMotion={reducedMotion} />
}
