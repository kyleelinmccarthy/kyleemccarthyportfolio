import { Vector3, type Camera } from 'three'
import type { ScreenPoint, TagSize } from '@/lib/world/labels'

/** A point is in view while it falls inside this much of the screen, either way from its middle (in normalised units). */
const ON_SCREEN = 1

/** A point on the screen, as `projectToScreen` writes it: where it falls, whether it is behind the camera, whether it is in view. */
export type Projected = ScreenPoint & { behind: boolean; inView: boolean }

const ndc = new Vector3()

/**
 * A point in the world on the screen, in CSS pixels, written into `out` (no
 * allocation, for the frame loop): where it falls in a `size` view, whether
 * it is behind the camera, and whether it is in view. Shared by everything
 * that pins HTML to the world: the map labels and the guide's speech bubble.
 */
export function projectToScreen(at: Vector3, camera: Camera, size: TagSize, out: ScreenPoint & { behind?: boolean; inView?: boolean }): Projected {
  ndc.copy(at).project(camera)
  out.x = (ndc.x * 0.5 + 0.5) * size.width
  out.y = (-ndc.y * 0.5 + 0.5) * size.height
  out.behind = ndc.z > 1
  out.inView = ndc.z < 1 && Math.abs(ndc.x) < ON_SCREEN && Math.abs(ndc.y) < ON_SCREEN
  return out as Projected
}
