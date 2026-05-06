---
memory_version: 1
project_id: "team-proj-xyz789"
project_name: "Team Project"
branch: "feature/auth"
updated_at: "2024-01-15"
last_session: 10
health: 1
git_head: "deadbeef1234"
resume_priority: continuation_first
team_mode: true
---

# Project Memory

## Snapshot
| Field | Value |
|---|---|
| Project | Team Project |
| Stack | React + Node.js + PostgreSQL |
| Goal | SaaS platform |
| Status | active development |
| Next immediate step | Deploy to staging |

## Where We Left Off
- File: src/auth/middleware.ts
- Function: authenticate
- Line: 88
- Status: review pending
- Next: address PR comments
- Open question: JWT vs session cookies?

## Blockers
| Status | Blocker | Owner | Since |
|---|---|---|---|
| open | DB migration failing in CI | bob | 2024-01-13 |
| resolved | Missing env vars in staging | alice | 2024-01-12 |

## Key Decisions
| Date | Decision | Why | Scope |
|---|---|---|---|
| 2024-01-05 | Use PostgreSQL | Team familiarity | database |
| 2024-01-08 | JWT auth | Stateless scaling | auth |

## Key Files
| File | Purpose | State |
|---|---|---|
| src/auth/middleware.ts | Auth middleware | wip |
| src/db/migrations/ | Database migrations | active |
| src/api/routes.ts | API routes | stable |

## Active Work
| Item | Status | Last touched |
|---|---|---|
| Auth PR review | in_progress | 2024-01-15 |
| Fix CI migration | blocked | 2024-01-14 |
| Deploy to staging | todo | 2024-01-13 |

## Recent Sessions
| Session | Date | Summary |
|---|---|---|
| 20240113-1400 | 2024-01-13 | Wrote auth middleware |
| 20240114-1000 | 2024-01-14 | Hit CI failures |
| 20240115-0900 | 2024-01-15 | PR review feedback |
