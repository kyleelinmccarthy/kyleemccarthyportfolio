import type { Theme } from './types'

/**
 * What the guide says: Kylee, standing beside each landmark in a speech
 * bubble. Plain text only, each line at most 140 characters (tested), in her
 * voice and from what the site already says. Edit freely: no code reads these
 * words, only the keys.
 *
 * DRAFT for Kylee's review: written for her from the existing copy.
 */
export const guide = {
  /** Said first, the first time a visitor reaches the planet in a visit, with a choice of the tour or a look round alone. By day or by night (the site's theme). */
  greeting: {
    day: 'Hi, I’m Kylee. This is everything I make, laid out as a tiny planet. Want the tour, or would you rather wander?',
    night: 'Hi, I’m Kylee. Up late? So am I. This is everything I make, laid out as a tiny planet. Want the tour, or a wander?',
  } satisfies Record<Theme, string>,

  /** Before the place's own line, the first time a visitor lands straight on a place rather than the planet. */
  hello: 'Hi, I’m Kylee.',

  /** One line at each place, by its id (`content/world.ts`). */
  places: {
    home: 'Home: the background behind the work. Say hi to the dogs and the cats on your way in, and mind the koi.',
    'three-things': 'Three flags for the three things I work by: keep moving, nothing is sacred, and AI is a tool, not the problem.',
    beacon: 'Beacon’s dashboard welcomes you to the Lighthouse, so this had to be one. It replaced the stack my department ran on.',
    '403hq': 'A client put their contract out to bid. I shipped this portal in six weeks, and they stayed.',
    aura: 'AURA drops into any site as one script tag. Watch the rings go out from the mast: that’s the idea.',
    ruckus: 'Ten multiplayer games, built to replace an engagement tool nobody liked. The striped ball does turn, slowly.',
    'nbs-website': 'Sixty-six pages rebuilt, and marketing can change a word without a developer now. AURA runs here too.',
    'on-the-go': 'Still under construction: Paragon, Onboarding and the tech processes behind the rest. The crane never stops.',
    'tiny-frenzy-games': 'My one-person game studio. One dev, all the frenzy. Yes, the joystick on the roof wiggles.',
    eliminated: 'A wholesome party game where everyone dies. Lose, and you’re boxed up with a little pink bow.',
    'eliminated-site': 'The front door for the game: one page, a press kit, and no cookies or trackers.',
    'jimothy-and-pidge': 'A round raccoon and his pigeon pal take Seattle back from the Terrible Trapper. It’s always raining here.',
    'kingdoms-and-crowns': 'A homeschool hub with a 3D world inside. Finished quests earn time in the Realm, where each deed raises a building.',
    'the-budget': 'Every budgeting app assumes you get paid on the first. We don’t, so this one works by pay period.',
    'ember-tattoo': 'A friend’s studio had a site that didn’t match the work. Nobody hired me; I saw the gap.',
    art: 'Digital, pencil, ink and paint. Anime turns up in my art whether I plan it or not.',
    'tattoo-designs': 'Designs I drew for people who got them. Scroll or pinch to zoom in on the board.',
    'off-the-clock': 'Everything that isn’t a screen: hiking, games, D&D, concerts. Press [ and ] to walk round the mountain.',
    post: 'Want to say hello back? Drop me a letter: the form is in the panel.',
  } as Record<string, string>,

  /** The tour: the links the bubble offers, and what she says at the last stop. */
  tour: {
    /** On the greeting: go to the first stop. */
    start: 'Start the tour',
    /** On the greeting: close it and look round alone. */
    alone: 'I’ll look around',
    next: 'Next',
    back: 'Back',
    /** Said after the place's line at the last stop. */
    last: 'That’s the whole tour. Thanks for walking round with me.',
    /** At the last stop, in place of Next. */
    finish: 'Back to the planet',
  },

  /** Over the planet after the greeting, taking turns. */
  idle: [
    'Click any building to go and see it. I’ll meet you there.',
    'At a place, [ and ] walk you round it, - and + zoom, and 0 puts the view back. On a phone, double-tap.',
  ],

  /** The controls round her and the visitor's character. */
  controls: {
    /** The bubble's close button: hints off for the rest of the visit. */
    hide: 'Hide guide hints',
    /** Brings them back. */
    show: 'Show guide hints',
    /** Opens the character picker. */
    change: 'Change your character',
    /** On the folded bubble: opens what she says. */
    open: 'What Kylee says',
    /** Folds the bubble down to her face. */
    fold: 'Fold away',
    pickerTitle: 'Pick your character',
    pickerIntro: 'Whoever you make walks round with you. It’s kept on this device only.',
    /** The picker's three groups of choices. */
    age: 'Age',
    style: 'Style',
    skin: 'Skin tone',
    /** The picture of the character as chosen. */
    preview: 'Your character as chosen',
    done: 'Done',
    close: 'Close',
  },
} as const
