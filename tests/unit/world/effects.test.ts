import { describe, it, expect } from 'vitest'
import { OrthographicCamera, Scene, type WebGLRenderer } from 'three'
import { buildComposer } from '@/components/world/Effects'

/** The little of a renderer the composer reads while it is made. Its own pixel ratio is not the canvas's. */
const renderer = { getPixelRatio: () => 2 } as unknown as WebGLRenderer
const view = { width: 800, height: 500, dpr: 1.25 }

describe('the composer', () => {
  it('is the canvas size the moment it is made, with bloom', () => {
    const { composer } = buildComposer(renderer, new Scene(), new OrthographicCamera(), { ...view, bloom: true })
    // Not the 2 x 2 target it is built round: the first frame it draws must fill the canvas.
    expect([composer.renderTarget1.width, composer.renderTarget1.height]).toEqual([1000, 625])
    expect([composer.renderTarget2.width, composer.renderTarget2.height]).toEqual([1000, 625])
    expect(composer.passes).toHaveLength(3)
  })

  it('is the canvas size the moment it is made, without bloom (after a drop to low)', () => {
    const { composer, bloom } = buildComposer(renderer, new Scene(), new OrthographicCamera(), { ...view, bloom: false })
    expect([composer.renderTarget1.width, composer.renderTarget1.height]).toEqual([1000, 625])
    expect([composer.renderTarget2.width, composer.renderTarget2.height]).toEqual([1000, 625])
    expect(composer.passes).toHaveLength(2)
    expect(bloom).toBeNull()
  })

  it('takes the pixel ratio it is told, not the renderer’s', () => {
    const { composer } = buildComposer(renderer, new Scene(), new OrthographicCamera(), { width: 400, height: 300, dpr: 1, bloom: false })
    expect([composer.renderTarget1.width, composer.renderTarget1.height]).toEqual([400, 300])
  })
})
