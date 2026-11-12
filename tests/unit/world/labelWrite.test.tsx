import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import type { TagItem } from '@/lib/world/labels'
import { freshWritten, writeLabel } from '@/components/world/labelWrite'
import { HUD_AWAY, useLabelsCleanup, type ProjectorState } from '@/components/world/labelHooks'

const item = (extra: Partial<TagItem> = {}): TagItem => ({
  id: 'x',
  form: 'district',
  on: true,
  at: { x: 10, y: 20 },
  held: false,
  size: { width: 100, height: 30 },
  shift: 0,
  rise: 38,
  flipX: false,
  flipY: false,
  tagless: false,
  ...extra,
})

describe('writing a label', () => {
  it('sets every mark on the first write, whatever the link carried before', () => {
    const el = document.createElement('a')
    el.setAttribute('data-on', '')
    el.setAttribute('data-flip-x', '')
    writeLabel(el, item({ on: false }), freshWritten())
    expect(el.hasAttribute('data-on')).toBe(false)
    const shown = document.createElement('a')
    shown.setAttribute('data-flip-x', '')
    writeLabel(shown, item(), freshWritten())
    expect(shown.hasAttribute('data-on')).toBe(true)
    expect(shown.hasAttribute('data-flip-x')).toBe(false)
  })

  it('closes a tag opened by a tap when its label stops showing, so it is not held when it comes back', () => {
    const el = document.createElement('a')
    const last = freshWritten()
    writeLabel(el, item(), last)
    el.setAttribute('data-open', '')
    // Zoomed in: the district's label goes; zoomed out again, it comes back closed.
    writeLabel(el, item({ on: false }), last)
    expect(el.hasAttribute('data-open')).toBe(false)
    writeLabel(el, item(), last)
    expect(el.hasAttribute('data-open')).toBe(false)
  })

  it('writes only what changed', () => {
    const el = document.createElement('a')
    const last = freshWritten()
    writeLabel(el, item(), last)
    el.style.transform = 'none'
    writeLabel(el, item(), last)
    expect(el.style.transform).toBe('none')
  })
})

describe('the labels cleanup', () => {
  it('puts the HUD back and forgets what it last wrote, so a remount (Fast Refresh) starts clean', () => {
    document.documentElement.setAttribute(HUD_AWAY, '')
    const { result, unmount } = renderHook(() => {
      const state = useRef<ProjectorState>({ away: true, landmark: true, layer: null })
      useLabelsCleanup(state)
      return state
    })
    unmount()
    expect(document.documentElement.hasAttribute(HUD_AWAY)).toBe(false)
    expect(result.current.current).toMatchObject({ away: false, landmark: false })
  })
})
