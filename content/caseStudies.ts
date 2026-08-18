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
  /**
   * Optional, because a placard is written from Kylee's own four answers about
   * a piece and some pieces do not have them yet. A missing placard renders
   * nothing — it never renders an invented one.
   */
  placard?: Placard
}

/**
 * Wall order — the professional work only.
 *
 * The three personal pieces used to hang here too, which meant Kingdoms &
 * Crowns, ChemTreeHQ and The Wretched Few were shown twice: once on the wall
 * and again on their own shelf in the library. The gallery points at the
 * library instead (see rooms.floor.libraryNote).
 */
export const FEATURED = [
  'beacon',
  '403hq',
  'aura',
  'ruckus',
  'nbs-website',
] as const

export const caseStudies: CaseStudy[] = [
  {
    slug: 'ruckus',
    whatItIs: 'Ten browser-based multiplayer games, with live polls and quizzes, for a fully remote company.',
    problem:
      'The company was paying for AhaSlides — low adoption, shared logins, and nothing employees found compelling.',
    whyBuiltThisWay:
      'Live play runs over SignalR, and the whole thing sits behind Microsoft SSO so access follows the identity infrastructure already in place. That retired the vendor and removed shared-login access management entirely.',
    placard: {
      hard: 'Figuring out how to do web-based multiplayer games with a host that are genuinely interactive and engaging — and building dynamic, interactive presentations good enough to replace AhaSlides.',
      threwAway: 'The game list. I started with a much longer one and cut several of the ideas so it would ship sooner.',
      differently: 'Get people from outside technology involved sooner.',
      builtFor: 'The technology department, but really HR and leadership — social engagement across a remote company is something they had been working on for years.',
    },
  },
  {
    slug: 'beacon',
    whatItIs: 'One app the whole IS department runs on — projects, tickets, assets, pull requests, scorecards.',
    problem: 'Every role in a tech department needs something different, and none of them agreed. Work was spread across Azure DevOps, GitHub Enterprise and ServiceDesk Plus, so nobody could see the whole picture at once.',
    whyBuiltThisWay: 'One project model underneath, replacing the three separate systems work had been spread across — Azure DevOps, GitHub Enterprise and ServiceDesk Plus — with one source of truth.',
    placard: {
      hard: 'Capturing what every role in the department needs, in one app, in a way that’s user-friendly and adaptable.',
      threwAway: 'An earlier app of mine called Tech Portfolio. It was on an old stack with limited usability, so Beacon replaced it outright.',
      differently: 'Smaller features, more often. It’s easy to add a lot in a small timeframe, but then rollouts become more overwhelming to users with a lot of new features and functionality at once.',
      builtFor: 'Me, to run the department. Then my team, and the leadership team.',
    },
  },
  {
    slug: '403hq',
    whatItIs: 'A benefits portal for a client with roughly ten thousand employees. Then a second one for another.',
    problem: 'A high-priority client’s contract needed retaining. Leadership mandated the build, with six weeks to get it live.',
    whyBuiltThisWay: 'Five role personas, step-up MFA and user-managed content. A second deployment for another client reused the same codebase with its own branding and plan rules.',
    placard: {
      hard: 'Two of us, six weeks, mandated. Build it, test it, pen test it, get it to production. The most challenging thing I’ve done in my career — and we finished with a couple of days spare.',
      threwAway: 'The branding. Everything was built under a placeholder name until, mid-development, the real one came to me like a lightbulb moment.',
      differently: 'The testing approach. We have no traditional QA, our users find testing hard, and things occasionally reach production that should have been caught.',
      builtFor: 'A high-priority client, to retain their contract. Then a second client, with tweaks.',
    },
  },
  {
    slug: 'aura',
    whatItIs: 'Accessibility compliance as a single script tag. Colour controls, ADHD mode, and a set of things I’m genuinely fond of.',
    problem: 'We were paying accessiBe per site. Every new web property made that worse, and more were coming.',
    whyBuiltThisWay: 'Drops into any site as a single script tag, so it works regardless of what that site is built on. Hosted once, used on every property since — the cost of the next site is nothing.',
    placard: {
      hard: 'A flexible, compliant ADA widget with real features that works regardless of the host’s tech stack. I’d never built a widget before.',
      threwAway: 'The name, again — I had no idea what to call it until it was finished. Everything I built on day one is still in there.',
      differently: 'Tell people what it can do — a notification or pop-up on first run so users understand its capabilities.',
      builtFor: 'Our SVP of Tech asked for it to replace accessiBe.',
    },
  },
  {
    slug: 'nbs-website',
    whatItIs: 'The company’s public site, rebuilt across sixty-six pages, with the CMS marketing had been asking for.',
    problem: 'Clients had been asking for a new website for years. Previous tech leaders never prioritised it.',
    whyBuiltThisWay: 'Restructured around who actually visits — participants, sponsors and advisors — instead of the org chart. Secure document upload was built into the site itself rather than kept as a separate connection to another app.',
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
    whyBuiltThisWay: 'Made for the student first, the parent second — the person actually doing the work. The timer persists across tabs and devices, and rewards are for staying on task rather than for finishing fast.',
    placard: {
      hard: 'Compliance for child users, and making it usable across a wide age range at the same time.',
      threwAway: 'Integrations with other curriculum platforms. Parents can share links instead of the app embedding all of it — at least in iteration one.',
      differently: 'A browser-based quest to start an assignment, where students choose their path: go learn on another platform, or stay here and do a gamified lesson for a core subject.',
      builtFor: 'My kids and me, to stay organised in an easy, fun way while homeschooling.',
    },
  },
  {
    slug: 'chemtree-hq',
    whatItIs: 'A shared workspace for remote projects. Documents merge instead of overwriting, and the whiteboard is multi-user.',
    problem: 'Running a project with someone remote meant a dozen tools that didn’t talk to each other, and documents that clobbered each other when we both typed.',
    whyBuiltThisWay: 'Documents edit live through CRDTs, so simultaneous edits merge instead of overwriting. The whiteboard follows the same idea — follow-along, and saving every user’s changes as they happen.',
    placard: {
      hard: 'The multi-user whiteboard — follow-along, and saving every user’s changes as they happen.',
      threwAway: 'An earlier version of this built for a different company that got scrapped. I reused the concept here.',
      differently: 'More brainstorming features, and prompts for prioritising and organising ideas.',
      builtFor: 'Me and a friend, so we could collaborate on game development.',
    },
  },
  {
    slug: 'wretched-few',
    whatItIs: 'A multiplayer roguelite in Unity where you play the monsters. I own the story, the HUD, the player UX and the art.',
    problem: 'My friend had an initial idea for a game. I helped expand it into a full story concept, and that’s when we decided to build it together.',
    whyBuiltThisWay: 'Iterative development — build the simple version, test it, throw it away, build it better.',
    placard: {
      hard: 'Everything. 3D modelling, the HUD, player UX, sfx, vfx, procedural map generation, and a story that stays coherent with combat and gameplay. It’s a lot, and I absolutely love it.',
      threwAway: 'A lot, deliberately — early simple builds made to be seen, tested and then replaced with something better.',
      differently: 'Still in progress, so I’m still learning. I’d spend more time on animation and 3D modelling and less on the in-game menu UI.',
      builtFor: 'My friend brought the idea, I grew it into the story. It’s for gamers like us.',
    },
  },
]
