import type { CaseStudy } from '@/content/caseStudies'
import { rooms } from '@/content/rooms'

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <dt className="font-sans text-label uppercase text-accent">{label}</dt>
      <dd className="mt-1 font-sans text-sm leading-relaxed text-fg-muted">{children}</dd>
    </div>
  )
}

/**
 * The card beside a piece. Lift it for the part that didn't work.
 *
 * A piece with no placard renders none. The four lines come from Kylee's own
 * answers about that piece, so a placard is either hers or it does not exist —
 * an empty disclosure inviting you to open it and find nothing is worse than
 * no disclosure at all.
 */
export function Placard({ study }: { study: CaseStudy }) {
  const placard = study.placard
  if (!placard) return null

  return (
    <details className="group mt-5 rounded-lg bg-surface-raised ring-1 ring-rule">
      <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-semibold text-accent marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {rooms.floor.placardHint}
        <span aria-hidden="true" className="ml-2 inline-block transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <dl className="border-t border-rule px-4 pb-4 pt-1">
        <Line label="The hard part">{placard.hard}</Line>
        <Line label="Thrown away">{placard.threwAway}</Line>
        <Line label="Next time">{placard.differently}</Line>
        <Line label="Built for">{placard.builtFor}</Line>
      </dl>
    </details>
  )
}
