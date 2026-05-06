import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

export function openIndex(projectRoot: string): InstanceType<typeof Database> {
  const indexDir = path.join(projectRoot, '.memory', 'index')
  fs.mkdirSync(indexDir, { recursive: true })
  const dbPath = path.join(indexDir, 'memory.sqlite')
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  return db
}

export function initSchema(db: InstanceType<typeof Database>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS observations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session    TEXT NOT NULL,
      date       TEXT NOT NULL,
      kind       TEXT NOT NULL,
      content    TEXT NOT NULL,
      tags       TEXT,
      private    INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts
      USING fts5(content, tags, content=observations, content_rowid=id);

    CREATE TRIGGER IF NOT EXISTS obs_ai AFTER INSERT ON observations BEGIN
      INSERT INTO observations_fts(rowid, content, tags)
      VALUES (new.id, new.content, new.tags);
    END;
  `)
}
