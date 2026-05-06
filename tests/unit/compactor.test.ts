import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMemory } from '../../src/memory/parseMemory.js'
import { renderMemory } from '../../src/memory/renderMemory.js'
import { compact } from '../../src/synthesis/compactor.js'
import type { MemoryDoc } from '../../src/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, '../fixtures')

const PROTECTED = [
  'Snapshot',
  'Where We Left Off',
  'Blockers',
  'Key Decisions',
  'Key Files',
  'Active Work',
  'Recent Sessions',
]

function hasAllProtectedSections(rendered: string): boolean {
  return PROTECTED.every((s) => rendered.includes(`## ${s}`))
}

describe('compactor', () => {
  it('protected sections survive safe compaction', () => {
    const raw = fs.readFileSync(path.join(FIXTURES, 'team', 'MEMORY.md'), 'utf8')
    const doc = parseMemory(raw)
    const result = compact(doc)
    const rendered = renderMemory(result.doc)
    expect(hasAllProtectedSections(rendered)).toBe(true)
  })

  it('removes resolved blockers in safe phase', () => {
    const raw = fs.readFileSync(path.join(FIXTURES, 'team', 'MEMORY.md'), 'utf8')
    const doc = parseMemory(raw)

    // inflate far past 900-token threshold (3600 chars)
    const inflated: MemoryDoc = {
      ...doc,
      recentSessions: Array(40).fill(null).map((_, i) => ({
        session: `sess-${i}`,
        date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
        summary: 'A'.repeat(120),
      })),
    }

    const result = compact(inflated)
    const resolvedInResult = result.doc.blockers.filter((b) => b.status === 'resolved')
    expect(resolvedInResult).toHaveLength(0)
  })

  it('archives old sessions in controlled phase', () => {
    const raw = fs.readFileSync(path.join(FIXTURES, 'team', 'MEMORY.md'), 'utf8')
    const doc = parseMemory(raw)

    // inflate past 1100-token threshold (4400 chars)
    const inflated: MemoryDoc = {
      ...doc,
      recentSessions: Array(60).fill(null).map((_, i) => ({
        session: `sess-${i}`,
        date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
        summary: 'B'.repeat(120),
      })),
    }

    const result = compact(inflated)
    expect(result.archived.length).toBeGreaterThan(0)
    expect(result.doc.recentSessions.length).toBeLessThanOrEqual(3)
  })

  it('archive output is deterministic', () => {
    const raw = fs.readFileSync(path.join(FIXTURES, 'solo', 'MEMORY.md'), 'utf8')
    const doc = parseMemory(raw)
    const result1 = compact(doc)
    const result2 = compact(doc)
    expect(result1.archived.length).toBe(result2.archived.length)
    expect(result1.estimatedTokensAfter).toBe(result2.estimatedTokensAfter)
  })
})
