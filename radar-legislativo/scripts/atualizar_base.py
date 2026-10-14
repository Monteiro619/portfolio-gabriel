"""Atualiza a cópia pública usada na demonstração. Usa apenas a biblioteca padrão."""
import concurrent.futures
import datetime
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = 'https://dadosabertos.camara.leg.br/api/v2'

def get(path):
    for attempt in range(3):
        try:
            request = urllib.request.Request(API + path, headers={'Accept': 'application/json'})
            with urllib.request.urlopen(request, timeout=25) as response:
                return json.load(response)['dados']
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)

def enrich(item):
    pid = item['id']
    detail = get(f'/proposicoes/{pid}')
    return {'proposicao': detail, 'autores': get(f'/proposicoes/{pid}/autores'),
            'temas': get(f'/proposicoes/{pid}/temas'),
            'tramitacoes': get(f'/proposicoes/{pid}/tramitacoes')}

def main():
    items = {}
    for year, kind, count in [(2026, 'PL', 20), (2026, 'PEC', 6), (2026, 'PLP', 6), (2025, 'PL', 8)]:
        query = urllib.parse.urlencode({'ano': year, 'siglaTipo': kind, 'itens': count,
                                      'ordem': 'DESC', 'ordenarPor': 'id'})
        for item in get('/proposicoes?' + query):
            items[item['id']] = item
    records = []
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        tasks = {pool.submit(enrich, item): item['id'] for item in items.values()}
        for task in concurrent.futures.as_completed(tasks):
            try:
                records.append(task.result())
            except Exception as error:
                failures.append({'id': tasks[task], 'erro': str(error)})
    if not records:
        raise RuntimeError('Nenhum registro coletado; base anterior preservada.')
    snapshot = {'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'source': API, 'records': sorted(records, key=lambda r: r['proposicao']['id'], reverse=True),
                'failures': failures}
    target = ROOT / 'snapshot.js'
    target.write_text('window.RADAR_SNAPSHOT = ' + json.dumps(snapshot, ensure_ascii=False) + ';\n')
    print(json.dumps({'arquivo': str(target), 'registros': len(records), 'falhas': len(failures),
                      'coletadoEm': snapshot['capturedAt']}, ensure_ascii=False))

if __name__ == '__main__':
    main()
