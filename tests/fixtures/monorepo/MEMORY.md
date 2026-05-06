---
memory_version: 1
project_id: "mono-proj-mn0987"
project_name: "Monorepo Project"
branch: "main"
updated_at: "2024-01-15"
last_session: 5
health: 1
git_head: "cafebabe5678"
resume_priority: continuation_first
monorepo: true
---

# Project Memory

## Snapshot
| Field | Value |
|---|---|
| Project | Monorepo Project |
| Stack | TypeScript + pnpm workspaces |
| Goal | Shared component library + 3 apps |
| Status | in progress |
| Next immediate step | Publish @shared/ui to registry |

## Where We Left Off
- File: packages/ui/src/Button.tsx
- Function: Button
- Line: 15
- Status: working
- Next: add storybook stories
- Open question: use Rollup or tsup for bundling?

## Blockers
| Status | Blocker | Owner | Since |
|---|---|---|---|

## Key Decisions
| Date | Decision | Why | Scope |
|---|---|---|---|
| 2024-01-10 | Use pnpm workspaces | Disk efficiency | monorepo |
| 2024-01-12 | Shared eslint config | Consistency | tooling |

## Key Files
| File | Purpose | State |
|---|---|---|
| packages/ui/src/index.ts | UI package entry | active |
| packages/shared/src/index.ts | Shared utilities | stable |
| pnpm-lock.yaml | Lock file | stable |

## Active Work
| Item | Status | Last touched |
|---|---|---|
| Button component | in_progress | 2024-01-15 |
| Storybook setup | todo | 2024-01-14 |

## Recent Sessions
| Session | Date | Summary |
|---|---|---|
| 20240113-0900 | 2024-01-13 | Set up monorepo structure |
| 20240114-1100 | 2024-01-14 | Created shared package |
| 20240115-1000 | 2024-01-15 | Started UI components |
