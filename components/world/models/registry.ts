import type { ComponentType } from 'react'
import type { District, ModelKey, Place } from '@/content/types'
import { Alley } from './Alley'
import { BigTop } from './BigTop'
import { Billboard } from './Billboard'
import { Castle } from './Castle'
import { Civic } from './Civic'
import { Construction } from './Construction'
import { DraftingTable } from './DraftingTable'
import { Easel } from './Easel'
import { Flags } from './Flags'
import { GenericModel } from './GenericModel'
import { House } from './House'
import { Lighthouse } from './Lighthouse'
import { Mountain } from './Mountain'
import { PiggyBank } from './PiggyBank'
import { Playground } from './Playground'
import { Postbox } from './Postbox'
import { SignalMast } from './SignalMast'
import { Studio } from './Studio'
import { TattooShop } from './TattooShop'
import { Towers } from './Towers'

/** What every landmark is drawn from: its place, and the district it stands in. */
export interface ModelProps {
  place: Place
  district: District
}

/**
 * A landmark's component. `shadow` sizes the soft contact shadow `Places`
 * draws under it, in model units (the footprint's by default); `false` draws
 * none, for a landmark that floats or casts its own. `heights` is the range
 * of place heights it is built to follow, every dependent part with it (a
 * height outside it is clamped to it); the landmark test mounts it at both
 * ends.
 */
export type LandmarkComponent = ComponentType<ModelProps> & { shadow?: number | false; heights?: readonly [number, number] }

/**
 * Model key → the component that draws that landmark, in model units: standing
 * on y = 0, facing +Z (south), about `place.height` tall. Every place's key
 * has its own landmark; the generic building is kept as the fallback for a
 * key with none (`modelFor`), and no place uses it (tested).
 */
export const MODELS: Record<ModelKey, LandmarkComponent> = {
  generic: GenericModel,
  lighthouse: Lighthouse,
  towers: Towers,
  'signal-mast': SignalMast,
  'big-top': BigTop,
  civic: Civic,
  construction: Construction,
  studio: Studio,
  playground: Playground,
  billboard: Billboard,
  alley: Alley,
  castle: Castle,
  'piggy-bank': PiggyBank,
  'tattoo-shop': TattooShop,
  easel: Easel,
  'drafting-table': DraftingTable,
  house: House,
  flags: Flags,
  mountain: Mountain,
  postbox: Postbox,
}

/** The component for a model key, or the generic building for a key with none. */
export function modelFor(key: ModelKey): LandmarkComponent {
  return Object.hasOwn(MODELS, key) ? MODELS[key] : MODELS.generic
}
