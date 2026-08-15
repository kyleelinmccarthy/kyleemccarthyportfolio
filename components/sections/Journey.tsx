'use client'

import { CinematicJourney, type Scene } from '@/components/journey/CinematicJourney'
import {
  AboutScene,
  LeadScene,
  ValueScene,
  BuildScene,
  TalkScene,
} from '@/components/scenes'

export function Journey() {
  const scenes: Scene[] = [
    { id: 'about', dir: 'start', node: <AboutScene /> },
    { id: 'lead', dir: 'right', node: <LeadScene /> },
    { id: 'value', dir: 'down', node: <ValueScene /> },
    { id: 'build', dir: 'left', node: <BuildScene /> },
    // The door is the last beat of the home scroll only (spec §5) — /connect
    // renders the same scene without it.
    { id: 'talk', dir: 'in', node: <TalkScene showDoor /> },
  ]
  return <CinematicJourney scenes={scenes} />
}
