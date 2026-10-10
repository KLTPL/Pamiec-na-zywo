# AGENTS.md

Instrukcje dla agentów AI (Claude Code, Codex, Cursor itd.) pracujących w tym repo.
`CLAUDE.md` tylko importuje ten plik — edytuj tutaj.

## Kontekst

Projekt na hackathon **BEST Hacks 2026** (10–11.10.2026, 24 h, drużyna 4 osoby),
temat „Code For Culture”, kategoria **Historia**.

**Pamięć na żywo** — senior (np. osoba z demencją) opowiada o swojej przeszłości, a ekran na
żywo pokazuje archiwalne zdjęcia miejsc i rzeczy, o których mówi. Opiekun dostaje podpowiedzi
pytań, a wypowiedzi seniora przypinają się do zdjęć jako opisy dla archiwum.
Demo: **Stare Miasto Wrocławia, lata 1945–1975**.

Aplikacja ma działać **lokalnie** — nie ma deploymentu, nie dodawaj konfiguracji CI/CD ani hostingu.

### Co wynika z regulaminu (`Regulamin.pdf`)

- Cały projekt musi powstać w trakcie hackathonu i być pracą własną — nie kopiuj cudzych
  rozwiązań; biblioteki open source są OK.
- Zmiany w projekcie po upływie czasu = dyskwalifikacja. Nie commituj i nie pushuj po deadlinie.
- Rozwiązanie trafia do publicznego repozytorium — **żadnych sekretów w repo** (`.env` jest w `.gitignore`).
- Zakaz treści obraźliwych, politycznych, religijnych, wulgarnych (dotyczy też zdjęć w zbiorze,
  tekstów w UI i promptów). W zbiorze zdjęć pomijamy pochody, propagandę i kościoły — zostaje codzienność.
- Naruszenie praw autorskich = dyskwalifikacja: do `data/` trafiają tylko zdjęcia z licencją
  PD, CC0, CC-BY lub CC-BY-SA, zawsze z autorem i źródłem.
- Kryteria oceny (to jest priorytet przy każdej decyzji):
  1. **Stopień realizacji** (0–10) — działający kod, nie makieta; zgodność z tematem.
  2. **Aspekt techniczny** (0–10) — sensowna, skalowalna architektura; zespół musi umieć
     uzasadnić decyzje na Q&A, więc kod ma być prosty i zrozumiały.
  3. **Design i funkcjonalność** (0–10) — intuicyjny UX/UI, funkcje realnie rozwiązują problem.
  4. **Kreatywność i innowacyjność** (0–10).
  5. Etap 2: **przydatność / potencjał biznesowy** (0–10) i **prezentacja** (0–5, 5 minut).

Wniosek: najpierw działający rdzeń (mowa → miejsca → zdjęcia na ekranie), potem dopieszczanie.
Bez nadmiarowych abstrakcji, bez funkcji „na zapas”.

## Stack

| Warstwa      | Technologia                                                              |
| ------------ | ------------------------------------------------------------------------ |
| Monorepo     | pnpm workspaces (bez Turborepo/Nx — `pnpm -r --parallel` wystarcza)      |
| Frontend     | Vite 8 + React 19 + TypeScript, Web Speech API (Chrome, pl-PL)           |
| UI           | Tailwind CSS 4, shadcn/ui (styl `radix-nova`), Lucide React, Leaflet     |
| Backend      | NestJS 11 (CommonJS)                                                     |
| LLM          | Claude (`@anthropic-ai/sdk`, model `claude-opus-5-5`)                    |
| Wyszukiwanie | embeddingi `multilingual-e5-small` (`@huggingface/transformers`, lokalnie) |
| Baza         | PostgreSQL 17 (docker compose), Prisma ORM **7.9.x**                     |
| Wspólne      | `@repo/shared` — typy i schematy zod                                     |

**Prisma jest przypięta do 7.9.1 — nie podnoś do 8.x (breaking changes).** `prisma`,
`@prisma/client` i `@prisma/adapter-pg` muszą mieć tę samą wersję.

## Architektura

```
Chrome (Web Speech API) → transkrypcja na żywo
  ├─ tier 1 (klient, natychmiast): aliasy miejsc z gazetteera w tekście → zdjęcie miejsca
  └─ tier 2 (po każdym zdaniu): POST /api/recall
        → Claude (structured output): miejsca, lata, tematy, pytanie dla opiekuna
        → ranking w pamięci: miejsce + czas + podobieństwo embeddingów − już pokazane
API (NestJS): archive (dane z data/ w RAM) · recall · sessions (Prisma/Postgres)
Ingest (offline, apps/api/scripts): data/sources.csv → miniatury → opisy Claude → embeddingi
```

## Struktura

```
data/
  gazetteer.json      miejsca fragmentu miasta (aliasy, współrzędne)
  sources.csv         ręcznie kurowana lista zdjęć (licencja, autor, źródło, lata, miejsca)
  originals/          pobrane oryginały (gitignored)
  photos/             miniatury 1280 px (generowane)
  archive.json        zbiór po wzbogaceniu (generowany)
apps/
  api/                NestJS
    prisma/           schema.prisma + migracje
    scripts/          ingest: prepare → enrich → embed
    src/
      archive/        ładowanie danych, zdjęcia statyczne, GET /api/places
      recall/         ekstrakcja (Claude) + ranking
      sessions/       sesje, momenty, opisy do archiwum
      prisma/         PrismaModule (globalny) + PrismaService
      generated/      wygenerowany klient Prisma (gitignored, nie edytować)
  web/                Vite + React
packages/
  shared/             wspólne typy / schematy zod
```

## Komendy (z roota)

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # tylko za pierwszym razem, uzupełnij ANTHROPIC_API_KEY
pnpm db:up            # Postgres w dockerze (localhost:5433)
pnpm db:migrate       # prisma migrate dev (po zmianie schema.prisma: --name <opis>)
pnpm ingest           # data/sources.csv → data/archive.json (miniatury, opisy, embeddingi)
pnpm dev              # shared (watch) + api :3000 + web :5173 (otwórz w Chrome)
pnpm build | lint | typecheck | test
```

Dodawanie zależności: `pnpm --filter @repo/web add <pkg>` (analogicznie `@repo/api`, `@repo/shared`).
Jeśli nowa paczka ma skrypt instalacyjny, pnpm go zablokuje — dopisz ją do `allowBuilds`
w `pnpm-workspace.yaml`.

## Konwencje

### Ogólne
- TypeScript strict, bez `any` tam, gdzie da się tego uniknąć.
- Kod, nazwy i commity po angielsku; teksty w UI i prompty dla Claude po polsku.
- Po zmianach uruchom `pnpm typecheck` i `pnpm lint`.
- Małe commity, komunikaty w stylu `feat: ...`, `fix: ...`.

### `packages/shared`
- Kontrakt API (DTO request/response) definiuj tutaj jako schemat zod + `z.infer` typ
  i używaj po obu stronach.
- Web importuje **źródła TS** bezpośrednio, API importuje **zbudowany CJS z `dist/`**
  (`pnpm dev` buduje i obserwuje paczkę automatycznie; samo API bez `pnpm dev` wymaga
  wcześniej `pnpm --filter @repo/shared build`).
- Dlatego: bez `enum` i `namespace` (używaj `as const` / `z.enum`), importy typów przez
  `import type`, żadnych zależności od Node ani DOM.

### `apps/api`
- Jeden moduł Nest na domenę: `src/<feature>/<feature>.{module,controller,service}.ts`.
- Dostęp do bazy tylko przez `PrismaService` (wstrzykiwany, moduł jest globalny).
- Klient importuj z `../generated/prisma/client`, nie z `@prisma/client`.
- Wszystkie endpointy są pod prefiksem `/api` (ustawiony w `main.ts`), zdjęcia pod `/api/photos/`.
- Walidacja wejścia schematami zod z `@repo/shared`.
- Po każdej zmianie `schema.prisma`: `pnpm db:migrate --name <opis>` i commit migracji.
- Klucz Claude tylko w `apps/api/.env` (`ANTHROPIC_API_KEY`); frontend nigdy nie woła Claude bezpośrednio.

### `apps/web`
- Do API odwołuj się relatywnie (`fetch('/api/...')`) — Vite proxuje `/api` na `:3000`,
  więc CORS nie jest potrzebny.
- Odpowiedzi API parsuj schematami z `@repo/shared`.
- Komponenty UI: najpierw shadcn —
  `pnpm --filter @repo/web exec shadcn add <komponent>`; nie pisz ręcznie tego, co jest w rejestrze.
- Alias `@/` → `apps/web/src`. Ikony tylko z `lucide-react`.
- Stylowanie klasami Tailwind i tokenami motywu z `src/index.css` (`bg-background`,
  `text-muted-foreground`…), bez hardkodowanych kolorów.
- Ekran sesji ogląda senior: duża typografia, wysoki kontrast, spokojne animacje;
  sterowanie opiekuna trzymaj osobno.
