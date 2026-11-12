import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TourBar } from '@/components/hud/TourBar'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

afterEach(() => push.mockClear())

describe('TourBar', () => {
  it('shows where you are and links both ways, wrapping at the ends', () => {
    render(<TourBar placeId="home" />)
    expect(screen.getByText('01 / 19 · Home')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Next place' })).toHaveAttribute('href', '/places/three-things')
    expect(screen.getByRole('link', { name: 'Previous place' })).toHaveAttribute('href', '/places/post')
  })

  it('numbers a later stop and names it', () => {
    render(<TourBar placeId="beacon" />)
    expect(screen.getByText('03 / 19 · Beacon')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Next place' })).toHaveAttribute('href', '/places/403hq')
    expect(screen.getByRole('link', { name: 'Previous place' })).toHaveAttribute('href', '/places/three-things')
  })

  it('steps with the arrow keys and leaves with Escape', () => {
    render(<TourBar placeId="beacon" />)
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(push).toHaveBeenLastCalledWith('/places/403hq')
    // 403hq has not arrived yet, so back is back from 403hq.
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(push).toHaveBeenLastCalledWith('/places/beacon')
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(push).toHaveBeenLastCalledWith('/places/three-things')
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(push).toHaveBeenLastCalledWith('/')
    expect(push).toHaveBeenCalledTimes(4)
  })

  it('steps on from the last stop asked for when the keys come faster than the pages', () => {
    const { rerender } = render(<TourBar placeId="home" />)
    for (let i = 0; i < 3; i++) fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(push.mock.calls.map(([href]) => href)).toEqual(['/places/three-things', '/places/beacon', '/places/403hq'])
    // A stop on the way arrives: the run carries on from the last one asked for.
    rerender(<TourBar placeId="three-things" />)
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(push).toHaveBeenLastCalledWith('/places/aura')
    // The last one arrives: the next press steps from where the page now is.
    rerender(<TourBar placeId="aura" />)
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(push).toHaveBeenLastCalledWith('/places/ruckus')
    // Somewhere else arrives (a link, the back button): that is where the next press steps from.
    rerender(<TourBar placeId="art" />)
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(push).toHaveBeenLastCalledWith('/places/tattoo-designs')
    fireEvent.keyDown(document.body, { key: 'Escape' })
  })

  it.each(['input', 'textarea', 'select'])('ignores the keys while focus is in a %s', (tag) => {
    render(
      <>
        <TourBar placeId="beacon" />
        {tag === 'input' ? <input aria-label="x" /> : tag === 'textarea' ? <textarea aria-label="x" /> : <select aria-label="x" />}
      </>,
    )
    const field = screen.getByLabelText('x')
    field.focus()
    fireEvent.keyDown(field, { key: 'ArrowRight' })
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(push).not.toHaveBeenCalled()
  })

  it('ignores the keys while focus is in editable content', () => {
    render(
      <>
        <TourBar placeId="beacon" />
        <div data-testid="rich" contentEditable suppressContentEditableWarning />
      </>,
    )
    const rich = screen.getByTestId('rich')
    // jsdom does not compute isContentEditable, so state it the way a browser would.
    Object.defineProperty(rich, 'isContentEditable', { value: true })
    fireEvent.keyDown(rich, { key: 'ArrowLeft' })
    expect(push).not.toHaveBeenCalled()
  })

  it('leaves browser shortcuts alone', () => {
    render(<TourBar placeId="beacon" />)
    fireEvent.keyDown(document.body, { key: 'ArrowLeft', altKey: true })
    fireEvent.keyDown(document.body, { key: 'ArrowRight', metaKey: true })
    expect(push).not.toHaveBeenCalled()
  })
})
