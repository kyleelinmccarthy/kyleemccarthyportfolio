/**
 * What each room says. The building's copy lives here so it can be read as
 * prose in one place and reviewed without opening a component.
 *
 * No statistics in this file. Delivery figures, headcounts and platform counts
 * belong on /about and /leadership.
 */
export const rooms = {
  steps: {
    /**
     * Rendered on the server and whenever JS is off. Always correct, never
     * wrong — the visitor's local hour isn't knowable until we're in their
     * browser, so guessing here would mean a hydration mismatch.
     */
    welcome: 'Come on in — the door’s open.',
    /**
     * Swapped in on the client once the local hour is known. `from` is the
     * first hour of each band; anything before the earliest band wraps round
     * to the last one, so the small hours get the late-night greeting.
     */
    greetings: [
      { from: 5, text: 'Morning. Come on in — the door’s open.' },
      { from: 12, text: 'Afternoon. Come on in — the door’s open.' },
      { from: 17, text: 'Evening. The door’s open, come on in.' },
      { from: 22, text: 'Up late? So am I. Come on in.' },
    ],
    line: 'I solve problems. I care what the answer looks like.',
  },
  window: {
    eyebrow: 'Before the work',
    heading: 'How I go about it',
    lede: 'Three things that are true of everything on the other side of this room.',
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
    eyebrow: 'Selected work',
    heading: 'Seven things worth walking past',
    lede: 'Four from the day job, three from after it. Every placard says what went wrong.',
    placardHint: 'What went wrong',
  },
  desk: {
    eyebrow: 'The desk',
    heading: 'Everything else',
    lede: 'Side quests, older things, and whatever is currently half-finished.',
  },
  wayOut: {
    heading: 'That’s the tour.',
    body: 'There’s another room, if you want to know what I’m like when I’m not working.',
    mailbox: {
      label: 'Send me a letter',
      hint: 'It goes straight to my inbox and I reply myself.',
      sent: 'In the post. I’ll write back.',
    },
  },
} as const
