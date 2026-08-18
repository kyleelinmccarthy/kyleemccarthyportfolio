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
      title: 'the front step',
      dir: 'start',
      node: <StepsRoom />,
      setting: <StepsSetting />,
      // The only room on the outside of the front door.
      backdrop: 'exterior',
    },
    // 'in', not 'up': you walk THROUGH the front door, you don't pan up past
    // it. The zoom crossfade puts the next room straight ahead of you, which
    // is what stepping over a threshold actually feels like.
    { id: 'window', title: 'the way in', dir: 'in', node: <WindowRoom />, setting: <WindowSetting />, backdrop: 'entrance' },
    // Seven pieces to walk past, so this room claims four times the scroll of
    // a room that says one sentence. Without it, paging raced.
    { id: 'floor', title: 'the work', dir: 'right', node: <FloorRoom />, setting: <FloorSetting />, weight: 4, backdrop: 'showcase' },
    { id: 'desk', title: 'the desk', dir: 'right', node: <DeskRoom />, setting: <DeskSetting />, backdrop: 'desk' },
    // The door is the last beat of the home scroll only (spec §5) — /connect
    // renders its own copy without it.
    { id: 'way-out', title: 'the way out', dir: 'in', node: <WayOutRoom />, backdrop: 'endoftour' },
  ]
  return <CinematicJourney scenes={scenes} />
}
