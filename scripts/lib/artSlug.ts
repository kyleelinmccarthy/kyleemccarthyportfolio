/** Filename -> stable URL slug. Shared by the import script and the alt-text map. */
export function artSlug(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Filename -> slug overrides for source files whose name is not safe to
 * publish verbatim. Source filenames sometimes carry a third party's name
 * (a tattoo client, a friend) baked in by whoever saved the photo — artSlug()
 * only lowercases and dashes the filename, so that name would otherwise ride
 * straight through into a public URL under /media/. Add an entry here (or a
 * pattern below) rather than renaming the source file: the file lives in the
 * owner's personal Pictures folder and is not ours to rename, and an explicit
 * map keeps the fix visible and re-runnable instead of depending on someone
 * remembering.
 */
const SLUG_OVERRIDE: Record<string, string> = {
  // TattooIdeaBrandi.jpg -> published a tattoo client's first name in the
  // URL. Renamed to describe the design itself (see tattooAlt in
  // content/art.ts): a wrench entwined with daisies.
  'TattooIdeaBrandi.jpg': 'wrench-and-daisies',
}

/**
 * Same purpose as SLUG_OVERRIDE, but matched by pattern so the unsafe source
 * name never has to be written down. Whatever precedes the matched part of the
 * name is dropped.
 */
const PATTERN_OVERRIDE: Array<{ match: RegExp; slug: string }> = [
  // The Minecraft Christmas piece: its source name carries private names.
  { match: /minecraft.?xmas/i, slug: 'digitalminecraftxmas' },
]

/** Filename -> published slug: overrides first, then the plain artSlug(). */
export function slugFor(filename: string): string {
  const exact = SLUG_OVERRIDE[filename]
  if (exact) return exact
  const pattern = PATTERN_OVERRIDE.find(({ match }) => match.test(filename))
  return pattern ? pattern.slug : artSlug(filename)
}
