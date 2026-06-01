/** Global site facts — single source of truth for metadata, JSON-LD, footer. */
export const site = {
  name: 'Kylee McCarthy',
  credential: 'MS',
  title: 'Kylee McCarthy — Technology Leader, Builder & Designer',
  shortTitle: 'Kylee McCarthy',
  description:
    'I lead technology organizations through real transformation, and I ship production software while doing it. Technology leadership, AI implementation, product & UX design, advisory.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kyleemccarthy.com',
  locale: 'en_US',
  location: 'Saratoga Springs, UT',
  jobTitle: 'Director of Technology Operations',
  email: 'kyleelinmccarthy@gmail.com',
  linkedin: 'https://www.linkedin.com/in/kyleemccarthy',
  resumePath: '/Kylee-McCarthy-Resume.pdf',
  portraitAlt: 'Portrait of Kylee McCarthy',
} as const

export type Site = typeof site
