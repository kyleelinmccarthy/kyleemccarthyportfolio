import type { Project } from './types'

export const workIntro = {
  label: 'Work',
  heading: "What I've Built",
  subheading:
    'Fourteen enterprise platforms since 2023, eleven of them built by me, while leading the twenty-person department that ships the rest.',
} as const

export const projects: Project[] = [
  {
    slug: '403hq',
    name: '403HQ',
    descriptor: 'Client Portal · Two Deployments · ~10,000 Employees Each',
    category: 'Client Portals',
    status: 'production',
    headline: 'A client put their contract out to bid. I shipped the portal in six weeks and kept them.',
    problem:
      'A high-value client posted their contract for bid. No online portal existed that met their needs, and the timeline was weeks, not months.',
    built:
      'A client portal built from scratch: five user role personas, multi-factor authentication, user-managed content and a security architecture built for an employer expecting enterprise quality. A second deployment followed for another client with its own branding, plan rules and customizations.',
    outcome:
      'Shipped in six weeks and the client stayed. Two deployments now serve roughly 10,000 employees each, and the codebase became reusable infrastructure rather than a one-off rescue.',
    liveUrl: 'https://403hq.nbsbenefits.com',
    autoCapture: true,
    media: {
      hero: { src: '/media/403hq/hero.jpg', alt: 'The 403HQ client portal sign-in screen' },
    },
    stack: ['.NET', 'C#', 'Azure', 'Entra External ID', 'Step-up MFA'],
    isPersonal: false,
  },
  {
    slug: 'aura',
    name: 'AURA',
    descriptor: 'Accessibility Compliance · One Script Tag',
    category: 'Internal Tools',
    status: 'production',
    headline: 'Built the accessibility layer once, then deployed it everywhere for nothing.',
    problem:
      'The company licensed accessiBe at $800 a year per site. Two sites at the time, with more coming — a model that got more expensive with every new web property.',
    built:
      'A proprietary accessibility platform that drops into any site as a single script tag. Built once, deployed everywhere.',
    outcome:
      'Replaced the vendor licence outright. Now running on 15+ sites at no additional cost, and the economics improve with every property added.',
    embedNote:
      'AURA is embedded rather than standalone. See it running on 403HQ or the NBS website.',
    media: {
      hero: {
        src: '/media/aura/hero.jpg',
        alt: 'The AURA accessibility panel open on the National Benefit Services site, with the ADHD Friendly Profile switched on',
      },
    },
    stack: ['TypeScript', 'WCAG 2.1 AA'],
    isPersonal: false,
  },
  {
    slug: 'beacon',
    name: 'Beacon',
    descriptor: 'Engineering Operations Platform · Replaced Azure DevOps',
    category: 'Internal Tools',
    status: 'production',
    headline: 'One platform replaced the stack the department ran on — and it reviews our pull requests.',
    problem:
      'Work lived in Azure DevOps, GitHub Enterprise and ServiceDesk Plus at once. Context-switching was constant, and leadership had no single source of truth.',
    built:
      'One project model spanning all three systems. Beacon shapes work before it starts, reviews every pull request against our engineering standards with AI, and feeds the results into performance scorecards. It also carries the technology asset inventory with dependency mapping and compliance scoring, generates SOC audit evidence packs per project, and scans every site for ADA compliance.',
    outcome:
      'Retired the project tracker subscription and gave the department one source of truth. A model writing the first draft never means less scrutiny than a person writing it.',
    media: {
      hero: {
        src: '/media/beacon/hero.jpg',
        alt: 'Beacon’s Lighthouse dashboard: active backlogs, GitHub and ServiceDesk project counts, and quick navigation',
      },
    },
    stack: ['.NET', 'Next.js', 'Azure', 'GitHub Actions', 'Claude'],
    isPersonal: false,
  },
  {
    slug: 'ruckus',
    name: 'Ruckus',
    descriptor: 'Remote Engagement Platform · Ten Multiplayer Games',
    category: 'Internal Tools',
    status: 'production',
    headline: 'Replaced the engagement tool nobody liked with ten games people actually play.',
    problem:
      'A fully remote company was paying for AhaSlides — low adoption, shared logins, and nothing employees found compelling.',
    built:
      'Ten browser-based multiplayer games with live polls and quizzes over SignalR, behind Microsoft SSO so access follows the identity infrastructure already in place. Built in weeks.',
    outcome: 'Retired the vendor, raised adoption, and removed shared-login access management entirely.',
    media: {
      hero: {
        src: '/media/ruckus/hero.jpg',
        alt: 'The Ruckus home screen: quick actions to start a game, poll, presentation or quiz, with the live lobby beneath',
      },
      gallery: [
        { src: '/media/ruckus/games.jpg', alt: 'The Ruckus games library' },
        { src: '/media/ruckus/presentation.jpg', alt: 'A live Ruckus presentation session' },
      ],
    },
    stack: ['.NET', 'SignalR', 'Entra ID'],
    isPersonal: false,
  },
  {
    slug: 'nbs-website',
    name: 'NBS Website',
    descriptor: 'Company Site · 66 Pages Rebuilt',
    category: 'Marketing & Web',
    status: 'releasing',
    headline: 'A dated WordPress site rebuilt around the people who actually use it.',
    problem:
      "The public site was dated WordPress that didn't reflect the product or the brand, and marketing couldn't change a word without a developer.",
    built:
      'A full replacement in Next.js and .NET across 66 pages, restructured around participants, sponsors and advisors, with the CMS marketing had been asking for for years.',
    outcome:
      'Content ownership went back to the people closest to the message. AURA runs here too — this is one of the places to see it live.',
    liveUrl: 'https://nbswebsite-release-bwftcbgub8c3hzfm.westus2-01.azurewebsites.net/',
    autoCapture: true,
    media: {
      hero: { src: '/media/nbs-website/hero.jpg', alt: 'The rebuilt National Benefit Services home page' },
    },
    stack: ['Next.js', '.NET', 'Azure'],
    isPersonal: false,
  },
  {
    slug: 'paragon',
    name: 'Paragon',
    descriptor: 'Recordkeeping Platform · Replacing FIS Relius',
    category: 'Internal Tools',
    status: 'building',
    headline: 'Replacing the recordkeeping platform the business runs on.',
    problem:
      'FIS Relius is a licensed vendor platform sitting underneath 403(b), 457 and FICA Alternative administration.',
    built:
      'An in-house replacement spanning 616 endpoints and 194 entities, sharing the headless forms, upload and onboarding packages rather than duplicating them.',
    media: {
      hero: { src: '/media/paragon/hero.jpg', alt: 'The Paragon recordkeeping platform' },
      gallery: [
        { src: '/media/paragon/login.jpg', alt: 'The Paragon sign-in screen' },
        { src: '/media/paragon/dashboard.jpg', alt: 'A Paragon dashboard after signing in' },
      ],
    },
    stack: ['.NET', 'EF Core', 'Azure SQL', 'Clean Architecture'],
    isPersonal: false,
  },
  {
    slug: 'forms-suite',
    name: 'Online Forms, Secure Upload & Onboarding',
    descriptor: 'Multi-Tenant Services · Headless Packages',
    category: 'Internal Tools',
    status: 'releasing',
    headline: 'Three services, one implementation instead of three.',
    problem:
      'Forms, secure file upload and client onboarding were heading toward separate implementations in the website and in Paragon.',
    built:
      'Three multi-tenant services published as headless packages, so every consumer shares one implementation rather than reinventing it.',
    outcome: 'One codebase per capability instead of one per consumer.',
    stack: ['.NET', 'Clean Architecture', 'Multi-tenancy'],
    isPersonal: false,
  },
  {
    slug: 'external-payroll',
    name: 'External Payroll Processing',
    descriptor: 'Payroll Ingestion · No Per-Employer Setup',
    category: 'Internal Tools',
    status: 'building',
    headline: 'Ingests any employer’s payroll file without being configured for it first.',
    problem:
      'Every employer sends payroll differently, and per-employer setup does not scale.',
    built:
      'A pipeline that ingests employer payroll files with no per-employer configuration, validates them against plan rules, resolves exceptions and exports to recordkeepers.',
    stack: ['.NET', 'Azure', 'SQL Server'],
    isPersonal: false,
  },
  {
    slug: 'kingdoms-and-crowns',
    name: 'Kingdoms & Crowns',
    descriptor: 'Homeschool Platform · In Beta',
    category: 'Personal',
    status: 'beta',
    headline: 'A homeschool hub that tracks a full week per child, and makes them want to finish it.',
    problem:
      'Homeschool planning is fragmented across curriculum sites and paper, and none of it is built for the person actually doing the work: the kid.',
    built:
      "A hub tracking a full week per child. Parents set each student's subjects, link their curriculum sites and build custom assignments; kids work through them on a timer that persists across tabs and devices, and earn rewards for staying on task.",
    outcome: 'In beta with a small group of families.',
    liveUrl: 'https://www.kingdomsandcrowns.com',
    media: {
      hero: { src: '/media/kingdoms-and-crowns/hero.jpg', alt: "A child's quest log listing today's lessons with start timers and XP rewards" },
      gallery: [
        {
          src: '/media/kingdoms-and-crowns/marketing.jpg',
          alt: 'The Kingdoms & Crowns marketing site: “Be the Hero of Homeschool” over a mountain sunrise, with the three-step explainer beneath',
        },
        { src: '/media/kingdoms-and-crowns/castle.jpg', alt: 'The castle screen, a student’s home base' },
        { src: '/media/kingdoms-and-crowns/tavern.jpg', alt: 'The tavern screen' },
        { src: '/media/kingdoms-and-crowns/trophies.jpg', alt: 'Earned trophies and achievements' },
        { src: '/media/kingdoms-and-crowns/ranks.jpg', alt: 'The ranks screen showing progression tiers' },
        { src: '/media/kingdoms-and-crowns/quest-giver.jpg', alt: 'The parent quest-giver, where assignments are created' },
        { src: '/media/kingdoms-and-crowns/hall-of-legends.jpg', alt: 'The hall of legends, a parent view of each child’s progress' },
      ],
    },
    stack: ['Next.js', 'TypeScript', 'Drizzle', 'Vercel'],
    isPersonal: true,
  },
  {
    slug: 'wretched-few',
    name: 'The Wretched Few',
    descriptor: 'Multiplayer Roguelite · Unity · Headed for Steam',
    category: 'Games',
    status: 'building',
    headline: 'You play the monsters, hunted by humans who were told you are evil.',
    problem: 'Built with one friend, for the pleasure of building it.',
    built:
      'A multiplayer roguelite in Unity. I own the story, the HUD and player UI/UX, and the art.',
    outcome: 'In development, headed for Steam.',
    media: {
      hero: {
        src: '/media/wretched-few/hero.jpg',
        alt: 'The Wretched Few title screen: a gothic mansion under a red crescent moon, with the tagline "Survive the hunt. Become the reckoning." and a Single Player, Multiplayer, Settings, Quit menu',
      },
    },
    stack: ['Unity', 'C#'],
    isPersonal: true,
  },
  {
    slug: 'eliminated',
    name: 'Eliminated',
    descriptor: '3D Multiplayer Party Game · Unity',
    category: 'Games',
    status: 'building',
    headline: 'My first solo game project: a lobby whittled down until one player is left.',
    problem: 'I wanted to find out whether I could build a game end to end on my own.',
    built:
      'A 3D multiplayer party game in Unity and C#, where a lobby is cut down through a gauntlet of playground minigames until one player remains.',
    media: {
      hero: {
        src: '/media/eliminated/hero.jpg',
        alt: 'The Eliminated main menu: the pink logo over a green sweep, the player’s donut character, a Marbles balance, and Play, Spectate, Settings and Quit',
      },
      gallery: [
        {
          src: '/media/eliminated/mingle.jpg',
          alt: 'A round of Mingle in play, seen from above: five players racing for rooms around a ring as the group size is called',
        },
        {
          src: '/media/eliminated/player.jpg',
          alt: 'The Choose Your Player screen — a grid of unlockable characters with pun names, bought with Marbles',
        },
        {
          src: '/media/eliminated/how-to-play.jpg',
          alt: 'The How to Play screen',
        },
        {
          src: '/media/eliminated/account.jpg',
          alt: 'A player’s account: display name, Marbles, crowns, rounds survived and their current title',
        },
      ],
    },
    stack: ['Unity', 'C#'],
    isPersonal: true,
  },
  {
    slug: 'eliminated-web',
    name: 'Eliminated (web)',
    descriptor: 'Browser Prototype · Authoritative Server',
    category: 'Games',
    status: 'production',
    headline: 'The prototype that proved the concept before the 3D build.',
    problem: 'The 3D version was a large bet, and the core loop was unproven.',
    built:
      "Twelve minigames with bot AI on an authoritative WebSocket server, so the server owns state and clients can't cheat.",
    outcome: 'Proved the loop, and is still playable.',
    liveUrl: 'https://www.eliminatedgame.com',
    autoCapture: true,
    media: { hero: { src: '/media/eliminated-web/hero.jpg', alt: 'The Eliminated browser game landing screen' } },
    stack: ['TypeScript', 'WebSockets'],
    isPersonal: true,
  },
  {
    slug: 'chemtree-games',
    name: 'ChemTree Games',
    descriptor: 'Indie Studio Site',
    category: 'Games',
    status: 'production',
    headline: 'The studio site for the games. Branch out.',
    problem: 'The games needed somewhere to live that was not a storefront listing.',
    built:
      'A single-scroll studio site with game detail pages, a mailing list and a private admin, that still renders from a code-defined fallback when the database is unreachable.',
    liveUrl: 'https://chemtreegames.com',
    autoCapture: true,
    media: { hero: { src: '/media/chemtree-games/hero.jpg', alt: 'The ChemTree Games studio home page' } },
    stack: ['Next.js', 'Drizzle', 'Postgres', 'Railway'],
    isPersonal: true,
  },
  {
    slug: 'chemtree-hq',
    name: 'ChemTreeHQ',
    descriptor: 'Shared Workspace · Real-Time CRDTs',
    category: 'Personal',
    status: 'building',
    headline: 'A shared workspace where two people editing the same document both keep their work.',
    problem:
      'Running projects with a remote collaborator meant a dozen tools that did not talk to each other, and documents that overwrote each other when both of us typed.',
    built:
      'A shared workspace for remote projects. Documents edit live through Yjs CRDTs, so simultaneous edits merge instead of overwriting.',
    media: {
      hero: {
        src: '/media/chemtree-hq/hero.jpg',
        alt: 'The ChemTreeHQ dashboard: a project board of in-progress game ideas as colour-coded cards, quick stats, a team panel and a shared calendar',
      },
    },
    stack: ['Next.js', 'Hono', 'Postgres', 'Redis', 'Yjs'],
    isPersonal: true,
  },
  {
    slug: 'ember-tattoo',
    name: 'Ember Tattoo & Piercing',
    descriptor: 'Studio Site · Booking, Artists, Gallery',
    category: 'Personal',
    status: 'production',
    headline: "A friend's studio had a site that didn't match the work. Nobody hired me; I saw the gap.",
    problem:
      "A friend owns a tattoo studio whose website didn't reflect the quality of the work coming out of it.",
    built:
      'A studio site with booking, artist profiles, a gallery and aftercare, all editable through a CMS.',
    outcome: 'The builder instinct does not clock out.',
    liveUrl: 'https://ember-tattoo-web.vercel.app',
    autoCapture: true,
    media: { hero: { src: '/media/ember-tattoo/hero.jpg', alt: 'The Ember Tattoo & Piercing studio home page' } },
    stack: ['Next.js', 'CMS', 'Vercel'],
    isPersonal: true,
  },
  {
    slug: 'family-budgeting',
    name: 'Family Budgeting',
    descriptor: 'Budgeting by Pay Period, Not by Month',
    category: 'Personal',
    status: 'production',
    headline: 'Every budgeting app assumes you get paid on the first. We do not.',
    problem:
      'Budgeting tools are built around the calendar month, which is not when money actually arrives.',
    built:
      'A budgeting app organised by pay period instead, covering accounts, expenses, debts and school funds.',
    stack: ['Next.js', 'TypeScript', 'SQLite'],
    isPersonal: true,
  },
  {
    slug: 'doing-the-thing',
    name: 'Doing The Thing',
    descriptor: 'Chore App · Built for My Kids',
    category: 'Personal',
    status: 'production',
    headline: 'A chore app so my kids own their list instead of being nagged about it.',
    problem:
      'Keeping kids on top of chores meant nagging, and most to-do apps bury the one question that matters under features nobody needs.',
    built:
      'A zero-friction list that asks whether you did the thing. Snooze an item enough times and it stops asking yes-or-no and starts asking what is getting in the way, surfacing the real blocker behind a stalled task.',
    outcome: 'Runs locally for my family, and they actually use it.',
    stack: ['Next.js', 'TypeScript'],
    isPersonal: true,
  },
]
