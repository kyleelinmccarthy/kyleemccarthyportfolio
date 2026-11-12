import type { Principle } from './types'

/** Her three principles, in her words, unchanged. */
export const principles: { eyebrow: string; heading: string; items: Principle[] } = {
  eyebrow: 'My process',
  heading: 'Three things',
  // No lede. There was one, and it was a summary of the three principles
  // sitting directly beneath it — saying the same thing twice, badly.
  items: [
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
}
