'use client'

import { CinematicJourney, type Scene } from '@/components/journey/CinematicJourney'
import {
  ArtRoom,
  ArtSetting,
  OffTheClockRoom,
  OffTheClockSetting,
  SayHiRoom,
  ShelfRoom,
  ShelfSetting,
} from './libraryRooms'

/**
 * The library, walked through rather than scrolled past.
 *
 * It was a single column of cards on a plain page while the rest of the site
 * was a building — so the fun half of the portfolio was the least interesting
 * thing in it. It runs on the same camera as the home journey now: the shelf,
 * along the art wall, along the flash, back to the table, then the mailbox.
 *
 * Everything the camera gives the home page comes with it for free — the
 * per-room backdrop, the stacked fallback on mobile and under reduced motion,
 * and a plain readable page with JS off.
 */
export function LibraryJourney() {
  const scenes: Scene[] = [
    { id: 'shelf', title: 'the shelf', dir: 'start', node: <ShelfRoom />, setting: <ShelfSetting />, backdrop: 'library' },
    // Right along the wall, the way you walk a gallery — the same move the
    // home page's showcase uses, for the same reason.
    { id: 'art', title: 'the art', dir: 'right', node: <ArtRoom />, setting: <ArtSetting />, backdrop: 'library' },
    // Down, off the wall and back to the table.
    {
      id: 'off-the-clock',
      title: 'off the clock',
      dir: 'down',
      node: <OffTheClockRoom />,
      setting: <OffTheClockSetting />,
      backdrop: 'library',
    },
    { id: 'say-hi', title: 'the mailbox', dir: 'in', node: <SayHiRoom />, setting: <ShelfSetting />, backdrop: 'library' },
  ]
  return <CinematicJourney scenes={scenes} />
}
