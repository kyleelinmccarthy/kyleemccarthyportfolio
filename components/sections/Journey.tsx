'use client'

import { CinematicJourney, type Scene } from '@/components/journey/CinematicJourney'
import { StepsRoom, StepsSetting } from '@/components/rooms/Steps'
import { WindowRoom, WindowSetting } from '@/components/rooms/Window'
import {
  BuildScene,
  LeadScene,
  TalkScene,
} from '@/components/scenes'

// The floor plan (docs/superpowers/specs/2026-08-16-museum-overhaul-design.md):
// up the steps, through the door, right along the gallery wall, right again
// to the desk, then in to the way out. floor/desk/way-out still show the old
// Build/Lead/Talk scenes until later tasks replace them with the gallery,
// the sticky-note desk, and the mailbox.
export function Journey() {
  const scenes: Scene[] = [
    { id: 'steps', dir: 'start', node: <StepsRoom />, setting: <StepsSetting /> },
    { id: 'window', dir: 'up', node: <WindowRoom />, setting: <WindowSetting /> },
    { id: 'floor', dir: 'right', node: <BuildScene /> },
    { id: 'desk', dir: 'right', node: <LeadScene /> },
    // The door is the last beat of the home scroll only (spec §5) — /connect
    // renders the same scene without it.
    { id: 'way-out', dir: 'in', node: <TalkScene showDoor /> },
  ]
  return <CinematicJourney scenes={scenes} />
}
