'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { profileCopy, profileSections } from '@/content/profile'
import { keyIsThePages } from '@/lib/keys'
import { profileSectionFromPath } from '@/lib/profile'
import { PANEL_BODY, PANEL_CLOSE, PROFILE_TITLE_ID } from './panelStyles'
import { profileTrail } from './profileTrail'

/**
 * The profile's panel over the planet: About, Experience and Contact as tabs
 * along its top, each a link to its own page, and the section the address
 * names below them (`children`). It stays mounted while the visitor moves
 * between the three (it is their layout's), so a tab keeps focus and the
 * panel does not flicker. Opened from the header, it takes focus (its
 * heading); the close button and Escape go back where the visitor was and
 * hand focus back to the header's control (`profileTrail`). Without
 * JavaScript the tabs and the close button are plain links, the close one to
 * the planet. It sits where a place's panel does, wider, and on a phone it
 * fills the screen below the header.
 */
export function ProfilePanel({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const current = profileSectionFromPath(pathname)
  const panel = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  // On the server, and for a visitor who arrived here, closing goes to the planet.
  const [back, setBack] = useState('/')
  useEffect(() => setBack(profileTrail.back()), [])

  // Each section opens at its top; opened from the header, the panel takes focus at its heading.
  useEffect(() => {
    body.current?.scrollTo?.({ top: 0 })
    if (profileTrail.takeFocusIn()) panel.current?.querySelector<HTMLElement>(`#${PROFILE_TITLE_ID}`)?.focus()
  }, [pathname])

  const close = useCallback(() => profileTrail.close(), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || !keyIsThePages(e.target)) return
      const to = profileTrail.back()
      close()
      router.push(to)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, close])

  return (
    <article ref={panel} aria-labelledby={PROFILE_TITLE_ID} data-covers-labels className="profile-panel glass">
      <div className="flex items-center gap-1 border-b border-line py-1 pl-2 pr-1.5">
        <nav aria-label={profileCopy.navLabel} className="flex min-w-0 flex-1 gap-0.5">
          {profileSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              aria-current={current === section.id ? 'page' : undefined}
              scroll={false}
              className="profile-tab"
            >
              {section.label}
            </Link>
          ))}
        </nav>
        <Link href={back} aria-label={profileCopy.close} onClick={close} className={`${PANEL_CLOSE} flex h-11 w-11 flex-none items-center justify-center`}>
          <span aria-hidden>✕</span>
        </Link>
      </div>
      {/* Focusable so the keyboard can scroll it when nothing inside it takes focus. */}
      <div ref={body} tabIndex={0} className={PANEL_BODY}>
        {children}
      </div>
    </article>
  )
}
