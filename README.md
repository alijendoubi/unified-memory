<div align="center">

# unified-memory

**Persistent, searchable memory across every Claude and Claude Code session.**

Give Claude a brain that survives context resets — decisions, blockers, active work, and where you left off, always available when you need them.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/badge/npm-unified--memory-red)](https://www.npmjs.com/package/unified-memory)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-green)](https://github.com/alijendoubi/unified-memory)

[Install](#install) · [Quick Start](#quick-start) · [Day-to-Day Usage](#day-to-day-usage) · [Implementation Guide](#implementation-guide) · [Commands](#commands) · [Architecture](#architecture)

</div>

---

## The Problem

Claude Code is powerful, but it forgets everything the moment a session ends. Start a new conversation and you're back to square one — re-explaining the stack, re-describing the blockers, re-establishing context. On long projects this becomes the biggest drag on productivity.

**unified-memory solves this.** It gives Claude a persistent, structured memory that loads automatically at the start of every session, survives context resets, and gets smarter the longer you use it.

---

## How It Works

Two planes of persistence work together:

**1. Canonical Memory (Markdown files)**
The source of truth. Human-readable, git-trackable, editable by hand.

```
MEMORY.md                  ← project state, decisions, blockers, active work
.memory/CONTINUATION.md    ← "resume note" for unfinished sessions (< 220 tokens)
.memory/branches/*.md      ← branch-specific overlays
~/.unified-memory/GLOBAL-MEMORY.md  ← cross-project preferences
```

**2. Observation Index (SQLite)**
A local full-text search index that captures what happened across sessions.
Supporting evidence only — canonical memory always wins in conflicts.

```
.memory/index/memory.sqlite    ← FTS5 search index (gitignored)
.memory/sessions/events.jsonl  ← event log (gitignored)
```

On session start, Claude loads context in under 450 tokens. On session end, you say *"wrap up"* and Claude writes everything back — clean, structured, searchable.

---

## Install

```bash
npm install -g unified-memory
```

Or from source:

```bash
git clone https://github.com/alijendoubi/unified-memory
cd unified-memory
npm install && npm run build && npm link
```

---

## Quick Start

**1. Initialize memory for your project**

```bash
cd my-project
umem install --hooks
```

This creates `MEMORY.md`, sets up `.memory/`, appends a memory block to `CLAUDE.md`, and wires up five Claude Code hooks for automatic capture.

**2. Open Claude Code and say:**

```
"pick up where we left off"
```

Claude reads `MEMORY.md`, loads your current task, open blockers, and where you stopped last session — in seconds.

**3. Work normally. At the end of a session, say:**

```
"wrap up and save state"
```

Claude updates `MEMORY.md` with decisions made, work completed, and a `CONTINUATION.md` note so the next session resumes instantly.

---

## Day-to-Day Usage

### Starting a session

Just open Claude Code in your project. If hooks are installed, context loads automatically. Otherwise say:

```
"pick up where we left off"
"what were we working on?"
"what's the current status?"
```

Claude will read `MEMORY.md` and `CONTINUATION.md` and orient itself.

### During a session

Work as normal. When you make an important decision, tell Claude:

```
"remember we decided to use Prisma over raw SQL because of type safety"
"add this as a blocker: CI is failing on the migration step"
"mark the auth middleware task as done"
```

Claude updates memory in real time. You can also use `<private>` tags for anything that should never be stored:

```
<private>
My API key for testing is: [...]
</private>
```

Everything inside `<private>...</private>` is stripped before any write — never stored, never indexed.

### Ending a session

```
"wrap up"
"save state, I'm done for today"
"save progress and write a continuation note"
```

Claude will:
- Remove resolved blockers
- Update active work items
- Append a session summary row
- Write `.memory/CONTINUATION.md` if there's unfinished work
- Run compaction if `MEMORY.md` is getting large

### Switching branches

Branch overlays let you track branch-specific progress without touching `MEMORY.md`:

```
"we're switching to feature/payments — save branch-specific context"
```

Claude writes `.memory/branches/feature-payments.md`. Next time you're on that branch, the overlay merges automatically.

### Searching history

```bash
umem search "stripe integration"
umem search "why did we choose postgres" --full
```

Or ask Claude directly:

```
"search memory for our auth decisions"
"what did we decide about the database schema?"
```

### Health check

```bash
umem doctor
```

Tells you if anything is out of sync: missing files, stale branches, token cost warnings, index health.

---

## Implementation Guide

### Option A: Fully automatic (recommended)

Install with hooks — Claude captures context automatically on every session.

```bash
umem install --hooks
```

What happens:
- `SessionStart` hook loads context before your first message
- `PostToolUse` hook captures tool events (file edits, commands run)
- `Stop` hook summarizes the session
- You only need to say "wrap up" to persist everything to `MEMORY.md`

### Option B: Semi-automatic

Install without hooks, tell Claude manually when to load and save.

```bash
umem install
```

Start each session with: *"pick up where we left off"*
End each session with: *"wrap up and save state"*

### Option C: Add to an existing project

If you already have a `CLAUDE.md`, unified-memory appends to it without overwriting:

```bash
umem install --name "My App" --stack "Next.js + PostgreSQL" --goal "SaaS billing platform"
```

### Integrating into your CLAUDE.md manually

Add this block to your `CLAUDE.md` to instruct Claude directly:

```markdown
## Memory

This project uses unified-memory for persistent context.

On session start:
- Read MEMORY.md (Snapshot, Where We Left Off, Blockers)
- Read .memory/CONTINUATION.md if it exists (resume immediately)

On session end when asked to "wrap up":
- Update MEMORY.md: resolved blockers, active work, session summary, where we left off
- Write .memory/CONTINUATION.md if work is unfinished
- Never store secrets, passwords, tokens, or API keys
- Strip <private>...</private> blocks before any write
```

### Using with Claude.ai (no CLI)

You don't need the CLI for the core workflow. Copy the contents of `templates/MEMORY.md` into your project, fill in the fields, and include it in your Claude.ai conversation as a file attachment at the start of each session.

Say: *"Read this MEMORY.md and pick up where we left off."*

At session end: *"Update the MEMORY.md with what we did today and output the full updated file."*

### Team setup

For teams, commit `MEMORY.md` to the repo. Each developer's `.memory/index/` and `.memory/sessions/` are gitignored (local only). Decisions and architecture captured in `MEMORY.md` are shared; personal session history is private.

Add to your `.gitignore`:

```
.memory/index/
.memory/sessions/
```

Both are added automatically by `umem install`.

---

## Commands

### `umem install [options]`

Initialize memory for a project.

```bash
umem install                            # interactive prompts
umem install --name "App" --stack "..." --goal "..."   # non-interactive
umem install --hooks                    # configure Claude Code hooks
umem install --force                    # overwrite existing MEMORY.md
```

Creates `MEMORY.md`, `.memory/`, `CLAUDE.md` block, `.gitignore` entries, and optionally `.claude/settings.json` hooks.

### `umem doctor`

Audit memory health.

```bash
umem doctor
```

Checks: MEMORY.md exists and parses, all protected sections present, key files on disk, branch alignment, Tier 1 token cost ≤ 450, SQLite healthy, hooks installed.

### `umem compact`

Reduce token cost with three-phase compaction.

```bash
umem compact
```

| Phase | Threshold | What it removes |
|---|---|---|
| Safe | > 900 tokens | resolved blockers, done items, archived files |
| Controlled | > 1100 tokens | old sessions → archive, mark stale items |
| Aggressive | > 1500 tokens | collapse completed work into milestone row |

### `umem recover`

Rebuild `MEMORY.md` from git history and observations after corruption or long absence.

```bash
umem recover
```

Backs up the current file first, then reconstructs from git log, file checks, and the SQLite index.

### `umem search <query>`

Full-text search across session observations.

```bash
umem search "postgres decision"
umem search "auth flow" --full    # fetch full content for matches
```

Progressive disclosure: search returns IDs + snippets. `--full` fetches selected records.

### `umem hook <event>`

Used internally by Claude Code hooks.

```bash
umem hook session-start
umem hook user-prompt-submit
umem hook post-tool-use
umem hook stop
umem hook session-end
```

---

## File Layout

```
your-project/
├── MEMORY.md                        ← edit this; canonical source of truth
├── CLAUDE.md                        ← memory block appended by install
└── .memory/
    ├── CONTINUATION.md              ← resume note, < 220 tokens
    ├── MEMORY-ARCHIVE.md            ← archived session rows
    ├── branches/
    │   └── feature-auth.md          ← branch overlay
    ├── index/
    │   └── memory.sqlite            ← local FTS index (gitignored)
    ├── sessions/
    │   ├── events.jsonl             ← event log (gitignored)
    │   └── current-session.json
    └── recovery/
        └── rebuild-log-<ts>.md      ← backups before recover

~/.unified-memory/
└── GLOBAL-MEMORY.md                 ← cross-project preferences
```

---

## MEMORY.md Structure

`MEMORY.md` uses a fixed schema with seven protected sections:

```markdown
## Snapshot          ← project name, stack, goal, status, next step
## Where We Left Off ← exact file, function, line, status, next action
## Blockers          ← open/resolved blockers with owner and date
## Key Decisions     ← dated decisions with rationale and scope
## Key Files         ← important files with purpose and state
## Active Work       ← current tasks with status and last-touched session
## Recent Sessions   ← rolling log of session summaries (last 3 kept inline)
```

All sections survive compaction. Older session rows are moved to `MEMORY-ARCHIVE.md`, not deleted.

---

## Security

- All content is redacted before any write: API keys, tokens, passwords, PEM blocks, env assignments
- `<private>...</private>` blocks are stripped entirely — never stored, never indexed
- The SQLite index is gitignored by default — session history stays local
- `umem doctor` will warn if secrets appear in `MEMORY.md`

---

## Architecture

```
src/
  types.ts        all shared types and typed errors
  cli/            install · doctor · compact · recover · search · hook
  memory/         MEMORY.md + CONTINUATION.md parse/render (no markdown lib)
  loader/         session loader · tier extraction · branch overlay merge
  synthesis/      wrap-up · 3-phase compaction · archiving · promotion
  drift/          git diff · file validation · manifest change detection
  index/          SQLite schema · FTS5 insertion · progressive search
  capture/        event normalization · private tag filtering · extraction
  util/           atomic writes · token estimation · redaction · slugify
```

Built with: TypeScript (strict), better-sqlite3, commander, gray-matter, simple-git, zod. No markdown parsing library — tables are parsed with a custom implementation to avoid heavy dependencies.

---

## Contributing

This is open source software — contributions, bug reports, and ideas are welcome.

```bash
git clone https://github.com/alijendoubi/unified-memory
npm install
npm test       # 52 tests across unit + integration
npm run build
```

Please open an issue before submitting a large PR so we can align on approach.

---

## License

MIT — free for personal and commercial use. See [LICENSE](LICENSE).

---

<div align="center">

Built to solve a real problem: Claude is brilliant, but forgets everything.
This is the fix.

**[⭐ Star on GitHub](https://github.com/alijendoubi/unified-memory)**

</div>
