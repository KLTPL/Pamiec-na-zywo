# Zbiór zdjęć

Demo obejmuje **Wrocław z lat 1945–1980, przede wszystkim Stare Miasto**. Automatyczne źródła mają tu bardzo
mało materiału, więc zdjęcia kurujemy ręcznie w `sources.csv`, a `pnpm ingest` robi resztę.

## Kolumny `sources.csv`

| Kolumna      | Opis |
| ------------ | ---- |
| `id`         | krótki, unikalny slug, np. `nac-rynek-1947-01` |
| `source_url` | strona zdjęcia w archiwum (do atrybucji) |
| `image_url`  | bezpośredni link do pliku obrazu; puste, jeśli podajesz `local_file` |
| `local_file` | nazwa pliku ręcznie zapisanego w `data/originals/` (np. gdy archiwum nie daje linku) |
| `title`      | tytuł lub opis ze źródła |
| `author`     | autor; puste, jeśli nieznany |
| `source`     | instytucja, np. `Narodowe Archiwum Cyfrowe`, `Polona`, `Wikimedia Commons` |
| `license`    | np. `domena publiczna`, `CC0`, `CC BY 4.0`, `CC BY-SA 3.0` |
| `year_from`, `year_to` | zakres lat wykonania; ten sam rok dwa razy, jeśli data jest dokładna |
| `place_ids`  | id z `gazetteer.json` rozdzielone średnikiem; można zostawić puste, `ingest` je zaproponuje |

Pola z przecinkami bierz w cudzysłów (`"Rynek, widok od strony Ratusza"`).

## Zasady

- **Tylko licencje PD, CC0, CC-BY, CC-BY-SA.** W NAC filtruj materiały oznaczone jako domena publiczna.
- **Bez polityki i religii:** pomijamy pochody, wiece, propagandę (np. Wystawa Ziem Odzyskanych) i kościoły.
  Szukamy codzienności: handel, tramwaje, kawiarnie, ludzie na ulicy, odbudowa, szyldy, moda.
- Cel: **150–300 zdjęć**, po min. 5 na każde kluczowe miejsce (Rynek, Świdnicka, Hala Targowa,
  Plac Solny, Feniks, Opera, Plac Kościuszki, Renoma, Dworzec Główny).
- Każde nowe miejsce dopisz do `gazetteer.json` (id, nazwa, aliasy w odmianach, współrzędne z OpenStreetMap).

## Aliasy w gazetteerze

Aliasy to frazy, które ludzie mówią. Słowo z gwiazdką pasuje jako prefiks (`świdnick*` →
„Świdnickiej”, „Świdnicką”), bez gwiazdki tylko dokładnie. Wielkość liter i polskie znaki
nie mają znaczenia. Unikaj krótkich prefiksów, które łapią zwykłe słowa (`oper*` złapałoby „operację”).

## Karty ciekawostek (`facts.json`)

Krótkie, **zweryfikowane** ciekawostki, które opiekun może wpleść w rozmowę. Claude wybiera
tylko id karty pasującej do wypowiedzi seniora, a opiekun widzi tekst dosłownie z pliku,
razem ze źródłem — model nie dopisuje faktów od siebie.

- `text`: 1–2 zdania po polsku, bez polityki i religii; ciekawostka, a nie lekcja historii.
- `placeIds`, `yearFrom`, `yearTo`: czego i kiedy dotyczy (lata mogą być `null`).
- `source`, `sourceUrl`: skąd to wiemy. Każdą kartę sprawdź w źródle, zanim ją dodasz.
- Cel: ok. 50 kart, po kilka na każde kluczowe miejsce.

## Gdzie szukać

- **Wikimedia Commons**, najlepiej kategorie rocznikowe `Category:1964 in Wrocław` itd. Sprawdzone serie:
  - pocztówki i zdjęcia z Polony (domena publiczna), np. `Wroclaw "nie po 1946"`, Ossolineum 1948,
  - Fortepan 1964 (CC BY-SA 3.0): Opera, Plac Uniwersytecki, Hala Ludowa,
  - Deutsche Fotothek, fot. Richard Peter (CC BY-SA 3.0 de): sceny uliczne i parki ok. 1967–1970,
  - Stefan Arczyński 1969 (domena publiczna): Elwro, Pafawag, Dolmel,
  - Gerd Eichmann 1975 (CC BY-SA 4.0): Rynek i ratusz,
  - KazimierzP, fotopolska.eu (CC BY-SA): zdjęcia rodzinne z lat 1978–1981,
  - Hans Birger Nilsen 1980 (CC BY-SA 2.0): Plac Wolności, fosa.

  Bezpośredni link do pliku jest pod „Oryginalny plik”. Uwaga na oznaczenia „domena publiczna” przy
  fotografach zmarłych niedawno (np. zdjęcia z BnF): jeśli nie ma podstawy prawnej, pomiń.
- **Narodowe Archiwum Cyfrowe** (szukajwarchiwach.gov.pl, audiovis.nac.gov.pl): filtruj materiały
  oznaczone jako domena publiczna; plik zapisz ręcznie w `data/originals/` i podaj w `local_file`.
- **Polona** (polona.pl): pocztówki i fotografie; sprawdzaj oznaczenie praw przy każdym obiekcie.
