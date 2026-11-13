import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

/*
 * The project's import graph, read from the source, for tests that keep a
 * package out of what the browser loads. Follows relative and `@/` imports
 * (`import … from`, `export … from`, bare `import '…'` and `import('…')`),
 * skipping type-only ones, which are erased. Packages are leaves.
 */

const ROOT = process.cwd()
const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx']

/** Where an import from `from` of `spec` lands: a file in the project, or the package's name. */
function resolve(from: string, spec: string): { file: string } | { pkg: string } | null {
  const base = spec.startsWith('@/') ? join(ROOT, spec.slice(2)) : spec.startsWith('.') ? join(dirname(from), spec) : null
  if (base === null) return { pkg: spec }
  for (const ext of EXTENSIONS) {
    const file = base + ext
    if (existsSync(file) && statSync(file).isFile()) return { file }
  }
  // Something the bundler handles (CSS, an image): not code.
  return null
}

/** Every import `source` makes that survives compilation. */
export function importsOf(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const specs: string[] = []
  for (const m of code.matchAll(/\b(import|export)\s+(type\s+)?([^'"`;]*?)\s+from\s*['"]([^'"]+)['"]/g)) if (!m[2]) specs.push(m[4])
  for (const m of code.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) specs.push(m[1])
  for (const m of code.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1])
  return specs
}

/** True for a module that marks itself a client component (`'use client'` before any code). */
export function isClientModule(source: string): boolean {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').trimStart()
  return /^['"]use client['"]/.test(code)
}

/**
 * The packages the browser loads for a page whose server code starts at
 * `entry` (relative to the project): everything reachable from a client
 * module reachable from it. With each, the chain of files that brings it in.
 */
export function clientPackages(entry: string): Map<string, string[]> {
  const found = new Map<string, string[]>()
  const seen = new Set<string>()
  const visit = (file: string, client: boolean, chain: string[]) => {
    const key = `${file}|${client}`
    if (seen.has(key)) return
    seen.add(key)
    const source = readFileSync(file, 'utf8')
    const inClient = client || isClientModule(source)
    const here = [...chain, relative(ROOT, file)]
    for (const spec of importsOf(source)) {
      const to = resolve(file, spec)
      if (!to) continue
      if ('pkg' in to) {
        if (inClient && !found.has(to.pkg)) found.set(to.pkg, here)
      } else visit(to.file, inClient, here)
    }
  }
  visit(join(ROOT, entry), false, [])
  return found
}

/** The packages in `found` that are three.js or react-three-fiber, with the chain that brings each in. */
export function threePackages(found: Map<string, string[]>): string[] {
  return [...found.entries()].filter(([pkg]) => /^(three|@react-three\/fiber)(\/|$)/.test(pkg)).map(([pkg, chain]) => `${pkg} via ${chain.join(' > ')}`)
}
