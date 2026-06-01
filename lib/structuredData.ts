import { site } from '@/content/site'

/** schema.org Person JSON-LD for rich results / entity recognition. */
export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    honorificSuffix: site.credential,
    jobTitle: site.jobTitle,
    description: site.description,
    url: site.url,
    email: `mailto:${site.email}`,
    sameAs: [site.linkedin],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Saratoga Springs',
      addressRegion: 'UT',
      addressCountry: 'US',
    },
    knowsAbout: [
      'Technology Leadership',
      'Organizational Transformation',
      'AI Strategy & Implementation',
      'Product Development',
      'UX/UI Design',
      'Software Engineering',
    ],
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: "Master's in Technology Management" },
      { '@type': 'CollegeOrUniversity', name: "Bachelor's in Marketing Management" },
    ],
  }
}
