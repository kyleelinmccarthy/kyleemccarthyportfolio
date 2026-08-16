/**
 * The site IS the journey: five scroll-driven scenes that replace the old
 * static sections. Directions choreograph the camera (see Journey.tsx).
 */
export const journey = {
  about: {
    eyebrow: 'Get to know',
    // Third and last block on the first screen. It used to restate the
    // headline's origin story and the lead paragraph's hands-on claim; now it
    // does the one job neither of those can — telling you what this site is and
    // what the door at the end of the scroll is for.
    lede: 'The professional work is on the work page. The games, the art, and the things I build for my kids are through the door at the end.',
    // `heading` lived here unread — AboutScene renders the eyebrow, the logo,
    // hero.headline and hero.why, and nothing else. The career arc and degrees
    // live in content/timeline.ts and render on /about.
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
    // Was "And I stay close enough to build it myself" — the fourth restatement
    // of the hands-on claim the landing scene now makes once, properly. This
    // instead sets up the paragraph underneath it.
    statement: 'Six of these platforms run AI in production, under audit.',
    context:
      'Six systems run AI under audit across three providers. Documents are read as native PDF and image blocks and returned through forced tool-use against a JSON schema, so results are structured rather than parsed out of prose. Every extraction carries a confidence score, and thresholds decide whether work posts, queues for a human, or is rejected.',
    figures: [
      { value: '11 of 14', label: 'enterprise platforms I built myself' },
      { value: '15+', label: 'sites running AURA at no extra cost' },
      { value: '6 weeks', label: 'kickoff to a live client portal that kept the contract' },
    ],
  },
  // The closing scene. It used to be a hiring-funnel close ("Let's get to work")
  // on a site that is a showcase — so it now points at the work instead of
  // asking for a meeting, and the door sits directly beneath it.
  talk: {
    heading: 'Go poke around.',
    body: 'That was the summary. The actual work is all here to look at — client portals and an accessibility platform at the day job, games and art and half-finished experiments after hours.',
  },
} as const
