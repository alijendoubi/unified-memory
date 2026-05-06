import path from 'node:path'
import fs from 'node:fs'
import type { DriftReport, DriftInput, KeyFile } from '../types.js'

function detectRenames(
  keyFiles: KeyFile[],
  changedFiles: string[],
  projectRoot: string
): Array<{ was: string; now: string }> {
  const renames: Array<{ was: string; now: string }> = []

  for (const kf of keyFiles) {
    const full = path.resolve(projectRoot, kf.file)
    if (fs.existsSync(full)) continue // file still exists, no rename

    // look for a file with same basename in changed files
    const base = path.basename(kf.file)
    const match = changedFiles.find((f) => path.basename(f) === base && f !== kf.file)
    if (match) {
      renames.push({ was: kf.file, now: match })
    }
  }

  return renames
}

function detectDeletedFiles(
  keyFiles: KeyFile[],
  renames: Array<{ was: string; now: string }>,
  projectRoot: string
): string[] {
  const renamedWas = new Set(renames.map((r) => r.was))
  return keyFiles
    .filter((kf) => {
      if (renamedWas.has(kf.file)) return false
      return !fs.existsSync(path.resolve(projectRoot, kf.file))
    })
    .map((kf) => kf.file)
}

function detectStaleActiveItems(activeWork: DriftInput['activeWork']): string[] {
  // items that have been in_progress/todo for multiple sessions without update
  return activeWork
    .filter((a) => a.status === 'in_progress' || a.status === 'todo')
    .filter((a) => !a.lastSession)
    .map((a) => a.item)
}

function detectResolvedBlockers(blockers: DriftInput['blockers']): string[] {
  return blockers.filter((b) => b.status === 'resolved').map((b) => b.description)
}

export function classifyDrift(input: DriftInput): DriftReport {
  const branchChanged = input.memoryBranch !== input.currentBranch

  const renamedFiles = detectRenames(input.keyFiles, input.changedFiles, input.projectRoot)
  const deletedFiles = detectDeletedFiles(input.keyFiles, renamedFiles, input.projectRoot)
  const staleActiveItems = detectStaleActiveItems(input.activeWork)
  const resolvedBlockers = detectResolvedBlockers(input.blockers)

  const hasDrift =
    branchChanged ||
    renamedFiles.length > 0 ||
    deletedFiles.length > 0 ||
    input.manifestChanged ||
    staleActiveItems.length > 0 ||
    resolvedBlockers.length > 0

  return {
    branchChanged,
    renamedFiles,
    deletedFiles,
    manifestChanged: input.manifestChanged,
    staleActiveItems,
    resolvedBlockers,
    hasDrift,
  }
}
