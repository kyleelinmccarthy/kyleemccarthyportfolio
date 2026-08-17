'use client'

import { CinematicJourney, type Scene } from '@/components/journey/CinematicJourney'
import {
  ArtRoom,
  ArtSetting,
  FlashRoom,
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
    { id: 'shelf', dir: 'start', node: <ShelfRoom />, setting: <ShelfSetting />, backdrop: 'library' },
    // Right along the wall, the way you walk a gallery — the same move the
    // home page's showcase uses, for the same reason.
    // Five media to walk past, so this room claims three times the scroll of a
    // room that says one thing. Its dwell is what the paging runs on.
    { id: 'art', dir: 'right', node: <ArtRoom />, setting: <ArtSetting />, weight: 3, backdrop: 'library' },
    { id: 'flash', dir: 'right', node: <FlashRoom />, setting: <ArtSetting />, backdrop: 'library' },
    // Down, off the wall and back to the table.
    {
      id: 'off-the-clock',
      dir: 'down',
      node: <OffTheClockRoom />,
      setting: <OffTheClockSetting />,
      backdrop: 'library',
    },
    { id: 'say-hi', dir: 'in', node: <SayHiRoom />, setting: <ShelfSetting />, backdrop: 'library' },
  ]
  return <CinematicJourney scenes={scenes} />
}
