import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hoverGrace } from '@/components/world/hoverGrace'

describe('the hover grace', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('puts a label out only after the grace, unless the pointer comes back', () => {
    const mark = vi.fn()
    const grace = hoverGrace(mark, 700)
    grace.heat('a')
    grace.coolLater('a')
    vi.advanceTimersByTime(699)
    expect(mark).toHaveBeenLastCalledWith('a', true)
    vi.advanceTimersByTime(1)
    expect(mark).toHaveBeenLastCalledWith('a', false)
    grace.heat('b')
    grace.coolLater('b')
    grace.heat('b')
    vi.advanceTimersByTime(2000)
    expect(mark).toHaveBeenLastCalledWith('b', true)
  })

  it('leaves no timer running when cleared, and puts those labels out at once', () => {
    const mark = vi.fn()
    const grace = hoverGrace(mark, 700)
    grace.heat('a')
    grace.coolLater('a')
    grace.coolLater('b')
    expect(grace.pending).toBe(2)
    expect(vi.getTimerCount()).toBe(2)
    grace.clear()
    expect(grace.pending).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(mark).toHaveBeenCalledWith('a', false)
    mark.mockClear()
    vi.advanceTimersByTime(2000)
    expect(mark).not.toHaveBeenCalled()
  })
})
