import Link from 'next/link'
import { hero } from '@/content/about'
import { site } from '@/content/site'
import { tourOrder } from '@/content/world'
import { placeHref } from '@/lib/world/route'
import { Greeting } from './Greeting'
import { IndexButton } from './IndexDrawer'
import { ThemeToggle } from './ThemeToggle'

/**
 * The name, the role line and the three controls. On the home page the name is
 * the page's <h1> and the headline and greeting sit under it; on a place page
 * the place is the <h1> and the name is a link home. The Index control is a
 * button on the home page (it opens the drawer) and a link to /#index elsewhere.
 */
export function Header({ home }: { home: boolean }) {
  const wordmark = `font-display font-extrabold leading-none tracking-[-0.012em] text-ink no-underline ${
    home ? 'text-[31px] max-[820px]:text-[22px]' : 'text-[31px] max-[820px]:text-base'
  }`
  // A place page's second row is cramped on a phone, so its controls shrink.
  const compact = home ? '' : 'max-[820px]:px-2 max-[820px]:py-2 max-[820px]:text-[10px] max-[820px]:tracking-[0.06em]'

  return (
    <header>
      <div
        className={`fixed left-10 top-9 z-[5] max-w-[440px] max-[820px]:max-w-[250px] ${
          home ? 'max-[820px]:left-[26px] max-[820px]:top-[26px]' : 'max-[820px]:left-3.5 max-[820px]:top-[68px]'
        }`}
      >
        {/*
          The name stays put, on a plate while the planet is behind it (`.hud-name`, globals.css); no map label shows
          under it. The role line, headline and greeting give way to the planet when the camera comes in close (R31).
        */}
        <div data-covers-labels className="hud-name">
          {home ? (
            <h1 className={wordmark}>{site.name}</h1>
          ) : (
            <p className="m-0">
              <Link href="/" className={wordmark}>
                {site.name}
              </Link>
            </p>
          )}
        </div>
        <div data-covers-labels data-gives-way>
          <p
            className={`mt-[9px] font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted ${
              home ? '' : 'max-[820px]:hidden'
            }`}
          >
            {site.roleLine}
          </p>
          {home ? (
            <>
              <p className="mb-2.5 mt-6 font-display text-[21px] font-medium leading-[1.24] text-ink max-[820px]:mt-3 max-[820px]:text-base">
                {hero.headline}
              </p>
              <Greeting />
            </>
          ) : null}
        </div>
      </div>

      <nav
        aria-label="Main"
        data-covers-labels
        className={`fixed right-10 top-9 z-[5] flex gap-2 max-[820px]:flex-wrap max-[820px]:justify-end ${
          home
            ? 'max-[820px]:bottom-[26px] max-[820px]:right-[26px] max-[820px]:top-auto'
            : 'max-[820px]:right-3.5 max-[820px]:top-[68px] max-[820px]:max-w-[calc(100vw-170px)] max-[820px]:gap-1.5'
        }`}
      >
        <Link href={placeHref(tourOrder[0]!)} className={`hud-btn hud-btn-primary glass ${compact}`}>
          Take the tour <span aria-hidden>→</span>
        </Link>
        {home ? (
          <IndexButton className={`hud-btn glass ${compact}`} />
        ) : (
          <Link href="/#index" className={`hud-btn glass ${compact}`}>
            Index
          </Link>
        )}
        <ThemeToggle className={compact} />
      </nav>
    </header>
  )
}
