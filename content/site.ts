/** Global site facts — single source of truth for metadata, JSON-LD, footer. */
export const site = {
  name: 'Kylee McCarthy',
  credential: 'MS',
  title: 'Kylee McCarthy — Technology Leader, Builder & Designer',
  shortTitle: 'Kylee McCarthy',
  // What a search result and a link preview show. Keep it in the same voice as
  // the landing headline — it used to be résumé statistics.
  description:
    'Kylee McCarthy makes things and doesn’t stop when they work. Full-stack engineer with a design specialty — benefits platforms, games, and art.',
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
