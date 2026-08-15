/** Filename -> stable URL slug. Shared by the import script and the alt-text map. */
export function artSlug(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
