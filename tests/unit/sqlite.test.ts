import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { openIndex, initSchema } from '../../src/index/sqlite.js'
import { insertObservation } from '../../src/index/fts.js'
import { search, getById, timeline } from '../../src/index/search.js'
import type { Observation } from '../../src/types.js'

let tmpDir: string
let db: ReturnType<typeof openIndex>

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'umem-sqlite-'))
  db = openIndex(tmpDir)
  initSchema(db)
})

afterEach(() => {
  db.close()
  fs.rmdirSync(tmpDir, { recursive: true })
})

const obs: Observation = {
  session: 'test-session-001',
  date: '2024-01-15',
  kind: 'decision',
  content: 'We decided to use TypeScript for type safety',
  tags: ['typescript', 'decision'],
  private: false,
}

describe('sqlite search', () => {
  it('inserts and retrieves via search — returns snippets only', () => {
    insertObservation(db, obs)
    const results = search(db, 'TypeScript')
    expect(results.length).toBeGreaterThan(0)
    // snippet should be truncated, not full content necessarily
    expect(results[0].snippet).toBeTruthy()
    expect(results[0].id).toBeTypeOf('number')
    // search result does NOT return full content field
    expect(Object.keys(results[0])).not.toContain('content')
  })

  it('does not store private observations', () => {
    const privateObs: Observation = {
      ...obs,
      content: 'secret private content',
      private: true,
    }
    insertObservation(db, privateObs)
    const results = search(db, 'secret private')
    expect(results.length).toBe(0)
  })

  it('returns empty results for no match', () => {
    insertObservation(db, obs)
    const results = search(db, 'zzznonexistent')
    expect(results.length).toBe(0)
  })
})

describe('sqlite getById', () => {
  it('returns full content only when requested by ID', () => {
    insertObservation(db, obs)
    const searchResults = search(db, 'TypeScript')
    const id = searchResults[0].id

    const full = getById(db, [id])
    expect(full).toHaveLength(1)
    expect(full[0].content).toContain('decided to use TypeScript')
    expect(full[0].kind).toBe('decision')
  })

  it('returns empty for empty id list', () => {
    const result = getById(db, [])
    expect(result).toHaveLength(0)
  })
})

describe('sqlite timeline', () => {
  it('returns nearby session observations', () => {
    const sessions = ['sess-1', 'sess-2', 'sess-3', 'sess-4', 'sess-5']
    for (const session of sessions) {
      insertObservation(db, { ...obs, session, content: `content for ${session}` })
    }
    const results = timeline(db, 'sess-3', 1)
    const foundSessions = new Set(results.map((r) => r.session))
    // should include sess-2, sess-3, sess-4 (window of 1)
    expect(foundSessions.has('sess-3')).toBe(true)
  })
})
