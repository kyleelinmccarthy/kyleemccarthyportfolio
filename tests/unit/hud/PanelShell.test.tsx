import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { PanelShell } from '@/components/hud/PanelShell'
import { placeSheet } from '@/components/hud/sheetEdge'
import { districts, placeById } from '@/content/world'
import { SHEET_FULL, SHEET_HANDLE_NAME, SHEET_PEEK } from '@/lib/world/sheet'
import { clientPackages, importsOf, isClientModule, threePackages } from '../importGraph'

const beacon = placeById('beacon')!
const works = districts.find((d) => d.id === beacon.district)!

function show(place = beacon) {
  const district = districts.find((d) => d.id === place.district)!
  return render(
    <PanelShell place={place} district={district}>
      <p>body</p>
    </PanelShell>,
  )
}

afterEach(() => placeSheet.set(null))

/*
 * jsdom has no PointerEvent, so `fireEvent.pointerMove` would make a bare Event with no `clientY` and a drag on the
 * handle would move nothing (a test could then pass on the click alone). A MouseEvent with a pointer id is enough.
 */
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventLike extends MouseEvent {
    pointerId: number
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
    }
  }
  Object.assign(window, { PointerEvent: PointerEventLike })
}

describe('what the panel brings to the browser', () => {
  // A place page loads its client code up front: anything that reaches three.js (directly, or through lib/world,
  // whose maths use three) would load three.js on every place page before the canvas, and without WebGL for nothing.
  it('PanelShell stays on the server', () => {
    expect(isClientModule(readFileSync(join(process.cwd(), 'components/hud/PanelShell.tsx'), 'utf8'))).toBe(false)
  })

  it.each(['components/hud/PanelShell.tsx', 'app/(world)/places/[id]/page.tsx'])('nothing the browser loads for %s reaches three.js or react-three-fiber', (entry) => {
    const packages = clientPackages(entry)
    // It does follow the panel into its client parts.
    expect(packages.has('react')).toBe(true)
    expect(threePackages(packages)).toEqual([])
  })

  it('the check would catch it: from the canvas, three.js is reached', () => {
    expect(threePackages(clientPackages('components/world/CameraRig.tsx')).length).toBeGreaterThan(0)
    // And through a module that is not itself a client one, once a client one imports it.
    expect(threePackages(clientPackages('components/hud/TourBar.tsx'))).toEqual([])
  })

  it('reads every kind of import, and skips the ones the compiler erases', () => {
    const source = [
      `import a from './a'`,
      `import { b, type C } from "@/b"`,
      `import type { D } from 'three'`,
      `export { e } from './e'`,
      `export type { F } from './f'`,
      `import './side-effect'`,
      `const g = await import('./g')`,
      `// import h from './h'`,
    ].join('\n')
    expect(importsOf(source).sort()).toEqual(['./a', './e', './g', './side-effect', '@/b'].sort())
  })
})

describe('the sheet’s heights', () => {
  const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
  const shell = readFileSync(join(process.cwd(), 'components/hud/PanelShell.tsx'), 'utf8')

  it('peeks at a share of the dynamic viewport, never so little that the name is cut off (a phone on its side)', () => {
    const rule = /\[data-js\] \.place-sheet\[data-sheet='peek'\]\s*\{\s*max-height:\s*([^;]+);/.exec(css)
    expect(rule?.[1]).toBe(`max(${SHEET_PEEK.share * 100}dvh, ${SHEET_PEEK.least}px)`)
    // The handle (26px less its 6px overlap), the header row (about 50px), the body's top padding (20px) and the name (33px).
    expect(SHEET_PEEK.least).toBeGreaterThanOrEqual(20 + 50 + 20 + 33 + 20)
  })

  it('opens in full to the share of the dynamic viewport the drag is held to', () => {
    expect(shell).toContain(`max-[820px]:max-h-[${Math.round(SHEET_FULL * 100)}dvh]`)
    expect(shell).not.toMatch(/max-h-\[\d+vh\]/)
  })
})

describe('PanelShell', () => {
  it('closes back to the place’s own district, not out to the whole planet', () => {
    show()
    expect(screen.getByRole('link', { name: 'Close' })).toHaveAttribute('href', '/?district=works')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Beacon')
    expect(works.id).toBe('works')
  })

  it('opens at its peek, with a handle that opens it and closes it again: one name, its state in aria-expanded', () => {
    show()
    const article = screen.getByRole('article')
    const handle = screen.getByRole('button', { name: SHEET_HANDLE_NAME })
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    expect(article).toHaveAttribute('data-sheet', 'peek')
    expect(handle).toHaveAttribute('aria-controls', screen.getByText('body').parentElement!.id)
    fireEvent.click(handle, { detail: 1 })
    expect(handle).toHaveAttribute('aria-expanded', 'true')
    expect(handle).toHaveAccessibleName(SHEET_HANDLE_NAME)
    expect(article).toHaveAttribute('data-sheet', 'full')
    fireEvent.click(handle, { detail: 1 })
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    expect(article).toHaveAttribute('data-sheet', 'peek')
  })

  it('a drag on the handle that ends in no click does not swallow the next press, by finger or by keyboard', () => {
    show()
    const handle = screen.getByRole('button', { name: SHEET_HANDLE_NAME })
    const article = screen.getByRole('article')
    // Dragged up: open. No click follows (as when a touch moves).
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 600 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 520 })
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 520 })
    expect(article).toHaveAttribute('data-sheet', 'full')
    // Enter on the handle (a click with no pointer: detail 0) closes it.
    fireEvent.click(handle, { detail: 0 })
    expect(article).toHaveAttribute('data-sheet', 'peek')
    // Dragged again, no click; then a tap: the tap toggles.
    fireEvent.pointerDown(handle, { pointerId: 2, clientY: 600 })
    fireEvent.pointerMove(handle, { pointerId: 2, clientY: 520 })
    fireEvent.pointerUp(handle, { pointerId: 2, clientY: 520 })
    fireEvent.pointerDown(handle, { pointerId: 3, clientY: 500 })
    fireEvent.pointerUp(handle, { pointerId: 3, clientY: 500 })
    fireEvent.click(handle, { detail: 1 })
    expect(article).toHaveAttribute('data-sheet', 'peek')
  })

  it('keeps all its content in the page at its peek, for a screen reader', () => {
    show()
    expect(screen.getByText('body')).toBeInTheDocument()
    expect(screen.getByText('body')).toBeVisible()
  })

  it('opens when its handle is dragged up and closes when dragged down, and a drag is not also a press', () => {
    show()
    const handle = screen.getByRole('button', { name: SHEET_HANDLE_NAME })
    const article = screen.getByRole('article')
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 600 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 520 })
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 520 })
    fireEvent.click(handle, { detail: 1 })
    expect(article).toHaveAttribute('data-sheet', 'full')
    fireEvent.pointerDown(handle, { pointerId: 2, clientY: 300 })
    fireEvent.pointerMove(handle, { pointerId: 2, clientY: 400 })
    fireEvent.pointerUp(handle, { pointerId: 2, clientY: 400 })
    fireEvent.click(handle, { detail: 1 })
    expect(article).toHaveAttribute('data-sheet', 'peek')
  })

  it('opens at its peek again at the next place', () => {
    const { rerender } = show()
    fireEvent.click(screen.getByRole('button', { name: SHEET_HANDLE_NAME }), { detail: 1 })
    const aura = placeById('aura')!
    rerender(
      <PanelShell place={aura} district={districts.find((d) => d.id === aura.district)!}>
        <p>body</p>
      </PanelShell>,
    )
    expect(screen.getByRole('article')).toHaveAttribute('data-sheet', 'peek')
  })

  it('tells the camera where its top edge is, and that it has gone when it goes', () => {
    const { unmount } = show()
    act(() => window.dispatchEvent(new Event('resize')))
    expect(placeSheet.top()).not.toBeNull()
    unmount()
    expect(placeSheet.top()).toBeNull()
  })
})
