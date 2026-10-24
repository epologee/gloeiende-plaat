import json
import unittest
from pathlib import Path


DATA = json.loads((Path(__file__).parents[1] / 'data' / 'budget.json').read_text())


class BudgetSnapshotTest(unittest.TestCase):
    def test_every_phase_matches_published_metadata(self):
        for year, phases in DATA['years'].items():
            for phase, entry in phases.items():
                with self.subTest(year=year, phase=phase):
                    records = entry['records']
                    metadata = entry['metadata']
                    self.assertEqual(len(records), metadata['rows'])
                    self.assertEqual(len({record[0] for record in records}), metadata['chapters'])
                    self.assertEqual(sum(record[10] for record in records), metadata['sum_thousand_eur'])
                    self.assertEqual(sum(record[10] < 0 for record in records), metadata['negative_rows'])


if __name__ == '__main__':
    unittest.main()
