import fs from 'node:fs/promises'
import path from 'node:path'
import type { LoadedSession } from '../types.js'
import { parseContinuation } from '../memory/parseContinuation.js'
import { parseMemory } from '../memory/parseMemory.js'
import { extractTier1 } from './tierLoader.js'
import { loadBranchOverlay } from './branchOverlay.js'
import { classifyDrift } from '../drift/driftClassifier.js'
import { getCurrentBranch, getChangedFilesSince } from '../drift/gitDiff.js'
import { validateKeyFiles } from '../drift/fileValidator.js'
import { hasManifestChanged } from '../drift/manifestDiff.js'
import { estimateTokens } from '../util/tokens.js'

export async function loadSession(projectRoot: string): Promise<LoadedSession> {
  const continuationPath = path.join(projectRoot, '.memory', 'CONTINUATION.md')
  const memoryPath = path.join(projectRoot, 'MEMORY.md')

  // Fast path: continuation file exists
  try {
    const raw = await fs.readFile(continuationPath, 'utf8')
    const continuation = parseContinuation(raw)
    return {
      mode: 'continuation',
      continuation,
      tokenCost: estimateTokens(raw),
    }
  } catch {
    // no continuation, fall through
  }

  // Full load path
  let memoryRaw: string
  try {
    memoryRaw = await fs.readFile(memoryPath, 'utf8')
  } catch {
    // No MEMORY.md — return empty session
    return { mode: 'full', tokenCost: 0 }
  }

  const doc = parseMemory(memoryRaw)
  const tier1 = extractTier1(doc)

  const currentBranch = await getCurrentBranch(projectRoot)
  const overlay = await loadBranchOverlay(projectRoot, currentBranch)

  const changedFiles = await getChangedFilesSince(projectRoot, doc.frontmatter.git_head)
  const fileResults = validateKeyFiles(doc.keyFiles, projectRoot)
  const manifestChanged = await hasManifestChanged(projectRoot, doc.frontmatter.git_head)

  const drift = classifyDrift({
    memoryBranch: doc.frontmatter.branch,
    currentBranch,
    keyFiles: doc.keyFiles,
    changedFiles,
    manifestChanged,
    activeWork: doc.activeWork,
    blockers: doc.blockers,
    projectRoot,
    sessionCount: doc.recentSessions.length,
  })

  // warn about deleted/renamed key files from drift
  const _ = fileResults

  return {
    mode: 'full',
    tier1,
    overlay,
    drift,
    tokenCost: estimateTokens(memoryRaw),
  }
}
