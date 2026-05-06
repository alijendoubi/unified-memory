import Database from 'better-sqlite3'
import type { SearchResult, Observation } from '../types.js'

const SNIPPET_LEN = 120

function makeSnippet(content: string): string {
  return content.length > SNIPPET_LEN ? content.slice(0, SNIPPET_LEN) + '…' : content
}

export function search(
  db: InstanceType<typeof Database>,
  query: string,
  limit = 8
): SearchResult[] {
  const stmt = db.prepare(`
    SELECT o.id, o.session, o.date, o.kind, o.content, o.tags
    FROM observations_fts f
    JOIN observations o ON o.id = f.rowid
    WHERE observations_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `)

  const rows = stmt.all(query, limit) as Array<{
    id: number
    session: string
    date: string
    kind: string
    content: string
    tags: string
  }>

  return rows.map((r) => ({
    id: r.id,
    session: r.session,
    date: r.date,
    kind: r.kind as Observation['kind'],
    snippet: makeSnippet(r.content),
    tags: r.tags ? r.tags.split(',') : [],
  }))
}

export function timeline(
  db: InstanceType<typeof Database>,
  session: string,
  window = 2
): SearchResult[] {
  // get sessions near the given session
  const sessionsStmt = db.prepare(`
    SELECT DISTINCT session FROM observations ORDER BY date
  `)
  const allSessions = (sessionsStmt.all() as Array<{ session: string }>).map((r) => r.session)
  const idx = allSessions.indexOf(session)
  if (idx < 0) return []

  const start = Math.max(0, idx - window)
  const end = Math.min(allSessions.length - 1, idx + window)
  const windowSessions = allSessions.slice(start, end + 1)

  const placeholders = windowSessions.map(() => '?').join(',')
  const stmt = db.prepare(`
    SELECT id, session, date, kind, content, tags
    FROM observations
    WHERE session IN (${placeholders})
    ORDER BY date
    LIMIT 20
  `)

  const rows = stmt.all(...windowSessions) as Array<{
    id: number
    session: string
    date: string
    kind: string
    content: string
    tags: string
  }>

  return rows.map((r) => ({
    id: r.id,
    session: r.session,
    date: r.date,
    kind: r.kind as Observation['kind'],
    snippet: makeSnippet(r.content),
    tags: r.tags ? r.tags.split(',') : [],
  }))
}

export function getById(
  db: InstanceType<typeof Database>,
  ids: number[]
): Observation[] {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(',')
  const stmt = db.prepare(`
    SELECT id, session, date, kind, content, tags, private
    FROM observations
    WHERE id IN (${placeholders})
  `)

  const rows = stmt.all(...ids) as Array<{
    id: number
    session: string
    date: string
    kind: string
    content: string
    tags: string
    private: number
  }>

  return rows.map((r) => ({
    id: r.id,
    session: r.session,
    date: r.date,
    kind: r.kind as Observation['kind'],
    content: r.content,
    tags: r.tags ? r.tags.split(',') : [],
    private: r.private === 1,
  }))
}
