import { describe, it, expect } from 'vitest'
import type { ModelKey } from '@/content/types'
import { places } from '@/content/world'
import { GenericModel } from '@/components/world/models/GenericModel'
import { MODELS, modelFor } from '@/components/world/models/registry'

const KEYS: ModelKey[] = [
  'generic', 'lighthouse', 'towers', 'signal-mast', 'big-top', 'civic', 'construction',
  'studio', 'playground', 'billboard', 'alley', 'castle', 'piggy-bank', 'tattoo-shop',
  'easel', 'drafting-table', 'house', 'flags', 'mountain', 'postbox',
]

/** The landmarks built so far. Each landmark task adds its keys here. */
const DONE: ModelKey[] = ['lighthouse', 'playground', 'alley', 'castle', 'house', 'towers', 'civic', 'construction', 'signal-mast', 'big-top', 'studio', 'billboard', 'piggy-bank', 'tattoo-shop', 'easel', 'drafting-table', 'postbox', 'flags', 'mountain']

describe('model registry', () => {
  it('has a model for every key and every place', () => {
    // Review Focus 5
    for (const p of places) expect(MODELS[p.model], p.id).toBeTypeOf('function')
    for (const key of KEYS) expect(MODELS[key], key).toBeTypeOf('function')
    expect(Object.keys(MODELS).sort()).toEqual([...KEYS].sort())
    expect(modelFor('generic')).toBe(MODELS.generic)
    expect(modelFor('nonsense' as ModelKey)).toBe(MODELS.generic)
  })

  it('keeps the generic building only as the fallback: every landmark key has its own', () => {
    expect(MODELS.generic).toBe(GenericModel)
    expect(KEYS.filter((k) => !DONE.includes(k))).toEqual(['generic'])
  })

  it.each(DONE)('%s has its own landmark', (key) => expect(MODELS[key]).not.toBe(MODELS.generic))

  it('leaves no place on the generic building', () => {
    for (const p of places) expect(MODELS[p.model], p.id).not.toBe(MODELS.generic)
  })
})
