import type Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Fact, Place, SeniorProfile } from '@repo/shared';
import { z } from 'zod';
import { ArchiveService } from '../archive/archive.service';
import { CLAUDE_MODEL, createClaude, fallbackOptions } from '../claude';

const extractionSchema = z.object({
  placeIds: z.array(z.string()),
  yearFrom: z.number().int().nullable(),
  yearTo: z.number().int().nullable(),
  topics: z.array(z.string()),
  followUpQuestion: z.string().nullable(),
  bridgeQuestion: z.string().nullable(),
  factId: z.string().nullable(),
});

export type Extraction = z.infer<typeof extractionSchema>;

const RULES = `Jesteś suflerem opiekuna, który prowadzi rozmowę wspomnieniową z seniorem, często z demencją. Dostajesz ostatnią wypowiedź seniora (transkrypcja mowy, może zawierać błędy), wcześniejszą część rozmowy i jego profil. Aplikacja pokazuje na tej podstawie archiwalne zdjęcia Wrocławia z lat 1945–1975.

Wszystkie pola dotyczą ostatniej wypowiedzi. Wcześniejszej rozmowy używaj tylko do zrozumienia odniesień („tam”, „wtedy”, „ta kawiarnia”); miejsc, o których była mowa wcześniej, nie zwracaj, chyba że ostatnia wypowiedź się do nich odnosi.

Zwróć:
- placeIds: id miejsc z listy poniżej, o których senior mówi — także w odmianie, potocznie albo opisowo (np. „pod zegarem na ratuszu” → ratusz). Tylko id z listy.
- yearFrom, yearTo: okres, o którym mówi. Odniesienia względne przelicz z rocznika (np. „jak chodziłam do szkoły” przy roczniku 1945 → 1952–1963). null, jeśli nie da się ustalić.
- topics: 0–6 rzeczowników w mianowniku liczby pojedynczej: przedmioty, czynności i wydarzenia, o których mówi (np. „tramwaj”, „lody”, „zakupy”, „taniec”).
- followUpQuestion: jedno krótkie zdanie dla opiekuna, nawiązujące do tego, co senior właśnie powiedział.
- bridgeQuestion: jedno krótkie zdanie, które łagodnie kieruje rozmowę ku miejscu z listy związanemu z tematem (np. zakupy → Feniks albo Hala Targowa).
- factId: id karty ciekawostek z listy poniżej, która wyraźnie pasuje do tego, o czym mówi senior; null, jeśli żadna nie pasuje. Możesz nawiązać do tej karty w pytaniu, ale nie podawaj żadnych faktów spoza kart.

Zasady obu zdań:
- To zaproszenie do opowieści, nie test pamięci. Zamiast „Pamięta Pani, w którym roku…?” pisz „Opowie mi Pani o…”, „Jak tam było…?”.
- Pytaj o zmysły, ludzi i uczucia (zapachy, dźwięki, z kim, co było miłe), nie o daty i fakty.
- Nie poprawiaj seniora, nie oceniaj i nie dopowiadaj faktów, których nie powiedział.
- Forma grzecznościowa podana w profilu (Pani albo Pan), najwyżej 15 słów.
- Nie poruszaj polityki ani religii.`;

@Injectable()
export class ExtractorService {
  private client: Anthropic | null = null;
  private readonly system: string;

  constructor(archive: ArchiveService) {
    const places = archive
      .allPlaces()
      .map((place: Place) => `${place.id}: ${place.name}`)
      .join('\n');
    const facts = archive
      .allFacts()
      .map((fact: Fact) => `${fact.id}: ${fact.text}`)
      .join('\n');
    this.system = `${RULES}\n\nMiejsca:\n${places}\n\nKarty ciekawostek:\n${facts}`;
  }

  async extract(
    transcript: string,
    context: string,
    profile: SeniorProfile,
  ): Promise<Extraction> {
    // Created lazily so the API (archive, sessions) still boots without ANTHROPIC_API_KEY
    this.client ??= createClaude();
    const response = await this.client.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      ...fallbackOptions(),
      output_config: {
        effort: 'low',
        format: betaZodOutputFormat(extractionSchema),
      },
      // Stable rules + gazetteer first, so the prefix can be served from the prompt cache
      system: [
        {
          type: 'text',
          text: this.system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            `Senior: ${profile.name}, rocznik ${profile.birthYear}, forma: ${profile.address === 'pani' ? 'Pani' : 'Pan'}`,
            profile.inCitySince
              ? `We Wrocławiu od ${profile.inCitySince}`
              : 'Urodzony we Wrocławiu',
            profile.interests ? `Zainteresowania: ${profile.interests}` : '',
            context ? `\nWcześniej w rozmowie:\n«${context}»` : '',
            `\nOstatnia wypowiedź:\n«${transcript}»`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      throw new InternalServerErrorException(
        'Claude declined to analyse the transcript',
      );
    }
    if (!response.parsed_output) {
      throw new InternalServerErrorException(
        `No structured output (stop: ${response.stop_reason})`,
      );
    }
    return response.parsed_output;
  }
}
