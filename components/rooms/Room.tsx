import { type ReactNode } from 'react'

/**
 * A room's content column. The setting renders behind this via Scene.setting;
 * this is only the readable part, so it stays above the environment and keeps
 * a consistent measure across every room.
 */
export function Room({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`relative z-10 w-full ${className}`}>{children}</div>
}
