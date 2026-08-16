/**
 * What each room says. The building's copy lives here so it can be read as
 * prose in one place and reviewed without opening a component.
 *
 * No statistics in this file. Delivery figures, headcounts and platform counts
 * belong on /about and /leadership.
 */
export const rooms = {
  steps: {
    welcome: 'Come in.',
    line: 'I make things. I don’t stop when they work.',
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
        body: '“If it isn’t broke, don’t fix it” is the enemy of progress. There is always a better way; the only question is whether it’s the most urgent thing right now. Anything can be scrapped for something better, including my own work.',
      },
      {
        title: 'AI is a tool, not the problem',
        body: 'I don’t think AI is the problem — I think greedy people misusing it are. It doesn’t have to replace anyone. It’s another tool on the belt for people who use it well and with integrity, the same as computers and the internet were.',
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
