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
    slug: 'onboarding',
    name: 'Onboarding',
    descriptor: 'Client Onboarding · Multi-Tenant Service',
    status: 'releasing',
    headline: 'Client onboarding built once, as a shared service.',
    problem:
      'Client onboarding was heading toward separate implementations in the website and in Paragon.',
    built:
      'A multi-tenant onboarding service published as a headless package, so every consumer shares one implementation.',
    stack: ['.NET', 'Clean Architecture', 'Multi-tenancy'],
    isPersonal: false,
  },
  {
    slug: 'kingdoms-and-crowns',
    name: 'Kingdoms & Crowns',
    descriptor: 'Homeschool Platform · With a 3D World Inside',
    status: 'beta',
    headline: 'A homeschool hub with a 3D world inside it.',
    problem:
      'Homeschool planning is fragmented across curriculum sites and paper, and none of it is built for the person actually doing the work: the kid.',
    built:
      "A hub tracking a full week per child. Parents set each student's subjects, link their curriculum sites and build custom assignments; kids work through them on a timer that persists across tabs and devices, and earn rewards for staying on task. Finishing quests earns minutes in the Realm, a low-poly 3D world inside the app, where each deed raises a building in the hero’s village and there is a lost crown to win back.",
    outcome: 'In beta, invite-only.',
    liveUrl: 'https://www.kingdomsandcrowns.com',
    media: {
      hero: { src: '/media/kingdoms-and-crowns/hero.jpg', alt: "A child's quest log listing today's lessons with start timers and XP rewards" },
      gallery: [
        {
          src: '/media/kingdoms-and-crowns/marketing.jpg',
          alt: 'The Kingdoms & Crowns marketing site: “Be the Hero of Homeschool” over a mountain sunrise, with the three-step explainer beneath',
        },
        {
          src: '/media/kingdoms-and-crowns/realm-village.jpg',
          alt: 'The Realm, the low-poly 3D game inside Kingdoms & Crowns: the demo hero Emma stands on a path through a village of building plots and villagers, with her side quest, spell bar and map round the edges',
        },
        {
          src: '/media/kingdoms-and-crowns/realm-fields.jpg',
          alt: 'In the Realm, Emma walks up the village path under a wooden gateway, a quest marker by the well beside her and villagers at their plots on either side',
        },
        {
          src: '/media/kingdoms-and-crowns/realm-ride.jpg',
          alt: 'In the Realm, the demo hero Noah rides a horse by the village gateway, with villagers at their plots, a river beyond, and a prompt to talk to Miller Tessa',
        },
        { src: '/media/kingdoms-and-crowns/castle.jpg', alt: 'The castle screen, a student’s home base' },
        { src: '/media/kingdoms-and-crowns/tavern.jpg', alt: 'The tavern screen' },
        { src: '/media/kingdoms-and-crowns/trophies.jpg', alt: 'Earned trophies and achievements' },
        { src: '/media/kingdoms-and-crowns/ranks.jpg', alt: 'The ranks screen showing progression tiers' },
        { src: '/media/kingdoms-and-crowns/quest-giver.jpg', alt: 'The parent quest-giver, where assignments are created' },
        { src: '/media/kingdoms-and-crowns/hall-of-legends.jpg', alt: 'The hall of legends, a parent view of each child’s progress' },
      ],
    },
    stack: ['Next.js', 'three.js', 'react-three-fiber', 'Drizzle', 'Turso', 'Vercel'],
    isPersonal: true,
  },
  {
    slug: 'eliminated',
    name: 'Eliminated',
    descriptor: 'Party Game · 2–8 Players · Unity',
    status: 'building',
    statusLabel: 'Coming soon to Steam',
    headline: 'A wholesome party game where everyone dies.',
    problem: 'I wanted to find out whether I could build a game end to end on my own.',
    built:
      'Childhood playground games with elimination-show stakes, run by a sinister Game Master. Nine games for two to eight players: solo against bots, on the couch, or online. Lose, and you are neatly boxed up with a little pink bow.',
    media: {
      hero: {
        src: '/media/eliminated/hero.jpg',
        alt: 'The Eliminated Steam capsule: the pink Eliminated logo over a sunny sandy court, where a clown, a capybara with an orange on its head, a fox, a donut and a gift box stand before a giant doll-like Game Master whose eyes cast a pink beam',
      },
      gallery: [
        {
          src: '/media/eliminated/red-light.jpg',
          alt: 'A round of Red Light: the pink-clad Game Master stands small under a bare tree at the far end of a sandy court, while a fox under two stacked gift boxes and a player in a wide-brimmed hat stand at the near end, another gift box beside them',
        },
        {
          src: '/media/eliminated/glass-bridge.jpg',
          alt: 'Glass Bridge: eight characters, among them a witch, a cowboy and a fox, seen from behind on a platform at the start of two parallel lanes of glass panels over a dark void',
        },
        {
          src: '/media/eliminated/keepy-uppy.jpg',
          alt: 'Keepy Uppy: players on a pink striped floor each have a balloon tied to them, seen from above',
        },
        {
          src: '/media/eliminated/mingle.jpg',
          alt: 'Mingle: players spread around a pink and white carousel-tent ring in the middle of a large circular floor, seen from above',
        },
        {
          src: '/media/eliminated/musical-chairs.jpg',
          alt: 'Musical Chairs: players spread over a pink striped arena seen from above, round a ring of green fencing with small wooden chairs inside it',
        },
        {
          src: '/media/eliminated/prop-hunt.jpg',
          alt: 'Prop Hunt: a purple-lit playground at night with swing sets, hedges, trees and teddy bears scattered about, and a small yellow duck and a grey cat among the props',
        },
        {
          src: '/media/eliminated/simon-says.jpg',
          alt: 'Simon Says: the Game Master stands behind a row of five command tiles while a witch, a clown and a fox stand on a pink striped floor',
        },
        {
          src: '/media/eliminated/tag.jpg',
          alt: 'Tag: a snowy arena of low-poly ice peaks and ice blocks, with a cluster of players including a witch, a fox and a cow, and a pale blue player off to one side',
        },
        {
          src: '/media/eliminated/tug-of-war.jpg',
          alt: 'Tug of War: two teams on pink and blue platforms hold either end of a rope that stretches across a dark arena, seen from behind the pink team',
        },
      ],
    },
    stack: ['Unity 6', 'C#'],
    isPersonal: true,
  },
  {
    slug: 'eliminated-site',
    name: 'Eliminated — the website',
    descriptor: 'Marketing Site · Press Kit',
    status: 'production',
    headline: 'The front door for the game.',
    built:
      'A single page covering the games, the powerups, the players and the screenshots, with a downloadable press kit. A static Astro site on Cloudflare with a strict content security policy and no cookies or trackers.',
    liveUrl: 'https://eliminatedgame.com/',
    autoCapture: true,
    media: {
      hero: {
        src: '/media/eliminated-site/hero.jpg',
        alt: 'The Eliminated website: the pink logo and the line “A wholesome party game where everyone dies.” over a close-up of the game’s characters and the doll-like Game Master, with a “Coming soon to Steam” button and tags for 2–8 players, solo with bots, couch co-op, online and controller plus keyboard',
      },
    },
    stack: ['Astro', 'TypeScript', 'Cloudflare'],
    isPersonal: true,
  },
  {
    slug: 'jimothy-and-pidge',
    name: 'Jimothy & Pidge: Shenanigans in Seattle',
    descriptor: '3D Collect-a-thon Platformer · Unity',
    status: 'building',
    statusLabel: 'In development',
    headline: 'A round raccoon and his pigeon pal take Seattle back from the Terrible Trapper.',
    built:
      'A single-player 3D collect-a-thon in the spirit of the late-90s classics. Jimothy and Pidge free the caged Elder Raccoons, recover stolen treats and face Seattle-flavoured bosses. Every model, animation, shader and song in it is generated by code.',
    media: {
      hero: {
        src: '/media/jimothy-and-pidge/hero.jpg',
        alt: 'Key art for Jimothy & Pidge: Shenanigans in Seattle: a fluffy round raccoon with a pigeon perched on its head stands before a brick Seattle storefront, beside the hand-lettered title',
      },
      gallery: [
        {
          src: '/media/jimothy-and-pidge/main.jpg',
          alt: 'The wider key art: the fluffy raccoon with its pigeon pal beside a green dumpster, a small raccoon on the shop sign above and a pigeon on the title banner',
        },
      ],
    },
    stack: ['Unity 6', 'URP', 'C#'],
    isPersonal: true,
  },
  {
    slug: 'tiny-frenzy-games',
    name: 'Tiny Frenzy Games',
    descriptor: 'Studio Site · One Dev',
    status: 'production',
    headline: 'One dev. All the frenzy.',
    built:
      'The home of my one-person game studio: both games, a mailing list for playtest invites, a contact form and a private admin with its own newsletter editor.',
    liveUrl: 'https://tinyfrenzygames.com/',
    autoCapture: true,
    media: {
      hero: {
        src: '/media/tiny-frenzy-games/hero.jpg',
        alt: 'The Tiny Frenzy Games home page on a pale yellow background: a swirling galaxy-coloured tornado logo with a small black creature swinging from it, the line “One dev. All the frenzy.” and a My Games button',
      },
    },
    stack: ['Next.js', 'Drizzle', 'Neon Postgres', 'Cloudflare Workers'],
    isPersonal: true,
  },
  {
    slug: 'ember-tattoo',
    name: 'Ember Tattoo & Piercing',
    descriptor: 'Studio Site · Booking, Artists, Gallery',
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
    slug: 'the-budget',
    name: 'The Budget',
    descriptor: 'Budgeting by Pay Period, Not by Month',
    status: 'production',
    headline: 'Every budgeting app assumes you get paid on the first. We do not.',
    problem:
      'Budgeting tools are built around the calendar month, which is not when money actually arrives.',
    built:
      'A budgeting app organised by pay period instead, covering accounts, expenses, debts and school funds.',
    outcome: 'The public demo runs on made-up data and resets every Monday.',
    liveUrl: 'https://the-budget-demo.kyleelinmccarthy.workers.dev/login',
    liveLabel: 'Try the demo',
    autoCapture: true,
    captureClick: 'Explore as Person 1',
    media: {
      hero: {
        src: '/media/the-budget/hero.jpg',
        alt: 'The Budget’s demo dashboard, under a banner saying the demo’s figures are made up: a four-week projection of income, expenses and surplus, quick actions, and counts of cash flow, accounts, expenses and debts beneath',
      },
    },
    stack: ['Next.js', 'TypeScript'],
    isPersonal: true,
  },
]
