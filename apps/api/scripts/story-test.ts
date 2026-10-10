// Sends ten typical senior sentences to a running API and reports place recognition and latency.
// Usage: pnpm --filter @repo/api story-test (with `pnpm dev` running and ANTHROPIC_API_KEY set)
import { recallResponseSchema, type SeniorProfile } from '@repo/shared';

const API = process.env.API_URL ?? 'http://localhost:3000/api';

const profile: SeniorProfile = {
  name: 'Zofia',
  address: 'pani',
  birthYear: 1944,
  inCitySince: 1946,
  interests: 'taniec, krawiectwo',
};

const STORIES: { text: string; expected: string[] }[] = [
  {
    text: 'W niedzielę umawialiśmy się pod Fredrą, tam się wszyscy spotykali',
    expected: ['pomnik-fredry'],
  },
  { text: 'Kupowałam materiał na sukienkę w Feniksie', expected: ['feniks'] },
  {
    text: 'Mama brała mnie na Halę Targową po warzywa',
    expected: ['hala-targowa'],
  },
  {
    text: 'Po pracy szliśmy Świdnicką aż do placu Kościuszki',
    expected: ['swidnicka', 'plac-kosciuszki'],
  },
  {
    text: 'Na Placu Solnym zawsze sprzedawali kwiaty',
    expected: ['plac-solny'],
  },
  { text: 'W operze pierwszy raz widziałam balet', expected: ['opera'] },
  {
    text: 'Jak przyjeżdżałam pociągiem, wysiadałam na dworcu głównym',
    expected: ['dworzec-glowny'],
  },
  {
    text: 'Mój tata studiował na uniwersytecie nad Odrą',
    expected: ['uniwersytet'],
  },
  {
    text: 'Pod zegarem na ratuszu czekał na mnie narzeczony',
    expected: ['ratusz'],
  },
  {
    text: 'W tym wielkim domu towarowym na Świdnickiej, co ma dziś inną nazwę, kupiłam pierwsze buty',
    expected: ['renoma'],
  },
];

async function main() {
  let hits = 0;
  const latencies: number[] = [];

  for (const story of STORIES) {
    const started = Date.now();
    const res = await fetch(`${API}/recall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: story.text,
        profile,
        shownPhotoIds: [],
      }),
    });
    if (!res.ok)
      throw new Error(`recall failed: ${res.status} ${await res.text()}`);
    const result = recallResponseSchema.parse(await res.json());
    const ms = Date.now() - started;
    latencies.push(ms);

    const found = story.expected.every((id) =>
      result.entities.placeIds.includes(id),
    );
    if (found) hits++;
    const photos =
      result.matches.map((m) => m.photo.id).join(', ') || 'brak zdjęć';
    console.log(`${found ? '✓' : '✗'} ${ms} ms  ${story.text}`);
    console.log(
      `    miejsca: ${result.entities.placeIds.join(', ') || '—'} | tematy: ${result.entities.topics.join(', ') || '—'}`,
    );
    console.log(`    zdjęcia: ${photos}`);
    console.log(
      `    pytanie: ${result.followUpQuestion ?? '—'}${result.fact ? ` | ciekawostka: ${result.fact.id}` : ''}`,
    );
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  console.log(`\nmiejsca rozpoznane: ${hits}/${STORIES.length} (cel ≥ 8)`);
  console.log(
    `mediana opóźnienia: ${sorted[Math.floor(sorted.length / 2)]} ms (cel < 3000)`,
  );
}

void main();
