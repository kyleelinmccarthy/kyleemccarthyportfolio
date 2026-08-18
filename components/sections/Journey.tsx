'use client'

import { CinematicJourney, type Scene } from '@/components/journey/CinematicJourney'
import { StepsRoom, StepsSetting } from '@/components/rooms/Steps'
import { LandingRoom, StairsSetting } from '@/components/rooms/Landing'
import { FloorRoom, FloorSetting } from '@/components/rooms/Floor'
import { DeskRoom, DeskSetting } from '@/components/rooms/Desk'
import { WayOutRoom } from '@/components/rooms/WayOut'

// The floor plan: up the steps and through the front door, into the landing;
// up the stairs to the gallery, which you walk along like a hallway; through
// the office door to the desk; then back out of it to the way out.
//
// The directions are the choreography, not decoration. 'up' climbs the stairs
// the landing draws. 'in' is a door you step through. 'out' is backing out of
// one.
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
    { id: 'landing', title: 'the way in', dir: 'in', node: <LandingRoom />, setting: <StairsSetting />, backdrop: 'entrance' },
    // Seven pieces to walk past, so this room claims four times the scroll of
    // a room that says one sentence. Without it, paging raced.
    {
      id: 'floor',
      title: 'the work',
      dir: 'up',
      node: <FloorRoom />,
      setting: <FloorSetting />,
      weight: 4,
      backdrop: 'showcase',
      // Walking the hall is the room coming toward you.
      travel: true,
    },
    {
      id: 'desk',
      title: 'the desk',
      dir: 'in',
      node: <DeskRoom />,
      setting: <DeskSetting />,
      backdrop: 'desk',
      // Crossing the office to the desk, then leaning over it.
      travel: true,
    },
    // The door is the last beat of the home scroll only (spec §5) — /connect
    // renders its own copy without it.
    { id: 'way-out', title: 'the way out', dir: 'out', node: <WayOutRoom />, backdrop: 'endoftour' },
  ]
  return <CinematicJourney scenes={scenes} />
}
