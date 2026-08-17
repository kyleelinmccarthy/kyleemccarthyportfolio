/**
 * What each room says. The building's copy lives here so it can be read as
 * prose in one place and reviewed without opening a component.
 *
 * No statistics in this file. Delivery figures, headcounts and platform counts
 * belong on /about, which is where everything résumé-shaped lives.
 */
export const rooms = {
  steps: {
    /**
     * Rendered on the server and whenever JS is off. Always correct, never
     * wrong — the visitor's local hour isn't knowable until we're in their
     * browser, so guessing here would mean a hydration mismatch.
     */
    welcome: 'Welcome. The door’s open.',
    /**
     * Swapped in on the client once the local hour is known. `from` is the
     * first hour of each band; anything before the earliest band wraps round
     * to the last one, so the small hours get the late-night greeting.
     */
    greetings: [
      { from: 5, text: 'Morning. Welcome — the door’s open.' },
      { from: 12, text: 'Afternoon. Welcome — the door’s open.' },
      { from: 17, text: 'Evening. Welcome — the door’s open.' },
      { from: 22, text: 'Up late? So am I. Welcome.' },
    ],
    // No tagline out here. The front step is a welcome and nothing else; the
    // line that says who she is now greets you inside, as `window.entry`.
  },
  window: {
    /**
     * The first thing you read once you're through the door — Kylee's own
     * words, from the interview: "theres always a better way."
     *
     * It sat on the front step for a while, competing with the welcome. It
     * lands better here: you step inside and the house tells you what it is.
     * It also explains the gallery two rooms along, since every piece there
     * exists because something already existed and wasn't good enough.
     */
    entry: 'There’s always a better way, and I like trying to find it.',
    eyebrow: 'My process',
    heading: 'Three things',
    // No lede. There was one, and it was a summary of the three principles
    // sitting directly beneath it — saying the same thing twice, badly.
    principles: [
      {
        title: 'Keep moving',
        body: 'When I’m stuck I write — stream of consciousness, real pencil and real paper — or I go talk to someone about it. Getting something out is what breaks the block. An object in motion stays in motion.',
      },
      {
        title: 'Nothing is sacred',
        body: '“If it isn’t broke, don’t fix it” is the enemy of progress. There is always a better way — it’s a matter of prioritising time and resources on what’s most urgent and important right now. Nothing is sacred. Anything can be scrapped for something else if it’s the top priority at that time.',
      },
      {
        title: 'AI is a tool, not the problem',
        body: 'I don’t think AI is the problem — I think greedy people misusing it are. It has real potential as a tool, just like the early days of technology did with computers, the internet, Google. It doesn’t have to replace anyone. It’s another tool on the belt for people who use it well and with integrity.',
      },
    ],
  },
  floor: {
    eyebrow: 'The work',
    heading: 'Seven things I made',
    lede: 'Four at work, three after hours.',
    placardHint: 'More about this one',
  },
  desk: {
    eyebrow: 'The desk',
    heading: 'Everything else',
    lede: 'Side quests, older things, and whatever is currently half-finished.',
  },
  wayOut: {
    heading: 'Thanks for stopping by.',
    body: 'Come back and see what’s new — there usually is something. And there’s one more room at the back: my personal library.',
    door: {
      /**
       * The visible words on the door at the end of the tour. The aria-label
       * has to start with these — WCAG 2.5.3, so someone driving by voice can
       * say what they can read.
       */
      label: 'Step into the library',
      description: 'the personal side of the site',
    },
    mailbox: {
      label: 'Send me a letter',
      hint: 'It goes straight to my inbox and I reply myself.',
      sent: 'In the post. I’ll write back.',
    },
  },
} as const
