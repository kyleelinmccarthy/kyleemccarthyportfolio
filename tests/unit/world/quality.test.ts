import { describe, it, expect } from 'vitest'
import { hookedRenderScale, pickQuality, postProcessing, renderScale, shouldDowngrade, testHooksOn } from '@/lib/world/quality'

describe('pickQuality', () => {
  it('chooses low quality for data savers, weak devices and phones', () => {
    expect(pickQuality({ saveData: true, width: 1440 })).toBe('low')
    expect(pickQuality({ saveData: false, deviceMemory: 2, width: 1440 })).toBe('low')
    expect(pickQuality({ saveData: false, cores: 2, width: 1440 })).toBe('low')
    expect(pickQuality({ saveData: false, width: 390 })).toBe('low')
    expect(pickQuality({ saveData: false, deviceMemory: 8, cores: 8, width: 1440 })).toBe('high')
    expect(pickQuality({ saveData: false, width: 1440 })).toBe('high')
  })

  it('treats the phone layout as a phone and anything wider as a laptop', () => {
    expect(pickQuality({ saveData: false, width: 820 })).toBe('low')
    expect(pickQuality({ saveData: false, width: 821 })).toBe('high')
  })

  it('takes four cores and four gigabytes as enough', () => {
    expect(pickQuality({ saveData: false, deviceMemory: 4, cores: 4, width: 1440 })).toBe('high')
  })
})

describe('shouldDowngrade', () => {
  it('downgrades only on sustained slow frames', () => {
    expect(shouldDowngrade(Array(119).fill(40))).toBe(false)
    expect(shouldDowngrade(Array(120).fill(40))).toBe(true)
    expect(shouldDowngrade(Array(120).fill(16))).toBe(false)
  })

  it('judges the mean, not the odd slow frame', () => {
    const mostlyFast = [...Array(110).fill(16), ...Array(10).fill(100)]
    expect(shouldDowngrade(mostlyFast)).toBe(false) // mean 23 ms
    expect(shouldDowngrade(Array(120).fill(28))).toBe(false)
    expect(shouldDowngrade(Array(120).fill(28.5))).toBe(true)
  })
})

describe('renderScale', () => {
  it('is 1 when the hook is absent or is not a number', () => {
    expect(renderScale(undefined)).toBe(1)
    expect(renderScale(null)).toBe(1)
    expect(renderScale('0.5')).toBe(1)
    expect(renderScale(Number.NaN)).toBe(1)
    expect(renderScale({})).toBe(1)
  })

  it('passes a scale between a quarter and 1 through', () => {
    expect(renderScale(0.5)).toBe(0.5)
    expect(renderScale(0.25)).toBe(0.25)
    expect(renderScale(1)).toBe(1)
  })

  it('keeps zero, negatives and too-small values at a quarter, and anything above 1 at 1', () => {
    expect(renderScale(0)).toBe(0.25)
    expect(renderScale(-3)).toBe(0.25)
    expect(renderScale(0.1)).toBe(0.25)
    expect(renderScale(Number.NEGATIVE_INFINITY)).toBe(0.25)
    expect(renderScale(2)).toBe(1)
    expect(renderScale(Number.POSITIVE_INFINITY)).toBe(1)
  })
})

describe('the test hooks', () => {
  it('are on only in an e2e build', () => {
    expect(testHooksOn('1')).toBe(true)
    for (const off of [undefined, '', '0', 'true', ' 1']) expect(testHooksOn(off)).toBe(false)
  })

  it('scale the canvas only when they are on', () => {
    expect(hookedRenderScale('1', 0.5)).toBe(0.5)
    expect(hookedRenderScale('1', undefined)).toBe(1)
    expect(hookedRenderScale(undefined, 0.5)).toBe(1)
    expect(hookedRenderScale('0', 0.25)).toBe(1)
  })
})

describe('postProcessing', () => {
  it('uses bloom while a canvas made for high quality is at high quality', () => {
    expect(postProcessing('high', 'high')).toBe('bloom')
  })

  it('keeps multisampling, without bloom, when a canvas made for high quality drops to low', () => {
    // Its context was created without antialiasing (the bloom target is the multisampled one), and cannot be changed after.
    expect(postProcessing('high', 'low')).toBe('multisample')
  })

  it('needs none on a canvas made for low quality, which is multisampled itself', () => {
    expect(postProcessing('low', 'low')).toBe('none')
  })
})
