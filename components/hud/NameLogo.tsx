import { site } from '@/content/site'

/** Which of the signature's two hands writes a run of letters: the capitals' (Give You Glory) or the running script's (Sacramento). */
type Hand = 'caps' | 'script'

/**
 * The name as she signs it, run by run: the capitals in one hand, the letters
 * that run on from them in the other. Together they spell `site.name` (tested).
 */
export const SIGNATURE: ReadonlyArray<readonly [string, Hand]> = [
  ['K', 'caps'],
  ['ylee', 'script'],
  [' ', 'script'],
  ['McC', 'caps'],
  ['arthy', 'script'],
]

const hand: Record<Hand, string> = {
  // The capitals' hand runs a little small and high beside the script: nudged to share its baseline.
  caps: 'font-signature-caps text-[1.05em] [transform:translateY(0.06em)]',
  script: 'font-signature',
}

/**
 * "Kylee McCarthy" as a signature, for the header and nowhere else. The name
 * is read once, as plain text; the lettering is for the eye. It takes its size
 * and colour from where it is put.
 */
export function NameLogo() {
  return (
    <>
      <span className="sr-only">{site.name}</span>
      {/* The padding below keeps the tails of the two y's inside the line. */}
      <span aria-hidden className="inline-flex select-none items-baseline whitespace-pre pb-[0.16em] leading-none">
        {SIGNATURE.map(([letters, by], i) => (
          // The K's flourish wants room before the letters that follow it.
          <span key={i} className={`inline-block ${hand[by]} ${i === 0 ? 'mr-[0.14em]' : ''} ${letters === ' ' ? 'w-[0.28em]' : ''}`}>
            {letters}
          </span>
        ))}
      </span>
    </>
  )
}
