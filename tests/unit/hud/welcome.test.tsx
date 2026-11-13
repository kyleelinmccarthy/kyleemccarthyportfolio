import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { GuideLayer } from '@/components/hud/GuideLayer'
import { CHANGE_CHARACTER_ID, ChangeCharacter } from '@/components/hud/ChangeCharacter'
import { ThemeProvider } from '@/components/hud/ThemeProvider'
import { companions } from '@/components/hud/companionStore'
import { DEFAULT_GUEST, guestOptions } from '@/content/characters'
import { guide } from '@/content/guide'
import { GREETED_STORAGE_KEY } from '@/lib/companionPrefs'
import { guestPicture } from '@/lib/guests'
import type { GuideRoute } from '@/lib/world/guide'

// jsdom has no WebGL: the live pair stands in as a marker of what it was given.
vi.mock('@/components/world/PairCanvas', () => ({
  PairCanvas: ({ guest, waving }: { guest: { age: string; style: string; skin: string }; waving: boolean }) => (
    <div data-testid="pair-canvas" data-guest={`${guest.age} ${guest.style} ${guest.skin}`} data-waving={String(waving)} />
  ),
}))

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
  vi.useRealTimers()
})

function show(route: GuideRoute, reducedMotion = false) {
  const view = render(
    <ThemeProvider>
      <GuideLayer route={route} reducedMotion={reducedMotion} />
    </ThemeProvider>,
  )
  act(() => companions.load())
  return view
}

const pair = () => document.querySelector('.welcome')
const changeButtons = () => screen.queryAllByRole('button', { name: new RegExp(guide.controls.change) })

describe('the character control', () => {
  it('is a real button named for what it does, showing the visitor’s own picture, opening the picker', () => {
    act(() => companions.load())
    render(<ChangeCharacter kind="tool" word />)
    const button = screen.getByRole('button', { name: guide.controls.change })
    expect(button).toHaveAttribute('id', CHANGE_CHARACTER_ID)
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button).toHaveTextContent(guide.controls.changeShort)
    expect(button.querySelector('img')).toHaveAttribute('src', guestPicture(DEFAULT_GUEST))
    fireEvent.click(button)
    expect(companions.get().picker).toBe(true)
  })

  it('shows the picture alone where there is no room for the word, keeping its name', () => {
    act(() => companions.load())
    render(<ChangeCharacter kind="tool" />)
    const button = screen.getByRole('button', { name: guide.controls.change })
    expect(button).not.toHaveTextContent(guide.controls.changeShort)
    expect(button.querySelector('img')).not.toBeNull()
  })

  it('beside the greeting says who the figure is, and its name keeps the words it shows', () => {
    render(<ChangeCharacter kind="pair" />)
    const button = screen.getByRole('button', { name: `${guide.controls.you}. ${guide.controls.change}` })
    expect(button).toHaveTextContent(guide.controls.you)
    expect(button).toHaveTextContent(guide.controls.changeShort)
  })

  it('changes its picture the moment the visitor changes their character', () => {
    act(() => companions.load())
    render(<ChangeCharacter kind="tool" />)
    const skin = guestOptions.skin.find((o) => o.id !== DEFAULT_GUEST.skin)!.id
    act(() => companions.chooseGuest({ skin }))
    expect(screen.getByRole('button').querySelector('img')).toHaveAttribute('src', guestPicture({ ...DEFAULT_GUEST, skin }))
  })

  it('gives up the picker’s focus id while it is not the control', () => {
    render(<ChangeCharacter kind="pair" active={false} />)
    expect(screen.getByRole('button')).not.toHaveAttribute('id')
  })
})

describe('the welcome pair', () => {
  it('stands beside the greeting on a first arrival, waving, with the one character control under the visitor', async () => {
    show({ kind: 'overview' })
    expect(pair()).not.toBeNull()
    expect(await screen.findByTestId('pair-canvas')).toHaveAttribute('data-waving', 'true')
    // The figures are decorative: only the button is exposed, and it is the one control (the bubble's gives way).
    expect(pair()!.querySelector('.welcome-figures')).toHaveAttribute('aria-hidden', 'true')
    const buttons = changeButtons()
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAttribute('id', CHANGE_CHARACTER_ID)
    expect(pair()!.contains(buttons[0]!)).toBe(true)
  })

  it('draws the visitor’s character as it is chosen now', async () => {
    show({ kind: 'overview' })
    const skin = guestOptions.skin.find((o) => o.id !== DEFAULT_GUEST.skin)!.id
    act(() => companions.chooseGuest({ skin }))
    expect(await screen.findByTestId('pair-canvas')).toHaveAttribute('data-guest', `${DEFAULT_GUEST.age} ${DEFAULT_GUEST.style} ${skin}`)
  })

  it('opens the picker from its control, and the picker gives focus back to it', () => {
    show({ kind: 'overview' })
    const button = changeButtons()[0]!
    button.focus()
    fireEvent.click(button)
    const dialog = screen.getByRole('dialog', { name: guide.controls.pickerTitle })
    expect(dialog).toHaveAttribute('open')
    fireEvent.click(screen.getByRole('button', { name: guide.controls.done }))
    expect(document.activeElement).toBe(button)
  })

  it('shrinks away when the visitor chooses to look round alone, and the bubble’s control comes back', () => {
    vi.useFakeTimers()
    show({ kind: 'overview' })
    fireEvent.click(screen.getByRole('button', { name: guide.tour.alone }))
    expect(pair()).toHaveAttribute('data-stage', 'out')
    expect(pair()).toHaveAttribute('inert')
    act(() => vi.advanceTimersByTime(1000))
    expect(pair()).toBeNull()
    const buttons = changeButtons()
    expect(buttons).toHaveLength(1)
    expect(document.getElementById('guide-bubble')!.contains(buttons[0]!)).toBe(true)
  })

  it('under reduced motion stands without waving, and simply goes', async () => {
    show({ kind: 'overview' }, true)
    expect(await screen.findByTestId('pair-canvas')).toHaveAttribute('data-waving', 'false')
    fireEvent.click(screen.getByRole('button', { name: guide.tour.alone }))
    expect(pair()).toBeNull()
  })

  it('is not there for a visitor she has already greeted, nor at a place', () => {
    window.sessionStorage.setItem(GREETED_STORAGE_KEY, '1')
    const view = show({ kind: 'overview' })
    expect(pair()).toBeNull()
    view.unmount()
    act(() => companions.reset())
    window.sessionStorage.clear()
    show({ kind: 'place', id: 'beacon' })
    expect(pair()).toBeNull()
  })

  it('goes when the hints are hidden', () => {
    show({ kind: 'overview' }, true)
    fireEvent.click(screen.getByRole('button', { name: guide.controls.hide }))
    expect(pair()).toBeNull()
  })
})
