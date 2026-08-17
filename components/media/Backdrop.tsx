/** Which side of the front door a room is standing on. */
export type BackdropVariant = 'exterior' | 'interior'

const SOURCES: Record<BackdropVariant, string> = {
  // Gothic brick, gables and a turret. Cropped to the upper facade on purpose:
  // the photo has its own porch and door, and two doorways stacked on top of
  // one another reads as a mistake rather than as depth. The house looms; you
  // stand at the threshold the room itself draws.
  exterior: '/media/backdrop/exterior.jpg',
  // A dark panelled room with a gallery wall — which is literally what the
  // rooms past the entrance are.
  interior: '/media/backdrop/interior.jpg',
}

/**
 * The place a room is standing in, faded back to texture. A flat surface
 * colour across five full-viewport rooms was one note.
 *
 * The entrance gets the outside of the house and every room past it gets the
 * inside, so walking through the door actually changes where you are. That is
 * the whole reason this takes a variant rather than being a single image.
 *
 * How much shows through is a theme token (`--photo-veil` in globals.css), not
 * a fixed opacity: these are dark photographs, so dark mode carries far more of
 * them than light mode, where a dark image under dark text eats the contrast.
 *
 * Absolutely positioned inside each room rather than fixed to the viewport:
 * the camera transforms the panel container, and a `fixed` child inside a
 * transformed ancestor anchors to that ancestor instead of the viewport, so it
 * would drift with the camera. Each panel is exactly one viewport, so
 * `absolute inset-0` puts the same crop behind every room.
 *
 * Sources and processing in public/media/backdrop/CREDITS.md.
 */
export function Backdrop({ variant = 'interior' }: { variant?: BackdropVariant }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${SOURCES[variant]})`,
          opacity: 'var(--photo-veil)',
        }}
      />
      {/* Sink the lower half back into the surface colour so the rooms' copy
          always has flat ground under it, whatever the photo is doing. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/70 to-surface" />
    </div>
  )
}
