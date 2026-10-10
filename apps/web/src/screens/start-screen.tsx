import type { Photo, SeniorProfile } from '@repo/shared'
import { useMemo, useState, type FormEvent } from 'react'
import { AlbumPhoto } from '@/components/album-photo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { paths } from '@/lib/router'
import { cn } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()

export function StartScreen({ photos }: { photos: Photo[] }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState<SeniorProfile['address']>('pani')
  const [birthYear, setBirthYear] = useState('')
  const [inCitySince, setInCitySince] = useState('')
  const [interests, setInterests] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // The cover is the photo closest to the middle of the era, so the page looks the same on every load
  const cover = useMemo(
    () => [...photos].sort((a, b) => Math.abs(a.yearFrom - 1960) - Math.abs(b.yearFrom - 1960))[0],
    [photos],
  )

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const year = Number(birthYear)
    if (!Number.isInteger(year) || year < 1900 || year > CURRENT_YEAR) {
      setError('Podaj rok urodzenia, np. 1945.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const session = await api.createSession({
        name: name.trim(),
        address,
        birthYear: year,
        inCitySince: inCitySince ? Number(inCitySince) : null,
        interests: interests.trim(),
      })
      window.location.hash = paths.session(session.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-center gap-8 bg-album p-10 text-album-foreground lg:p-16">
        {cover && <AlbumPhoto photo={cover} className="max-w-xl self-center" imageClassName="max-h-[50svh]" />}
        <div className="max-w-xl">
          <h1 className="font-serif text-5xl leading-tight">Pamięć na żywo</h1>
          <p className="mt-4 text-lg leading-relaxed text-album-muted">
            Senior opowiada, a ekran pokazuje zdjęcia miejsc, o których mówi: Wrocław z lat 1945–1975.
            Ty dostajesz podpowiedzi, o co zapytać.
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-center p-10 lg:p-16">
        <form onSubmit={submit} className="max-w-md space-y-6">
          <h2 className="font-serif text-3xl">Z kim dziś rozmawiasz?</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Imię</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Jak się zwracać</legend>
            <div className="flex gap-2">
              {(['pani', 'pan'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={address === value}
                  onClick={() => setAddress(value)}
                  className={cn(
                    'h-11 flex-1 rounded-md border text-base',
                    address === value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
                  )}
                >
                  {value === 'pani' ? 'Pani' : 'Pan'}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth">Rok urodzenia</Label>
              <Input id="birth" required inputMode="numeric" placeholder="1945" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="since">We Wrocławiu od</Label>
              <Input id="since" inputMode="numeric" placeholder="od urodzenia" value={inCitySince} onChange={(e) => setInCitySince(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interests">Co lubi, czym się zajmował(a)</Label>
            <Textarea id="interests" placeholder="np. taniec, tramwaje, szycie" value={interests} onChange={(e) => setInterests(e.target.value)} />
          </div>
          {error && <p className="text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" size="lg" disabled={saving} className="h-12 px-6 text-base">
              Rozpocznij rozmowę
            </Button>
            <a href={paths.archive} className="text-muted-foreground underline-offset-4 hover:underline">
              Archiwum wspomnień
            </a>
          </div>
        </form>
      </section>
    </main>
  )
}
