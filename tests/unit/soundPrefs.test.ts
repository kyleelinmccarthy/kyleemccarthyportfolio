import { afterEach, describe, it, expect, vi } from 'vitest'
import { SOUND_STORAGE_KEY, readSoundOff, storeSoundOff } from '@/lib/soundPrefs'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

const blockStorage = (method: 'getItem' | 'setItem' | 'removeItem') =>
  vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new Error('denied')
  })

describe('whether the pets’ sounds are muted', () => {
  it('is not, until the visitor mutes them: sound is on by default', () => {
    expect(readSoundOff()).toBe(false)
  })

  it('is remembered on the device (localStorage) as the one word "off", and forgotten when sound comes back on', () => {
    storeSoundOff(true)
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off')
    expect(window.sessionStorage.length).toBe(0)
    expect(readSoundOff()).toBe(true)
    storeSoundOff(false)
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBeNull()
    expect(readSoundOff()).toBe(false)
  })

  it.each(['on', 'OFF', ' off', 'true', '1', '', '{"off":true}', 'off'.repeat(100)])('reads anything but the exact value "off" (%j) as sound on', (value) => {
    window.localStorage.setItem(SOUND_STORAGE_KEY, value)
    expect(readSoundOff()).toBe(false)
  })

  it('never throws where storage is blocked: a read is sound on, a write is simply not remembered', () => {
    blockStorage('getItem')
    blockStorage('setItem')
    blockStorage('removeItem')
    expect(() => storeSoundOff(true)).not.toThrow()
    expect(() => storeSoundOff(false)).not.toThrow()
    expect(readSoundOff()).toBe(false)
  })

  it('never throws where reaching storage at all throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readSoundOff()).toBe(false)
    expect(() => storeSoundOff(true)).not.toThrow()
  })
})
