import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Gallery } from '@/components/media/Gallery'

const items = [
  { src: '/media/kingdoms-and-crowns/castle.jpg', alt: 'The castle screen' },
  { src: '/media/kingdoms-and-crowns/tavern.jpg', alt: 'The tavern screen' },
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
})
