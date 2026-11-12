import { Vector3 } from 'three'
import type { LatLon } from '@/content/types'

/** Degrees to radians. */
export const D2R = Math.PI / 180

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** Unit vector for a latitude/longitude in degrees. East runs to the right when facing the planet. */
export function dirOf(p: LatLon): Vector3 {
  const cl = Math.cos(p.lat * D2R)
  return new Vector3(cl * Math.cos(p.lon * D2R), Math.sin(p.lat * D2R), -cl * Math.sin(p.lon * D2R))
}

/** Inverse of dirOf. Latitude is in [-90, 90], longitude in (-180, 180]. */
export function latLonOf(dir: Vector3): LatLon {
  const d = dir.clone().normalize()
  const lat = Math.asin(clamp(d.y, -1, 1)) / D2R
  const lon = Math.atan2(-d.z, d.x) / D2R
  // atan2 yields [-180, 180]; fold -180 onto +180 so the range is (-180, 180]
  return { lat, lon: lon <= -180 ? 180 : lon }
}

/** Angle between two directions, in degrees. */
export function angleDeg(a: Vector3, b: Vector3): number {
  return Math.acos(clamp(a.dot(b), -1, 1)) / D2R
}

/** Map-style label, e.g. "33°N 040°W". */
export function formatCoord(p: LatLon): string {
  const lat = Math.abs(Math.round(p.lat))
  const lon = String(Math.abs(Math.round(p.lon))).padStart(3, '0')
  return `${lat}°${p.lat >= 0 ? 'N' : 'S'} ${lon}°${p.lon >= 0 ? 'E' : 'W'}`
}

export interface SurfaceFrame {
  up: Vector3
  south: Vector3
  east: Vector3
}

/** Local axes at a point on the sphere: up away from the centre, south down the globe, east = up × south. */
export function surfaceFrame(dir: Vector3): SurfaceFrame {
  const up = dir.clone().normalize()
  const north = new Vector3(0, 1, 0).addScaledVector(up, -up.y).normalize()
  const south = north.negate()
  const east = new Vector3().crossVectors(up, south).normalize()
  return { up, south, east }
}

/** Point a fraction t of the way along the shortest arc from a to b (both unit vectors). */
export function greatCircle(a: Vector3, b: Vector3, t: number): Vector3 {
  const omega = Math.acos(clamp(a.dot(b), -1, 1))
  const s = Math.sin(omega)
  if (s < 1e-9) return a.clone()
  return a.clone().multiplyScalar(Math.sin((1 - t) * omega) / s).addScaledVector(b, Math.sin(t * omega) / s)
}
