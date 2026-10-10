# Pamięć na żywo (Living Memory)

A team project for the BEST Hacks 2026 hackathon (Wrocław University of Science and Technology,
10–11.10.2026), theme "Code For Culture", History category.

A senior talks about their past, and a live screen shows archival photos of the places and things
they mention. The caregiver gets suggested questions, and the senior's statements are pinned to the
photos as descriptions for the archive. Heritage helps the senior, and the senior describes heritage.

The demo covers Wrocław in 1945–1980, mainly the Old Town.

## Stack

- **Frontend:** Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Leaflet, Web Speech API
- **Backend:** NestJS, Prisma ORM 7.9, PostgreSQL, Claude API, `multilingual-e5-small` embeddings
- **Monorepo:** pnpm workspaces — `apps/web`, `apps/api`, `packages/shared`

## Running locally

Requirements: Node.js ≥ 22.12, pnpm 12, Docker, Chrome (speech recognition), an Anthropic API key.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # fill in ANTHROPIC_API_KEY
pnpm db:up        # PostgreSQL in docker on localhost:5433
pnpm db:migrate   # database migrations
pnpm ingest       # build the photo set from data/sources.csv
pnpm dev          # web: http://localhost:5173, api: http://localhost:3000/api
```

## How a conversation works

1. The caregiver enters the senior's profile (name, form of address Pani/Pan, birth year) and
   starts the conversation.
2. The "senior screen" opens a second window to show on a second monitor, a TV or a projector:
   only the photo and a caption, controlled from the caregiver's panel.
3. The caregiver turns on the microphone (Chrome). A place name immediately shows its photo, and
   after each sentence Claude picks the next photos, a question for the conversation and a
   curiosity. Suggestions appear only once the senior pauses. Without a microphone, sentences
   can be typed in.
4. Every sentence said over a photo is saved as a memory. At the end the caregiver reviews the
   memory card, prints it for the family and — with consent — hands the accounts over to the archive.

To check place recognition and latency (with `pnpm dev` running):
`pnpm --filter @repo/api story-test`.

## Photo set

Photos are curated by hand in `data/sources.csv`: only PD, CC0, CC-BY and CC-BY-SA licenses,
with author and source. `pnpm ingest` downloads them, makes thumbnails, has Claude describe each
photo and computes embeddings for search. The places of the city fragment are in `data/gazetteer.json`.

## Useful commands

| Command          | Description                             |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | everything in watch mode                |
| `pnpm ingest`    | rebuild the photo set                   |
| `pnpm build`     | build all packages                      |
| `pnpm lint`      | lint (oxlint in web, eslint in api)     |
| `pnpm typecheck` | type check                              |
| `pnpm test`      | unit tests                              |
| `pnpm db:studio` | Prisma Studio                           |
| `pnpm db:reset`  | wipe the database and re-run migrations |

Conventions and architecture details: [AGENTS.md](./AGENTS.md).
