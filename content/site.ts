/** Global site facts — single source of truth for metadata, JSON-LD, footer. */
export const site = {
  name: 'Kylee McCarthy',
  credential: 'MS',
  title: 'Kylee McCarthy — Technology Leader, Builder & Designer',
  shortTitle: 'Kylee McCarthy',
  // Identity first, then range. This read as résumé stats, which is not what a
  // showcase should hand a search result or a link preview.
  description:
    'Portfolio of Kylee McCarthy — a problem solver with a weakness for new technology and a stubborn streak about how things look. Platforms, games, and art.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kyleemccarthy.com',
  locale: 'en_US',
  location: 'Saratoga Springs, UT',
  jobTitle: 'Director of Technology Operations',
  email: 'kyleelinmccarthy@gmail.com',
  linkedin: 'https://www.linkedin.com/in/kylee-mccarthy-ms-706499123/',
  resumePath: '/Kylee-McCarthy-Resume.pdf',
  portraitAlt: 'Portrait of Kylee McCarthy',
} as const

export type Site = typeof site
