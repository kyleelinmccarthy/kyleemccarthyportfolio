'use client'

import { SkyBackdrop } from '@/components/hud/SkyBackdrop'
import { useTheme } from '@/components/hud/ThemeProvider'

/** The picture of the planet at each theme, in `public/world` (retaken with `npm run capture:poster`). */
const PICTURE = { day: '/world/poster-day.webp', night: '/world/poster-night.webp' }

/**
 * What stands where the canvas would be: before the 3D code arrives, without
 * WebGL, and after the canvas fails. The CSS sky is there from the first paint,
 * and a picture of the planet in the matching theme covers it once the
 * visitor's clock has been read (until then the theme is only the default, and
 * showing it could flash the wrong sky). The picture is decoration: the page's
 * own content says everything it does, so it has no alt text of its own.
 */
export function Poster() {
  const { theme, greeting } = useTheme()
  return (
    <div data-testid="world-poster" aria-hidden className="fixed inset-0 z-0">
      <SkyBackdrop />
      {greeting === null ? null : (
        // eslint-disable-next-line @next/next/no-img-element -- a full-bleed backdrop already sized for the screen; the optimiser would only re-encode it
        <img src={PICTURE[theme]} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  )
}
