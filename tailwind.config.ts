import type { Config } from 'tailwindcss'

/**
 * Design tokens at the Tailwind layer. The tiny planet's colours (ink, muted,
 * on-ink, glass, edge, line, accent) resolve per theme through the CSS
 * variables in globals.css, so components never carry a raw hex.
 */

// --accent is a plain colour, so opacity modifiers (bg-accent/40) are done
// with color-mix. Tailwind swaps <alpha-value> for the modifier, or 1.
const accent = 'color-mix(in srgb, var(--accent) calc(<alpha-value> * 100%), transparent)'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Planet tokens, per theme (see globals.css).
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        'on-ink': 'var(--on-ink)',
        glass: 'var(--glass)',
        edge: 'var(--edge)',
        line: 'var(--line)',
        accent,
      },
      fontFamily: {
        // Wired by next/font in app/layout.tsx -> CSS variables
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'grow-bar': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
      },
      animation: {
        'grow-bar': 'grow-bar 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
}

export default config
