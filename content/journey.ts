/**
 * The site IS the journey: five scroll-driven scenes that replace the old
 * static sections. Directions choreograph the camera (see Journey.tsx).
 */
export const journey = {
  about: {
    eyebrow: 'Get to know',
    heading: 'The strategist who also builds',
    lede: 'I taught myself to code by automating my own job. Eleven years later I run the department, and I still write production code.',
    // The career arc and the degrees live in content/timeline.ts (milestones,
    // education) and render on /about. They were duplicated here as four
    // undated labels; one source of truth is enough.
  },
  lead: {
    eyebrow: 'How I lead',
    statement: 'I build the systems that make great work routine.',
    context:
      'Delivery is five times what it was, with a smaller team each year, and help desk volume is at its lowest recorded level while satisfaction is at its highest. The numbers are my team’s work. The operating model behind them is what I changed.',
    figures: [
      { value: '200', label: 'backlog items my team delivers a year, up from about 40' },
      { value: '20', label: 'people in the department I lead' },
      { value: '1 → 14', label: 'enterprise projects since 2023' },
    ],
  },
  value: {
    eyebrow: 'How I create value',
    statement: 'Four places I tend to be most useful.',
    items: [
      { number: '01', title: 'Technology leadership', tag: 'An operating model, a design system, and standards that enforce themselves in CI.' },
      { number: '02', title: 'AI in production, under audit', tag: 'Structured tool-use, confidence thresholds, per-tenant governance.' },
      { number: '03', title: 'Product & UX/UI design', tag: 'I design the system and the interface to it.' },
      { number: '04', title: 'Build over buy', tag: 'Three vendor tools retired and replaced. The recordkeeping platform is next.' },
    ],
  },
  build: {
    eyebrow: 'What I build',
    statement: 'And I stay close enough to build it myself.',
    context:
      'Six systems run AI under audit across three providers. Documents are read as native PDF and image blocks and returned through forced tool-use against a JSON schema, so results are structured rather than parsed out of prose. Every extraction carries a confidence score, and thresholds decide whether work posts, queues for a human, or is rejected.',
    figures: [
      { value: '11 of 14', label: 'enterprise platforms I built myself' },
      { value: '15+', label: 'sites running AURA at no extra cost' },
      { value: '6 weeks', label: 'kickoff to a live client portal that kept the contract' },
    ],
  },
  talk: {
    heading: 'Let’s get to work.',
    body: 'I’d rather build it than just talk about it.',
  },
} as const
