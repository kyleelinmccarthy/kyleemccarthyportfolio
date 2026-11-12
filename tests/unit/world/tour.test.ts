import { describe, it, expect } from 'vitest'
import { tourIndex, tourStep } from '@/lib/world/tour'
import { tourOrder } from '@/content/world'

describe('tour', () => {
  it('knows where each stop sits', () => {
    expect(tourIndex('home')).toBe(0)
    expect(tourIndex('three-things')).toBe(1)
    expect(tourIndex('post')).toBe(tourOrder.length - 1)
    expect(tourIndex('nope')).toBe(-1)
  })

  it('steps and wraps', () => {
    expect(tourStep(null, 1)).toBe('home')
    expect(tourStep('home', 1)).toBe('three-things')
    expect(tourStep('home', -1)).toBe('post')
    expect(tourStep('post', 1)).toBe('home')
    expect(tourStep('nope', 1)).toBe('home')
  })

  it('starts at the first stop from anywhere off the tour, whichever way it steps', () => {
    expect(tourStep(null, -1)).toBe('home')
    expect(tourStep('nope', -1)).toBe('home')
    expect(tourStep('', 1)).toBe('home')
  })

  it('visits every stop once going forward, and back the same way', () => {
    const seen: string[] = []
    let id: string | null = null
    for (let i = 0; i < tourOrder.length; i++) seen.push((id = tourStep(id, 1)))
    expect(seen).toEqual(tourOrder)
    for (let i = tourOrder.length - 1; i > 0; i--) expect(tourStep(tourOrder[i]!, -1)).toBe(tourOrder[i - 1])
  })
})
