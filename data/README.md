# Photo set

The demo covers **Wrocław in 1945–1980, mainly the Old Town**. Automatic sources have very little
material here, so photos are curated by hand in `sources.csv` and `pnpm ingest` does the rest.

## `sources.csv` columns

| Column       | Description |
| ------------ | ----------- |
| `id`         | short, unique slug, e.g. `nac-rynek-1947-01` |
| `source_url` | the photo's page in the archive (for attribution) |
| `image_url`  | direct link to the image file; empty if you give `local_file` |
| `local_file` | name of a file saved by hand in `data/originals/` (e.g. when the archive gives no link) |
| `title`      | title or description from the source |
| `author`     | author; empty if unknown |
| `source`     | institution, e.g. `Narodowe Archiwum Cyfrowe`, `Polona`, `Wikimedia Commons` |
| `license`    | e.g. `domena publiczna` (public domain), `CC0`, `CC BY 4.0`, `CC BY-SA 3.0` |
| `year_from`, `year_to` | range of years the photo was taken; the same year twice if the date is exact |
| `place_ids`  | ids from `gazetteer.json` separated by semicolons; may be left empty, `ingest` will suggest them |

Quote fields containing commas (`"Rynek, widok od strony Ratusza"`).

## Rules

- **Only PD, CC0, CC-BY, CC-BY-SA licenses.** In NAC, filter for materials marked as public domain.
- **No politics or religion:** skip marches, rallies, propaganda (e.g. the Recovered Territories
  Exhibition) and churches. Look for everyday life: trade, trams, cafés, people on the street,
  reconstruction, shop signs, fashion.
- Goal: **150–300 photos**, at least 5 for each key place (Rynek, Świdnicka, Hala Targowa,
  Plac Solny, Feniks, Opera, Plac Kościuszki, Renoma, Dworzec Główny).
- Add every new place to `gazetteer.json` (id, name, aliases in their inflected forms,
  coordinates from OpenStreetMap).

## Aliases in the gazetteer

Aliases are the phrases people say. A word with an asterisk matches as a prefix (`świdnick*` →
"Świdnickiej", "Świdnicką"), without an asterisk only exactly. Letter case and Polish diacritics
do not matter. Avoid short prefixes that catch ordinary words (`oper*` would catch "operację").

## Curiosity cards (`facts.json`)

Short, **verified** curiosities the caregiver can weave into the conversation. Claude only picks
the id of the card matching the senior's statement, and the caregiver sees the text verbatim from
the file, together with its source — the model does not add facts of its own.

- `text`: 1–2 sentences in Polish, no politics or religion; a curiosity, not a history lesson.
- `placeIds`, `yearFrom`, `yearTo`: what and when it concerns (years may be `null`).
- `source`, `sourceUrl`: how we know. Check every card against the source before adding it.
- Goal: about 50 cards, a few for each key place.

## Where to look

- **Wikimedia Commons**, preferably the yearly categories `Category:1964 in Wrocław` etc.
  Series that worked:
  - postcards and photos from Polona (public domain), e.g. `Wroclaw "nie po 1946"`, Ossolineum 1948,
  - Fortepan 1964 (CC BY-SA 3.0): Opera, Plac Uniwersytecki, Hala Ludowa,
  - Deutsche Fotothek, photographer Richard Peter (CC BY-SA 3.0 de): street scenes and parks
    around 1967–1970,
  - Stefan Arczyński 1969 (public domain): Elwro, Pafawag, Dolmel,
  - Gerd Eichmann 1975 (CC BY-SA 4.0): the Rynek and the town hall,
  - KazimierzP, fotopolska.eu (CC BY-SA): family photos from 1978–1981,
  - Hans Birger Nilsen 1980 (CC BY-SA 2.0): Plac Wolności, the moat.

  The direct file link is under "Original file". Beware of "public domain" labels on
  photographers who died recently (e.g. photos from BnF): if there is no legal basis, skip it.
- **Narodowe Archiwum Cyfrowe** (szukajwarchiwach.gov.pl, audiovis.nac.gov.pl): filter for materials
  marked as public domain; save the file by hand in `data/originals/` and give it in `local_file`.
- **Polona** (polona.pl): postcards and photographs; check the rights marking on every object.
