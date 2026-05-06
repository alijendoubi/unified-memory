import matter from 'gray-matter'
import type { ContinuationDoc } from '../types.js'
import { estimateTokens, tokenBudgetWarning } from '../util/tokens.js'
import { redact } from '../util/secretRedact.js'

function renderList(items: string[]): string {
  if (items.length === 0) return '- (none)'
  return items.map((i) => `- ${i}`).join('\n')
}

export function renderContinuation(doc: ContinuationDoc): string {
  const fm = {
    project_id: doc.project_id,
    branch: doc.branch,
    updated_at: doc.updated_at,
    expires_on_load: doc.expires_on_load,
  }

  const frontmatterStr = matter.stringify('', fm).trim()

  const body = [
    `## Resume Point`,
    `- File: ${doc.resumePoint.file}`,
    `- Function: ${doc.resumePoint.fn}`,
    `- Line: ${doc.resumePoint.line}`,
    ``,
    `## Current State`,
    renderList(doc.currentState),
    ``,
    `## Immediate Next Action`,
    renderList(doc.immediateNextAction),
    ``,
    `## If Drifted`,
    renderList(doc.ifDrifted),
  ].join('\n')

  const full = redact(frontmatterStr + '\n\n' + body + '\n')

  const cost = estimateTokens(full)
  tokenBudgetWarning(cost, 'continuation')

  return full
}
