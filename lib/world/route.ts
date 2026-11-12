import { districts, placeById } from '@/content/world'
import type { DistrictId } from '@/content/types'

const PLACE_PATH = /^\/places\/([^/]+)\/?$/

/** The page for one place in focus. */
export function placeHref(id: string): string {
  return `/places/${id}`
}

/** The place a pathname puts in focus, or null if it names no real place. */
export function placeIdFromPath(pathname: string): string | null {
  const id = PLACE_PATH.exec(pathname)?.[1]
  return id !== undefined && placeById(id) ? id : null
}

/** The planet from space, turned to that island. */
export function districtHref(id: DistrictId): string {
  return `/?district=${id}`
}

/** The district a query string asks for, with or without its leading '?', or null if it names none. */
export function districtFromSearch(search: string): DistrictId | null {
  const value = new URLSearchParams(search).get('district')
  return districts.find((d) => d.id === value)?.id ?? null
}
