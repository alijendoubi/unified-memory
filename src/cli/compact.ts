import fs from 'node:fs/promises'
import path from 'node:path'
import { parseMemory } from '../memory/parseMemory.js'
import { renderMemory } from '../memory/renderMemory.js'
import { compact } from '../synthesis/compactor.js'
import { archiveSessions } from '../synthesis/archiver.js'
import { atomicWriteFile } from '../util/atomicWrite.js'

export async function runCompact(projectRoot: string): Promise<void> {
  const memoryPath = path.join(projectRoot, 'MEMORY.md')
  const raw = await fs.readFile(memoryPath, 'utf8')
  const doc = parseMemory(raw)
  const result = compact(doc)

  if (result.archived.length > 0) {
    await archiveSessions(projectRoot, result.archived)
  }

  await atomicWriteFile(memoryPath, renderMemory(result.doc))

  console.log(`Compaction complete.`)
  console.log(`  Before: ${result.estimatedTokensBefore} tokens`)
  console.log(`  After:  ${result.estimatedTokensAfter} tokens`)
  if (result.archived.length > 0) {
    console.log(`  Archived ${result.archived.length} session rows to .memory/MEMORY-ARCHIVE.md`)
  }
  if (result.removedBlockers.length > 0) {
    console.log(`  Removed ${result.removedBlockers.length} resolved blockers`)
  }
}
