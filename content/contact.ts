import { site } from './site'

export const contact = {
  // The big "Let's get to work" headline is the scene just above; here we state
  // the purpose explicitly and give them the form.
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
    { label: 'Let’s get to work', href: '/#contact' },
  ],
  // Standalone, directly-linkable pages for each journey scene.
  pages: [
    { label: 'About', href: '/about' },
    { label: 'How I lead', href: '/leadership' },
    { label: 'How I create value', href: '/value' },
    { label: 'What I build', href: '/work' },
    { label: 'Let’s get to work', href: '/connect' },
    { label: 'The other room', href: '/room' },
  ],
  copyright: '© 2026 Kylee McCarthy, MS · Saratoga Springs, UT',
  tagline: 'Every detail designed and built on purpose.',
} as const
