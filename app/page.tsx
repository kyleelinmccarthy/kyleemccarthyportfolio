import { Nav } from '@/components/sections/Nav'
import { Journey } from '@/components/sections/Journey'
import { Contact } from '@/components/sections/Contact'
import { Footer } from '@/components/sections/Footer'

export default function HomePage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        {/* The site is a scroll-driven journey: About → How I lead → How I
            create value → What I build → Let's talk, then the contact form. */}
        <Journey />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
