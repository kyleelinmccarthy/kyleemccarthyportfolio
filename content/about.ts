/**
 * Who Kylee is, in her words: the headline and lead paragraph, the "about"
 * prose, the day-job block and the still-building block. The career timeline,
 * growth figures and education live in timeline.ts.
 */

/**
 * The landing scene's headline and lead paragraph (also the OG image headline).
 *
 * Register borrowed from the portfolios Kylee pointed at — bek.is, marco.fyi,
 * destroytoday, joelcalifa. They all open with one or two short sentences: a
 * descriptor or a conviction, never a résumé, never a number. Elaboration comes
 * after, and stays brief.
 *
 * The voice is hers, from her own prose: short declaratives, concrete, no
 * throat-clearing, willing to state a plain conclusion without hedging it.
 * Grown up, not changed.
 *
 * Do not put statistics here. The scenes below carry them.
 */
export const hero = {
  headline: 'There’s always a better way, and I enjoy trying to find it.',
  why: 'Full-stack, with design as the specialty — I’ll write the schema and then spend just as long getting the screen right. Some of it is my job: benefits portals, an accessibility platform. The rest is games, art, and apps for my kids.',
} as const

// Written as Kylee talking about herself, not as a résumé with
// paragraphs around it — the facts and figures are all still here, but they
// arrive as things she is telling you rather than as achievements listed.
export const about = {
  // Runs straight into the wordmark beneath it, so it has to read as the
  // first half of a sentence: "Hello, I'm" / "Kylee McCarthy".
  eyebrow: 'Hello, I’m',
  lede: 'The work itself is on the portfolio page, and the personal side is in the library. This is the background behind both.',
  arc: {
    heading: 'How I ended up here',
    lede: 'I did not set out to be an engineer. I started in benefits administration, got annoyed at how much of the job was copying things between systems, and taught myself enough to stop doing that by hand. The automation made my own role redundant, which turned out to be the best thing that could have happened.',
  },
} as const

export const lead = {
  eyebrow: 'The day job',
  statement: 'Most of what I do now is clear the way for twenty other people.',
  context:
    'My team delivers about five times what it used to, and there are fewer of us every year. Help desk volume is the lowest we have on record and satisfaction is the highest. Those numbers are the team’s — what I changed is how the work moves through us.',
  figures: [
    { value: '200', label: 'backlog items my team delivers a year, up from about 40' },
    { value: '20', label: 'people in the department I lead' },
    { value: '1 → 14', label: 'enterprise projects since 2023' },
  ],
} as const

export const build = {
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
} as const

/** The visible label on the résumé download (from the old nav button). */
export const resumeLabel = 'Kylee’s Résumé'
