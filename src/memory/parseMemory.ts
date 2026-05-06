import matter from 'gray-matter'
import { z } from 'zod'
import {
  MemoryParseError,
  type MemoryDoc,
  type MemoryFrontmatter,
  type WhereWeLeftOff,
  type Blocker,
  type Decision,
  type KeyFile,
  type ActiveItem,
  type SessionRow,
} from '../types.js'
import { parseTable } from './markdownTable.js'

const FrontmatterSchema = z.object({
  memory_version: z.number(),
  project_id: z.string(),
  project_name: z.string(),
  branch: z.string(),
  updated_at: z.string(),
  last_session: z.number(),
  health: z.number(),
  git_head: z.string(),
  resume_priority: z.enum(['continuation_first', 'memory_first']),
  team_mode: z.boolean().optional(),
  monorepo: z.boolean().optional(),
  minimal: z.boolean().optional(),
})

const PROTECTED = [
  'Snapshot',
  'Where We Left Off',
  'Blockers',
  'Key Decisions',
  'Key Files',
  'Active Work',
  'Recent Sessions',
]

function splitSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const headingRe = /^## (.+)$/m
  const parts = body.split(/^(?=## )/m)

  for (const part of parts) {
    const match = headingRe.exec(part)
    if (!match) continue
    const title = match[1].trim()
    const content = part.slice(match[0].length).replace(/^\n/, '').trimEnd()
    sections[title] = content
  }

  return sections
}

function parseWhereWeLeftOff(text: string): WhereWeLeftOff {
  const result: WhereWeLeftOff = {}
  for (const line of text.split('\n')) {
    const m = /^-\s+(\w[\w ]+?):\s*(.*)$/.exec(line.trim())
    if (!m) continue
    const key = m[1].trim().toLowerCase().replace(/\s+/g, '')
    const val = m[2].trim()
    if (key === 'file') result.file = val
    else if (key === 'function') result.fn = val
    else if (key === 'line') result.line = val ? parseInt(val, 10) : undefined
    else if (key === 'status') result.status = val
    else if (key === 'next') result.next = val
    else if (key === 'openquestion') result.openQuestion = val
  }
  return result
}

function parseSnapshot(text: string): Record<string, string> {
  const rows = parseTable(text)
  const snapshot: Record<string, string> = {}
  for (const row of rows) {
    const field = row['Field'] ?? ''
    const value = row['Value'] ?? ''
    if (field) snapshot[field] = value
  }
  return snapshot
}

function parseBlockers(text: string): Blocker[] {
  return parseTable(text).map((row) => ({
    status: (row['Status'] === 'resolved' ? 'resolved' : 'open') as Blocker['status'],
    description: row['Blocker'] ?? '',
    owner: row['Owner'] ?? '',
    since: row['Since'] ?? '',
  }))
}

function parseDecisions(text: string): Decision[] {
  return parseTable(text).map((row) => ({
    date: row['Date'] ?? '',
    decision: row['Decision'] ?? '',
    why: row['Why'] ?? '',
    scope: row['Scope'] ?? '',
  }))
}

function parseKeyFiles(text: string): KeyFile[] {
  const validStates = ['active', 'stable', 'wip', 'archived']
  return parseTable(text).map((row) => ({
    file: row['File'] ?? '',
    purpose: row['Purpose'] ?? '',
    state: (validStates.includes(row['State'] ?? '')
      ? row['State']
      : 'active') as KeyFile['state'],
  }))
}

function parseActiveWork(text: string): ActiveItem[] {
  const validStatuses = ['in_progress', 'todo', 'blocked', 'done', 'stale']
  return parseTable(text).map((row) => ({
    item: row['Item'] ?? '',
    owner: row['Owner'],
    status: (validStatuses.includes(row['Status'] ?? '')
      ? row['Status']
      : 'todo') as ActiveItem['status'],
    lastSession: row['Last touched'] ?? '',
  }))
}

function parseRecentSessions(text: string): SessionRow[] {
  return parseTable(text).map((row) => ({
    session: row['Session'] ?? '',
    date: row['Date'] ?? '',
    summary: row['Summary'] ?? '',
  }))
}

export function parseMemory(input: string): MemoryDoc {
  let parsed: matter.GrayMatterFile<string>
  try {
    parsed = matter(input)
  } catch (cause) {
    throw new MemoryParseError('Failed to parse frontmatter', cause)
  }

  const result = FrontmatterSchema.safeParse(parsed.data)
  if (!result.success) {
    throw new MemoryParseError(
      `Invalid frontmatter: ${result.error.issues.map((i) => i.message).join(', ')}`,
      result.error
    )
  }

  const frontmatter = result.data as MemoryFrontmatter
  const sections = splitSections(parsed.content)
  const rawSections: Record<string, string> = {}

  for (const [key, val] of Object.entries(sections)) {
    if (!PROTECTED.includes(key)) {
      rawSections[key] = val
    }
  }

  return {
    frontmatter,
    snapshot: parseSnapshot(sections['Snapshot'] ?? ''),
    whereWeLeftOff: parseWhereWeLeftOff(sections['Where We Left Off'] ?? ''),
    blockers: parseBlockers(sections['Blockers'] ?? ''),
    keyDecisions: parseDecisions(sections['Key Decisions'] ?? ''),
    keyFiles: parseKeyFiles(sections['Key Files'] ?? ''),
    activeWork: parseActiveWork(sections['Active Work'] ?? ''),
    recentSessions: parseRecentSessions(sections['Recent Sessions'] ?? ''),
    rawSections,
  }
}
