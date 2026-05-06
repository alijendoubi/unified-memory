import type { SessionNotes, SessionRow } from '../types.js'

export function buildSessionRow(notes: SessionNotes, sessionId: string): SessionRow {
  return {
    session: sessionId,
    date: new Date().toISOString().slice(0, 10),
    summary: notes.summary.slice(0, 120),
  }
}

export function generateSessionId(): string {
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
