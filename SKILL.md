---
name: unified-memory
description: >
  Use when the user says "remember this", "don't forget", "pick up where we left off",
  "save progress", "wrap up", "save state", "continue later", "what were we doing",
  "rebuild memory", "compress memory", "switch branch", "hand off", "memory health",
  "search memory", "what did we decide", or when a session starts in a project containing
  MEMORY.md or .memory/CONTINUATION.md. This skill maintains persistent memory across
  sessions with a canonical Markdown memory layer and an optional searchable observation
  index.
tags:
  - memory
  - persistence
  - handoff
  - compression
  - branch-aware
version: 1.0.0
---

# Unified Memory

## Purpose

Maintain compact, persistent memory across Claude and Claude Code sessions.

Use two planes:

1. Canonical memory:
   - MEMORY.md
   - .memory/CONTINUATION.md
   - .memory/branches/*.md
   - ~/.unified-memory/GLOBAL-MEMORY.md

2. Searchable observation index:
   - .memory/index/memory.sqlite
   - .memory/sessions/events.jsonl

Canonical memory is authoritative.
The index is supporting evidence only.

## Session Start

1. If `.memory/CONTINUATION.md` exists, read it first.
2. Read Tier 1 fields from `MEMORY.md`:
   - Snapshot
   - Where We Left Off
   - Blockers
3. If the current git branch differs from memory frontmatter, load `.memory/branches/<slug>.md`.
4. Run quick drift detection:
   - branch changed?
   - key files renamed/deleted?
   - dependency manifests changed?
5. Start with:
   - current task
   - immediate next action
   - critical blockers
   - important drift only

Do not load deep history unless needed.

## During Session

- Save only durable facts.
- Prefer tables over prose.
- Prefer file:line references over copied code.
- Never store secrets.
- Never persist content inside `<private>...</private>`.

## Historical Recall

Use progressive disclosure:

1. Search index: IDs + snippets only.
2. Timeline: nearby context.
3. Full observations: selected IDs only.

Never fetch all history blindly.

## Session End

When user says "wrap up", "save", "done for now", or "save state":

1. Compare current work with `MEMORY.md`.
2. Remove resolved blockers.
3. Update active work.
4. Add recent session summary.
5. Update Where We Left Off.
6. Write `.memory/CONTINUATION.md` if unfinished work remains.
7. Update branch overlay if branch-specific.
8. Run compaction if token thresholds are exceeded.
9. Suggest global promotion only for cross-project preferences.

## Never

- Never store credentials, tokens, API keys, passwords, private keys, or secrets.
- Never store long code blocks.
- Never duplicate the same fact in multiple sections.
- Never auto-promote project decisions into global memory without confirmation.
