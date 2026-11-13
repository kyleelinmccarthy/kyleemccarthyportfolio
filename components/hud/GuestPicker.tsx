'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { guestOptions, type GuestChoice, type GuestOption } from '@/content/characters'
import { guide } from '@/content/guide'
import { people } from '@/content/sky'
import { GUEST_FIELDS, guestPicture, type GuestField } from '@/lib/guests'
import { Modal, useModal } from '@/components/primitives/Modal'
import { companions, useCompanions } from './companionStore'
import { CHANGE_CHARACTER_ID } from './GuideBubble'

/** The size the picture of the character is drawn at, in CSS pixels (its file is 192 by 240: one and a half times that). */
const PICTURE = { width: 128, height: 160 }

/** The id of the picker's Done button, for tests. */
export const PICKER_DONE_ID = 'guest-picker-done'

/** One group of choices, as native radios: one tab stop, the arrow keys move through it, and every change applies at once. */
function Choices({ field, current }: { field: GuestField; current: string }) {
  const swatches = field === 'skin'
  const options: ReadonlyArray<GuestOption<string>> = guestOptions[field]
  const chosen = options.find((o) => o.id === current)
  return (
    <fieldset className="picker-group" data-field={field}>
      <legend className="picker-legend">
        {guide.controls[field]}
        {/* The tone's name, for those who see the swatches only (each swatch's own name is its radio's). */}
        {swatches && chosen && (
          <span aria-hidden className="picker-legend-value">
            {chosen.label}
          </span>
        )}
      </legend>
      <div className={swatches ? 'picker-swatches' : 'picker-choices'}>
        {options.map((o) => (
          <label key={o.id} className={swatches ? 'picker-swatch' : 'picker-choice'}>
            <input
              type="radio"
              name={`guest-${field}`}
              value={o.id}
              checked={o.id === current}
              onChange={() => companions.chooseGuest({ [field]: o.id } as Partial<GuestChoice>)}
              className="picker-radio"
            />
            {swatches ? (
              <>
                <span aria-hidden className="picker-dot" style={{ backgroundColor: people.skin[o.id as GuestChoice['skin']] }} />
                <span className="sr-only">{o.label}</span>
              </>
            ) : (
              <span>{o.label}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * The character picker: a native dialog (`Modal`: focus held inside it,
 * Escape and a click outside close it, focus goes back to the "Change your
 * character" button) where the visitor makes their character from three
 * groups of choices, an age, a style and a skin tone (`guestOptions`), with a
 * picture of it as it stands. Every change applies at once (to the world and
 * to what is stored); the dialog stays open until Done, Escape or a click
 * outside. It opens from that button or from pressing the character in the
 * world (both through `companions.openPicker`).
 */
export function GuestPicker() {
  const { picker, asks, guest } = useCompanions()
  const { ref, open, close } = useModal()

  // Each ask opens it (`asks`), even one that comes before the store has heard it closed.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (picker && !dialog.open) open(document.getElementById(CHANGE_CHARACTER_ID))
    if (!picker && dialog.open) close()
  }, [picker, asks, ref, open, close])

  // However it closes (Escape, a click outside, the close button, Done), the store hears of it.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const closed = () => {
      if (!dialog.open) companions.closePicker()
    }
    dialog.addEventListener('close', closed)
    return () => dialog.removeEventListener('close', closed)
  }, [ref])

  return (
    <Modal dialogRef={ref} label={guide.controls.pickerTitle}>
      <h2 className="mb-1.5 font-display text-[22px] font-extrabold leading-tight">{guide.controls.pickerTitle}</h2>
      <p className="mb-4 text-[14px] text-muted">{guide.controls.pickerIntro}</p>
      <div className="picker-body">
        <Image
          src={guestPicture(guest)}
          alt={guide.controls.preview}
          width={PICTURE.width}
          height={PICTURE.height}
          unoptimized
          className="picker-picture"
          data-guest={`${guest.age} ${guest.style} ${guest.skin}`}
        />
        <div className="picker-groups">
          {GUEST_FIELDS.map((field) => (
            <Choices key={field} field={field} current={guest[field]} />
          ))}
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button id={PICKER_DONE_ID} type="button" onClick={close} className="picker-done">
          {guide.controls.done}
        </button>
      </div>
    </Modal>
  )
}
