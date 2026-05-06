import matter from 'gray-matter'

export interface GlobalMemoryDoc {
  frontmatter: Record<string, unknown>
  sections: Record<string, string>
}

export function parseGlobal(input: string): GlobalMemoryDoc {
  const parsed = matter(input)

  const sections: Record<string, string> = {}
  const parts = parsed.content.split(/^(?=## )/m)
  for (const part of parts) {
    const m = /^## (.+)$/m.exec(part)
    if (!m) continue
    sections[m[1].trim()] = part.slice(m[0].length).replace(/^\n/, '').trimEnd()
  }

  return {
    frontmatter: parsed.data as Record<string, unknown>,
    sections,
  }
}

export function renderGlobal(doc: GlobalMemoryDoc): string {
  const fm = matter.stringify('', doc.frontmatter).trim()
  const body = Object.entries(doc.sections)
    .map(([title, content]) => `## ${title}\n${content}`)
    .join('\n\n')
  return fm + '\n\n' + body + '\n'
}
