import type { NavItem } from './types'

// The home page is a building you walk through; these are the two ways out of
// it. "Plain view" is doing real work — /work is the same projects without the
// scroll journey, and someone who wants to skim needs to know that exists.
// "Send a letter" matches the mailbox it lands on.
export const navItems: NavItem[] = [
  { label: 'Portfolio — plain view', href: '/work' },
  { label: 'Send me a letter', href: '/#contact' },
]
