'use client'

import type { District, Place } from '@/content/types'
import { Bug } from './Bug'
import { RollStars } from './RollStars'

export interface EggsInWorldProps {
  districts: District[]
  places: Place[]
  /** The theme is night: the bug sleeps (it is not there) and the constellation that rolls the die is. */
  night: boolean
  reducedMotion: boolean
}

/** What the easter eggs put in the world: by day the bug wandering the planet, by night the stars that roll the die. */
export default function EggsInWorld({ districts, places, night, reducedMotion }: EggsInWorldProps) {
  return night ? <RollStars /> : <Bug districts={districts} places={places} reducedMotion={reducedMotion} />
}
