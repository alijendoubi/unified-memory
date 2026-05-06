import matter from 'gray-matter'
import { z } from 'zod'
import { ContinuationParseError, type ContinuationDoc } from '../types.js'
import { estimateTokens, tokenBudgetWarning } from '../util/tokens.js'

const FrontmatterSchema = z.object({
  project_id: z.string(),
  branch: z.string(),
  updated_at: z.string(),
  expires_on_load: z.boolean().default(false),
})

function parseListSection(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^-\s+/, '').trim())
    .filter(Boolean)
}

function parseResumePoint(text: string): ContinuationDoc['resumePoint'] {
  const result = { file: '', fn: '', line: 0 }
  for (const line of text.split('\n')) {
    const m = /^-\s+(\w[\w ]+?):\s*(.*)$/.exec(line.trim())
    if (!m) continue
    const key = m[1].trim().toLowerCase()
    const val = m[2].trim()
    if (key === 'file') result.file = val
    else if (key === 'function') result.fn = val
    else if (key === 'line') result.line = parseInt(val, 10) || 0
  }
  return result
}

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

export function parseContinuation(input: string): ContinuationDoc {
  let parsed: matter.GrayMatterFile<string>
  try {
    parsed = matter(input)
  } catch (cause) {
    throw new ContinuationParseError('Failed to parse continuation frontmatter', cause)
  }

  const result = FrontmatterSchema.safeParse(parsed.data)
  if (!result.success) {
    throw new ContinuationParseError(
      `Invalid continuation frontmatter: ${result.error.issues.map((i) => i.message).join(', ')}`,
      result.error
    )
  }

  const fm = result.data
  const sections = splitSections(parsed.content)

  const doc: ContinuationDoc = {
    project_id: fm.project_id,
    branch: fm.branch,
    updated_at: fm.updated_at,
    expires_on_load: fm.expires_on_load,
    resumePoint: parseResumePoint(sections['Resume Point'] ?? ''),
    currentState: parseListSection(sections['Current State'] ?? ''),
    immediateNextAction: parseListSection(sections['Immediate Next Action'] ?? ''),
    ifDrifted: parseListSection(sections['If Drifted'] ?? ''),
  }

  const cost = estimateTokens(input)
  tokenBudgetWarning(cost, 'continuation')

  return doc
}
