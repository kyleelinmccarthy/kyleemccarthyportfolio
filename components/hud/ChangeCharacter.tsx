'use client'

import Image from 'next/image'
import { guide } from '@/content/guide'
import { guestPicture } from '@/lib/guests'
import { companions, useCompanions } from './companionStore'

/** The id of the button that opens the character picker: focus comes back to it when the picker closes. One control carries it at a time. */
export const CHANGE_CHARACTER_ID = 'change-character'

interface ChangeCharacterProps {
  /**
   * How it looks: `tool`, in the guide's bubble, the visitor's own picture as
   * a small round thumbnail (with the short word too when `word`); `pair`,
   * under the visitor's character beside her greeting, "This is you" over the
   * word, the button reaching up over the figure so pressing it works too.
   */
  kind: 'tool' | 'pair'
  /** Show the short word beside the thumbnail (where there is room). */
  word?: boolean
  /** It is the control: it carries the id the picker gives focus back to. Off while it is going (the pair shrinking away), while the bubble's own takes over. */
  active?: boolean
}

/**
 * The one control that opens the character picker (`companions.openPicker`),
 * wherever it is offered: a real button, named "Change your character" (with
 * "This is you" first beside the greeting), showing the visitor their own
 * character so they know it for theirs, not a bare icon. The picture is the
 * still of their character as it is now (`guestPicture`), so it changes the
 * moment they change it.
 */
export function ChangeCharacter({ kind, word = false, active = true }: ChangeCharacterProps) {
  const { guest } = useCompanions()
  const { change, changeShort, you } = guide.controls
  const label = kind === 'pair' ? `${you}. ${change}` : change
  return (
    <button
      id={active ? CHANGE_CHARACTER_ID : undefined}
      type="button"
      aria-haspopup="dialog"
      aria-label={label}
      title={kind === 'tool' && !word ? change : undefined}
      className={kind === 'pair' ? 'you-pair' : `guide-tool you-tool${word ? ' you-tool-word' : ''}`}
      data-guest={`${guest.age} ${guest.style} ${guest.skin}`}
      onClick={() => companions.openPicker()}
    >
      {kind === 'pair' ? (
        <span className="you-label">
          <span className="you-who">{you}</span>
          <span className="you-change">{changeShort}</span>
        </span>
      ) : (
        <>
          <span aria-hidden className="you-thumb">
            <Image src={guestPicture(guest)} alt="" width={64} height={80} unoptimized />
          </span>
          {word && <span className="you-word">{changeShort}</span>}
        </>
      )}
    </button>
  )
}
