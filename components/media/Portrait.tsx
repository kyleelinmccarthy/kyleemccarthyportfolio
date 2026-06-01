import Image from 'next/image'
import { site } from '@/content/site'

/**
 * Art-directed portrait: natural color, most of the photo visible, with the
 * edges softly feathered into a terracotta tint (baked in process-headshot.ts)
 * so it ties to the site without a hard frame.
 */
export function Portrait({ className = '' }: { className?: string }) {
  return (
    <figure className={`relative ${className}`}>
      <Image
        src="/kylee-portrait-6.png"
        alt={site.portraitAlt}
        width={900}
        height={1125}
        priority
        sizes="(max-width: 1024px) 70vw, 360px"
        className="h-auto w-full"
      />
    </figure>
  )
}
