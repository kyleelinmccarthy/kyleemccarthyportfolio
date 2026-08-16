import { Room } from './Room'
import { Door } from '@/components/room/Door'
import { RevealOnActive } from '@/components/journey/sceneActive'
import { rooms } from '@/content/rooms'

/**
 * The last room: the close, and the door to /room. Spec §5 — the door is the
 * last beat of the home scroll only. The standalone /connect route says
 * hello without it (it renders its own copy, not this component).
 */
export function WayOutRoom() {
  return (
    <Room className="mx-auto max-w-2xl">
      <RevealOnActive>
        <h2 className="font-serif text-fluid-hero text-fg">{rooms.wayOut.heading}</h2>
      </RevealOnActive>
      <RevealOnActive index={1}>
        <p className="mt-6 font-sans text-xl leading-relaxed text-fg-muted">{rooms.wayOut.body}</p>
      </RevealOnActive>
      <RevealOnActive index={2}>
        <Door />
      </RevealOnActive>
    </Room>
  )
}
