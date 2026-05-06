import { describe, it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { validateKeyFiles } from '../../src/drift/fileValidator.js'

describe('fileValidator', () => {
  it('reports existing file as exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'umem-fv-'))
    fs.writeFileSync(path.join(tmp, 'index.ts'), '', 'utf8')

    const results = validateKeyFiles(
      [{ file: 'index.ts', purpose: 'entry', state: 'active' }],
      tmp
    )
    expect(results[0].exists).toBe(true)
    fs.rmdirSync(tmp, { recursive: true })
  })

  it('reports missing file and suggests by basename', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'umem-fv-'))
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'src', 'index.ts'), '', 'utf8')

    const results = validateKeyFiles(
      [{ file: 'old/index.ts', purpose: 'entry', state: 'active' }],
      tmp
    )
    expect(results[0].exists).toBe(false)
    expect(results[0].suggestions.some((s) => s.includes('index.ts'))).toBe(true)
    fs.rmdirSync(tmp, { recursive: true })
  })
})
