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

  it('offers two ways out, and both call dialog.close()', async () => {
    // There are two Close buttons on purpose: the × in the corner, so you can
    // get out without reading to the bottom, and the one in the footer beside
    // the Previous/Next controls.
    const user = userEvent.setup()
    render(<Gallery items={items} label="Kingdoms & Crowns" />)
    await user.click(screen.getByRole('button', { name: /The castle screen/ }))

    const ways = screen.getAllByRole('button', { name: 'Close' })
    expect(ways).toHaveLength(2)
    for (const way of ways) {
      await user.click(way)
      expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
    }
  })

  it('closes when you click outside the picture', async () => {
    // The click lands on the ::backdrop, which the platform reports against
    // the dialog element itself. Anything inside must NOT close it, which is
    // why the dialog carries no padding of its own.
    //
    // The spy is installed once for the file, so clear it: the assertion below
    // is about this test's clicks, not every click the suite has made.
    vi.mocked(HTMLDialogElement.prototype.close).mockClear()
    render(<Gallery items={items} label="Kingdoms & Crowns" />)
    fireEvent.click(screen.getByRole('button', { name: /The castle screen/ }))
    const dialog = document.querySelector('dialog')!

    fireEvent.click(dialog.querySelector('img')!)
    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled()

    fireEvent.click(dialog)
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
