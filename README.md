# Pamięć na żywo

Projekt drużyny na hackathon BEST Hacks 2026 (Politechnika Wrocławska, 10–11.10.2026),
temat „Code For Culture”, kategoria Historia.

Senior opowiada o swojej przeszłości, a ekran na żywo pokazuje archiwalne zdjęcia miejsc
i rzeczy, o których mówi. Opiekun dostaje podpowiedzi pytań, a wypowiedzi seniora przypinają
się do zdjęć jako opisy dla archiwum. Dziedzictwo pomaga seniorowi, a senior opisuje dziedzictwo.

Demo obejmuje Stare Miasto Wrocławia z lat 1945–1975.

## Stack

- **Frontend:** Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Leaflet, Web Speech API
- **Backend:** NestJS, Prisma ORM 7.9, PostgreSQL, Claude API, embeddingi `multilingual-e5-small`
- **Monorepo:** pnpm workspaces — `apps/web`, `apps/api`, `packages/shared`

## Uruchomienie lokalne

Wymagania: Node.js ≥ 22.12, pnpm 12, Docker, Chrome (rozpoznawanie mowy), klucz API Anthropic.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # uzupełnij ANTHROPIC_API_KEY
pnpm db:up        # PostgreSQL w dockerze na localhost:5433
pnpm db:migrate   # migracje bazy
pnpm ingest       # przygotowanie zbioru zdjęć z data/sources.csv
pnpm dev          # web: http://localhost:5173, api: http://localhost:3000/api
```

## Zbiór zdjęć

Zdjęcia kurujemy ręcznie w `data/sources.csv`: tylko licencje PD, CC0, CC-BY i CC-BY-SA,
z autorem i źródłem. `pnpm ingest` pobiera je, robi miniatury, opisuje każde zdjęcie przez
Claude i liczy embeddingi do wyszukiwania. Miejsca fragmentu miasta są w `data/gazetteer.json`.

## Przydatne komendy

| Komenda          | Opis                                  |
| ---------------- | ------------------------------------- |
| `pnpm dev`       | wszystko w trybie watch               |
| `pnpm ingest`    | przebudowa zbioru zdjęć               |
| `pnpm build`     | build wszystkich paczek               |
| `pnpm lint`      | lint (oxlint w web, eslint w api)     |
| `pnpm typecheck` | sprawdzenie typów                     |
| `pnpm test`      | testy jednostkowe                     |
| `pnpm db:studio` | Prisma Studio                         |
| `pnpm db:reset`  | wyczyszczenie bazy i ponowne migracje |

Konwencje i szczegóły architektury: [AGENTS.md](./AGENTS.md).
