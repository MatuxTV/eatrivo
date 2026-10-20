# eatrivo — Agent Instructions

Shared project context for AI coding agents (Claude Code, OpenCode). `CLAUDE.md` imports this file, so keep project-wide guidance here.

## Stack

- **Framework**: Next.js (App Router, Turbopack) — installable **PWA** (`next-pwa`)
- **AI**: LangChain + LangGraph with `@langchain/google-genai` (Google Gemini)
- **DB**: Drizzle ORM on Neon (serverless Postgres)
- **Auth**: NextAuth (`@auth/drizzle-adapter`)
- **i18n**: `next-intl` (locales in `locales/`)
- **Payments**: Stripe
- **Infra**: Upstash (Redis + ratelimit), AWS S3, Resend/Nodemailer email, PostHog analytics

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Push schema | `npm run db:push` |
| DB studio | `npm run db:studio` |
| Import recipes | `npm run db:import:recipes` |

## Conventions

- Server-only code must import `server-only`.
- Validate external input with `zod`.
- UI uses Radix primitives + Tailwind (`tailwind-merge`, `class-variance-authority`); icons from `lucide-react`.
- App-facing user copy is multilingual — route through `next-intl`, do not hardcode strings.

## Skills

Reusable, model-invoked skills live in `.claude/skills/` (Claude Code) and `.opencode/skills/` (OpenCode). Keep both copies in sync when editing a skill.

| Skill | Use it for |
|-------|-----------|
| `frontend-design` | UI/UX, component design, visual polish |
| `langgraph-architect` | LangGraph graph/state/agent design |
| `legal-compliance-sk` | GDPR / cookies / VOP / subscription legal (SK) |
| `nextjs-security-audit` | Next.js security review & vuln scanning |
| `pwa-optimizer` | Service workers, manifest, offline, Lighthouse |

A skill's `name:` (in its `SKILL.md`) must match its folder name.

## Agents & commands

- **Claude Code**: subagents in `.claude/agents/*.md`, slash commands in `.claude/commands/*.md`.
  - Existing: `task-planner` subagent + `/plan` command (write implementation plans into `.planning/`).
- **OpenCode**: agents in `.opencode/agents/*.md` (`mode: primary | subagent`), commands in `.opencode/commands/*.md`, config in `opencode.json`.
  - The OpenCode `agents/` and `commands/` folders are scaffolded but empty — add definitions as needed.
