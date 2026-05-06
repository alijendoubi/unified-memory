import fs from 'node:fs/promises'
import path from 'node:path'
import { MemoryWriteError } from '../types.js'

export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tmp = filePath + '.tmp'
  const bytes = Buffer.byteLength(content, 'utf8')

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(tmp, content, 'utf8')
    await fs.rename(tmp, filePath)
    process.stderr.write(`[unified-memory] wrote ${filePath} (${bytes} bytes)\n`)
  } catch (cause) {
    try { await fs.unlink(tmp) } catch { /* ignore cleanup error */ }
    throw new MemoryWriteError(`Failed to write ${filePath}`, filePath, cause)
  }
}
