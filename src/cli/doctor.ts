import fs from 'node:fs/promises'
import path from 'node:path'
import { parseMemory } from '../memory/parseMemory.js'
import { validateKeyFiles } from '../drift/fileValidator.js'
import { getCurrentBranch } from '../drift/gitDiff.js'
import { openIndex, initSchema } from '../index/sqlite.js'
import { estimateTokens } from '../util/tokens.js'
import { renderMemory } from '../memory/renderMemory.js'
import { slugify } from '../util/slugify.js'

interface Check {
  label: string
  pass: boolean
  hint?: string
}

export async function doctor(projectRoot: string): Promise<void> {
  const checks: Check[] = []
  const memoryPath = path.join(projectRoot, 'MEMORY.md')

  // check MEMORY.md exists
  let memoryRaw = ''
  try {
    memoryRaw = await fs.readFile(memoryPath, 'utf8')
    checks.push({ label: 'MEMORY.md exists', pass: true })
  } catch {
    checks.push({ label: 'MEMORY.md exists', pass: false, hint: 'Run: umem install' })
    printChecks(checks)
    return
  }

  // check frontmatter valid
  let doc: ReturnType<typeof parseMemory> | null = null
  try {
    doc = parseMemory(memoryRaw)
    checks.push({ label: 'Frontmatter valid', pass: true })
  } catch (e) {
    checks.push({ label: 'Frontmatter valid', pass: false, hint: `Parse error: ${String(e)}` })
    printChecks(checks)
    return
  }

  // check protected sections
  const PROTECTED = ['Snapshot', 'Where We Left Off', 'Blockers', 'Key Decisions', 'Key Files', 'Active Work', 'Recent Sessions']
  const sections = Object.keys(
    parseMemoryRaw(memoryRaw)
  )
  const missingSections = PROTECTED.filter((s) => !sections.includes(s))
  checks.push({
    label: 'Protected sections present',
    pass: missingSections.length === 0,
    hint: missingSections.length > 0 ? `Missing: ${missingSections.join(', ')}` : undefined,
  })

  // check key files exist
  const fileResults = validateKeyFiles(doc.keyFiles, projectRoot)
  const missingFiles = fileResults.filter((r) => !r.exists)
  checks.push({
    label: 'Key files exist',
    pass: missingFiles.length === 0,
    hint: missingFiles.length > 0
      ? `Missing: ${missingFiles.map((r) => `${r.file}${r.suggestions.length > 0 ? ` (maybe: ${r.suggestions[0]})` : ''}`).join(', ')}`
      : undefined,
  })

  // check branch matches or overlay exists
  const currentBranch = await getCurrentBranch(projectRoot)
  const branchMatches = doc.frontmatter.branch === currentBranch
  const overlayPath = path.join(projectRoot, '.memory', 'branches', `${slugify(currentBranch)}.md`)
  let overlayExists = false
  try {
    await fs.access(overlayPath)
    overlayExists = true
  } catch { /* ok */ }
  checks.push({
    label: 'Branch matches or overlay exists',
    pass: branchMatches || overlayExists,
    hint: !branchMatches && !overlayExists
      ? `Memory branch: ${doc.frontmatter.branch}, current: ${currentBranch}. Run wrap-up or umem install.`
      : undefined,
  })

  // check tier 1 token cost
  const tier1Cost = estimateTokens(renderMemory(doc))
  checks.push({
    label: `Tier 1 token cost under 450 (actual: ${tier1Cost})`,
    pass: tier1Cost <= 450,
    hint: tier1Cost > 450 ? 'Run: umem compact' : undefined,
  })

  // check SQLite index opens
  try {
    const db = openIndex(projectRoot)
    initSchema(db)
    db.close()
    checks.push({ label: 'SQLite index healthy', pass: true })
  } catch (e) {
    checks.push({ label: 'SQLite index healthy', pass: false, hint: String(e) })
  }

  // check hooks installed
  const hooksPath = path.join(projectRoot, '.claude', 'hooks', 'session-start.js')
  let hooksInstalled = false
  try {
    await fs.access(hooksPath)
    hooksInstalled = true
  } catch { /* ok, optional */ }
  checks.push({
    label: `Hooks installed (optional)`,
    pass: hooksInstalled,
    hint: hooksInstalled ? undefined : 'Run: umem install --hooks to enable auto-capture',
  })

  printChecks(checks)
}

function parseMemoryRaw(raw: string): Record<string, boolean> {
  const sections: Record<string, boolean> = {}
  for (const line of raw.split('\n')) {
    const m = /^## (.+)$/.exec(line)
    if (m) sections[m[1].trim()] = true
  }
  return sections
}

function printChecks(checks: Check[]): void {
  let allPass = true
  for (const check of checks) {
    const icon = check.pass ? '✓' : '✗'
    console.log(`${icon} ${check.label}`)
    if (!check.pass) {
      allPass = false
      if (check.hint) console.log(`  → ${check.hint}`)
    }
  }
  if (allPass) {
    console.log('\nAll checks passed.')
  } else {
    console.log('\nSome checks failed. See hints above.')
    process.exitCode = 1
  }
}
