'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { NameLogo } from '@/components/primitives/NameLogo'
import { ThemeToggle } from '@/components/primitives/ThemeToggle'
import { navItems } from '@/content/nav'
import { site } from '@/content/site'

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-rule bg-surface-raised/85 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? 'shadow-sm shadow-black/10' : ''
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 sm:px-8 lg:px-12"
      >
        <Link
          href="/"
          className="flex items-center gap-3 rounded focus-visible:outline-none"
          aria-label="Kylee McCarthy — home"
        >
          {/* Decorative here: the link is already named by its aria-label, and
              a second announcement of her name would just be noise. */}
          <Image
            src="/kylee-portrait-6.png"
            alt=""
            aria-hidden="true"
            width={80}
            height={80}
            priority
            sizes="40px"
            className="h-10 w-10 shrink-0 rounded-full object-cover object-top ring-1 ring-rule"
          />
          <NameLogo size="nav" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <ul className="flex items-center gap-7">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-sans text-sm font-medium text-fg-muted transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <a
            href={site.resumePath}
            download
            className="inline-flex items-center gap-1.5 rounded-full bg-fill px-4 py-1.5 font-sans text-sm font-semibold text-fill-fg transition hover:brightness-110"
          >
            <DownloadIcon />
            Kylee’s Résumé
          </a>
          <ThemeToggle />
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-fg hover:bg-surface-raised"
          >
            <span aria-hidden="true" className="text-xl">
              {menuOpen ? '✕' : '☰'}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div id="mobile-menu" className="border-t border-rule bg-surface px-6 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 font-sans text-lg text-fg hover:text-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={site.resumePath}
                download
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center gap-2 py-3 font-sans text-lg font-semibold text-fg"
              >
                <DownloadIcon />
                Download résumé
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
