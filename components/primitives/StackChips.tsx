/**
 * The résumé-grounded tech chips carried on `Project.stack`. Rendered on the
 * project cards in both /work and /room so the field is shown rather than
 * merely stored. Presentational only — a plain list, no links, no state.
 */
export function StackChips({ stack, className = '' }: { stack?: string[]; className?: string }) {
  if (!stack?.length) return null
  return (
    <ul className={`mt-4 flex flex-wrap gap-2 ${className}`}>
      {stack.map((tech) => (
        <li
          key={tech}
          className="rounded-full bg-surface px-2.5 py-1 font-sans text-xs font-medium text-fg-muted ring-1 ring-rule"
        >
          {tech}
        </li>
      ))}
    </ul>
  )
}
