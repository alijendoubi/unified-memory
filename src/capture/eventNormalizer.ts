import type { Observation } from '../types.js'

export interface RawEvent {
  type: string
  [key: string]: unknown
}

export function normalizeEvent(raw: RawEvent, session: string): Observation | null {
  const date = new Date().toISOString().slice(0, 10)

  switch (raw.type) {
    case 'user_prompt': {
      const prompt = (raw.prompt as string | undefined) ?? ''
      return {
        session,
        date,
        kind: 'prompt',
        content: prompt.slice(0, 200), // store compact metadata only
        tags: ['prompt'],
        private: false,
      }
    }
    case 'tool_use': {
      const tool = (raw.tool as string | undefined) ?? 'unknown'
      const file = (raw.file as string | undefined) ?? ''
      const op = (raw.operation as string | undefined) ?? ''
      const content = [tool, file, op].filter(Boolean).join(' | ')
      return {
        session,
        date,
        kind: 'tool',
        content: content.slice(0, 200),
        tags: ['tool', tool],
        private: false,
      }
    }
    case 'session_summary': {
      return {
        session,
        date,
        kind: 'note',
        content: ((raw.summary as string | undefined) ?? '').slice(0, 300),
        tags: ['session-summary'],
        private: false,
      }
    }
    default:
      return null
  }
}
