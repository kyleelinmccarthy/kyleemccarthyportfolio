# Backdrop photo credit

**library.jpg** — "A chandelier hanging from a wooden ceiling in a library"
Photographer: **Daniil Smetanin** ([@vplameniraket](https://unsplash.com/@vplameniraket))
Source: <https://unsplash.com/photos/a-chandelier-hanging-from-a-wooden-ceiling-in-a-library-DAE--I2sJQI>
Original: `https://images.unsplash.com/photo-1637246662831-353bde8871e8`

Used under the [Unsplash License](https://unsplash.com/license), which permits free
commercial and non-commercial use without permission. Attribution is not required but is
given here because crediting a photographer costs nothing.

Processed with `sharp`: the source is portrait (2400×3624) and the backdrop is full-bleed
on landscape viewports, so it is cropped to 1920×1200 using `position: 'attention'` rather
than letting `bg-cover` pick — that keeps the chandelier and the staircase in frame.
Saturation reduced to 0.45 and encoded as mozjpeg quality 66 (204 KB).

Less desaturated than the forest it replaced (0.18): the warm wood is the point of this
photo. It renders behind every room at the `--photo-veil` opacity set per theme in
`app/globals.css`.
