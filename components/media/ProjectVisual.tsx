import Image from 'next/image'
import type { MediaItem } from '@/content/types'
import { BackgroundShapes } from './BackgroundShapes'

/**
 * A project's hero image, or — for the internal tools we cannot screenshot —
 * a decorative panel. The fallback is a first-class state, not an edge case:
 * every NBS tool takes it.
 */
export function ProjectVisual({
  media,
  name,
  className = '',
}: {
  media?: { hero: MediaItem }
  name: string
  className?: string
}) {
  const shell = `relative aspect-[16/10] overflow-hidden rounded-xl bg-surface-raised ring-1 ring-rule ${className}`

  if (!media) {
    return (
      <div className={shell}>
        <BackgroundShapes />
        <span className="absolute inset-0 flex items-center justify-center px-6 text-center font-serif text-2xl leading-tight text-fg-muted">
          {name}
        </span>
      </div>
    )
  }

  return (
    <div className={shell}>
      <Image
        src={media.hero.src}
        alt={media.hero.alt}
        fill
        sizes="(min-width: 1024px) 40rem, 100vw"
        className="object-cover object-top"
      />
    </div>
  )
}
