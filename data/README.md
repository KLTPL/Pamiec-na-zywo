# Zbiór zdjęć

Demo obejmuje **Stare Miasto Wrocławia z lat 1945–1975**. Automatyczne źródła mają tu bardzo
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
