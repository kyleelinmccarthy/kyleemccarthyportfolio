import { site } from './site'

export const contact = {
  // The closing scene above points at the work; this is where someone who
  // wants to reach her actually does it.
  eyebrow: 'Say hello',
  body: [
    'If something here caught your interest — the platforms, the AI work, the design system, or one of the things I build after hours — I’d like to hear about it.',
    'Tell me what you’re working on. It lands straight in my inbox and I reply personally.',
  ],
  options: {
    email: site.email,
    linkedin: site.linkedin,
    linkedinLabel: 'linkedin.com/in/kylee-mccarthy-ms',
  },
} as const

export const footer = {
  nav: [
    { label: 'Start over', href: '/' },
    { label: 'Send me a letter', href: '/#contact' },
  ],
  // Standalone, directly-linkable pages for each journey scene.
  pages: [
    { label: 'About', href: '/about' },
    { label: 'Portfolio — plain view', href: '/work' },
    { label: 'Send me a letter', href: '/connect' },
    { label: 'My personal library', href: '/room' },
  ],
  copyright: '© 2026 Kylee McCarthy, MS · Saratoga Springs, UT',
  tagline: 'Every detail designed and built on purpose.',
} as const
