import type { ProfileSectionId } from '@/content/profile'

/** The header control that opened the profile: one of the three, or the menu that holds them. */
export type ProfileOpener = ProfileSectionId | 'menu'

/** The attribute each opener carries, so focus can find it again on the page the panel closes to. */
export const OPENER_ATTRIBUTE = 'data-profile-opener'

/**
 * The way back out of the profile. The header's controls are links, so the
 * profile opens as a page and the header it was opened from goes with the old
 * one: this remembers where the visitor was and which control they pressed,
 * so closing the panel goes back there and gives that control focus again (as
 * the index drawer and the character picker hand focus back to their button).
 * It also asks the panel to take focus when it opens. A single value, not a
 * store: nothing re-renders when it changes.
 */
let from: string | null = null
let opener: ProfileOpener | null = null
let focusIn = false
let focusBack: ProfileOpener | null = null

export const profileTrail = {
  /**
   * A header control was pressed at `path`. From outside the profile, that is
   * where closing will return; from a section, the profile is already open
   * and the way back stays as it was.
   */
  open(path: string, pressed: ProfileOpener, inProfile: boolean): void {
    if (!inProfile) {
      from = path
      opener = pressed
    }
    focusIn = true
  },
  /** Where closing goes: where the visitor was, or the planet for one who arrived at the profile. */
  back(): string {
    return from ?? '/'
  },
  /** The panel is closing: the control that opened it gets focus on the page it closes to. */
  close(): void {
    focusBack = opener
    from = null
    opener = null
  },
  /** Whether the panel should take focus now (once). */
  takeFocusIn(): boolean {
    const take = focusIn
    focusIn = false
    return take
  },
  /** The control to give focus back to (once), if the panel has just closed. */
  takeFocusBack(): ProfileOpener | null {
    const back = focusBack
    focusBack = null
    return back
  },
  /** For tests: forget everything. */
  reset(): void {
    from = null
    opener = null
    focusIn = false
    focusBack = null
  },
}
