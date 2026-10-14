"""Coleta uma cópia real da agenda do mês, com referências oficiais e data da coleta."""
import calendar
import concurrent.futures
import datetime
import json
import urllib.parse
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
API = 'https://dadosabertos.camara.leg.br/api/v2'

def get(path):
    request = urllib.request.Request(API + path, headers={'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)

def pages(path, limit=10):
    records = []
    for page in range(1, limit+1):
        response = get(path + ('&' if '?' in path else '?') + urllib.parse.urlencode({'pagina':page,'itens':100}))
        records.extend(response['dados'])
        if not any(link['rel']=='next' for link in response.get('links', [])):
            return records
    raise RuntimeError('Consulta excedeu o limite de páginas; cópia anterior preservada.')

def main():
    today = datetime.datetime.now(ZoneInfo('America/Sao_Paulo')).date()
    start = today.replace(day=1)
    end = today.replace(day=calendar.monthrange(today.year,today.month)[1])
    tasks = {
        'events': lambda: pages('/eventos?' + urllib.parse.urlencode({'dataInicio':str(start),'dataFim':str(end),'ordem':'ASC','ordenarPor':'dataHoraInicio'})),
        'committees': lambda: get('/orgaos?codTipoOrgao=2&itens=200&ordenarPor=sigla&ordem=ASC')['dados'],
        'plenary': lambda: get('/orgaos?sigla=PLEN&itens=20')['dados'],
        'eventTypes': lambda: get('/referencias/eventos/codTipoEvento')['dados'],
        'statuses': lambda: get('/referencias/eventos/codSituacaoEvento')['dados']
    }
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {key:pool.submit(fn) for key,fn in tasks.items()}
        collected = {key:future.result() for key,future in futures.items()}
    data = {'source':API,'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'start':str(start),'end':str(end),**collected}
    (ROOT/'snapshot.js').write_text('window.AGENDA_SNAPSHOT = '+json.dumps(data,ensure_ascii=False)+';\n')
    print(json.dumps({'registros':len(data['events']),'comissoes':len(data['committees']),
                      'inicio':str(start),'fim':str(end),'coletadoEm':data['capturedAt']},ensure_ascii=False))

if __name__ == '__main__':
    main()
