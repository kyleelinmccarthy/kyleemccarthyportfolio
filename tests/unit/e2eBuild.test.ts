import { describe, it, expect } from 'vitest'
import { isE2eBuild } from '@/scripts/lib/e2eBuild'

describe('isE2eBuild', () => {
  it('sees the marker on the html tag, with other attributes before and after it', () => {
    expect(isE2eBuild('<!DOCTYPE html><html lang="en" data-e2e="" class="a b"><head></head></html>')).toBe(true)
    expect(isE2eBuild('<html data-e2e><body></body></html>')).toBe(true)
    expect(isE2eBuild('<html data-e2e="" lang="en">')).toBe(true)
    expect(isE2eBuild('<html\n  lang="en"\n  data-e2e=""\n  class="a">')).toBe(true)
  })

  it('does not see it on an ordinary build', () => {
    expect(isE2eBuild('<!DOCTYPE html><html lang="en" class="a b"><head></head><body></body></html>')).toBe(false)
    expect(isE2eBuild('')).toBe(false)
  })

  it('is not fooled by a page that only mentions it', () => {
    const mention = '<!DOCTYPE html><html lang="en" class="a"><head><script>self.__next_f.push([1,"{\\"data-e2e\\":\\"$undefined\\"}"])</script></head><body><p>data-e2e</p></body></html>'
    expect(isE2eBuild(mention)).toBe(false)
    expect(isE2eBuild('<html lang="en"><body><div data-e2e=""></div></body></html>')).toBe(false)
    expect(isE2eBuild('<html lang="en" data-e2e-not="x">')).toBe(false)
  })
})
