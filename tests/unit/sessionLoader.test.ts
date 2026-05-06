import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { loadSession } from '../../src/loader/sessionLoader.js'
import { renderContinuation } from '../../src/memory/renderContinuation.js'
import type { ContinuationDoc } from '../../src/types.js'

const FIXTURE_SOLO = path.resolve('tests/fixtures/solo/MEMORY.md')

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'umem-loader-'))
  // copy solo fixture
  fs.mkdirSync(path.join(tmpDir, '.memory', 'branches'), { recursive: true })
  fs.copyFileSync(FIXTURE_SOLO, path.join(tmpDir, 'MEMORY.md'))
})

afterEach(() => {
  fs.rmdirSync(tmpDir, { recursive: true })
})

describe('sessionLoader', () => {
  it('uses continuation fast-path when CONTINUATION.md exists', async () => {
    const contDoc: ContinuationDoc = {
      project_id: 'test',
      branch: 'main',
      updated_at: '2024-01-15',
      expires_on_load: true,
      resumePoint: { file: 'src/index.ts', fn: 'main', line: 1 },
      currentState: ['Working on tests'],
      immediateNextAction: ['Fix failing test'],
      ifDrifted: ['Run umem doctor'],
    }
    const rendered = renderContinuation(contDoc)
    fs.writeFileSync(path.join(tmpDir, '.memory', 'CONTINUATION.md'), rendered, 'utf8')

    const session = await loadSession(tmpDir)
    expect(session.mode).toBe('continuation')
    expect(session.continuation).toBeDefined()
    expect(session.continuation?.project_id).toBe('test')
  })

  it('loads tier 1 when no continuation exists', async () => {
    const session = await loadSession(tmpDir)
    expect(session.mode).toBe('full')
    expect(session.tier1).toBeDefined()
    expect(session.tier1?.snapshot['Project']).toBe('Solo Project')
    expect(session.tier1?.blockers).toBeDefined()
  })
})
