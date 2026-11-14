import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { arrivalCopy, build, hero, lead, proof } from '@/content/about'
import { ARRIVAL, ARRIVAL_AT_ATTR, ARRIVAL_ATTR } from '@/lib/arrival'

// jsdom has no WebGL: the welcome pair's live canvas is left out (tests/unit/hud/welcome.test.tsx covers the pair).
vi.mock('@/components/world/PairCanvas', () => ({ PairCanvas: () => null }))

const html = document.documentElement

/** The arrival's store and components afresh, as a new page load would have them, with the init script's mark set or not. */
async function load(playing: boolean) {
  vi.resetModules()
  if (playing) {
    html.setAttribute(ARRIVAL_ATTR, 'play')
    html.setAttribute(ARRIVAL_AT_ATTR, String(performance.now()))
  }
  const store = await import('@/components/hud/arrivalStore')
  const { Arrival } = await import('@/components/hud/Arrival')
  return { ...store, Arrival }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
})

afterEach(() => {
  vi.useRealTimers()
  html.removeAttribute(ARRIVAL_ATTR)
  html.removeAttribute(ARRIVAL_AT_ATTR)
  window.sessionStorage.clear()
})

describe('the proof figures', () => {
  it('are three of the figures Kylee already gives, values unchanged', () => {
    const given = [...lead.figures, ...build.figures].map((f) => f.value as string)
    expect(proof).toHaveLength(3)
    for (const { value } of proof) expect(given).toContain(value)
  })

  it('keep their labels short enough to read at a glance', () => {
    for (const { label } of proof) expect(label.length).toBeLessThanOrEqual(36)
  })
})

describe('the proof row', () => {
  it('is real text: each figure’s value and its label, in a list', async () => {
    const { Proof } = await import('@/components/hud/Proof')
    render(<Proof />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(proof.map((f) => `${f.value} ${f.label}`))
  })

  it('counts, in the arrival’s statement, at a fixed width from the value’s own number', async () => {
    const { Proof } = await import('@/components/hud/Proof')
    const { container } = render(<Proof counting />)
    const counts = [...container.querySelectorAll<HTMLElement>('.proof-count')]
    expect(counts).toHaveLength(3)
    expect(counts.map((c) => c.style.getPropertyValue('--to'))).toEqual(['200', '20', '11'])
    expect(counts.map((c) => c.style.getPropertyValue('--digits'))).toEqual(['3', '2', '2'])
    // The rest of a value stays as it is.
    expect(container.textContent).toContain(' of 14')
  })
})

describe('the arrival’s clock', () => {
  it('is not playing, and reads as at rest, without the init script’s mark', async () => {
    const { arrival } = await load(false)
    expect(arrival.stage()).toBe('done')
    expect(arrival.elapsed(performance.now())).toBe(Number.POSITIVE_INFINITY)
  })

  it('moves through its stages on the timeline’s times, then takes the mark off <html>', async () => {
    const { arrival } = await load(true)
    const heard = vi.fn()
    arrival.subscribe(heard)
    expect(arrival.stage()).toBe('statement')
    expect(arrival.elapsed(performance.now())).toBe(0)
    vi.advanceTimersByTime(ARRIVAL.settle.at)
    expect(arrival.stage()).toBe('build')
    vi.advanceTimersByTime(ARRIVAL.greet - ARRIVAL.settle.at)
    expect(arrival.stage()).toBe('greet')
    expect(html.getAttribute(ARRIVAL_ATTR)).toBe('play')
    vi.advanceTimersByTime(ARRIVAL.end - ARRIVAL.greet)
    expect(arrival.stage()).toBe('done')
    expect(html.hasAttribute(ARRIVAL_ATTR)).toBe(false)
    expect(arrival.elapsed(performance.now())).toBe(Number.POSITIVE_INFINITY)
    expect(heard).toHaveBeenCalledTimes(3)
  })

  it('starts from when the init script began it, not from when the page’s script arrived', async () => {
    html.setAttribute(ARRIVAL_ATTR, 'play')
    html.setAttribute(ARRIVAL_AT_ATTR, String(performance.now() - ARRIVAL.greet))
    vi.resetModules()
    const { arrival } = await import('@/components/hud/arrivalStore')
    expect(arrival.stage()).toBe('greet')
  })

  it('skips to the end at once', async () => {
    const { arrival } = await load(true)
    arrival.skip()
    expect(arrival.stage()).toBe('done')
    expect(html.hasAttribute(ARRIVAL_ATTR)).toBe(false)
    expect(arrival.elapsed(performance.now())).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('the arrival’s statement', () => {
  it('is decoration, hidden from assistive technology; its Skip control is a real button', async () => {
    const { Arrival } = await load(true)
    const { container } = render(<Arrival />)
    const statement = container.querySelector('.arrival-statement')!
    expect(statement).toHaveAttribute('aria-hidden', 'true')
    expect(statement).toHaveTextContent(hero.headline)
    expect(screen.getByRole('button', { name: arrivalCopy.skip })).toBeInTheDocument()
  })

  it('is skipped by its control', async () => {
    const { Arrival, arrival } = await load(true)
    render(<Arrival />)
    fireEvent.click(screen.getByRole('button', { name: arrivalCopy.skip }))
    expect(arrival.stage()).toBe('done')
    expect(html.hasAttribute(ARRIVAL_ATTR)).toBe(false)
  })

  it('is skipped by any key', async () => {
    const { Arrival, arrival } = await load(true)
    render(<Arrival />)
    act(() => {
      fireEvent.keyDown(document.body, { key: 'a' })
    })
    expect(arrival.stage()).toBe('done')
  })

  it('is skipped by any click or tap, which still goes where it was going', async () => {
    const { Arrival, arrival } = await load(true)
    render(
      <>
        <Arrival />
        <a href="#elsewhere">Elsewhere</a>
      </>,
    )
    const link = screen.getByRole('link', { name: 'Elsewhere' })
    const pressed = fireEvent.pointerDown(link)
    expect(pressed).toBe(true)
    expect(arrival.stage()).toBe('done')
  })

  it('ends when the visitor leaves the home page while it plays', async () => {
    const { Arrival, arrival } = await load(true)
    const view = render(<Arrival />)
    view.unmount()
    vi.advanceTimersByTime(1)
    expect(arrival.stage()).toBe('done')
  })
})

describe('the guide during the arrival', () => {
  it('waits while the world is built, and greets the visitor once it is', async () => {
    await load(true)
    const { GuideLayer } = await import('@/components/hud/GuideLayer')
    const { ThemeProvider } = await import('@/components/hud/ThemeProvider')
    const { container } = render(
      <ThemeProvider>
        <GuideLayer route={{ kind: 'overview' }} />
      </ThemeProvider>,
    )
    expect(container.ownerDocument.querySelector('.guide-dock')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(ARRIVAL.greet)
    })
    expect(container.ownerDocument.querySelector('.guide-dock')).not.toBeNull()
  })
})
