"""Procesa el historial del canal «Exército do Lula» (18-25/10/2026, sin horas de envío).
Divide el chat en seis fases por anclas de contenido (rangos de líneas), calcula índices léxicos por 1.000 palabras,
sentimiento (LeIA, VADER en portugués), palabras distintivas (razón de log-odds), pares frecuentes y temas (TF-IDF + NMF).
Uso: python3 code/02_chat_nlp.py   (pip install leia-br scikit-learn pandas numpy)
Salidas: data/chat_lineas.csv, data/nlp_fases.csv, data/nlp_palabras_distintivas.csv, data/nlp_bigramas.csv,
         data/nlp_temas.json, data/hashtags_chat_orden.json"""
import re, json, math, collections
import numpy as np, pandas as pd
from LeIA import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import NMF

lines = [l.rstrip('\r\n') for l in open('data/raw/chat_exercito_do_lula_18-25oct.txt', encoding='utf-8')]
BOUNDS = [('A', 1, 230), ('B', 231, 500), ('C', 501, 660), ('D', 661, 900), ('E', 901, 1073), ('F', 1074, 1349)]
FASES = {'A': '18/10 hasta el debate', 'B': 'noche del debate y 19/10', 'C': '20/10 (alta de Janones, Nordeste)',
         'D': '21-22/10 (rumor de baja, live)', 'E': '23/10 (debate de Globo, 10 M)', 'F': '24-25/10 (live de 24 h, día del voto)'}
phase = lambda i: next(p for p, a, b in BOUNDS if a <= i <= b)

def tipo(l):
    m = re.search(r'(IMG|VID|PTT|STK)-', l)
    if 'archivo adjunto' in l or 'attached' in l.lower():
        return {'IMG': 'imagen', 'VID': 'video', 'PTT': 'audio', 'STK': 'sticker'}.get(m.group(1) if m else '', 'adjunto')
    return 'texto'

recs = [dict(n=i, fase=phase(i), tipo=tipo(l), texto=l) for i, l in enumerate(lines, 1) if l.strip()]
chat = pd.DataFrame(recs); chat.to_csv('data/chat_lineas.csv', index=False)
txt = chat[chat.tipo == 'texto']
print('líneas', len(chat), txt.shape[0], 'de texto;', chat.tipo.value_counts().to_dict())

# hashtags en orden de aparición
body = '\n'.join(txt.texto)
order = []
for h in re.findall(r'#\w+', body):
    if h.lower() not in [o.lower() for o in order]:
        order.append(h)
json.dump(order, open('data/hashtags_chat_orden.json', 'w'), ensure_ascii=False)

clean = lambda s: re.sub(r'https?://\S+', '', s)
tok = lambda s: re.findall(r"[#@]?\w+", s.lower())
sw = set("""a o as os um uma uns umas de do da dos das em no na nos nas por pra para com sem sob sobre e ou mas que se como já só não nao é são foi ser tem têm ter vai vão vou vamos há mais menos muito muita muitos muitas também até então isso isto esse essa esses essas este esta estes estas aqui ali lá eu tu ele ela eles elas nós vocês você voce vcs me te lhe nos seu sua seus suas meu minha meus minhas nosso nossa nossos nossas dele dela deles delas qual quais quando onde porque porquê pq pois ao aos à às num numa pelo pela pelos pelas tá ta tô to né ne aí ai ainda mesmo cada todo toda todos todas outro outra outros outras ver vê fazer faz fazem fez tudo nada algo alguém ninguém""".split())

LEX = {
 'militar': r'ex[eé]rcito|soldad\w*|tropa|batalh\w*|general|marechal|guerra|miss[ãa]o|miss[õo]es|ordem|ordens|comand\w*|convoca\w*|front|ataque\w*|atacar|arma\w*|estratég\w*|tática\w*',
 'urgencia_tiempo': r'\bagora\b|\bjá\b|urgente|imediat\w*|minutos?|horas?|prazo|hoje|rápido|correndo|neste momento|em instantes',
 'sancion_presion': r'expuls\w*|desert\w*|cancelad\w*|fechad\w*|irrevog\w*|improrrog\w*|advert[eê]ncia|n[aã]o aceito|puni\w*|cobrar',
 'identidad_colectiva': r'exército|soldad\w*|tropa|batalh\w*|\bn[óo]s\b|nosso\w*|a gente|juntos|time|família|povo|brasileir\w*',
 'positivo': r'parab[eé]ns|orgulho|incr[ií]vel|hist[óo]ric\w*|linda\w*|amo\b|obrigad\w*|vit[óo]ria|vencer|venceu|show|vamos virar|f[eé]|esperança|gratid\w*|emoc\w*',
 'amenaza_conflicto': r'guerra|ataque\w*|medo|[óo]dio|censura|golpe\w*|mentir\w*|mentira\w*|miliciano|crime|terror\w*|derrubar|apagar|ameaça\w*|perigo\w*|inimig\w*|advers[aá]rio\w*',
 'primera_singular': r'\beu\b|\bmeu\b|\bminha\b|\bvou\b|\bme\b|\bmim\b',
 'primera_plural': r'\bn[óo]s\b|\bnosso\w*|\bvamos\b|\ba gente\b|\bestamos\b',
 'segunda_persona': r'\bvoc[eê]s?\b|\bvcs\b|\bseu\b|\bsua\b|\bseus\b|\bsuas\b|\bsoldados?\b',
 'imperativo': r'\b(suba\w*|curt\w*m|comentem|compartilh\w*m|assistam|pesquisem|entrem|postem|enviem|mandem|usem|copiem|colem|digitem|marquem|sigam|traga\w*|tragam|expl[oó]d\w*|ativem|fixem|divulguem|espalhem|joguem|cliquem|apertem|rodem|deixem|ajudem|avisem|chamem|convidem|fa[çc]am|lembrem|confiem)\b',
}
sia = SentimentIntensityAnalyzer()
rows = []
for p, _, _ in BOUNDS:
    ds = [clean(t) for t in txt[txt.fase == p].texto]
    text = ' '.join(ds); words = tok(text); nw = len(words)
    letters = [c for c in text if c.isalpha()]
    sc = [sia.polarity_scores(d)['compound'] for d in ds if len(d.split()) >= 4]
    r = dict(fase=p, descripcion=FASES[p], lineas=len(ds), palabras=nw, ttr=round(len(set(words)) / nw, 3),
             palabras_por_linea=round(nw / len(ds), 1), mayusculas_pct=round(100 * sum(c.isupper() for c in letters) / len(letters), 1),
             exclamaciones_por_100=round(100 * text.count('!') / nw, 1), hashtags=len(re.findall(r'#\w+', text)),
             sentimiento_medio=round(float(np.mean(sc)), 3), lineas_positivas_pct=round(100 * float(np.mean([s > 0.05 for s in sc])), 1),
             lineas_negativas_pct=round(100 * float(np.mean([s < -0.05 for s in sc])), 1))
    for k, rg in LEX.items():
        r[k + '_por_1000'] = round(1000 * len(re.findall(rg, text, re.I)) / nw, 1)
    rows.append(r)
pd.DataFrame(rows).to_csv('data/nlp_fases.csv', index=False)

# palabras distintivas por fase (razón de log-odds con prior informativo, Monroe et al. 2008)
cnt = {p: collections.Counter(w for w in tok(' '.join(clean(t) for t in txt[txt.fase == p].texto))
                              if w not in sw and len(w) > 2 and not w.isdigit()) for p, _, _ in BOUNDS}
tot = sum(cnt.values(), collections.Counter()); V = len(tot); out = []
for p in cnt:
    c1 = cnt[p]; c2 = tot - c1; n1 = sum(c1.values()); n2 = sum(c2.values()); a = 0.5; sc = []
    for w in c1:
        l1 = math.log((c1[w] + a) / (n1 + a * V - c1[w] - a)); l2 = math.log((c2[w] + a) / (n2 + a * V - c2[w] - a))
        sc.append(((l1 - l2) / math.sqrt(1 / (c1[w] + a) + 1 / (c2[w] + a)), w, c1[w]))
    for z, w, c in sorted(sc, reverse=True)[:15]:
        out.append(dict(fase=p, palabra=w, frecuencia=c, z=round(z, 2)))
pd.DataFrame(out).to_csv('data/nlp_palabras_distintivas.csv', index=False)

big = collections.Counter()
for t in txt.texto:
    tk = [w for w in tok(clean(t)) if len(w) > 1]
    for a, b in zip(tk, tk[1:]):
        if a not in sw and b not in sw:
            big[(a, b)] += 1
pd.DataFrame([dict(par=' '.join(k), frecuencia=v) for k, v in big.most_common(40)]).to_csv('data/nlp_bigramas.csv', index=False)

# temas (NMF)
msgs = [clean(t) for t in txt.texto if len(clean(t).split()) >= 5]
vec = TfidfVectorizer(stop_words=list(sw), min_df=3, token_pattern=r"[#@]?\b\w\w+\b", lowercase=True)
X = vec.fit_transform(msgs)
nm = NMF(n_components=6, random_state=0, init='nndsvd', max_iter=500).fit(X)
terms = vec.get_feature_names_out(); W = nm.transform(X).argmax(1); topics = []
for k, comp in enumerate(nm.components_):
    idx = comp.argsort()[::-1][:10]
    topics.append(dict(tema=k + 1, mensajes_pct=round(100 * float((W == k).mean()), 1),
                       terminos=[terms[i] for i in idx], pesos=[round(float(comp[i]), 3) for i in idx]))
json.dump(dict(n_mensajes=len(msgs), temas=topics), open('data/nlp_temas.json', 'w'), ensure_ascii=False, indent=1)
print('listo: fases, palabras distintivas, bigramas y temas')
