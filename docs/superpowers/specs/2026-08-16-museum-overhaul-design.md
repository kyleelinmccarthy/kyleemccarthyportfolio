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

## Source material — Kylee's answers, verbatim

**These are her words, unedited — lowercase and typos included.** An earlier version of
this section paraphrased them, and the paraphrase silently dropped real phrases she used:
"like a lightbulb moment", and "just like the early days of Technology with computers, the
internet, Google". Copy written from those phrases then looked like invention to a
reviewer, because relative to the spec it was.

**Rule: every placard is written from this section.** Where she has a phrase, use her
phrase. If something is not here and not in `content/projects.ts`, it does not ship.
Tidying grammar and capitalisation for the page is expected. Adding a claim, a motivation,
a comparison, a causal link or an aphorism is not.

### Beacon
- **Hard:** "Capturing the needs of every role within a tech department in a single app in a user-friendly, adaptable way"
- **Threw away:** "I originally wrote an entirely different app called tech portfolio that completely got replaced with Beacon because it was on an old stack and had limited usability."
- **Differently:** "I would do smaller features more often because Beacon has a ton of features for our tech department and leadership teams and it's easy to add a lot in a small timeframe but then rollouts become more overwhelming to users with a lot of new features & functionality."
- **For:** "it was for me to run my IS department but also for my team and for the leadership team."

### 403HQ
- **Hard:** "myself and 1 other were mandated by leadership to build this for a high priority client in order to retain their contract and only had 6 weeks to build it, test it, pen test it and get it into production. this was the most challenging thing I've done in my career but we did it and actually did it with a couple of days to spare."
- **Threw away:** "the original branding was a placeholder, but during development the brand name just sort of came to me like a lightbulb moment."
- **Differently:** "change our testing approach because we dont have traditional qa or testing and our users struggle with testing so sometimes things get missed until production"
- **For:** "a high priority client and then a version 2 was made for another high priority client with slight tweaks"

### AURA
- **Hard:** "creating a flexible, compliant ADA widget with robust features that can be reused on a variety of sites regardless of the hosting sites tech stack. i had never built a widget before. this is one of my favorite apps because of the color controls and other fun things it can do such as adhd mode."
- **Threw away:** "again, branding here. i had no idea what i was going to call this widget until it was completely built. other than that i kept everything i built from day 1."
- **Differently:** "i would add a bit more into the widget about all of its capabilities for end users to understand, perhaps a notification or pop-up when they first see it."
- **For:** "it was requested by our SVP of tech in order to replace AccessiBe which cost the company money per site it is used on. AURA is hosted once and used as many times as we want."

### NBS Website
- **Hard:** "Capturing all the requests of the senior leader team as well as the board in a way that translates to a clean, modern, user friendly site"
- **Threw away:** "i built a connection to an internal app that was eventually thrown away and then replaced with a custom built feature for securely uploading documents by our users because we didn't want to have separate sites for these functions"
- **Differently:** "get more end user involvement earlier on to start the feedback cycle sooner"
- **For:** "it was for the company as a whole but for leadership/sales because our clients have been asking for a new website for years but prior tech leaders never prioritized it, so i just built it"

### Kingdoms & Crowns
- **Hard:** "compliance for child users and making it user friendly for all ages"
- **Threw away:** "i originally built integrations for other platforms and decided against it, figuring parents can share links to other platform curriculum eithout embedding it entirely, at least in iteration 1"
- **Differently:** "i would add a browser based education game where the students go on a quest to start their assignment and choose their path to either learn on another platform or have the option to learn within this platform itself through gamified lessons for core subjects"
- **For:** "my kiddos and myself to stay organized in an easy, fun way while homeschooling"

### ChemTreeHQ
- **Hard:** "building a multi-user whiteboard feature with follow along and dynamic saving for all users changes"
- **Threw away:** "i originally built another version for a different company that got scrapped and i reused the concept for this instead."
- **Differently:** "add more custom brainstorming features and prompts for prioritizing/organizing projects/ideas"
- **For:** "myself and a friend who wanted to collab on video game dev"

### The Wretched Few
- **Hard:** "everything. all the nuances that go into video game development. 3D modeling, game HUD, player UX, sfx, vfx, procedural map generation, cohesive story telling that aligns to combat and gameplay. it's a lot but i absolutely love it."
- **Threw away:** "a lot. a lot of early simple development for seeing, testing, and then throwing it away to build something better. iterative development."
- **Differently:** "this is still a work in progress so I'm still learning but I would spend more time diving into animation and 3D modeling rather than focusing so hard on the in game menu UI."
- **For:** "My friend had an inital game idea that I helped expand into a full story concept and then we decided to develop it together. it's for gamers like us."

### The Window

**Stuck:** "I do stream of consciousness writing when I'm stuck. with real pencil & paper.
getting thoughts our or just writing *something* helps me get unstuck. or talk to someone
about the project. i keep moving, basically. an object in motion stays in motion."

**Killing something already built:** "i hate the concept of 'if its not broke dont fix it'
because that is the enemy of progress. theres always a better way. its just a matter of
prioritizing time and resources on which thing is most urgent and important in a given
moment. but nothing is sacred. anything can be scrapped for something else if its deemed
to be the top priorty at that time."

**The opinion others disagree with:** "i really enjoy AI. i dont think AI is the problem, I
think greedy people misusing it are. it has great potential as a tool, just like the early
days of Technology with computers, the internet, Google, etc. It doesn't have to replace
people. it's just another tool on the belt for people who know how to use it effectively
and in integrity."

### On `whyBuiltThisWay`

**This field has no direct source** — she was never asked it. It must be assembled from
`content/projects.ts` and the answers above, stated plainly. It must not become the place
where invented reasoning and writerly aphorisms collect, which is exactly what happened on
the first attempt. If a piece has nothing sourceable to say about why it is built the way
it is, the field says less rather than more.
