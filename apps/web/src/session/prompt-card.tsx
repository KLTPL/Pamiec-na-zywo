import { ExternalLink } from 'lucide-react'
import type { Prompt, Segment } from './use-session-engine'

/** What the carer could say next: a follow-up, or a bridge towards photos we have. */
export function PromptCard({ prompt }: { prompt: Prompt | null }) {
  if (!prompt) {
    return (
      <section className="rounded-md bg-card p-5">
        <h2 className="font-serif text-lg">Podpowiedź</h2>
        <p className="mt-2 text-muted-foreground">
          Zacznij od zdjęcia z młodości seniora i zapytaj, co widzi. Podpowiedzi pojawią się, gdy zrobi pauzę.
        </p>
      </section>
    )
  }
  const main = prompt.nothingFound ? (prompt.bridge ?? prompt.followUp) : (prompt.followUp ?? prompt.bridge)
  const secondary = prompt.nothingFound ? prompt.followUp : null

  return (
    <section className="space-y-4">
      {main && (
        <div className="rounded-md bg-card p-5">
          <h2 className="text-sm text-muted-foreground">{prompt.nothingFound ? 'Spróbuj zapytać' : 'Możesz zapytać'}</h2>
          <p className="mt-2 font-serif text-2xl leading-snug text-pretty">{main}</p>
          {secondary && <p className="mt-3 text-muted-foreground">Albo: {secondary}</p>}
        </div>
      )}
      {prompt.fact && (
        <div className="rounded-md border border-primary/30 p-5">
          <h2 className="text-sm text-primary">Ciekawostka</h2>
          <p className="mt-2 leading-relaxed">{prompt.fact.text}</p>
          <a
            href={prompt.fact.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Źródło: {prompt.fact.source}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      )}
    </section>
  )
}

export function Transcript({ segments, interim }: { segments: Segment[]; interim: string }) {
  const recent = segments.slice(-6)
  if (recent.length === 0 && !interim) return null
  return (
    <section aria-label="Transkrypcja" className="space-y-2">
      <h2 className="text-sm text-muted-foreground">Ostatnio powiedziane</h2>
      <ol className="space-y-2 font-serif leading-relaxed">
        {recent.map((segment) => (
          <li key={segment.id}>{segment.text}</li>
        ))}
        {interim && <li className="text-muted-foreground italic">{interim}</li>}
      </ol>
    </section>
  )
}
