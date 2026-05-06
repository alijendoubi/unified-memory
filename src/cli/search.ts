import { openIndex, initSchema } from '../index/sqlite.js'
import { search } from '../index/search.js'
import { getById } from '../index/search.js'

export function runSearch(projectRoot: string, query: string, full: boolean): void {
  const db = openIndex(projectRoot)
  initSchema(db)

  const results = search(db, query)

  if (results.length === 0) {
    console.log('No results found.')
    db.close()
    return
  }

  if (full) {
    const ids = results.map((r) => r.id)
    const observations = getById(db, ids)
    for (const obs of observations) {
      console.log(`[${obs.id}] ${obs.date} | ${obs.kind} | ${obs.tags.join(', ')}`)
      console.log(obs.content)
      console.log()
    }
  } else {
    for (const result of results) {
      console.log(`[${result.id}] ${result.date} | ${result.kind} | ${result.tags.join(', ')}`)
      console.log(`  ${result.snippet}`)
    }
  }

  db.close()
}
