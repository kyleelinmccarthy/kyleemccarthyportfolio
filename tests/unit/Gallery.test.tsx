import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Gallery } from '@/components/media/Gallery'

const items = [
  { src: '/media/kingdoms-and-crowns/castle.jpg', alt: 'The castle screen' },
  { src: '/media/kingdoms-and-crowns/tavern.jpg', alt: 'The tavern screen' },
  { src: '/media/kingdoms-and-crowns/throne.jpg', alt: 'The throne room' },
]

beforeAll(() => {
  // jsdom does not implement <dialog>'s methods.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
  })
})

describe('Gallery', () => {
  it('renders a labelled button per thumbnail', () => {
    render(<Gallery items={items} label="Kingdoms & Crowns" />)
    expect(screen.getByRole('button', { name: /The castle screen/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /The tavern screen/ })).toBeInTheDocument()
  })

  it('opens the dialog showing the activated image', async () => {
    const user = userEvent.setup()
    render(<Gallery items={items} label="Kingdoms & Crowns" />)
    await user.click(screen.getByRole('button', { name: /The tavern screen/ }))
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
    const dialog = document.querySelector('dialog')!
    expect(dialog.getAttribute('aria-label')).toBe('Kingdoms & Crowns gallery')
  })

  it('ArrowRight advances the displayed image; ArrowLeft goes back', async () => {
    const user = userEvent.setup()
    render(<Gallery items={items} label="Kingdoms & Crowns" />)
    await user.click(screen.getByRole('button', { name: /The castle screen/ }))
    const dialog = document.querySelector('dialog')!
    expect(within(dialog).getByAltText('The castle screen')).toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(within(dialog).getByAltText('The tavern screen')).toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(within(dialog).getByAltText('The castle screen')).toBeInTheDocument()
  })

  it('wraps around: ArrowLeft from the first image goes to the last, ArrowRight from the last goes to the first', async () => {
    const user = userEvent.setup()
    render(<Gallery items={items} label="Kingdoms & Crowns" />)
    // Opens on the first image (index 0).
    await user.click(screen.getByRole('button', { name: /The castle screen/ }))
    const dialog = document.querySelector('dialog')!
    expect(within(dialog).getByAltText('The castle screen')).toBeInTheDocument()

    // first -> last
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(within(dialog).getByAltText('The throne room')).toBeInTheDocument()

    // last -> first
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(within(dialog).getByAltText('The castle screen')).toBeInTheDocument()
  })

  it('the Close button calls dialog.close()', async () => {
    const user = userEvent.setup()
    render(<Gallery items={items} label="Kingdoms & Crowns" />)
    await user.click(screen.getByRole('button', { name: /The castle screen/ }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
  })

  it('focuses the invoking thumbnail before opening the dialog, so focus returns there deterministically on close', () => {
    render(<Gallery items={items} label="Kingdoms & Crowns" />)
    const trigger = screen.getByRole('button', { name: /The tavern screen/ })
    // fireEvent.click (unlike userEvent.click) does not simulate a browser's
    // click-focuses-the-button behaviour, so this only passes if Gallery
    // itself moves focus to the trigger before calling showModal().
    fireEvent.click(trigger)
    expect(document.activeElement).toBe(trigger)
  })

  it('removes the keydown listener on unmount', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Gallery items={items} label="Kingdoms & Crowns" />)
    await user.click(screen.getByRole('button', { name: /The castle screen/ }))
    const dialog = document.querySelector('dialog')!
    const removeSpy = vi.spyOn(dialog, 'removeEventListener')
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
