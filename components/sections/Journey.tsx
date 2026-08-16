'use client'

import { CinematicJourney, type Scene } from '@/components/journey/CinematicJourney'
import { StepsRoom, StepsSetting } from '@/components/rooms/Steps'
import { WindowRoom, WindowSetting } from '@/components/rooms/Window'
import { FloorRoom, FloorSetting } from '@/components/rooms/Floor'
import { LeadScene, TalkScene } from '@/components/scenes'

// The floor plan (docs/superpowers/specs/2026-08-16-museum-overhaul-design.md):
// up the steps, through the door, right along the gallery wall, right again
// to the desk, then in to the way out. way-out still shows the old Talk scene
// until a later task replaces it with the mailbox. BuildScene/LeadScene are
// kept (imported by the standalone /work and /leadership pages) but are no
// longer used here.
export function Journey() {
  const scenes: Scene[] = [
    { id: 'steps', dir: 'start', node: <StepsRoom />, setting: <StepsSetting /> },
    { id: 'window', dir: 'up', node: <WindowRoom />, setting: <WindowSetting /> },
    { id: 'floor', dir: 'right', node: <FloorRoom />, setting: <FloorSetting /> },
    { id: 'desk', dir: 'right', node: <LeadScene /> },
    // The door is the last beat of the home scroll only (spec §5) — /connect
    // renders the same scene without it.
    { id: 'way-out', dir: 'in', node: <TalkScene showDoor /> },
  ]
  return <CinematicJourney scenes={scenes} />
}
