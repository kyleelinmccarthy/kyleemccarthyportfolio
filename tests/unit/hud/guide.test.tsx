import { afterEach, beforeAll, describe, it, expect } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { GuideLayer } from '@/components/hud/GuideLayer'
import { ThemeProvider } from '@/components/hud/ThemeProvider'
import { companions } from '@/components/hud/companionStore'
import { DEFAULT_GUEST, guestOptions } from '@/content/characters'
import { guide } from '@/content/guide'
import { GUEST_STORAGE_KEY, HINTS_STORAGE_KEY } from '@/lib/companionPrefs'
import { guestPicture } from '@/lib/guests'
import type { GuideRoute } from '@/lib/world/guide'

// jsdom has no modal dialogs: enough of one for the picker (open, close, its close event).
beforeAll(() => {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal(): void; close(): void }
  if (!('showModal' in proto) || typeof proto.showModal !== 'function' || !String(proto.showModal).includes('setAttribute')) {
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    proto.close = function (this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
})

afterEach(() => {
  act(() => companions.reset())
  window.localStorage.clear()
  window.sessionStorage.clear()
})

function show(route: GuideRoute) {
  const view = render(
    <ThemeProvider>
      <GuideLayer route={route} />
    </ThemeProvider>,
  )
  act(() => companions.load())
  return view
}

describe('the guide’s bubble', () => {
  it('greets a first-time visitor over the planet, politely announced, offering the tour and a look round alone', () => {
    show({ kind: 'overview' })
    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveTextContent(`Kylee says: ${guide.greeting.day}`)
    const bubble = document.getElementById('guide-bubble')!
    expect(bubble).toHaveTextContent(guide.greeting.day)
    expect(screen.getByRole('link', { name: new RegExp(`^${guide.tour.start} ?: Home$`) })).toHaveAttribute('href', '/places/home')
    fireEvent.click(screen.getByRole('button', { name: guide.tour.alone }))
    // The bubble folds to her face; closing it is not a new line, so nothing new is said.
    expect(bubble).not.toHaveTextContent(guide.greeting.day)
    expect(live).toHaveTextContent(`Kylee says: ${guide.greeting.day}`)
    expect(window.sessionStorage.getItem('kym-guide-greeted')).toBe('1')
  })

  it('speaks through one live region apart from the bubble, which moves and hides while the camera flies', () => {
    show({ kind: 'place', id: 'beacon' })
    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('id', 'guide-said')
    expect(document.getElementById('guide-bubble')!.contains(live)).toBe(false)
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('keeps the character control in the bubble’s corner, there whether hints are on or hidden', () => {
    show({ kind: 'place', id: 'aura' })
    const bubble = document.getElementById('guide-bubble')!
    expect(bubble.contains(screen.getByRole('button', { name: guide.controls.change }))).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: guide.controls.hide }))
    expect(bubble.contains(screen.getByRole('button', { name: guide.controls.change }))).toBe(true)
  })

  it('says the place’s line at a place, with the tour’s links', () => {
    show({ kind: 'place', id: 'beacon' })
    expect(screen.getByRole('status')).toHaveTextContent(guide.places.beacon)
    expect(screen.getByRole('link', { name: new RegExp(`^${guide.tour.next} ?: 403HQ$`) })).toHaveAttribute('href', '/places/403hq')
    expect(screen.getByRole('link', { name: new RegExp(`^${guide.tour.back} ?: Send me a letter$`) })).toHaveAttribute('href', '/places/post')
  })

  it('hides the hints for the visit when closed, and brings them back from the HUD', () => {
    show({ kind: 'place', id: 'aura' })
    fireEvent.click(screen.getByRole('button', { name: guide.controls.hide }))
    expect(screen.getByRole('status')).toHaveTextContent('')
    expect(window.sessionStorage.getItem(HINTS_STORAGE_KEY)).toBe('off')
    fireEvent.click(screen.getByRole('button', { name: guide.controls.show }))
    expect(screen.getByRole('status')).toHaveTextContent(guide.places.aura)
    expect(window.sessionStorage.getItem(HINTS_STORAGE_KEY)).toBeNull()
  })

  it('stays quiet for a visit that hid the hints', () => {
    window.sessionStorage.setItem(HINTS_STORAGE_KEY, 'off')
    show({ kind: 'place', id: 'aura' })
    expect(screen.getByRole('status')).toHaveTextContent('')
    expect(screen.getByRole('button', { name: guide.controls.show })).toBeInTheDocument()
  })
})

const FIELDS = ['age', 'style', 'skin'] as const

function openPicker(route: GuideRoute = { kind: 'place', id: 'beacon' }) {
  show(route)
  fireEvent.click(screen.getByRole('button', { name: guide.controls.change }))
  return screen.getByRole('dialog', { name: guide.controls.pickerTitle })
}

describe('the character picker', () => {
  it('offers three named groups of radios, one for each list, every option named, the current choice checked', () => {
    const dialog = openPicker()
    expect(dialog).toHaveAttribute('open')
    for (const field of FIELDS) {
      const group = within(dialog).getByRole('group', { name: new RegExp(`^${guide.controls[field]}`) })
      const radios = within(group).getAllByRole('radio')
      expect(radios).toHaveLength(guestOptions[field].length)
      for (const option of guestOptions[field]) {
        const radio = within(group).getByRole('radio', { name: option.label })
        expect(radio).toHaveProperty('checked', option.id === DEFAULT_GUEST[field])
      }
      // One name per group: the arrow keys move within it, Tab past it.
      expect(new Set(radios.map((r) => r.getAttribute('name'))).size).toBe(1)
    }
  })

  it('applies each change at once, to the world and to what is stored, and stays open until Done', () => {
    const dialog = openPicker()
    let expected = { ...DEFAULT_GUEST }
    for (const field of FIELDS) {
      const other = guestOptions[field].find((o) => o.id !== DEFAULT_GUEST[field])!
      fireEvent.click(within(dialog).getByRole('radio', { name: other.label }))
      expected = { ...expected, [field]: other.id }
      expect(companions.get().guest).toEqual(expected)
      expect(JSON.parse(window.localStorage.getItem(GUEST_STORAGE_KEY)!)).toEqual(expected)
      expect(dialog).toHaveAttribute('open')
      expect(within(dialog).getByRole('img', { name: guide.controls.preview })).toHaveAttribute('src', guestPicture(expected))
    }
    fireEvent.click(within(dialog).getByRole('button', { name: guide.controls.done }))
    expect(dialog).not.toHaveAttribute('open')
    expect(companions.get().picker).toBe(false)
  })

  it('shows the character as chosen in one picture, and the skin tones as swatches named in words', () => {
    const dialog = openPicker({ kind: 'overview' })
    expect(within(dialog).getAllByRole('img')).toHaveLength(1)
    expect(within(dialog).getByRole('img', { name: guide.controls.preview })).toHaveAttribute('src', guestPicture(DEFAULT_GUEST))
    const skin = within(dialog).getByRole('group', { name: new RegExp(`^${guide.controls.skin}`) })
    for (const tone of guestOptions.skin) expect(within(skin).getByRole('radio', { name: tone.label })).toBeInTheDocument()
  })

  it('never names the visitor’s gender in what it says', () => {
    const dialog = openPicker()
    expect(dialog.textContent).not.toMatch(/\b(male|female|gender|man|woman|boy|girl)\b/i)
  })

  it('falls back to the default character for a tampered stored value', () => {
    window.localStorage.setItem(GUEST_STORAGE_KEY, '"><script>')
    show({ kind: 'overview' })
    expect(companions.get().guest).toEqual(DEFAULT_GUEST)
  })

  it('keeps a stored field that is good beside one that is not', () => {
    const age = guestOptions.age.find((o) => o.id !== DEFAULT_GUEST.age)!.id
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ age, style: '__proto__', skin: 'constructor' }))
    show({ kind: 'overview' })
    expect(companions.get().guest).toEqual({ ...DEFAULT_GUEST, age })
  })

  it('ignores a change to an unknown option, and keeps the rest', () => {
    show({ kind: 'overview' })
    const skin = guestOptions.skin.find((o) => o.id !== DEFAULT_GUEST.skin)!.id
    act(() => companions.chooseGuest({ age: 'toString', skin } as never))
    expect(companions.get().guest).toEqual({ ...DEFAULT_GUEST, skin })
  })
})
