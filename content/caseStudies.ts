/**
 * The seven pieces on the gallery wall, written from Kylee's own interview
 * answers (see the spec's Source material section). Where she has a phrase,
 * it is kept. Nothing here is inferred.
 */
export interface Placard {
  /** The part she'd warn someone about. */
  hard: string
  /** What got built and thrown away. Required — see the spec. */
  threwAway: string
  /** What she'd do differently now. */
  differently: string
  /** Who it was actually for. */
  builtFor: string
}

export interface CaseStudy {
  slug: string
  whatItIs: string
  problem: string
  whyBuiltThisWay: string
  placard: Placard
}

/** Wall order. Four professional, three personal, deliberately interleaved. */
export const FEATURED = [
  'beacon',
  '403hq',
  'aura',
  'nbs-website',
  'kingdoms-and-crowns',
  'chemtree-hq',
  'wretched-few',
] as const

export const caseStudies: CaseStudy[] = [
  {
    slug: 'beacon',
    whatItIs: 'One app the whole IS department runs on — projects, tickets, assets, pull requests, scorecards.',
    problem: 'Every role in a tech department needs something different, and none of them agreed. Work was spread across Azure DevOps, GitHub Enterprise and ServiceDesk Plus, so nobody could see the whole picture at once.',
    whyBuiltThisWay: 'One project model underneath, and a different face on it per role. That was the hard constraint — an analyst, an engineer and an executive all open the same app and each get something usable. Buying three tools and wiring them together would have meant three places for the truth to disagree with itself.',
    placard: {
      hard: 'Capturing what every role in the department needs, in one app, without it turning into a menu of everything.',
      threwAway: 'An earlier app of mine called Tech Portfolio. It was on an old stack and its usability had a ceiling, so Beacon replaced it outright rather than extending it.',
      differently: 'Smaller features, more often. It’s easy to add a lot quickly — but then a rollout lands on people as a pile of new functionality all at once, and that’s a worse experience than waiting.',
      builtFor: 'Me, to run the department. Then my team, and the leadership team.',
    },
  },
  {
    slug: '403hq',
    whatItIs: 'A benefits portal for a client with roughly ten thousand employees. Then a second one for another.',
    problem: 'A high-priority client was leaving. Retaining them meant a portal that didn’t exist yet, and leadership set the deadline before anyone scoped the work.',
    whyBuiltThisWay: 'Built to be a second thing before the first one shipped. Five role personas, step-up MFA and user-managed content, structured so another client could get their own branding and plan rules without a fork. That call is the only reason version two took weeks instead of another six.',
    placard: {
      hard: 'Two of us, six weeks, mandated. Build it, test it, pen test it, get it to production. The most challenging thing I’ve done in my career — and we finished with a couple of days spare.',
      threwAway: 'The branding. Everything was built under a placeholder name; the real one arrived mid-development, all at once, like a lightbulb.',
      differently: 'The testing approach. We have no traditional QA, our users find testing hard, and things occasionally reach production that should have been caught.',
      builtFor: 'A high-priority client that was on its way out. Then a second one, with tweaks.',
    },
  },
  {
    slug: 'aura',
    whatItIs: 'Accessibility compliance as a single script tag. Colour controls, ADHD mode, and a set of things I’m genuinely fond of.',
    problem: 'We were paying accessiBe per site. Every new web property made that worse, and more were coming.',
    whyBuiltThisWay: 'It had to drop into any site without caring what that site is built on, because the properties don’t share a stack. Hosted once, used as many times as we like — so the cost of the next site is nothing.',
    placard: {
      hard: 'A flexible, compliant ADA widget with real features that works regardless of the host’s tech stack. I’d never built a widget before.',
      threwAway: 'The name, again — I had no idea what to call it until it was finished. Everything I built on day one is still in there.',
      differently: 'Tell people what it can do. Something on first run, so users discover the colour controls and ADHD mode instead of stumbling into them.',
      builtFor: 'Our SVP of Tech asked for it to replace accessiBe.',
    },
  },
  {
    slug: 'nbs-website',
    whatItIs: 'The company’s public site, rebuilt across sixty-six pages, with the CMS marketing had been asking for.',
    problem: 'Clients had been asking for a new website for years. Previous tech leaders never prioritised it.',
    whyBuiltThisWay: 'Restructured around who actually visits — participants, sponsors, advisors — rather than around the org chart. Secure upload was built into the site instead of living somewhere else, because sending users between two sites to do one thing isn’t a rebuild, it’s a redirect.',
    placard: {
      hard: 'Turning every request from the senior leadership team and the board into something clean, modern and actually usable.',
      threwAway: 'A connection to an internal app, replaced with a custom secure document upload. We didn’t want users bouncing between separate sites.',
      differently: 'Get end users in earlier and start the feedback loop sooner.',
      builtFor: 'The company — but really leadership and sales. Nobody prioritised it, so I just built it.',
    },
  },
  {
    slug: 'kingdoms-and-crowns',
    whatItIs: 'A homeschool hub that tracks a full week per child, with quests, XP and a timer that survives closing the tab.',
    problem: 'Homeschool planning is scattered across curriculum sites and paper, and none of it is built for the person doing the work: the kid.',
    whyBuiltThisWay: 'Made for the student first and the parent second. The timer persists across tabs and devices because a child’s attention doesn’t respect a browser session, and rewards are for staying on task rather than for finishing fast.',
    placard: {
      hard: 'Compliance for child users, and making it usable across a wide age range at the same time.',
      threwAway: 'Integrations with other curriculum platforms. Parents can share links instead of the app embedding all of it — at least in iteration one.',
      differently: 'A browser-based quest to start an assignment, where students choose their path: go learn on another platform, or stay here and do a gamified lesson for a core subject.',
      builtFor: 'My kids and me, so homeschooling stays organised without being a chore.',
    },
  },
  {
    slug: 'chemtree-hq',
    whatItIs: 'A shared workspace for remote projects. Documents merge instead of overwriting, and the whiteboard is multi-user.',
    problem: 'Running a project with someone remote meant a dozen tools that didn’t talk to each other, and documents that clobbered each other when we both typed.',
    whyBuiltThisWay: 'CRDTs rather than locking, so nobody waits for a turn. Follow-along and live saving are the point — the tool is for two people working at once, not for one person at a time with a save button.',
    placard: {
      hard: 'The multi-user whiteboard — follow-along, and saving every user’s changes as they happen.',
      threwAway: 'An earlier version of this built for a different company that got scrapped. I reused the concept here.',
      differently: 'More brainstorming features, and prompts for prioritising and organising ideas rather than just holding them.',
      builtFor: 'Me and a friend, so we could collaborate on game development.',
    },
  },
  {
    slug: 'wretched-few',
    whatItIs: 'A multiplayer roguelite in Unity where you play the monsters. I own the story, the HUD, the player UX and the art.',
    problem: 'My friend had an idea. I wanted to find out whether the two of us could actually make a game.',
    whyBuiltThisWay: 'Built by throwing things away on purpose. Make the simple version, look at it, play it, bin it, make it better — which is slower up front and much faster than designing a thing nobody has held yet.',
    placard: {
      hard: 'Everything. 3D modelling, the HUD, player UX, sfx, vfx, procedural map generation, and a story that stays coherent with combat and gameplay. It’s a lot, and I absolutely love it.',
      threwAway: 'A lot, deliberately — early simple builds made to be seen, tested and then replaced with something better.',
      differently: 'Still in progress, so I’m still learning. I’d spend more time on animation and 3D modelling and less on the in-game menu UI.',
      builtFor: 'My friend brought the idea, I grew it into the story. It’s for gamers like us.',
    },
  },
]
