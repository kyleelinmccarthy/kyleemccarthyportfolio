# The Tiny Planet — Design

**Date:** 2026-11-10
**Status:** Draft for review
**Supersedes:** `2026-08-16-museum-overhaul-design.md` (the house you walk through) and the `/room` library from `2026-08-15-real-content-showcase-design.md`. The contact backend, the media pipeline and the project content model from those specs stand.

## What this is

kyleemccarthy.com stops being a house and becomes a small planet: a glimpse into Kylee's world. Everything she builds, leads, draws and loves is a place on it. Visitors spin it, fly down to a place, and read about it in a clean panel.

The site has two jobs, and Kylee chose both:

1. **Volume and quality together.** A tech leader who spends 30 seconds here should leave thinking "she ships an absurd amount and none of it is sloppy." The planet is dense, and every place holds up when you zoom in.
2. **"I'd want to work with her."** The world is warm, playful and personal: her pets, her games' characters, her art, her greetings.

The site itself is part of the argument. It has to be as well made as the work it shows.

## Goals

- One interactive 3D planet as the whole site. Work, personal projects, art, principles, résumé and contact are all places on it.
- A polished anime look: luminous skies and clean cel shading, in the spirit of Makoto Shinkai's films. Day and night modes.
- A visitor in a hurry reaches the best work fast: a guided tour and a full index are always one click away.
- Every place has its own shareable URL and works without WebGL, without JavaScript, with a keyboard and with a screen reader.
- Adding a project later is a content change: one entry in a content file, a position, and a model key.
- The content changes Kylee asked for (listed under "Content changes").

## Non-goals

- No CMS, no database, no sound.
- No change to how the contact form's backend works (validation, rate limiting, Turnstile, Resend).
- No rewrite of copy for professional projects that are staying, beyond what is listed here.
- No walking around on the surface, no game mechanics. It is a portfolio you can spin, not a game.
- No imported 3D model files in the first version. Landmarks are modelled in code (Kylee's choice).

## Anti-goals

These make it a failure even if it works:

- **It looks childish or cartoony.** Thick black outlines, primary colours, blocky toy shapes. The first sketch looked like this and Kylee rejected it.
- **The gimmick hides the work.** If someone cannot find the projects in ten seconds, the planet has failed.
- **It stutters.** A janky 3D site reads as careless, which is the opposite of the point.
- **Invented facts.** No statistic, quote or claim that does not come from Kylee's words, her repos or her live sites. This rule is inherited from the earlier specs.
- **Her children's names or likenesses anywhere**, including in screenshots.

## What the visitor sees

### The planet

A small planet floats in the sky, turning slowly. It has five islands, one per district. Each district has a colour used consistently in labels, the legend and the panel.

| District | What it holds | Places |
| --- | --- | --- |
| **The Works** | What she builds for a living | Beacon, 403HQ, AURA, Ruckus, NBS Website, Also on the go |
| **Tiny Frenzy** | Her one-person game studio | Tiny Frenzy Games, Eliminated, Eliminated — the website, Jimothy & Pidge |
| **After Hours** | Apps for people she loves | Kingdoms & Crowns, The Budget, Ember Tattoo |
| **The Studio** | Ink, paint and pixels | Art, Tattoo designs |
| **Home** | Everything else | Home (about and résumé), Three things (principles), Off the clock, Send me a letter (contact) |

That is 19 places. Each is a small landmark that says what it is without a label:

| Place | Landmark |
| --- | --- |
| Beacon | A lighthouse with a turning beam (its dashboard is called Lighthouse) |
| 403HQ | A cluster of office towers |
| AURA | A signal mast sending out rings (one script tag, broadcast to every site) |
| Ruckus | A big-top tent |
| NBS Website | A civic building with columns |
| Also on the go | A construction site with a working crane |
| Tiny Frenzy Games | The studio building with a marquee |
| Eliminated | A sand playground with the Doll and a gift box with a pink bow |
| Eliminated — the website | A billboard showing the real capsule art |
| Jimothy & Pidge | A Seattle alley: brick wall with the game poster, a green dumpster with a star, Jimothy with Pidge on his head, and a rain cloud that never leaves |
| Kingdoms & Crowns | A castle with a small Realm village beside it |
| The Budget | A piggy bank with a coin dropping in |
| Ember Tattoo | A dark shopfront with a flame |
| Art | An easel holding one of her real pieces |
| Tattoo designs | A drafting table with a real design on it |
| Home | A house with the lights on, a cat, a dog and a fish pond |
| Three things | Three flags |
| Off the clock | A mountain with a trail flag, a giant d20, a small concert stage and a tent |
| Send me a letter | A postbox with a letter hovering over it |

The Works also has tidy city blocks around its landmarks. Trees are scattered on every island except the city, with pink blossom around The Studio and Home.

### Living details

Small things that move, chosen by Kylee: pets and the outdoors, her game characters, books/tabletop/anime/concerts, family and homeschool.

- A paddleboarder circles Home's coast.
- Dashed routes arc between districts with small travellers moving along them, so the world always looks busy and connected.
- Low clouds drift over the planet. Surf rolls in at every shore and the sea glitters where the sun hits it.
- It always rains on Jimothy's alley, because it is Seattle.
- At night, four constellations drawn from her life: **The Crown**, **Jimothy Major**, **The Natural 20** and **The Pencil**.

These are data, not hard-coded: the list of constellations and which place has weather live in content files.

### Moving around

Chosen by Kylee: free roam plus a tour.

- **Free roam.** Drag to spin, scroll or pinch to zoom, click a landmark or its label to fly down to it. The planet turns on its own until touched, and resumes after a few idle seconds.
- **Labels.** Zoomed out, each district has one label with its name, its count and a one-line description, and every place shows as a small coloured dot. Zoom in and each place gets its own map-style callout: a pin, a thin leader line, a name in small caps and a one-line descriptor. Labels on the far side of the planet are hidden.
- **The tour.** "Take the tour" flies to each place in a fixed order, with previous/next buttons, arrow keys and a progress strip. It starts at Home, then Three things, then The Works, Tiny Frenzy, After Hours, The Studio, and ends at Off the clock and the postbox.
- **The index.** A list of every place grouped by district. It is the skimmable version of the site and the accessible one.
- **The legend.** The five districts with their colours and counts, bottom-left. Clicking one turns the planet to that island.
- **At a place.** The camera drops to a low angle with the horizon behind the landmark. Drag to circle it. Escape, the close button or zooming out returns to the planet.

### The panel

Flying to a place opens a frosted-glass panel with that place's content. What is in it depends on the kind of place:

- **Project:** name, descriptor, hero image, headline, what it is, key facts, tech chips, status and a link to the live thing. A gallery where there are more images. Featured professional projects keep their existing placard material ("the part I'd warn someone about", what got thrown away, what she'd do differently).
- **Also on the go:** the three items listed under "Content changes".
- **Home:** portrait, who she is, the career timeline, the delivery growth figures, education and the résumé download. This is what `/about` holds today.
- **Three things:** her three principles, in her words, unchanged.
- **Art / Tattoo designs:** the existing galleries, grouped by medium, with the existing lightbox.
- **Off the clock:** the existing list of interests.
- **Send me a letter:** the existing contact form.

### Day, night and greetings

- **Day mode** is the light theme: a deep blue sky, a sun with a soft flare, tall shaded clouds.
- **Night mode** is the dark theme: a dense star field with a Milky Way band, a crescent moon, a two-tailed comet, shooting stars and the constellations. The planet dims, and the lighthouse beam and windows glow.
- **On arrival the sky follows the visitor's own clock:** day from 6:00 to 18:59, night otherwise. A Day/Night button overrides it.
- **Day has three tints:** a soft sunrise in the morning, clear blue in the afternoon, and a pink-and-gold sunset in the evening with a lower, orange sun. Changing from one to another eases over about a second.
- **Greetings.** Her four existing greetings stay, chosen by the visitor's hour: "Morning." (5–11), "Afternoon." (12–16), "Evening." (17–21), "Up late? So am I." (22–4). They sit under the headline "There's always a better way, and I enjoy trying to find it."

### The look

Approved by Kylee from a working look test, saved at `docs/superpowers/specs/reference/2026-11-10-planet-look-test.html`. That file is the visual reference for colours, shading and sky. It is a throwaway single-page sketch: its code is not the architecture, and its building shapes are placeholders. (It loads its poster images from the sketch server, so opened on its own those show as blank.)

The rules the look test establishes:

- **Shading:** two tones plus a narrow half-tone band. Shadows are coloured, never grey: blue by day, violet at sunset, indigo at night. A soft rim of sky-coloured light on every edge.
- **Outlines:** thin and tinted dark indigo. Never thick, never black.
- **Sea:** deep blue to turquoise shallows, a white surf line at the shore with rings rolling in, and glitter in the sun's reflection.
- **Atmosphere:** a soft glowing halo around the planet, tinted by time of day.
- **Bloom:** only things that are actually bright glow: the sun, stars, sea glitter, lit windows, the lighthouse lamp.
- **Interface:** frosted-glass panels and labels, thin borders, soft shadows, small radii. A thin frame with corner marks and a coordinates readout, like a map plate.
- **Type:** Bricolage Grotesque for display, DM Sans for body, DM Mono for labels and coordinates.
- **Every colour comes from one table** per time of day (sky, light, shadow, sea, cloud, rim, glow). Nothing is hard-coded in a component.

**The landmarks must be properly modelled.** This is the part the look test does not show. Each one needs considered proportions, bevelled or rounded edges where a real object would have them, and enough secondary detail (windows, trim, signage, props) to reward a close-up. The bar: a close-up screenshot of any landmark should look like a frame from a stylised anime film, not a toy.

## Content changes

All copy below is draft, written from her repos and live sites. Kylee reviews the copy before it ships.

### Added

**Eliminated** (replaces the current entry)
- A wholesome party game where everyone dies. Playground games with elimination-show stakes, run by a sinister Game Master. 2–8 players: solo against bots, on the couch, or online. Nine games. Losers are boxed up with a little pink bow.
- Status: coming soon to Steam. No date and no wishlist link exist yet.
- Stack: Unity 6, C#.
- Art: the new capsule set from `C:\Users\kylee\AppData\Local\Temp\capsule\final3\steam` (hero: `header_capsule_920x430.png`). The same files exist in the game repo at `E:\codeProjects\EliminatedGame\EliminatedGame\marketing\steam-capsule\steam\`; the importer should read from the repo copy because a Temp folder can disappear.
- Gallery: the nine gameplay shots in `E:\codeProjects\eliminated-site\src\assets\screenshots\`.

**Eliminated — the website** (new; replaces the old "Eliminated (web)" browser prototype entry)
- The marketing site and press kit at https://eliminatedgame.com/. Static Astro site on Cloudflare with a strict content security policy and no cookies or trackers.
- Image: captured from the live site.

**Jimothy & Pidge: Shenanigans in Seattle** (new)
- A single-player 3D collect-a-thon platformer in the spirit of the late-90s classics. Jimothy, a round raccoon, and his pigeon pal Pidge free the caged Elder Raccoons from the Terrible Trapper.
- Status: in development.
- Stack: Unity 6, URP, C#.
- Art: the capsule set in `E:\codeProjects\Jimothy-the-raccoon\.claude\worktrees\dev\Captures\key-art-refs\steam-capsules\alley`.
- The repo is still named "Jimothy the Raccoon"; the title above is what the capsule art and the Tiny Frenzy site use.

**Tiny Frenzy Games** (new; replaces ChemTree Games)
- Her one-person studio's site at https://tinyfrenzygames.com/. "One dev. All the frenzy." Both games, a mailing list for playtests, and a private admin with a newsletter editor.
- Stack: Next.js, Drizzle, Neon Postgres, Cloudflare Workers.
- Image: captured from the live site.

### Removed

The Wretched Few, Eliminated (web), ChemTree Games, ChemTreeHQ and Doing The Thing. Their entries, their media folders and every reference to them go. External Payroll Processing also goes (Kylee's choice, below).

### Updated

**Kingdoms & Crowns**
- Leads with the Realm: a 3D low-poly world inside the homeschool app. Finishing assigned quests earns minutes there. In the Realm the hero does deeds that raise buildings in their village, casts spells from a spellbook, and works to win back a lost crown.
- Stack corrected to what the repo uses: Next.js, three.js with react-three-fiber, Drizzle, Turso. Hosted on Vercel.
- Status: in beta, invite-only.
- **Realm images are captured during the build.** Kylee confirmed that the hero names in the app's screenshots (Emma, Noah, and the parent Jordan) are demo personas, so the screenshots already on the site are fine. The existing Realm captures are still unusable: they were taken as a visiting parent and carry a "visiting" banner. The builder runs Kingdoms & Crowns locally in its demo mode, from the repo at `\\wsl.localhost\Ubuntu\home\kylee\projects\kingdoms-and-crowns` exactly as it is checked out (no branch switching, no changes to that repo), and captures three or four clean Realm shots as the demo child. The repo's `scripts/capture-screens.mjs` shows how its demo personas are selected. If the app cannot be made to run locally, the panel describes the Realm in words with the existing app screenshots, and Kylee is told so plainly.

**The Budget** (currently "Family Budgeting")
- Links to the public demo: https://the-budget-demo.kyleelinmccarthy.workers.dev/login. The demo needs no login details: it offers "Explore as Person 1" and "Explore as Person 2", uses made-up data and resets every Monday.
- Renamed to match what the app calls itself.
- Hero image recaptured from the demo, after choosing "Explore as Person 1".

**Also on the go**
- Exactly three items, Kylee's choice:
  - **Paragon:** the existing entry and screenshots.
  - **Onboarding:** the existing forms entry, rewritten to cover client onboarding only.
  - **Tech Processes:** CI/CD automation, SDLC SOPs, automations, KPI management, dashboard automation and more. This is all Kylee has said about it, so it is a short list, not a case study.

**One art file is renamed**
- The Minecraft Christmas piece in the art gallery has a file name containing her children's names, and that name is visible in the page address. Kylee chose to keep the artwork and rename it. The image file, its alt-text key and anything that refers to it take a neutral name (for example `digitalminecraftxmas`).
- The names must not be written anywhere in the repo, including in a test or a comment. That rules out a test that bans them by name; the rename is the fix.
- Two loose ends to tell Kylee about, not to act on: the original file in her art folder still has the old name, so the next art import would bring it back unless she renames it there; and the old file name remains in the repo's git history.

### Staying as they are

Beacon, 403HQ, AURA, Ruckus, NBS Website, Ember Tattoo, the art and tattoo galleries (apart from the rename above), the three principles, off the clock, the career timeline and growth figures, and the contact form.

## How it is built

### Stack

The existing Next.js 15 / React 19 / TypeScript / Tailwind app stays, deployed as it is now. Added: `three`, `@react-three/fiber` and the minimum of helper libraries needed for bloom. This is the same 3D stack Kingdoms & Crowns' Realm uses.

### Pages

The address bar is the single source of truth for where the visitor is.

- `/` is the planet seen from space.
- `/places/[id]` is the planet with that place in focus and its panel open. One per place, generated at build time, each with its own title, description and share image.
- The 3D canvas lives in a shared layout so it does not restart when moving between these pages. Clicking a landmark, a label, an index entry or a tour arrow is ordinary navigation to another `/places/[id]`. The back button works for free.
- Old addresses redirect permanently: `/about` → `/places/home`, `/connect` → `/places/post`, `/work` → `/#index`, `/room` → `/places/art`.

Each page's content (the header and index on `/`, the panel on a place page) is rendered on the server as ordinary HTML. The canvas is layered behind it. This is what makes the site work without WebGL or JavaScript, and what search engines and screen readers get.

### Content model

Everything a visitor sees comes from typed content files. Components depend on the types, not the data.

- **Districts:** id, name, one-line description, colour, centre (latitude/longitude) and size.
- **Places:** id, district, name, descriptor, position, which model to draw, and what the panel holds. The panel content is one of a fixed set of kinds: `project`, `collection`, `about`, `principles`, `gallery`, `interests`, `contact`.
- **Projects:** the existing `content/projects.ts`, updated as above.
- **Sky:** the colour table per time of day, the hour bands and greetings, the constellations.
- **Tour:** an ordered list of place ids.

Two registries make the world open to extension without editing existing code:

- **Model registry:** model key → the component that draws that landmark. A place with no bespoke model gets a clean generic building in its district colour, so a new project works on the day it is added and can get its own landmark later.
- **Panel registry:** content kind → the component that renders it.

### Code layout

Three layers, each with one job:

- **Pure logic** (`lib/world/`): geometry on a sphere, the seeded terrain function, time-of-day rules, camera poses and flight paths, tour order. No React and no rendering. It may use three.js's maths classes and nothing else from it. This is where most unit tests live.
- **The 3D scene** (`components/world/`): the planet, sea, sky, clouds, landmarks, camera rig and labels. Each is a small component that takes data in.
- **The interface** (`components/hud/` and the panel renderers): header, legend, tour bar, index, theme button, panel.

The terrain and all scatter (trees, city blocks, stars) come from a seeded generator, so the world is identical on every visit and testable.

### State

- Which place is in focus: the URL.
- Day or night: an attribute on the page, set before first paint, as the theme is today. The choice made with the button lasts for the visit; a new visit follows the clock again.
- Camera motion and hover: local to the canvas.

No state library.

### When 3D is not available

- **No WebGL, or the canvas fails:** a pre-rendered picture of the planet (one for day, one for night) sits where the canvas would be. All content and navigation still work.
- **Reduced motion:** the planet does not turn by itself, the camera cuts instead of flying, and ambient animation (twinkle, surf, shooting stars, drifting clouds) is off.
- **Slow devices:** a lower quality tier without bloom and with fewer stars. Chosen up front on small or low-memory devices, and dropped to automatically if frames run long.
- **No JavaScript:** the header, the full index as links, and each place's content.

### Performance

- The 3D code loads after the page is readable. The pre-rendered picture shows in the meantime, so nothing jumps.
- Budget on a mid-range laptop: content readable in under 1.5 seconds, planet interactive in under 3, and a steady 60 frames a second in orbit.
- Building the terrain must not freeze the page for more than about 200 ms. If it does, it moves to a background thread or is pre-computed at build time.
- Repeated things (trees, blocks, stars) are drawn as instances. The render loop pauses when the tab is hidden.

### Accessibility

- Labels are real links. The tour bar, index, legend and panel are fully keyboard-operable with visible focus.
- The canvas itself is decorative to assistive technology; the index is the equivalent.
- Text contrast meets WCAG AA against the sky in all four times of day. Automated accessibility checks stay in CI, covering `/` and one place of each kind, in both modes.
- Exactly one top-level heading per page, as today.

### Security

- No third-party scripts or CDNs for the world. three.js is bundled; fonts are self-hosted through the framework.
- A Content-Security-Policy header is added, alongside the existing security headers, allowing only what the site uses (itself, Cloudflare Turnstile for the contact form, Vercel analytics).
- Outbound links come only from the content files and open with `rel="noopener noreferrer"`.
- The contact endpoint is untouched.
- CI gains a dependency audit step.

### Testing

Written test-first, as the repo already does.

- **Unit:** sphere geometry, terrain determinism, time-of-day rules, camera poses, greetings.
- **Content integrity:** every place has a unique id, a real district, a registered model and content that exists. Every place sits on land and keeps a minimum distance from its neighbours. The tour visits every place exactly once. Every image exists and has alt text. The removed projects are gone.
- **Components:** each panel kind, the index, the tour bar, the theme button.
- **End to end:** the index lists every place; opening a place changes the URL and shows its panel; the tour steps forward and back; a place URL loads directly; the back button returns; old addresses redirect; the theme button works; the contact form still sends; the site works with WebGL disabled and with reduced motion; no console errors with the canvas running.
- **Look:** the builder reviews screenshots of the planet and of each landmark close-up, day and night, against the look test. This is a human check, not an automated one.

### Retired

The scroll journey, the rooms, the library and bookshelf, the sticky-note desk, the room backdrop photographs, the `/about`, `/work`, `/connect` and `/room` pages, their tests, and the four current typefaces. Anything reused (gallery, lightbox, contact form, tech chips, portrait, growth bars) is restyled to the new look.

## Decided by Kylee

- One tiny planet, not a solar system or a data globe.
- The world replaces the whole old site.
- Luminous skies with clean cel shading; nothing childish or cartoony.
- Day mode and night mode, with sun, clouds and weather by day and stars, moon, shooting stars, a comet and constellations by night.
- The four greetings stay.
- Free roam plus a tour.
- All four groups of living details.
- **Landmarks are modelled in code**, not imported from Blender. A shared toolkit provides bevels, rounded edges, the cel material and tinted outlines, and each landmark is built from it. The model registry means any landmark can be swapped for an imported model later. **Kylee reviews close-ups of the first five (Beacon, Eliminated, Jimothy & Pidge, Kingdoms & Crowns, Home) before the other fourteen are built.**
- The hero names in the Kingdoms & Crowns screenshots are demo personas; the builder captures the Realm images in demo mode.
- The Minecraft Christmas art piece stays, under a neutral file name.
- "Also on the go" is exactly Paragon, Onboarding and Tech Processes.
- Both takeaways: volume with quality, and "I'd want to work with her."

## Calls I made

Kylee has not been asked about these. Each is easy to change now.

1. **It is built on a branch and replaces the live site in one go.** The current site stays live and untouched on `main` until Kylee has seen the finished planet and says to switch. Nothing is pushed or deployed without her asking. A place whose landmark is not finished shows the generic building in the meantime, so the site is whole at every step of the build.
2. **Each place has its own URL** (`/places/beacon`), so a project can be linked directly and shared with a proper preview.
3. **The sky follows the visitor's clock** on arrival, and a manual Day/Night choice lasts only for that visit.
4. **Morning and evening tints**, the four constellations, and the permanent rain on Jimothy's alley.
5. **The tour starts at Home** (who she is, then how she thinks) before the work.
6. **Typefaces change** to Bricolage Grotesque, DM Sans and DM Mono. The handwritten name logo is retired with the old fonts.
7. **"Family Budgeting" is renamed "The Budget"** to match the app.
8. **The welcome line becomes "Come have a look around."** The old one ("Come on in, the door's open.") was about a door that no longer exists.
9. **The game's title is "Jimothy & Pidge: Shenanigans in Seattle".**
10. **No engineering statistics for the games** (test counts, line counts). The repos' own documents disagree with each other on these, so the panels describe the engineering in words. Kylee can add exact numbers she is confident in.
11. **A Content-Security-Policy and a dependency audit** are added.
12. **External Payroll and the forms/upload material are deleted**, not archived.

## Left to the builder

- Exact positions of places on each island, within the rule that they sit on land and do not crowd each other.
- The detailed design of each landmark, within the look rules and the bar above.
- Which helper library provides bloom, as long as the result matches the look test.
- How the terrain is computed without freezing the page.
- How the pre-rendered planet pictures are produced.
- The exact wording of the Content-Security-Policy.
- Phone layout: the panel becomes a bottom sheet and the legend collapses, but the details are open.

## Risks

- **The landmarks are the whole impression.** Nineteen well-modelled landmarks is the largest piece of work here and the easiest to under-deliver. Plan it as its own phase. The first five go to Kylee for approval before the rest are started, so a miss on the look costs five landmarks, not nineteen.
- **Performance on phones.** The quality tiers exist for this. Test on a real phone early, not at the end.
- **The 3D canvas cannot be meaningfully unit-tested.** That is why the logic is kept out of it and the look is a human review.
