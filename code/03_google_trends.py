"""Parsea los 24 reportes de Google Trends (descargados el 27/10/2026, 19:35-19:42; ventanas deslizantes «último mes»
y «última semana»; 6 categorías; consultas principales y en aumento) y clasifica las consultas que nombran a candidatos.
Los valores son interés relativo (0-100) dentro de cada lista de 50 consultas, no volúmenes.
Uso: python3 code/03_google_trends.py   Salidas: data/google_trends_consultas.csv, data/google_trends_resumen.json"""
import re, csv, json, unicodedata
import pandas as pd

raw = open('data/raw/google_trends_combined_27oct.csv', encoding='utf-8-sig').read().replace('\r', '')
rows = []
for b in re.split(r'\n(?=# TITLE:)', raw):
    ln = b.strip().split('\n')
    m = re.match(r'# TITLE: searched_with_(top|rising)-searches_queries \| Time Span: (last \w+) \| Category: (.*)', ln[0])
    if not m:
        continue
    kind, span, cat = m.groups()
    for l in ln[2:]:
        if l.strip():
            r = next(csv.reader([l]))
            rows.append(dict(tipo='principal' if kind == 'top' else 'en aumento', ventana='último mes' if span == 'last month' else 'última semana',
                             categoria=cat, consulta=r[0], interes_relativo=int(r[1]), crecimiento=r[2]))
df = pd.DataFrame(rows)
n = lambda s: unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
df['consulta_norm'] = df.consulta.map(n)

CAND = r'lula|flavio|janones|bolsonaro|lulinha|ana clara|miliciano'
NEG = r'ana clara|miliciano|fugiu|sigilo|recua|manter a escala|medida protetiva|votou contra|lulinha|tavane|rachadinha|cartao corporativo|esquema'
AGE = r'idade|quantos anos'
def objetivo(q):
    if 'janones' in q: return 'Janones'
    if re.search(r'flavio|ana clara|miliciano|tavane|rachadinha|fugiu', q): return 'Flávio'
    if re.search(r'lula|lulinha', q): return 'Lula'
    return 'Otro'
def marco(q):
    if re.search(NEG, q): return 'acusación, escándalo o crítica'
    if re.search(AGE, q): return 'edad'
    return 'neutral, política pública o apuración'
cand = df[df.consulta_norm.str.contains(CAND)].copy()
cand['objetivo'] = cand.consulta_norm.map(objetivo); cand['marco'] = cand.consulta_norm.map(marco)
df = df.merge(cand[['tipo', 'ventana', 'categoria', 'consulta', 'objetivo', 'marco']], how='left', on=['tipo', 'ventana', 'categoria', 'consulta'])
df.drop(columns=['consulta_norm']).to_csv('data/google_trends_consultas.csv', index=False)

u = cand.drop_duplicates('consulta_norm')
POL = r'lula|flavio|janones|bolsonaro|ana clara|miliciano|sigilo|escala 6x1|eleic|apura|votos|tse|presidente|nunes marques|urna|resultado|candidat|debate'
df['pol'] = df.consulta_norm.str.contains(POL)
resumen = dict(
    consultas_unicas=int(df.consulta_norm.nunique()), candidatos_unicas=int(len(u)),
    cruce_objetivo_marco=pd.crosstab(u.objetivo, u.marco).to_dict(),
    politicas_pct={k: round(100 * float(v), 1) for k, v in df.groupby('ventana').pol.mean().items()})
json.dump(resumen, open('data/google_trends_resumen.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(resumen, ensure_ascii=False))
