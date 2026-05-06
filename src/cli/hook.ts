import fs from 'node:fs/promises'
import path from 'node:path'
import { parseContinuation } from '../memory/parseContinuation.js'
import { parseMemory } from '../memory/parseMemory.js'
import { extractTier1 } from '../loader/tierLoader.js'
import { captureEvent } from '../capture/captureEvent.js'
import { isEntirelyPrivate, sanitizeForCapture } from '../capture/privateTags.js'
import { redact } from '../util/secretRedact.js'
import { openIndex, initSchema } from '../index/sqlite.js'
import { insertObservation } from '../index/fts.js'
import type { Observation } from '../types.js'

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => { data += chunk })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', () => resolve(data))
    setTimeout(() => resolve(data), 1000)
  })
}

function findProjectRoot(): string {
  return process.cwd()
}

function generateSessionId(): string {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('')
}

export async function runHook(event: string): Promise<void> {
  const projectRoot = findProjectRoot()
  const stdin = await readStdin()

  switch (event) {
    case 'session-start': {
      await hookSessionStart(projectRoot)
      break
    }
    case 'user-prompt-submit': {
      await hookUserPromptSubmit(projectRoot, stdin)
      break
    }
    case 'post-tool-use': {
      await hookPostToolUse(projectRoot, stdin)
      break
    }
    case 'stop': {
      await hookStop(projectRoot)
      break
    }
    case 'session-end': {
      await hookSessionEnd(projectRoot)
      break
    }
    default:
      process.stderr.write(`[unified-memory] unknown hook event: ${event}\n`)
  }
}

async function hookSessionStart(projectRoot: string): Promise<void> {
  const continuationPath = path.join(projectRoot, '.memory', 'CONTINUATION.md')
  const memoryPath = path.join(projectRoot, 'MEMORY.md')

  // fast path: continuation
  try {
    const raw = await fs.readFile(continuationPath, 'utf8')
    const doc = parseContinuation(raw)
    const lines = [
      `## Resuming from ${doc.branch}`,
      `**File:** ${doc.resumePoint.file}:${doc.resumePoint.line}`,
      `**State:** ${doc.currentState.join(', ')}`,
      `**Next:** ${doc.immediateNextAction.join(', ')}`,
    ]
    process.stdout.write(lines.join('\n') + '\n')
    return
  } catch { /* no continuation, fall through */ }

  // tier 1 load
  try {
    const raw = await fs.readFile(memoryPath, 'utf8')
    const doc = parseMemory(raw)
    const tier1 = extractTier1(doc)
    const lines = [
      `## Memory: ${doc.frontmatter.project_name}`,
      `**Status:** ${tier1.snapshot['Status'] ?? 'unknown'}`,
      `**Next:** ${tier1.whereWeLeftOff.next ?? 'undefined'}`,
    ]
    if (tier1.blockers.filter((b) => b.status === 'open').length > 0) {
      lines.push(`**Blockers:** ${tier1.blockers.filter((b) => b.status === 'open').map((b) => b.description).join(', ')}`)
    }
    process.stdout.write(lines.join('\n') + '\n')
  } catch { /* no memory yet */ }
}

async function hookUserPromptSubmit(projectRoot: string, stdin: string): Promise<void> {
  let event: { prompt?: string } = {}
  try { event = JSON.parse(stdin) } catch { /* ok */ }

  const prompt = event.prompt ?? stdin ?? ''
  if (!prompt.trim()) return
  if (isEntirelyPrivate(prompt)) return

  const clean = redact(sanitizeForCapture(prompt))
  const session = generateSessionId()

  const obs: Observation = {
    session,
    date: new Date().toISOString().slice(0, 10),
    kind: 'prompt',
    content: clean.slice(0, 200),
    tags: ['prompt'],
    private: false,
  }

  await captureEvent(projectRoot, obs)
}

async function hookPostToolUse(projectRoot: string, stdin: string): Promise<void> {
  let event: { tool?: string; file?: string; operation?: string; output?: string } = {}
  try { event = JSON.parse(stdin) } catch { /* ok */ }

  const tool = event.tool ?? 'unknown'
  const file = event.file ?? ''
  const op = event.operation ?? ''
  const content = [tool, file, op].filter(Boolean).join(' | ').slice(0, 200)

  const session = generateSessionId()

  const obs: Observation = {
    session,
    date: new Date().toISOString().slice(0, 10),
    kind: 'tool',
    content: redact(content),
    tags: ['tool', tool],
    private: false,
  }

  await captureEvent(projectRoot, obs)
}

async function hookStop(projectRoot: string): Promise<void> {
  const sessionsDir = path.join(projectRoot, '.memory', 'sessions')
  await fs.mkdir(sessionsDir, { recursive: true })

  const currentSessionPath = path.join(sessionsDir, 'current-session.json')
  const session = generateSessionId()

  const summary = {
    session,
    date: new Date().toISOString(),
    note: 'Session stopped',
  }

  await fs.writeFile(currentSessionPath, JSON.stringify(summary, null, 2), 'utf8')

  // insert summary observation
  const db = openIndex(projectRoot)
  initSchema(db)
  const obs: Observation = {
    session,
    date: new Date().toISOString().slice(0, 10),
    kind: 'note',
    content: 'Session stopped',
    tags: ['session-stop'],
    private: false,
  }
  insertObservation(db, obs)
  db.close()
}

async function hookSessionEnd(projectRoot: string): Promise<void> {
  const sessionsDir = path.join(projectRoot, '.memory', 'sessions')
  await fs.mkdir(sessionsDir, { recursive: true })
  const eventsPath = path.join(sessionsDir, 'events.jsonl')

  try {
    await fs.access(eventsPath)
    process.stderr.write(`[unified-memory] session-end: events log exists at ${eventsPath}\n`)
  } catch { /* no events yet */ }
}
