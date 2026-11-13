'use client'

import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { landmark, scatter } from '@/content/sky'
import type { District, Place } from '@/content/types'
import type { Quality } from '@/lib/world/quality'
import { sceneryLayout } from '@/lib/world/scatter'
import { SCATTER_LINES, scatterMeshes, type PlacedMesh } from '@/lib/world/scatterShapes'
import { celMaterial, contactShadowMaterial, glassMaterial, outlineShellMaterial } from './materials'


/** A solid layer as geometry, with the attributes the kit's cel material reads. */
function solid(mesh: PlacedMesh): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(mesh.position, 3))
  geometry.setAttribute('normal', new BufferAttribute(mesh.normal, 3))
  geometry.setAttribute('color', new BufferAttribute(mesh.color, 3))
  geometry.setAttribute('aBevel', new BufferAttribute(mesh.bevel, 1))
  geometry.setAttribute('aHeight', new BufferAttribute(mesh.height, 1))
  geometry.setIndex(new BufferAttribute(mesh.index, 1))
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * The planet's trees and background buildings: groves of painted trees (broad
 * round canopies, tall narrow ones and conifers) on every island but the city,
 * and in The Works a loose grid of small city blocks and towers, with a few
 * houses in the other districts. Each layer is merged into one mesh in the
 * kit's look: cel shading with the edge light and painted gradient (`kit`), a
 * thin outline (the same mesh pushed out along its normals; finer on trees,
 * `SCATTER_LINES`), window glass that is sky by day and lit at night (more
 * dimly than a landmark's), and a soft contact shadow under each.
 * Six draw calls in all. At low quality only the first half of the trees, and
 * their shadows, are drawn. Nothing here moves.
 *
 * The materials are the shared ones, so every mesh passes `dispose={null}`;
 * the geometry is this component's, and goes with it.
 */
export function Scatter({ districts, places, quality }: { districts: District[]; places: Place[]; quality: Quality }) {
  const meshes = useMemo(() => {
    // The one layout, shared with the camera, which keeps out of these very buildings and trees.
    const { buildings, trees } = sceneryLayout(districts, places)
    return scatterMeshes(trees, buildings, districts)
  }, [districts, places])

  const geometry = useMemo(() => {
    const glass = new BufferGeometry()
    glass.setAttribute('position', new BufferAttribute(meshes.glass.position, 3))
    glass.setAttribute('aPane', new BufferAttribute(meshes.glass.pane, 2))
    glass.setIndex(new BufferAttribute(meshes.glass.index, 1))
    glass.computeBoundingSphere()
    const shadows = new BufferGeometry()
    shadows.setAttribute('position', new BufferAttribute(meshes.shadows.position, 3))
    shadows.setAttribute('uv', new BufferAttribute(meshes.shadows.uv, 2))
    shadows.setIndex(new BufferAttribute(meshes.shadows.index, 1))
    shadows.computeBoundingSphere()
    return { trees: solid(meshes.trees), buildings: solid(meshes.buildings), glass, shadows }
  }, [meshes])
  useEffect(
    () => () => {
      for (const g of Object.values(geometry)) g.dispose()
    },
    [geometry],
  )

  // At low quality, half the trees and their shadows.
  useEffect(() => {
    const high = quality === 'high'
    geometry.trees.setDrawRange(0, high ? Infinity : meshes.lowTrees)
    geometry.shadows.setDrawRange(0, high ? Infinity : meshes.lowShadows)
  }, [geometry, meshes, quality])

  const body = celMaterial({ vertexColors: true }, 'kit')

  return (
    <group>
      <mesh geometry={geometry.trees} material={body} dispose={null} />
      <mesh geometry={geometry.trees} material={outlineShellMaterial(SCATTER_LINES.tree)} dispose={null} />
      <mesh geometry={geometry.buildings} material={body} dispose={null} />
      <mesh geometry={geometry.buildings} material={outlineShellMaterial(SCATTER_LINES.building)} dispose={null} />
      {/* Background windows glow more dimly at night than a landmark's (`scatter.windowLit`). */}
      <mesh geometry={geometry.glass} material={glassMaterial(landmark.glass, landmark.offWhite, scatter.windowLit)} dispose={null} />
      <mesh geometry={geometry.shadows} material={contactShadowMaterial()} renderOrder={1} dispose={null} />
    </group>
  )
}
