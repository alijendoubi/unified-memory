import { describe, it, expect } from 'vitest'
import { parseTable, renderTable } from '../../src/memory/markdownTable.js'

describe('markdownTable', () => {
  it('parses a simple table', () => {
    const input = `| Field | Value |
|---|---|
| Project | My App |
| Stack | TypeScript |`

    const rows = parseTable(input)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ Field: 'Project', Value: 'My App' })
    expect(rows[1]).toEqual({ Field: 'Stack', Value: 'TypeScript' })
  })

  it('renders an aligned table', () => {
    const headers = ['Field', 'Value']
    const rows = [
      { Field: 'Project', Value: 'My App' },
      { Field: 'Stack', Value: 'TypeScript + Node.js' },
    ]
    const rendered = renderTable(headers, rows)
    const lines = rendered.split('\n')
    expect(lines[0]).toContain('Field')
    expect(lines[0]).toContain('Value')
    expect(lines[1]).toMatch(/^\|[-]+/)
    expect(lines[2]).toContain('Project')
    expect(lines[3]).toContain('TypeScript + Node.js')
  })

  it('returns empty array for empty input', () => {
    expect(parseTable('')).toHaveLength(0)
    expect(parseTable('| Only header |')).toHaveLength(0)
  })

  it('round-trips parse and render', () => {
    const headers = ['Date', 'Decision', 'Why', 'Scope']
    const rows = [
      { Date: '2024-01-01', Decision: 'Use TypeScript', Why: 'Type safety', Scope: 'project' },
    ]
    const rendered = renderTable(headers, rows)
    const parsed = parseTable(rendered)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]['Date']).toBe('2024-01-01')
    expect(parsed[0]['Decision']).toBe('Use TypeScript')
  })
})
