import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { simpleGit } from 'simple-git'
import { atomicWriteFile } from '../util/atomicWrite.js'
import { openIndex, initSchema } from '../index/sqlite.js'
import { slugify } from '../util/slugify.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface InstallOptions {
  force?: boolean
  hooks?: boolean
}

async function getGitHead(projectRoot: string): Promise<string> {
  try {
    const git = simpleGit(projectRoot)
    return (await git.revparse(['HEAD'])).trim()
  } catch {
    return 'unknown'
  }
}

async function getCurrentBranch(projectRoot: string): Promise<string> {
  try {
    const git = simpleGit(projectRoot)
    return (await git.revparse(['--abbrev-ref', 'HEAD'])).trim()
  } catch {
    return 'main'
  }
}

function generateProjectId(name: string): string {
  return slugify(name) + '-' + Math.random().toString(36).slice(2, 8)
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value)
  }
  return result
}

async function appendToGitignore(projectRoot: string): Promise<void> {
  const gitignorePath = path.join(projectRoot, '.gitignore')
  const additions = ['.memory/index/', '.memory/sessions/']

  let existing = ''
  try {
    existing = await fs.readFile(gitignorePath, 'utf8')
  } catch { /* no .gitignore yet */ }

  const toAdd = additions.filter((line) => !existing.includes(line))
  if (toAdd.length > 0) {
    const content = existing.trimEnd() + '\n' + toAdd.join('\n') + '\n'
    await atomicWriteFile(gitignorePath, content)
  }
}

async function appendToClaudeMd(projectRoot: string): Promise<void> {
  const claudePath = path.join(projectRoot, 'CLAUDE.md')
  const snippetPath = path.join(__dirname, '../../templates/CLAUDE.md.snippet')

  let snippet = ''
  try {
    snippet = await fs.readFile(snippetPath, 'utf8')
  } catch {
    snippet = `<!-- unified-memory start -->\n## Memory\nThis project uses unified-memory.\n<!-- unified-memory end -->\n`
  }

  let existing = ''
  try {
    existing = await fs.readFile(claudePath, 'utf8')
  } catch { /* no CLAUDE.md yet */ }

  if (existing.includes('<!-- unified-memory start -->')) {
    return // already has the block
  }

  const content = existing.trimEnd() + '\n\n' + snippet
  await atomicWriteFile(claudePath, content)
}

async function installHooks(projectRoot: string): Promise<void> {
  const hooksDest = path.join(projectRoot, '.claude', 'hooks')
  await fs.mkdir(hooksDest, { recursive: true })

  const hookSrcDir = path.join(__dirname, '../../hooks')

  const hookFiles = ['session-start.js', 'user-prompt-submit.js', 'post-tool-use.js', 'stop.js', 'session-end.js']

  for (const file of hookFiles) {
    const src = path.join(hookSrcDir, file)
    const dest = path.join(hooksDest, file)
    try {
      const content = await fs.readFile(src, 'utf8')
      await atomicWriteFile(dest, content)
    } catch {
      process.stderr.write(`[unified-memory] could not copy hook ${file}\n`)
    }
  }

  // update .claude/settings.json
  const settingsPath = path.join(projectRoot, '.claude', 'settings.json')
  let settings: Record<string, unknown> = {}
  try {
    const raw = await fs.readFile(settingsPath, 'utf8')
    settings = JSON.parse(raw) as Record<string, unknown>
  } catch { /* no settings yet */ }

  settings['hooks'] = {
    SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: 'node .claude/hooks/session-start.js' }] }],
    UserPromptSubmit: [{ matcher: '', hooks: [{ type: 'command', command: 'node .claude/hooks/user-prompt-submit.js' }] }],
    PostToolUse: [{ matcher: '', hooks: [{ type: 'command', command: 'node .claude/hooks/post-tool-use.js' }] }],
    Stop: [{ matcher: '', hooks: [{ type: 'command', command: 'node .claude/hooks/stop.js' }] }],
  }

  await fs.mkdir(path.join(projectRoot, '.claude'), { recursive: true })
  await atomicWriteFile(settingsPath, JSON.stringify(settings, null, 2) + '\n')
}

export async function install(
  projectRoot: string,
  projectName: string,
  stack: string,
  goal: string,
  opts: InstallOptions = {}
): Promise<void> {
  const memoryPath = path.join(projectRoot, 'MEMORY.md')

  // check if already exists
  try {
    await fs.access(memoryPath)
    if (!opts.force) {
      console.log('MEMORY.md already exists. Use --force to overwrite.')
      return
    }
  } catch { /* doesn't exist, proceed */ }

  // create directory structure
  const dirs = [
    path.join(projectRoot, '.memory'),
    path.join(projectRoot, '.memory', 'branches'),
    path.join(projectRoot, '.memory', 'index'),
    path.join(projectRoot, '.memory', 'sessions'),
    path.join(projectRoot, '.memory', 'recovery'),
  ]
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true })
  }

  // get git info
  const gitHead = await getGitHead(projectRoot)
  const branch = await getCurrentBranch(projectRoot)
  const projectId = generateProjectId(projectName)
  const date = new Date().toISOString().slice(0, 10)

  // fill template
  const templatePath = path.join(__dirname, '../../templates/MEMORY.md')
  const template = await fs.readFile(templatePath, 'utf8')
  const vars: Record<string, string> = {
    project_id: projectId,
    project_name: projectName,
    branch,
    date,
    git_head: gitHead,
    stack,
    goal,
  }
  const content = fillTemplate(template, vars)

  // write MEMORY.md
  await atomicWriteFile(memoryPath, content)

  // initialize SQLite
  const db = openIndex(projectRoot)
  initSchema(db)
  db.close()

  // update .gitignore
  await appendToGitignore(projectRoot)

  // append to CLAUDE.md
  await appendToClaudeMd(projectRoot)

  // install hooks if requested
  if (opts.hooks) {
    await installHooks(projectRoot)
  }

  console.log(`Memory initialized.`)
  console.log(`Start Claude Code and say:`)
  console.log(`"pick up where we left off"`)
}
