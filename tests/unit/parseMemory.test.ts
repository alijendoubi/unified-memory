import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMemory } from '../../src/memory/parseMemory.js'
import { renderMemory } from '../../src/memory/renderMemory.js'
import { MemoryParseError } from '../../src/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, '../fixtures')

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name, 'MEMORY.md'), 'utf8')
}

describe('parseMemory', () => {
  it('parses solo fixture', () => {
    const doc = parseMemory(loadFixture('solo'))
    expect(doc.frontmatter.project_name).toBe('Solo Project')
    expect(doc.blockers).toHaveLength(1)
    expect(doc.keyDecisions).toHaveLength(1)
    expect(doc.keyFiles).toHaveLength(2)
    expect(doc.activeWork).toHaveLength(2)
    expect(doc.recentSessions).toHaveLength(3)
  })

  it('parses team fixture', () => {
    const doc = parseMemory(loadFixture('team'))
    expect(doc.frontmatter.team_mode).toBe(true)
    expect(doc.blockers).toHaveLength(2)
  })

  it('parses monorepo fixture', () => {
    const doc = parseMemory(loadFixture('monorepo'))
    expect(doc.frontmatter.monorepo).toBe(true)
  })

  it('parses minimal fixture', () => {
    const doc = parseMemory(loadFixture('minimal'))
    expect(doc.frontmatter.minimal).toBe(true)
    expect(doc.blockers).toHaveLength(0)
    expect(doc.keyDecisions).toHaveLength(0)
  })

  it('throws MemoryParseError on invalid frontmatter', () => {
    const invalid = `---
memory_version: 1
---

# Project Memory

## Snapshot
| Field | Value |
|---|---|

## Where We Left Off

## Blockers
| Status | Blocker | Owner | Since |
|---|---|---|---|

## Key Decisions
| Date | Decision | Why | Scope |
|---|---|---|---|

## Key Files
| File | Purpose | State |
|---|---|---|

## Active Work
| Item | Status | Last touched |
|---|---|---|

## Recent Sessions
| Session | Date | Summary |
|---|---|---|
`
    expect(() => parseMemory(invalid)).toThrow(MemoryParseError)
  })

  it('round-trips: parse -> render -> parse gives same result', () => {
    for (const fixture of ['solo', 'team', 'monorepo', 'minimal']) {
      const raw = loadFixture(fixture)
      const doc1 = parseMemory(raw)
      const rendered = renderMemory(doc1)
      const doc2 = parseMemory(rendered)

      expect(doc2.frontmatter.project_id).toBe(doc1.frontmatter.project_id)
      expect(doc2.frontmatter.project_name).toBe(doc1.frontmatter.project_name)
      expect(doc2.blockers.length).toBe(doc1.blockers.length)
      expect(doc2.keyDecisions.length).toBe(doc1.keyDecisions.length)
      expect(doc2.keyFiles.length).toBe(doc1.keyFiles.length)
      expect(doc2.activeWork.length).toBe(doc1.activeWork.length)
      expect(doc2.recentSessions.length).toBe(doc1.recentSessions.length)
    }
  })
})
