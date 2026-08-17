import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/sections/Nav'
import { Footer } from '@/components/sections/Footer'
import { LibraryJourney } from '@/components/room/LibraryJourney'
import { room } from '@/content/room'

export const metadata: Metadata = {
  title: 'My Personal Library',
  description:
    'The personal side — apps built after hours, games in progress, art, and what the rest of life looks like.',
}

/**
 * The library gets the same treatment as the rest of the house: a journey, not
 * a page. That means the full-width shell the home page uses rather than
 * SectionPage's centred column, which cannot hold a full-viewport room.
 *
 * The one <h1> lives here and is visually hidden — each room carries its own
 * visible heading, and the wordmark in the nav already says whose library it
 * is. Exactly one h1 per page is what a11y.spec.ts and smoke.spec.ts require.
 */
export default function RoomPage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <h1 className="sr-only">{room.intro.heading}</h1>
        <LibraryJourney />
        <p className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="font-sans font-semibold text-accent underline-offset-4 hover:underline"
          >
            ← Back to the full story
          </Link>
        </p>
      </main>
      <Footer />
    </>
  )
}
