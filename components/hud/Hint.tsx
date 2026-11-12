/** What the visitor can do with the planet. */
export const HINT = 'Drag to spin · Scroll to zoom · Click a place'

/**
 * The hint under the planet, while it waits to be touched. It is ordinary
 * text, so a screen reader can read it too, and on a phone, where the screen
 * has no room for it, it is there for a screen reader alone. `fading` fades it out.
 */
export function Hint({ fading }: { fading: boolean }) {
  return (
    <p
      data-fading={fading || undefined}
      className="pointer-events-none fixed bottom-9 left-1/2 z-[5] m-0 -translate-x-1/2 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted transition-opacity duration-300 data-[fading]:opacity-0 max-[820px]:sr-only"
    >
      {HINT}
    </p>
  )
}
