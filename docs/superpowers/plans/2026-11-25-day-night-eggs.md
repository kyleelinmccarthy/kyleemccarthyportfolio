# Two Secrets By Day, Two By Night: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bumblebee constellation by night (pressing it counts a bug, as the day bee does) and a d20 with dragon wings flying round the planet by day (pressing it rolls), and show the day bee and dragon die only on the planet overview.

**Architecture:** The constellation is data in `content/sky.ts` plus a generalised version of the existing invisible press ball on the sky (`RollStars` becomes `PressStars`). The dragon die follows the bee's split: tuning in `content/eggs.ts`, pure flight maths in `lib/world/dragon.ts`, the model in `components/eggs/DragonDie.tsx`, and the per-frame flight and press in `components/eggs/Dragon.tsx`. `EggsInWorld` decides what is out from the theme and from whether the overview is showing, which `WorldCanvas` passes in.

**Tech Stack:** Next.js 15, React 19, React Three Fiber, three.js, Vitest (unit, with the repo's R3F `mount` helper), Playwright (e2e, `chromium` and `mobile` projects).

**Spec:** `docs/superpowers/specs/2026-11-25-day-night-eggs-design.md`

## Global Constraints

- Every egg is a pointer extra: decorative, with nothing on the site reachable only through it.
- Press, not drag: every press handler checks `isClick(e.delta)` (`lib/world/rig`) and calls `e.stopPropagation()`.
- Hover shows `canvas.style.cursor = 'pointer'`, and leaving or unmounting clears it.
- Nearest wins: no custom press arbitration. The hit meshes are ordinary invisible meshes.
- Night is `look === 'night'`, as today. Dusk counts as day.
- The bee and the dragon die are out only on the overview (`route.kind === 'overview'`), never while a district or a place is open. Wheel-zooming the overview does not hide them.
- The Bumblebee press calls `eggs.squash({ x, y })` with the press's client coordinates. It adds to the same `Bugs squashed` count and uses the same words, with nothing new said.
- The dragon die press calls `rollForVisitor()`. While `useEggs().roll !== null`, the die is invisible and its press does nothing.
- Colours come from `landmark` in `content/sky.ts`. Darks are indigo, never black, and no flat primaries.
- Words drafted for the owner are marked `DRAFT` in a comment, as `content/eggs.ts` does.
- No ladybugs anywhere (the owner's standing preference).
- Commit messages carry no `Co-Authored-By` or AI-attribution trailer: the repo's git hook rejects them.
- The comment style matches the codebase: full sentences, British spellings as used (`colour`, `centre`), and a doc comment on every exported thing.

## Review Focus

1. **A press on the dragon die mid-roll.** It must do nothing: no second roll, no cursor. This is pinned in Task 5's e2e test.
2. **Leaving the overview while the bee or die is under the pointer.** The cursor must not stay as a pointer on the place view. This is pinned in Task 2's e2e test.
3. **Reduced motion over a landmark.** The die's hold point must be at least `DRAGON.holdClear` degrees from every place. This is pinned in Task 3's unit test.
4. **Flying through a landmark or the camera's nearest zoom.** The flight radius must clear every `landmarkTop` with room to spare and stay inside `ORBIT_NEAREST`. This is pinned in Task 3's unit test.
5. **The constellation's press ball swallowing another figure's.** The Bumblebee must sit well apart from the other four (at least 30 degrees between `at`s), so neither press ball covers the other's stars. This is pinned in Task 1's unit test.

---

### Task 0: Commit the bumblebee that replaced the ladybug

The working tree on `main` holds the finished, tested bumblebee change and the approved spec. Branch first, then commit them as a baseline.

- [ ] **Step 1:** `git switch -c feat/day-night-eggs`
- [ ] **Step 2:** Run `npx vitest run tests/unit/eggs tests/unit/world/bug.test.ts tests/unit/world/companions.test.tsx`. Expected: all pass.
- [ ] **Step 3: Commit.**

```bash
git add components/eggs content/eggs.ts lib/world/bug.ts tests/unit/eggs tests/unit/world/companions.test.tsx tests/e2e/eggs.spec.ts docs/superpowers/specs/2026-11-25-day-night-eggs-design.md docs/superpowers/plans/2026-11-25-day-night-eggs.md
git commit -m "feat: a bumblebee in place of the ladybug; spec and plan for day and night eggs"
```

---

### Task 1: The Bumblebee constellation, and pressing it counts a bug

**Files:**
- Modify: `content/sky.ts` (the `constellations` array)
- Modify: `content/eggs.ts` (a new constant beside `ROLL_CONSTELLATION`, and the header comment)
- Rename and modify: `components/eggs/RollStars.tsx` → `components/eggs/PressStars.tsx`
- Modify: `components/eggs/EggsInWorld.tsx`
- Test: `tests/unit/world/content.test.ts`, `tests/e2e/eggs.spec.ts`

**Interfaces:**
- Produces: `BEE_CONSTELLATION = 'The Bumblebee'` (DRAFT name) exported from `content/eggs.ts`.
- Produces: `PressStars({ name, onPress }: { name: string; onPress(at: { x: number; y: number }): void })`. It is the old `RollStars` body with the name and the action passed in. `onPress` receives `{ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }`. The mesh is named `press-stars-${constellationLabelId(name)}`.
- Produces: night in `EggsInWorld` renders `<PressStars name={ROLL_CONSTELLATION} onPress={() => rollForVisitor()} />` and `<PressStars name={BEE_CONSTELLATION} onPress={(at) => eggs.squash(at)} />`.

- [ ] **Step 1: Write the failing unit test.** In `tests/unit/world/content.test.ts`, change the existing name list to five names, and add a separation test:

```ts
it('has the five constellations, each with in-range lines', () => {
  expect(constellations.map((c) => c.name)).toEqual(['The Crown', 'Jimothy Major', 'The Natural 20', 'The Pencil', 'The Bumblebee'])
  // (the existing in-range line loop stays as it is)
})

it('hangs The Bumblebee well apart from every other figure', () => {
  const bee = constellations.find((c) => c.name === BEE_CONSTELLATION)!
  for (const c of constellations) if (c !== bee) expect(angleDeg(dirOf(bee.at), dirOf(c.at)), c.name).toBeGreaterThan(30)
  expect(bee.points.length).toBeGreaterThanOrEqual(12)
  expect(bee.points.length).toBeLessThanOrEqual(22)
})
```

(`angleDeg` and `dirOf` come from `@/lib/world/geo`, as in `tests/unit/world/bug.test.ts`.)

- [ ] **Step 2:** Run `npx vitest run tests/unit/world/content.test.ts`. Expected: FAIL, because the name list lacks 'The Bumblebee'.
- [ ] **Step 3: Add the constellation.** Append it to `constellations` at `{ lat: 14, lon: -118 }`, with a comment describing the figure as Jimothy Major's does. It is a bumblebee from above, with its head toward +y: a round head, two feelers, two wings spread up and out from the body's shoulders, and an oval body crossed by two bands. Keep it within the other figures' extent (about ±4.6 in x and y) and between 12 and 22 points. Add `BEE_CONSTELLATION` to `content/eggs.ts`, marked DRAFT. Update the header comment there to describe four eggs, two per theme.
- [ ] **Step 4:** Run `npx vitest run tests/unit/world/content.test.ts tests/unit/world/starfield.test.ts tests/unit/world/labels.test.ts tests/unit/hud/Labels.test.tsx`. Expected: PASS. The starfield and label tests already loop over every constellation.
- [ ] **Step 5: Generalise `RollStars` into `PressStars`** with the interface above (`git mv` the file), and mount both in `EggsInWorld` at night. Update the doc comments in `PressStars`, `EggsInWorld` and `components/eggs/Eggs.tsx` to describe both figures.
- [ ] **Step 6: Write the e2e test.** In `tests/e2e/eggs.spec.ts`, generalise `turnToTheNatural20(page)` into `turnToConstellation(page, name: string)`, which finds `#label-const-${slug}` via the same slug as `constellationLabelId`. Keep the old call sites working through it. Add to `test.describe('the d20')`'s sibling, a new `test.describe('the bumblebee constellation')`:

```ts
test('at night, pressing The Bumblebee counts a bug, as catching the bee does', async ({ page }) => {
  drivesTheCanvas()
  await planet(page, 'night')
  const name = await turnToConstellation(page, BEE_CONSTELLATION)
  await page.waitForTimeout(800)
  const box = (await name.boundingBox())!
  const at = { x: box.x + box.width / 2, y: box.y - 50 }
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, at)).toBe('CANVAS')
  await press(page, at)
  await expect(said(page)).toHaveText(`${eggWords.feature} ${eggWords.squashed(1)}.`)
  await expect(page.locator('.egg-bubble')).toBeVisible()
  // It stays on the sky: a second press counts again.
  await expect(page.locator('.egg-bubble')).toBeHidden({ timeout: 10_000 })
  await press(page, at)
  await expect(said(page)).toHaveText(`${eggWords.feature} ${eggWords.squashed(2)}.`)
})
```

If `turnToConstellation` cannot bring the figure round within its 12 drags from the opening view, move the figure's `lon`, not the test's drag count, and re-run Step 4.

- [ ] **Step 7:** Run `npx playwright test tests/e2e/eggs.spec.ts -g "constellation|Natural 20"`. Expected: PASS on both projects.
- [ ] **Step 8: Commit.** Message: `feat: The Bumblebee constellation; pressing it counts a bug`.

---

### Task 2: The day bee is out only on the overview

**Files:**
- Modify: `components/world/WorldCanvas.tsx:253`
- Modify: `components/eggs/EggsInWorld.tsx` (`EggsInWorldProps`)
- Test: `tests/e2e/eggs.spec.ts`

**Interfaces:**
- Produces: `EggsInWorldProps.overview: boolean`, which is true only when `route.kind === 'overview'`. Task 5 mounts the dragon under the same condition.

- [ ] **Step 1: Write the failing e2e test** in `test.describe('the bug, by day')`:

```ts
test('it is out only on the overview: gone at a place, back on the overview', async ({ page }) => {
  drivesTheCanvas()
  await planet(page, 'day', { bug: true })
  const at = await bugOnScreen(page)
  await page.mouse.move(at.x, at.y)
  await page.goto('/places/post')
  await page.waitForFunction(() => ((window as unknown as { __worldFrames?: number }).__worldFrames ?? 0) > 10)
  expect(await page.evaluate(() => (window as unknown as { __eggBugScreen?: unknown }).__eggBugScreen ?? null)).toBeNull()
  expect(await page.evaluate(() => document.querySelector('canvas')!.style.cursor)).toBe('')
  await page.goBack()
  await bugOnScreen(page)
})
```

- [ ] **Step 2:** Run `npx playwright test tests/e2e/eggs.spec.ts -g "only on the overview"`. Expected: FAIL, because `__eggBugScreen` is still written at the place.
- [ ] **Step 3: Pass and use `overview`.** In `WorldCanvas`, pass `overview={route.kind === 'overview'}` to `EggsWorldLayer`. In `EggsInWorld`, by day, render `Bug` only when `overview`. `Bug` already clears its screen hook and cursor on unmount.
- [ ] **Step 4:** Run `npx playwright test tests/e2e/eggs.spec.ts`. Expected: PASS, apart from the known-flaky reduced-motion d20 test (`eggs.spec.ts:167`, which fails about 2 runs in 3 before this work). Note it in the task report rather than fixing it here.
- [ ] **Step 5: Commit.** Message: `feat: the day bee is out only on the planet overview`.

---

### Task 3: The dragon die's flight, as pure maths

**Files:**
- Modify: `content/eggs.ts` (add `DRAGON` and `dragonColors`)
- Create: `lib/world/dragon.ts`
- Test: `tests/unit/world/dragon.test.ts`

**Interfaces:**
- Produces, in `content/eggs.ts`:
  - `DRAGON` (`as const`) with these fields:
    - `speed: 7`: degrees of arc a second along its loop.
    - `wobble: 22` and `wobblePeriod: 75`: how far its loop's plane tips, in degrees, and over how many seconds it goes round once.
    - `above: 0.12`: world units its flight radius sits above the tallest `landmarkTop`.
    - `bob: 0.01` and `bobs: 0.7`: world units it bobs up and down, and how many times a second.
    - `flap: 1.4` and `glide: 2.6`: seconds of flapping, then seconds of gliding.
    - `beats: 6`, `beat: 0.7`, `open: 0.25`: wing beats a second, beat amplitude and the glide's tilt, in radians.
    - `spin: 0.35`: radians a second the die turns about its own up.
    - `bank: 0.5`: the most it leans into a turn, in radians.
    - `hit: 0.3`: the hit ball's radius, in model units.
    - `holdClear: 25`: the least degrees between the reduced-motion hold point and any place.
  - `dragonColors` with these fields:
    - `die: { from: landmark.teal, toward: landmark.green, k: 0.3 }`, mixed with `blend` as `bugColors.wings` is.
    - `membrane: { from: landmark.coral, toward: landmark.pink, k: 0.25 }`.
    - `ribs: landmark.indigo`, `tail: landmark.teal`, `eyes: landmark.offWhite`.
- Produces, in `lib/world/dragon.ts`:
  - `DRAGON_SEED: number`, which is `WORLD_SEED + 29`.
  - `DRAGON_TRIANGLE_BUDGET = 3_500` and `DRAGON_DRAW_BUDGET = 8`.
  - `dragonRadius(places: Place[], districts: District[]): number`. This is the largest `landmarkTop(place, districts).length()` plus `DRAGON.above`.
  - `dragonAt(seed: number, t: number, radius: number, out?: { at: Vector3; ahead: Vector3 }): { at: Vector3; ahead: Vector3 }`. It gives the die's centre in world units at `t` seconds, and the unit direction it flies.
  - `dragonBank(seed: number, t: number): number`, which is its lean, in radians.
  - `dragonWing(t: number): number`, which is a wing's turn from flat, in radians.
  - `dragonHold(places: Place[], districts: District[]): Vector3`, which is the reduced-motion hover point, as a unit direction.

  The path is closed-form in `t`, so time can jump. It is a great circle at `radius`, travelled at `DRAGON.speed` degrees a second. The circle's plane is tipped by `DRAGON.wobble` degrees about an axis that turns once every `DRAGON.wobblePeriod` seconds. The seed (via `mulberry32`) picks the circle's starting plane and phase. A bob of `DRAGON.bob × sin(2π·bobs·t)` is added along the outward direction. `ahead` is the normalised difference of `dragonAt` a small step either side, flattened against the outward direction. `dragonBank` is the signed turn rate of `ahead` over one second, scaled and clamped to ±`DRAGON.bank`.

  `dragonWing(t)` runs on a cycle of `flap + glide` seconds. During the flap it is `open + beat × sin(2π·beats·t)`. During the glide it is `open`. It eases between the two over 0.2 s, as `bugPace` does.

  `dragonHold` picks, from a lat/lon grid every 10°, the direction over firm land (`landValue(...).v >= FIRM_GROUND`) whose least angle to any place is largest. It must be at least `DRAGON.holdClear` degrees from every place.

- [ ] **Step 1: Write the failing tests** in `tests/unit/world/dragon.test.ts`, against `districts` and `places` from `@/content/world`:

```ts
it('flies clear of every landmark’s top, and inside the nearest the camera may come', () => {
  const r = dragonRadius(places, districts)
  for (const p of places) expect(r - landmarkTop(p, districts).length(), p.id).toBeGreaterThanOrEqual(DRAGON.above - 1e-9)
  for (let t = 0; t < 120; t += 0.5) {
    const { at } = dragonAt(DRAGON_SEED, t, r)
    expect(at.length()).toBeGreaterThan(r - DRAGON.bob - 1e-6)
    expect(at.length()).toBeLessThan(ORBIT_NEAREST - 0.1)
  }
})
it('is the same for the same seed and time, and moves smoothly at its speed', () => {
  const r = dragonRadius(places, districts)
  expect(dragonAt(DRAGON_SEED, 12.3, r).at.toArray()).toEqual(dragonAt(DRAGON_SEED, 12.3, r).at.toArray())
  const a = dragonAt(DRAGON_SEED, 10, r).at.clone().normalize()
  const b = dragonAt(DRAGON_SEED, 11, r).at.clone().normalize()
  expect(angleDeg(a, b)).toBeGreaterThan(DRAGON.speed * 0.6)
  expect(angleDeg(a, b)).toBeLessThan(DRAGON.speed * 1.6)
})
it('faces the way it flies, flat to the ground under it', () => {
  const r = dragonRadius(places, districts)
  const { at, ahead } = dragonAt(DRAGON_SEED, 30, r)
  const next = dragonAt(DRAGON_SEED, 30.2, r).at
  expect(Math.abs(ahead.dot(at.clone().normalize()))).toBeLessThan(1e-3)
  expect(next.clone().sub(at).dot(ahead)).toBeGreaterThan(0)
})
it('banks no further than its most', () => {
  for (let t = 0; t < 200; t += 1.7) expect(Math.abs(dragonBank(DRAGON_SEED, t))).toBeLessThanOrEqual(DRAGON.bank + 1e-9)
})
it('flaps, then glides with its wings held at their tilt', () => {
  const glideMid = DRAGON.flap + DRAGON.glide / 2
  expect(dragonWing(glideMid)).toBeCloseTo(DRAGON.open, 6)
  const beatsSeen = new Set(Array.from({ length: 20 }, (_, i) => Math.round(dragonWing(0.3 + i * 0.05) * 100)))
  expect(beatsSeen.size).toBeGreaterThan(5)
})
it('holds, under reduced motion, over firm land well clear of every place', () => {
  const hold = dragonHold(places, districts)
  for (const p of places) expect(angleDeg(hold, dirOf(p.at)), p.id).toBeGreaterThanOrEqual(DRAGON.holdClear)
  expect(landValue(hold, districts).v).toBeGreaterThanOrEqual(FIRM_GROUND)
})
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/world/dragon.test.ts`. Expected: FAIL, because the module is not found.
- [ ] **Step 3: Implement** `DRAGON`, `dragonColors` and `lib/world/dragon.ts` to the interfaces above. If no grid point meets `holdClear` over firm land, the test says so. Lower `holdClear` only after confirming with the plan's owner, not silently.
- [ ] **Step 4:** Run `npx vitest run tests/unit/world/dragon.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** Message: `feat: the dragon die's flight, as pure maths`.

---

### Task 4: The dragon die's model

**Files:**
- Create: `components/eggs/DragonDie.tsx`
- Create: `tests/unit/eggs/dragonDieMount.tsx`, `tests/unit/eggs/dragonDie.test.tsx`
- Modify: `tests/unit/world/companions.test.tsx` (the planet-totals test)

**Interfaces:**
- Consumes: `dragonColors`, and `DRAGON_TRIANGLE_BUDGET` and `DRAGON_DRAW_BUDGET` (Task 3).
- Produces: `DragonDie({ wings }: { wings: [React.Ref<Group>, React.Ref<Group>] })`. Its centre is at the origin, facing +Z. `wings[0]` is the right (+x) hinge and `wings[1]` the left. Each turns about +Z, so `rotation.z = +a` on the right and `-a` on the left raises both.
- Produces: `dragonDie()` in `dragonDieMount.tsx`, shaped as `bumblebee()` in `bumblebeeMount.tsx` is: `{ root, wings, triangles, draws, errors, unmount }`.

The model is built from the kit (`components/world/models/kit`), in the bumblebee's manner (see `Bumblebee.tsx`):
- **The die:** the kit's `Die`, radius 0.12, in `dragonColors.die`.
- **The face:** two small eyes in `eyes` near the die's front top, with no outline.
- **The tail:** a short `Swept` curl from the back, tapering, in `tail`.
- **The wings:** in each hinge, three `Block` ribs in `ribs` fanning out and back from the hinge, and a membrane of one or two `Extruded` plates in `membrane`, scalloped between the rib tips (a shape built with the kit's `Point2` lists). Span tip to tip is about 0.5 model units.
- **Batching:** the body is batched on its own, and each wing is batched apart, inside its hinge.

- [ ] **Step 1: Write the failing tests**, in the manner of `tests/unit/eggs/bumblebee.test.tsx`:
  - `keeps to its own small budget`. It expects `errors` to be 0, `triangles` to be above 0 and at most `DRAGON_TRIANGLE_BUDGET`, and `draws` at most `DRAGON_DRAW_BUDGET`.
  - `is centred, faces +Z, and spans about half a model unit with its wings`. Over the non-batched, unnamed meshes' world bounds, it expects the span `max.x - min.x` to be between 0.4 and 0.65, `|min.y + max.y| / 2 < 0.06`, and both `wings[i].current` to be truthy.
  - `raises both wings together when each hinge turns its own way`. It sets `wings[0].current.rotation.z = 0.5` and `wings[1].current.rotation.z = -0.5`, updates the world matrices, and expects both wing tips' world y to have risen.
- [ ] **Step 2:** Run `npx vitest run tests/unit/eggs/dragonDie.test.tsx`. Expected: FAIL, because the module is not found.
- [ ] **Step 3: Implement `DragonDie`.** If the budget test fails, cut cost the way the bee did: lower `ellipseOutline` steps, no outline on the membrane, or fewer ribs. Do not raise the budget.
- [ ] **Step 4: Add the die to the planet totals.** In the `keeps within the planet’s totals` test in `companions.test.tsx`, mount `dragonDie()` beside `bumblebee()`, and add its triangles and draws to both sums.
- [ ] **Step 5:** Run `npx vitest run tests/unit/eggs tests/unit/world/companions.test.tsx`. Expected: PASS.
- [ ] **Step 6: Commit.** Message: `feat: the dragon die's model`.

---

### Task 5: The dragon die flies by day, on the overview, and rolls when pressed

**Files:**
- Create: `components/eggs/Dragon.tsx`
- Modify: `lib/eggs/hooks.ts`, `components/eggs/EggsInWorld.tsx`, `components/eggs/Eggs.tsx` (comment), `content/eggs.ts` (header comment)
- Test: `tests/unit/eggs/bugCount.test.ts` (where `bugOn` is already tested), `tests/e2e/eggs.spec.ts`

**Interfaces:**
- Consumes: `dragonRadius`, `dragonAt`, `dragonBank`, `dragonWing`, `dragonHold` and `DRAGON_SEED` (Task 3); `DragonDie` (Task 4); `overview` (Task 2); `bugScale` from `lib/world/bug.ts`, which reuses the bee's far-out enlarging.
- Produces, in `lib/eggs/hooks.ts`:
  - `window.__eggDragon?: Record<string, never>`
  - `window.__eggDragonScreen?: { x: number; y: number; front: boolean }`
  - `dragonOn(flag: string | undefined, hook: Window['__eggDragon']): boolean`, with the same rule as `bugOn`.
- Produces: `Dragon({ districts, places, reducedMotion }: { districts: District[]; places: Place[]; reducedMotion: boolean })`.

How `Dragon` behaves each frame (it follows `Bug.tsx` for anything this list does not say):
- **Time:** it keeps its own time in a ref, `t += min(delta, MAX_TICK)`, so it pauses with the canvas.
- **Position and facing:**
  - In flight, its group sits at `dragonAt(DRAGON_SEED, t, radius).at`. It faces `ahead`, with the outward direction as up, rolled by `dragonBank` about `ahead`.
  - Its die child turns about up at `DRAGON.spin`.
  - Its scale is `MODEL_SCALE * bugScale(camera distance)`.
  - The wings take `dragonWing(t)`: `+` on the right, `-` on the left.
- **Reduced motion:** its group sits still at `dragonHold(...) × radius`, facing a fixed tangent. The wings hold at `DRAGON.open`, and the die does not spin.
- **During a roll:** while `useEggs().roll !== null`, its group has `visible = false`, and its press and hover handlers return early without changing the cursor.
- **Hit ball:** an invisible `SphereGeometry` scaled to `DRAGON.hit`. A press calls `rollForVisitor()`.
- **Test hooks:** with `TEST_HOOKS`, it writes `window.__eggDragonScreen` each frame, as `Bug` does, and clears it on unmount.
- **Mounting:** `EggsInWorld` renders it by day only when `overview && dragonOn(process.env.NEXT_PUBLIC_E2E, window.__eggDragon)`, read once as `Bug` reads its hook.

- [ ] **Step 1: Write the failing unit test** for `dragonOn`:
  - It returns true with no e2e flag, whatever the hook.
  - With the e2e flag (`'1'`), it returns false when the hook is undefined and true when it is `{}`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/eggs/bugCount.test.ts`. Expected: FAIL, because `dragonOn` is not exported.
- [ ] **Step 3: Implement `dragonOn`** and the window typings. Run the test again. Expected: PASS.
- [ ] **Step 4: Write the failing e2e tests.** Give `planet()` a `dragon` option that sets `window.__eggDragon = {}`. Add `dragonOnScreen(page)`, a copy of `bugOnScreen` reading `__eggDragonScreen`. Then add a new `test.describe('the dragon die, by day')` with these tests:
  - `pressing it rolls the die, and while the roll is out it is hidden and a press does nothing`:
    - Rig `__eggRoll = 7`, press the die at `dragonOnScreen` (retrying up to 4 times, as `catchBug` does), and expect `said` to read `eggWords.rolled(7)`.
    - Then press the same point again at once, and expect `said` still to read `eggWords.rolled(7)`, with `.egg-roll` holding a single roll.
    - Wait for `.egg-roll` to be hidden (15 s), then expect `dragonOnScreen` to resolve again.
  - `it is out only on the overview`: the same shape as Task 2's test, reading `__eggDragonScreen` and going to `/places/post` and back.
  - Under `test.describe('with reduced motion')`, `the dragon die holds still, and pressed it rolls`: take two readings 1.5 s apart, expect them less than 2 px apart, then press and expect `/^You rolled/`.
  - In the existing `'the bug is not out in the e2e build unless asked'` test (around `eggs.spec.ts:110`), also expect `__eggDragonScreen` to be null.
- [ ] **Step 5:** Run `npx playwright test tests/e2e/eggs.spec.ts -g "dragon"`. Expected: FAIL, because `__eggDragonScreen` is never written.
- [ ] **Step 6: Implement `Dragon.tsx`, mount it in `EggsInWorld`, and update the header comments.** The comments in `content/eggs.ts`, `Eggs.tsx` and `EggsInWorld.tsx` should describe four eggs, two per theme.
- [ ] **Step 7: Run everything.**
  - `npx tsc --noEmit`, `npx next lint`, and `npx vitest run`: expected to pass.
  - `npx playwright test tests/e2e/eggs.spec.ts`: expected to pass, apart from the known-flaky reduced-motion d20 test (note it again if it fails).
- [ ] **Step 8: Look at it.** Start `NEXT_PUBLIC_E2E=1 npx next dev --port 3111`. Script a Playwright page that sets `__eggDragon` and `__eggBug`, and screenshot the overview with the die on screen, at device scale 3, cropped round `__eggDragonScreen`, mid-flap and mid-glide. Check that it reads as a die with dragon wings and doesn't sit inside a landmark. Send the crops to the owner.
- [ ] **Step 9: Commit.** Message: `feat: a d20 with dragon wings flies by day; pressing it rolls`.
