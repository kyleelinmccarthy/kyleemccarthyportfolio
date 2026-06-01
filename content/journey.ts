/**
 * The site IS the journey: five scroll-driven scenes that replace the old
 * static sections. Directions choreograph the camera (see Journey.tsx).
 */
export const journey = {
  about: {
    eyebrow: 'Get to know',
    heading: 'The strategist who also builds',
    lede: 'I started in a call center and automated my way into technology. Eleven years later I run the department, and I still write the code.',
    milestones: [
      'Director of Technology Operations',
      'M.S. Technology Management',
      'B.S. Marketing Management',
      '11+ years, four progressive roles, one organization',
    ],
  },
  lead: {
    eyebrow: 'How I lead',
    statement: 'I build the systems that make great work routine.',
    context:
      'When I became Director, I rebuilt the processes, accountability, and culture my team runs on. The numbers below are my team’s work. The systems behind them are what I changed.',
    figures: [
      { value: '200+', label: 'projects my team delivered in a single year' },
      { value: '20+', label: 'people I lead as Director' },
      { value: '2×+', label: 'team velocity, year over year, with fewer people' },
    ],
  },
  value: {
    eyebrow: 'How I create value',
    statement: 'Four places I tend to be most useful.',
    items: [
      { number: '01', title: 'Technology leadership', tag: 'Governance, accountability, and high-performing teams.' },
      { number: '02', title: 'AI strategy & implementation', tag: 'Adopted, governed, productive AI development.' },
      { number: '03', title: 'Product & UX/UI design', tag: 'I design the system and the interface to it.' },
      { number: '04', title: 'Advisory', tag: 'Senior judgment without the full-time hire.' },
    ],
  },
  build: {
    eyebrow: 'What I build',
    statement: 'And I stay close enough to build it myself.',
    context:
      'Those nine are 2026 alone. One of them, Aura, is an accessibility platform I built in-house to replace per-site vendor licensing. It now runs on 10+ sites at zero marginal cost, and the savings compound with every new property the company adds.',
    figures: [
      { value: '9', label: 'production apps built in 2026 so far' },
      { value: '6 weeks', label: 'kickoff to a live client portal that kept the contract' },
      { value: '10+', label: 'sites on Aura, the accessibility platform I built' },
    ],
    flagships: ['403HQ', 'Tech Hub', 'Aura', 'NBS Marketing Site'],
  },
  talk: {
    heading: 'Let’s get to work.',
    body: 'I’d rather build it than just talk about it.',
  },
} as const
