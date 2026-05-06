import { simpleGit } from 'simple-git'
import type { Commit } from '../types.js'

export async function getCurrentBranch(projectRoot: string): Promise<string> {
  try {
    const git = simpleGit(projectRoot)
    const result = await git.revparse(['--abbrev-ref', 'HEAD'])
    return result.trim()
  } catch {
    return 'main'
  }
}

export async function getCommitsSince(projectRoot: string, since: string): Promise<Commit[]> {
  try {
    const git = simpleGit(projectRoot)
    const log = await git.log({ from: since, to: 'HEAD' })
    return log.all.map((c) => ({
      hash: c.hash,
      date: c.date,
      message: c.message,
    }))
  } catch {
    return []
  }
}

export async function getChangedFilesSince(
  projectRoot: string,
  gitHead: string
): Promise<string[]> {
  if (!gitHead || gitHead === 'unknown') return []
  try {
    const git = simpleGit(projectRoot)
    const diff = await git.diff(['--name-only', gitHead, 'HEAD'])
    return diff.split('\n').map((f) => f.trim()).filter(Boolean)
  } catch {
    return []
  }
}
