import type { CSSProperties } from 'react'
import { proof } from '@/content/about'
import { countParts } from '@/lib/arrival'

/** Marks the header's proof row, which the arrival's statement settles onto. */
export const PROOF_ROW = 'data-proof'

/** A figure's value with its number counting up in CSS (`.proof-count`), at a fixed width so nothing moves while it counts. */
function Counting({ value }: { value: string }) {
  const { before, to, after } = countParts(value)
  if (to === null) return value
  return (
    <>
      {before}
      <span className="proof-count" style={{ '--to': to, '--digits': String(to).length } as CSSProperties} />
      {after}
    </>
  )
}

/**
 * The proof under the headline: three figures (`proof`), each its value over
 * a short label, in a quiet row. In the header it is real text, so a screen
 * reader hears the values as they are. In the arrival's statement
 * (`counting`, which is decoration hidden from assistive technology) the
 * numbers count up; the arrival sets it larger (`--k`) and settles it onto
 * the header's row.
 */
export function Proof({ counting = false }: { counting?: boolean }) {
  return (
    <ul className="proof" {...(counting ? {} : { [PROOF_ROW]: '' })}>
      {proof.map(({ value, label }) => (
        <li key={label} className="proof-item">
          <span className="proof-value">{counting ? <Counting value={value} /> : value}</span>{' '}
          <span className="proof-label">{label}</span>
        </li>
      ))}
    </ul>
  )
}
