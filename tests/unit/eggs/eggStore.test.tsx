import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

// The player is the one thing here that would touch Web Audio: what it is asked to play is what is checked.
const played = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn() }))
vi.mock('@/lib/sound/player', () => ({ petVoices: played }))

import { eggs } from '@/components/eggs/eggStore'
import { EGG_SAID_ID, EggsOnPage, rollWords } from '@/components/eggs/EggsOnPage'
import { pets } from '@/components/hud/petStore'
import { eggWords } from '@/content/eggs'
import { BUGS_STORAGE_KEY } from '@/lib/eggs/bugCount'
import { riggedTo } from '@/lib/eggs/d20'
import { VOICES } from '@/lib/sound/voices'
import { SOUND_STORAGE_KEY } from '@/lib/soundPrefs'

beforeEach(() => {
  eggs.reset()
  pets.reset()
  played.play.mockClear()
})
afterEach(() => {
  window.localStorage.clear()
  vi.useRealTimers()
})

describe('catching the bug', () => {
  it('counts it, keeps the count on the device, and pops', () => {
    window.localStorage.setItem(BUGS_STORAGE_KEY, '2')
    eggs.squash({ x: 10, y: 20 })
    expect(eggs.get().squashed).toBe(3)
    expect(eggs.get().caught).toMatchObject({ at: { x: 10, y: 20 }, count: 3 })
    expect(window.localStorage.getItem(BUGS_STORAGE_KEY)).toBe('3')
    expect(played.play).toHaveBeenLastCalledWith(VOICES.pop)
  })

  it('makes no sound while the pets’ sounds are muted', () => {
    window.localStorage.setItem(SOUND_STORAGE_KEY, 'off')
    eggs.squash({ x: 0, y: 0 })
    expect(played.play).not.toHaveBeenCalled()
  })
})

describe('rolling the die', () => {
  it('rolls with the randomness it is handed, and not again while a die is out', () => {
    eggs.roll(riggedTo(14))
    expect(eggs.get().roll?.value).toBe(14)
    eggs.roll(riggedTo(3))
    expect(eggs.get().roll?.value).toBe(14)
    eggs.putAway()
    eggs.roll(riggedTo(3))
    expect(eggs.get().roll?.value).toBe(3)
  })

  it('says its result, and a line more for a natural 20 and a natural 1', () => {
    expect(rollWords(14)).toEqual({ result: eggWords.rolled(14), more: null })
    expect(rollWords(20).more).toBe(eggWords.natural20)
    expect(rollWords(1).more).toBe(eggWords.natural1)
  })
})

describe('the eggs over the page', () => {
  it('rolls when roll is typed, and tells a screen reader the result as the die lands (at once, under reduced motion)', async () => {
    render(<EggsOnPage reducedMotion />)
    for (const key of ['r', 'o', 'l', 'l']) fireEvent.keyDown(window, { key })
    const value = eggs.get().roll?.value
    expect(value).toBeGreaterThanOrEqual(1)
    expect(value).toBeLessThanOrEqual(20)
    const said = document.getElementById(EGG_SAID_ID)!
    expect(said.getAttribute('aria-live')).toBe('polite')
    expect(said.textContent).toContain(eggWords.rolled(value!))
    expect(played.play).toHaveBeenLastCalledWith(VOICES.clack)
  })

  it('does not roll when roll is typed into a field', () => {
    render(
      <>
        <input aria-label="field" />
        <EggsOnPage reducedMotion />
      </>,
    )
    const field = screen.getByLabelText('field')
    for (const key of ['r', 'o', 'l', 'l']) fireEvent.keyDown(field, { key })
    expect(eggs.get().roll).toBeNull()
  })

  it('shows and tells the bug’s words and its count when it is caught, then takes them down', () => {
    vi.useFakeTimers()
    render(<EggsOnPage reducedMotion />)
    act(() => eggs.squash({ x: 200, y: 300 }))
    expect(screen.getByText(eggWords.feature)).toBeTruthy()
    expect(screen.getByText(eggWords.squashed(1))).toBeTruthy()
    expect(document.getElementById(EGG_SAID_ID)!.textContent).toBe(`${eggWords.feature} ${eggWords.squashed(1)}.`)
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.queryByText(eggWords.feature)).toBeNull()
  })
})
