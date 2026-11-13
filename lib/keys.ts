/*
 * Whose a key press is: the page's shortcuts (the tour's arrows and Escape,
 * the camera's keys at a place) or something the visitor is typing into or
 * working in. Shared by the HUD and the world.
 */

/** True for a field the visitor types into, where a key is theirs and not a shortcut's. */
export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

/**
 * True when a key landing on `target` belongs to the page's shortcuts: not in a
 * field being typed into, and not while a dialog is open (the character
 * picker, which holds focus and has its own keys, Escape among them).
 */
export function keyIsThePages(target: EventTarget | null): boolean {
  if (isEditable(target)) return false
  if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return false
  return true
}
