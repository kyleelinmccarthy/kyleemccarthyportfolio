# The Tiny Planet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the house-you-walk-through portfolio with an interactive 3D tiny planet where every project, principle, art collection and contact point is a place with its own URL.

**Architecture:** The URL is the single source of truth: `/` is the planet from space, `/places/[id]` is one place in focus. Each page server-renders its content as ordinary HTML (header and index, or a panel); a lazily loaded react-three-fiber canvas sits behind it in a shared layout and reads the pathname to decide where the camera goes. All sphere geometry, terrain, time-of-day and camera maths live in pure, unit-tested modules; the 3D components only draw.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind 3, three.js, @react-three/fiber 9, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-10-tiny-planet-design.md`. Read it first. The approved look is `docs/superpowers/specs/reference/2026-11-10-planet-look-test.html`: its shaders, colour values and camera numbers are the reference; its structure and its building shapes are not.

## Global Constraints

- Work on branch `tiny-planet`, created from `main`. Commit locally at the end of each task. **Never push, deploy or merge**; Kylee switches the live site over herself.
- The site must build, typecheck, lint and pass tests at the end of every task: `npm run typecheck && npm run lint && npm test`.
- **No invented facts.** Copy comes from this plan, the spec, or the existing content files. If a line of copy is missing, leave the field out and list it in the hand-off; do not write one.
- **Her children's names or likenesses never appear** in code, copy, file names, tests, comments or commit messages. The hero names Emma, Noah and the parent Jordan in Kingdoms & Crowns screenshots are demo personas and are fine.
- **Look rules (spec, "The look"):** two-tone cel shading plus a half-tone band; coloured shadows, never grey; thin dark-indigo outlines (`#2A2352`), never thick, never black; bloom only on things that are actually bright; every colour comes from `content/sky.ts` or the design tokens, never hard-coded in a component.
- No third-party scripts or CDNs. three.js is bundled; fonts load through `next/font`.
- Outbound links come only from content files and carry `rel="noopener noreferrer"`.
- New dependencies are limited to `three`, `@react-three/fiber` (v9, required for React 19) and `@types/three`. Bloom uses three's own `examples/jsm/postprocessing`. No state library, no drei.
- `lib/world/**` is pure: it may import three's maths classes (`Vector3`, `Quaternion`, `Color`, `MathUtils`) and nothing else from three, no React, no DOM.
- Exactly one `<h1>` per page. Every image has alt text. WCAG AA contrast in all four times of day.
- Do not modify any repo other than this one. Other repos are read-only sources.

## Execution Notes

Kylee asked for subagents on lower models where suitable. Suggested model per task is given as **Model:**. `sonnet` for content, pure logic, pages and tests; `opus` for shaders, the camera rig and every landmark.

There are two hard stops where the work waits for Kylee: after Task 19 (first five landmarks) and after Task 23 (finished planet, before cut-over).

## Review Focus

Conditions the spec implies that are most likely to bite a visitor. Each is pinned by a test in the task named.

1. **The visitor's clock at the edges.** At 05:30 the greeting is "Morning." while the sky is still night; `sessionStorage` can throw in private browsing. The page must still pick a theme and a greeting. → Task 6, Task 8.
2. **A place URL opened directly while the 3D code is loading, failed, or the GPU context is lost mid-visit.** The panel must be readable and every link must work; the canvas falls back to the picture. → Task 11.
3. **Impatient clicking.** Pressing "next" on the tour several times mid-flight must leave the camera at the place the URL names, never stuck between two. → Task 7, Task 13.
4. **Narrow and resized windows.** On a phone-width window the planet must fit, the panel must not cover the tour controls, and labels must follow a resize. → Task 9, Task 14.
5. **A place added later with no bespoke landmark and no images.** It must render with the generic building and a text-only panel, with no crash. → Task 3, Task 10, Task 17.

---

## Phase 1: Content

### Task 1: Project content changes

**Model:** sonnet

**Files:**
- Modify: `content/types.ts`, `content/projects.ts`, `content/caseStudies.ts`, `scripts/import-assets.ts`, `scripts/capture-screenshots.ts`, `tests/unit/content.test.ts`
- Delete: `public/media/{wretched-few,eliminated-web,chemtree-games,chemtree-hq,doing-the-thing}/`
- Rename: `public/media/family-budgeting/` → `public/media/the-budget/`
- Create (by running the scripts): `public/media/{eliminated,eliminated-site,jimothy-and-pidge,tiny-frenzy-games,the-budget}/*`

**Interfaces:**
- Produces: `Project` gains `statusLabel?: string`, `facts?: Array<{ label: string; value: string }>`, `captureClick?: string`; `problem` becomes optional. Final project slugs: `403hq`, `aura`, `beacon`, `ruckus`, `nbs-website`, `paragon`, `onboarding`, `kingdoms-and-crowns`, `eliminated`, `eliminated-site`, `jimothy-and-pidge`, `tiny-frenzy-games`, `ember-tattoo`, `the-budget`.

- [ ] **Step 1: Create the branch and commit the spec and plan**

```bash
git checkout -b tiny-planet
git add docs/superpowers
git commit -m "docs: tiny planet design and plan"
```

- [ ] **Step 2: Rewrite the failing content tests** in `tests/unit/content.test.ts`. Replace the count test and add:

```ts
it('has 7 professional and 7 personal projects', () => {
  expect(projects.filter((p) => !p.isPersonal)).toHaveLength(7)
  expect(projects.filter((p) => p.isPersonal)).toHaveLength(7)
})
it('has dropped the retired projects', () => {
  const gone = ['wretched-few', 'eliminated-web', 'chemtree-games', 'chemtree-hq', 'doing-the-thing', 'external-payroll', 'forms-suite', 'family-budgeting']
  for (const slug of gone) expect(projects.find((p) => p.slug === slug)).toBeUndefined()
})
it('has the new projects with their live links', () => {
  const url = (slug: string) => projects.find((p) => p.slug === slug)?.liveUrl
  expect(url('eliminated-site')).toBe('https://eliminatedgame.com/')
  expect(url('tiny-frenzy-games')).toBe('https://tinyfrenzygames.com/')
  expect(url('the-budget')).toBe('https://the-budget-demo.kyleelinmccarthy.workers.dev/login')
  expect(projects.find((p) => p.slug === 'jimothy-and-pidge')?.name).toBe('Jimothy & Pidge: Shenanigans in Seattle')
  expect(projects.find((p) => p.slug === 'eliminated')?.statusLabel).toBe('Coming soon to Steam')
})
it('only writes case studies for projects that exist', () => {
  for (const c of caseStudies) expect(projects.some((p) => p.slug === c.slug), c.slug).toBe(true)
})
```

Change "requires problem + built copy" to require `built` only. Keep every other existing test.

- [ ] **Step 3: Run** `npx vitest run tests/unit/content.test.ts`. Expected: the new tests FAIL.

- [ ] **Step 4: Update `content/types.ts` and `content/projects.ts`.** Delete the six retired entries and `forms-suite`. Update `workIntro` only if a count it states changes (it does not). Add or replace these entries; fields not listed keep their current values:

| slug | Fields |
| --- | --- |
| `eliminated` | descriptor `Party Game · 2–8 Players · Unity`; headline `A wholesome party game where everyone dies.`; problem unchanged; built `Childhood playground games with elimination-show stakes, run by a sinister Game Master. Nine games for two to eight players: solo against bots, on the couch, or online. Lose, and you are neatly boxed up with a little pink bow.`; status `building`; statusLabel `Coming soon to Steam`; stack `['Unity 6', 'C#']`; media hero `/media/eliminated/hero.jpg` (the capsule) plus a nine-image gallery |
| `eliminated-site` | name `Eliminated — the website`; descriptor `Marketing Site · Press Kit`; category `Games`; headline `The front door for the game.`; built `A single page covering the games, the powerups, the players and the screenshots, with a downloadable press kit. A static Astro site on Cloudflare with a strict content security policy and no cookies or trackers.`; status `production`; liveUrl `https://eliminatedgame.com/`; autoCapture; stack `['Astro', 'TypeScript', 'Cloudflare']`; isPersonal |
| `jimothy-and-pidge` | name `Jimothy & Pidge: Shenanigans in Seattle`; descriptor `3D Collect-a-thon Platformer · Unity`; category `Games`; headline `A round raccoon and his pigeon pal take Seattle back from the Terrible Trapper.`; built `A single-player 3D collect-a-thon in the spirit of the late-90s classics. Jimothy and Pidge free the caged Elder Raccoons, recover stolen treats and face Seattle-flavoured bosses. Every model, animation, shader and song in it is generated by code.`; status `building`; statusLabel `In development`; stack `['Unity 6', 'URP', 'C#']`; media hero `/media/jimothy-and-pidge/hero.jpg`, gallery `main.jpg`; isPersonal |
| `tiny-frenzy-games` | name `Tiny Frenzy Games`; descriptor `Studio Site · One Dev`; category `Games`; headline `One dev. All the frenzy.`; built `The home of my one-person game studio: both games, a mailing list for playtest invites, a contact form and a private admin with its own newsletter editor.`; status `production`; liveUrl `https://tinyfrenzygames.com/`; autoCapture; stack `['Next.js', 'Drizzle', 'Neon Postgres', 'Cloudflare Workers']`; isPersonal |
| `kingdoms-and-crowns` | descriptor `Homeschool Platform · With a 3D World Inside`; headline `A homeschool hub with a 3D world inside it.`; built: the current text, then `Finishing quests earns minutes in the Realm, a low-poly 3D world inside the app, where each deed raises a building in the hero’s village and there is a lost crown to win back.`; outcome `In beta, invite-only.`; stack `['Next.js', 'three.js', 'react-three-fiber', 'Drizzle', 'Turso', 'Vercel']` |
| `the-budget` (was `family-budgeting`) | name `The Budget`; outcome `The public demo runs on made-up data and resets every Monday.`; liveUrl `https://the-budget-demo.kyleelinmccarthy.workers.dev/login`; autoCapture; captureClick `Explore as Person 1`; stack `['Next.js', 'TypeScript']`; media hero `/media/the-budget/hero.jpg` |
| `onboarding` (was `forms-suite`) | name `Onboarding`; descriptor `Client Onboarding · Multi-Tenant Service`; headline `Client onboarding built once, as a shared service.`; problem `Client onboarding was heading toward separate implementations in the website and in Paragon.`; built `A multi-tenant onboarding service published as a headless package, so every consumer shares one implementation.`; no outcome; status `releasing` |

`jimothy-and-pidge`, `eliminated-site` and `tiny-frenzy-games` have no `problem`: Kylee has not said why she built them.

In `content/caseStudies.ts` delete the `chemtree-hq` and `wretched-few` entries.

- [ ] **Step 5: Update the importers and bring the images in.**
  - `scripts/import-assets.ts`: remove the `chemtree-hq` and `wretched-few` sources. Add `eliminated` (dir `E:/codeProjects/EliminatedGame/EliminatedGame/marketing/steam-capsule/steam`, `header_capsule_920x430.png` → `hero`; and from `E:/codeProjects/eliminated-site/src/assets/screenshots` the nine `*-1.webp` files → kebab-case names such as `red-light`, `glass-bridge`). Add `jimothy-and-pidge` (dir `E:/codeProjects/Jimothy-the-raccoon/.claude/worktrees/dev/Captures/key-art-refs/steam-capsules/alley`, `header_capsule_920x430.png` → `hero`, `main_capsule_1232x706.png` → `main`). A source may now list more than one directory.
  - `scripts/capture-screenshots.ts`: when a project has `captureClick`, click the button with that exact text and wait for the network to settle before the screenshot.
  - Run `npm run import:assets` and `npm run capture:screenshots`. Delete the five retired media folders and rename `family-budgeting`.
  - Open each new image and write its alt text from what is visible. For the nine gameplay shots, name the minigame from the file name.

- [ ] **Step 6: Run** `npm run typecheck && npm test`. Expected: PASS. Fix any old component or test that referenced a removed slug by deleting that reference (the old UI is retired in Task 10).

- [ ] **Step 7: Commit** `feat(content): new games, studio site, The Budget demo, retire six projects`.

### Task 2: Rename the art file that carries private names

**Model:** sonnet

**Files:**
- Rename: the one file in `public/media/art/` whose alt text begins "Two Minecraft-style player characters in Santa hats" → `digitalminecraftxmas.jpg`
- Modify: `content/room.ts` (the matching `artAlt` key), `scripts/import-art.ts`
- Test: `tests/unit/art-slug.test.ts`

**Interfaces:**
- Produces: `slugFor(fileName: string): string` exported from `scripts/lib/artSlug.ts`, applying overrides before `artSlug`.

- [ ] **Step 1: Write the failing test.** The override is a pattern, so the original file name never has to be written down:

```ts
it('gives the Minecraft Christmas piece a neutral slug whatever precedes it', () => {
  expect(slugFor('DigitalAnythingMinecraftXmas.jpg')).toBe('digitalminecraftxmas')
  expect(slugFor('digitalcalcifer.jpg')).toBe('digitalcalcifer')
})
it('still applies the exact-name overrides', () => {
  expect(slugFor('TattooIdeaBrandi.jpg')).toBe('wrench-and-daisies')
})
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/art-slug.test.ts`. Expected: FAIL, `slugFor` is not exported.
- [ ] **Step 3: Implement `slugFor`**: move `SLUG_OVERRIDE` into `scripts/lib/artSlug.ts`, add `PATTERN_OVERRIDE: Array<{ match: RegExp; slug: string }>` with `{ match: /minecraft.?xmas/i, slug: 'digitalminecraftxmas' }`, and have `import-art.ts` call `slugFor`. Rename the image with `git mv` and rename its `artAlt` key.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, including the existing "every media src exists" tests.
- [ ] **Step 5: Verify** `git grep -il minecraftxmas` lists only the neutral name. Commit `fix(content): neutral file name for one art piece`.

### Task 3: The world's content model

**Model:** sonnet

**Files:**
- Modify: `content/types.ts`
- Create: `content/world.ts`, `content/sky.ts`, `content/onTheGo.ts`
- Test: `tests/unit/world/content.test.ts`

**Interfaces:**
- Produces, in `content/types.ts`:

```ts
export type DistrictId = 'works' | 'frenzy' | 'hours' | 'studio' | 'home'
export interface LatLon { lat: number; lon: number }
export interface District { id: DistrictId; name: string; blurb: string; color: string; center: LatLon; radius: number }
export type ModelKey = 'generic' | 'lighthouse' | 'towers' | 'signal-mast' | 'big-top' | 'civic' | 'construction'
  | 'studio' | 'playground' | 'billboard' | 'alley' | 'castle' | 'piggy-bank' | 'tattoo-shop'
  | 'easel' | 'drafting-table' | 'house' | 'flags' | 'mountain' | 'postbox'
export type CollectionItem = { project: string } | { name: string; summary: string }
export type PlaceContent =
  | { kind: 'project'; slug: string } | { kind: 'collection'; items: CollectionItem[] }
  | { kind: 'about' } | { kind: 'principles' } | { kind: 'gallery'; set: 'art' | 'tattoo' }
  | { kind: 'interests' } | { kind: 'contact' }
export interface Place {
  id: string; district: DistrictId; name: string; descriptor: string
  at: LatLon; model: ModelKey; height: number; content: PlaceContent
  weather?: 'rain'; poster?: string
}
export type Band = 'morning' | 'afternoon' | 'evening' | 'late'
export type Theme = 'day' | 'night'
export type LookKey = 'morning' | 'afternoon' | 'evening' | 'night'
export interface SkyLook {
  top: string; mid: string; bot: string; sunCol: string; shade: string; lit: string; rim: string; atmo: string
  cloudLit: string; cloudShade: string; deep: string; sea: string; shallow: string; glint: string; city: string
  sunK: number; moonK: number; star: number; rimK: number; sunY: number; glow: number
}
export interface Constellation { name: string; at: LatLon; points: Array<[number, number]>; lines: Array<[number, number]> }
```

- `content/world.ts` exports `districts: District[]`, `places: Place[]`, `tourOrder: string[]`, `placeById(id: string): Place | undefined`.
- `content/sky.ts` exports `looks: Record<LookKey, SkyLook>`, `greetings: Array<{ from: number; text: string }>`, `welcome: string`, `dayHours: { from: 6; to: 19 }`, `constellations: Constellation[]`.
- `content/onTheGo.ts` exports `onTheGo: CollectionItem[]`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/world/content.test.ts`:

```ts
it('has five districts and nineteen places', () => {
  expect(districts.map((d) => d.id)).toEqual(['works', 'frenzy', 'hours', 'studio', 'home'])
  const count = (id: string) => places.filter((p) => p.district === id).length
  expect([count('works'), count('frenzy'), count('hours'), count('studio'), count('home')]).toEqual([6, 4, 3, 2, 4])
})
it('gives every place a unique, URL-safe id', () => {
  const ids = places.map((p) => p.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
})
it('points every project place and collection item at a real project', () => {
  const slugs = new Set(projects.map((p) => p.slug))
  for (const p of places) {
    if (p.content.kind === 'project') expect(slugs.has(p.content.slug), p.id).toBe(true)
    if (p.content.kind === 'collection') for (const i of p.content.items) if ('project' in i) expect(slugs.has(i.project)).toBe(true)
  }
})
it('shows every project exactly once', () => {
  const shown = places.flatMap((p) => p.content.kind === 'project' ? [p.content.slug]
    : p.content.kind === 'collection' ? p.content.items.flatMap((i) => 'project' in i ? [i.project] : []) : [])
  expect([...shown].sort()).toEqual(projects.map((p) => p.slug).sort())
})
it('tours every place exactly once, starting at home and ending at the postbox', () => {
  expect([...tourOrder].sort()).toEqual(places.map((p) => p.id).sort())
  expect(tourOrder[0]).toBe('home'); expect(tourOrder[1]).toBe('three-things'); expect(tourOrder.at(-1)).toBe('post')
})
it('keeps the on-the-go list to exactly three', () => {
  expect(onTheGo).toEqual([{ project: 'paragon' }, { project: 'onboarding' },
    { name: 'Tech Processes', summary: 'CI/CD automation, SDLC SOPs, automations, KPI management, dashboard automation and more.' }])
})
it('keeps the four greetings and their hours', () => {
  expect(greetings).toEqual([{ from: 5, text: 'Morning.' }, { from: 12, text: 'Afternoon.' }, { from: 17, text: 'Evening.' }, { from: 22, text: 'Up late? So am I.' }])
})
it('defines a full look for each time of day', () => {
  const keys = Object.keys(looks.afternoon).sort()
  for (const k of ['morning', 'afternoon', 'evening', 'night'] as const) expect(Object.keys(looks[k]).sort()).toEqual(keys)
})
it('has the four constellations', () => {
  expect(constellations.map((c) => c.name)).toEqual(['The Crown', 'Jimothy Major', 'The Natural 20', 'The Pencil'])
})
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/world/content.test.ts`. Expected: FAIL, modules missing.
- [ ] **Step 3: Write the content.** Districts (name, blurb, colour, centre, radius):

| id | name | blurb | colour | centre | radius |
| --- | --- | --- | --- | --- | --- |
| works | The Works | What I build for a living | `#4C7DFF` | 20, -18 | 34 |
| frenzy | Tiny Frenzy | My one-person game studio | `#FF6FA3` | -8, 64 | 27 |
| hours | After Hours | Apps for people I love | `#FF9B54` | -28, -92 | 26 |
| studio | The Studio | Ink, paint and pixels | `#8B6CFF` | 44, 122 | 21 |
| home | Home | Everything else | `#2EC4B6` | -36, 166 | 27 |

Places, in tour order (id; name; descriptor; lat, lon; model; height; content):

| id | name | descriptor | at | model | height | content |
| --- | --- | --- | --- | --- | --- | --- |
| home | Home | About me | -31, 160 | house | 1.2 | about |
| three-things | Three things | How I work | -27, 173 | flags | 1.3 | principles |
| beacon | Beacon | Engineering operations platform | 33, -40 | lighthouse | 2.4 | project `beacon` |
| 403hq | 403HQ | Client portal | 24, -12 | towers | 2.3 | project `403hq` |
| aura | AURA | Accessibility, one script tag | 11, -30 | signal-mast | 2.2 | project `aura` |
| ruckus | Ruckus | Ten multiplayer games | 9, -9 | big-top | 1.5 | project `ruckus` |
| nbs-website | NBS Website | Company site, 66 pages rebuilt | 27, -27 | civic | 1.1 | project `nbs-website` |
| on-the-go | Also on the go | Under construction | 16, 2 | construction | 2.2 | collection `onTheGo` |
| tiny-frenzy-games | Tiny Frenzy Games | Studio site | -1, 60 | studio | 1.5 | project |
| eliminated | Eliminated | Party game, 2–8 players | -13, 53 | playground | 1.9 | project |
| eliminated-site | Eliminated — the website | Marketing site and press kit | -19, 67 | billboard | 1.7 | project; poster `/media/eliminated/hero.jpg` |
| jimothy-and-pidge | Jimothy & Pidge | Shenanigans in Seattle | -5, 74 | alley | 2.5 | project; weather `rain`; poster `/media/jimothy-and-pidge/hero.jpg` |
| kingdoms-and-crowns | Kingdoms & Crowns | Homeschool platform, new: the Realm | -24, -96 | castle | 2.3 | project |
| the-budget | The Budget | By pay period, not by month | -34, -104 | piggy-bank | 1.4 | project |
| ember-tattoo | Ember Tattoo | Studio site | -36, -80 | tattoo-shop | 1.5 | project |
| art | Art | Digital, pencil, ink and paint | 47, 116 | easel | 1.6 | gallery `art`; poster: one piece from `public/media/art/` |
| tattoo-designs | Tattoo designs | Drawn for people who got them | 40, 130 | drafting-table | 1.0 | gallery `tattoo`; poster `/media/tattoo/wrench-and-daisies.jpg` |
| off-the-clock | Off the clock | Everything that is not a screen | -44, 174 | mountain | 1.9 | interests |
| post | Send me a letter | Contact | -41, 153 | postbox | 1.0 | contact |

`content/sky.ts`: copy the four `LOOKS` rows from the look test verbatim into `looks`; copy the four constellation definitions (`name`, `at`, `p` → `points`, `l` → `lines`); `welcome = 'Come have a look around.'`.

- [ ] **Step 4: Run** `npx vitest run tests/unit/world/content.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): districts, places, tour and sky`.

---

## Phase 2: Pure logic

### Task 4: Sphere geometry and seeded randomness

**Model:** sonnet

**Files:**
- Create: `lib/world/geo.ts`, `lib/world/rng.ts`
- Test: `tests/unit/world/geo.test.ts`, `tests/unit/world/rng.test.ts`
- Modify: `package.json` (add `three`, `@types/three`)

**Interfaces:**
- Produces:

```ts
// geo.ts
export const D2R: number
export function dirOf(p: LatLon): Vector3            // unit vector; x = cos(lat)cos(lon), y = sin(lat), z = -cos(lat)sin(lon)
export function latLonOf(dir: Vector3): LatLon
export function angleDeg(a: Vector3, b: Vector3): number
export function formatCoord(p: LatLon): string       // "33°N 040°W"
export interface SurfaceFrame { up: Vector3; south: Vector3; east: Vector3 }
export function surfaceFrame(dir: Vector3): SurfaceFrame   // east = up × south
export function greatCircle(a: Vector3, b: Vector3, t: number): Vector3
// rng.ts
export const WORLD_SEED = 20261110
export function mulberry32(seed: number): () => number     // each call returns [0, 1)
export function noise3(x: number, y: number, z: number): number   // value noise in [-1, 1]
```

- [ ] **Step 1: Install** `npm install three && npm install -D @types/three`.
- [ ] **Step 2: Write the failing tests.**

```ts
it('maps latitude and longitude onto the sphere, east to the right', () => {
  const o = dirOf({ lat: 0, lon: 0 }); expect(o.x).toBeCloseTo(1); expect(o.y).toBeCloseTo(0); expect(o.z).toBeCloseTo(0)
  expect(dirOf({ lat: 90, lon: 0 }).y).toBeCloseTo(1)
  expect(dirOf({ lat: 0, lon: 90 }).z).toBeCloseTo(-1)
})
it('round-trips', () => { const p = latLonOf(dirOf({ lat: -31, lon: 160 })); expect(p.lat).toBeCloseTo(-31); expect(p.lon).toBeCloseTo(160) })
it('formats coordinates like a map', () => {
  expect(formatCoord({ lat: 33, lon: -40 })).toBe('33°N 040°W')
  expect(formatCoord({ lat: -5, lon: 74 })).toBe('5°S 074°E')
  expect(formatCoord({ lat: 0, lon: 0 })).toBe('0°N 000°E')
})
it('builds an orthonormal frame with south pointing down the globe', () => {
  const f = surfaceFrame(dirOf({ lat: 30, lon: 50 }))
  expect(f.up.dot(f.south)).toBeCloseTo(0); expect(f.up.dot(f.east)).toBeCloseTo(0); expect(f.south.y).toBeLessThan(0)
  expect(new Vector3().crossVectors(f.up, f.south).distanceTo(f.east)).toBeCloseTo(0)
})
it('walks the great circle', () => {
  const a = dirOf({ lat: 0, lon: 0 }), b = dirOf({ lat: 0, lon: 90 })
  expect(angleDeg(a, greatCircle(a, b, 0.5))).toBeCloseTo(45); expect(greatCircle(a, b, 1).distanceTo(b)).toBeCloseTo(0)
})
// rng
it('is the same sequence for the same seed', () => { const a = mulberry32(7), b = mulberry32(7); expect([a(), a(), a()]).toEqual([b(), b(), b()]) })
it('stays in range', () => { const r = mulberry32(WORLD_SEED); for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) } })
it('noise is deterministic and bounded', () => { expect(noise3(1.3, 2.7, -4.1)).toBe(noise3(1.3, 2.7, -4.1)); for (let i = 0; i < 200; i++) expect(Math.abs(noise3(i * 0.37, i * 0.11, i * 0.73))).toBeLessThanOrEqual(1) })
```

- [ ] **Step 3: Run** `npx vitest run tests/unit/world`. Expected: FAIL.
- [ ] **Step 4: Implement both modules.** `noise3` must be exactly this, because place positions were chosen against it:

```ts
const h3 = (x: number, y: number, z: number) => { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n) }
// trilinear interpolation of h3 at the eight lattice corners, with f = f*f*(3-2f) on each axis, scaled to [-1, 1]
```

`surfaceFrame`: north = normalize(Y − up·(up·Y)); south = −north; east = up × south.

- [ ] **Step 5: Run** the tests. Expected: PASS. **Commit** `feat(world): sphere geometry and seeded noise`.

### Task 5: Terrain

**Model:** sonnet

**Files:**
- Create: `lib/world/terrain.ts`
- Test: `tests/unit/world/terrain.test.ts`

**Interfaces:**
- Consumes: `dirOf`, `angleDeg`, `noise3`, `District`.
- Produces:

```ts
export const SHORE = 0.2
export function landValue(dir: Vector3, districts: District[]): { v: number; district: DistrictId }
export function isLand(dir: Vector3, districts: District[]): boolean      // v >= SHORE
export function heightAt(dir: Vector3, districts: District[]): number     // 0 at sea
```

- [ ] **Step 1: Write the failing tests.**

```ts
it('puts every district centre on land', () => { for (const d of districts) expect(isLand(dirOf(d.center), districts)).toBe(true) })
it('puts every place on land, clear of the shore', () => {
  for (const p of places) expect(landValue(dirOf(p.at), districts).v, p.id).toBeGreaterThanOrEqual(SHORE + 0.04)
})
it('assigns each place to its own district’s island', () => {
  for (const p of places) expect(landValue(dirOf(p.at), districts).district, p.id).toBe(p.district)
})
it('keeps places from crowding each other', () => {
  for (const a of places) for (const b of places) if (a.id < b.id) expect(angleDeg(dirOf(a.at), dirOf(b.at)), `${a.id}/${b.id}`).toBeGreaterThanOrEqual(9)
})
it('is sea between the islands and flat at sea level there', () => {
  const mid = dirOf({ lat: 0, lon: 25 }); expect(isLand(mid, districts)).toBe(false); expect(heightAt(mid, districts)).toBe(0)
})
it('raises land between 0.012 and 0.032', () => {
  for (const p of places) { const h = heightAt(dirOf(p.at), districts); expect(h).toBeGreaterThanOrEqual(0.012); expect(h).toBeLessThanOrEqual(0.032) }
})
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** For each district `v = 1 − angleDeg(dir, centre) / radius`; take the largest and remember whose it is; add `noise3(dir·3.3)·0.15 + noise3(dir·8.1)·0.05`. `heightAt` is `0` below `SHORE`, else `0.012 + 0.02·smoothstep(SHORE, 0.55, v)`.
- [ ] **Step 4: Run.** Expected: PASS. If a place fails the land or crowding test, move that place in `content/world.ts` toward its district centre by the smallest whole-degree step that passes, and note it in the commit message.
- [ ] **Step 5: Commit** `feat(world): seeded terrain`.

### Task 6: Time of day

**Model:** sonnet

**Files:**
- Create: `lib/world/time.ts`
- Delete: `components/rooms/greeting.ts`, `tests/unit/greeting.test.ts` (moved here)
- Test: `tests/unit/world/time.test.ts`

**Interfaces:**
- Produces:

```ts
export function bandOf(hour: number): Band
export function themeForHour(hour: number): Theme
export function lookFor(theme: Theme, band: Band): LookKey
export function greetingFor(hour: number): string
```

- [ ] **Step 1: Write the failing tests.**

```ts
it.each([[4, 'late'], [5, 'morning'], [11, 'morning'], [12, 'afternoon'], [16, 'afternoon'], [17, 'evening'], [21, 'evening'], [22, 'late'], [0, 'late'], [23, 'late']])('hour %i is %s', (h, b) => expect(bandOf(h)).toBe(b))
it.each([[5, 'night'], [6, 'day'], [18, 'day'], [19, 'night'], [0, 'night']])('hour %i is %s', (h, t) => expect(themeForHour(h)).toBe(t))
it('picks the sky for a theme and band', () => {
  expect(lookFor('night', 'morning')).toBe('night'); expect(lookFor('day', 'late')).toBe('afternoon')
  expect(lookFor('day', 'evening')).toBe('evening'); expect(lookFor('day', 'morning')).toBe('morning')
})
it('greets by the hour', () => {
  expect(greetingFor(9)).toBe('Morning.'); expect(greetingFor(14)).toBe('Afternoon.'); expect(greetingFor(18)).toBe('Evening.')
  expect(greetingFor(23)).toBe('Up late? So am I.'); expect(greetingFor(3)).toBe('Up late? So am I.')
})
it('survives hours it should never be given', () => { for (const h of [-1, 24, 99, NaN]) { expect(['day', 'night']).toContain(themeForHour(h)); expect(greetingFor(h)).toMatch(/\.$/) } })
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** from `greetings` and `dayHours` in `content/sky.ts`. Out-of-range or non-finite hours are treated as noon. Update the two old components that imported `greetingForHour` to import `greetingFor`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS. **Commit** `feat(world): time-of-day rules`.

### Task 7: Camera poses, flights and the tour

**Model:** opus

**Files:**
- Create: `lib/world/camera.ts`, `lib/world/tour.ts`, `lib/world/route.ts`
- Test: `tests/unit/world/camera.test.ts`, `tests/unit/world/tour.test.ts`, `tests/unit/world/route.test.ts`

**Interfaces:**
- Produces:

```ts
// camera.ts
export const MODEL_SCALE = 0.088                       // world units per model unit
export interface Pose { position: Vector3; quaternion: Quaternion; up: Vector3 }
export function overviewDistance(aspect: number): number          // max(4.5, 4.1 / min(1.25, aspect))
export function orbitPose(dir: Vector3, distance: number): Pose   // looks at the centre, world-up
export function focusPose(ground: Vector3, frame: SurfaceFrame, modelHeight: number, azimuth: number): Pose
export function flightAt(from: Pose, to: Pose, k: number): { position: Vector3; quaternion: Quaternion }
export function flightSeconds(from: Pose, to: Pose, reducedMotion: boolean): number   // 0 when reduced
export function easeInOutCubic(k: number): number
// tour.ts
export function tourIndex(id: string): number          // -1 if not on the tour
export function tourStep(id: string | null, delta: 1 | -1): string   // wraps; null starts at the first stop
// route.ts
export function placeHref(id: string): string          // "/places/beacon"
export function placeIdFromPath(pathname: string): string | null
export function districtHref(id: DistrictId): string   // "/?district=frenzy": the planet from space, turned to that island
export function districtFromSearch(search: string): DistrictId | null
```

- [ ] **Step 1: Write the failing tests.**

```ts
const forward = (p: Pose) => new Vector3(0, 0, -1).applyQuaternion(p.quaternion)
it('orbits looking at the centre', () => {
  const d = dirOf({ lat: 10, lon: 20 }), p = orbitPose(d, 4.5)
  expect(p.position.length()).toBeCloseTo(4.5); expect(forward(p).dot(d.clone().negate())).toBeCloseTo(1)
})
it('keeps the planet in frame on a narrow screen', () => { expect(overviewDistance(1.78)).toBeCloseTo(4.5); expect(overviewDistance(0.5)).toBeCloseTo(8.2) })
it('frames a place from the south, above the ground, looking at it', () => {
  for (const pl of places) {
    const d = dirOf(pl.at), f = surfaceFrame(d), ground = d.clone().multiplyScalar(1.02), p = focusPose(ground, f, pl.height, 0)
    expect(p.position.length(), pl.id).toBeGreaterThan(1.2)
    expect(p.position.clone().sub(ground).dot(f.south)).toBeGreaterThan(0)
    expect(forward(p).dot(ground.clone().sub(p.position).normalize())).toBeGreaterThan(0.9)
    expect(p.up.distanceTo(f.up)).toBeCloseTo(0)
  }
})
it('circles the place as azimuth changes', () => {
  const d = dirOf({ lat: 0, lon: 0 }), f = surfaceFrame(d), g = d.clone().multiplyScalar(1.02)
  expect(focusPose(g, f, 2, Math.PI).position.clone().sub(g).dot(f.south)).toBeLessThan(0)
})
it('flies from one pose to the other without passing through the planet', () => {
  for (const a of places) for (const b of places) {
    const from = focusPose(dirOf(a.at).multiplyScalar(1.02), surfaceFrame(dirOf(a.at)), a.height, 0)
    const to = focusPose(dirOf(b.at).multiplyScalar(1.02), surfaceFrame(dirOf(b.at)), b.height, 0)
    expect(flightAt(from, to, 0).position.distanceTo(from.position)).toBeCloseTo(0)
    expect(flightAt(from, to, 1).position.distanceTo(to.position)).toBeCloseTo(0)
    for (let k = 0; k <= 1; k += 0.05) expect(flightAt(from, to, k).position.length(), `${a.id}>${b.id}@${k}`).toBeGreaterThanOrEqual(1.2)
  }
})
it('can be restarted from any point mid-flight', () => {   // Review Focus 3
  const a = orbitPose(dirOf({ lat: 0, lon: 0 }), 4.5), b = orbitPose(dirOf({ lat: 0, lon: 170 }), 4.5)
  const mid = flightAt(a, b, 0.4), restart: Pose = { ...mid, up: new Vector3(0, 1, 0) }
  expect(flightAt(restart, a, 1).position.distanceTo(a.position)).toBeCloseTo(0)
})
it('does not animate under reduced motion', () => { const a = orbitPose(dirOf({ lat: 0, lon: 0 }), 4.5); expect(flightSeconds(a, a, true)).toBe(0); expect(flightSeconds(a, orbitPose(dirOf({ lat: 0, lon: 90 }), 4.5), false)).toBeGreaterThan(1) })
// tour
it('steps and wraps', () => { expect(tourStep(null, 1)).toBe('home'); expect(tourStep('home', 1)).toBe('three-things'); expect(tourStep('home', -1)).toBe('post'); expect(tourStep('post', 1)).toBe('home'); expect(tourStep('nope', 1)).toBe('home') })
// route
it('reads and writes place URLs', () => { expect(placeHref('beacon')).toBe('/places/beacon'); expect(placeIdFromPath('/places/beacon')).toBe('beacon'); expect(placeIdFromPath('/places/beacon/')).toBe('beacon'); expect(placeIdFromPath('/')).toBeNull(); expect(placeIdFromPath('/places/not-a-place')).toBeNull() })
it('reads and writes district links', () => { expect(districtHref('frenzy')).toBe('/?district=frenzy'); expect(districtFromSearch('?district=frenzy')).toBe('frenzy'); expect(districtFromSearch('?district=nope')).toBeNull(); expect(districtFromSearch('')).toBeNull() })
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `focusPose`: `h = modelHeight · MODEL_SCALE`; forward-on-ground `f = frame.south` rotated about `frame.up` by `azimuth`; position `= ground + up·(0.26 + 0.8h) + f·(0.5 + 2.2h)`; look at `ground + up·(0.55h)` with `up = frame.up`.
  - `flightAt`: ease `k`; slerp the direction from the centre; radius `= lerp(r0, r1, k) + sin(πk)·max(0, 1.7 + 0.55·angle − (r0 + r1)/2)`; slerp the quaternions.
  - `flightSeconds`: `0` if reduced, else `1.1 + 0.5·angle` (radians between the two directions), capped at `2.4`.
- [ ] **Step 4: Run.** Expected: PASS. **Commit** `feat(world): camera poses, flights, tour and routes`.

---

## Phase 3: The site without 3D

At the end of this phase the new site is complete and navigable as HTML, with a sky-coloured background where the planet will be.

### Task 8: Tokens, fonts and the day/night theme

**Model:** sonnet

**Files:**
- Modify: `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `lib/theme.ts`, `tests/unit/theme.test.ts`
- Create: `components/hud/ThemeProvider.tsx`, `components/hud/ThemeToggle.tsx`, `components/hud/Greeting.tsx`
- Test: `tests/unit/hud/ThemeToggle.test.tsx`, `tests/unit/hud/Greeting.test.tsx`

**Interfaces:**
- Produces:

```ts
// lib/theme.ts
export const THEME_STORAGE_KEY = 'kym-theme'                       // sessionStorage: lasts for the visit
export function resolveTheme(opts: { stored: Theme | null; hour: number }): Theme
export function getStoredTheme(): Theme | null                     // null on the server or if storage throws
export function persistTheme(theme: Theme): void                   // never throws
export function themeInitScript(): string                          // sets data-theme and data-js on <html> before paint
// ThemeProvider.tsx
export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element
export function useTheme(): { theme: Theme; band: Band; look: LookKey; setTheme(t: Theme): void }
```

- Design tokens as CSS variables on `:root` (day) and `[data-theme='night']`: `--ink`, `--muted`, `--on-ink`, `--glass`, `--edge`, `--line`, `--shadow`, `--accent`, with the values from the look test's `<style>` block. Tailwind colours `ink`, `muted`, `on-ink`, `glass`, `edge`, `line`, `accent` map to them. Fonts: `font-display` Bricolage Grotesque, `font-sans` DM Sans, `font-mono` DM Mono, all via `next/font/google`. A `.glass` component class carries the frosted panel style.

- [ ] **Step 1: Rewrite `tests/unit/theme.test.ts` and add the component tests.**

```ts
it('lets an explicit choice win', () => { expect(resolveTheme({ stored: 'night', hour: 12 })).toBe('night'); expect(resolveTheme({ stored: 'day', hour: 23 })).toBe('day') })
it('follows the clock otherwise', () => { expect(resolveTheme({ stored: null, hour: 12 })).toBe('day'); expect(resolveTheme({ stored: null, hour: 23 })).toBe('night') })
it('reads sessionStorage, never localStorage, and defaults to day on error', () => {
  const s = themeInitScript(); expect(s).toContain("sessionStorage.getItem('kym-theme')"); expect(s).not.toContain('localStorage'); expect(s).toContain("'day'")
})
it('does not throw when storage is blocked', () => {      // Review Focus 1
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
  expect(getStoredTheme()).toBeNull(); expect(() => persistTheme('night')).not.toThrow()
})
// ThemeToggle: renders "Night" in day and "Day" in night; clicking calls setTheme with the other; has an accessible name "Switch to night"/"Switch to day"
// Greeting: with the clock faked to 23:00 renders "Up late? So am I." and "Come have a look around."; on first render (before the effect) renders only the welcome line
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The init script reads the stored choice, falls back to `new Date().getHours()` through the same day hours (6–18), and on any error sets `day`. `ThemeProvider` resolves the hour once on mount, so the band does not change mid-visit. Replace the four old font imports in `app/layout.tsx`. Delete `components/primitives/ThemeToggle.tsx` and point the old `Nav` at the new toggle. Keep the old site compiling: map the old Tailwind colour names (`surface`, `fg`, `fg-muted`, `rule`, and the rest) onto the new tokens so retired components still build until Task 10 deletes them.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS. **Commit** `feat(ui): day and night theme, new tokens and type`.

### Task 9: Pages, header, index, legend and tour bar

**Model:** sonnet

**Files:**
- Create: `app/(world)/layout.tsx`, `app/(world)/page.tsx`, `app/(world)/places/[id]/page.tsx`, `app/(world)/places/[id]/not-found.tsx`
- Create: `components/hud/Header.tsx`, `Frame.tsx`, `IndexList.tsx`, `Legend.tsx`, `TourBar.tsx`, `PanelShell.tsx`, `SkyBackdrop.tsx`
- Move: `app/page.tsx` → deleted (the route group's page replaces it)
- Test: `tests/unit/hud/IndexList.test.tsx`, `tests/unit/hud/TourBar.test.tsx`, `tests/unit/hud/Legend.test.tsx`, `tests/e2e/places.spec.ts`

**Interfaces:**
- Consumes: `districts`, `places`, `tourOrder`, `placeById`, `placeHref`, `tourStep`, `tourIndex`, `formatCoord`, `useTheme`.
- Produces:

```tsx
export function Header({ home }: { home: boolean })                 // wordmark is the <h1> only when home
export function IndexList({ districts, places, tourOrder }: {...})  // <nav id="index" aria-label="Every place">
export function Legend({ districts, places }: {...})
export function TourBar({ placeId }: { placeId: string })           // previous / "03 / 19 · Beacon" / next, as links
export function PanelShell({ place, district, children }: {...})    // <article>; district chip, coordinates, close link to "/"
export function SkyBackdrop()                                       // CSS gradient per look; replaced visually by the canvas in Task 11
```

- `app/(world)/layout.tsx` wraps children in `ThemeProvider` and renders `SkyBackdrop` and `Frame`. The canvas mounts here in Task 11.
- `/places/[id]` uses `generateStaticParams` over `places`, `dynamicParams = false`, and `generateMetadata` returning the place name as title, its descriptor (or the project headline) as description, and the project hero as the share image when there is one. The panel body is a placeholder paragraph with the descriptor until Task 10.

- [ ] **Step 1: Write the failing component tests.**

```tsx
// IndexList
it('links every place under its district, numbered in tour order', () => {
  render(<IndexList districts={districts} places={places} tourOrder={tourOrder} />)
  expect(screen.getAllByRole('link')).toHaveLength(19)
  expect(screen.getByRole('link', { name: /03\s*Beacon/ })).toHaveAttribute('href', '/places/beacon')
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['The Works', 'Tiny Frenzy', 'After Hours', 'The Studio', 'Home'])
})
// TourBar
it('shows where you are and links both ways, wrapping at the ends', () => {
  render(<TourBar placeId="home" />)
  expect(screen.getByText('01 / 19 · Home')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Next place' })).toHaveAttribute('href', '/places/three-things')
  expect(screen.getByRole('link', { name: 'Previous place' })).toHaveAttribute('href', '/places/post')
})
// Legend
it('lists the five districts with their counts', () => {
  render(<Legend districts={districts} places={places} />)
  expect(screen.getByRole('link', { name: /The Works/ })).toHaveAttribute('href', '/?district=works'); expect(screen.getByText(/06/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Write the failing end-to-end tests** in `tests/e2e/places.spec.ts`:

```ts
test('the home page names her and lists every place', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kylee McCarthy')
  await expect(page.getByText('There’s always a better way, and I enjoy trying to find it.')).toBeVisible()
  await page.getByRole('button', { name: 'Index' }).click()
  await expect(page.locator('#index a')).toHaveCount(19)
})
test('a place opens from the index, has its own heading, and the back button returns', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Index' }).click()
  await page.getByRole('link', { name: /Beacon/ }).click()
  await expect(page).toHaveURL('/places/beacon'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beacon')
  await expect(page.getByText('33°N 040°W')).toBeVisible()
  await page.goBack(); await expect(page).toHaveURL('/')
})
test('a place URL loads directly and the tour steps from it', async ({ page }) => {
  await page.goto('/places/home'); await page.getByRole('link', { name: 'Next place' }).click()
  await expect(page).toHaveURL('/places/three-things'); await page.keyboard.press('ArrowLeft'); await expect(page).toHaveURL('/places/home')
  await page.keyboard.press('Escape'); await expect(page).toHaveURL('/')
})
test('an unknown place is a 404', async ({ page }) => { expect((await page.goto('/places/nope'))?.status()).toBe(404) })
test('the sky and the greeting follow the visitor’s clock, and the button overrides it for the visit', async ({ page }) => {   // Review Focus 1
  await page.clock.setFixedTime(new Date('2026-11-10T23:10:00')); await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night'); await expect(page.getByText('Up late? So am I.')).toBeVisible()
  await page.getByRole('button', { name: 'Switch to day' }).click(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  await page.goto('/places/beacon'); await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
})
test('at half past five it is still night, and the greeting is already Morning', async ({ page }) => {                          // Review Focus 1
  await page.clock.setFixedTime(new Date('2026-11-10T05:30:00')); await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night'); await expect(page.getByText('Morning.')).toBeVisible()
})
test('the index is readable without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false }); const page = await ctx.newPage()
  await page.goto('/'); await expect(page.locator('#index a').first()).toBeVisible(); await expect(page.locator('#index a')).toHaveCount(19); await ctx.close()
})
test('on a phone the panel leaves the tour controls reachable', async ({ page }) => {      // Review Focus 4; runs in the "mobile" project
  await page.goto('/places/eliminated')
  const next = page.getByRole('link', { name: 'Next place' }); await expect(next).toBeVisible(); await next.click(); await expect(page).toHaveURL('/places/eliminated-site')
})
```

- [ ] **Step 3: Run** the unit tests, then `npx playwright test tests/e2e/places.spec.ts`. Expected: FAIL.
- [ ] **Step 4: Implement** the pages and components. The index is always in the HTML; when `data-js` is set it is a drawer opened by the "Index" button or by `#index` in the URL, otherwise it is shown in place. Arrow keys and Escape on a place page navigate with the router. Use the look test's HUD markup and spacing as the layout reference; at widths under 820px the panel is a bottom sheet no taller than 58vh and the tour bar sits above it.
- [ ] **Step 5: Run** unit and e2e. Expected: PASS. **Commit** `feat(site): planet pages, index, legend and tour`.

### Task 10: Panels, redirects, security headers, and retiring the old site

**Model:** sonnet

**Files:**
- Create: `components/panels/registry.tsx`, `ProjectPanel.tsx`, `CollectionPanel.tsx`, `AboutPanel.tsx`, `PrinciplesPanel.tsx`, `GalleryPanel.tsx`, `InterestsPanel.tsx`, `ContactPanel.tsx`
- Create: `content/about.ts`, `content/principles.ts`, `content/art.ts`, `content/interests.ts` (moved out of `journey.ts`, `rooms.ts`, `room.ts`)
- Modify: `next.config.mjs`, `app/sitemap.ts`, `app/opengraph-image.tsx`, `app/icon.tsx`, `content/contact.ts`, `content/nav.ts`, `.github/workflows/ci.yml`, `scripts/import-art.ts` (new import path for alt text), restyle `components/media/Gallery.tsx`, `components/primitives/Modal.tsx`, `components/sections/ContactForm.tsx`, `components/media/Portrait.tsx`, `components/sections/GrowthBars.tsx`, `components/primitives/StackChips.tsx`
- Delete: `app/about`, `app/work`, `app/connect`, `app/room`; `components/journey`, `components/room`, `components/rooms`, `components/SectionPage.tsx`, `components/ProjectDetails.tsx`, `components/media/{Backdrop,BackgroundShapes,ProjectPages,ProjectVisual}.tsx`, `components/sections/{Journey,Nav,Footer,Contact}.tsx`, `components/primitives/{NameLogo,Reveal,CTA,Section,Container,CountUp,Figure}.tsx` where nothing still imports them; `content/{journey,rooms,room,hero}.ts` once moved; `public/media/backdrop/`; `app/_assets/GiveYouGlory.ttf`; every test of a deleted file; `tests/e2e/{home,room,rooms,room-controls,footer,work-media,smoke}.spec.ts`
- Test: `tests/unit/panels/*.test.tsx`, `tests/e2e/{redirects,a11y,contact,security}.spec.ts`

**Interfaces:**
- Consumes: `Place`, `PlaceContent`, `projects`, `caseStudies`, `onTheGo`, existing `Gallery`, `Modal`, `ContactForm`, `Portrait`, `GrowthBars`, `StackChips`, `groupArt`.
- Produces: `export function PlacePanelBody({ place }: { place: Place }): JSX.Element`, backed by `PANELS: { [K in PlaceContent['kind']]: ComponentType<{ place: Place; content: Extract<PlaceContent, { kind: K }> }> }`. `/places/[id]` renders it inside `PanelShell`.

- [ ] **Step 1: Write the failing panel tests**, one file per kind. Assertions:
  - **project** (`eliminated`): headline `A wholesome party game where everyone dies.`; hero image with non-empty alt; status reads `Coming soon to Steam`; chips `Unity 6`, `C#`; no "Visit" link. (`the-budget`): link named `Try the demo` with the demo `href`, `target="_blank"`, `rel="noopener noreferrer"`. (`beacon`): the placard text "The part I’d warn someone about" and its `hard` copy. (`jimothy-and-pidge`): no empty "problem" block.
  - **project with nothing optional** (Review Focus 5): rendering `PlacePanelBody` for a synthetic place `{ model: 'generic', content: { kind: 'project', slug } }` whose project has no media, no stack, no problem, no liveUrl and no case study renders the name and `built`, and no `img`, no empty list and no link.
  - **collection**: exactly three items in order `Paragon`, `Onboarding`, `Tech Processes`; the third shows its summary.
  - **about**: portrait alt `Portrait of Kylee McCarthy`; the five milestone titles; the three growth values 40, 130, 200; both degrees; a résumé link to `/Kylee-McCarthy-Resume.pdf`.
  - **principles**: `Keep moving`, `Nothing is sacred`, `AI is a tool, not the problem`.
  - **gallery** (`art`): six medium headings from `groupArt`; every image has alt text. (`tattoo`): five images.
  - **interests**: the seven existing titles.
  - **contact**: a form with name, email and message fields and the hint `It goes straight to my inbox and I reply myself.`
- [ ] **Step 2: Write the failing end-to-end tests.**

```ts
// redirects.spec.ts
for (const [from, to] of [['/about', '/places/home'], ['/connect', '/places/post'], ['/room', '/places/art'], ['/work', '/#index']])
  test(`${from} redirects`, async ({ page }) => { await page.goto(from); await expect(page).toHaveURL(to) })
// security.spec.ts
test('sends the security headers', async ({ request }) => {
  const h = (await request.get('/')).headers()
  expect(h['content-security-policy']).toContain("default-src 'self'"); expect(h['content-security-policy']).toContain("object-src 'none'")
  expect(h['content-security-policy']).toContain('challenges.cloudflare.com'); expect(h['x-content-type-options']).toBe('nosniff')
})
test('nothing on the page is blocked by the policy', async ({ page }) => {
  const blocked: string[] = []; page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) blocked.push(m.text()) })
  await page.goto('/places/post'); await page.waitForTimeout(2500); expect(blocked).toEqual([])
})
// a11y.spec.ts: rewrite ROUTES to ['/', '/places/beacon', '/places/on-the-go', '/places/home', '/places/three-things', '/places/art', '/places/off-the-clock', '/places/post'];
//   set the theme with sessionStorage 'kym-theme' = 'day' | 'night'; keep the axe tags and the Turnstile exclusion; drop the 1800ms reveal wait.
//   Also scan '/' with the clock fixed at 09:00, 14:00, 18:00 and 23:00 and no stored theme, so all four skies are checked for contrast.
// contact.spec.ts: same assertions as today, starting from /places/post.
```

- [ ] **Step 3: Run.** Expected: FAIL.
- [ ] **Step 4: Implement the panels and move the content.** Copy moves verbatim; nothing is reworded. `ProjectPanel` shows, in order: name (the page's `h1`, supplied by `PanelShell`), descriptor, hero, headline, problem if present, built, outcome if present, facts if present, placard if a case study exists, gallery if present, chips, status (`statusLabel` or the status word), link. The link label is `Try the demo` for `the-budget` and `Visit` otherwise.
- [ ] **Step 5: Add redirects and headers** in `next.config.mjs` (four permanent redirects; a `Content-Security-Policy` allowing the site itself, Turnstile's script and frame, Vercel analytics, `data:` and `blob:` images, `blob:` workers, inline styles; plus `Permissions-Policy` denying camera, microphone and geolocation). Update `sitemap.ts` to list `/` and every `/places/[id]`. Restyle `opengraph-image.tsx` and `icon.tsx` to the new type and the afternoon sky colours. Add `npm audit --omit=dev --audit-level=high` to CI after `npm ci`.
- [ ] **Step 6: Delete the retired files** listed above. Remove `category` and `ProjectCategory` from the types if nothing reads them. Remove the old colour aliases added in Task 8.
- [ ] **Step 7: Run** `npm run typecheck && npm run lint && npm test && npm run test:e2e`. Expected: PASS, with no reference left to a deleted file (`git grep -n "components/rooms\|components/journey\|content/rooms"` prints nothing).
- [ ] **Step 8: Commit** `feat(site): panels, redirects and headers; retire the house`.

---

## Phase 4: The world

Every task in this phase ends with the builder comparing screenshots (day, evening and night, from space and at Beacon) against the look test, in addition to the automated tests.

### Task 11: The canvas, the sky and the fallbacks

**Model:** opus

**Files:**
- Create: `lib/world/quality.ts`, `lib/world/look.ts`, `components/world/WorldLoader.tsx`, `WorldCanvas.tsx`, `Poster.tsx`, `lookUniforms.ts`, `LookDriver.tsx`, `SkyDome.tsx`, `Effects.tsx`
- Modify: `app/(world)/layout.tsx`, `package.json` (add `@react-three/fiber`)
- Test: `tests/unit/world/quality.test.ts`, `tests/unit/world/look.test.ts`, `tests/e2e/world.spec.ts`, `tests/e2e/fallback.spec.ts`

**Interfaces:**
- Produces:

```ts
// quality.ts
export type Quality = 'high' | 'low'
export function pickQuality(env: { saveData: boolean; deviceMemory?: number; cores?: number; width: number }): Quality
export function shouldDowngrade(frameMs: number[]): boolean        // true when the mean of at least 120 samples exceeds 28
// look.ts
export interface LookState { colors: Record<string, Color>; numbers: Record<string, number> }
export function toLookState(look: SkyLook): LookState
export function easeLook(current: LookState, goal: LookState, k: number): void     // mutates current
// components
export function WorldLoader(props: { districts: District[]; places: Place[]; tourOrder: string[] }): JSX.Element
export interface WorldProps { districts: District[]; places: Place[]; quality: Quality; reducedMotion: boolean }
```

- `WorldLoader` (client) shows `Poster`, checks WebGL, then loads `WorldCanvas` with `next/dynamic` (`ssr: false`) once the page is idle. An error boundary and a `webglcontextlost` listener both fall back to `Poster`. The canvas is `aria-hidden` and sits behind the page content.
- `lookUniforms.ts` exports the shared uniform objects every material reads; `LookDriver` eases them toward `looks[look]` each frame (instantly on first frame and under reduced motion).
- `Effects` runs three's `EffectComposer` with `RenderPass`, `UnrealBloomPass(strength 0.36, radius 0.8, threshold 1.0)` and `OutputPass` on a half-float, 4× multisampled target; it is skipped at `low` quality.

- [ ] **Step 1: Install** `npm install @react-three/fiber@^9`.
- [ ] **Step 2: Write the failing unit tests.**

```ts
it('chooses low quality for data savers, weak devices and phones', () => {
  expect(pickQuality({ saveData: true, width: 1440 })).toBe('low'); expect(pickQuality({ saveData: false, deviceMemory: 2, width: 1440 })).toBe('low')
  expect(pickQuality({ saveData: false, cores: 2, width: 1440 })).toBe('low'); expect(pickQuality({ saveData: false, width: 390 })).toBe('low')
  expect(pickQuality({ saveData: false, deviceMemory: 8, cores: 8, width: 1440 })).toBe('high'); expect(pickQuality({ saveData: false, width: 1440 })).toBe('high')
})
it('downgrades only on sustained slow frames', () => {
  expect(shouldDowngrade(Array(119).fill(40))).toBe(false); expect(shouldDowngrade(Array(120).fill(40))).toBe(true); expect(shouldDowngrade(Array(120).fill(16))).toBe(false)
})
it('eases every colour and number toward the goal', () => {
  const a = toLookState(looks.afternoon), b = toLookState(looks.night), before = a.colors.top.getHex()
  easeLook(a, b, 0); expect(a.colors.top.getHex()).toBe(before)
  easeLook(a, b, 1); expect(a.colors.top.getHex()).toBe(b.colors.top.getHex()); expect(a.numbers.star).toBe(1)
})
```

- [ ] **Step 3: Write the failing end-to-end tests.**

```ts
// world.spec.ts
test('the planet renders without errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/'); await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 }); await page.waitForTimeout(3000)
  await page.goto('/places/beacon'); await page.waitForTimeout(3000); expect(errors).toEqual([])
})
// fallback.spec.ts
test('without WebGL the picture stands in and the site still works', async ({ page }) => {     // Review Focus 2
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null })
  await page.goto('/places/eliminated'); await expect(page.getByTestId('world-poster')).toBeVisible(); await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eliminated'); await page.getByRole('link', { name: 'Next place' }).click(); await expect(page).toHaveURL('/places/eliminated-site')
})
test('losing the graphics context mid-visit falls back to the picture', async ({ page }) => {   // Review Focus 2
  await page.goto('/'); await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await page.evaluate(() => document.querySelector('canvas')!.dispatchEvent(new Event('webglcontextlost')))
  await expect(page.getByTestId('world-poster')).toBeVisible(); await page.getByRole('button', { name: 'Index' }).click(); await expect(page.locator('#index a')).toHaveCount(19)
})
test('the panel is readable before the 3D code arrives', async ({ page }) => {                  // Review Focus 2
  await page.route('**/_next/static/chunks/**', async (route) => { if (/three|world/i.test(route.request().url())) await new Promise((r) => setTimeout(r, 4000)); await route.continue() })
  await page.goto('/places/beacon'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beacon')
})
test('reduced motion runs clean', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' }), page = await ctx.newPage(), errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message)); await page.goto('/places/beacon'); await page.waitForTimeout(2500); expect(errors).toEqual([]); await ctx.close()
})
```

- [ ] **Step 4: Run.** Expected: FAIL.
- [ ] **Step 5: Implement.** Port the look test's sky-dome fragment shader as it stands (gradient, sun disc and halo and rays, crescent moon, shooting star), keeping its guards against invalid `pow` and reversed `smoothstep`. `Poster` shows the CSS sky gradient for now and gains the planet picture in Task 18. Shooting stars fire every 2.5 to 7 seconds at night and never under reduced motion.
- [ ] **Step 6: Run** unit and e2e. Expected: PASS. Compare the empty sky, day, evening and night, with the look test.
- [ ] **Step 7: Commit** `feat(world): canvas, sky dome, bloom and fallbacks`.

### Task 12: The planet

**Model:** opus

**Files:**
- Create: `components/world/materials.ts`, `Planet.tsx` (Land, Sea, Atmosphere, Graticule), `lib/world/landMesh.ts`
- Test: `tests/unit/world/landMesh.test.ts`

**Interfaces:**
- Consumes: `landValue`, `heightAt`, `SHORE`, `noise3`, `lookUniforms`.
- Produces:

```ts
// landMesh.ts (pure): given unit directions, the displaced radius and the colour for each
export function landRadius(dir: Vector3, districts: District[]): number   // 1 + heightAt on land; dips to 0.946 offshore
export function landColor(dir: Vector3, districts: District[], out: Color): Color
// materials.ts
export function celMaterial(opts: { color?: string; vertexColors?: boolean }, variant?: 'default' | 'land'): MeshToonMaterial   // cached per (color, variant)
export const outlineMaterial: MeshBasicMaterial                            // #2A2352, back side
export function glowMaterial(color: string): MeshBasicMaterial             // brightens with the look's `glow`
```

- [ ] **Step 1: Write the failing tests.**

```ts
it('lifts land above the sea and sinks the sea floor below it', () => {
  for (const p of places) expect(landRadius(dirOf(p.at), districts)).toBeGreaterThan(1.01)
  const sea = landRadius(dirOf({ lat: 0, lon: 25 }), districts); expect(sea).toBeLessThan(1); expect(sea).toBeGreaterThanOrEqual(0.946)
})
it('sits a landmark exactly on the ground', () => { for (const p of places) expect(landRadius(dirOf(p.at), districts)).toBeCloseTo(1 + heightAt(dirOf(p.at), districts), 6) })
it('paints the middle of every island green', () => {
  for (const d of districts) { const c = landColor(dirOf(d.center), districts, new Color()); expect(c.g, d.id).toBeGreaterThan(c.r); expect(c.g, d.id).toBeGreaterThan(c.b) }
})
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Port from the look test: the land mesh (icosphere, detail 56, smooth vertex colours, sphere normals), the sea shader (depth bands, surf rings, cel light, glitter, rim), the atmosphere shell (radius 1.17) and the white graticule at 30° steps. `celMaterial` is the look test's `cel()`: an 8-texel gradient map `[0,0,0,0,150,255,255,255]`, the rim term, and for `land` the painted-grass patches. Time the mesh build with `performance.now()`; if it exceeds 200 ms on the development machine, compute it in a Web Worker and transfer the buffers.
- [ ] **Step 4: Run** tests and `npx playwright test tests/e2e/world.spec.ts`. Expected: PASS. Compare with the look test.
- [ ] **Step 5: Commit** `feat(world): land, sea and atmosphere`.

### Task 13: The camera rig

**Model:** opus

**Files:**
- Create: `components/world/CameraRig.tsx`, `lib/world/rig.ts`
- Test: `tests/unit/world/rig.test.ts`, extend `tests/e2e/places.spec.ts`

**Interfaces:**
- Consumes: `orbitPose`, `focusPose`, `flightAt`, `flightSeconds`, `overviewDistance`, `placeIdFromPath`, `usePathname`, `useRouter`.
- Produces, in `lib/world/rig.ts`, the rig's decisions as a pure reducer so they can be tested without a canvas:

```ts
export type RigMode = 'orbit' | 'fly' | 'focus'
export interface RigState { mode: RigMode; target: string | null; flight: { from: Pose; to: Pose; elapsed: number; seconds: number } | null; azimuth: number }
export type RigEvent = { type: 'route'; placeId: string | null; current: Pose; goal: Pose; seconds: number } | { type: 'tick'; dt: number } | { type: 'drag'; dx: number } | { type: 'touch' }
export function rigReduce(state: RigState, event: RigEvent): RigState
export function rigPose(state: RigState): { position: Vector3; quaternion: Quaternion } | null   // null in orbit: the controls own the camera
```

- [ ] **Step 1: Write the failing tests.**

```ts
it('flies when the route changes and lands in focus on that place', () => {
  let s = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 2 }); expect(s.mode).toBe('fly')
  s = rigReduce(s, { type: 'tick', dt: 2.1 }); expect(s.mode).toBe('focus'); expect(s.target).toBe('beacon')
})
it('follows the latest route when clicked again mid-flight', () => {       // Review Focus 3
  let s = rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 2 }); s = rigReduce(s, { type: 'tick', dt: 0.5 })
  const mid = rigPose(s)!; s = rigReduce(s, { type: 'route', placeId: 'aura', current: { ...mid, up: a.up }, goal: c, seconds: 2 })
  for (let i = 0; i < 40; i++) s = rigReduce(s, { type: 'tick', dt: 0.1 })
  expect(s.mode).toBe('focus'); expect(s.target).toBe('aura'); expect(rigPose(s)!.position.distanceTo(c.position)).toBeCloseTo(0)
})
it('returns to orbit when the route goes home', () => { /* route placeId null → fly → tick past the end → mode 'orbit', target null */ })
it('cuts instantly when the flight has no duration', () => { expect(rigReduce(start, { type: 'route', placeId: 'beacon', current: a, goal: b, seconds: 0 }).mode).toBe('focus') })
it('circles the place on drag only while in focus', () => { /* drag changes azimuth in focus; ignored in orbit and fly */ })
it('clamps a long frame so a background tab does not teleport the camera', () => { /* tick dt 30 behaves as tick dt 0.1 */ })
```

Add to `tests/e2e/places.spec.ts`:

```ts
test('hammering next on the tour ends on the place the URL names', async ({ page }) => {    // Review Focus 3
  await page.goto('/places/home'); await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL('/places/ruckus'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ruckus')
})
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** On `/?district=[id]` the rig flies, still in orbit mode, to `orbitPose(dirOf({ lat: centre.lat − 9, lon: centre.lon }), 2.75)`. In orbit, three's `OrbitControls` own the camera: no pan, damping 0.08, distance 2.1 to overview + 2.5, auto-rotate at 0.55 that stops on touch and resumes after 9 idle seconds (never under reduced motion). On a place, the view shifts 215px left on wide screens so the landmark is not under the panel (`camera.setViewOffset`). Scrolling out while in focus navigates to `/`. Clicking the planet's empty sea does nothing.
- [ ] **Step 4: Run** unit and e2e. Expected: PASS. **Commit** `feat(world): camera rig driven by the URL`.

### Task 14: Labels and picking

**Model:** opus

**Files:**
- Create: `lib/world/labels.ts`, `components/world/LabelProjector.tsx`, `components/hud/Labels.tsx`, `components/world/Places.tsx`, `components/world/models/GenericModel.tsx`, `components/world/models/registry.ts`
- Test: `tests/unit/world/labels.test.ts`, `tests/unit/world/registry.test.ts`, extend `tests/e2e/world.spec.ts`

**Interfaces:**
- Produces:

```ts
// labels.ts
export function isOccluded(camera: Vector3, anchor: Vector3, radius?: number): boolean   // default radius 0.992
export function labelTier(distance: number, focused: boolean): 'district' | 'place'      // 'place' when focused or distance < 3.25
export function placeAnchor(place: Place, districts: District[]): Vector3                // above the landmark's top
// registry.ts
export interface ModelProps { place: Place; district: District }
export const MODELS: Record<ModelKey, ComponentType<ModelProps>>
export function modelFor(key: ModelKey): ComponentType<ModelProps>                       // falls back to GenericModel
```

- `Labels` renders, outside the canvas, one `<a href="/places/[id]" id="label-[id]">` per place and one link per district (`districtHref`). `LabelProjector` also writes the map readout in `Frame` each frame: the point under the camera from `formatCoord`, and the zoom as `overview ÷ distance` to one decimal, as in `View 8°N 006°W · 1.0×`. `LabelProjector` runs inside the canvas and writes each label's transform and visibility every frame.
- `Places` renders each place's model on the ground at its position, facing south, at `MODEL_SCALE`, with an invisible hit sphere. Clicking it navigates; hovering sets a `data-hot` attribute on its label and a pointer cursor. The planet stops pointer events from reaching places behind it.
- For this task every key in `MODELS` maps to `GenericModel`: a rounded building in the district colour with a roof and two lit windows.

- [ ] **Step 1: Write the failing tests.**

```ts
it('hides labels behind the planet and shows those in front', () => {
  const cam = new Vector3(4.5, 0, 0); expect(isOccluded(cam, new Vector3(1.1, 0, 0))).toBe(false); expect(isOccluded(cam, new Vector3(-1.1, 0, 0))).toBe(true)
  expect(isOccluded(cam, new Vector3(0, 1.1, 0))).toBe(false)
})
it('shows districts from afar and places up close', () => { expect(labelTier(4.5, false)).toBe('district'); expect(labelTier(3.0, false)).toBe('place'); expect(labelTier(4.5, true)).toBe('place') })
it('anchors a label above its landmark', () => { for (const p of places) expect(placeAnchor(p, districts).length()).toBeGreaterThan(1 + p.height * MODEL_SCALE) })
// registry
it('has a model for every key and every place', () => {            // Review Focus 5
  for (const p of places) expect(MODELS[p.model], p.id).toBeTypeOf('function')
  expect(modelFor('generic')).toBe(MODELS.generic); expect(modelFor('nonsense' as ModelKey)).toBe(MODELS.generic)
})
```

Add to `tests/e2e/world.spec.ts`:

```ts
test('labels track the planet through a resize', async ({ page }) => {      // Review Focus 4
  await page.goto('/places/beacon'); await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 }); await page.waitForTimeout(3500)
  const vis = async () => (await page.locator('#labels a:visible').count())
  expect(await vis()).toBeGreaterThan(0); await page.setViewportSize({ width: 700, height: 900 }); await page.waitForTimeout(800)
  for (const box of await page.locator('#labels a:visible').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left))) expect(box).toBeLessThan(700)
})
test('clicking a visible label flies there', async ({ page }) => {
  await page.goto('/places/beacon'); await page.waitForTimeout(3500); const other = page.locator('#labels a:visible').first(); const href = await other.getAttribute('href')
  await other.click(); await expect(page).toHaveURL(href!)
})
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Labels on the hidden side are `visibility: hidden` so they leave the tab order. From afar, places show only as dots. Label styling follows the look test's `.lm` rules.
- [ ] **Step 4: Run** unit and e2e. Expected: PASS. **Commit** `feat(world): places, labels and picking`.

### Task 15: Stars, constellations, comet and far clouds

**Model:** opus

**Files:**
- Create: `lib/world/starfield.ts`, `components/world/NightSky.tsx`, `components/world/Clouds.tsx`
- Test: `tests/unit/world/starfield.test.ts`

**Interfaces:**
- Produces:

```ts
export interface StarField { positions: Float32Array; colors: Float32Array; sizes: Float32Array; phases: Float32Array }
export function buildStarField(seed: number, quality: Quality): StarField       // high: 1700 scattered + 2600 band + 150 dust; low: half of each
export function constellationPoints(c: Constellation, radius: number): Vector3[]
export function cumulus(rand: () => number, puffs: number, tall: number): Array<{ position: [number, number, number]; scale: [number, number, number] }>
```

- [ ] **Step 1: Write the failing tests.**

```ts
it('is identical for the same seed and smaller at low quality', () => {
  const a = buildStarField(WORLD_SEED, 'high'), b = buildStarField(WORLD_SEED, 'high'), low = buildStarField(WORLD_SEED, 'low')
  expect(Array.from(a.positions.slice(0, 30))).toEqual(Array.from(b.positions.slice(0, 30))); expect(a.sizes.length).toBe(4450); expect(low.sizes.length).toBe(2225)
})
it('puts every star on the sky sphere', () => { const s = buildStarField(WORLD_SEED, 'high'); for (let i = 0; i < s.positions.length; i += 3) expect(Math.hypot(s.positions[i], s.positions[i + 1], s.positions[i + 2])).toBeCloseTo(40, 3) })
it('lays a constellation out around its sky position', () => {
  for (const c of constellations) { const pts = constellationPoints(c, 40); expect(pts).toHaveLength(c.points.length); for (const p of pts) expect(angleDeg(p.clone().normalize(), dirOf(c.at))).toBeLessThan(6) }
})
it('gives a cloud a flat base and a tapering top', () => {
  const c = cumulus(mulberry32(1), 8, 2); expect(c.length).toBe(13); expect(c.filter((p) => p.position[1] === 0)).toHaveLength(5)
})
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, porting the look test's star shader (twinkle, additive), Milky Way band and dust, constellation lines and their mono labels (rendered through `Labels` with a `constellation` style, shown only at night), the two-ribbon comet, the cloud shader, thirteen far clouds drifting at 0.005 rad/s and eight low clouds over the planet. Everything animated here stops under reduced motion.
- [ ] **Step 4: Run** tests and e2e. Expected: PASS. Compare night with the look test: The Crown should sit to the planet's left and Jimothy Major to its right when the page first loads.
- [ ] **Step 5: Commit** `feat(world): night sky and clouds`.

### Task 16: Trees, city blocks, routes and the paddleboarder

**Model:** sonnet

**Files:**
- Create: `lib/world/scatter.ts`, `components/world/Scatter.tsx`, `components/world/Ambient.tsx`
- Test: `tests/unit/world/scatter.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Scattered { dir: Vector3; scale: [number, number, number]; color: string; lift: number }
export function scatterTrees(seed: number, districts: District[], places: Place[]): Scattered[]    // 210, none within 17° of The Works' centre or 6° of a place
export function scatterBlocks(seed: number, districts: District[], places: Place[]): Scattered[]   // a 3.3° grid in The Works, a few elsewhere
export function routes(districts: District[]): Array<{ from: DistrictId; to: DistrictId; at(t: number): Vector3 }>   // six arcs, raised 1.09 to 1.22
export function paddlePath(home: District, t: number): { position: Vector3; forward: Vector3; up: Vector3 }
```

- [ ] **Step 1: Write the failing tests.**

```ts
it('plants the same forest every visit, on land, clear of the landmarks and the city', () => {
  const t = scatterTrees(WORLD_SEED, districts, places); expect(t).toHaveLength(210); expect(scatterTrees(WORLD_SEED, districts, places)[17].dir.toArray()).toEqual(t[17].dir.toArray())
  for (const x of t) { expect(isLand(x.dir, districts)).toBe(true); expect(angleDeg(x.dir, dirOf(districts[0].center))).toBeGreaterThan(17); for (const p of places) expect(angleDeg(x.dir, dirOf(p.at))).toBeGreaterThan(6) }
})
it('gives the studio and home their blossom', () => { const t = scatterTrees(WORLD_SEED, districts, places); expect(t.some((x) => x.color === '#FFB3D1')).toBe(true) })
it('keeps city blocks off the landmarks', () => { for (const b of scatterBlocks(WORLD_SEED, districts, places)) for (const p of places) expect(angleDeg(b.dir, dirOf(p.at))).toBeGreaterThan(4.6) })
it('draws six routes that clear the ground', () => { const r = routes(districts); expect(r).toHaveLength(6); for (const x of r) for (let t = 0; t <= 1; t += 0.1) expect(x.at(t).length()).toBeGreaterThanOrEqual(1.09) })
it('keeps the paddleboarder on the water around Home', () => { for (let t = 0; t < 60; t += 5) { const p = paddlePath(districts[4], t); expect(isLand(p.position.clone().normalize(), districts)).toBe(false); expect(p.forward.dot(p.up)).toBeCloseTo(0) } })
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Trees and blocks are instanced meshes with a thin instanced outline. Routes are dashed white lines with one small traveller each, coloured by the district they leave. Port colours and sizes from the look test. If the paddleboarder's circle crosses land, widen its radius until the test passes.
- [ ] **Step 4: Run.** Expected: PASS. **Commit** `feat(world): scatter and ambient life`.

### Task 17: The modelling kit

**Model:** opus

**Files:**
- Create: `components/world/models/kit.tsx`, `components/world/models/README.md`
- Modify: `components/world/models/GenericModel.tsx` (rebuilt on the kit)
- Test: `tests/unit/world/kit.test.ts`

**Interfaces:**
- Produces the parts every landmark is built from. All take model units, with the ground at y = 0:

```tsx
export function Block(p: { size: [number, number, number]; at?: Vec3; color: string; bevel?: number; rot?: Vec3 })   // rounded box; bevel defaults to 0.04
export function Tube(p: { top: number; bottom: number; height: number; at?: Vec3; color: string; sides?: number })
export function Peak(p: { radius: number; height: number; at?: Vec3; color: string; sides?: number })
export function Blob(p: { radius: number; at?: Vec3; color: string; squash?: Vec3 })
export function Turned(p: { profile: Array<[number, number]>; at?: Vec3; color: string })                               // lathe, for anything round and shaped
export function Lit(p: { size: [number, number, number]; at?: Vec3; color: string })                                    // a window or lamp; glows at night
export function Picture(p: { src: string; size: [number, number]; at?: Vec3; rot?: Vec3 })                              // a real image on a surface
export function Bob(p: { children: ReactNode; amount?: number; speed?: number }); export function Spin(p: { children: ReactNode; speed?: number })
export function outlineScale(radius: number, thickness?: number): number       // 1 + min(thickness, 0.02) / radius; thickness defaults to 0.014
```

- Every solid part draws its own thin outline with `outlineMaterial`, uses `celMaterial`, and stops animating under reduced motion.

- [ ] **Step 1: Write the failing tests.**

```ts
it('keeps outlines thin whatever the part size', () => {
  expect(outlineScale(1)).toBeCloseTo(1.014); expect(outlineScale(0.1)).toBeCloseTo(1.14); expect(outlineScale(1, 0.5)).toBeCloseTo(1.02)
})
it('never returns an unusable scale for a degenerate part', () => { for (const r of [0, -1, NaN]) expect(Number.isFinite(outlineScale(r))).toBe(true) })
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement the kit and write `README.md`** with the modelling rules from the spec: considered proportions; bevels wherever a real object has an edge; secondary detail (windows, trim, signage, props) on every landmark; colours from the district and the shared palette only; nothing taller than 2.6 units; the front faces +z (south, toward the camera). Rebuild `GenericModel` on the kit as the worked example.
- [ ] **Step 4: Run** tests and `npx playwright test tests/e2e/world.spec.ts`. Expected: PASS. **Commit** `feat(world): modelling kit`.

### Task 18: The planet picture and the performance pass

**Model:** sonnet

**Files:**
- Create: `scripts/capture-poster.ts`, `public/world/poster-day.webp`, `public/world/poster-night.webp`
- Modify: `components/world/Poster.tsx`, `components/world/WorldCanvas.tsx`, `package.json` (script `capture:poster`)
- Test: extend `tests/e2e/fallback.spec.ts`, `tests/unit/content.test.ts`

- [ ] **Step 1: Write the failing tests.**

```ts
// content.test.ts
it('ships both planet pictures within budget', () => { for (const f of ['poster-day.webp', 'poster-night.webp']) { const p = resolve(process.cwd(), 'public/world', f); expect(existsSync(p)).toBe(true); expect(statSync(p).size).toBeLessThan(250_000) } })
// fallback.spec.ts
test('the stand-in picture matches the theme', async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; sessionStorage.setItem('kym-theme', 'night') })
  await page.goto('/'); await expect(page.getByTestId('world-poster').locator('img')).toHaveAttribute('src', /poster-night/)
})
test('the render loop stops while the tab is hidden', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  const a = await page.evaluate(() => (window as any).__worldFrames); await page.waitForTimeout(600); expect(await page.evaluate(() => (window as any).__worldFrames)).toBe(a)
})
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `capture-poster.ts` starts from a built site, opens `/` in each theme with the HUD hidden, waits for the planet, and saves a 1600×1000 WebP under 250KB. `WorldCanvas` pauses its loop when the document is hidden, counts frames on `window.__worldFrames` outside production only if `NEXT_PUBLIC_E2E` is set (the Playwright web server sets it), and drops to `low` quality when `shouldDowngrade` says so.
- [ ] **Step 4: Measure** on the development machine with a production build: content readable under 1.5s, planet interactive under 3s, 60fps in orbit. Record the numbers in the commit message. If the 3D chunk delays first paint, defer its import further.
- [ ] **Step 5: Run** the full suite. Expected: PASS. **Commit** `feat(world): planet picture, pause when hidden, quality fallback`.

---

## Phase 5: Landmarks

Each landmark is one file in `components/world/models/`, built only from the kit, registered in `registry.ts` under its `ModelKey`. For every landmark: view a day and a night close-up at `/places/[id]`, and compare against the bar in the spec: "a close-up screenshot of any landmark should look like a frame from a stylised anime film, not a toy." Save the two screenshots to `docs/superpowers/review/landmarks/[id]-{day,night}.png`.

The automated gate for every landmark task is the same and already written: `tests/unit/world/registry.test.ts` and `tests/e2e/world.spec.ts` pass, and this test is extended with the new keys:

```ts
it.each(DONE)('%s has its own landmark', (key) => expect(MODELS[key]).not.toBe(MODELS.generic))
```

### Task 19: The first five landmarks

**Model:** opus

**Files:**
- Create: `components/world/models/{Lighthouse,Playground,Alley,Castle,House}.tsx`
- Modify: `components/world/models/registry.ts`, `tests/unit/world/registry.test.ts` (`DONE = ['lighthouse', 'playground', 'alley', 'castle', 'house']`)

What each must show (spec, "The planet"):

- **Lighthouse (Beacon):** a tapered tower in white and coral bands, gallery rail, lamp room with a `Lit` lamp, a turning beam, and a keeper's cottage. The beam is brighter at night.
- **Playground (Eliminated):** a sand court, the Doll with red `Lit` eyes turning her head, a gift box with a pink bow, and two or three small player characters (the donut and the egg from the capsule art).
- **Alley (Jimothy & Pidge):** a brick wall carrying `place.poster` as a real `Picture`, a green awning, a green dumpster with a gold star, Jimothy (round, grey, masked, striped tail that wags) with Pidge on his head, and because `place.weather === 'rain'` a grey cloud with falling rain.
- **Castle (Kingdoms & Crowns):** a keep with four corner towers, purple conical roofs, a flag, a gate, and beside it a three-hut Realm village with a well.
- **House (Home):** a cottage with a pitched roof, chimney, door, `Lit` windows, a cat with a moving tail, a dog, and a fish pond.

- [ ] **Step 1: Extend the registry test** with `DONE`. Run it. Expected: FAIL.
- [ ] **Step 2: Build the five landmarks**, one commit each.
- [ ] **Step 3: Run** the full suite. Expected: PASS.
- [ ] **Step 4: Capture** the ten screenshots, plus one of the whole planet by day and by night.
- [ ] **Step 5: STOP. Show Kylee the screenshots and wait for her verdict.** Do not start Task 20 until she approves. If she asks for changes to the look, apply them to the kit first so the remaining fourteen inherit them.

### Task 20: The Works

**Model:** opus

**Files:** Create `components/world/models/{Towers,SignalMast,BigTop,Civic,Construction}.tsx`; modify the registry and `DONE`.

- **Towers (403HQ):** three office towers of different heights with window bands and rooftop plant.
- **SignalMast (AURA):** a base station and mast sending out expanding rings.
- **BigTop (Ruckus):** a striped circus tent with a pennant and game pieces around it.
- **Civic (NBS Website):** a plinth, a colonnade of four columns, a pediment roof.
- **Construction (Also on the go):** a tower crane lifting a load over an unfinished building with scaffolding.

- [ ] **Step 1:** Extend `DONE`; run; expected FAIL. **Step 2:** Build, one commit each. **Step 3:** Full suite PASS. **Step 4:** Capture screenshots.

### Task 21: Tiny Frenzy and After Hours

**Model:** opus

**Files:** Create `components/world/models/{Studio,Billboard,PiggyBank,TattooShop}.tsx`; modify the registry and `DONE`.

- **Studio (Tiny Frenzy Games):** a pink studio building with a yellow marquee, a door, and a joystick on the roof that wiggles.
- **Billboard (Eliminated — the website):** a two-post billboard showing `place.poster`, lit at night.
- **PiggyBank (The Budget):** a piggy bank with ears, snout and feet, and a coin dropping into the slot.
- **TattooShop (Ember Tattoo):** a dark shopfront with an ember-orange sign, a window and a flickering flame above the door.

- [ ] **Step 1:** Extend `DONE`; run; expected FAIL. **Step 2:** Build, one commit each. **Step 3:** Full suite PASS. **Step 4:** Capture screenshots.

### Task 22: The Studio and Home

**Model:** opus

**Files:** Create `components/world/models/{Easel,DraftingTable,Flags,Mountain,Postbox}.tsx`; modify the registry and `DONE`. After this task add `it('leaves no place on the generic building', () => { for (const p of places) expect(MODELS[p.model]).not.toBe(MODELS.generic) })`.

- **Easel (Art):** a three-legged easel holding `place.poster`, with a palette and paint pots.
- **DraftingTable (Tattoo designs):** a tilted table with `place.poster` on it and a lamp.
- **Flags (Three things):** three flagpoles with flags that wave.
- **Mountain (Off the clock):** a snow-capped peak with a summit flag, a second lower peak, a turning d20, a small concert stage with coloured lights, and a tent.
- **Postbox (Send me a letter):** a red pillar box with a letter hovering above it.

- [ ] **Step 1:** Extend `DONE` and add the test; run; expected FAIL. **Step 2:** Build, one commit each. **Step 3:** Full suite PASS. **Step 4:** Capture screenshots.

---

## Phase 6: Finish

### Task 23: Realm images, final checks and hand-off

**Model:** sonnet

**Files:**
- Create: `scripts/capture-realm.ts`, `public/media/kingdoms-and-crowns/realm-*.jpg`, `docs/superpowers/review/2026-11-10-handoff.md`
- Modify: `content/projects.ts` (Kingdoms & Crowns gallery), `README.md`, `package.json` (script `capture:realm`)

- [ ] **Step 1: Capture the Realm.** Record `git -C //wsl.localhost/Ubuntu/home/kylee/projects/kingdoms-and-crowns status --short` before starting. Read that repo's `scripts/capture-screens.mjs` for how demo mode and the `demo_persona` cookie work. Start its dev server in demo mode from WSL on port 3001 without switching branches. `scripts/capture-realm.ts` opens `/realm` as the demo child (not the parent, so no "visiting" banner), waits for the 3D scene, and saves three or four 1600×1000 shots through the existing image ladder. Stop the server. Confirm `git status --short` in that repo is unchanged.
- [ ] **Step 2: Check every shot by eye.** Each must show the Realm itself, no "visiting" banner, and only demo names. Add them to the Kingdoms & Crowns gallery with alt text describing what is visible. If the app will not run locally after a reasonable attempt, skip the images, leave the panel as text with the existing screenshots, and say so in the hand-off.
- [ ] **Step 3: Run everything.** `npm run typecheck && npm run lint && npm test && npm run test:e2e`. Expected: PASS on both the desktop and mobile projects.
- [ ] **Step 4: Update `README.md`**: how the world is organised, and "adding a place" in four steps (project entry, place entry with position and model key, run the tests, optionally a bespoke landmark).
- [ ] **Step 5: Write the hand-off** `docs/superpowers/review/2026-11-10-handoff.md`: what was built; the measured performance numbers; every line of copy that is new, in one list, for Kylee to review; fields left empty for lack of her words (the "why" for three projects); the two loose ends on the renamed art file (her source folder, git history); whether the Realm images were captured; anything that did not meet the spec.
- [ ] **Step 6: Commit** `feat: Realm images, README and hand-off`.
- [ ] **Step 7: STOP.** The branch is ready for Kylee to look at. Do not merge, push or deploy.
