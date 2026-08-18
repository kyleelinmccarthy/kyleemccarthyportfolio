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
    welcome: 'Come on in, the door’s open.',
    /**
     * The salutation only, swapped in on the client once the local hour is
     * known, and set on its own line above the welcome.
     *
     * It used to be baked into each greeting as a full sentence, which meant
     * the same eight words were written out four times and the whole thing
     * arrived as one line that wrapped wherever the viewport put it. `from` is
     * the first hour of each band; anything before the earliest band wraps
     * round to the last one, so the small hours get the late-night greeting.
     */
    greetings: [
      { from: 5, text: 'Morning.' },
      { from: 12, text: 'Afternoon.' },
      { from: 17, text: 'Evening.' },
      { from: 22, text: 'Up late? So am I.' },
    ],
    /**
     * The accessible name of the door itself, which is a real button: clicking
     * it walks you into the next room rather than making you scroll there.
     * Says what happens, not what the thing is — a voice-control user asking
     * for "come inside" gets the door.
     */
    doorAction: 'Come inside',
    // No tagline out here. The front step is a welcome and nothing else; the
    // line that says who she is now greets you inside, as `window.entry`.
  },
  landing: {
    /**
     * The first thing you read once you're through the door — Kylee's own
     * words, from the interview: "theres always a better way."
     *
     * It sat on the front step for a while, competing with the welcome. It
     * lands better here: you step inside and the house tells you what it is.
     * It also explains the gallery two rooms along, since every piece there
     * exists because something already existed and wasn't good enough.
     */
    entry: 'There’s always a better way, and I enjoy trying to find it.',
    /**
     * The staircase is a button, the same as the front door a room back.
     * There was a window here and you were invited to click through it, which
     * nobody does to a window.
     *
     * The label is on screen as well as in the accessible name — the room's
     * own photograph has a staircase in it, so drawn treads alone did not read
     * as a thing you could press. WCAG 2.5.3: the accessible name starts with
     * the visible words.
     */
    stairs: {
      label: 'Upstairs',
      description: 'go up to the work',
    },
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
    /**
     * The gallery has no visible heading. It used to open with an eyebrow, a
     * heading and a count of the pieces, which is three lines telling you that
     * work is coming instead of showing you the work. The room is a wall of
     * pieces; the pieces introduce themselves.
     *
     * `label` is still the section's accessible name — a landmark with no name
     * is worse than one with a plain one.
     */
    label: 'The work',
    placardHint: 'More about this one',
    /**
     * The personal builds came off this wall — they were being shown here and
     * again on their own shelf. This is the pointer that replaces them, so
     * someone walking the gallery still knows the other half exists.
     */
    libraryNote: 'The things I build after hours are in the library',
  },
  desk: {
    eyebrow: 'The desk',
    heading: 'Also on the go',
    lede: 'Other recent work, and what’s in progress right now.',
  },
  wayOut: {
    heading: 'Thanks for stopping by.',
    // Two paragraphs, not one: the invitation to come back and the pointer to
    // the library are separate thoughts and were running together.
    body: [
      'Come back and see what’s new — there usually is something.',
      'And there’s one more room at the back: my personal library.',
    ],
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
