import type { LabelForm, TagItem } from '@/lib/world/labels'

/**
 * What was last written to a label's link, so only what changes is written
 * again. It starts `fresh`: the link may carry marks from before the projector
 * mounted, so the first write sets everything.
 */
export interface Written {
  /** Nothing written to this link yet (or it is a new link): write everything. */
  fresh: boolean
  on: boolean
  form: LabelForm | ''
  transform: string
  shift: number
  rise: number
  flipX: boolean
  flipY: boolean
  tagless: boolean
}

/** A record for a link nothing has been written to yet. */
export function freshWritten(): Written {
  return { fresh: true, on: false, form: '', transform: '', shift: 0, rise: 0, flipX: false, flipY: false, tagless: false }
}

/** Writes one label's lot to its link: only what changed since the last frame. A hidden label keeps its marks until it shows again. */
export function writeLabel(el: HTMLElement, it: TagItem, last: Written): void {
  const all = last.fresh
  // A hidden label's marks are not written, so it stays fresh until it shows and they are.
  last.fresh = all && !it.on
  if (all || it.on !== last.on) {
    el.toggleAttribute('data-on', it.on)
    // A tag opened by a tap closes when its label goes (zoomed past its tier, round the back), so it is not held when it returns.
    if (!it.on) el.removeAttribute('data-open')
    last.on = it.on
  }
  if (all || it.form !== last.form) {
    el.dataset.tier = it.form
    // A tag opened by a tap closes when its pin stops being a neighbour's.
    if (it.form !== 'nearby') el.removeAttribute('data-open')
    last.form = it.form
  }
  if (!it.on) return
  const transform = `translate3d(${it.at.x.toFixed(1)}px,${it.at.y.toFixed(1)}px,0)`
  if (all || transform !== last.transform) {
    el.style.transform = transform
    last.transform = transform
  }
  if (all || it.shift !== last.shift) {
    el.style.setProperty('--tag-shift', `${it.shift.toFixed(1)}px`)
    last.shift = it.shift
  }
  if (all || it.rise !== last.rise) {
    el.style.setProperty('--tag-rise', `${it.rise}px`)
    last.rise = it.rise
  }
  if (all || it.flipX !== last.flipX) {
    el.toggleAttribute('data-flip-x', it.flipX)
    last.flipX = it.flipX
  }
  if (all || it.flipY !== last.flipY) {
    el.toggleAttribute('data-flip-y', it.flipY)
    last.flipY = it.flipY
  }
  if (all || it.tagless !== last.tagless) {
    el.toggleAttribute('data-tagless', it.tagless)
    last.tagless = it.tagless
  }
}
