import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { parseGlobal, renderGlobal } from '../memory/parseGlobal.js'
import { atomicWriteFile } from '../util/atomicWrite.js'

const GLOBAL_DIR = path.join(os.homedir(), '.unified-memory')
const GLOBAL_PATH = path.join(GLOBAL_DIR, 'GLOBAL-MEMORY.md')

export async function promoteToGlobal(
  section: string,
  content: string
): Promise<void> {
  let doc: ReturnType<typeof parseGlobal>
  try {
    const raw = await fs.readFile(GLOBAL_PATH, 'utf8')
    doc = parseGlobal(raw)
  } catch {
    doc = {
      frontmatter: {
        memory_version: 1,
        updated_at: new Date().toISOString().slice(0, 10),
      },
      sections: {},
    }
  }

  doc.sections[section] = content
  doc.frontmatter['updated_at'] = new Date().toISOString().slice(0, 10)

  await fs.mkdir(GLOBAL_DIR, { recursive: true })
  await atomicWriteFile(GLOBAL_PATH, renderGlobal(doc))
}
