# The Museum Overhaul — Design

**Date:** 2026-08-16
**Status:** Draft for review
**Supersedes:** the content layer of `2026-08-15-real-content-showcase-design.md` (its media pipeline, `/room`, and project data all stand)

## Problem

The site reads as a résumé with animation on it. Measured against the portfolios Kylee
pointed at — bek.is, marco.fyi, destroytoday, narrowdesign, lucaorio, s-j-zhang,
michaelvillar, ashwinipurohit, joelcalifa — it differs in eight specific ways:

1. **It opens with a job description, not a point of view.** bek.is opens *"Every step
   more humane than the last."* narrowdesign: *"Design something familiar, program it to
   do something unexpected, make sure people feel something."* This site's "How I create
   value" is four capability chips — a services menu.
2. **Process is absent.** bek.is names six principles. lucaorio puts Workflow *before*
   Portfolio. This site never says how Kylee works or why.
3. **Every case is the same template.** All 17 projects are Problem → What I Built →
   Outcome. Seventeen times. It reads as a database because it is one. **This is the
   single largest cause of the robotic feel.**
4. **It is exhaustive where the references are selective.**
5. **Taste is missing.** s-j-zhang publishes a reading list; bek.is mentions music,
   jewelry, motorcycles, plants. Here, interests are a bulleted list behind a door.
6. **Nothing failed.** narrowdesign says *"I didn't get one…"* about an award and *"very
   little chance I'll ever love a project more"* about a project. Every claim on this
   site is a win, which reads as a brochure.
7. **Interaction isn't identity.** Two good moments exist — the light switch and the
   door — and everything else fades in on scroll.
8. **Section names are consulting deck headings.** "Get to know." "How I lead." "How I
   create value."

## The idea

The site becomes a building you walk through. The existing `CinematicJourney` already
lays scenes on a 2D grid and moves a camera between them by direction. Today those
directions are decorative. **They become a floor plan.** The scroll stops being an effect
and starts being architecture — which also means the motion work already built is kept
and given a reason to exist.

Each room has its own light, its own setting, and one thing you can touch. The switch and
the door stop being exceptions and become the pattern.

## The floor plan

| # | Room | Grid move | What it holds | The object |
| --- | --- | --- | --- | --- |
| 1 | **The Steps** | `start` | One line about Kylee. Nothing else. | A short flight of stairs to a closed door. On arrival the door **opens by itself**, warm light spreads down the steps, and it says welcome. |
| 2 | **The Window** | `up` | How she thinks. A few short principles. Deliberately simple. | Light through a window, moving across the room as you scroll. |
| 3 | **The Floor** | `right` | 4–6 featured pieces: what it is, the problem it solves, **why it was built that way**, and a little of the stack. | A placard beside each piece; lift it for the part that went wrong. |
| 4 | **The Desk** | `right` | Everything else. One project per sticky note — a few words, a live link where there is one. | Sticky notes in mixed colours, peeling up as you point at them. |
| 5 | **The Way Out** | `in` | The close, and the door to `/room`. | The existing door. |

The light switch stays exactly what it is — the theme toggle in the nav. It is not
repurposed as the entrance.

**Why process comes before work:** lucaorio does this deliberately, and it changes how
everything after it reads. Seeing how someone thinks first turns a gallery of outcomes
into evidence.

## Rooms in detail

### 1. The Steps

Exterior, dusk. A short flight of stairs leads to a closed door. Within a beat of
arriving, the door swings open on its own and warm interior light widens across the
steps. One line of copy, and the name.

No stat, no title, no CTA. The whole job of this room is to make someone want to come in.

Reduced motion: the door renders already open and the light already spilled. No swing, no
delay, no content gated behind an animation.

### 2. The Window

The first room inside. Quiet. A window on one wall with daylight coming through, and the
light shifts across the floor as the reader scrolls.

This holds **how Kylee thinks** — three principles, in her words, from the interview. Not
invented, not expanded into thought-leadership. This room is the one most likely to sound
like a LinkedIn post if written carelessly, so it stays short and keeps her phrasing.

**1. Keep moving.** Stuck means stream-of-consciousness writing, on real pencil and
paper — or talking it through with someone. Writing *something* is what breaks it.
> "I keep moving, basically. An object in motion stays in motion."

**2. Nothing is sacred.** She rejects "if it's not broke don't fix it" outright. There is
always a better way; the only real question is what deserves the time right now.
> "That is the enemy of progress. Nothing is sacred. Anything can be scrapped for
> something else if it's the top priority at that time."

This is the principle the whole Floor demonstrates — Beacon replaced her own earlier app,
ChemTreeHQ reused a concept from a scrapped build, The Wretched Few is built by throwing
work away on purpose.

**3. AI is a tool, and the people are the problem.** The one opinion she holds that others
argue with.
> "I don't think AI is the problem, I think greedy people misusing it are. It doesn't have
> to replace people. It's just another tool on the belt for people who know how to use it
> effectively and in integrity."

Worth siting here rather than burying: she runs six systems on AI under audit, so this is
a practitioner's position, not a take.

### 3. The Floor

The gallery. Four to six pieces, hung and spaced rather than stacked.

Each piece gets: what it is, the problem it solves, **why it is built the way it is**, and
a little of the stack. That third item is the one no current card has and the one that
shows judgement rather than output.

Beside each piece is a placard. Lifting it reveals the part that didn't work — what got
thrown away, what would be done differently. Every featured piece must have one. A
gallery where nothing ever failed is a brochure.

**The seven, chosen by Kylee.** Deliberately mixed — four on the clock, three off it —
so the wall reads as one person rather than as a work history with a hobby appendix.

| Piece | | Why it earns a wall |
| --- | --- | --- |
| Beacon | work | Every role in a tech department, one adaptable app |
| 403HQ | work | Two people, six weeks, a contract on the line |
| AURA | work | Had never built a widget; it has to work on any host stack |
| NBS Website | work | Years of asking, never prioritised, so she just built it |
| Kingdoms & Crowns | personal | Child-user compliance, usable at every age |
| ChemTreeHQ | personal | Multi-user whiteboard with follow-along and live saving |
| The Wretched Few | personal | 3D, HUD, UX, sfx, vfx, procedural maps, story |

Ember Tattoo and Eliminated move to The Desk.

### 4. The Desk

A working desk under a lamp. Everything not on the wall lives here as sticky notes in
mixed colours — one project each, a few words, a live link where one exists. Notes lift
slightly as you point at them.

This is where the remaining eleven projects go. Honest, unpolished, and clearly the
overflow rather than the exhibition — which is the point.

### 5. The Way Out

The close and the existing door to `/room`.

Contact becomes **a mailbox** — you send a digital letter, not a lead-capture submission.
The inquiry-type dropdown is the most corporate object on the site and it goes. The form
underneath keeps its validation, Turnstile and error handling, including the mailto
fallback on every failure path; only the framing and the fields change.

Success state is the letter going in, not "Message sent."

## Voice

Written down so it can be enforced in review rather than argued each time. Derived from
Kylee's own prose — short declaratives, concrete openings, plain conclusions stated
without hedging — and from the reference sites.

- Short declaratives. Concrete before abstract.
- No adjective stacking. No sentence that could appear in a consulting deck.
- Contractions, always.
- Every featured piece names something that did not work.
- **No metric anywhere in the building except where a number is the actual point.** The
  delivery figures, headcounts and platform counts move to `/about` and `/leadership`,
  where someone looking for them will find them, and stop being the second thing a
  visitor reads.
- Nothing invented. Every claim traceable to a repo, a commit, or something Kylee said.

## What is deleted

The five current scene names. All 17 Problem/Built/Outcome blocks in their current form.
The stat wall in the Lead scene. The four "How I create value" capability chips. The
inquiry-type dropdown.

## What is kept

The media pipeline and every generated image. `/room` and the door, unchanged. The theme
switch. `CinematicJourney` and its camera — repurposed, not replaced. The standalone
pages, which become where the résumé-shaped facts live.

## Risks

~~**The interview is the critical path.**~~ Done — see Source material. The writing is
unblocked. The remaining risk is the opposite one: the answers are better than anything
written for this site so far, and the temptation will be to smooth them into house style.
Don't. Where she has a phrase, keep her phrase.

**Five hand-built scene environments is a lot of surface.** Stairs, window light, placards,
sticky notes and the existing door each need to work in both themes, at every width, and
under `prefers-reduced-motion`. Each must degrade to plain readable content — the content
can never be gated behind an animation.

**Accessibility.** Everything touchable must be keyboard reachable and announced. `/room`
already sets the pattern with the door: a real link styled as an object, not a div with a
click handler. The axe sweep covers seven routes and must stay green.

## Open questions

1. ~~Are those the right pieces?~~ Resolved: Kylee's seven, four work and three personal.
2. ~~Guestbook or form?~~ Resolved: a mailbox you post a digital letter into.
3. The standalone pages (`/about`, `/leadership`, `/value`, `/connect`) mirror scenes that
   will no longer exist under those names, and `/about` and `/leadership` become where the
   moved statistics live. Renaming and rehoming is a planning decision.

---

## Source material

Kylee's interview answers. **Every placard is written from these and nothing else.** Where
a phrase of hers is good, use her phrase. Anything not traceable to this section or to a
repo does not go on the wall.

### Beacon
- **Hard:** capturing the needs of every role in a tech department in a single app, in a way that stays user-friendly and adaptable.
- **Threw away:** an entire earlier app of her own — Tech Portfolio — on an old stack with limited usability. Beacon replaced it outright.
- **Differently:** smaller features, shipped more often. It's easy to add a lot quickly, but then rollouts land on users as an overwhelming pile of new functionality at once.
- **For:** herself, to run the IS department — and her team, and the leadership team.

### 403HQ
- **Hard:** she and one other person were mandated to build it to retain a high-priority client. Six weeks to build, test, pen test and reach production. *"The most challenging thing I've done in my career."* They finished with a couple of days to spare.
- **Threw away:** the original branding was a placeholder. The real name arrived mid-development, all at once.
- **Differently:** the testing approach. There's no traditional QA, users struggle with testing, and things occasionally reach production that shouldn't.
- **For:** a high-priority client — then a second version for another, with tweaks.

### AURA
- **Hard:** a flexible, compliant ADA widget with real features that drops into any site regardless of the host's stack. She'd never built a widget before. *One of her favourites* — the colour controls, and things like ADHD mode.
- **Threw away:** branding again; no idea what to call it until it was finished. Everything else built on day one survived.
- **Differently:** surface its own capabilities — a first-run notification so people know what it can do.
- **For:** requested by the SVP of Tech to replace accessiBe, which charged per site. AURA is hosted once and used as often as they like.

### NBS Website
- **Hard:** turning every request from the senior leadership team and the board into something clean, modern and actually usable.
- **Threw away:** a connection to an internal app, replaced with a custom secure document-upload feature — they didn't want users bouncing between separate sites.
- **Differently:** get end users involved earlier and start the feedback loop sooner.
- **For:** the company, but really leadership and sales. Clients had asked for a new site for years and previous tech leaders never prioritised it. *"So I just built it."*

### Kingdoms & Crowns
- **Hard:** compliance for child users, and making it usable across a wide age range.
- **Threw away:** integrations with other curriculum platforms. Parents can share links instead of the app embedding everything — at least in iteration one.
- **Differently:** a browser-based education game where students go on a quest to start an assignment and choose their path — learn on another platform, or learn in-app through gamified lessons for core subjects.
- **For:** her kids and herself, to stay organised while homeschooling without it being a chore.

### ChemTreeHQ
- **Hard:** a multi-user whiteboard with follow-along and live saving of every user's changes.
- **Threw away:** an earlier version built for a different company that got scrapped; she reused the concept here.
- **Differently:** more custom brainstorming features, and prompts for prioritising and organising ideas.
- **For:** herself and a friend who wanted to collaborate on game development.

### The Wretched Few
- **Hard:** *"Everything."* 3D modelling, the game HUD, player UX, sfx, vfx, procedural map generation, and storytelling that stays coherent with combat and gameplay. *"It's a lot but I absolutely love it."*
- **Threw away:** a lot, deliberately. Build something simple, see it, test it, throw it out, build it better.
- **Differently:** still in progress. She'd spend more time on animation and 3D modelling and less on in-game menu UI.
- **For:** her friend had the initial idea; she expanded it into a full story concept and they're building it together. *"It's for gamers like us."*
