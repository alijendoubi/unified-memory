import fs from 'node:fs/promises'
import path from 'node:path'
import type { SessionRow } from '../types.js'
import { atomicWriteFile } from '../util/atomicWrite.js'

export async function archiveSessions(
  projectRoot: string,
  rows: SessionRow[]
): Promise<void> {
  if (rows.length === 0) return

  const archivePath = path.join(projectRoot, '.memory', 'MEMORY-ARCHIVE.md')

  let existing = ''
  try {
    existing = await fs.readFile(archivePath, 'utf8')
  } catch { /* archive may not exist yet */ }

  const newRows = rows
    .map((r) => `| ${r.session} | ${r.date} | ${r.summary} |`)
    .join('\n')

  let content: string
  if (existing.trim()) {
    content = existing.trimEnd() + '\n' + newRows + '\n'
  } else {
    content = `# Session Archive\n\n| Session | Date | Summary |\n|---|---|---|\n${newRows}\n`
  }

  await atomicWriteFile(archivePath, content)
}
