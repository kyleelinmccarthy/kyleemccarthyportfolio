/**
 * The résumé-grounded tech chips carried on `Project.stack`: small mono tags
 * with a hairline border, as in the panel of the look test. Presentational
 * only — a plain list, no links, no state.
 */
export function StackChips({ stack, className = '' }: { stack?: string[]; className?: string }) {
  if (!stack?.length) return null
  return (
    <ul className={`m-0 mt-4 flex list-none flex-wrap gap-1.5 p-0 ${className}`}>
      {stack.map((tech) => (
        <li key={tech} className="rounded-[2px] border border-line px-2 py-1 font-mono text-[11px] text-ink">
          {tech}
        </li>
      ))}
    </ul>
  )
}
