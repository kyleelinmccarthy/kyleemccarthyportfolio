/**
 * The profile: About, Experience and Contact, opened from the header on every
 * page, each at its own address. The roles and education it shows live in
 * timeline.ts, the proof figures and résumé label in about.ts, and the links
 * in site.ts; what is here is the profile's own words and the résumé's skills.
 *
 * DRAFT for Kylee's review: the section labels and titles, the menu's name,
 * the small headings and the page descriptions are new wording. The summary
 * and the skills are the résumé's, word for word.
 */

export type ProfileSectionId = 'about' | 'experience' | 'contact'

export interface ProfileSection {
  id: ProfileSectionId
  /** The header's button and the panel's tab. */
  label: string
  /** The page's address. */
  href: `/${ProfileSectionId}`
  /** The panel's heading, the page's h1. */
  title: string
  /** What a search result and a link preview show. */
  description: string
}

export const profileSections: readonly ProfileSection[] = [
  {
    id: 'about',
    label: 'About',
    href: '/about',
    title: 'About me',
    description:
      'Who Kylee McCarthy is: a Director of Technology Operations who taught herself to code by automating her own job. Education, skills and the numbers behind them.',
  },
  {
    id: 'experience',
    label: 'Experience',
    href: '/experience',
    title: 'Work history',
    description:
      'Kylee McCarthy’s work history at National Benefit Services, LLC, from Benefits Specialist to Director of Technology Operations, and her résumé.',
  },
  {
    id: 'contact',
    label: 'Contact',
    href: '/contact',
    title: 'Get in touch',
    description: 'Email, LinkedIn, GitHub and the résumé of Kylee McCarthy, in Saratoga Springs, UT, and a letter box that reaches her inbox.',
  },
]

/** The words around the profile that are not a section's own. */
export const profileCopy = {
  /** The name of the panel's tabs, and of the header's group of three, for a screen reader. */
  navLabel: 'Profile',
  /** The one button that opens the three where the header has no room for them. */
  menu: 'Profile',
  close: 'Close',
  /** The end of a role she still holds, as the résumé writes it. */
  present: 'Present',
  figures: 'In numbers',
  education: 'Education',
  skills: 'Skills',
  /** The labels beside each way to reach her. */
  contact: {
    email: 'Email',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    resume: 'Résumé',
    location: 'Based in',
    resumeNote: 'PDF',
    /** Said to a screen reader after a link to another site. */
    newTab: 'opens in a new tab',
  },
} as const

/** The résumé's summary, word for word. */
export const summary =
  'I taught myself to code by automating my own job, and now lead a 20-person technology department. I still write production code, so the standards and tooling I put in place fit how the work actually happens — delivery is five times what it was, with fewer people and the highest satisfaction the department has recorded. I’m looking to do this again somewhere technology is central to what the business does and the ambition matches what a team like this can build.'

export interface SkillGroup {
  group: string
  items: readonly string[]
  /** The résumé's own closing line for the group, where it has one. */
  note?: string
}

/** Her skills, grouped as the résumé groups them. */
export const skills: readonly SkillGroup[] = [
  {
    group: 'Leadership',
    items: [
      'Agile',
      'Shape Up',
      'Department operations',
      'SDLC governance',
      'Engineering standards and definition of done',
      'Technical documentation practice',
      'Roadmapping',
      'Hiring and supervisor development',
      'Vendor management',
      'Stakeholder communication',
      'SOC audit readiness',
    ],
  },
  {
    group: 'Engineering',
    items: [
      'C#',
      '.NET (every version since 2.0)',
      'TypeScript',
      'Next.js',
      'React',
      'ASP.NET Core',
      'MVC',
      'EF Core',
      'Clean Architecture',
      'Multi-tenancy',
      'OAuth 2.0',
      'OpenID Connect',
      'Step-up MFA',
    ],
  },
  {
    group: 'Databases',
    items: [
      'SQL Server',
      'Azure SQL',
      'PostgreSQL',
      'MySQL',
      'Oracle',
      'Redis',
      'Schema design',
      'Stored procedures',
      'Migrations',
      'Tuning',
      'Backup and recovery',
    ],
    note: 'No separate DBA — database administration is mine.',
  },
  {
    group: 'Azure and infrastructure',
    items: [
      'App Service',
      'Key Vault',
      'Entra ID',
      'Entra External ID',
      'Managed Identity',
      'Blob Storage',
      'Application Insights',
      'Container Apps',
      'Bicep',
      'Terraform',
      'GitHub Actions',
      'Docker',
      'Railway',
      'Vercel',
      'CI/CD pipelines with contract and documentation gates',
      'Asset inventory and dependency tracking',
    ],
    note: 'I own our Azure environment end to end.',
  },
  {
    group: 'AI',
    items: [
      'Anthropic Claude',
      'OpenAI',
      'Azure OpenAI',
      'Semantic Kernel',
      'Structured tool-use output',
      'Document and vision extraction',
      'Confidence thresholds',
      'Per-tenant governance',
      'Caching and cost control',
    ],
  },
  {
    group: 'Design',
    items: ['Figma', 'Adobe Creative Suite', 'Design systems', 'Component libraries', 'Light and dark theming', 'WCAG 2.1 AA'],
  },
]
