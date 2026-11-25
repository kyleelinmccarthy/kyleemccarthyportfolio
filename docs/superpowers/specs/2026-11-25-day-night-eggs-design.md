# Two secrets by day, two by night

Date: 2026-11-25. Status: draft for the owner's approval.

## Why

The planet has two easter eggs today, one per theme (`content/eggs.ts`):

- **By day**, the bumblebee (`components/eggs/Bug.tsx`, `Bumblebee.tsx`): it
  flies low over the land and lands now and then. Pressing it pops it into
  confetti with "It's a feature, not a bug." and a count kept on the device
  ("Bugs squashed: N").
- **By night**, the constellation "The Natural 20" (`RollStars.tsx`): pressing
  it rolls a d20 across the screen (`Die.tsx`); a 20 sets off fireworks.
  Typing `roll` anywhere outside a field rolls it at any hour.

The owner wants each theme to have two secrets, so whichever one a visitor
sees, they have two things to find. Each new egg mirrors one from the other
theme:

- **By night, a bee constellation.** It does what the day bee does.
- **By day, a flying d20 with dragon wings.** It does what The Natural 20 does.

## Goals

- Night: a new constellation shaped like a bumblebee. Pressing it gives the
  bee's payoff exactly: the confetti burst at the press, the "It's a feature,
  not a bug." bubble, and one more on the same shared "Bugs squashed" count
  (`eggs.squash`). This is option B, chosen by the owner.
- Day: a d20 with dragon wings flying round the planet, in the world. Pressing
  it rolls the d20, the same roll as The Natural 20 and `roll`
  (`rollForVisitor`): the tumble, the result line, and fireworks on a 20.
  This is option A, chosen by the owner.
- Each egg keeps the existing eggs' manners. It is a pointer extra: decorative,
  with nothing on the site reachable only through it. It shows a pointer on
  hover. A drag across it is a drag, not a press (`isClick`). Anything nearer
  the camera takes a press first. It is calm under reduced motion. It stops
  while the tab is hidden (it runs on the canvas's clock).

## Non-goals

- No change to what the d20 roll, the confetti or the bubble look like or say.
- No new counter. The bee constellation adds to the existing bug count, and
  the flying die adds nothing.
- No sound beyond what the existing payoffs already play.
- Typing `roll` stays as it is.

## Anti-goals (a failure even if it works)

- The flying die must never get in the way of the site. It must not sit over a
  landmark long enough to steal the presses meant for it, and it must not be
  the reason a press on the planet misses. It is never out at a district or a
  place, so it cannot cover what a visitor is reading.
- It must not look pasted on. It is modelled and shaded like the bee and the
  landmarks (the kit's parts, cel shading, indigo outlines), not a flat sprite.
- No ladybugs, anywhere, ever (the owner's standing preference).

## Approaches considered (for the flying d20)

- **A. A 3D winged die flying round the planet, in the world. Chosen.** It
  matches the bee, reuses its flight and press code, and is counted in the
  planet's budgets. The trade-off is that a visitor only sees it while it is on
  their side of the planet, so it is found rather than shown.
- **B. A flat die flapping across the screen every couple of minutes.** It is
  cheap and everyone sees it, but it looks pasted on, and an interruption that
  keeps coming back wears thin.
- **C. The Mountain's die sprouting wings and flying round the peak.** It ties
  into an existing landmark, but it is tied to one place, and its press would
  fight the Mountain's own press (which takes you to the place).

## The design

### Night: the bee constellation

- **Data.** A new entry in `constellations` (`content/sky.ts`), drawn as the
  others are: stars at the points, lines between them, and its name on the sky.
  The figure is a bumblebee seen from above, readable at a glance: a round
  body with a band or two across the abdomen, a head, two wings, and two
  feelers. It needs about as many stars as Jimothy Major (around 15 to 20) and
  stays within the size the other figures use.
- **Name.** DRAFT for the owner's review: "The Bumblebee".
- **Placement.** Somewhere on the sky clear of the four existing figures and
  their names (The Crown at -10, -166; Jimothy Major at -15, 153; The Natural 20
  at 10, 66; The Pencil at -6, -72). A suggestion is around lat 14, lon -118,
  between The Pencil and The Crown. It should be found by turning the planet,
  as The Natural 20 is, not hung in the opening view.
- **Press.** A generalised `RollStars`: one invisible ball over a named
  constellation's stars and name, with hover brightening the name
  (`.lm-const[data-hot]`), taking a press and calling a given action. The
  Natural 20 calls `rollForVisitor`. The Bumblebee calls
  `eggs.squash(pointOnScreen)` with the press's screen point, so the confetti
  bursts where the visitor pressed.
- **The constellation stays** after a press. The stars are not "gone" the way
  the day bee is, so it can be pressed again, and each press counts. The
  count's words are unchanged.

### Day: the dragon d20

- **The model** (`components/eggs/DragonDie.tsx`): the kit's d20 (`Die` in
  `components/world/models/kit.tsx`, as on the Mountain's ledge), in its own
  colours from the landmark palette. It is not the Mountain's purple, so it
  reads as its own creature. It has two bat-like dragon wings (a few ribs with a
  scalloped membrane between them, from `Extruded` plates or similar), each in
  its own hinge so the flight can beat them, and a short curling tail behind.
  It is no bigger than a landmark's smaller props. It faces +Z as the bee does,
  and it has its own triangle and draw budgets checked by a unit test (the
  bee's are 3,500 and 8 as a guide). It is counted in the planet's totals
  (`tests/unit/world/companions.test.tsx`), as the bee is.
- **The flight** (`components/eggs/Dragon.tsx`, with its maths pure in
  `lib/world/dragon.ts`, as the bee's is in `lib/world/bug.ts`): a slow,
  gently wandering loop round the planet, high enough to clear every
  landmark's top with room to spare. It flaps a few beats, then glides, then
  flaps again. It banks into its turns and bobs a little, and it faces the way
  it flies. The die turns slowly as it goes, so different faces show. Its
  shadow does not touch the ground (it is too high), and it has none. Its
  route and timing come from a seed, so a test can predict them. Its
  constants live in `content/eggs.ts` beside the bee's (`DRAGON`).
- **Press.** An invisible hit ball round it, a little bigger than the die and
  its wings but not as generous as the bee's, because it flies over things a
  visitor means to press. The usual rule stands: the nearest thing under the
  pointer takes the press. The flight never stops, so it only passes over a
  landmark briefly, and a short pass is acceptable (the builder's call, made
  in review). A press (not a drag) calls `rollForVisitor`. While a roll is out (`eggs` state
  `roll`), the flying die is hidden, as if it became the die tumbling across
  the screen. It is back once the roll clears.
- **Only by day.** It is mounted with the bee in `EggsInWorld` when the theme is
  day. At night the two constellations are there instead.
- **Only when zoomed out (the owner's decision).** The bee and the dragon die
  are both out only on the planet overview (`route.kind === 'overview'` in
  `WorldCanvas`), not while a district or a place is open. This is new for the
  bee: today it is out everywhere by day. `WorldCanvas` passes whether the
  overview is showing into `EggsInWorld`. When a visitor returns to the
  overview, a bee that was not caught simply appears again; it is not counted
  as caught. Zooming the overview in with the wheel does not hide them; only
  opening a district or a place does. The constellations are on the sky and
  stay pressable in every view, as The Natural 20 is today.
- **Reduced motion.** It hovers in one spot, wings still, and can still be
  pressed. The spot is chosen so it is not over any landmark from the
  overview camera, since it would sit there for as long as the visitor looks.
- **Day and night** follow the bee's rule: night is `look === 'night'`, so
  dusk counts as day.
- **Test hooks**, as the bee's: in an e2e build it is out only when a test asks
  (`window.__eggDragon`), so it cannot fly under another test's press. When
  out, it writes its screen point each frame (`window.__eggDragonScreen`).

### Where things change

- `content/sky.ts`: the new constellation.
- `content/eggs.ts`: the constellation's name constant, `DRAGON` tuning and
  colours, and the file's header comment (now four eggs).
- `components/eggs/RollStars.tsx`: generalised to a press area for a named
  constellation with an action (it may be renamed, e.g. `PressStars`).
- `components/eggs/EggsInWorld.tsx`: day mounts the bee and the dragon die
  (on the overview only); night mounts both constellations' press areas.
- `components/world/WorldCanvas.tsx`: tells `EggsInWorld` whether the overview
  is showing.
- New: `components/eggs/DragonDie.tsx`, `components/eggs/Dragon.tsx`,
  `lib/world/dragon.ts`, and their unit tests.
- `lib/eggs/hooks.ts`: the dragon's test hooks.
- `tests/e2e/eggs.spec.ts`: pressing The Bumblebee at night counts a bug.
  Pressing the dragon die by day rolls. With reduced motion, the dragon holds
  still and still rolls. With a place open, neither the bee nor the dragon is
  out, and both come back on the overview.

## Left to the builder

- The constellation's exact star layout, as long as it reads as a bumblebee
  from above.
- The dragon die's palette colours, wing shape, size, flight height and speed,
  and flap and glide rhythm, within the goals above.
- How the hit ball and hiding behave around a roll's start and end, as long as
  a press during a roll does nothing.
- Whether `RollStars` is renamed.
