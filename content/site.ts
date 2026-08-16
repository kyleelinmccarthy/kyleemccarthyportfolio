/** Global site facts — single source of truth for metadata, JSON-LD, footer. */
export const site = {
  name: 'Kylee McCarthy',
  credential: 'MS',
  title: 'Kylee McCarthy — Technology Leader, Builder & Designer',
  shortTitle: 'Kylee McCarthy',
  // What a search result and a link preview show. Keep it in the same voice as
  // the landing headline — it used to be résumé statistics.
  description:
    'Portfolio of Kylee McCarthy — enterprise platforms, video games, art, and whatever technology just shipped. Likes to keep busy and solve real problems.',
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
