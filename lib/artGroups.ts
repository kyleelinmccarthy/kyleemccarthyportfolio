/**
 * Groups the art wall by medium, derived from the slug prefix that
 * scripts/lib/artSlug.ts already bakes into every filename — no per-entry
 * field to maintain by hand. Order here is render order.
 */
export interface ArtGroup {
  label: string
  items: { slug: string; alt: string }[]
}

interface GroupDef {
  label: string
  prefixes: string[]
}

// The last group is also the catch-all: any slug matching none of the
// explicit prefixes above it (fandom names included) lands here rather
// than disappearing.
const GROUPS: GroupDef[] = [
  { label: 'Digital', prefixes: ['digital'] },
  { label: 'Stickers', prefixes: ['sticker'] },
  { label: 'Acrylic pours', prefixes: ['pour'] },
  { label: 'Watercolour', prefixes: ['w'] },
  { label: 'Sketches', prefixes: ['sketch'] },
  { label: 'Fan art & other', prefixes: ['arcane', 'jjk', 'mha'] },
]

export function groupArt(artAlt: Record<string, string>): ArtGroup[] {
  const fallbackLabel = GROUPS[GROUPS.length - 1]!.label

  // Flatten to (prefix, label) rules, longest prefix first, so a longer,
  // more specific prefix (e.g. "sticker") is never swallowed by a shorter,
  // more generic one (e.g. a hypothetical "s") that happens to sort earlier.
  const rules = GROUPS.flatMap((g) => g.prefixes.map((prefix) => ({ prefix: prefix.toLowerCase(), label: g.label }))).sort(
    (a, b) => b.prefix.length - a.prefix.length
  )

  const buckets = new Map<string, { slug: string; alt: string }[]>()
  for (const g of GROUPS) buckets.set(g.label, [])

  for (const [slug, alt] of Object.entries(artAlt)) {
    const lower = slug.toLowerCase()
    const match = rules.find((r) => lower.startsWith(r.prefix))
    buckets.get(match ? match.label : fallbackLabel)!.push({ slug, alt })
  }

  return GROUPS.map((g) => ({ label: g.label, items: buckets.get(g.label)! }))
}
