# De gloeiende plaat

Interactieve verkenning van de Nederlandse rijksuitgaven voor 2025, 2026 en 2027. De cirkel toont de hiërarchie uit de officiële budgettaire tabellen: hoofdstuk, artikel, artikelonderdeel, financieel instrument en detail of regeling. Klik op een segment of een regel rechts om in te zoomen; klik in het midden om één niveau terug te gaan. De jaar- en fasekeuzes tonen alleen gepubliceerde combinaties.

Voorbeelden: [overzicht 2026](preview-overview.png), [2026 met een geopend hoofdstuk](preview.png) en [ontwerpbegroting 2027](preview-2027.png).

## Kleur van de hoofdstukken

Elk hoofdstuk houdt in alle jaren en begrotingsfasen dezelfde kleur. De keuze volgt herkenbare associaties: legergroen voor Defensie, koraal voor Sociale Zaken, blauwgroen voor Zorg, paars voor Onderwijs, blauw voor Financiën, amber voor infrastructuur en groenblauw voor klimaat. Verwante fondsen gebruiken dezelfde kleurfamilie als hun onderwerp. Dit is een visuele indeling van het experiment, geen officiële begrotingsclassificatie.

De kleuren zijn in [OKLCH](https://www.w3.org/TR/css-color-4/#ok-lab) opgebouwd: per hoofdstuk varieert vooral de kleurtoon, terwijl lichtheid en kleurkracht op dezelfde schaal blijven. Buitenste ringen worden stapsgewijs lichter en iets minder verzadigd; artikelen krijgen een kleine variatie binnen hun hoofdstukkleur. De labels en bedragen blijven leidend, conform het [W3C-advies om informatie niet uitsluitend met kleur over te brengen](https://www.w3.org/WAI/tips/designing/#dont-use-color-alone-to-convey-information).

## Data en herkomst

De snapshot in `data/budget.json` is op 24 oktober 2026 rechtstreeks opgehaald bij het Ministerie van Financiën. Voor 2025 zijn de ontwerpbegroting en het jaarverslag afkomstig uit de [open API](https://www.rijksfinancien.nl/open-data/api-documentatie). Voor 2026 en 2027 gebruikt het experiment de officiële JSON-bestanden uit de [datasetcatalogus](https://www.rijksfinancien.nl/overzicht-datasets): 2026 ontwerpbegroting, septemberstand en 2027 ontwerpbegroting, alle drie inclusief premies. De [datasetbeschrijving](https://www.rijksfinancien.nl/open-data/budgettaire%20tabellen%20rijksbegroting) geeft de vijf lagen, de begrotingsfasen en de betekenis van uitgaven, ontvangsten en verplichtingen. De bedragen in deze tabellen zijn duizenden euro's; de interface rekent ze om naar euro's. Licentie: CC0.

| Jaar en fase | Bronregels | Hoofdstukken | Som van regels |
| --- | ---: | ---: | ---: |
| 2025 jaarverslag | 3017 | 26 | € 419,099 miljard |
| 2025 ontwerpbegroting | 2674 | 30 | € 487,927 miljard |
| 2026 septemberstand | 2397 | 29 | € 552,325 miljard |
| 2026 ontwerpbegroting | 2797 | 30 | € 555,614 miljard |
| 2027 ontwerpbegroting | 2712 | 29 | € 573,976 miljard |

Deze sommen tellen de laagste beschikbare uitgavenregels op; ze zijn geen geverifieerd totaal van alle overheidsuitgaven. De cirkel gebruikt positieve bronbedragen voor oppervlaktes. Negatieve correcties tellen wel mee in het getoonde nettobedrag; nulregels blijven navigeerbaar in de lijst. Een vlak kan daardoor iets groter lijken dan het nettobedrag suggereert.

Voor 2026 is ook een [voorlopige realisatie tot en met augustus](https://www.rijksfinancien.nl/uitgavenrealisaties) gepubliceerd: € 244,472 miljard aan begrotingsgefinancierde uitgaven. Deze stand wordt maandelijks bijgewerkt en sluit premiegefinancierde uitgaven uit. Daarom wordt hij niet in de cirkel opgeteld bij of vergeleken met de septemberbegroting inclusief premies. Voor 2027 is nog geen realisatie beschikbaar.

De fasen zijn **niet zonder meer onderling vergelijkbaar**. Bijvoorbeeld: artikel Zorgverzekeringswet onder hoofdstuk XVI bevat in de OWB circa € 66,8 miljard en in JV circa € 9,7 miljard; Wet langdurige zorg circa € 39,8 miljard en € 0. Bovendien heeft de OWB 30 hoofdstukken en JV 26, onder meer doordat IXA en IXB in JV onder IX vallen. De beschikbare API-respons verklaart deze verschillen niet volledig. De interface laat daarom per fase een eigen boom zien en berekent geen zogenaamd verschil of besparing per tak. Voor een gecontroleerde vergelijking zijn de oorspronkelijke tabellen, de gepubliceerde begrotingsstukken en een expliciete afbakening van premies en herindelingen nodig.

Als vergelijkingspunt toont de pagina afzonderlijk de [budgettaire kerngegevens uit het Financieel Jaarverslag van het Rijk 2025](https://www.rijksfinancien.nl/financieel-jaarverslag/2025): netto-uitgaven binnen het uitgavenkader, € 427,0 miljard geraamd bij de Miljoenennota en € 424,2 miljard gerealiseerd; belasting- en premie-inkomsten, € 425,1 miljard geraamd en € 432,5 miljard gerealiseerd. Elke reeks vergelijkt dezelfde definitie binnen één officiële tabel. De reeksen hebben een andere afbakening dan de bruto uitgavenregels in de cirkel en leveren samen niet rechtstreeks het begrotingstekort op. Een controle van de [begrotingsstaten-CSV](https://www.rijksfinancien.nl/sites/default/files/bestanden/open_data/Begrotingsstaten_2013-2027.csv) vond voor 2025 acht dubbele uitgavenregels met hetzelfde hoofdstuk, artikel, ontwerpbegrotingsbedrag en realisatiebedrag, terwijl een tussenstand afwijkt. Zonder expliciete bronregel om de versie te kiezen, gebruikt dit experiment die CSV niet voor een afgeleid totaal.

De API levert per regel de laagste beschikbare uitsplitsing met de namen en nummers van alle bovenliggende niveaus. In de JSON-bestanden voor 2026 en 2027 zijn daarnaast optelregels aanwezig; `build_data.py` neemt alleen regels met `Totaal=N` en controleert hun som tegen de artikeltotalen. De interface telt die bladregels op tot de tussenliggende niveaus. Niet elk begrotingsartikel gebruikt alle lagen op dezelfde manier. Dit is een begrotingsboom, geen overzicht van individuele betalingen of eindontvangers.

## Starten en verversen

Start vanuit de repo-root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. De pagina heeft geen externe JavaScript- of CSS-afhankelijkheden. Ververs de snapshot met `python3 build_data.py`. Bij nieuwe begrotingsfasen of jaren moeten de bronbestanden en zichtbare keuzemogelijkheden worden toegevoegd en de dekking opnieuw worden gecontroleerd.
