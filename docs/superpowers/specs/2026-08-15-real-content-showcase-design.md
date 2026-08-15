# Real-Content Showcase Refresh — Design

**Date:** 2026-08-15
**Status:** Revised after review — awaiting approval
**Scope:** `kyleemccarthy.com` (this repo)

## Problem

The site is entirely text. It describes work rather than showing it, and what it
describes is out of date.

**No imagery exists.** `Project.screenshot` is declared on three projects in
`content/projects.ts`, but no component reads the field. `ProjectVisual`, named in
the header comment of `scripts/capture-screenshots.ts`, was never written.
`public/screenshots/` holds only a `.gitkeep`. The capture script itself cannot run:
it imports `sharp`, which is absent from `package.json`.

**The content understates the work.** Measured against
`KyleeMcCarthyResume-TechLeaderProblemSolver.pdf`:

| Claim | Site today | Resume |
| --- | --- | --- |
| Delivery growth | "2×+ velocity" | ~40 → 200 backlog items/yr (5×) |
| Enterprise projects | not stated | 1 in 2023 → 14 today; 11 built personally |
| AURA reach | 10+ sites | 15+ sites |
| Production apps | "12 in 2026" | conflates personal and professional work |

Whole systems are missing: **Beacon**, **Paragon**, **External Payroll**,
**Online Forms / Secure Upload / Onboarding**, and the entire **AI in production**
story. Five personal projects on the resume do not appear at all.

**There is nowhere for the person to show up.** The site presents a director of
technology operations and nothing else. The art, the writing, the tattoo designs,
the D&D, the homeschooling — none of it has a home.

## Goals

1. Render real product and game imagery on the home page and `/work`.
2. Bring every stat and project description in line with the resume.
3. Add `/room` — an optional personal space entered through a door.
4. Keep the media pipeline reproducible and the build independent of external repos.

## Non-goals

- No redesign of the scroll choreography in `CinematicJourney.tsx` beyond the
  already-shipped timing fix.
- No screenshots of internal NBS tools (see Confidentiality).
- No two-mode site-wide toggle. The light-switch theme control stays the only
  switch; the room is a place, not a mode.

## Positioning

The site is a **showcase**, not a funnel. Copy is declarative and leads with the
work. This retires the *Advisory* value pillar, which framed the site as
consulting, but contact stays — reworded warmer (see §9).

---

## Design

### 1. Content model

`content/types.ts` gains a media model and a lifecycle status. `screenshot?: string`
is removed — it is dead today, so nothing depends on it.

```ts
export interface MediaItem {
  /** Path under /media/, e.g. "/media/wretched-few/hero.avif" */
  src: string
  /** Required. axe runs against this site in CI; a media item with no alt is a build failure. */
  alt: string
  caption?: string
}

export type ProjectStatus =
  | 'production' | 'releasing' | 'building' | 'beta' | 'concept'

export interface Project {
  // …existing fields, minus `screenshot`
  status: ProjectStatus
  media?: { hero: MediaItem; gallery?: MediaItem[] }
  /** Hero is Playwright-captured from liveUrl rather than imported from a repo. */
  autoCapture?: boolean
  stack?: string[]
}
```

`ProjectCategory` gains `'Games'`.

The existing invariant *screenshot ⇒ liveUrl* becomes **autoCapture ⇒ liveUrl**:
bundled art is legitimate media with no public URL behind it, while anything
claiming to be a capture of a live site must actually have one.

### 2. Components

**`components/media/ProjectVisual.tsx`** — renders `media.hero` through `next/image`
at a fixed aspect ratio. With no media it falls back to the current abstract panel.
Every internal NBS tool takes the fallback, so it is a first-class state.

**`components/media/Gallery.tsx`** — thumbnail strip opening a native `<dialog>`
lightbox, shared by project galleries and the room's art wall. Native `<dialog>`
is deliberate: focus trapping, Esc-to-close and an inert background come free, and
hand-rolled modals are the most common source of axe violations.

Keyboard contract: Tab reaches each thumbnail; Enter/Space opens; Left/Right move
between images; Esc closes and restores focus to the invoking thumbnail.

### 3. Asset pipeline

Output lives in `public/media/` and is **committed** — the build must not depend on
a WSL mount, a Unity repo, or a Pictures folder being present.

Three sources, all re-runnable and idempotent:

- **`scripts/capture-screenshots.ts`** (extend) — Playwright over `autoCapture`
  projects.
- **`scripts/import-assets.ts`** (new) — copies and downsizes named files from
  project repos.
- **`scripts/import-art.ts`** (new) — **globs** `PortfolioArt/` and `TattooArt/`.

Globbing is required, not a convenience: those folders are still being filled, so
re-running must pick up whatever has been added without a code change. Filenames
become slugs; alt text is authored in `content/room.ts` keyed by slug, so an
unknown file gets a build-time warning rather than a silent empty `alt`.

All emit AVIF + WebP with a JPEG fallback at 1600px wide, ≤250 KB per image.
Source files run 10–15 MB, so downsizing is load-bearing.

`sharp` is added to `devDependencies`, fixing the currently-broken capture script.

**Repo art sources:**

| Slug | Source | Files |
| --- | --- | --- |
| `kingdoms-and-crowns` | `…/kingdoms-and-crowns/public/marketing/screens/r2/` | hero `hero-my-quests.jpg`; gallery: `hero-my-castle`, `hero-my-tavern`, `hero-my-trophies`, `hero-ranks`, `parent-quest-giver`, `parent-hall-of-legends` |
| `wretched-few` | `…/harbingers-of-the-apocalypse/Screenshots/` | **`screen_MainMenu.png` only** — one image, no gallery |

**Capture targets** (all verified reachable 2026-08-15):

| Slug | URL |
| --- | --- |
| `403hq` | `https://403hq.nbsbenefits.com` |
| `nbs-website` | `https://nbswebsite-release-…azurewebsites.net/` |
| `ember-tattoo` | `https://ember-tattoo-web.vercel.app` |
| `chemtree-games` | `https://chemtreegames.com` |
| `eliminated-web` | `https://www.eliminatedgame.com` |

`www` is canonical for both `kingdomsandcrowns.com` and `eliminatedgame.com`; the
bare apexes 308. K&C uses its repo art rather than a capture — the marketing
screens are better composed.

**ChemTreeHQ is a manual capture.** `hq.chemtreegames.com` is behind auth, so an
automated capture would yield a sign-in box. Instead: one screenshot of the
dashboard with no project details visible, produced by hand and committed. It is
therefore the one asset the pipeline cannot regenerate, and is marked as such in
the manifest.

### 4. Project rosters

`/work` carries the professional work. `/room` carries the personal projects,
presented separately from it.

**Professional (8).** Two consolidations, both corrections rather than omissions:
*Tech Hub* is renamed **Beacon** (`nbsStuff/beacon-main` confirms it), and
*Client Portal (v2)* folds into **403HQ** as "two client deployments, ~10,000
employees each," matching the resume and the `403HQ-main` / `403HQ-DoE-main` pair.

| Project | Status | Media |
| --- | --- | --- |
| 403HQ | production | capture |
| AURA | production | none — `embedNote` |
| Beacon | production | none |
| Ruckus | production | none |
| NBS Website | releasing | capture |
| Online Forms / Secure Upload / Onboarding | releasing | none |
| External Payroll Processing | building | none |
| Paragon | building | none |

**Personal (9), in the room.** Sentral is dropped: `ChemTreeHQ/CLAUDE.md` records it
as *"forked from the Sentral codebase,"* so ChemTreeHQ supersedes it and carrying
both tells one story twice. *This Portfolio* is dropped as a card.

| Project | Status | Media |
| --- | --- | --- |
| Kingdoms & Crowns | beta | import + gallery |
| The Wretched Few | building | one image |
| Eliminated | building | none |
| Eliminated (web) | production | capture |
| ChemTree Games | production | capture |
| ChemTreeHQ | building | manual capture |
| Ember Tattoo & Piercing | production | capture |
| Family Budgeting | production | none |
| Doing The Thing | production | none |

### 5. The room

**Route:** `/room`. A real page, linkable and shareable, not a mode.

**The door** is the final beat of the home-page scroll, after the Talk scene — the
reader has finished the professional story and may choose to go further or not.
It extends the light-switch idiom the site already owns: warm light spills from
under a closed door. Hover brightens it; activating it navigates.

Mechanically it is a `<Link href="/room">` styled as a door, so it works without
JS, is keyboard-reachable, and is crawlable. The door art is CSS and inline SVG,
not an image — it must theme correctly in both light and dark.

**Sections:**

1. **Built after hours** — the 9 personal projects, framed by why they exist rather than what they prove.
2. **Things I draw** — the art wall from `PortfolioArt/`.
3. **Tattoo flash** — its own section from `TattooArt/`, because *"people are walking around wearing my drawings"* is the most distinctive thing on the site.
4. **Off the clock** — reading and writing (story ideas, books in progress), homeschooling, paddleboarding and hiking, the pets, video games, board games, D&D, anime, concerts.
5. **Come say hi** — the room's own warmer contact close.

**Privacy.** Family is referred to generically — "my husband," "my kids," "my
daughter" — with no names, ages, or identifying detail about the children. No
family photographs. The city is already public on the resume, so it stays.

**Content lives in `content/room.ts`**, matching how every other section separates
content from presentation.

### 6. Figures

`BuildScene` currently overwrites the first build figure with
`String(projects.length)` (`components/scenes.tsx:137-139`). The intent was
staleness-proofing, but it makes the headline number mean "cards on this page."
After this refresh that reads 17, presented as 2026 production apps — a claim the
resume does not support.

**The derivation is removed.** Figures become literal and resume-sourced.

Staleness protection cannot simply move to the `status` field, because the card
roster and the enterprise count measure different things. The resume's 14 breaks
down 6 production / 4 releasing / 4 building, but the 8 professional cards
consolidate and do not name all 14 — they account for 5 production, 4 releasing,
2 building, or 11 of 14. **Any test asserting the cards sum to 6/4/4 would be
false.** So the invariant splits in two:

- **Arithmetic of the stated claim** — `6 + 4 + 4 === 14`, `11 <= 14`.
- **Per-bucket ceiling** — named cards in each status bucket never exceed that
  bucket's stated total.

**Lead scene** — `200` backlog items/yr, up from ~40 · `20` people · `1 → 14`
enterprise projects since 2023.

**Build scene** — `11 of 14` built personally · `15+` sites on AURA · `6 weeks` to
a live client portal.

### 7. Value pillars

*Advisory* is replaced:

1. Technology leadership — operating model, design system, standards that enforce themselves in CI
2. **AI in production, under audit** — six systems, three providers, forced tool-use against a JSON schema, confidence thresholds, per-tenant governance
3. Product & UX/UI design — design system, WCAG 2.1 AA, light and dark theming
4. Build over buy — project tracker, accessibility vendor and engagement tool retired and replaced; recordkeeping next

Pillar 2 is the most differentiated claim on the resume and the site never
mentions AI.

### 8. Timeline

`content/timeline.ts:7` carries a literal `Kylee: replace the markers with real
years` note and the markers are invented phase labels. Replaced with real dates:
Mar 2015 → May 2016 → Jul 2017 → Nov 2019 → Nov 2022.

The `growth` series (40 → 130 → 200) already matches the resume and is retained.

### 9. Contact

Kept, reworded off the sales register. `content/contact.ts` currently opens *"I take
on advisory engagements and contract work"* — which contradicts the showcase
positioning.

- **`/#contact`** stays the professional close, warmer and less transactional.
- **`/room`** gets its own sign-off in the room's voice.
- `contactOptions.ts` — *"Advisory engagement"* is reworded and the pinned test in
  `content.test.ts` updated with it.

### 10. Tests

`tests/unit/content.test.ts` updated:

- roster shape: 8 professional, 9 personal, unique slugs
- **autoCapture ⇒ liveUrl** (replaces the screenshot invariant)
- every `MediaItem` has non-empty `alt`
- every `media.src` resolves to a file under `public/` (Node env — a path typo is
  otherwise invisible until someone loads the page)
- enterprise figures self-consistent; no `projects.length` coupling
- every art file imported by the glob has authored alt text

New `tests/e2e/room.spec.ts`: the door is keyboard-reachable and navigates to
`/room`; the lightbox traps focus, closes on Esc, restores focus; axe clean with
the dialog open. `/room` joins the existing a11y sweep.

---

## Already shipped

Two defects reported during review, fixed and committed as `9bc4adc`:

- **Footer misalignment** — the two footer columns had mismatched headings and no
  cross-axis alignment, leaving the link rows **40.7px apart** (measured). Fixed
  with `lg:items-end`; regression-tested in `tests/e2e/footer.spec.ts`.
- **Dead lead-in scroll** — scene one dwelled for the full `HOLD`, so at
  240vh / 0.48 it took **115vh** of scrolling before the camera moved. Scene one is
  on screen before the reader touches the wheel and does not need an arrival dwell;
  it now has its own `FIRST_HOLD`, cutting the lead-in to **36vh**. Constants moved
  to `components/journey/timing.ts` and unit-tested.

## Risks

**Image weight.** This is the first real payload the site has carried. Mitigated by
the 250 KB/image budget, AVIF/WebP, and `next/image` lazy loading. The Build scene
heroes are above the fold on desktop and are the ones to watch.

**Capture drift.** Auto-captured heroes are snapshots of sites that keep changing.
Scripts are idempotent; committed output means a stale capture shows in a diff.

**The room dilutes the professional read.** A hiring manager who opens the door
finds D&D and anime. This is the intended trade — it is behind a door precisely so
the professional story stands on its own first, and the reader opts in.

**Art provenance.** `Pictures\Art\Digital\References\` is downloaded reference
material and is excluded — only the curated `PortfolioArt/` and `TattooArt/`
folders are read. Several curated pieces are fan art of copyrighted characters
(Deku, Arcane Vi, Kaneki, Cowboy Bebop), which is ordinary for a personal site.

## Confidentiality

No internal NBS tool is screenshotted. Beacon, Paragon, External Payroll, Online
Forms, Secure Upload and Onboarding are described in resume-level terms only. The
two professional captures are of surfaces already public. Figures are the ones
already on a resume in circulation.

## Open questions

1. **Pre-existing test failures.** 9 e2e tests fail on `main`, unrelated to this
   work and confirmed pre-existing by running the suite on a clean tree. Most
   notably `aria-prohibited-attr` (serious, hundreds of nodes) from
   `CountUp.tsx:51`: `<span aria-label={value}>` on a bare span, whose implicit
   `generic` role prohibits `aria-label`. One-line fix — add `role="img"`, as
   `NameLogo.tsx:85` already does. Also failing: contact happy-path, theme-toggle
   persistence, and the mobile résumé link. **In or out of scope?**
2. **`FB_IMG_1571103383957.jpg`** in `PortfolioArt/` is 19 KB with a Facebook
   download filename — likely too low-res to show well, and worth confirming it is
   yours.
3. **The Wretched Few** is now one main-menu image rather than a gallery, which
   reduces but does not remove the question of publishing pre-release art from a
   project co-owned with a collaborator.

## Implementation order

1. `sharp` + `types.ts` model + test scaffolding
2. `import-assets.ts`, `import-art.ts`, extended capture script; generate and commit media
3. `ProjectVisual` + fallback, wired into `/work` and `BuildScene`
4. `Gallery` + lightbox + a11y e2e
5. Content rewrite: `projects.ts`, `journey.ts`, `timeline.ts`, `hero.ts`, `site.ts`, `contact.ts`
6. `/room`: route, door, `content/room.ts`, sections
7. Full verification: `typecheck`, `lint`, `test`, `test:e2e`, `build`
