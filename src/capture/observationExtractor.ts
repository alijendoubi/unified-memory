import type { Observation } from '../types.js'

const DECISION_RE = /\b(decided|decision|chose|choosing|will use|going with)\b/i
const BLOCKER_RE = /\b(blocked|blocker|stuck|cannot|can't|issue|bug|error|failing)\b/i

export function extractFromText(
  text: string,
  session: string
): Observation[] {
  const date = new Date().toISOString().slice(0, 10)
  const observations: Observation[] = []

  // detect decisions
  if (DECISION_RE.test(text)) {
    observations.push({
      session,
      date,
      kind: 'decision',
      content: text.slice(0, 200),
      tags: ['auto-extracted', 'decision'],
      private: false,
    })
  }

  // detect blockers
  if (BLOCKER_RE.test(text)) {
    observations.push({
      session,
      date,
      kind: 'blocker',
      content: text.slice(0, 200),
      tags: ['auto-extracted', 'blocker'],
      private: false,
    })
  }

  return observations
}
