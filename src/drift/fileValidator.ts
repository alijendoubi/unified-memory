import fs from 'node:fs'
import path from 'node:path'
import type { KeyFile, FileCheckResult } from '../types.js'

export function validateKeyFiles(keyFiles: KeyFile[], projectRoot: string): FileCheckResult[] {
  return keyFiles.map((kf) => {
    const full = path.resolve(projectRoot, kf.file)
    const exists = fs.existsSync(full)
    const suggestions: string[] = []

    if (!exists) {
      // try finding by basename
      const base = path.basename(kf.file)
      const candidates = findByBasename(base, projectRoot)
      suggestions.push(...candidates)
    }

    return { file: kf.file, exists, suggestions }
  })
}

function findByBasename(base: string, dir: string, depth = 0): string[] {
  if (depth > 4) return []
  const results: string[] = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findByBasename(base, full, depth + 1))
      } else if (entry.name === base) {
        results.push(full)
      }
    }
  } catch { /* ignore */ }
  return results.slice(0, 3)
}
