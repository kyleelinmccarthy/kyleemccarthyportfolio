import { afterEach, describe, it, expect, vi } from 'vitest'
import { DEFAULT_GUEST, guestOptions, type GuestChoice } from '@/content/characters'
import { GREETED_STORAGE_KEY, GUEST_STORAGE_KEY, HINTS_STORAGE_KEY, readGreeted, readGuest, readHintsOff, storeGreeted, storeGuest, storeHintsOff } from '@/lib/companionPrefs'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

const blockStorage = (method: 'getItem' | 'setItem' | 'removeItem') =>
  vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new Error('denied')
  })

/** A choice other than the default in every field, from the option lists. */
const OTHER: GuestChoice = {
  age: guestOptions.age.find((o) => o.id !== DEFAULT_GUEST.age)!.id,
  style: guestOptions.style.find((o) => o.id !== DEFAULT_GUEST.style)!.id,
  skin: guestOptions.skin.find((o) => o.id !== DEFAULT_GUEST.skin)!.id,
}

const stored = () => window.localStorage.getItem(GUEST_STORAGE_KEY)

describe('the visitor’s character', () => {
  it('is the default until they make one', () => {
    expect(readGuest()).toEqual(DEFAULT_GUEST)
  })

  it('round-trips through localStorage as JSON of its three ids and nothing else', () => {
    storeGuest(OTHER)
    expect(JSON.parse(stored()!)).toEqual(OTHER)
    expect(Object.keys(JSON.parse(stored()!))).toEqual(['age', 'style', 'skin'])
    expect(readGuest()).toEqual(OTHER)
    expect(window.localStorage.length).toBe(1)
    expect(window.sessionStorage.length).toBe(0)
  })

  it('uses a new key, and ignores the old one (a retired preset’s id)', () => {
    expect(GUEST_STORAGE_KEY).not.toBe('kym-guest')
    window.localStorage.setItem('kym-guest', 'plum-jumper')
    expect(readGuest()).toEqual(DEFAULT_GUEST)
  })

  it('writes only checked ids: a field that is not one is written as the default’s, and nothing else is kept', () => {
    storeGuest({ ...OTHER, age: '<img src=x onerror=alert(1)>', extra: 'x' } as unknown as GuestChoice)
    expect(JSON.parse(stored()!)).toEqual({ ...OTHER, age: DEFAULT_GUEST.age })
  })

  it('reads each field on its own: a good one is kept beside a bad one', () => {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ age: OTHER.age, style: 42, skin: 'plaid' }))
    expect(readGuest()).toEqual({ age: OTHER.age, style: DEFAULT_GUEST.style, skin: DEFAULT_GUEST.skin })
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ skin: OTHER.skin }))
    expect(readGuest()).toEqual({ ...DEFAULT_GUEST, skin: OTHER.skin })
  })

  it('ignores extra fields', () => {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...OTHER, look: 'x', admin: true }))
    expect(readGuest()).toEqual(OTHER)
  })

  it.each([
    ['nothing JSON', 'plum-jumper'],
    ['empty', ''],
    ['null', 'null'],
    ['a number', '42'],
    ['a string', '"adult"'],
    ['an array', JSON.stringify([OTHER.age, OTHER.style, OTHER.skin])],
    ['wrong types', JSON.stringify({ age: 1, style: true, skin: null })],
    ['nested values', JSON.stringify({ age: [OTHER.age], style: { id: OTHER.style }, skin: [OTHER.skin] })],
    ['ids in another case', JSON.stringify({ age: OTHER.age.toUpperCase(), style: ` ${OTHER.style}`, skin: `${OTHER.skin} ` })],
    ['prototype keys as ids', JSON.stringify({ age: '__proto__', style: 'constructor', skin: 'toString' })],
    ['a prototype key as a field', `{"__proto__":{"age":"${OTHER.age}"}}`],
    ['a huge string', JSON.stringify({ age: 'x'.repeat(10_000), style: OTHER.style, skin: OTHER.skin })],
    ['broken JSON', '{"age":'],
  ])('falls back to the default, field by field, for a stored value that is %s', (_, value) => {
    window.localStorage.setItem(GUEST_STORAGE_KEY, value)
    const read = readGuest()
    expect(read).toEqual(DEFAULT_GUEST)
    expect(Object.keys(read)).toEqual(['age', 'style', 'skin'])
  })

  it('falls back to the default, and never throws, when storage is blocked', () => {
    storeGuest(OTHER)
    blockStorage('getItem')
    blockStorage('setItem')
    expect(readGuest()).toEqual(DEFAULT_GUEST)
    expect(() => storeGuest(OTHER)).not.toThrow()
  })

  it('falls back to the default when reaching localStorage itself throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readGuest()).toEqual(DEFAULT_GUEST)
    expect(() => storeGuest(OTHER)).not.toThrow()
  })

  it('gives a copy of the default, so nothing can change the default through it', () => {
    const read = readGuest()
    read.age = OTHER.age
    expect(readGuest()).toEqual(DEFAULT_GUEST)
  })
})

describe('the guide’s hints, for this visit', () => {
  it('are on until hidden, and come back on', () => {
    expect(readHintsOff()).toBe(false)
    storeHintsOff(true)
    expect(window.sessionStorage.getItem(HINTS_STORAGE_KEY)).toBe('off')
    expect(readHintsOff()).toBe(true)
    storeHintsOff(false)
    expect(window.sessionStorage.getItem(HINTS_STORAGE_KEY)).toBeNull()
    expect(readHintsOff()).toBe(false)
  })

  it('live in sessionStorage, never localStorage', () => {
    storeHintsOff(true)
    expect(window.localStorage.length).toBe(0)
  })

  it('count as on for any stored value but "off"', () => {
    for (const value of ['OFF', 'true', '1', '']) {
      window.sessionStorage.setItem(HINTS_STORAGE_KEY, value)
      expect(readHintsOff(), value).toBe(false)
    }
  })

  it('count as on, and never throw, when storage is blocked', () => {
    blockStorage('getItem')
    blockStorage('setItem')
    blockStorage('removeItem')
    expect(readHintsOff()).toBe(false)
    expect(() => storeHintsOff(true)).not.toThrow()
    expect(() => storeHintsOff(false)).not.toThrow()
  })

  it('count as on when reaching sessionStorage itself throws', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readHintsOff()).toBe(false)
    expect(() => storeHintsOff(true)).not.toThrow()
  })
})

describe('the guide’s greeting, once a visit', () => {
  it('is remembered for the visit once given', () => {
    expect(readGreeted()).toBe(false)
    storeGreeted()
    expect(window.sessionStorage.getItem(GREETED_STORAGE_KEY)).toBe('1')
    expect(readGreeted()).toBe(true)
  })

  it('counts as not given for any other stored value, or blocked storage', () => {
    window.sessionStorage.setItem(GREETED_STORAGE_KEY, 'yes')
    expect(readGreeted()).toBe(false)
    blockStorage('getItem')
    blockStorage('setItem')
    expect(readGreeted()).toBe(false)
    expect(() => storeGreeted()).not.toThrow()
  })
})
