import { describe, it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { classifyDrift } from '../../src/drift/driftClassifier.js'
import type { DriftInput } from '../../src/types.js'

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'umem-test-'))
}

const baseInput: DriftInput = {
  memoryBranch: 'main',
  currentBranch: 'main',
  keyFiles: [],
  changedFiles: [],
  manifestChanged: false,
  activeWork: [],
  blockers: [],
  projectRoot: os.tmpdir(),
}

describe('driftClassifier', () => {
  it('no drift when everything matches', () => {
    const report = classifyDrift(baseInput)
    expect(report.hasDrift).toBe(false)
    expect(report.branchChanged).toBe(false)
  })

  it('detects branch mismatch', () => {
    const report = classifyDrift({ ...baseInput, currentBranch: 'feature/auth' })
    expect(report.branchChanged).toBe(true)
    expect(report.hasDrift).toBe(true)
  })

  it('detects deleted file', () => {
    const tmp = makeTmpDir()
    const report = classifyDrift({
      ...baseInput,
      projectRoot: tmp,
      keyFiles: [{ file: 'src/nonexistent.ts', purpose: 'test', state: 'active' }],
    })
    expect(report.deletedFiles).toContain('src/nonexistent.ts')
    expect(report.hasDrift).toBe(true)
    fs.rmdirSync(tmp, { recursive: true })
  })

  it('detects renamed file', () => {
    const tmp = makeTmpDir()
    // create a file with same basename but different path
    fs.mkdirSync(path.join(tmp, 'new-src'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'new-src', 'utils.ts'), '', 'utf8')

    const report = classifyDrift({
      ...baseInput,
      projectRoot: tmp,
      keyFiles: [{ file: 'src/utils.ts', purpose: 'test', state: 'active' }],
      changedFiles: ['new-src/utils.ts'],
    })

    expect(report.renamedFiles.length).toBeGreaterThan(0)
    expect(report.renamedFiles[0].was).toBe('src/utils.ts')
    expect(report.renamedFiles[0].now).toBe('new-src/utils.ts')
    expect(report.hasDrift).toBe(true)
    fs.rmdirSync(tmp, { recursive: true })
  })

  it('detects manifest changed', () => {
    const report = classifyDrift({ ...baseInput, manifestChanged: true })
    expect(report.manifestChanged).toBe(true)
    expect(report.hasDrift).toBe(true)
  })

  it('detects resolved blockers', () => {
    const report = classifyDrift({
      ...baseInput,
      blockers: [
        { status: 'resolved', description: 'DB issues', owner: 'alice', since: '2024-01-01' },
      ],
    })
    expect(report.resolvedBlockers).toContain('DB issues')
    expect(report.hasDrift).toBe(true)
  })
})
