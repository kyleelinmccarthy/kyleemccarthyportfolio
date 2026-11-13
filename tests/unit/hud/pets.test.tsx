import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

const played = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn() }))
vi.mock('@/lib/sound/player', () => ({ petVoices: played }))

import { PanelShell } from '@/components/hud/PanelShell'
import { PET_SAID_ID, PetLayer, SAY_MS } from '@/components/hud/PetLayer'
import { pets } from '@/components/hud/petStore'
import { SoundToggle } from '@/components/hud/SoundToggle'
import { GUIDE_SAID_ID } from '@/components/hud/GuideLayer'
import { PETS_LIVE_AT, pets as petContent } from '@/content/pets'
import { districts, places } from '@/content/world'
import { PET_BUBBLE_ID } from '@/lib/world/pets'
import { SOUND_STORAGE_KEY } from '@/lib/soundPrefs'

beforeEach(() => {
  pets.reset()
  played.play.mockClear()
  played.stop.mockClear()
})
afterEach(() => {
  vi.useRealTimers()
  window.localStorage.clear()
})

const said = () => document.getElementById(PET_SAID_ID)!
const bubble = () => document.getElementById(PET_BUBBLE_ID)!

describe('what a pressed pet says on the page', () => {
  it('is told to a screen reader through a polite live region of its own, never the guide’s', () => {
    render(<PetLayer />)
    act(() => pets.press('largeDog', { still: false }))
    expect(said()).toHaveAttribute('role', 'status')
    expect(said()).toHaveAttribute('aria-live', 'polite')
    expect(said()).toHaveTextContent(`${petContent.largeDog.who} says: ${petContent.largeDog.says[0].word}`)
    expect(said().id).not.toBe(GUIDE_SAID_ID)
  })

  it('is told again when the same thing is said twice running', () => {
    // A pet of one word, so it says the same thing at every press.
    const words = petContent.kitten.says
    petContent.kitten.says = [words[0]]
    try {
      render(<PetLayer />)
      act(() => pets.press('kitten', { still: false }))
      const first = said().textContent
      act(() => pets.press('kitten', { still: false }))
      expect(said().textContent?.trim()).toBe(first?.trim())
      expect(said().textContent).not.toBe(first)
    } finally {
      petContent.kitten.says = words
    }
  })

  it('shows in a bubble hidden from assistive technology (the live region speaks), taken down after a moment', () => {
    vi.useFakeTimers()
    render(<PetLayer />)
    expect(bubble()).toHaveAttribute('data-quiet')
    act(() => pets.press('swirlCat', { still: false }))
    expect(bubble()).toHaveAttribute('aria-hidden')
    expect(bubble()).toHaveTextContent(petContent.swirlCat.says[0].word)
    expect(bubble()).not.toHaveAttribute('data-quiet')
    act(() => vi.advanceTimersByTime(SAY_MS + 10))
    expect(bubble()).toHaveAttribute('data-quiet')
  })

  it('is taken down when the visitor leaves the place', () => {
    const { unmount } = render(<PetLayer />)
    act(() => pets.press('maskCat', { still: false }))
    unmount()
    expect(pets.get().said).toBeNull()
  })
})

describe('the mute button', () => {
  it('is a real toggle button with a label, not pressed while sound is on (the default)', () => {
    render(<SoundToggle />)
    const button = screen.getByRole('button', { name: 'Mute' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('mutes and unmutes, remembers it on the device, and a muted press makes no sound', () => {
    render(<SoundToggle />)
    const button = screen.getByRole('button', { name: 'Mute' })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off')
    act(() => pets.press('largeDog', { still: false }))
    expect(played.play).not.toHaveBeenCalled()
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    act(() => pets.press('largeDog', { still: false }))
    expect(played.play).toHaveBeenCalledTimes(1)
  })

  it('shows the stored choice when it appears', () => {
    window.localStorage.setItem(SOUND_STORAGE_KEY, 'off')
    render(<SoundToggle />)
    expect(screen.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('is in the panel of the place where the pets live, and no other', () => {
    for (const place of places) {
      const district = districts.find((d) => d.id === place.district)!
      const { unmount } = render(
        <PanelShell place={place} district={district}>
          <p>body</p>
        </PanelShell>,
      )
      expect(screen.queryByRole('button', { name: 'Mute' }) !== null, place.id).toBe(place.model === PETS_LIVE_AT)
      unmount()
    }
  })
})
