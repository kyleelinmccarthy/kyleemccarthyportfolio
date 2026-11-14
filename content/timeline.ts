import type { Degree, Milestone } from './types'

/** Where all of the roles below were held, and for how long, as the résumé heads them. */
export const employer = {
  name: 'National Benefit Services, LLC',
  where: 'Remote',
  tenure: '9 years in technology, 11 with the company',
} as const

/**
 * The career arc, oldest first: the Home panel tells it in that order, the
 * Experience panel newest first. Dates, titles and points are the résumé's,
 * so nothing here is inferred; the growth numbers below carry the proof of
 * what changed.
 */
export const milestones: Milestone[] = [
  {
    from: 'Mar 2015',
    to: 'May 2016',
    title: 'Benefits Specialist',
    detail: 'Started administering benefits for employer clients.',
    points: ['Administered benefits for a portfolio of employer clients.'],
  },
  {
    from: 'May 2016',
    to: 'Jul 2017',
    title: 'Assistant Account Manager',
    detail:
      'Taught myself VB, JavaScript and REST APIs and automated the manual parts of the job without being asked to. The automation made the role redundant.',
    points: [
      'Taught myself VB, JavaScript and REST APIs and automated the manual parts of the job without being asked to. The automation made the role redundant and leadership moved me into Information Systems.',
    ],
  },
  {
    from: 'Jul 2017',
    to: 'Nov 2019',
    title: 'Information Systems Analyst',
    detail:
      'Moved into IS and earned a project lead role within a year, owning the full lifecycle on C# MVC applications.',
    points: [
      'Earned a project lead role within a year, owning the full development lifecycle on C# MVC applications and replacing manual spreadsheet workflows with T-SQL stored procedures.',
    ],
  },
  {
    from: 'Nov 2019',
    to: 'Nov 2022',
    title: 'Information Systems Analyst Lead',
    detail:
      'Led a team of analysts and built the documentation and governance frameworks the department buildout was based on.',
    points: [
      'Led a team of analysts across project pipelines and quality standards, and built the early documentation and governance frameworks the later department buildout was based on.',
    ],
  },
  {
    from: 'Nov 2022',
    title: 'Director of Technology Operations',
    detail: 'Leading a twenty-person department, remote from Saratoga Springs, UT.',
    points: [
      'Grew delivery from about 40 backlog items a year to 200, with a smaller team each year. Enterprise projects went from 1 completed in 2023 to 14 today — 6 in production, 4 releasing, 4 in active development. I built 11 of the 14 myself.',
      'Built the engineering operating model the department runs on: a design system, a project template every codebase starts from, and a versioned standards plugin that enforces itself in CI. Documentation is part of the definition of done, so decisions outlast the people who made them.',
      'Brought the department onto AI-assisted development and built the review, testing and documentation standards that came with it — none of which existed before.',
      'Made the case to build rather than buy, then delivered it as the primary engineer. The project tracker, accessibility vendor and engagement tool we licensed are already retired and replaced; the recordkeeping platform is next.',
      'Help desk volume fell to its lowest recorded level and satisfaction rose to its highest, from business users and staff alike, while I moved newly promoted supervisors into running their own teams.',
    ],
  },
]

/** Project completions per year — the curve that animates in. */
export const growth = {
  label: 'Projects my team delivered per year, after I rebuilt how we work',
  series: [
    { period: 'Inherited', value: 40 },
    { period: 'Year one', value: 130 },
    { period: 'Year two', value: 200 },
  ],
  note: 'Same team, then a smaller one. Enterprise delivery followed the same curve, from 1 completed project to 14 — 6 in production, 4 releasing, 4 in development. I changed the systems; they did the work.',
} as const

/** Education, most recent first, from the résumé. */
export const education: readonly Degree[] = [
  { degree: 'M.S. Technology Management', school: 'Western Governors University', year: '2022' },
  { degree: 'B.S. Marketing Management', school: 'Western Governors University', year: '2020' },
]
