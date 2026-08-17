'use client'

import { projects } from '@/content/projects'
import { room, artAlt, tattooAlt } from '@/content/room'
import { groupArt } from '@/lib/artGroups'
import { Room } from '@/components/rooms/Room'
import { Mailbox } from '@/components/rooms/Mailbox'
import { ContactForm } from '@/components/sections/ContactForm'
import { Gallery } from '@/components/media/Gallery'
import { Bookshelf } from './Bookshelf'
import {
  RevealOnActive,
  useSceneActive,
  useScenePaging,
} from '@/components/journey/sceneActive'
import { useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent } from 'framer-motion'

const personalProjects = projects.filter((p) => p.isPersonal)

// Grouped by medium, derived from the filename prefix scripts/import-art.ts
// already bakes into every slug — no per-entry field to maintain by hand. A
// new import needs no component change: drop a file in public/media/art with
// a matching artAlt entry and it lands in the right cluster automatically.
const artGroups = groupArt(artAlt)
  .filter((g) => g.items.length > 0)
  .map((g) => ({
    label: g.label,
    items: g.items.map(({ slug, alt }) => ({ src: `/media/art/${slug}.jpg`, alt })),
  }))

const tattooItems = Object.entries(tattooAlt).map(([slug, alt]) => ({
  src: `/media/tattoo/${slug}.jpg`,
  alt,
}))

/* ------------------------------------------------------------------ shelf */

/** Warm lamplight from the left, the way a reading room is lit. */
export function ShelfSetting() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-[10%] top-[10%] h-[70vh] w-[55vw] rounded-[50%] bg-accent opacity-[0.10] blur-3xl" />
    </div>
  )
}

export function ShelfRoom() {
  return (
    <Room className="mx-auto max-w-5xl">
      <RevealOnActive>
        <h2 className="font-serif text-fluid-h2 text-fg">{room.intro.heading}</h2>
        <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-fg-muted">
          {room.intro.lede}
        </p>
      </RevealOnActive>
      <RevealOnActive index={1}>
        <h3 className="mt-10 font-serif text-2xl text-fg">{room.projects.heading}</h3>
      </RevealOnActive>
      <RevealOnActive index={2}>
        <div className="mt-3">
          <Bookshelf projects={personalProjects} />
        </div>
      </RevealOnActive>
    </Room>
  )
}

/* -------------------------------------------------------------------- art */

/** Picture lights: a pool of warm light over each hung group. */
export function ArtSetting() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-[4%] h-[52vh] w-[70vw] -translate-x-1/2 rounded-[45%] bg-accent opacity-[0.09] blur-3xl" />
      {/* The picture rail the frames hang from. */}
      <div className="absolute inset-x-0 top-[22%] h-px bg-rule opacity-70" />
    </div>
  )
}

/**
 * One medium on the wall at a time, walked past as you scroll through the
 * room's own dwell — the same treatment as the home page's gallery, and for
 * the same reason: the camera panel is exactly one viewport tall and five
 * groups of framed work stacked into it get clipped. The stacked fallback has
 * no such constraint and simply hangs them all.
 */
function ArtWall() {
  const progress = useScenePaging()
  const n = artGroups.length
  const [active, setActive] = useState(0)

  useMotionValueEvent(progress!, 'change', (v) => {
    setActive(Math.min(n - 1, Math.max(0, Math.floor(v * n))))
  })

  const group = artGroups[active]!

  return (
    <div>
      <div className="relative min-h-[46vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={group.label}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3 className="font-serif text-xl leading-tight text-fg">{group.label}</h3>
            <Gallery items={group.items} label={group.label} variant="wall" />
          </motion.div>
        </AnimatePresence>
      </div>
      <div aria-hidden="true" className="mt-5 flex items-center justify-center gap-2">
        {artGroups.map((g, i) => (
          <span
            key={g.label}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${i === active ? 'bg-accent' : 'bg-rule'}`}
          />
        ))}
      </div>
    </div>
  )
}

/** Every medium hung at once — mobile, reduced motion and no-JS. */
function ArtStack() {
  return (
    <div className="space-y-8">
      {artGroups.map((group) => (
        <div key={group.label}>
          <h3 className="font-serif text-xl leading-tight text-fg">{group.label}</h3>
          <Gallery items={group.items} label={group.label} variant="wall" />
        </div>
      ))}
    </div>
  )
}

export function ArtRoom() {
  // See Floor.tsx: only the fixed-height camera panel provides a non-null
  // SceneActiveContext, and only there does content taller than one viewport
  // get clipped rather than simply growing the page.
  const inPanel = useSceneActive() !== null

  return (
    <Room className="mx-auto max-w-6xl">
      <RevealOnActive>
        <h2 className="font-serif text-3xl text-fg">{room.art.heading}</h2>
        <p className="mt-2 max-w-2xl font-sans text-sm text-fg-muted">{room.art.lede}</p>
      </RevealOnActive>
      <div className="mt-6">{inPanel ? <ArtWall /> : <ArtStack />}</div>
    </Room>
  )
}

/* ----------------------------------------------------------------- flash */

export function FlashRoom() {
  return (
    <Room className="mx-auto max-w-5xl">
      <RevealOnActive>
        <h2 className="font-serif text-3xl text-fg">{room.tattoo.heading}</h2>
        <p className="mt-2 max-w-2xl font-sans text-sm text-fg-muted">{room.tattoo.lede}</p>
      </RevealOnActive>
      <RevealOnActive index={1}>
        <Gallery items={tattooItems} label={room.tattoo.heading} variant="wall" />
      </RevealOnActive>
    </Room>
  )
}

/* ------------------------------------------------------------ off the clock */

/**
 * The seven off-the-clock facts, as a pinned-up set of cards rather than a
 * definition list in two columns. Same deterministic tilt trick as the desk's
 * sticky notes — Math.random() here would break hydration.
 */
const TILTS = [-2, 1.5, -1, 2.5, -2.5, 1, -1.5]

/** A reading lamp over the table the cards are spread on. */
export function OffTheClockSetting() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-[8%] h-[60vh] w-[60vw] -translate-x-1/2 rounded-[45%] bg-accent opacity-[0.10] blur-3xl" />
    </div>
  )
}

export function OffTheClockRoom() {
  return (
    <Room className="mx-auto max-w-6xl">
      <RevealOnActive>
        <h2 className="font-serif text-fluid-h2 text-fg">{room.offTheClock.heading}</h2>
      </RevealOnActive>
      <RevealOnActive index={1}>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {room.offTheClock.items.map((item, i) => (
            <li key={item.title}>
              <div
                className="h-full rounded-sm bg-card p-5 shadow-lg shadow-black/30 ring-1 ring-black/10"
                style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}
              >
                {/* The printed blue rule an index card has under its heading. */}
                <p className="font-serif text-lg text-card-ink">{item.title}</p>
                <span aria-hidden="true" className="mt-1 block h-px bg-card-rule" />
                <p className="mt-2 font-sans text-sm leading-relaxed text-card-ink/80">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </RevealOnActive>
    </Room>
  )
}

/* ----------------------------------------------------------------- say hi */

export function SayHiRoom() {
  return (
    <Room className="mx-auto max-w-5xl">
      <RevealOnActive>
        <h2 className="font-serif text-fluid-h2 text-fg">{room.sayHi.heading}</h2>
        <p className="mt-3 max-w-2xl font-sans text-fg-muted">{room.sayHi.body}</p>
      </RevealOnActive>
      <RevealOnActive index={1}>
        {/* The mailbox is the site's one way to send a message, so the library
            gets the real thing rather than a link back to the front of the
            house. Only one form renders per page, so the ids stay unique. */}
        <div className="mt-8 max-w-xl">
          <Mailbox>
            <ContactForm />
          </Mailbox>
        </div>
      </RevealOnActive>
    </Room>
  )
}
