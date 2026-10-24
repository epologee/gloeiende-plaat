#!/usr/bin/env python3
"""Fetch official expenditure snapshots for the available budget phases."""
import csv
import io
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = 'https://www.rijksfinancien.nl/open-data/api/json/budgettaire_tabellen'
FILES = 'https://www.rijksfinancien.nl/sites/default/files/bestanden/open_data/'
API_FIELDS = (
    'hoofdstuk_nummer', 'hoofdstuk_naam', 'artikel_nummer', 'artikel_naam',
    'artikelonderdeel_nummer', 'artikelonderdeel_naam',
    'instrument_of_uitsplitsing_apparaat_nummer',
    'instrument_of_uitsplitsing_apparaat_naam',
    'regeling_detailniveau_nummer', 'regeling_detailniveau_naam',
)
FILE_FIELDS = (
    'Hoofdstuknummer', 'Hoofdstuknaam', 'Artikelnummer', 'Artikelnaam',
    'Artikelonderdeelnummer', 'Artikelonderdeelnaam', 'Instrumentnummer',
    'Instrumentnaam', 'Detailnummer', 'Detailnaam',
)


def fetch_json(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)


def summarize(url, rows):
    return {
        'url': url,
        'rows': len(rows),
        'sum_thousand_eur': sum(row[10] for row in rows),
        'negative_rows': sum(row[10] < 0 for row in rows),
        'zero_rows': sum(row[10] == 0 for row in rows),
        'chapters': len({row[0] for row in rows}),
    }


def api_phase(year, phase):
    url = API + '?' + urllib.parse.urlencode({'year': year, 'phase': phase, 'vuo': 'U'})
    source = fetch_json(url)
    if not isinstance(source, list) or not source:
        raise ValueError(f'No rows for {year} {phase}')
    if any(row['jaar'] != year or row['fase'] != phase or row['vuo'] != 'U' for row in source):
        raise ValueError(f'Unexpected records for {year} {phase}')
    if len({row['index'] for row in source}) != len(source):
        raise ValueError(f'Duplicate source indexes for {year} {phase}')
    rows = [[*(row.get(field) or '' for field in API_FIELDS), row['bedrag']] for row in source]
    return {'records': rows, 'metadata': summarize(url, rows)}


def file_phase(year, phase, filename, amount_field):
    url = FILES + filename
    source = fetch_json(url)
    if not isinstance(source, dict) or not all(field in source for field in FILE_FIELDS):
        raise ValueError(f'Unexpected file structure for {year} {phase}')
    ids = source['VUO'].keys()
    filtered = [i for i in ids if source['VUO'][i] == 'U']
    if any(str(source['Begrotingsjaar'][i]) != str(year) for i in filtered):
        raise ValueError(f'Unexpected year for {year} {phase}')
    expected_phase = 'OW' if phase == 'OWB' else phase
    if any(source['Fase'][i] != expected_phase for i in filtered):
        raise ValueError(f'Unexpected phase for {year} {phase}')
    leaves = [i for i in filtered if source['Totaal'][i] == 'N']
    rows = [[*(source[field][i] or '' for field in FILE_FIELDS), int(source[amount_field][i] or 0)] for i in leaves]
    article_totals = [i for i in filtered if source['Totaal'][i] == 'J' and not source['Artikelonderdeelnummer'][i] and not source['Instrumentnummer'][i] and not source['Detailnummer'][i]]
    if sum(row[10] for row in rows) != sum(int(source[amount_field][i] or 0) for i in article_totals):
        raise ValueError(f'Leaf and article totals differ for {year} {phase}')
    return {'records': rows, 'metadata': summarize(url, rows)}


def partial_2026():
    url = FILES + 'visual%20-augustus-2026.csv'
    with urllib.request.urlopen(url, timeout=30) as response:
        source = response.read().decode('utf-8-sig')
    matches = [row for row in csv.DictReader(io.StringIO(source), delimiter=';')
               if row['jaar'] == '2026' and row['U/O/N'] == 'uitgaven' and row['hoofdstuk'] == 'Totaal']
    if len(matches) != 1:
        raise ValueError('Missing 2026 interim realization total')
    return {'through': 'augustus 2026', 'million_eur': int(matches[0]['realisatie-totaal']), 'url': url}


years = {
    '2025': {'JV': api_phase(2025, 'JV'), 'OWB': api_phase(2025, 'OWB')},
    '2026': {
        'SBS': file_phase(2026, 'SBS', 'Budgettaire_Tabellen_2026_I2_incl.json', 'StandSBS'),
        'OWB': file_phase(2026, 'OWB', 'Budgettaire_Tabellen_2026_OW_incl.json', 'StandOWB'),
    },
    '2027': {'OWB': file_phase(2027, 'OWB', 'Budgettaire_Tabellen_2027_OW_incl.json', 'StandOWB')},
}
output = {
    'retrieved_utc': datetime.now(timezone.utc).isoformat(),
    'unit': 'thousand_eur',
    'years': years,
    'partial_realization_2026': partial_2026(),
}
destination = Path(__file__).parent / 'data' / 'budget.json'
destination.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n')
for year, phases in years.items():
    for phase, entry in phases.items():
        print(year, phase, entry['metadata'])
print('2026 interim realization:', output['partial_realization_2026'])
