# The Museum Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the site from a résumé with animation on it into a building the reader walks through — five rooms, each with its own setting and one thing you can touch.

**Architecture:** `CinematicJourney` already lays scenes on a 2D grid and moves a camera between them by direction. Those directions become a literal floor plan rather than decoration. Each room is a scene with a `setting` (its environment) and a `node` (its content). All copy lives in `content/`, never in components. Every touchable object is a real link, button or `<details>` — never a div with a click handler.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind 3.4, framer-motion 11, Vitest 2.1, Playwright 1.49 + axe-core.

**Spec:** `docs/superpowers/specs/2026-08-16-museum-overhaul-design.md` — read the Source material section before writing any copy.

## Global Constraints

- **Colors only via semantic Tailwind tokens** — `bg-surface`, `bg-surface-raised`, `text-fg`, `text-fg-muted`, `text-accent`, `bg-accent`, `ring-rule`, `border-rule`, `text-fill-fg`, `text-decor`. **Never a raw hex, never a stock Tailwind colour.** Sole existing exception: `backdrop:bg-black/70` on the lightbox scrim.
- **Every room must be fully readable with `prefers-reduced-motion: reduce` and with JS off.** Content is never gated behind an animation. A door that hasn't opened must not hide the welcome text.
- **Every touchable object is a real element** — `<a>`, `<button>`, or `<details>`/`<summary>`. Keyboard reachable, visible focus ring (`focus-visible:ring-2 focus-visible:ring-accent`), announced correctly. The existing `components/room/Door.tsx` is the reference pattern.
- **All copy comes from `content/`.** No user-facing string literals in components.
- **Every word traceable** to the spec's Source material section or a repo. Nothing invented — a fabricated detail already shipped once this project and was caught in review.
- **No statistics anywhere in the five rooms.** They move to `/about` and `/leadership`.
- Run `npm run typecheck && npm run lint && npm run test` before every commit.
- **Commit messages must NOT contain `Co-Authored-By` or any AI-attribution trailer** — a repo hook rejects them.
- 5 e2e tests fail and are **pre-existing** (contact happy-path ×2, theme-toggle ×2, mobile résumé link). Not in scope. Exactly those 5 failing is success.
- `tsconfig.tsbuildinfo` is gitignored; leave it alone.

---

### Task 1: All the copy, as data

Everything the rooms say, written in one sitting so the voice is consistent, and reviewable as prose before any UI exists.

**Files:**
- Create: `content/rooms.ts`
- Create: `content/caseStudies.ts`
- Create: `tests/unit/rooms.test.ts`

**Interfaces:**
- Consumes: `Project` from `content/types.ts`
- Produces: `rooms`, `caseStudies: CaseStudy[]`, `FEATURED: readonly string[]`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/rooms.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { caseStudies, FEATURED } from '@/content/caseStudies'
import { rooms } from '@/content/rooms'
import { projects } from '@/content/projects'

describe('featured work', () => {
  it('is Kylee’s seven, four professional and three personal', () => {
    expect(FEATURED).toEqual([
      'beacon', '403hq', 'aura', 'nbs-website',
      'kingdoms-and-crowns', 'chemtree-hq', 'wretched-few',
    ])
    const byslug = new Map(projects.map((p) => [p.slug, p]))
    const pro = FEATURED.filter((s) => byslug.get(s)?.isPersonal === false)
    expect(pro).toHaveLength(4)
    expect(FEATURED.length - pro.length).toBe(3)
  })

  it('has a case study for every featured slug and no orphans', () => {
    expect(caseStudies.map((c) => c.slug).sort()).toEqual([...FEATURED].sort())
    for (const c of caseStudies) {
      expect(projects.some((p) => p.slug === c.slug), `${c.slug} is not a project`).toBe(true)
    }
  })

  it('admits something that did not work on every single piece', () => {
    // The spec's whole argument: a gallery where nothing failed is a brochure.
    for (const c of caseStudies) {
      expect(c.placard.threwAway.length, `${c.slug} threwAway`).toBeGreaterThan(20)
      expect(c.placard.differently.length, `${c.slug} differently`).toBeGreaterThan(20)
    }
  })

  it('says why it was built that way, not just what it is', () => {
    for (const c of caseStudies) {
      expect(c.whyBuiltThisWay.length, `${c.slug} whyBuiltThisWay`).toBeGreaterThan(40)
    }
  })
})

describe('room copy', () => {
  it('keeps statistics out of the building', () => {
    // Figures live on /about and /leadership. A room that quotes a delivery
    // number has slipped back into being a résumé.
    const prose = [
      rooms.steps.welcome, rooms.steps.line,
      rooms.window.lede, ...rooms.window.principles.flatMap((p) => [p.title, p.body]),
      rooms.floor.lede, rooms.desk.lede, rooms.wayOut.body,
    ].join(' ')
    expect(prose).not.toMatch(/\d+\s*(%|\+|x|×)/i)
    expect(prose).not.toMatch(/\b\d{3,}\b/)
  })

  it('has three principles in the window', () => {
    expect(rooms.window.principles).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/unit/rooms.test.ts`
Expected: FAIL — cannot resolve `@/content/caseStudies`

- [ ] **Step 3: Write the case studies**

Create `content/caseStudies.ts`. **Every field below is drawn from the spec's Source material section.** Do not embellish, do not add achievements, do not smooth her phrases into house style.

```ts
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
```

- [ ] **Step 4: Write the room copy**

Create `content/rooms.ts`. The three principles are Kylee's, from the spec.

```ts
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
```

- [ ] **Step 5: Verify**

Run: `npx vitest run tests/unit/rooms.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add content/rooms.ts content/caseStudies.ts tests/unit/rooms.test.ts
git commit -m "feat: write the building's copy from Kylee's own answers

Seven case studies and five rooms of copy, drawn from the interview in
the spec's source material rather than from the resume. Every piece
names something that was thrown away and something that would be done
differently, enforced by test — a gallery where nothing ever failed is
a brochure.

The three principles in the window are hers verbatim in substance: keep
moving, nothing is sacred, AI is a tool whose problem is the people
misusing it."
```

---

### Task 2: The floor plan

Turn `CinematicJourney`'s decorative directions into architecture, and give each scene a `setting` layer behind its content.

**Files:**
- Create: `components/rooms/Room.tsx`
- Modify: `components/journey/CinematicJourney.tsx`
- Modify: `components/sections/Journey.tsx`
- Create: `tests/unit/floorplan.test.ts`

**Interfaces:**
- Consumes: `Scene`, `Dir` from `CinematicJourney`
- Produces: `Room({ setting, children })`; `Scene` gains optional `setting?: ReactNode`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/floorplan.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { layout } from '@/components/journey/CinematicJourney'

describe('the floor plan', () => {
  it('walks up the steps, then along the gallery wall', () => {
    const cells = layout([
      { id: 'steps', dir: 'start', node: null },
      { id: 'window', dir: 'up', node: null },
      { id: 'floor', dir: 'right', node: null },
      { id: 'desk', dir: 'right', node: null },
      { id: 'way-out', dir: 'in', node: null },
    ])
    expect(cells.map((c) => [c.x, c.y])).toEqual([
      [0, 0],   // the steps, outside
      [0, -1],  // up, through the door
      [1, -1],  // right, onto the gallery floor
      [2, -1],  // right, along to the desk
      [2, -1],  // in, zooming to the way out
    ])
    expect(cells[4]!.zoom).toBe(true)
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/floorplan.test.ts`
Expected: FAIL — `layout` is not exported

- [ ] **Step 3: Export `layout` and add `setting` to Scene**

In `components/journey/CinematicJourney.tsx`, change `function layout(` to `export function layout(`, and add to the `Scene` interface:

```ts
export interface Scene {
  id: string
  dir: Dir
  node: ReactNode
  /** The room's environment, rendered behind its content. */
  setting?: ReactNode
}
```

In the `Panel` component, render the setting behind `BackgroundShapes` and give rooms the option to suppress the default decoration:

```tsx
      {setting ?? <BackgroundShapes />}
```

Thread `setting={s.setting}` through both the horizontal `<Panel>` and the stacked fallback `<section>`. **The stacked fallback must render the setting too** — it is the mobile and reduced-motion path, and a room with no environment there is a different site.

- [ ] **Step 4: Add the Room primitive**

Create `components/rooms/Room.tsx`:

```tsx
import { type ReactNode } from 'react'

/**
 * A room's content column. The setting renders behind this via Scene.setting;
 * this is only the readable part, so it stays above the environment and keeps
 * a consistent measure across every room.
 */
export function Room({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`relative z-10 w-full ${className}`}>{children}</div>
}
```

- [ ] **Step 5: Rewire the journey**

Rewrite `components/sections/Journey.tsx` to the floor plan. Rooms are built in later tasks; import placeholders are not acceptable, so this step lands together with Task 3 onward. For now wire the two directions that change and keep existing scenes:

```tsx
  const scenes: Scene[] = [
    { id: 'steps', dir: 'start', node: <AboutScene /> },
    { id: 'window', dir: 'up', node: <ValueScene /> },
    { id: 'floor', dir: 'right', node: <BuildScene /> },
    { id: 'desk', dir: 'right', node: <LeadScene /> },
    { id: 'way-out', dir: 'in', node: <TalkScene showDoor /> },
  ]
```

- [ ] **Step 6: Verify**

Run: `npx vitest run tests/unit/floorplan.test.ts && npm run typecheck && npm run lint`
Run: `npx playwright test tests/e2e/a11y.spec.ts tests/e2e/room.spec.ts`
Expected: PASS. The scroll journey still works; only the geometry changed.

- [ ] **Step 7: Commit**

```bash
git add components/rooms/Room.tsx components/journey/CinematicJourney.tsx components/sections/Journey.tsx tests/unit/floorplan.test.ts
git commit -m "feat: make the camera directions an actual floor plan

The journey already moved a camera across a 2D grid; the directions were
decorative. They now describe a building — up the steps, through the
door, right along the gallery wall, right again to the desk, then in.

Scenes gain a setting layer so each room can carry its own environment,
rendered in the stacked fallback as well as the camera path."
```

---

### Task 3: The Steps

**Files:**
- Create: `components/rooms/Steps.tsx`
- Create: `tests/unit/Steps.test.tsx`
- Create: `tests/e2e/rooms.spec.ts`
- Modify: `components/sections/Journey.tsx`

**Interfaces:**
- Consumes: `rooms.steps` (Task 1), `Room` (Task 2)
- Produces: `StepsRoom()`, `StepsSetting()`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/Steps.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepsRoom } from '@/components/rooms/Steps'
import { rooms } from '@/content/rooms'

describe('The Steps', () => {
  it('shows the welcome and the one line', () => {
    render(<StepsRoom />)
    expect(screen.getByText(rooms.steps.welcome)).toBeInTheDocument()
    expect(screen.getByText(rooms.steps.line)).toBeInTheDocument()
  })

  it('puts no statistic on the front door', () => {
    const { container } = render(<StepsRoom />)
    expect(container.textContent).not.toMatch(/\d/)
  })
})
```

Create `tests/e2e/rooms.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('the welcome is readable with animations disabled', async ({ browser }) => {
  // The door opening must never gate the content behind it.
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByText(/come in/i)).toBeVisible()
  await context.close()
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/unit/Steps.test.tsx`
Expected: FAIL — cannot resolve `@/components/rooms/Steps`

- [ ] **Step 3: Implement**

Create `components/rooms/Steps.tsx`. The door opens on mount; with reduced motion it starts open. Light is `bg-accent` at low opacity with blur — never a warm hex, so it themes.

```tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Room } from './Room'
import { NameLogo } from '@/components/primitives/NameLogo'
import { rooms } from '@/content/rooms'

/**
 * Outside, at dusk. The door opens by itself a beat after you arrive and light
 * spreads down the steps. Purely decorative — the welcome underneath is in the
 * DOM and readable whether or not the door ever moves.
 */
export function StepsSetting() {
  const reduce = useReducedMotion()
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the steps */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="block border-t border-rule bg-surface-raised"
            style={{ width: `${34 + i * 6}%`, height: '2.2vh', opacity: 0.5 + i * 0.1 }}
          />
        ))}
      </div>
      {/* the doorway */}
      <div className="absolute left-1/2 top-[18%] h-[46vh] w-[22vw] min-w-[190px] -translate-x-1/2 rounded-t-[10rem] bg-surface-raised ring-1 ring-rule" />
      {/* the door, swinging open */}
      <motion.div
        className="absolute left-1/2 top-[18%] h-[46vh] w-[22vw] min-w-[190px] origin-left rounded-t-[10rem] bg-surface ring-1 ring-rule"
        style={{ translateX: '-50%' }}
        initial={reduce ? { rotateY: -78 } : { rotateY: 0 }}
        animate={{ rotateY: -78 }}
        transition={{ delay: 0.6, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* light spilling out */}
      <motion.div
        className="absolute left-1/2 top-[24%] h-[62vh] w-[38vw] -translate-x-1/2 rounded-full bg-accent blur-3xl"
        initial={reduce ? { opacity: 0.28 } : { opacity: 0 }}
        animate={{ opacity: 0.28 }}
        transition={{ delay: 1.1, duration: 1.8 }}
      />
    </div>
  )
}

export function StepsRoom() {
  return (
    <Room className="mx-auto max-w-3xl text-center">
      <NameLogo size="hero" animate />
      <p className="mt-8 font-serif text-fluid-h2 text-fg">{rooms.steps.welcome}</p>
      <p className="mx-auto mt-4 max-w-xl font-sans text-lg leading-relaxed text-fg-muted">
        {rooms.steps.line}
      </p>
    </Room>
  )
}
```

Wire it in `Journey.tsx`: `{ id: 'steps', dir: 'start', node: <StepsRoom />, setting: <StepsSetting /> }`.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/unit/Steps.test.tsx && npm run typecheck && npm run lint`
Run: `npx playwright test tests/e2e/rooms.spec.ts tests/e2e/a11y.spec.ts`
Expected: PASS, axe clean on all seven routes in both themes.

- [ ] **Step 5: Commit**

```bash
git add components/rooms/Steps.tsx tests/unit/Steps.test.tsx tests/e2e/rooms.spec.ts components/sections/Journey.tsx
git commit -m "feat: arrive at the steps and have the door open for you

The entrance is a short flight of stairs to a door that swings open on
its own, with light spreading down the steps. The setting is decorative
and aria-hidden; the welcome underneath is plain DOM, so it reads with
animations disabled and with no JS at all."
```

---

### Task 4: The Window

**Files:**
- Create: `components/rooms/Window.tsx`
- Create: `tests/unit/Window.test.tsx`
- Modify: `components/sections/Journey.tsx`, `tests/e2e/rooms.spec.ts`

**Interfaces:**
- Consumes: `rooms.window` (Task 1), `Room` (Task 2)
- Produces: `WindowRoom()`, `WindowSetting()`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/Window.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WindowRoom } from '@/components/rooms/Window'
import { rooms } from '@/content/rooms'

describe('The Window', () => {
  it('renders all three principles with their bodies', () => {
    render(<WindowRoom />)
    for (const p of rooms.window.principles) {
      expect(screen.getByText(p.title)).toBeInTheDocument()
      expect(screen.getByText(p.body)).toBeInTheDocument()
    }
  })

  it('uses a heading level below the page h1', () => {
    render(<WindowRoom />)
    expect(screen.getByRole('heading', { name: rooms.window.heading, level: 2 })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/Window.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Create `components/rooms/Window.tsx`:

```tsx
'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Room } from './Room'
import { RevealOnActive } from '@/components/journey/sceneActive'
import { rooms } from '@/content/rooms'

/**
 * The first room inside. A window on one wall; the light it throws travels
 * across the floor as you scroll. Decorative only.
 */
export function WindowSetting() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const x = useTransform(scrollYProgress, [0, 1], ['-8%', '26%'])
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the window frame */}
      <div className="absolute right-[8%] top-[16%] h-[42vh] w-[24vw] min-w-[180px] rounded-sm bg-surface-raised ring-1 ring-rule">
        <span className="absolute inset-x-0 top-1/2 h-px bg-rule" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-rule" />
      </div>
      {/* the light it throws */}
      <motion.div
        className="absolute right-[6%] top-[18%] h-[64vh] w-[34vw] rounded-[40%] bg-accent opacity-[0.14] blur-3xl"
        style={reduce ? undefined : { x }}
      />
    </div>
  )
}

export function WindowRoom() {
  return (
    <Room className="mx-auto max-w-3xl">
      <RevealOnActive>
        <p className="font-sans text-label uppercase text-accent">{rooms.window.eyebrow}</p>
        <h2 className="mt-4 font-serif text-fluid-h2 text-fg">{rooms.window.heading}</h2>
        <p className="mt-4 max-w-xl font-sans leading-relaxed text-fg-muted">{rooms.window.lede}</p>
      </RevealOnActive>
      <dl className="mt-10 space-y-8">
        {rooms.window.principles.map((p, i) => (
          <RevealOnActive key={p.title} index={i + 1}>
            <dt className="font-serif text-2xl leading-tight text-accent">{p.title}</dt>
            <dd className="mt-2 max-w-2xl font-sans leading-relaxed text-fg">{p.body}</dd>
          </RevealOnActive>
        ))}
      </dl>
    </Room>
  )
}
```

Wire into `Journey.tsx` as the `window` scene with its setting.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/unit/Window.test.tsx && npm run typecheck && npm run lint`
Run: `npx playwright test tests/e2e/a11y.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/rooms/Window.tsx tests/unit/Window.test.tsx components/sections/Journey.tsx
git commit -m "feat: add the window, where how I think comes before the work

Process before portfolio, which is the order lucaorio uses and it
changes how everything after it reads. Three principles in Kylee's own
words. The light through the window tracks scroll and is decorative."
```

---

### Task 5: The Floor and its placards

**Files:**
- Create: `components/rooms/Placard.tsx`, `components/rooms/Floor.tsx`
- Create: `tests/unit/Placard.test.tsx`
- Modify: `components/sections/Journey.tsx`, `tests/e2e/rooms.spec.ts`

**Interfaces:**
- Consumes: `caseStudies`, `FEATURED` (Task 1), `ProjectVisual`, `Gallery`, `projects`
- Produces: `Placard({ study })`, `FloorRoom()`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/Placard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Placard } from '@/components/rooms/Placard'
import { caseStudies } from '@/content/caseStudies'

const study = caseStudies.find((c) => c.slug === '403hq')!

describe('Placard', () => {
  it('starts closed and opens to reveal what went wrong', async () => {
    const user = userEvent.setup()
    render(<Placard study={study} />)
    const summary = screen.getByText(/what went wrong/i)
    expect(screen.queryByText(study.placard.threwAway)).not.toBeVisible()
    await user.click(summary)
    expect(screen.getByText(study.placard.threwAway)).toBeVisible()
  })

  it('is a native disclosure so it works without JS', () => {
    const { container } = render(<Placard study={study} />)
    expect(container.querySelector('details')).not.toBeNull()
    expect(container.querySelector('summary')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/Placard.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the placard**

`<details>`/`<summary>` is deliberate: keyboard operation, correct announcement and no-JS behaviour come free, exactly as native `<dialog>` was chosen for the lightbox.

Create `components/rooms/Placard.tsx`:

```tsx
import type { CaseStudy } from '@/content/caseStudies'
import { rooms } from '@/content/rooms'

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <dt className="font-sans text-label uppercase text-accent">{label}</dt>
      <dd className="mt-1 font-sans text-sm leading-relaxed text-fg-muted">{children}</dd>
    </div>
  )
}

/** The card beside a piece. Lift it for the part that didn't work. */
export function Placard({ study }: { study: CaseStudy }) {
  return (
    <details className="group mt-5 rounded-lg bg-surface-raised ring-1 ring-rule">
      <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-semibold text-accent marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {rooms.floor.placardHint}
        <span aria-hidden="true" className="ml-2 inline-block transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <dl className="border-t border-rule px-4 pb-4 pt-1">
        <Line label="The hard part">{study.placard.hard}</Line>
        <Line label="Thrown away">{study.placard.threwAway}</Line>
        <Line label="Next time">{study.placard.differently}</Line>
        <Line label="Built for">{study.placard.builtFor}</Line>
      </dl>
    </details>
  )
}
```

- [ ] **Step 4: Implement the floor**

Create `components/rooms/Floor.tsx` rendering each `FEATURED` slug in order: the project's `ProjectVisual`, its name as `<h3>`, then `whatItIs`, `problem`, `whyBuiltThisWay`, the `stack` chips, a `Gallery` where `media.gallery` exists, and the `Placard`. Look each project up with `projects.find((p) => p.slug === slug)` and skip nothing silently — if a slug has no project, throw at module load so it fails the build rather than rendering a hole.

Setting: gallery lighting — a soft `bg-accent` pool at very low opacity behind each piece, `aria-hidden`.

- [ ] **Step 5: Verify**

Run: `npx vitest run tests/unit/Placard.test.tsx && npm run typecheck && npm run lint`
Run: `npx playwright test tests/e2e/a11y.spec.ts`
Expected: PASS — the disclosure must not introduce violations.

- [ ] **Step 6: Commit**

```bash
git add components/rooms/Placard.tsx components/rooms/Floor.tsx tests/unit/Placard.test.tsx components/sections/Journey.tsx
git commit -m "feat: hang seven pieces on the floor, each with a placard

Every piece says what it is, the problem it solves and why it was built
that way — that last one is what no card had before and it is the part
that shows judgement rather than output.

Each placard opens to the part that went wrong. Native details/summary,
so keyboard operation and no-JS behaviour come free."
```

---

### Task 6: The Desk

**Files:**
- Create: `components/rooms/StickyNote.tsx`, `components/rooms/Desk.tsx`
- Create: `tests/unit/StickyNote.test.tsx`
- Modify: `components/sections/Journey.tsx`

**Interfaces:**
- Consumes: `projects`, `FEATURED`, `rooms.desk`
- Produces: `StickyNote({ project, tilt })`, `DeskRoom()`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/StickyNote.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeskRoom } from '@/components/rooms/Desk'
import { projects } from '@/content/projects'
import { FEATURED } from '@/content/caseStudies'

describe('The Desk', () => {
  it('holds every project that is not on the wall, and none that is', () => {
    render(<DeskRoom />)
    const onDesk = projects.filter((p) => !FEATURED.includes(p.slug as never))
    for (const p of onDesk) expect(screen.getByText(p.name)).toBeInTheDocument()
    for (const slug of FEATURED) {
      const featured = projects.find((p) => p.slug === slug)!
      expect(screen.queryByText(featured.name)).toBeNull()
    }
  })

  it('makes a note with a live URL a real link', () => {
    render(<DeskRoom />)
    const withUrl = projects.find((p) => !FEATURED.includes(p.slug as never) && p.liveUrl)!
    const link = screen.getByRole('link', { name: new RegExp(withUrl.name, 'i') })
    expect(link).toHaveAttribute('href', withUrl.liveUrl!)
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/StickyNote.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`StickyNote` renders an `<a>` when the project has a `liveUrl` and a plain `<div>` otherwise — never an anchor without an href. Colour comes from a small rotation of **semantic token tints** (`bg-accent/10`, `bg-accent/20`, `bg-surface-raised`, `bg-fill/10`), not from stock Tailwind yellows, so notes theme correctly. Tilt is a deterministic function of index — `Math.random()` would break SSR hydration.

Each note shows the project name, its `descriptor`, and one short line. Lift on hover **and on focus**, so keyboard users get the same affordance.

`DeskRoom` lays them out in a loose grid with the setting being a desk surface and a lamp pool of `bg-accent` at low opacity.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/unit/StickyNote.test.tsx && npm run typecheck && npm run lint`
Run: `npx playwright test tests/e2e/a11y.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/rooms/StickyNote.tsx components/rooms/Desk.tsx tests/unit/StickyNote.test.tsx components/sections/Journey.tsx
git commit -m "feat: put everything that is not on the wall on the desk

Ten projects as sticky notes — name, a few words, and a live link where
there is one. Notes lift on hover and on focus so the affordance is not
mouse-only, tilt is derived from index rather than random so SSR and
client agree, and the colours are token tints so they theme."
```

---

### Task 7: The mailbox

**Files:**
- Create: `components/rooms/Mailbox.tsx`
- Modify: `components/sections/Contact.tsx`, `components/sections/ContactForm.tsx`, `content/contact.ts`, `content/contactOptions.ts`, and the tests that pin the inquiry values
- Modify: `tests/e2e/contact.spec.ts`

**Interfaces:**
- Consumes: `rooms.wayOut.mailbox`
- Produces: `Mailbox({ children })`

- [ ] **Step 1: Write the failing test**

Add to `tests/e2e/rooms.spec.ts`:

```ts
test('the mailbox takes a letter and has no inquiry dropdown', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: /inquiry|type/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /send|post/i })).toBeVisible()
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx playwright test tests/e2e/rooms.spec.ts --project=chromium`
Expected: FAIL — the inquiry `<select>` is still rendered

- [ ] **Step 3: Remove the dropdown end to end**

The inquiry value crosses the client/server boundary — it feeds a Zod enum built from `inquiryValues` in `lib/contact/schema.ts` and the email subject in `lib/contact/email.ts`. Remove the field, delete `content/contactOptions.ts`, drop it from the schema and derive the subject from the sender's name instead. Run `grep -rn "inquiry" app components content lib tests` and account for **every** hit, or the API will reject valid submissions.

- [ ] **Step 4: Build the mailbox**

Create `components/rooms/Mailbox.tsx` — a mailbox drawn in tokens with the form inside it, `rooms.wayOut.mailbox.label` as the visible heading and `.hint` beneath. On success the form already swaps to a status block; change its text to `.sent`. Keep the `role="alert"` error path and the mailto fallback on every failure exactly as they are.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint && npm run test`
Run: `npx playwright test tests/e2e/contact.spec.ts tests/e2e/rooms.spec.ts tests/e2e/a11y.spec.ts`
Expected: the contact happy-path failure is the same pre-existing one, no new failures.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: turn the contact form into a mailbox

You post a letter rather than submitting a lead. The inquiry-type
dropdown was the most corporate object on the site and it is gone,
including its Zod enum and the email subject that derived from it.

Validation, Turnstile, the alert role and the mailto fallback on every
error path are unchanged."
```

---

### Task 8: Rehome the résumé

The statistics leave the building. They do not disappear — a hiring manager still needs them.

**Files:**
- Modify: `app/about/page.tsx`, `app/leadership/page.tsx`, `app/value/page.tsx`, `app/work/page.tsx`, `app/connect/page.tsx`, `content/contact.ts` (footer), `content/nav.ts`
- Delete: the old scene components in `components/scenes.tsx` that no room uses
- Modify: `tests/unit/content.test.ts`

- [ ] **Step 1: Move the figures**

`journey.lead.figures` and `journey.build.figures` move onto `/leadership` and `/about` respectively, rendered there with `CountUp` as they are today. Nothing in the five rooms may render a figure — Task 1's room-copy test already guards the copy; this step moves the actual components.

- [ ] **Step 2: Retire the dead scenes**

`AboutScene`, `LeadScene`, `ValueScene`, `BuildScene` and `TalkScene` are replaced by rooms. Any that no page still imports gets deleted, not left in place. Run `grep -rn "AboutScene\|LeadScene\|ValueScene\|BuildScene\|TalkScene" app components tests` and remove every orphan. **This project has shipped dead exports three times; do not add a fourth.**

- [ ] **Step 3: Fix the names**

`/value` mirrored a scene that no longer exists. Fold its content into `/about` or retire the route with a redirect — do not leave a page rendering a deleted component. Update `content/nav.ts` and the footer lists to match whatever survives.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Run: `npx playwright test`
Expected: exactly the 5 pre-existing failures. Every route in the a11y sweep still resolves — a 404 in that list is a red run.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move the statistics out of the building

Delivery figures, headcount and platform counts now live on /about and
/leadership, where someone looking for them will find them, instead of
being the second thing a visitor reads.

Deletes the five scene components the rooms replaced rather than leaving
them orphaned."
```

---

### Task 9: Full verification

- [ ] **Step 1: Every gate**

```bash
npm run typecheck && npm run lint && npm run test && npm run build && npx playwright test
```

Expected: exactly the 5 pre-existing failures, no new ones.

- [ ] **Step 2: The reduced-motion pass**

Open every room with `prefers-reduced-motion: reduce`. Confirm all copy is readable, the door is already open, the window light is static, and nothing is hidden behind an animation that never runs.

- [ ] **Step 3: The keyboard pass**

Tab through the whole home page. Every placard opens with Enter, every sticky note is reachable and shows a focus ring, the door and the mailbox are reachable. Nothing touchable is skipped.

- [ ] **Step 4: The no-JS pass**

Disable JavaScript and load `/`. The stacked fallback must render all five rooms with their content and settings.

- [ ] **Step 5: Dead code sweep**

```bash
grep -rn "AboutScene\|LeadScene\|ValueScene\|BuildScene\|TalkScene\|inquiryOptions\|contactOptions" app components content lib tests
```

Expected: no hits outside deliberate history. Report anything found rather than leaving it.

---

## Self-Review

**Spec coverage.** Floor plan → Task 2. The Steps → 3. The Window → 4. The Floor + placards → 5. The Desk → 6. Mailbox → 7. Statistics rehomed → 8. Voice rules → enforced by Task 1's tests. Source material → Task 1 Step 3. Open question 3 (page names) → Task 8 Step 3.

**Known risk, flagged not hidden.** Task 2 Step 5 wires the floor plan while still pointing at the *old* scene components, so between Tasks 2 and 8 the site renders old content in new geometry. That is deliberate — it keeps every task shippable — but the site looks wrong in the middle of this plan, and Task 8 is not optional.

**Type consistency.** `CaseStudy`/`Placard` defined in Task 1, consumed unchanged in 5. `Room` defined in Task 2, used in 3–6. `Scene.setting` added in Task 2, supplied by 3–6. `FEATURED` defined in Task 1, read by 5 and 6 — Task 6 depends on it excluding exactly what Task 5 renders, which the Task 6 test asserts in both directions.
