import { site } from '@/content/site'
import { education } from '@/content/timeline'

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
    sameAs: [site.linkedin, site.github],
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
    alumniOf: [...new Set(education.map((d) => d.school))].map((name) => ({ '@type': 'CollegeOrUniversity', name })),
    hasCredential: education.map((d) => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      name: d.degree,
      recognizedBy: { '@type': 'CollegeOrUniversity', name: d.school },
      dateCreated: d.year,
    })),
  }
}
