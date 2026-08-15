import { describe, it, expect, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { parseStatValue, formatCountValue } from '@/lib/countup'
import { CountUp } from '@/components/primitives/CountUp'

// Mock IntersectionObserver for framer-motion useInView
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return []
    }
    unobserve() {}
  } as any
})

describe('parseStatValue', () => {
  it('parses a bare integer', () => {
    expect(parseStatValue('9')).toEqual({ prefix: '', target: 9, suffix: '', animatable: true })
  })

  it('keeps a trailing "+" as suffix', () => {
    expect(parseStatValue('200+')).toEqual({ prefix: '', target: 200, suffix: '+', animatable: true })
    expect(parseStatValue('11+')).toEqual({ prefix: '', target: 11, suffix: '+', animatable: true })
  })

  it('handles a leading currency prefix and complex suffix', () => {
    expect(parseStatValue('$1,600+/yr')).toEqual({
      prefix: '$',
      target: 1600,
      suffix: '+/yr',
      animatable: true,
    })
  })

  it('handles unit suffixes with a space', () => {
    expect(parseStatValue('6 weeks')).toEqual({
      prefix: '',
      target: 6,
      suffix: ' weeks',
      animatable: true,
    })
  })

  it('handles symbol suffixes', () => {
    expect(parseStatValue('2×+')).toEqual({ prefix: '', target: 2, suffix: '×+', animatable: true })
    expect(parseStatValue('50/quarter')).toEqual({
      prefix: '',
      target: 50,
      suffix: '/quarter',
      animatable: true,
    })
  })

  it('falls back to non-animatable when there is no leading number', () => {
    expect(parseStatValue('N/A')).toEqual({
      prefix: 'N/A',
      target: 0,
      suffix: '',
      animatable: false,
    })
  })
})

describe('formatCountValue', () => {
  it('re-inserts thousands separators and wraps with prefix/suffix', () => {
    const parsed = parseStatValue('$1,600+/yr')
    expect(formatCountValue(parsed, 1600)).toBe('$1,600+/yr')
    expect(formatCountValue(parsed, 800)).toBe('$800+/yr')
  })

  it('rounds intermediate animation values to whole numbers', () => {
    const parsed = parseStatValue('200+')
    expect(formatCountValue(parsed, 133.7)).toBe('134+')
  })

  it('renders non-animatable values as their literal prefix', () => {
    const parsed = parseStatValue('N/A')
    expect(formatCountValue(parsed, 0)).toBe('N/A')
  })
})

describe('CountUp component', () => {
  it('exposes the value with a role that permits an accessible name', () => {
    const { container } = render(<CountUp value="200+" active={false} />)
    const labelled = container.querySelector('[aria-label]')
    expect(labelled).not.toBeNull()
    // A bare <span> is role=generic, which prohibits aria-label (axe:
    // aria-prohibited-attr, serious). It needs a role that permits naming.
    expect(labelled!.getAttribute('role')).toBe('img')
  })
})
