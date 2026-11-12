import { Frame } from '@/components/hud/Frame'
import { SkyBackdrop } from '@/components/hud/SkyBackdrop'
import PlaceNotFound from './(world)/places/[id]/not-found'

/**
 * Next renders an unmatched URL (including an unknown place, since the place
 * route has dynamicParams off) with this file, not with the route segment's own
 * not-found, and outside the (world) layout. So it brings the sky and frame itself.
 */
export default function NotFound() {
  return (
    <div className="text-ink">
      <SkyBackdrop />
      <Frame />
      <PlaceNotFound />
    </div>
  )
}
