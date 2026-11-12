import { Frame } from '@/components/hud/Frame'
import { WorldLoader } from '@/components/world/WorldLoader'
import { districts, places, tourOrder } from '@/content/world'

/**
 * The planet's pages. The theme provider is in the root layout. The world (the
 * canvas, or the picture standing in for it) sits behind the frame and the
 * page's content. The content layer lets the pointer through to the canvas
 * except where it has something to click or scroll (see `.world-content`).
 */
export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WorldLoader districts={districts} places={places} tourOrder={tourOrder} />
      <div className="world-content text-ink">
        <a
          href="#main"
          className="glass fixed left-3 top-3 z-[100] -translate-y-[200%] px-4 py-2.5 font-semibold text-ink focus:translate-y-0"
        >
          Skip to content
        </a>
        <Frame />
        {children}
      </div>
    </>
  )
}
