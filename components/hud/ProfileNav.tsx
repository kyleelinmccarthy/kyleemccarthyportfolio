'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { profileCopy, profileSections } from '@/content/profile'
import { profileSectionFromPath } from '@/lib/profile'
import { OPENER_ATTRIBUTE, profileTrail, type ProfileOpener } from './profileTrail'

/** Whether an element is laid out (not inside something hidden at this width). */
const shown = (el: Element) => el instanceof HTMLElement && el.getClientRects().length > 0

/**
 * The header's way into the profile: About, Experience and Contact. On a wide
 * screen the three stand side by side on one plate (`.profile-links`); where
 * the header has no room for them (`.profile-menu`, globals.css) one Profile
 * button opens them, as a native disclosure that works without JavaScript.
 * Each is a link to its section's page; pressing one remembers where the
 * visitor was (`profileTrail`), so closing the panel comes back here and hands
 * focus back to it. On the home page on a phone the menu stands at the top
 * right, beside the name, clear of the controls at the bottom (`home`).
 */
export function ProfileNav({ home, compact = '' }: { home: boolean; compact?: string }) {
  const pathname = usePathname()
  const current = profileSectionFromPath(pathname)
  const menu = useRef<HTMLDetailsElement>(null)
  const group = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  // Arriving back from the profile: focus returns to the control that opened it, whichever of the two is showing.
  useEffect(() => {
    const back = profileTrail.takeFocusBack()
    if (!back) return
    const wanted = [group.current, menu.current].flatMap((root) => (root ? [...root.querySelectorAll(`[${OPENER_ATTRIBUTE}]`)] : []))
    const target =
      wanted.find((el) => el.getAttribute(OPENER_ATTRIBUTE) === back && shown(el)) ??
      wanted.find((el) => el.getAttribute(OPENER_ATTRIBUTE) === 'menu' && shown(el)) ??
      wanted.find(shown)
    if (target instanceof HTMLElement) target.focus()
  }, [])

  // The open menu closes on a press anywhere outside it.
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) menu.current.open = false
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  const pressed = (opener: ProfileOpener) => () => {
    profileTrail.open(`${window.location.pathname}${window.location.search}`, opener, current !== null)
    if (menu.current) menu.current.open = false
  }

  const links = (inMenu: boolean) =>
    profileSections.map((section) => (
      <Link
        key={section.id}
        href={section.href}
        aria-current={current === section.id ? 'page' : undefined}
        {...(inMenu ? {} : { [OPENER_ATTRIBUTE]: section.id })}
        onClick={pressed(inMenu ? 'menu' : section.id)}
        className={inMenu ? 'profile-menu-link' : `profile-link ${compact}`}
      >
        {section.label}
      </Link>
    ))

  return (
    <>
      <div ref={group} role="group" aria-label={profileCopy.navLabel} className="profile-links glass">
        {links(false)}
      </div>
      <details
        ref={menu}
        data-covers-labels
        onToggle={(e) => setOpen(e.currentTarget.open)}
        onKeyDown={(e) => {
          // Escape closes the open menu and nothing more; focus goes back to its button.
          if (e.key !== 'Escape' || !menu.current?.open) return
          e.preventDefault()
          menu.current.open = false
          menu.current.querySelector('summary')?.focus()
        }}
        className={`profile-menu ${home ? 'profile-menu-home' : ''}`}
      >
        <summary {...{ [OPENER_ATTRIBUTE]: 'menu' }} className={`hud-btn glass ${compact}`}>
          {profileCopy.menu}
          <span aria-hidden className="profile-menu-chevron">
            ▾
          </span>
        </summary>
        <div className="profile-menu-list glass">{links(true)}</div>
      </details>
    </>
  )
}
