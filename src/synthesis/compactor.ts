import type { MemoryDoc, CompactionResult, SessionRow, ActiveItem } from '../types.js'
import { estimateTokens } from '../util/tokens.js'
import { renderMemory } from '../memory/renderMemory.js'

const THRESHOLD_SAFE = 900
const THRESHOLD_CONTROLLED = 1100
const THRESHOLD_AGGRESSIVE = 1500

const SESSION_KEEP = 3
const STALE_AGE = 3

export function compact(doc: MemoryDoc): CompactionResult {
  const before = estimateTokens(renderMemory(doc))

  const removedBlockers = doc.blockers.filter((b) => b.status === 'resolved')
  const archived: SessionRow[] = []
  const collapsedItems: ActiveItem[] = []

  let result = { ...doc }

  if (before > THRESHOLD_SAFE) {
    result = phaseSafe(result, removedBlockers)
  }

  if (before > THRESHOLD_CONTROLLED) {
    const { doc: next, archived: arch } = phaseControlled(result)
    result = next
    archived.push(...arch)
  }

  if (before > THRESHOLD_AGGRESSIVE) {
    const { doc: next, collapsed } = phaseAggressive(result)
    result = next
    collapsedItems.push(...collapsed)
  }

  const after = estimateTokens(renderMemory(result))

  return {
    doc: result,
    archived,
    removedBlockers,
    collapsedItems,
    estimatedTokensBefore: before,
    estimatedTokensAfter: after,
  }
}

function phaseSafe(doc: MemoryDoc, removedBlockers: typeof doc.blockers): MemoryDoc {
  const cutoffSessions = doc.recentSessions.slice(-STALE_AGE).map((s) => s.session)
  return {
    ...doc,
    // remove resolved blockers
    blockers: doc.blockers.filter((b) => b.status !== 'resolved'),
    // remove done active items not touched recently
    activeWork: doc.activeWork.filter((a) => {
      if (a.status !== 'done') return true
      return cutoffSessions.includes(a.lastSession)
    }),
    // remove archived key files
    keyFiles: doc.keyFiles.filter((f) => f.state !== 'archived'),
    // trim whitespace in raw sections
    rawSections: Object.fromEntries(
      Object.entries(doc.rawSections).map(([k, v]) => [k, v.trim()])
    ),
  }
}

function phaseControlled(doc: MemoryDoc): { doc: MemoryDoc; archived: SessionRow[] } {
  const keep = doc.recentSessions.slice(-SESSION_KEEP)
  const archived = doc.recentSessions.slice(0, -SESSION_KEEP)

  const threeSessionsAgo = keep[0]?.session
  const staleActive = doc.activeWork.map((a) => {
    if (a.status === 'done' || a.status === 'stale') return a
    if (threeSessionsAgo && a.lastSession && a.lastSession < threeSessionsAgo) {
      return { ...a, status: 'stale' as const }
    }
    return a
  })

  return {
    doc: { ...doc, recentSessions: keep, activeWork: staleActive },
    archived,
  }
}

function phaseAggressive(doc: MemoryDoc): { doc: MemoryDoc; collapsed: ActiveItem[] } {
  // collapse completed + stale active work into a single milestone row
  const doneOrStale = doc.activeWork.filter(
    (a) => a.status === 'done' || a.status === 'stale'
  )
  const active = doc.activeWork.filter(
    (a) => a.status !== 'done' && a.status !== 'stale'
  )

  const milestoneItems: ActiveItem[] = doneOrStale.length > 0
    ? [
        {
          item: `[${doneOrStale.length} completed/stale items archived]`,
          status: 'done',
          lastSession: new Date().toISOString().slice(0, 10),
        },
      ]
    : []

  // remove empty raw sections
  const rawSections = Object.fromEntries(
    Object.entries(doc.rawSections).filter(([, v]) => v.trim().length > 0)
  )

  return {
    doc: { ...doc, activeWork: [...active, ...milestoneItems], rawSections },
    collapsed: doneOrStale,
  }
}
