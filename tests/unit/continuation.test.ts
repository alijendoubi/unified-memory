import { describe, it, expect, vi } from 'vitest'
import { parseContinuation } from '../../src/memory/parseContinuation.js'
import { renderContinuation } from '../../src/memory/renderContinuation.js'
import { ContinuationParseError } from '../../src/types.js'

const SAMPLE: import('../../src/types.js').ContinuationDoc = {
  project_id: 'test-proj',
  branch: 'main',
  updated_at: '2024-01-15',
  expires_on_load: true,
  resumePoint: { file: 'src/cli/index.ts', fn: 'main', line: 42 },
  currentState: ['Implementing CLI commands', 'Tests passing'],
  immediateNextAction: ['Add error handling', 'Write README'],
  ifDrifted: ['Re-read MEMORY.md', 'Run umem doctor'],
}

describe('parseContinuation / renderContinuation', () => {
  it('renders and re-parses correctly', () => {
    const rendered = renderContinuation(SAMPLE)
    const parsed = parseContinuation(rendered)

    expect(parsed.project_id).toBe(SAMPLE.project_id)
    expect(parsed.branch).toBe(SAMPLE.branch)
    expect(parsed.resumePoint.file).toBe(SAMPLE.resumePoint.file)
    expect(parsed.resumePoint.line).toBe(SAMPLE.resumePoint.line)
    expect(parsed.currentState).toEqual(SAMPLE.currentState)
    expect(parsed.immediateNextAction).toEqual(SAMPLE.immediateNextAction)
    expect(parsed.ifDrifted).toEqual(SAMPLE.ifDrifted)
  })

  it('throws ContinuationParseError on invalid frontmatter', () => {
    expect(() => parseContinuation('---\ninvalid: yaml: :\n---\n')).toThrow()
  })

  it('warns when continuation exceeds 220 tokens', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    const large = renderContinuation({
      ...SAMPLE,
      currentState: Array(50).fill('A very long state item that adds many tokens to the document'),
    })
    parseContinuation(large)

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('token warning')
    )
    spy.mockRestore()
  })
})
