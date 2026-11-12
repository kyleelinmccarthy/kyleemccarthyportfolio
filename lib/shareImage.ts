import { site } from '@/content/site'
import { looks } from '@/content/sky'
import { textColors } from '@/lib/tokens'

/**
 * Colours for the images drawn with `next/og` (the share image and the tab
 * icon). ImageResponse cannot read CSS variables, so they come from here: the
 * afternoon sky from content/sky.ts, and the day theme's ink from lib/tokens.ts.
 */
export const shareColors = {
  skyTop: looks.afternoon.top,
  skyMid: looks.afternoon.mid,
  skyBottom: looks.afternoon.bot,
  ink: textColors.day.ink,
} as const

/** The afternoon sky, top to horizon, as a CSS gradient. */
export const shareSky = `linear-gradient(180deg, ${shareColors.skyTop} 0%, ${shareColors.skyMid} 55%, ${shareColors.skyBottom} 100%)`

/**
 * The site's share image (app/opengraph-image.tsx). A page that sets its own
 * openGraph or twitter metadata loses the image Next would inherit, so a page
 * with no image of its own names this one.
 */
export const shareImage = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: site.title,
} as const
