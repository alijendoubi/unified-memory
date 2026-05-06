import fs from 'node:fs/promises'
import path from 'node:path'
import type { Observation } from '../types.js'
import { redact } from '../util/secretRedact.js'
import { openIndex, initSchema } from '../index/sqlite.js'
import { insertObservation } from '../index/fts.js'

export async function captureEvent(
  projectRoot: string,
  obs: Observation
): Promise<void> {
  if (obs.private) return

  // append to jsonl events log
  const sessionsDir = path.join(projectRoot, '.memory', 'sessions')
  await fs.mkdir(sessionsDir, { recursive: true })
  const eventsPath = path.join(sessionsDir, 'events.jsonl')

  const sanitized: Observation = {
    ...obs,
    content: redact(obs.content),
    tags: obs.tags,
  }

  await fs.appendFile(eventsPath, JSON.stringify(sanitized) + '\n', 'utf8')

  // insert into SQLite
  const db = openIndex(projectRoot)
  initSchema(db)
  insertObservation(db, sanitized)
  db.close()
}
