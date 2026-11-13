import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { GUIDE_FACE, everyGuest, guestKey, guestLook, guestPicture } from '@/lib/guests'
import { DEFAULT_GUEST, defaultStand, guestOptions, guideLook, hairForSkin, standAt, wardrobe, type Look, type Outfit } from '@/content/characters'
import { guide } from '@/content/guide'
import { people } from '@/content/sky'
import { places } from '@/content/world'

/** The longest a line may be: a short speech bubble, never a paragraph. */
const MOST = 140

/** Every line the guide can say. */
const lines = [
  ...Object.values(guide.greeting),
  guide.hello,
  ...Object.values(guide.places),
  guide.tour.last,
  ...guide.idle,
]

describe('the guide’s lines', () => {
  it('has a line for every place, and only for real places', () => {
    const ids = places.map((p) => p.id)
    expect(Object.keys(guide.places).sort()).toEqual([...ids].sort())
  })

  it('keeps every line short and present', () => {
    for (const line of lines) {
      expect(line.trim().length, line).toBeGreaterThan(0)
      expect(line.length, line).toBeLessThanOrEqual(MOST)
    }
  })

  it('is plain text: no markup, no links, no line breaks', () => {
    for (const line of [...lines, ...Object.values(guide.tour), ...Object.values(guide.controls)]) {
      expect(line, line).not.toMatch(/[<>*_`]|https?:|\n/)
    }
  })

  it('has a greeting for day and night, and at least one idle line', () => {
    expect(Object.keys(guide.greeting).sort()).toEqual(['day', 'night'])
    expect(guide.idle.length).toBeGreaterThan(0)
  })
})

describe('the visitor’s choices', () => {
  const FIELDS = ['age', 'style', 'skin'] as const

  it('gives every option a unique, URL-safe id and a short label, in each list', () => {
    for (const field of FIELDS) {
      const ids = guestOptions[field].map((o) => o.id)
      expect(ids.length, field).toBeGreaterThan(1)
      expect(new Set(ids).size, field).toBe(ids.length)
      for (const o of guestOptions[field]) {
        expect(o.id).toMatch(/^[a-z0-9]+$/)
        expect(o.label.trim().length, o.id).toBeGreaterThan(0)
        expect(o.label.length, o.id).toBeLessThanOrEqual(12)
      }
      expect(new Set(guestOptions[field].map((o) => o.label.toLowerCase())).size, field).toBe(ids.length)
    }
  })

  it('describes a style, never the visitor: no gender anywhere in the picker’s words', () => {
    const said = [...FIELDS.flatMap((f) => guestOptions[f].map((o) => o.label)), guide.controls.pickerTitle, guide.controls.pickerIntro, guide.controls.age, guide.controls.style, guide.controls.skin, guide.controls.preview, guide.controls.done]
    for (const words of said) expect(words, words).not.toMatch(/\b(male|female|gender|man|men|woman|women|boy|girl|lady|guy)\b/i)
  })

  it('offers every skin tone the palette has, and only those', () => {
    expect(guestOptions.skin.map((o) => o.id).sort()).toEqual(Object.keys(people.skin).sort())
  })

  it('starts the visitor on a choice the lists offer', () => {
    for (const field of FIELDS) expect(guestOptions[field].some((o) => o.id === DEFAULT_GUEST[field]), field).toBe(true)
  })

  it('has an outfit for every age and style, and a hair colour for every skin tone', () => {
    for (const age of guestOptions.age) for (const style of guestOptions.style) expect(wardrobe[age.id]?.[style.id], `${age.id} ${style.id}`).toBeDefined()
    for (const skin of guestOptions.skin) expect(people.hair).toHaveProperty(hairForSkin[skin.id])
  })

  it('tells an outfit from its neighbours in a row by its hair or its cut, not only its colours', () => {
    const shape = (o: Outfit) => `${o.hair.style}|${o.top.style}|${o.bottom.style}|${o.accessory}|${o.beard ? 'beard' : ''}`
    for (const age of guestOptions.age) {
      const shapes = guestOptions.style.map((s) => shape(wardrobe[age.id][s.id]))
      expect(new Set(shapes).size, age.id).toBe(shapes.length)
    }
  })

  it('gives elders silver or grey hair whatever the skin, and every other age the hair its skin goes with', () => {
    for (const choice of everyGuest()) {
      const look = guestLook(choice)
      if (choice.age === 'elder') expect(['silver', 'grey'], guestKey(choice)).toContain(look.hair.color)
      else expect(look.hair.color, guestKey(choice)).toBe(hairForSkin[choice.skin])
      if (look.beard) expect(look.beard, guestKey(choice)).toBe(look.hair.color)
    }
  })

  it('reads a kid as a kid by the clothes too: trainers, and a backpack or shorts', () => {
    for (const style of guestOptions.style) {
      const o = wardrobe.kid[style.id]
      expect(o.shoes.style, style.id).toBe('trainers')
      expect(o.accessory === 'backpack' || o.bottom.style === 'shorts', style.id).toBe(true)
    }
  })

  it('reads an elder as older by silver or grey hair and glasses or a cardigan', () => {
    for (const style of guestOptions.style) {
      const o = wardrobe.elder[style.id]
      expect(['silver', 'grey'], style.id).toContain(o.hair.color)
      expect(o.accessory.includes('glasses') || o.top.style === 'cardigan', style.id).toBe(true)
    }
  })

  it('makes every combination a whole look of its age, with its skin', () => {
    const all = everyGuest()
    expect(all).toHaveLength(guestOptions.age.length * guestOptions.style.length * guestOptions.skin.length)
    for (const choice of all) {
      const look = guestLook(choice)
      expect(look.age).toBe(choice.age)
      expect(look.skin).toBe(choice.skin)
    }
  })

  it('has a picture of every combination for the picker: a real 192 by 240 WebP under 40KB, captured by npm run capture:characters', async () => {
    const { default: sharp } = await import('sharp')
    for (const choice of everyGuest()) {
      const name = guestKey(choice)
      const file = resolve(process.cwd(), 'public', `.${guestPicture(choice)}`)
      expect(existsSync(file), `${guestPicture(choice)} is missing: run npm run capture:characters`).toBe(true)
      expect(statSync(file).size, name).toBeLessThan(40_000)
      const meta = await sharp(file).metadata()
      expect(meta.format, name).toBe('webp')
      expect([meta.width, meta.height], name).toEqual([192, 240])
      expect(meta.hasAlpha, name).toBe(true)
    }
  })

  it('keeps no picture the picker cannot show', () => {
    const wanted = new Set([...everyGuest().map((c) => `${guestKey(c)}.webp`), GUIDE_FACE.split('/').pop()])
    const dir = resolve(process.cwd(), 'public/world/characters')
    for (const file of readdirSync(dir)) expect(wanted.has(file), file).toBe(true)
  })
})

describe('the characters’ looks', () => {

  it('has a picture of the guide’s face for her folded bubble: a 96 by 96 WebP, captured with the looks’ pictures', async () => {
    const { default: sharp } = await import('sharp')
    const file = resolve(process.cwd(), 'public', `.${GUIDE_FACE}`)
    expect(existsSync(file), `${GUIDE_FACE} is missing: run npm run capture:characters`).toBe(true)
    const meta = await sharp(file).metadata()
    expect(meta.format).toBe('webp')
    expect([meta.width, meta.height]).toEqual([96, 96])
  })

  it('names only colours the people palette has', () => {
    const check = (look: Look) => {
      expect(people.skin).toHaveProperty(look.skin)
      expect(people.hair).toHaveProperty(look.hair.color)
      if (look.hair.streaks) expect(people.hair).toHaveProperty(look.hair.streaks)
      if (look.beard) expect(people.hair).toHaveProperty(look.beard)
      for (const c of [look.top.color, look.top.under, look.top.pattern?.color, look.bottom.color, look.shoes.color, look.belt?.color, look.belt?.buckle, look.accessoryColor, look.noseRing]) {
        if (c) expect(people.cloth).toHaveProperty(c)
      }
    }
    for (const choice of everyGuest()) check(guestLook(choice))
    check(guideLook)
  })

  it('keeps every height within its age’s range', () => {
    for (const look of [guideLook, ...everyGuest().map(guestLook)]) {
      expect(look.height).toBeGreaterThanOrEqual(0.9)
      expect(look.height).toBeLessThanOrEqual(1.1)
    }
  })

  it('draws the guide as Kylee: long wavy brown hair with lighter streaks, rectangular glasses, a nose ring, a bow-patterned shirt with rolled sleeves, a belt, boots, a hand in a pocket', () => {
    expect(guideLook.hair).toMatchObject({ style: 'long-wavy', color: 'chestnut', streaks: 'honey' })
    expect(guideLook.accessory).toBe('glasses')
    expect(guideLook.noseRing).toBeDefined()
    expect(guideLook.top).toMatchObject({ style: 'shirt', color: 'navy', sleeves: 'rolled', pattern: { kind: 'bows', color: 'white' } })
    expect(guideLook.belt).toBeDefined()
    expect(guideLook.shoes.style).toBe('boots')
    expect(guideLook.pose).toBe('hand-in-pocket')
  })
})

describe('where the characters stand', () => {
  it('gives their own spots only to real places', () => {
    const ids = new Set(places.map((p) => p.id))
    for (const id of Object.keys(standAt)) expect(ids.has(id), id).toBe(true)
  })

  it('stands them apart by default, both in front of the landmark', () => {
    const [gx, gz] = defaultStand.guide.at
    const [vx, vz] = defaultStand.guest.at
    expect(Math.hypot(gx - vx, gz - vz)).toBeGreaterThan(0.15)
    expect(gz).toBeGreaterThan(0)
    expect(vz).toBeGreaterThan(0)
  })
})
