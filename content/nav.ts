import type { NavItem } from './types'

// The site is a single scroll journey, so nav stays light: the work, a way to
// say hello, the résumé, and the theme switch. The work leads — on a showcase,
// a nav whose only destination is a contact form has the priority backwards.
export const navItems: NavItem[] = [
  { label: 'The work', href: '/work' },
  { label: 'Say hello', href: '/#contact' },
]
