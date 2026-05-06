import fs from 'node:fs/promises'
import path from 'node:path'
import { simpleGit } from 'simple-git'
import type { SessionNotes, WrapUpResult } from '../types.js'
import { parseMemory } from '../memory/parseMemory.js'
import { renderMemory } from '../memory/renderMemory.js'
import { renderContinuation } from '../memory/renderContinuation.js'
import { atomicWriteFile } from '../util/atomicWrite.js'
import { estimateTokens } from '../util/tokens.js'
import { redact, stripPrivateBlocks } from '../util/secretRedact.js'
import { compact } from './compactor.js'
import { archiveSessions } from './archiver.js'
import { buildSessionRow, generateSessionId } from './sessionSummarizer.js'
import { slugify } from '../util/slugify.js'

async function getGitHead(projectRoot: string): Promise<string> {
  try {
    const git = simpleGit(projectRoot)
    const result = await git.revparse(['HEAD'])
    return result.trim()
  } catch {
    return 'unknown'
  }
}

async function getCurrentBranch(projectRoot: string): Promise<string> {
  try {
    const git = simpleGit(projectRoot)
    const result = await git.revparse(['--abbrev-ref', 'HEAD'])
    return result.trim()
  } catch {
    return 'main'
  }
}

export async function wrapUp(
  projectRoot: string,
  notes: SessionNotes
): Promise<WrapUpResult> {
  const memoryPath = path.join(projectRoot, 'MEMORY.md')

  const raw = await fs.readFile(memoryPath, 'utf8')
  const before = estimateTokens(raw)
  const doc = parseMemory(raw)

  // sanitize session notes
  const sanitizedSummary = redact(stripPrivateBlocks(notes.summary))
  const sanitizedNotes: SessionNotes = {
    ...notes,
    summary: sanitizedSummary,
    decisions: notes.decisions.map((d) => ({
      ...d,
      why: redact(stripPrivateBlocks(d.why)),
      decision: redact(stripPrivateBlocks(d.decision)),
    })),
  }

  // remove resolved blockers
  const updatedBlockers = doc.blockers.filter(
    (b) => !sanitizedNotes.blockersResolved.includes(b.description) && b.status !== 'resolved'
  )

  // update active work
  const updatedActiveWork = [...doc.activeWork]
  for (const update of sanitizedNotes.activeUpdates) {
    const idx = updatedActiveWork.findIndex((a) => a.item === update.item)
    if (idx >= 0) {
      updatedActiveWork[idx] = update
    } else {
      updatedActiveWork.push(update)
    }
  }

  // append session row
  const sessionId = generateSessionId()
  const sessionRow = buildSessionRow(sanitizedNotes, sessionId)

  // update git metadata
  const gitHead = await getGitHead(projectRoot)
  const branch = await getCurrentBranch(projectRoot)

  const updated = {
    ...doc,
    blockers: updatedBlockers,
    activeWork: updatedActiveWork,
    keyDecisions: [...doc.keyDecisions, ...sanitizedNotes.decisions],
    recentSessions: [...doc.recentSessions, sessionRow],
    whereWeLeftOff: sanitizedNotes.nextAction ?? doc.whereWeLeftOff,
    frontmatter: {
      ...doc.frontmatter,
      updated_at: new Date().toISOString().slice(0, 10),
      last_session: doc.frontmatter.last_session + 1,
      git_head: gitHead,
      branch,
      health: 1,
    },
  }

  // run compaction
  const compacted = compact(updated)
  const archivedRows = compacted.archived.length

  // archive old sessions
  await archiveSessions(projectRoot, compacted.archived)

  // write updated memory
  const rendered = renderMemory(compacted.doc)
  await atomicWriteFile(memoryPath, rendered)

  // write continuation if unfinished work
  let continuationWritten = false
  const continuationPath = path.join(projectRoot, '.memory', 'CONTINUATION.md')

  if (sanitizedNotes.hasUnfinishedWork && sanitizedNotes.nextAction) {
    const next = sanitizedNotes.nextAction
    const continuationDoc = {
      project_id: doc.frontmatter.project_id,
      branch,
      updated_at: new Date().toISOString().slice(0, 10),
      expires_on_load: true,
      resumePoint: {
        file: next.file ?? '',
        fn: next.fn ?? '',
        line: next.line ?? 0,
      },
      currentState: [sanitizedNotes.summary],
      immediateNextAction: next.next ? [next.next] : [],
      ifDrifted: [
        'Re-read key files listed in MEMORY.md',
        'Run umem doctor to check for drift',
      ],
    }
    const continuationContent = renderContinuation(continuationDoc)
    await atomicWriteFile(continuationPath, continuationContent)
    continuationWritten = true
  } else {
    // remove stale continuation
    try { await fs.unlink(continuationPath) } catch { /* ok */ }
  }

  // write branch overlay if branch-specific
  let overlayWritten = false
  if (sanitizedNotes.branchSpecific) {
    const overlayPath = path.join(
      projectRoot,
      '.memory',
      'branches',
      `${slugify(branch)}.md`
    )
    const overlayContent = `---\nbranch: "${branch}"\nupdated_at: "${new Date().toISOString().slice(0, 10)}"\n---\n\n## Branch Notes\n${sanitizedNotes.summary}\n`
    await atomicWriteFile(overlayPath, overlayContent)
    overlayWritten = true
  }

  const after = estimateTokens(rendered)

  return {
    memoryPath,
    continuationWritten,
    overlayWritten,
    archivedRows,
    tokenCostBefore: before,
    tokenCostAfter: after,
  }
}
