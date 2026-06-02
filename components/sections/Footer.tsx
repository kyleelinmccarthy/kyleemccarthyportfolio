import Link from 'next/link'
import { Container } from '@/components/primitives/Container'
import { NameLogo } from '@/components/primitives/NameLogo'
import { footer } from '@/content/contact'
import { site } from '@/content/site'

export function Footer() {
  return (
    <footer className="bg-surface text-fg border-t border-rule">
      <Container className="py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div>
            <Link href="/" aria-label="Kylee McCarthy — home">
              <NameLogo size="footer" />
            </Link>
            <nav aria-label="Footer" className="mt-6">
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {footer.nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="font-sans text-sm text-fg-muted transition-colors hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a
                    href={site.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    LinkedIn
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          {/* Each journey scene as its own readable page. */}
          <nav aria-label="Sections" className="lg:text-right">
            <p className="font-sans text-label uppercase text-accent">Read it as pages</p>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 lg:justify-end">
              {footer.pages.map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    className="font-sans text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-rule pt-6 font-sans text-sm text-fg-muted sm:flex sm:items-center sm:justify-between">
          <p>{footer.copyright}</p>
          <p className="mt-1 italic text-accent sm:mt-0">{footer.tagline}</p>
        </div>
      </Container>
    </footer>
  )
}
