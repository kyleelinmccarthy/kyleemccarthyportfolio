import { site } from './site'

export const contact = {
  // The big "Let's get to work" headline is the scene just above; here we state
  // the purpose explicitly and give them the form.
  eyebrow: 'What I’m open to',
  body: [
    'I take on advisory engagements and contract work. I’m at my best with leaders and founders who want to get it built, not just talk about it: technology transformation, modernization, AI-enabled development, UX/UI, or a project that simply needs doing well.',
    'Tell me what you’re trying to accomplish. It lands straight in my inbox and I reply personally.',
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
  ],
  copyright: '© 2026 Kylee McCarthy, MS · Saratoga Springs, UT',
  tagline: 'Every detail designed and built on purpose.',
} as const
