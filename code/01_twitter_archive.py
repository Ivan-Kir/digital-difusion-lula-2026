"""Usa el CSV de Twitter Trending Archive (Brasil, 1-25/10/2026, hora GMT-3)
y calcula las series diarias usadas en el informe.
Uso (desde la raíz del sitio):  python3 code/01_parse_twitter_archive.py
Salidas: data/twitter_archive_diario.csv, data/hashtags_chat.csv"""
import re, subprocess, unicodedata, json, os
import pandas as pd

snap = pd.read_csv('data/twitter_archive_snapshots.csv')
print('filas', len(snap), 'sin término', int(snap.tendencia.isna().sum()))

norm = lambda s: unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
t = snap.copy(); t['tendencia'] = t.tendencia.fillna('')
t['tn'] = t.tendencia.map(norm); t['h'] = t.hora_brt.str[:2].astype(int)
t['mov'] = t.tn.str.replace(' ', '').str.contains(r'exercito|soldad|janones|milhoes(?:por|de)|somos\d+milh|lulavaivirar|lulavaivencer')
t['lula'] = t.tn.str.contains('lula'); t['flv'] = t.tn.str.contains(r'flavio|bolsonar')
t['censura'] = t.tn.str.replace(' ', '').str.contains(r'censur|ninguemcala|tsegolpista|golpenosenado|metacensura|janoneseuautorizo')
recs = []
for d, x in t.groupby('dia_oct_2026'):
    recs.append(dict(dia=d, horas_movilizacion=x[x.mov].h.nunique(), apar_movilizacion=int(x.mov.sum()),
                     apar_lula=int(x.lula.sum()), apar_flavio_bolsonaro=int(x.flv.sum()), apar_censura=int(x.censura.sum())))
g = pd.DataFrame(recs).set_index('dia')
g.to_csv('data/twitter_archive_diario.csv')
print('horas de movilización 10-24/10:', g.loc[10:24, 'horas_movilizacion'].describe().round(1).to_dict())

# cruce con las hashtags ordenadas en el chat (las produce 02_chat_nlp.py)
if os.path.exists('data/hashtags_chat_orden.json'):
    names = json.load(open('data/hashtags_chat_orden.json'))
    ph = [('A', 1, 3), ('B', 4, 15), ('C', 16, 23), ('D', 24, 33), ('E', 34, 43), ('F', 44, 48)]
    fase = {i: p for p, a, b in ph for i in range(a, b + 1)}
    nn = lambda s: re.sub(r'[^a-z0-9]', '', norm(s))
    t['tn2'] = t.tendencia.map(nn); out = []
    for i, h in enumerate(names, 1):
        k = nn(h)
        s = t[t.tn2 == ('bolsonaromandoumatarlula' if 'pesquisebolsonaro' in k else k)]
        d = s.groupby('dia_oct_2026').size().to_dict()
        first = s.sort_values(['dia_oct_2026', 'hora_brt']).iloc[0] if len(s) else None
        out.append(dict(n=i, hashtag=h, fase=fase[i], apariciones=int(sum(d.values())),
                        dias='; '.join(f'{a}/10: {b}' for a, b in sorted(d.items())),
                        primera=(f'{int(first.dia_oct_2026)}/10 {first.hora_brt}' if first is not None else ''),
                        como_frase=int('pesquisebolsonaro' in k)))
    pd.DataFrame(out).to_csv('data/hashtags_chat.csv', index=False)
    print('hashtags que entran al top-10:', sum(1 for o in out if o['apariciones'] > 0), 'de', len(out))
