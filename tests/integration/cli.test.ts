import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'

let tmpDir: string

const CLI_PATH = path.resolve('dist/cli/index.js')

function umem(args: string, cwd: string): string {
  try {
    return execSync(`node "${CLI_PATH}" ${args}`, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    return (err.stdout ?? '') + (err.stderr ?? '')
  }
}

function gitInit(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' })
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"test"}', 'utf8')
  execSync('git add -A', { cwd: dir, stdio: 'pipe' })
  execSync('git commit -m "init"', { cwd: dir, stdio: 'pipe' })
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'umem-cli-'))
  gitInit(tmpDir)
})

afterEach(() => {
  fs.rmdirSync(tmpDir, { recursive: true })
})

describe('CLI integration', () => {
  it('install creates MEMORY.md and .memory/', () => {
    umem('install --name "Test Project" --stack TypeScript --goal "Test goal"', tmpDir)
    expect(fs.existsSync(path.join(tmpDir, 'MEMORY.md'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, '.memory'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, '.memory', 'index'))).toBe(true)
  })

  it('install appends to CLAUDE.md', () => {
    umem('install --name "Test Project" --stack TypeScript --goal "Test goal"', tmpDir)
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true)
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8')
    expect(content).toContain('unified-memory')
  })

  it('doctor passes after install', () => {
    umem('install --name "Test Project" --stack TypeScript --goal "Test goal"', tmpDir)
    const output = umem('doctor', tmpDir)
    expect(output).toContain('✓')
  })

  it('compact runs and prints token counts', () => {
    umem('install --name "Test Project" --stack TypeScript --goal "Test goal"', tmpDir)
    const output = umem('compact', tmpDir)
    expect(output).toContain('Before:')
    expect(output).toContain('After:')
  })

  it('search works even on empty index', () => {
    umem('install --name "Test Project" --stack TypeScript --goal "Test goal"', tmpDir)
    const output = umem('search "decision"', tmpDir)
    // should not error, just return no results
    expect(output).toContain('No results')
  })

  it('recover backs up MEMORY.md', () => {
    umem('install --name "Test Project" --stack TypeScript --goal "Test goal"', tmpDir)
    umem('recover', tmpDir)
    const recoveryDir = path.join(tmpDir, '.memory', 'recovery')
    const files = fs.readdirSync(recoveryDir)
    expect(files.length).toBeGreaterThan(0)
    expect(files[0]).toMatch(/rebuild-log-/)
  })
})
