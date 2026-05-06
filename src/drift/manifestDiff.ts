import { getChangedFilesSince } from './gitDiff.js'

const MANIFEST_FILES = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'requirements.txt',
  'Pipfile',
  'go.mod',
  'Cargo.toml',
  'composer.json',
]

export async function hasManifestChanged(
  projectRoot: string,
  gitHead: string
): Promise<boolean> {
  if (!gitHead || gitHead === 'unknown') return false
  const changed = await getChangedFilesSince(projectRoot, gitHead)
  return changed.some((f) => MANIFEST_FILES.some((m) => f === m || f.endsWith('/' + m)))
}
