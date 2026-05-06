# unified-memory

Persistent memory across Claude and Claude Code sessions.

Two planes of persistence:

1. **Canonical Markdown memory** — `MEMORY.md`, `.memory/CONTINUATION.md`, branch overlays, and a global file. Human-readable, git-trackable, always wins in conflicts.
2. **Searchable observation index** — SQLite + FTS5 for progressive-disclosure search across session history. Supporting evidence only.

---

## Why two planes?

| Need | Canonical memory | SQLite index |
|---|---|---|
| Fast session warm-up | ✓ Tier 1 load (Snapshot + Where We Left Off + Blockers) | |
| Handoff across sessions | ✓ CONTINUATION.md | |
| Git-trackable decisions | ✓ MEMORY.md | |
| Full-text search history | | ✓ FTS5 |
| Auto-capture tool events | | ✓ events.jsonl |
| Recovery from corruption | ✓ git log + ARCHIVE | ✓ observations |

If they disagree, **MEMORY.md wins** for current state.

---

## Install

```bash
npm install -g unified-memory
```

Or run from source:

```bash
git clone <repo>
cd unified-memory
npm install
npm run build
npm link
```

---

## Quick Start

```bash
# in your project root
umem install

# or with options (non-interactive)
umem install --name "My App" --stack "TypeScript + Node.js" --goal "Build a REST API"

# with Claude Code hooks (auto-capture)
umem install --hooks
```

Then start Claude Code and say: **"pick up where we left off"**

---

## Claude Code Hooks Setup

When `--hooks` is passed, unified-memory registers five Claude Code hooks in `.claude/settings.json`:

| Hook | What it does |
|---|---|
| `SessionStart` | Loads continuation fast-path or Tier 1 memory |
| `UserPromptSubmit` | Captures compact prompt metadata |
| `PostToolUse` | Captures tool name + file + operation |
| `Stop` | Writes current-session summary |
| `SessionEnd` | Finalizes event log |

Hooks never store full terminal dumps, raw prompts, or secrets.

---

## Commands

### `umem install [options]`

Initialize memory for this project.

```bash
umem install
umem install --name "My App" --stack TypeScript --goal "Build CLI"
umem install --hooks          # also configure Claude Code hooks
umem install --force          # overwrite existing MEMORY.md
```

Creates:
- `MEMORY.md` — canonical project memory
- `.memory/` — branches, index, sessions, recovery
- Appends memory block to `CLAUDE.md`
- Updates `.gitignore`

### `umem doctor`

Check memory health.

```bash
umem doctor
```

Checks:
- MEMORY.md exists and has valid frontmatter
- All protected sections present
- Key files exist on disk (with rename suggestions)
- Branch matches or overlay exists
- Tier 1 token cost under 450
- SQLite index opens cleanly
- Hooks installed (informational)

### `umem compact`

Compact MEMORY.md to reduce token cost.

```bash
umem compact
```

Three compaction phases triggered by token thresholds:
- **Safe** (>900): remove resolved blockers, done items, archived files
- **Controlled** (>1100): keep last 3 sessions, archive older rows, mark stale items
- **Aggressive** (>1500): collapse completed work into milestone, remove empty sections

### `umem recover`

Recover MEMORY.md from git history and observations.

```bash
umem recover
```

1. Backs up current MEMORY.md to `.memory/recovery/rebuild-log-<timestamp>.md`
2. Parses existing doc best-effort
3. Reconstructs from git log + SQLite observations
4. Writes recovered doc with `[RECOVERED YYYY-MM-DD]` note

### `umem search <query>`

Search observation index.

```bash
umem search "stripe decision"
umem search "auth middleware" --full   # show full content for results
```

Returns IDs + snippets only. Use `--full` to fetch selected observation content.

### `umem hook <event>`

Run a Claude Code hook handler (used by hook scripts).

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
MEMORY.md                          # canonical memory — always edit this directly
CLAUDE.md                          # has memory block appended by umem install
.memory/
  CONTINUATION.md                  # short resume note (under 220 tokens)
  MEMORY-ARCHIVE.md                # older session rows
  branches/
    feature-auth.md                # branch-specific overlay
  index/
    memory.sqlite                  # observation index (gitignored)
  sessions/
    events.jsonl                   # event log (gitignored)
    current-session.json           # latest session summary
  recovery/
    rebuild-log-<timestamp>.md     # backups before recover
~/.unified-memory/
  GLOBAL-MEMORY.md                 # cross-project preferences
```

---

## Memory Lifecycle

### Session Start

1. If `.memory/CONTINUATION.md` exists → fast-path, load it only
2. Otherwise, parse `MEMORY.md` and extract Tier 1 (Snapshot + Where We Left Off + Blockers)
3. If on a different branch, load branch overlay
4. Run drift detection (branch change, renamed/deleted key files, manifest changes)

### During Session

- Store decisions, blockers, key files, active work in MEMORY.md
- Never store code blocks, secrets, or private content
- Use `<private>...</private>` tags — these are stripped before any persistence

### Session End

When you say **"wrap up"**, **"save state"**, or **"done for now"**:

1. Remove resolved blockers
2. Update active work items
3. Append session summary row
4. Update Where We Left Off
5. Write CONTINUATION.md if unfinished work remains
6. Run compaction if over token thresholds
7. Write branch overlay if branch-specific work

---

## Private Tags

Content inside `<private>...</private>` is **never persisted**:

```
<private>
My API key is sk-ant-xxx...
This note should not be stored in memory.
</private>
```

If the entire prompt is private content, nothing is captured.

---

## Secret Redaction

All content is redacted before persistence:

- Long API-key-like strings (40+ alphanumeric chars)
- Env assignments: `SECRET=`, `TOKEN=`, `KEY=`, `PASS=`, `PWD=`, `API=`
- JSON fields with secret names
- URLs with passwords (`postgres://user:pass@host`)
- PEM private key blocks

---

## Branch Overlays

When you switch branches, unified-memory loads `.memory/branches/<slug>.md` as an overlay:

- Overlay section present + base section present → **overlay wins**
- Overlay section present + no base section → **appended**
- Base section present + no overlay section → **preserved**

Overlays let you track branch-specific progress without polluting the main MEMORY.md.

---

## Recovery Mode

If MEMORY.md gets corrupted or stale after a long absence:

```bash
umem recover
```

Recovery sources (in order):
1. Existing MEMORY.md (best-effort parse)
2. `git log` since last known HEAD
3. SQLite observation index
4. File existence checks for key files

The recovered doc includes a Recovery Log section with recent commits and observations.

---

## Search Mode

Progressive disclosure search:

1. **`umem search <query>`** — returns IDs + snippets only
2. **`umem search <query> --full`** — fetch full content for matching observations

Never fetch all history blindly. Search first, then expand selected IDs.

---

## Limitations

- SQLite index is local and not shared between machines (gitignored by design)
- MEMORY.md should stay under ~1500 tokens for fast warm-up; run `umem compact` when it grows
- Branch overlay merge is section-level, not line-level
- Recovery from completely absent git history returns a minimal doc
- Hooks require Claude Code CLI with hook support enabled

---

## Clean-Room Note

This is a clean-room implementation. No code was copied from memory-bank or claude-mem. The concepts (3-tier loading, hook-driven capture, FTS search, branch overlays, progressive disclosure) were reimplemented independently in TypeScript with strict mode.

---

## Architecture

```
src/
  types.ts              # all shared types and typed errors
  cli/                  # commander CLI (install, doctor, compact, recover, search, hook)
  memory/               # MEMORY.md + CONTINUATION.md parse/render (no markdown parser dep)
  loader/               # session loader, tier extraction, branch overlay merge
  synthesis/            # wrap-up, compaction, archiving, promotion engine
  drift/                # git diff, file validation, manifest change detection
  index/                # SQLite schema, FTS insertion, progressive search
  capture/              # event normalization, private tag filtering, observation extraction
  util/                 # atomic writes, token estimation, secret redaction, slugify
```

---

## License

MIT
