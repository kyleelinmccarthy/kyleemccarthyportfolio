'use client'

import { projects } from '@/content/projects'
import { room, artAlt, tattooAlt } from '@/content/room'
import { groupArt } from '@/lib/artGroups'
import { Room } from '@/components/rooms/Room'
import { Postbox } from '@/components/rooms/Postbox'
import { Gallery } from '@/components/media/Gallery'
import { ProjectPages } from '@/components/media/ProjectPages'
import { Bookshelf, type Volume } from './Bookshelf'
import { RevealOnActive } from '@/components/journey/sceneActive'

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

const projectVolumes: Volume[] = personalProjects.map((p) => ({
  key: p.slug,
  title: p.name,
  detail: <ProjectPages project={p} />,
}))

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
          <Bookshelf volumes={projectVolumes} hint={room.projects.hint} />
        </div>
      </RevealOnActive>
    </Room>
  )
}

/* -------------------------------------------------------------------- art */

/**
 * A volume per medium, and the tattoo flash is one of them.
 *
 * The art used to page through five walls of framed work off the scroll, which
 * put a second thing to scroll through inside a room you were already
 * scrolling. A shelf holds them all at once and opens the one you want — and
 * in a library, a body of work by medium is a set of volumes anyway.
 *
 * The flash had a room to itself, which made it look like a separate career
 * rather than one more thing she draws. It is a volume on the same shelf now,
 * and it keeps its own lede because the story behind it — people went and got
 * these tattooed — is not obvious from the pictures.
 */
const artVolumes: Volume[] = [
  ...artGroups.map((g) => ({
    key: g.label,
    title: g.label,
    detail: (
      <>
        <h3 className="font-serif text-2xl leading-tight text-fg">{g.label}</h3>
        <Gallery items={g.items} label={g.label} variant="wall" />
      </>
    ),
  })),
  {
    key: 'tattoo-flash',
    title: room.tattoo.heading,
    detail: (
      <>
        <h3 className="font-serif text-2xl leading-tight text-fg">{room.tattoo.heading}</h3>
        <p className="mt-2 max-w-2xl font-sans text-sm text-fg-muted">{room.tattoo.lede}</p>
        <Gallery items={tattooItems} label={room.tattoo.heading} variant="wall" />
      </>
    ),
  },
]

/** Picture lights over the shelf. */
export function ArtSetting() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-[6%] h-[56vh] w-[70vw] -translate-x-1/2 rounded-[45%] bg-accent opacity-[0.09] blur-3xl" />
    </div>
  )
}

export function ArtRoom() {
  return (
    <Room className="mx-auto max-w-5xl">
      <RevealOnActive>
        <h2 className="font-serif text-fluid-h2 text-fg">{room.art.heading}</h2>
        <p className="mt-3 max-w-2xl font-sans text-fg-muted">{room.art.lede}</p>
      </RevealOnActive>
      <RevealOnActive index={1}>
        <div className="mt-8">
          <Bookshelf volumes={artVolumes} hint={room.art.hint} />
        </div>
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

/**
 * The copy beside the mailbox rather than above it.
 *
 * Stacked, the heading, the invitation and a five-row form ran past the bottom
 * of the room — you could not reach the Send button without the panel clipping
 * it. Side by side, and with a shorter message box, the whole exchange fits in
 * the viewport it is standing in.
 */
export function SayHiRoom() {
  return (
    <Room className="mx-auto max-w-6xl">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-12">
        <RevealOnActive>
          <h2 className="font-serif text-fluid-h2 text-fg">{room.sayHi.heading}</h2>
          <p className="mt-3 max-w-md font-sans text-fg-muted">{room.sayHi.body}</p>
        </RevealOnActive>
        <RevealOnActive index={1}>
          {/* The mailbox is the site's one way to send a message, so the
              library gets the real thing rather than a link back to the front
              of the house. Only one form renders per page, so ids stay unique. */}
          <Postbox rows={3} />
        </RevealOnActive>
      </div>
    </Room>
  )
}
