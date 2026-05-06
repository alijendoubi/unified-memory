import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { loadBranchOverlay, mergeBranchOverlay } from '../../src/loader/branchOverlay.js'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'umem-overlay-'))
  fs.mkdirSync(path.join(tmpDir, '.memory', 'branches'), { recursive: true })
})

afterEach(() => {
  fs.rmdirSync(tmpDir, { recursive: true })
})

describe('branchOverlay', () => {
  it('returns null when no overlay exists', async () => {
    const overlay = await loadBranchOverlay(tmpDir, 'main')
    expect(overlay).toBeNull()
  })

  it('loads existing overlay', async () => {
    const content = `---
branch: "feature-auth"
updated_at: "2024-01-15"
---

## Branch Notes
Working on auth.
`
    fs.writeFileSync(
      path.join(tmpDir, '.memory', 'branches', 'feature-auth.md'),
      content,
      'utf8'
    )

    const overlay = await loadBranchOverlay(tmpDir, 'feature/auth')
    expect(overlay).not.toBeNull()
    expect(overlay?.sections['Branch Notes']).toContain('Working on auth')
  })

  it('overlay section wins over base when both present', () => {
    const base = {
      rawSections: { 'Branch Notes': 'base notes', 'Other': 'base other' },
    }
    const overlay = {
      branch: 'feature',
      updated_at: '2024-01-15',
      sections: { 'Branch Notes': 'overlay notes' },
    }
    const merged = mergeBranchOverlay(base, overlay)
    expect(merged.rawSections['Branch Notes']).toBe('overlay notes')
    expect(merged.rawSections['Other']).toBe('base other')
  })

  it('base section preserved when overlay has no corresponding section', () => {
    const base = {
      rawSections: { 'Unique Base Section': 'base content' },
    }
    const overlay = {
      branch: 'feature',
      updated_at: '2024-01-15',
      sections: { 'New Section': 'overlay content' },
    }
    const merged = mergeBranchOverlay(base, overlay)
    expect(merged.rawSections['Unique Base Section']).toBe('base content')
    expect(merged.rawSections['New Section']).toBe('overlay content')
  })
})
