import matter from 'gray-matter'
import type { MemoryDoc, WhereWeLeftOff } from '../types.js'
import { renderTable } from './markdownTable.js'
import { redact } from '../util/secretRedact.js'

function renderWhereWeLeftOff(w: WhereWeLeftOff): string {
  const lines = [
    `- File: ${w.file ?? ''}`,
    `- Function: ${w.fn ?? ''}`,
    `- Line: ${w.line ?? ''}`,
    `- Status: ${w.status ?? ''}`,
    `- Next: ${w.next ?? ''}`,
    `- Open question: ${w.openQuestion ?? ''}`,
  ]
  return lines.join('\n')
}

export function renderMemory(doc: MemoryDoc): string {
  const frontmatterStr = matter.stringify('', doc.frontmatter).trim()

  const snapshotRows = Object.entries(doc.snapshot).map(([Field, Value]) => ({ Field, Value }))
  const snapshotTable = renderTable(['Field', 'Value'], snapshotRows)

  const blockerRows = doc.blockers.map((b) => ({
    Status: b.status,
    Blocker: b.description,
    Owner: b.owner,
    Since: b.since,
  }))

  const decisionRows = doc.keyDecisions.map((d) => ({
    Date: d.date,
    Decision: d.decision,
    Why: d.why,
    Scope: d.scope,
  }))

  const keyFileRows = doc.keyFiles.map((f) => ({
    File: f.file,
    Purpose: f.purpose,
    State: f.state,
  }))

  const activeRows = doc.activeWork.map((a) => ({
    Item: a.item,
    Status: a.status,
    'Last touched': a.lastSession,
  }))

  const sessionRows = doc.recentSessions.map((s) => ({
    Session: s.session,
    Date: s.date,
    Summary: s.summary,
  }))

  const sections = [
    `## Snapshot\n${snapshotTable}`,
    `## Where We Left Off\n${renderWhereWeLeftOff(doc.whereWeLeftOff)}`,
    `## Blockers\n${renderTable(['Status', 'Blocker', 'Owner', 'Since'], blockerRows)}`,
    `## Key Decisions\n${renderTable(['Date', 'Decision', 'Why', 'Scope'], decisionRows)}`,
    `## Key Files\n${renderTable(['File', 'Purpose', 'State'], keyFileRows)}`,
    `## Active Work\n${renderTable(['Item', 'Status', 'Last touched'], activeRows)}`,
    `## Recent Sessions\n${renderTable(['Session', 'Date', 'Summary'], sessionRows)}`,
  ]

  for (const [title, content] of Object.entries(doc.rawSections)) {
    sections.push(`## ${title}\n${content}`)
  }

  const body = `\n# Project Memory\n\n${sections.join('\n\n')}\n`
  const full = frontmatterStr + '\n' + body

  return redact(full)
}
