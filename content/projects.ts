import type { Project } from './types'

export const workIntro = {
  label: 'Work',
  heading: "What I've Built",
  subheading:
    'Six production applications shipped in four months, alongside leading a 20+ person department. Five more built on personal time. Every one of them started with a real problem.',
} as const

export const projects: Project[] = [
  {
    slug: '403hq',
    name: '403HQ',
    descriptor: 'Client Portal · Built in 6 Weeks',
    category: 'Client Portals',
    headline:
      'A client posted their contract for bid. I built the portal in six weeks and kept them.',
    problem:
      'A high-value client posted their contract for bid. The gap: no online portal existed that met their needs. The timeline: weeks, not months.',
    built:
      'A full-featured client portal from scratch, five distinct user role personas, multi-factor authentication, user-managed content, modern UX, and comprehensive security architecture. Every detail designed for a client that expected enterprise-grade quality.',
    outcome:
      'Delivered in 6 weeks. The client stayed. The codebase became reusable infrastructure now being extended to additional clients, turning a crisis into a product.',
    liveUrl: 'https://403hq.nbsbenefits.com',
    screenshot: '403hq.jpg',
    isPersonal: false,
  },
  {
    slug: 'client-portal-v2',
    name: 'Client Portal (v2)',
    descriptor: 'Client Portal · Proactive Build',
    category: 'Client Portals',
    headline:
      'Nobody asked for a replacement. I built one anyway, on the 403HQ codebase.',
    problem:
      'An existing client was running on an outdated portal experience. No one asked for a replacement, but the capability existed and the opportunity was obvious.',
    built:
      "A second client portal built on the 403HQ codebase, adapted for a different client's needs and proactively offered to modernize their experience.",
    outcome:
      'Currently in client-side testing ahead of launch. A demonstration that the instinct is proactive, not reactive, and that good infrastructure compounds.',
    isPersonal: false,
  },
  {
    slug: 'nbs-marketing',
    name: 'NBS Marketing Website',
    descriptor: 'External Marketing Site · Full Rebuild',
    category: 'Marketing & Web',
    headline:
      'A full rebuild that handed content control back to the marketing team.',
    problem:
      "The company's public-facing website didn't reflect the quality of the product or the ambition of the brand. Non-technical staff couldn't update it without developer involvement.",
    built:
      'A complete replacement, enhanced UX, business-user content management so marketing teams own their own content, and a modernized brand presence.',
    outcome:
      'A site that represents the brand accurately, with content ownership returned to the people closest to the message. Aura is live here, this is one of the places to see it.',
    liveUrl:
      'https://nbswebsite-release-bwftcbgub8c3hzfm.westus2-01.azurewebsites.net/',
    screenshot: 'nbs-marketing.jpg',
    isPersonal: false,
  },
  {
    slug: 'ruckus',
    name: 'Ruckus',
    descriptor: 'Remote Engagement Platform · Internal Tool',
    category: 'Internal Tools',
    headline:
      'Replaced a paid engagement tool with one employees actually wanted to use.',
    problem:
      'The company was paying for AhaSlides (~$100/year), a tool with low adoption, poor access management (shared logins), and features employees didn’t find compelling. For a fully remote company, engagement tools matter.',
    built:
      'A custom remote engagement platform with Microsoft SSO integration, richer social features, and an experience employees actually wanted to use.',
    outcome:
      'Eliminated the vendor cost. Measurably higher adoption. Access managed automatically through existing identity infrastructure.',
    isPersonal: false,
  },
  {
    slug: 'aura',
    name: 'Aura Accessibility Widget',
    descriptor: 'Proprietary Accessibility Tool · Infrastructure',
    category: 'Internal Tools',
    headline:
      'Built our accessibility widget once; deployed it across 10+ sites for free.',
    problem:
      'The company was paying $800/year per site for accessiBe, a per-site licensing model that got more expensive with every new web property. Two sites at the time, more coming.',
    built: 'A proprietary, reusable accessibility widget, built once, deployed everywhere.',
    outcome:
      'Eliminated $1,600+/year in licensing across 2 sites at the time of replacement. Now live on 10+ sites at zero marginal cost per deployment. The economics improve with every new property added. (NBS-owned, not embedded here; see it live on the NBS Marketing Website or 403HQ.)',
    isPersonal: false,
  },
  {
    slug: 'tech-hub',
    name: 'Tech Hub',
    descriptor: 'Internal IS Command Platform · Enterprise Tool',
    category: 'Internal Tools',
    headline:
      'One platform that replaced the dozen tools the IS department ran on.',
    problem:
      'The IS department ran on fragmented tools, separate systems for project tracking, asset management, code review, sprint coordination, PTO, and roadmapping. Context-switching was constant. Visibility was fragmented. Leadership had no single source of truth.',
    built:
      'A unified internal platform purpose-built for how the team actually works, multi-source project and ticket aggregation, asset management, sprint demo coordination, automated pull request workflows, department-wide PTO calendar, technology roadmap, automated code standards review, executive dashboards, and an embedded UX/UI design framework.',
    outcome:
      'Replaced multiple paid tool subscriptions. Single source of truth for the entire IS department. The design system I built lives here, making it the foundation of every product the team ships.',
    isPersonal: false,
  },
  {
    slug: 'ember-tattoo',
    name: 'Ember Tattoo Studio',
    descriptor: 'Web Design · Speculative Redesign',
    category: 'Personal',
    headline:
      "A speculative redesign for a friend's studio. Nobody hired me; I saw the gap.",
    problem:
      "A friend owns a tattoo studio with a website that doesn't reflect the quality of the work. Nobody hired me. I just saw the gap.",
    built:
      'A complete speculative redesign, modern aesthetic, improved UX, and a visual language that matches the craft.',
    outcome: 'A pitch. And a reminder that the builder instinct doesn’t clock out.',
    liveUrl: 'https://ember-tattoo-web.vercel.app',
    screenshot: 'ember-tattoo.jpg',
    isPersonal: true,
  },
  {
    slug: 'budgeting-app',
    name: 'Budgeting App',
    descriptor: 'Personal Finance Tool',
    category: 'Personal',
    headline:
      'A budgeting app that works the way I actually think about money.',
    problem: "Existing budgeting tools didn't work the way I think about money.",
    built:
      'A personal budgeting application built for personal use. Same instinct that drives every product decision at work: if something could work better, build it.',
    isPersonal: true,
  },
  {
    slug: 'homeschool-platform',
    name: 'Homeschool Platform',
    descriptor: 'Education Platform',
    category: 'Personal',
    headline:
      'Curriculum planning with gamified progress, designed for kids.',
    problem: 'Homeschool curriculum planning is fragmented and hard to make engaging for kids.',
    built:
      'A custom platform for curriculum planning with gamified progress tracking, designed to drive engagement and make learning tangible.',
    outcome:
      'Full product thinking applied to a personal problem. UX designed for the actual users: kids who need motivation, not spreadsheets.',
    isPersonal: true,
  },
  {
    slug: 'sentral',
    name: 'Sentral',
    descriptor: 'All-in-One Personal Hub · Modular Workspace',
    category: 'Personal',
    headline:
      'One modular hub for everything: projects, planning, expenses, and a full Excalidraw replacement built from scratch.',
    problem:
      'The tools for running a life and its projects are scattered across a dozen apps, projects and to-dos in one, events in another, a separate whiteboard, yet another for expenses. Nothing talks to each other, and none of it works the way I think.',
    built:
      'A modularized, all-in-one hub for tracking projects, to-dos, and events, with project planning, expense tracking, asset management, and idea buckets. At its center, a full Excalidraw replacement built from scratch: a multi-user whiteboard for sharing, presenting, and real-time collaboration, complete with a laser pointer for live presenting.',
    outcome:
      'A single workspace that consolidates what used to take a dozen subscriptions, with real-time multi-user collaboration as a first-class feature, not an afterthought.',
    isPersonal: true,
  },
  {
    slug: 'get-doing-the-thing',
    name: 'Get Doing the Thing',
    descriptor: 'Zero-Friction To-Do App · Built for My Kids',
    category: 'Personal',
    headline:
      'A to-do app that nudges my kids to do the thing, then asks what is getting in the way.',
    problem:
      "Helping my kids stay on top of chores and to-dos meant nagging, and most to-do apps drown the one thing that matters in features nobody needs. I wanted something zero-friction that just asks: did you do the thing?",
    built:
      'A simple, clean, modern to-do app that gently nudges the user to check off a task. Snooze an item only so many times before it stops asking yes-or-no and starts asking what is preventing you, surfacing the real blocker behind a stalled to-do. Lightweight prioritization and tracking, and nothing else.',
    outcome:
      'A tool my kids actually use to track their own chores, and a small proof that the right product removes friction instead of adding features.',
    isPersonal: true,
  },
]
