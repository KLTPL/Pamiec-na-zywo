# AGENTS.md

Instructions for AI agents (Claude Code, Codex, Cursor, etc.) working in this repo.
`CLAUDE.md` only imports this file — edit here.

## Context

A project for the **BEST Hacks 2026** hackathon (10–11.10.2026, 24 h, team of 4),
theme "Code For Culture", **History** category.

**Pamięć na żywo** ("Living Memory") — a senior (e.g. a person with dementia) talks about their
past, and a live screen shows archival photos of the places and things they mention. The caregiver
gets suggested questions, and the senior's statements are pinned to the photos as descriptions for
the archive.
Demo: **Wrocław, mainly the Old Town, 1945–1980** (range in `ARCHIVE_ERA` in `@repo/shared`).

The app runs **locally** — there is no deployment; do not add CI/CD or hosting configuration.

### What follows from the rules (`Regulamin.pdf`)

- The whole project must be created during the hackathon and be the team's own work — do not copy
  other people's solutions; open-source libraries are fine.
- Changes to the project after the deadline = disqualification. Do not commit or push after the deadline.
- The solution goes to a public repository — **no secrets in the repo** (`.env` is in `.gitignore`).
- No offensive, political, religious or vulgar content (this also covers photos in the dataset,
  UI texts and prompts). In the photo set we skip marches, propaganda and churches — what remains
  is everyday life.
- Copyright infringement = disqualification: only photos licensed PD, CC0, CC-BY or CC-BY-SA go
  into `data/`, always with author and source.
- Judging criteria (this is the priority for every decision):
  1. **Degree of completion** (0–10) — working code, not a mockup; fit to the theme.
  2. **Technical aspect** (0–10) — sensible, scalable architecture; the team has to justify its
     decisions at the Q&A, so the code must be simple and understandable.
  3. **Design and functionality** (0–10) — intuitive UX/UI, features that really solve the problem.
  4. **Creativity and innovation** (0–10).
  5. Stage 2: **usefulness / business potential** (0–10) and **presentation** (0–5, 5 minutes).

Takeaway: working core first (speech → places → photos on screen), polish after.
No needless abstractions, no features "just in case".

## Stack

| Layer      | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| Monorepo   | pnpm workspaces (no Turborepo/Nx — `pnpm -r --parallel` is enough)         |
| Frontend   | Vite 8 + React 19 + TypeScript, Web Speech API (Chrome, pl-PL)             |
| UI         | Tailwind CSS 4, shadcn/ui (`radix-nova` style), Lucide React, Leaflet      |
| Backend    | NestJS 11 (CommonJS)                                                       |
| LLM        | Claude (`@anthropic-ai/sdk`, model `claude-opus-5-5`)                      |
| Search     | `multilingual-e5-small` embeddings (`@huggingface/transformers`, local)    |
| Database   | PostgreSQL 17 (docker compose), Prisma ORM **7.9.x**                       |
| Shared     | `@repo/shared` — types and zod schemas                                     |

**Prisma is pinned to 7.9.1 — do not bump to 8.x (breaking changes).** `prisma`,
`@prisma/client` and `@prisma/adapter-pg` must have the same version.

## Architecture

```
Chrome (Web Speech API) → live transcript
  ├─ tier 1 (client, instant): place aliases from the gazetteer in the text → photo of the place
  └─ tier 2 (after each sentence): POST /api/recall
        → Claude (structured output): places, years, topics, question for the caregiver
        → in-memory ranking: place + time + embedding similarity − already shown
API (NestJS): archive (data/ in RAM) · recall · sessions (Prisma/Postgres)
Ingest (offline, apps/api/scripts): data/sources.csv → thumbnails → Claude descriptions → embeddings
```

## Structure

```
data/
  gazetteer.json      places of the city fragment (aliases, coordinates)
  sources.csv         hand-curated photo list (license, author, source, years, places)
  originals/          downloaded originals (gitignored)
  photos/             1280 px thumbnails (generated)
  archive.json        the dataset after enrichment (generated)
apps/
  api/                NestJS
    prisma/           schema.prisma + migrations
    scripts/          ingest: prepare → enrich → embed
    src/
      archive/        data loading, static photos, GET /api/places
      recall/         extraction (Claude) + ranking
      sessions/       sessions, moments, descriptions for the archive
      prisma/         PrismaModule (global) + PrismaService
      generated/      generated Prisma client (gitignored, do not edit)
  web/                Vite + React
packages/
  shared/             shared types / zod schemas
```

## Commands (from the root)

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # first time only, fill in ANTHROPIC_API_KEY
pnpm db:up            # Postgres in docker (localhost:5433)
pnpm db:migrate       # prisma migrate dev (after changing schema.prisma: --name <description>)
pnpm ingest           # data/sources.csv → data/archive.json (thumbnails, descriptions, embeddings)
pnpm dev              # shared (watch) + api :3000 + web :5173 (open in Chrome)
pnpm build | lint | typecheck | test
```

Adding dependencies: `pnpm --filter @repo/web add <pkg>` (likewise `@repo/api`, `@repo/shared`).
If a new package has an install script, pnpm will block it — add it to `allowBuilds`
in `pnpm-workspace.yaml`.

## Conventions

### General
- TypeScript strict, no `any` where it can be avoided.
- Code, names and commits in English; UI texts and prompts for Claude in Polish.
- After changes run `pnpm typecheck` and `pnpm lint`.
- Small commits, messages in the style `feat: ...`, `fix: ...`.

### `packages/shared`
- Define the API contract (request/response DTOs) here as a zod schema + `z.infer` type
  and use it on both sides.
- Web imports the **TS sources** directly, the API imports the **built CJS from `dist/`**
  (`pnpm dev` builds and watches the package automatically; running the API without `pnpm dev`
  requires `pnpm --filter @repo/shared build` first).
- Therefore: no `enum` or `namespace` (use `as const` / `z.enum`), type imports via
  `import type`, no dependencies on Node or the DOM.

### `apps/api`
- One Nest module per domain: `src/<feature>/<feature>.{module,controller,service}.ts`.
- Access the database only through `PrismaService` (injected, the module is global).
- Import the client from `../generated/prisma/client`, not from `@prisma/client`.
- All endpoints live under the `/api` prefix (set in `main.ts`), photos under `/api/photos/`.
- Validate input with zod schemas from `@repo/shared`.
- After every change to `schema.prisma`: `pnpm db:migrate --name <description>` and commit the migration.
- The Claude key lives only in `apps/api/.env` (`ANTHROPIC_API_KEY`); the frontend never calls Claude directly.

### `apps/web`
- Call the API with relative URLs (`fetch('/api/...')`) — Vite proxies `/api` to `:3000`,
  so CORS is not needed.
- Parse API responses with schemas from `@repo/shared`.
- UI components: shadcn first —
  `pnpm --filter @repo/web exec shadcn add <component>`; do not hand-write what is in the registry.
- Alias `@/` → `apps/web/src`. Icons only from `lucide-react`.
- Style with Tailwind classes and theme tokens from `src/index.css` (`bg-background`,
  `text-muted-foreground`…), no hardcoded colors.
- The session screen is watched by the senior: large typography, high contrast, calm animations;
  keep the caregiver's controls separate.
