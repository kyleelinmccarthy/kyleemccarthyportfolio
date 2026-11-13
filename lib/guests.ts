import { DEFAULT_GUEST, guestOptions, hairForSkin, wardrobe, type GuestChoice, type Look } from '@/content/characters'

/*
 * The visitor's character, as a choice of an age, a style and a skin tone
 * (`content/characters.ts`): checking a choice, turning it into a look, and
 * naming its picture. Apart from lib/world so that the page (the picker, the
 * stored choice) can use it without bringing three.js along.
 */

/** The three things a guest is made of, in the order the picker shows them. */
export const GUEST_FIELDS = ['age', 'style', 'skin'] as const
export type GuestField = (typeof GUEST_FIELDS)[number]

/** True when `value` is one of the ids the option list for `field` offers. An own-property check only: no prototype key is an id. */
export function isGuestOption<F extends GuestField>(field: F, value: unknown): value is GuestChoice[F] {
  return typeof value === 'string' && guestOptions[field].some((o) => o.id === value)
}

/**
 * A choice made whole from anything: each field taken if it is one of its
 * list's ids, else the default's, independently; anything that is not a plain
 * object gives the default. Nothing else of `value` is kept.
 */
export function guestChoiceFrom(value: unknown): GuestChoice {
  const from = value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const field = <F extends GuestField>(f: F): GuestChoice[F] => {
    const v = Object.prototype.hasOwnProperty.call(from, f) ? from[f] : undefined
    return isGuestOption(f, v) ? v : DEFAULT_GUEST[f]
  }
  return { age: field('age'), style: field('style'), skin: field('skin') }
}

/** Whether two choices are the same. */
export const sameGuest = (a: GuestChoice, b: GuestChoice) => GUEST_FIELDS.every((f) => a[f] === b[f])

/**
 * The look for a choice: its age's and style's outfit (`wardrobe`), its skin,
 * and its hair in the colour that goes with that skin (`hairForSkin`) unless
 * the outfit gives its own (an elder's silver or grey). A beard takes the
 * hair's colour unless the outfit gives its own.
 */
export function guestLook(choice: GuestChoice): Look {
  const c = guestChoiceFrom(choice)
  const { beard, ...outfit } = wardrobe[c.age][c.style]
  const hair = outfit.hair.color ?? hairForSkin[c.skin]
  const look: Look = { ...outfit, age: c.age, skin: c.skin, hair: { style: outfit.hair.style, color: hair } }
  if (beard) look.beard = beard === true ? hair : beard
  return look
}

/** Every choice there is, in the option lists' order: age, then style, then skin tone. */
export function everyGuest(): GuestChoice[] {
  return guestOptions.age.flatMap((age) => guestOptions.style.flatMap((style) => guestOptions.skin.map((skin) => ({ age: age.id, style: style.id, skin: skin.id }))))
}

/** A choice's name for its picture and its stored form: `guest-<age>-<style>-<skin>`. */
export const guestKey = (choice: GuestChoice) => `guest-${choice.age}-${choice.style}-${choice.skin}`

/** Where a choice's picture is, for the picker: captured by `npm run capture:characters`. */
export const guestPicture = (choice: GuestChoice) => `/world/characters/${guestKey(choice)}.webp`

/** The guide's face, for her folded bubble: captured with the guests' pictures. */
export const GUIDE_FACE = '/world/characters/guide-face.webp'
