import type { Milestone } from './types'

/**
 * The career arc, as an animated timeline. Phase markers (not invented exact
 * years) keep it accurate; the growth numbers below carry the proof.
 * Kylee: replace the markers with real years if you'd like hard dates.
 */
export const milestones: Milestone[] = [
  {
    marker: 'The start',
    title: 'Call-center benefits specialist',
    detail: 'Started on the phones. Automated my way into technology.',
  },
  {
    marker: 'Four roles up',
    title: 'Progressive roles, one organization',
    detail: 'Worked up through four increasingly senior roles over eleven years.',
  },
  {
    marker: 'In parallel',
    title: 'Lead UX/UI designer',
    detail: 'Built the company design system now used across every IS project.',
  },
  {
    marker: 'Today',
    title: 'Director of Technology Operations',
    detail: 'Leading a 20+ person IS department, remote from Saratoga Springs, UT.',
  },
  {
    marker: '2026',
    title: 'Still shipping',
    detail: '11 production apps this year: 6 at work in four months, 5 on personal time.',
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
  note: 'Same team, then a smaller one. Enterprise delivery followed the same curve, from 1 completed project to 7, with 3 more in development. I changed the systems; they did the work.',
} as const

/** Education, kept as a compact footnote rather than a paragraph. */
export const education = [
  'M.S. Technology Management',
  'B.S. Marketing Management',
] as const
