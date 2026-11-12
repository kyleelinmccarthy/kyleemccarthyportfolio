import Image from 'next/image'
import { site } from '@/content/site'

/**
 * The portrait on the Home panel: natural colour, edges softly feathered so it
 * sits on the glass rather than being a rectangle stuck to it. Baked in
 * scripts/process-portrait.ts — the feather is an alpha mask on the
 * photograph, not a drawn frame.
 */
export function Portrait({ className = '' }: { className?: string }) {
  return (
    <figure className={`relative m-0 ${className}`}>
      <Image
        src="/kylee-portrait-2026.webp"
        alt={site.portraitAlt}
        width={900}
        height={1125}
        priority
        sizes="(max-width: 820px) 70vw, 360px"
        className="h-auto w-full"
      />
    </figure>
  )
}
