/**
 * A gothic library — carved wood, a chandelier, a staircase — sitting behind
 * the whole building, faded back to texture. The flat surface colour alone was
 * too much of one note across five full-viewport rooms.
 *
 * An interior rather than a landscape, because the site IS a building you walk
 * into. It replaced a misty forest for that reason: the forest was atmospheric
 * but it put the reader outdoors in every room, including the ones that are
 * explicitly indoors. The staircase in it also rhymes with the entrance.
 *
 * How much shows through is a theme token (`--photo-veil` in globals.css), not
 * a fixed opacity: the photo is dark-based, so dark mode can carry far more of
 * it than light mode, where a dark photo under dark text eats the contrast.
 *
 * Absolutely positioned inside each room rather than fixed to the viewport:
 * the camera applies a transform to the panel container, and a `fixed` child
 * inside a transformed ancestor anchors to that ancestor instead of the
 * viewport — so it would drift with the camera. Each panel is exactly one
 * viewport, so `absolute inset-0` puts the same crop behind every room.
 *
 * Photo: Daniil Smetanin on Unsplash. See public/media/backdrop/CREDITS.md.
 */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/media/backdrop/library.jpg)',
          opacity: 'var(--photo-veil)',
        }}
      />
      {/* Sink the lower half back into the surface colour so the rooms' copy
          always has flat ground under it, whatever the photo is doing. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/70 to-surface" />
    </div>
  )
}
