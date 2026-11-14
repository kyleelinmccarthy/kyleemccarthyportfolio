import { afterEach, describe, it, expect, vi } from 'vitest'
import { BUGS_STORAGE_KEY, MOST_SQUASHED, readSquashed, storeSquashed } from '@/lib/eggs/bugCount'
import { bugAt, bugOn, takeRiggedRoll } from '@/lib/eggs/hooks'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('the count of bugs squashed', () => {
  it('is 0 until one is caught, and is kept on the device', () => {
    expect(readSquashed()).toBe(0)
    storeSquashed(3)
    expect(window.localStorage.getItem(BUGS_STORAGE_KEY)).toBe('3')
    expect(readSquashed()).toBe(3)
  })

  it('reads anything but a plain whole number as 0', () => {
    for (const bad of ['', '-2', '1.5', 'NaN', 'lots', '1e3', ' 4', '12345678']) {
      window.localStorage.setItem(BUGS_STORAGE_KEY, bad)
      expect(readSquashed(), bad).toBe(0)
    }
  })

  it('is held to a whole number from 0 to its cap', () => {
    storeSquashed(-5)
    expect(readSquashed()).toBe(0)
    storeSquashed(2.9)
    expect(readSquashed()).toBe(2)
    storeSquashed(MOST_SQUASHED + 10)
    expect(readSquashed()).toBe(MOST_SQUASHED)
    storeSquashed(NaN)
    expect(readSquashed()).toBe(0)
  })

  it('never throws where storage is blocked: it reads 0 and simply is not kept', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => storeSquashed(4)).not.toThrow()
    expect(readSquashed()).toBe(0)
  })
})

describe('the eggs’ test hooks', () => {
  it('leave the bug out of an e2e build unless a test asks for it, and always in elsewhere', () => {
    expect(bugOn('1', undefined)).toBe(false)
    expect(bugOn('1', {})).toBe(true)
    expect(bugOn(undefined, undefined)).toBe(true)
    expect(bugAt('1', { at: { lat: 1, lon: 2 } })).toEqual({ lat: 1, lon: 2 })
    expect(bugAt(undefined, { at: { lat: 1, lon: 2 } })).toBeUndefined()
  })

  it('rig the next roll only in an e2e build, and only once', () => {
    const win = { __eggRoll: 20 as number | undefined }
    expect(takeRiggedRoll(undefined, win)).toBeNull()
    expect(takeRiggedRoll('1', win)).toBe(20)
    expect(takeRiggedRoll('1', win)).toBeNull()
  })
})
