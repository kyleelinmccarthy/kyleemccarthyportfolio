'use client'

import { useEffect } from 'react'
import { pets, usePets } from './petStore'

/**
 * The pets' mute button: a toggle, pressed while their sounds are off. It is
 * in the panel of the place where the pets live, the one place there is
 * anything to hear, and shows only while the world can be drawn
 * (`.sound-toggle` in globals.css: without JavaScript or WebGL there are no
 * pets to press). Its choice is remembered on the device (`lib/soundPrefs.ts`).
 */
export function SoundToggle() {
  const { soundOff } = usePets()
  useEffect(() => pets.load(), [])
  return (
    <button type="button" className="sound-toggle" aria-pressed={soundOff} onClick={() => pets.setSound(soundOff)}>
      <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6h2.5l3.5-3v10l-3.5-3h-2.5z" fill="currentColor" stroke="none" />
        {soundOff ? <path d="M11 6l3.5 4M14.5 6l-3.5 4" /> : <path d="M11 5.5c1 1.4 1 3.6 0 5M13 4c1.8 2.2 1.8 5.8 0 8" />}
      </svg>
      Mute
    </button>
  )
}
