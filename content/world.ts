import type { District, Place } from './types'
import { onTheGo } from './onTheGo'

export const districts: District[] = [
  { id: 'works', name: 'The Works', blurb: 'What I build for a living', color: '#4C7DFF', center: { lat: 20, lon: -18 }, radius: 34 },
  { id: 'frenzy', name: 'Tiny Frenzy', blurb: 'My one-person game studio', color: '#FF6FA3', center: { lat: -8, lon: 64 }, radius: 27 },
  { id: 'hours', name: 'After Hours', blurb: 'Apps for people I love', color: '#FF9B54', center: { lat: -28, lon: -92 }, radius: 26 },
  { id: 'studio', name: 'The Studio', blurb: 'Ink, paint and pixels', color: '#8B6CFF', center: { lat: 44, lon: 122 }, radius: 21 },
  { id: 'home', name: 'Home', blurb: 'Everything else', color: '#2EC4B6', center: { lat: -36, lon: 166 }, radius: 27 },
]

/** In tour order. */
export const places: Place[] = [
  { id: 'home', district: 'home', name: 'Home', descriptor: 'About me', at: { lat: -31, lon: 160 }, model: 'house', height: 1.2, content: { kind: 'about' } },
  { id: 'three-things', district: 'home', name: 'Three things', descriptor: 'How I work', at: { lat: -27, lon: 173 }, model: 'flags', height: 1.3, content: { kind: 'principles' } },
  { id: 'beacon', district: 'works', name: 'Beacon', descriptor: 'Engineering operations platform', at: { lat: 33, lon: -40 }, model: 'lighthouse', height: 2.4, content: { kind: 'project', slug: 'beacon' } },
  { id: '403hq', district: 'works', name: '403HQ', descriptor: 'Client portal', at: { lat: 24, lon: -12 }, model: 'towers', height: 2.3, content: { kind: 'project', slug: '403hq' } },
  { id: 'aura', district: 'works', name: 'AURA', descriptor: 'Accessibility, one script tag', at: { lat: 11, lon: -30 }, model: 'signal-mast', height: 2.2, content: { kind: 'project', slug: 'aura' } },
  { id: 'ruckus', district: 'works', name: 'Ruckus', descriptor: 'Ten multiplayer games', at: { lat: 9, lon: -9 }, model: 'big-top', height: 1.5, content: { kind: 'project', slug: 'ruckus' } },
  { id: 'nbs-website', district: 'works', name: 'NBS Website', descriptor: 'Company site, 66 pages rebuilt', at: { lat: 27, lon: -27 }, model: 'civic', height: 1.1, content: { kind: 'project', slug: 'nbs-website' } },
  { id: 'on-the-go', district: 'works', name: 'Also on the go', descriptor: 'Under construction', at: { lat: 16, lon: 2 }, model: 'construction', height: 2.2, content: { kind: 'collection', items: onTheGo } },
  { id: 'tiny-frenzy-games', district: 'frenzy', name: 'Tiny Frenzy Games', descriptor: 'Studio site', at: { lat: -1, lon: 60 }, model: 'studio', height: 1.5, content: { kind: 'project', slug: 'tiny-frenzy-games' } },
  { id: 'eliminated', district: 'frenzy', name: 'Eliminated', descriptor: 'Party game, 2–8 players', at: { lat: -13, lon: 53 }, model: 'playground', height: 1.9, content: { kind: 'project', slug: 'eliminated' } },
  { id: 'eliminated-site', district: 'frenzy', name: 'Eliminated — the website', descriptor: 'Marketing site and press kit', at: { lat: -19, lon: 67 }, model: 'billboard', height: 1.7, content: { kind: 'project', slug: 'eliminated-site' }, poster: '/media/eliminated/hero.jpg', posterSize: [920, 430] },
  { id: 'jimothy-and-pidge', district: 'frenzy', name: 'Jimothy & Pidge', descriptor: 'Shenanigans in Seattle', at: { lat: -5, lon: 74 }, model: 'alley', height: 2.5, content: { kind: 'project', slug: 'jimothy-and-pidge' }, weather: 'rain', poster: '/media/jimothy-and-pidge/hero.jpg', posterSize: [920, 430] },
  { id: 'kingdoms-and-crowns', district: 'hours', name: 'Kingdoms & Crowns', descriptor: 'Homeschool platform, new: the Realm', at: { lat: -24, lon: -96 }, model: 'castle', height: 2.3, content: { kind: 'project', slug: 'kingdoms-and-crowns' } },
  { id: 'the-budget', district: 'hours', name: 'The Budget', descriptor: 'By pay period, not by month', at: { lat: -34, lon: -104 }, model: 'piggy-bank', height: 1.4, content: { kind: 'project', slug: 'the-budget' } },
  { id: 'ember-tattoo', district: 'hours', name: 'Ember Tattoo', descriptor: 'Studio site', at: { lat: -36, lon: -80 }, model: 'tattoo-shop', height: 1.5, content: { kind: 'project', slug: 'ember-tattoo' } },
  { id: 'art', district: 'studio', name: 'Art', descriptor: 'Digital, pencil, ink and paint', at: { lat: 47, lon: 116 }, model: 'easel', height: 1.6, content: { kind: 'gallery', set: 'art' }, poster: '/media/art/arcanevi.jpg', posterSize: [1600, 1013] },
  { id: 'tattoo-designs', district: 'studio', name: 'Tattoo designs', descriptor: 'Drawn for people who got them', at: { lat: 40, lon: 130 }, model: 'drafting-table', height: 1.4, content: { kind: 'gallery', set: 'tattoo' }, poster: '/media/tattoo/wrench-and-daisies.jpg', posterSize: [1600, 2009] },
  { id: 'off-the-clock', district: 'home', name: 'Off the clock', descriptor: 'Everything that is not a screen', at: { lat: -44, lon: -177 }, model: 'mountain', height: 1.9, content: { kind: 'interests' } },
  { id: 'post', district: 'home', name: 'Send me a letter', descriptor: 'Contact', at: { lat: -41, lon: 153 }, model: 'postbox', height: 1.0, content: { kind: 'contact' } },
]

export const tourOrder: string[] = places.map((p) => p.id)

export function placeById(id: string): Place | undefined {
  return places.find((p) => p.id === id)
}
