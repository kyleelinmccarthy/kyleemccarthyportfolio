# dnd4noobs on the planet: design

Approved by Kylee on 2026-11-24.

## Intent

Add Kylee's new project, dnd4noobs (https://dnd4noobs.com, source in
`E:\codeProjects\dnd-4-noobs`), to the portfolio. It is a browser app that
teaches kids and new players tabletop role-playing. Pip, a little goblin
bard (she/her), helps on every page. She built it because her kids, and
friends who wanted to learn D&D, found the rules a lot to take in on day one.

## Goals

- A project card with the same shape as the others (`content/projects.ts`).
- A landmark in the Personal Projects district (`hours`), near Kingdoms &
  Crowns: a small timber tavern with a hanging sign, and Pip at the door with
  her lute.
- A guide line for the place (`content/guide.ts`).
- Screenshots captured from a local run of dnd4noobs.

## Non-goals and anti-goals

- No change to other districts, landmarks or the professional work counts.
- Not a d20 landmark: the night easter egg already rolls a d20.
- No real names of Kylee's kids or family profiles anywhere: not in the repo,
  file names or screenshots (see the kids' names rule). Captures use a fresh
  local test account and made-up hero names.
- Nothing is pushed or deployed. Kylee reviews screenshots of the card and
  the tavern first.
- The landmark must hold the approved look (stylised anime film, not a toy;
  see `components/world/models/README.md`).

## Approaches

Only one approach made sense: follow the existing project pattern (content
entry, place, registered landmark model, guide line, per-landmark test). The
real choice was the landmark. Kylee picked the tavern with Pip over a wizard's
tower, a giant d20 (which would repeat the egg) and a tabletop with a DM screen.

## Decided

- District: Personal Projects (`hours`).
- Landmark: a tavern with Pip. Pip's look comes from
  `E:\codeProjects\dnd-4-noobs\art\pip-portrait.png`: green skin, long ears,
  a wide purple hat with a gold buckle and a blue-purple feather, a purple
  cloak, and a lute.
- Screenshots: from her local copy. Landing page, Pip helping, the hero
  builder, and a practice adventure.
- Status `beta` (invite-only), live link https://dnd4noobs.com.
- Draft wording, marked DRAFT for her to edit:
  - headline: "Pip, a little goblin bard, teaches kids and new players to play D&D."
  - problem: "My kids and some friends wanted to learn to play D&D, and the
    rulebook is a lot to hand someone on day one."
  - built: Pip helps the way each player learns best (show me, tell me, let
    me read, let me try); players build a legal level-1 hero from the free 5e
    rules, then play practice adventures that teach checks, talking and
    combat; DMs load a campaign pack so players see only options that fit.
  - guide: "Pip plays at the tavern door. She teaches kids and new players to
    play D&D, one roll at a time."
- Work happens on branch `feat/dnd4noobs`.

## Left to the builder

- The place's exact lat/lon inside `hours` (at least 9 degrees from every
  place; regenerate the footprint table) and its height.
- The model key name (`tavern`) and the landmark's detailing within the kit.
- Stack chips, descriptor wording and any `facts`.
- Updating tests that list places, neighbours or model keys.
