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

This holds **how Kylee thinks** — a small number of named principles in her own words,
drawn from the interview (below), not invented. Short. This is the room that makes the
rest of the site mean something, and it is also the room most likely to sound like a
LinkedIn post if it is written carelessly, so it stays brief and concrete.

### 3. The Floor

The gallery. Four to six pieces, hung and spaced rather than stacked.

Each piece gets: what it is, the problem it solves, **why it is built the way it is**, and
a little of the stack. That third item is the one no current card has and the one that
shows judgement rather than output.

Beside each piece is a placard. Lifting it reveals the part that didn't work — what got
thrown away, what would be done differently. Every featured piece must have one. A
gallery where nothing ever failed is a brochure.

**Proposed six**, chosen to span range rather than rank importance:

| Piece | Why it earns a wall |
| --- | --- |
| 403HQ | Six weeks, real stakes, a client already leaving |
| AURA | Build-over-buy at its cleanest — a vendor licence replaced by one script tag |
| Beacon | The operating model, and AI running under audit |
| Kingdoms & Crowns | Design-led, and built for her own kids |
| The Wretched Few | Story, HUD, UI/UX and art — all hers |
| Ember Tattoo | Pure design. Nobody asked. |

Swappable. The constraint is range, not seniority.

### 4. The Desk

A working desk under a lamp. Everything not on the wall lives here as sticky notes in
mixed colours — one project each, a few words, a live link where one exists. Notes lift
slightly as you point at them.

This is where the remaining eleven projects go. Honest, unpolished, and clearly the
overflow rather than the exhibition — which is the point.

### 5. The Way Out

The close and the existing door to `/room`. Contact sits below as a guestbook rather than
a lead-capture form: the inquiry-type dropdown is the most corporate object on the site.

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

**The interview is the critical path.** The Window and every placard need Kylee's actual
reasoning. Drafting them from repos would reproduce exactly the failure this overhaul
exists to fix. Structure and interaction can be built in parallel; the writing cannot
start without her answers.

**Five hand-built scene environments is a lot of surface.** Stairs, window light, placards,
sticky notes and the existing door each need to work in both themes, at every width, and
under `prefers-reduced-motion`. Each must degrade to plain readable content — the content
can never be gated behind an animation.

**Accessibility.** Everything touchable must be keyboard reachable and announced. `/room`
already sets the pattern with the door: a real link styled as an object, not a div with a
click handler. The axe sweep covers seven routes and must stay green.

## Open questions

1. Are those the right six pieces?
2. Does the guestbook framing survive, or does the contact form stay as it is?
3. Do the standalone pages (`/about`, `/leadership`, `/value`, `/connect`) keep their
   current names once the scenes they mirror are gone?

## The interview

Blocking. Per featured piece: what was actually hard — the part you'd warn someone about?
What did you build and throw away? What would you do differently now? Who was it for?

For The Window: What do you do when you're stuck? What makes you kill something you have
already built? What is a strong opinion you hold about software that other people
disagree with?
