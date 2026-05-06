import Database from 'better-sqlite3'
import type { Observation } from '../types.js'
import { redact } from '../util/secretRedact.js'

export function insertObservation(
  db: InstanceType<typeof Database>,
  obs: Observation
): void {
  if (obs.private) return // never store private observations

  const content = redact(obs.content)
  const tags = obs.tags.join(',')

  const stmt = db.prepare(`
    INSERT INTO observations (session, date, kind, content, tags, private)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  stmt.run(obs.session, obs.date, obs.kind, content, tags, 0)
}
