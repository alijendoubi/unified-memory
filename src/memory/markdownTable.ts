export interface TableRow {
  [key: string]: string
}

export function parseTable(text: string): TableRow[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = parseRow(lines[0])
  // skip separator line (index 1)
  const rows: TableRow[] = []

  for (let i = 2; i < lines.length; i++) {
    const cells = parseRow(lines[i])
    const row: TableRow = {}
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim()
    })
    rows.push(row)
  }

  return rows
}

function parseRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())
}

export function renderTable(headers: string[], rows: TableRow[]): string {
  if (headers.length === 0) return ''

  // compute column widths
  const widths = headers.map((h) => h.length)
  for (const row of rows) {
    headers.forEach((h, i) => {
      widths[i] = Math.max(widths[i], (row[h] ?? '').length)
    })
  }

  const pad = (s: string, w: number) => s.padEnd(w)
  const divider = '|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|'

  const headerLine = '| ' + headers.map((h, i) => pad(h, widths[i])).join(' | ') + ' |'
  const dataLines = rows.map(
    (row) => '| ' + headers.map((h, i) => pad(row[h] ?? '', widths[i])).join(' | ') + ' |'
  )

  return [headerLine, divider, ...dataLines].join('\n')
}
