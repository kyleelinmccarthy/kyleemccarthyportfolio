# Real-Content Showcase Refresh — Design

**Date:** 2026-08-15
**Status:** Approved for planning
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
story. Five personal projects on the resume — ChemTree Games, ChemTreeHQ,
Eliminated, Eliminated (web), The Wretched Few — do not appear at all. These are
exactly the projects with shareable imagery.

## Goals

1. Render real product and game imagery on the home page and `/work`.
2. Bring every stat and project description in line with the resume.
3. Keep the media pipeline reproducible and the build independent of external repos.

## Non-goals

- No redesign of the scroll choreography in `CinematicJourney.tsx`.
- No screenshots of internal NBS tools (see Confidentiality).
- No change to the contact form or its API route. See Open Question 3.

## Positioning

The site is a **showcase**, not a funnel. Copy is declarative and leads with the
work; contact remains available but is not the organizing goal. This decision
retires the *Advisory* value pillar, which framed the site as consulting.

## Design

### 1. Content model

`content/types.ts` gains a media model and a lifecycle status. `screenshot?: string`
is removed — it is dead today, so nothing depends on it.

```ts
export interface MediaItem {
  /** Path under /media/<slug>/, e.g. "/media/wretched-few/hero.avif" */
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
  /** Resume-grounded tech chips. */
  stack?: string[]
}
```

`ProjectCategory` gains `'Games'`.

The existing invariant *screenshot ⇒ liveUrl* becomes **autoCapture ⇒ liveUrl**.
This is the substantive change: bundled game art is legitimate media with no public
URL behind it, while anything claiming to be a capture of a live site must actually
have one.

### 2. Components

**`components/media/ProjectVisual.tsx`** — renders `media.hero` through `next/image`
at a fixed aspect ratio with the existing rounded/ring treatment. When a project has
no media it falls back to the current abstract panel. Every internal NBS tool takes
the fallback path, so the fallback is a first-class state, not an edge case.

**`components/media/ProjectGallery.tsx`** — a horizontal thumbnail strip that opens a
native `<dialog>` lightbox. Native `<dialog>` is chosen deliberately: it gives focus
trapping, Esc-to-close, and inert background for free. Hand-rolled modals are the
most common source of axe violations, and axe gates CI here.

Keyboard contract: Tab reaches each thumbnail; Enter/Space opens; Left/Right move
between images; Esc closes and returns focus to the invoking thumbnail.

### 3. Asset pipeline

Output lives in `public/media/<slug>/` and is **committed**. The build must not
depend on a WSL mount or a Unity repo being present.

Two scripts, both re-runnable and idempotent:

- **`scripts/capture-screenshots.ts`** (extend) — drives Playwright over projects
  where `autoCapture` is set, writing `hero.*`.
- **`scripts/import-assets.ts`** (new) — copies and downsizes local art from a
  declared source manifest.

Both emit AVIF + WebP with a JPEG fallback at 1600px wide. Game captures are
~2.5 MB PNGs at source; target is ≤250 KB per image.

`sharp` is added to `devDependencies`, fixing the currently-broken capture script.

**Source manifest:**

| Slug | Source | Hero | Gallery |
| --- | --- | --- | --- |
| `kingdoms-and-crowns` | `\\wsl.localhost\Ubuntu\home\kylee\projects\kingdoms-and-crowns\public\marketing\screens\r2\` | `hero-my-quests.jpg` | `hero-my-castle`, `hero-my-tavern`, `hero-my-trophies`, `hero-ranks`, `parent-quest-giver`, `parent-hall-of-legends` |
| `wretched-few` | `E:\codeProjects\VillainRoguelite\harbingers-of-the-apocalypse\Screenshots\` | `screen_CharacterSelect.png` | `screen_MainMenu`, `screen_Lobby`, `screen_Gate`, `screen_Mirror`, `screen_BrokerShop`, `screen_HudLayout` |

K&C has both local art and a live site; the local marketing captures are better
composed, so it does **not** use `autoCapture`.

**Capture targets** (all verified reachable 2026-08-15):

| Slug | URL | Note |
| --- | --- | --- |
| `403hq` | `https://403hq.nbsbenefits.com` | public sign-in surface |
| `nbs-website` | `https://nbswebsite-release-…azurewebsites.net/` | pre-launch release slot |
| `ember-tattoo` | `https://ember-tattoo-web.vercel.app` | |
| `chemtree-games` | `https://chemtreegames.com` | |
| `chemtree-hq` | `https://hq.chemtreegames.com` | sign-in screen only — see Open Question 4 |
| `eliminated-web` | `https://www.eliminatedgame.com` | apex 308s to `www` |

`www.kingdomsandcrowns.com` is likewise the canonical host; the bare apex returns 308.

### 4. Project roster — 8 professional, 9 personal

**Professional.** Two consolidations, both correcting the current list rather than
hiding anything:

- *Tech Hub* is renamed **Beacon**. It is the same system — `nbsStuff/beacon-main`
  confirms the name — and the resume describes it as replacing Azure DevOps and
  folding in GitHub Enterprise and ServiceDesk Plus.
- *Client Portal (v2)* folds into **403HQ** as "two client deployments, ~10,000
  employees each," matching how the resume presents it and the
  `403HQ-main` / `403HQ-DoE-main` repo pair.

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

**Personal.** Sentral is dropped: `ChemTreeHQ/CLAUDE.md` records it as
*"forked from the Sentral codebase,"* so ChemTreeHQ supersedes it and carrying both
would tell one story twice. *This Portfolio* is dropped as a card; its
CI-accessibility detail moves to the About scene.

| Project | Status | Media |
| --- | --- | --- |
| Kingdoms & Crowns | beta | import + gallery |
| The Wretched Few | building | import + gallery |
| Eliminated | building | none |
| Eliminated (web) | production | capture |
| ChemTree Games | production | capture |
| ChemTreeHQ | building | capture |
| Ember Tattoo & Piercing | production | capture |
| Family Budgeting | production | none |
| Doing The Thing | production | none |

### 5. Figures

`BuildScene` currently overwrites the first build figure with
`String(projects.length)` (`components/scenes.tsx:137-139`). The intent was
staleness-proofing, but it makes the headline number mean "cards on this page."
After this refresh that reads **17**, presented as 2026 production apps — a claim
the resume does not support.

**The derivation is removed.** Figures become literal and resume-sourced.

Staleness protection cannot simply move to the `status` field, because the card
roster and the enterprise count measure different things. The resume's 14 breaks
down 6 production / 4 releasing / 4 building, but the 8 professional cards
consolidate (403HQ is two deployments; Online Forms / Secure Upload / Onboarding is
three services in one card) and do not name all 14. The named cards account for
5 production, 4 releasing, 2 building — 11 of the 14. **Any test asserting the
cards sum to 6/4/4 would be false.**

So the invariant is split in two:

- **Arithmetic of the stated claim** — `6 + 4 + 4 === 14`, and `builtPersonally (11)
  <= total (14)`. Catches a figure edited in isolation.
- **Per-bucket ceiling** — the named professional cards in each status bucket never
  exceed that bucket's stated total. Catches adding a ninth production card without
  revisiting the headline number.

**Lead scene** — `200` backlog items delivered per year, up from ~40 · `20` people
in the department · `1 → 14` enterprise projects since 2023.

**Build scene** — `11 of 14` enterprise platforms built personally · `15+` sites on
AURA at zero marginal cost · `6 weeks` from kickoff to a live client portal.

### 6. Value pillars

*Advisory* is replaced, per the showcase positioning:

1. Technology leadership — operating model, design system, standards that enforce themselves in CI
2. **AI in production, under audit** — six systems, three providers, forced tool-use against a JSON schema, confidence thresholds, per-tenant governance
3. Product & UX/UI design — design system, WCAG 2.1 AA, light and dark theming
4. Build over buy — project tracker, accessibility vendor and engagement tool retired and replaced; recordkeeping platform next

Pillar 2 is the most differentiated claim on the resume and the site does not
currently mention AI at all.

### 7. Timeline

`content/timeline.ts:7` carries a literal note — `Kylee: replace the markers with
real years` — and the current markers are invented phase labels. Replaced with
real dates from the resume:

Mar 2015 Benefits Specialist → May 2016 Assistant Account Manager →
Jul 2017 IS Analyst → Nov 2019 IS Analyst Lead → Nov 2022 Director.

The `growth` series (40 → 130 → 200) already matches the resume and is retained.

### 8. Tests

`tests/unit/content.test.ts` is updated, not merely renumbered:

- roster shape: 8 professional, 9 personal, unique slugs
- **autoCapture ⇒ liveUrl** (replaces the screenshot invariant)
- every `MediaItem` has a non-empty `alt`
- every `media.src` resolves to a file that exists under `public/` (Node env — a
  path typo is otherwise invisible until someone loads the page)
- enterprise figures are self-consistent (`6 + 4 + 4 === 14`, `11 <= 14`) and no
  status bucket's named cards exceed its stated total — see §5 for why an exact
  6/4/4 assertion would be false
- figures carry non-empty labels; no `projects.length` coupling

`tests/e2e` gains a gallery case: open the lightbox, assert focus moves into the
dialog, Esc closes it and restores focus, and axe reports no violations with the
dialog open.

## Risks

**Image weight.** Nine game captures plus seven K&C screens plus six live captures
is the first real payload this site has carried. Mitigated by the 250 KB/image
budget, AVIF/WebP, and `next/image` lazy loading below the fold. The Build scene
heroes are above the fold on desktop and are the ones to watch.

**Capture drift.** Auto-captured heroes are snapshots of sites that keep changing.
Both scripts are idempotent and re-runnable; committed output means a stale capture
is visible in a diff rather than silently served.

## Confidentiality

No internal NBS tool is screenshotted. Beacon, Paragon, External Payroll, Online
Forms, Secure Upload and Onboarding are described in resume-level terms only and
render the abstract panel. The two professional captures — 403HQ and the NBS
Website — are of surfaces already public today. Figures used are the ones already
on a resume in circulation.

## Open questions

1. **The Wretched Few art.** Nine captures of an unreleased, Steam-bound game
   co-owned with one collaborator would go permanently public on kyleemccarthy.com.
   Not a decision this spec makes. **Blocks the `wretched-few` gallery only**;
   everything else can ship without it.
2. **Sentral.** Dropped, inferred from the roster selection and corroborated by the
   ChemTreeHQ fork note. Reversible if wrong.
3. **Contact options.** `contactOptions.ts` still offers *"Advisory engagement"* and
   `content.test.ts` pins it, which now contradicts the retired Advisory pillar.
   Left out of scope pending a call.
4. **ChemTreeHQ capture.** `hq.chemtreegames.com` returns 200 but is a workspace
   behind auth, so a capture yields a sign-in screen. Options: ship the sign-in
   capture, substitute a local screenshot of the Yjs collaborative editor, or use
   the abstract panel.

## Implementation order

1. `sharp` dependency + `types.ts` model + test scaffolding
2. `import-assets.ts` and the extended capture script; generate and commit media
3. `ProjectVisual` + fallback, wired into `/work` and `BuildScene`
4. `ProjectGallery` + lightbox + a11y e2e
5. Content rewrite: `projects.ts`, `journey.ts`, `timeline.ts`, `hero.ts`, `site.ts`
6. Full verification: `typecheck`, `test`, `test:e2e`, `build`
