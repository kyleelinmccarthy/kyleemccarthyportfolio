import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { plates, textColors } from '@/lib/tokens'

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')

/** The declarations of the first rule whose selector is exactly `selector`. */
function block(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  expect(start, `${selector} block`).toBeGreaterThanOrEqual(0)
  return css.slice(start, css.indexOf('}', start))
}

function declared(rule: string, property: string): string | undefined {
  return new RegExp(String.raw`${property}:\s*(#[0-9A-Fa-f]{6})\s*;`).exec(rule)?.[1]
}

describe('the plate in globals.css matches lib/tokens.ts', () => {
  const themes = { day: block(':root'), night: block("[data-theme='night']") }
  for (const theme of ['day', 'night'] as const) {
    it(`${theme} --plate`, () => {
      const m = /--plate:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)\s*;/.exec(themes[theme])
      expect(m, `--plate in the ${theme} block`).not.toBeNull()
      const hex = `#${[m![1], m![2], m![3]].map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
      expect(hex).toBe(plates[theme].color.toUpperCase())
      expect(Number(m![4])).toBe(plates[theme].alpha)
    })
  }
})

describe('text colours in globals.css match lib/tokens.ts', () => {
  const themes = { day: block(':root'), night: block("[data-theme='night']") }

  for (const theme of ['day', 'night'] as const) {
    for (const token of ['ink', 'muted'] as const) {
      it(`${theme} --${token}`, () => {
        expect(declared(themes[theme], `--${token}`)?.toUpperCase()).toBe(textColors[theme][token].toUpperCase())
      })
    }
  }
})
