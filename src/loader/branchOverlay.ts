import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import type { BranchOverlay } from '../types.js'
import { slugify } from '../util/slugify.js'

function splitSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const parts = body.split(/^(?=## )/m)
  for (const part of parts) {
    const m = /^## (.+)$/m.exec(part)
    if (!m) continue
    sections[m[1].trim()] = part.slice(m[0].length).replace(/^\n/, '').trimEnd()
  }
  return sections
}

export async function loadBranchOverlay(
  projectRoot: string,
  branch: string
): Promise<BranchOverlay | null> {
  const slug = slugify(branch)
  const overlayPath = path.join(projectRoot, '.memory', 'branches', `${slug}.md`)

  try {
    const content = await fs.readFile(overlayPath, 'utf8')
    const parsed = matter(content)
    return {
      branch: (parsed.data['branch'] as string | undefined) ?? branch,
      updated_at: (parsed.data['updated_at'] as string | undefined) ?? '',
      sections: splitSections(parsed.content),
    }
  } catch {
    return null
  }
}

export function mergeBranchOverlay<T extends { rawSections: Record<string, string> }>(
  base: T,
  overlay: BranchOverlay | null
): T {
  if (!overlay) return base
  const merged = { ...base.rawSections }
  for (const [key, val] of Object.entries(overlay.sections)) {
    merged[key] = val
  }
  return { ...base, rawSections: merged }
}
