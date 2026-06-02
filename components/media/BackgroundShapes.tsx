/**
 * Clean, minimal line-work layered behind a section's content — purely
 * decorative, to gently break up large blocks of text. A few large, thin,
 * intersecting curves that bleed off the edges. Renders in the theme's --decor
 * accent (gold in light mode, yellow in dark) at very low opacity.
 *
 * Drop into any `relative` container; sits behind content (give the content a
 * `relative z-10`). Clipped + non-interactive so it never affects layout.
 */
export function BackgroundShapes({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <svg
        className="absolute inset-0 h-full w-full text-decor"
        viewBox="0 0 1200 600"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Large sweeping curves, right-weighted, thin and faint. */}
        <circle cx="1010" cy="300" r="250" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.5" />
        <circle cx="1220" cy="150" r="400" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1.5" />
        <ellipse cx="900" cy="380" rx="460" ry="260" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.5" />
        {/* One long gentle arc drifting in from the left for balance. */}
        <path d="M-120 120 C 220 360, 520 360, 760 540" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1.5" />
      </svg>
    </div>
  )
}
