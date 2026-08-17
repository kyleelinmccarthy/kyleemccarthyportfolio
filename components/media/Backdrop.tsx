/** Which room's photograph to hang behind the content. */
export type BackdropVariant =
  | 'exterior'
  | 'entrance'
  | 'showcase'
  | 'desk'
  | 'endoftour'
  | 'library'

interface Source {
  src: string
  /** background-size. Anything but `cover` is a deliberate crop. */
  size?: string
  /** background-position. Which part of the photograph survives that crop. */
  position?: string
}

const SOURCES: Record<BackdropVariant, Source> = {
  // Outside: gothic brick, gables, a turret.
  //
  // Zoomed and anchored to the bottom of the frame on purpose. At `cover` the
  // photo's upper storey sat right where the room draws its door, so the door
  // read as hung on a window two floors up. Pushing the image down brings the
  // ground floor's brickwork up behind it, which is where a door belongs.
  exterior: { src: '/media/backdrop/exterior.jpg', size: 'auto 165%', position: '50% 100%' },
  // Just inside: a dark entry hall, gallery wall, stairs.
  entrance: { src: '/media/backdrop/entrance.jpg' },
  // The gallery: panelled walls hung with framed work.
  showcase: { src: '/media/backdrop/showcase.jpg' },
  // The study: a wooden desk, a green wingback, bookshelves.
  desk: { src: '/media/backdrop/desk.jpg' },
  // The way out: a glass conservatory with a woodstove.
  endoftour: { src: '/media/backdrop/endoftour.jpg' },
  // The personal library at the back.
  library: { src: '/media/backdrop/library.jpg' },
}

/**
 * The place a room is standing in, faded back to texture. A flat surface
 * colour across five full-viewport rooms was one note.
 *
 * Every room has its own photograph, so moving through the building actually
 * moves you: the step outside, the entry hall, the gallery, the study, the
 * conservatory you leave through, and the library at the back.
 *
 * How much shows through is a theme token (`--photo-veil` in globals.css), not
 * a fixed opacity: these are dark photographs, so dark mode carries far more of
 * them than light mode, where a dark image under dark text eats the contrast.
 *
 * Two anchorings, because there are two kinds of page here.
 *
 * `absolute` (the default) is what the journey needs: the camera transforms the
 * panel container, and a `fixed` child inside a transformed ancestor anchors to
 * that ancestor rather than the viewport, so it would drift with the camera.
 * Each panel is exactly one viewport, so `absolute inset-0` puts the same crop
 * behind every room.
 *
 * `fixed` is what an ordinary long page needs. /room scrolls for several
 * screens, and an absolute backdrop there stretches one photograph over the
 * whole document — which rendered as a pale rectangle floating in the middle
 * of the page rather than as the room you are standing in. Fixed makes it
 * wallpaper: the page scrolls, the library stays put.
 *
 * Sources and processing in public/media/backdrop/CREDITS.md.
 */
export function Backdrop({
  variant = 'entrance',
  anchor = 'absolute',
}: {
  variant?: BackdropVariant
  anchor?: 'absolute' | 'fixed'
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none inset-0 z-0 overflow-hidden ${anchor === 'fixed' ? 'fixed' : 'absolute'}`}
    >
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url(${SOURCES[variant].src})`,
          backgroundSize: SOURCES[variant].size ?? 'cover',
          backgroundPosition: SOURCES[variant].position ?? 'center',
          opacity: 'var(--photo-veil)',
        }}
      />
      {/* Settle the photo toward the floor so the copy has ground under it —
          but only part way. This used to run to a fully opaque surface, which
          left each room as a strip of photograph above a flat panel, and the
          whole point of a room per photograph is that you can see the room. */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface/20 via-surface/45 to-surface/75" />
      {/* Fade the left and right edges out. The camera pans sideways between
          rooms, so for a moment two different photographs share the screen;
          without this they meet at a hard vertical seam that reads as a
          rendering fault rather than as a doorway. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(var(--surface))_0%,transparent_10%,transparent_90%,rgb(var(--surface))_100%)]" />
    </div>
  )
}
