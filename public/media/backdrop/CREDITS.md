# Backdrop images

Two images, one per side of the front door. The entrance room uses `exterior.jpg`;
every room past it uses `interior.jpg`, so walking through the door changes where you are.

## exterior.jpg

Supplied by Kylee — `Pictures/Art/House/exterior.jpg`. A gothic brick house with gables,
ivy and a turret.

Processed with `sharp`: cropped to the upper facade only (`extract` at y=110, height 366 of
a 586×878 source), then resized to 1920×1200, blurred 1.5, saturation 0.5, mozjpeg q62.

**The crop deliberately excludes the house's own porch and door.** The entrance room draws
its own doorway, and two doorways stacked on top of one another reads as a mistake rather
than as depth.

## interior.jpg

Supplied by Kylee — `Pictures/Art/House/interior.jpg`. A dark panelled room with a gallery
wall of framed art, a chandelier and a herringbone floor.

Processed with `sharp`: cropped to the gallery wall (`extract` at y=300, height 429 of a
686×1200 source), then resized to 1920×1200, blurred 1.5, saturation 0.5, mozjpeg q62.

## A note on the blur, and on provenance

Both sources are small — 586×878 and 686×1200 — against a 1920px full-bleed backdrop, so
they are upscaled roughly 3×. The 1.5px blur turns that softness into atmosphere instead of
a visible artefact. It works because these sit behind everything at low opacity; it would
not survive being shown at full size.

Provenance is unverified. Unlike the Unsplash photographs these replaced, there is no
licence or photographer on record for either. If this site is ever published commercially,
confirm the source or swap them for licensed equivalents.
