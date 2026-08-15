import { describe, it, expect } from 'vitest'
import { artSlug } from '@/scripts/lib/artSlug'

describe('artSlug', () => {
  it('lowercases and strips the extension', () => {
    expect(artSlug('ArcaneVi.jpg')).toBe('arcanevi')
    expect(artSlug('Bayside.png')).toBe('bayside')
  })

  it('collapses spaces, underscores and punctuation into single dashes', () => {
    expect(artSlug('Dak (1).jpg')).toBe('dak-1')
    expect(artSlug('20221005_182921(1).jpg')).toBe('20221005-182921-1')
    expect(artSlug('Resized_20221014_100739.jpeg')).toBe('resized-20221014-100739')
  })

  it('never emits leading or trailing dashes', () => {
    expect(artSlug('  _weird_.jpg  ')).toBe('weird')
  })
})
