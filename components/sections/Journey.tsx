'use client'

import { CinematicJourney, type Scene } from '@/components/journey/CinematicJourney'
import { StepsRoom, StepsSetting } from '@/components/rooms/Steps'
import { WindowRoom, WindowSetting } from '@/components/rooms/Window'
import { FloorRoom, FloorSetting } from '@/components/rooms/Floor'
import { DeskRoom, DeskSetting } from '@/components/rooms/Desk'
import { WayOutRoom } from '@/components/rooms/WayOut'

// The floor plan (docs/superpowers/specs/2026-08-16-museum-overhaul-design.md):
// up the steps, through the door, right along the gallery wall, right again
// to the desk, then in to the way out.
export function Journey() {
  const scenes: Scene[] = [
    {
      id: 'steps',
      dir: 'start',
      node: <StepsRoom />,
      setting: <StepsSetting />,
      // The only room on the outside of the front door.
      backdrop: 'exterior',
    },
    // 'in', not 'up': you walk THROUGH the front door, you don't pan up past
    // it. The zoom crossfade puts the next room straight ahead of you, which
    // is what stepping over a threshold actually feels like.
    { id: 'window', dir: 'in', node: <WindowRoom />, setting: <WindowSetting /> },
    { id: 'floor', dir: 'right', node: <FloorRoom />, setting: <FloorSetting /> },
    { id: 'desk', dir: 'right', node: <DeskRoom />, setting: <DeskSetting /> },
    // The door is the last beat of the home scroll only (spec §5) — /connect
    // renders its own copy without it.
    { id: 'way-out', dir: 'in', node: <WayOutRoom /> },
  ]
  return <CinematicJourney scenes={scenes} />
}
