import type { Milestone } from './types'

/**
 * The career arc, rendered on /about. Markers are the real start dates from
 * the résumé, so nothing here is inferred; the growth numbers below carry the
 * proof of what changed.
 */
export const milestones: Milestone[] = [
  {
    marker: 'Mar 2015',
    title: 'Benefits specialist',
    detail: 'Started administering benefits for employer clients.',
  },
  {
    marker: 'May 2016',
    title: 'Assistant account manager',
    detail:
      'Taught myself VB, JavaScript and REST APIs and automated the manual parts of the job without being asked to. The automation made the role redundant.',
  },
  {
    marker: 'Jul 2017',
    title: 'Information systems analyst',
    detail:
      'Moved into IS and earned a project lead role within a year, owning the full lifecycle on C# MVC applications.',
  },
  {
    marker: 'Nov 2019',
    title: 'Information systems analyst lead',
    detail:
      'Led a team of analysts and built the documentation and governance frameworks the department buildout was based on.',
  },
  {
    marker: 'Nov 2022',
    title: 'Director of Technology Operations',
    detail: 'Leading a twenty-person department, remote from Saratoga Springs, UT.',
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

/** Education, kept as a compact footnote rather than a paragraph. */
export const education = [
  'M.S. Technology Management',
  'B.S. Marketing Management',
] as const
