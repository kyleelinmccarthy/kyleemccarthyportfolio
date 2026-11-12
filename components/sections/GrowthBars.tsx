import { growth } from '@/content/timeline'

/**
 * The 40 → 130 → 200 growth curve. The numbers are real text from the first
 * byte, so the figure reads without JavaScript or animation; only the bars
 * grow, by a CSS animation that reduced motion turns off.
 */
export function GrowthBars() {
  const max = Math.max(...growth.series.map((s) => s.value))

  return (
    <figure aria-labelledby="growth-label" className="m-0 border border-line p-4">
      <figcaption id="growth-label" className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted">
        {growth.label}
      </figcaption>
      <ul className="m-0 mt-4 flex list-none items-end gap-4 p-0">
        {growth.series.map((s, i) => (
          <li key={s.period} className="flex flex-1 flex-col items-center justify-end">
            <span className="mb-1.5 font-display text-2xl font-extrabold leading-none text-ink">{s.value}</span>
            <span
              aria-hidden="true"
              className="block w-full max-w-[56px] origin-bottom animate-grow-bar bg-accent motion-reduce:animate-none"
              style={{ height: `${(s.value / max) * 110}px`, animationDelay: `${0.15 + i * 0.2}s` }}
            />
            <span className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted">{s.period}</span>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-4 text-[13.5px] leading-relaxed text-muted">{growth.note}</p>
    </figure>
  )
}
