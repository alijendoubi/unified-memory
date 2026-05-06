export type Result<T, E extends Error = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export interface MemoryFrontmatter {
  memory_version: number
  project_id: string
  project_name: string
  branch: string
  updated_at: string
  last_session: number
  health: number
  git_head: string
  resume_priority: 'continuation_first' | 'memory_first'
  team_mode?: boolean
  monorepo?: boolean
  minimal?: boolean
}

export interface MemoryDoc {
  frontmatter: MemoryFrontmatter
  snapshot: Record<string, string>
  whereWeLeftOff: WhereWeLeftOff
  blockers: Blocker[]
  keyDecisions: Decision[]
  keyFiles: KeyFile[]
  activeWork: ActiveItem[]
  recentSessions: SessionRow[]
  staleItems?: ActiveItem[]
  rawSections: Record<string, string>
}

export interface WhereWeLeftOff {
  file?: string
  fn?: string
  line?: number
  status?: string
  next?: string
  openQuestion?: string
}

export interface Blocker {
  status: 'open' | 'resolved'
  description: string
  owner: string
  since: string
}

export interface Decision {
  date: string
  decision: string
  why: string
  scope: string
}

export interface KeyFile {
  file: string
  purpose: string
  state: 'active' | 'stable' | 'wip' | 'archived'
}

export interface ActiveItem {
  item: string
  owner?: string
  status: 'in_progress' | 'todo' | 'blocked' | 'done' | 'stale'
  lastSession: string
}

export interface SessionRow {
  session: string
  date: string
  summary: string
}

export interface ContinuationDoc {
  project_id: string
  branch: string
  updated_at: string
  expires_on_load: boolean
  resumePoint: {
    file: string
    fn: string
    line: number
  }
  currentState: string[]
  immediateNextAction: string[]
  ifDrifted: string[]
}

export interface BranchOverlay {
  branch: string
  updated_at: string
  sections: Record<string, string>
}

export interface LoadedSession {
  mode: 'continuation' | 'full'
  continuation?: ContinuationDoc
  tier1?: Pick<MemoryDoc, 'snapshot' | 'whereWeLeftOff' | 'blockers'>
  overlay?: BranchOverlay | null
  drift?: DriftReport
  tokenCost: number
}

export interface DriftReport {
  branchChanged: boolean
  renamedFiles: Array<{ was: string; now: string }>
  deletedFiles: string[]
  manifestChanged: boolean
  staleActiveItems: string[]
  resolvedBlockers: string[]
  hasDrift: boolean
}

export interface CompactionResult {
  doc: MemoryDoc
  archived: SessionRow[]
  removedBlockers: Blocker[]
  collapsedItems: ActiveItem[]
  estimatedTokensBefore: number
  estimatedTokensAfter: number
}

export interface SessionNotes {
  summary: string
  changedFiles: string[]
  decisions: Decision[]
  blockersResolved: string[]
  activeUpdates: ActiveItem[]
  nextAction?: WhereWeLeftOff
  hasUnfinishedWork: boolean
  branchSpecific?: boolean
}

export interface WrapUpResult {
  memoryPath: string
  continuationWritten: boolean
  overlayWritten: boolean
  archivedRows: number
  tokenCostBefore: number
  tokenCostAfter: number
}

export interface Observation {
  id?: number
  session: string
  date: string
  kind: 'decision' | 'blocker' | 'file' | 'task' | 'note' | 'tool' | 'prompt'
  content: string
  tags: string[]
  private: boolean
}

export interface SearchResult {
  id: number
  session: string
  date: string
  kind: Observation['kind']
  snippet: string
  tags: string[]
}

export interface FileCheckResult {
  file: string
  exists: boolean
  suggestions: string[]
}

export interface Commit {
  hash: string
  date: string
  message: string
}

export class MemoryParseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'MemoryParseError'
  }
}

export class ContinuationParseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'ContinuationParseError'
  }
}

export class MemoryWriteError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'MemoryWriteError'
  }
}

export interface DriftInput {
  memoryBranch: string
  currentBranch: string
  keyFiles: KeyFile[]
  changedFiles: string[]
  manifestChanged: boolean
  activeWork: ActiveItem[]
  blockers: Blocker[]
  projectRoot: string
  sessionCount?: number
}
