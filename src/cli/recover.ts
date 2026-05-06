import fs from 'node:fs/promises'
import path from 'node:path'
import { parseMemory } from '../memory/parseMemory.js'
import { renderMemory } from '../memory/renderMemory.js'
import { atomicWriteFile } from '../util/atomicWrite.js'
import { getCurrentBranch, getCommitsSince } from '../drift/gitDiff.js'
import { openIndex, initSchema } from '../index/sqlite.js'
import { search } from '../index/search.js'
import type { MemoryDoc } from '../types.js'

export async function runRecover(projectRoot: string): Promise<void> {
  const memoryPath = path.join(projectRoot, 'MEMORY.md')
  const recoveryDir = path.join(projectRoot, '.memory', 'recovery')
  await fs.mkdir(recoveryDir, { recursive: true })

  // backup current MEMORY.md
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(recoveryDir, `rebuild-log-${timestamp}.md`)

  try {
    const current = await fs.readFile(memoryPath, 'utf8')
    await fs.writeFile(backupPath, current, 'utf8')
    console.log(`Backed up to: ${backupPath}`)
  } catch {
    console.log('No existing MEMORY.md to backup.')
  }

  // parse best-effort
  let existingDoc: MemoryDoc | null = null
  try {
    const raw = await fs.readFile(memoryPath, 'utf8')
    existingDoc = parseMemory(raw)
  } catch { /* ok */ }

  // get git info
  const branch = await getCurrentBranch(projectRoot)
  const since = existingDoc?.frontmatter.git_head ?? 'HEAD~20'
  const commits = await getCommitsSince(projectRoot, since)

  // get sqlite observations
  let observations: string[] = []
  try {
    const db = openIndex(projectRoot)
    initSchema(db)
    const results = search(db, '*', 20)
    observations = results.map((r) => `- [${r.date}] ${r.snippet}`)
    db.close()
  } catch { /* no index */ }

  // reconstruct doc
  const date = new Date().toISOString().slice(0, 10)

  const recoveredDoc: MemoryDoc = {
    frontmatter: {
      memory_version: 1,
      project_id: existingDoc?.frontmatter.project_id ?? 'recovered',
      project_name: existingDoc?.frontmatter.project_name ?? 'Recovered Project',
      branch,
      updated_at: date,
      last_session: existingDoc?.frontmatter.last_session ?? 0,
      health: 0,
      git_head: commits[0]?.hash ?? 'unknown',
      resume_priority: 'memory_first',
    },
    snapshot: {
      ...existingDoc?.snapshot,
      Status: `[RECOVERED ${date}]`,
    },
    whereWeLeftOff: existingDoc?.whereWeLeftOff ?? {},
    blockers: existingDoc?.blockers ?? [],
    keyDecisions: existingDoc?.keyDecisions ?? [],
    keyFiles: existingDoc?.keyFiles ?? [],
    activeWork: existingDoc?.activeWork ?? [],
    recentSessions: [
      ...(existingDoc?.recentSessions ?? []),
      {
        session: `recovery-${date}`,
        date,
        summary: `Memory recovered. ${commits.length} commits found since last snapshot.`,
      },
    ],
    rawSections: {
      ...existingDoc?.rawSections,
      'Recovery Log': [
        `Recovered on ${date}.`,
        commits.length > 0 ? `Recent commits:\n${commits.slice(0, 5).map((c) => `- ${c.hash.slice(0, 7)} ${c.message}`).join('\n')}` : '',
        observations.length > 0 ? `Observations from index:\n${observations.join('\n')}` : '',
      ].filter(Boolean).join('\n\n'),
    },
  }

  await atomicWriteFile(memoryPath, renderMemory(recoveredDoc))

  console.log(`Recovery complete.`)
  console.log(`  Branch: ${branch}`)
  console.log(`  Commits found: ${commits.length}`)
  console.log(`  Observations found: ${observations.length}`)
  console.log(`  Run 'umem doctor' to verify.`)
}
