import { type ReactNode } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/sections/Nav'
import { Footer } from '@/components/sections/Footer'

/** Standalone, directly-linkable page for a single journey scene. */
export function SectionPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main" className="pt-28">
        <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
          <h1 className="sr-only">{title}</h1>
          {children}
          <p className="mt-16">
            <Link href="/" className="font-sans font-semibold text-accent underline-offset-4 hover:underline">
              ← Back to the full story
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
