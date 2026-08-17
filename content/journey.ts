/**
 * The site IS the journey: five scroll-driven scenes that replace the old
 * static sections. Directions choreograph the camera (see Journey.tsx).
 */
export const journey = {
  // /about. Written as Kylee talking about herself, not as a résumé with
  // paragraphs around it — the facts and figures are all still here, but they
  // arrive as things she is telling you rather than as achievements listed.
  about: {
    eyebrow: 'Hello',
    lede: 'The work itself is on the portfolio page, and the personal side is in the library. This is the background behind both.',
    arc: {
      heading: 'How I ended up here',
      lede: 'I did not set out to be an engineer. I started in benefits administration, got annoyed at how much of the job was copying things between systems, and taught myself enough to stop doing that by hand. The automation made my own role redundant, which turned out to be the best thing that could have happened.',
    },
  },
  lead: {
    eyebrow: 'The day job',
    statement: 'Most of what I do now is clear the way for twenty other people.',
    context:
      'My team delivers about five times what it used to, and there are fewer of us every year. Help desk volume is the lowest we have on record and satisfaction is the highest. Those numbers are the team’s — what I changed is how the work moves through us.',
    figures: [
      { value: '200', label: 'backlog items my team delivers a year, up from about 40' },
      { value: '20', label: 'people in the department I lead' },
      { value: '1 → 14', label: 'enterprise projects since 2023' },
    ],
  },
  build: {
    eyebrow: 'Still building',
    // Directing a department has not stopped her writing the code — that is the
    // point of this block, and the figures underneath are the evidence.
    statement: 'I never stopped building the things I ask other people to build.',
    context:
      'Six of these run AI in production, and every one of them has to survive an audit. Documents go in as native PDF and image blocks and come back through forced tool-use against a JSON schema, so what I get is structured data rather than prose I have to pick apart. Every extraction carries a confidence score, and the score decides whether the work posts, waits for a person, or gets thrown out. I like that part — the whole trick is deciding what the machine is allowed to be sure about.',
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
