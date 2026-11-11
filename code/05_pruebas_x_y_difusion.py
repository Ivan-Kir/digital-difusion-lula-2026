"""Pruebas estadísticas sobre las series de X, crecimiento del canal por intervalos y razones de ramificación.
Uso: python3 code/05_pruebas_x_y_difusion.py   (requiere haber corrido 01 y 02; pip install scikit-learn statsmodels scipy)
Salidas: data/modelos_x.json, data/crecimiento_intervalos.csv"""
import json, re, unicodedata
import numpy as np, pandas as pd
from scipy import stats
import statsmodels.api as sm
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import LeaveOneOut
from sklearn.metrics import roc_auc_score, roc_curve

diario = pd.read_csv('data/twitter_archive_diario.csv').set_index('dia')
hs = pd.read_csv('data/hashtags_chat.csv')
snap = pd.read_csv('data/twitter_archive_snapshots.csv'); snap['tendencia'] = snap.tendencia.fillna('')
norm = lambda s: re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower())
snap['tn'] = snap.tendencia.map(norm)
out = {}

# 1) horas con hashtags de movilización antes y después del 10/10
pre = diario.loc[4:9, 'horas_movilizacion']; post = diario.loc[10:24, 'horas_movilizacion']
u = stats.mannwhitneyu(post, pre, alternative='greater')
out['mann_whitney'] = dict(n_pre=len(pre), n_post=len(post), mediana_pre=float(pre.median()), mediana_post=float(post.median()),
                          media_pre=round(float(pre.mean()), 1), media_post=round(float(post.mean()), 1), U=float(u.statistic), p=round(float(u.pvalue), 4))

# 2) ¿qué predice que una hashtag ordenada entre al top-10? (n = 48)
size = hs.fase.map({'A': 5.4, 'B': 5.4, 'C': 6.3, 'D': 7.7, 'E': 10.0, 'F': 10.8}).values
y = (hs.apariciones > 0).astype(int).values
atk = hs.hashtag.str.contains('flavio|bolsonaro', case=False).astype(int).values
ln = hs.hashtag.str.len().values - 1
X = sm.add_constant(np.column_stack([size, atk, ln]))
m = sm.Logit(y, X).fit(disp=0)
out['logit'] = dict(variables=['constante', 'tamaño_canal_M', 'nombra_a_Flavio', 'longitud'],
                    coef=[round(float(v), 3) for v in m.params], p=[round(float(v), 3) for v in m.pvalues],
                    OR_tamano=round(float(np.exp(m.params[1])), 2))
clf = LogisticRegression(C=1e3).fit(size.reshape(-1, 1), y)
out['or_por_millon'] = round(float(np.exp(clf.coef_[0][0])), 2)
auc = roc_auc_score(y, size)
rng = np.random.default_rng(0)
perm = [roc_auc_score(rng.permutation(y), size) for _ in range(5000)]
loo_size = np.zeros(48); loo3 = np.zeros(48); Xs = np.column_stack([size, atk, ln])
for tr, te in LeaveOneOut().split(Xs):
    c = LogisticRegression(C=1e3).fit(size[tr].reshape(-1, 1), y[tr]); loo_size[te] = c.predict_proba(size[te].reshape(-1, 1))[:, 1]
    mu, sd = Xs[tr].mean(0), Xs[tr].std(0)
    c3 = LogisticRegression(C=1.0, max_iter=1000).fit((Xs[tr] - mu) / sd, y[tr]); loo3[te] = c3.predict_proba((Xs[te] - mu) / sd)[:, 1]
fpr, tpr, thr = roc_curve(y, loo_size)
out['roc'] = dict(auc_tamano=round(float(auc), 3), p_permutacion=round(float(np.mean(np.array(perm) >= auc)), 4),
                  auc_loo_tamano=round(float(roc_auc_score(y, loo_size)), 3), auc_loo_3vars=round(float(roc_auc_score(y, loo3)), 3),
                  fpr=[round(float(v), 3) for v in fpr], tpr=[round(float(v), 3) for v in tpr], umbral=[round(float(min(v, 1)), 3) for v in thr],
                  positivos=int(y.sum()), n=int(len(y)))
tab = hs.assign(entra=(hs.apariciones > 0).astype(int)).groupby('fase').agg(ordenadas=('n', 'size'), entran=('entra', 'sum'))
tab['tasa'] = (tab.entran / tab.ordenadas).round(3); tab['miembros_M'] = [5.4, 5.4, 6.3, 7.7, 10.0, 10.8]
rho = stats.spearmanr(tab.loc[list('BCDEF'), 'miembros_M'], tab.loc[list('BCDEF'), 'tasa'])
out['tasa_por_fase'] = tab.reset_index().to_dict('records'); out['spearman_tasa_tamano_BF'] = dict(rho=round(float(rho.statistic), 3), p=round(float(rho.pvalue), 4))

def seq(ix):
    xs, ys = [], []
    for i in ix:
        r = hs[hs.n == i].iloc[0]
        if isinstance(r.primera, str) and r.primera:
            d, hh = r.primera.split('/10 '); xs.append(len(xs)); ys.append(int(d) * 24 + int(hh[:2]))
    s = stats.spearmanr(xs, ys); return dict(n=len(xs), rho=round(float(s.statistic), 3), p=round(float(s.pvalue), 4), horas_absolutas=ys)
out['orden_vs_hora'] = dict(debate_band=seq([4, 6, 8, 11, 12, 13, 15]), live_22_10=seq([26, 28, 29, 30, 31, 32]), globo_24_10=seq([39, 40, 41, 42, 43]))

# 3) tamaño del canal vs presencia en tendencias (8 fechas con dato)
size_dia = {12: 3.0, 15: 4.0, 19: 5.6, 21: 7.0, 22: 8.3, 23: 10.0, 24: 10.6, 25: 11.0}
s = pd.Series(size_dia); sub = diario.loc[s.index]
out['spearman_canal_vs_x'] = {c: dict(rho=round(float(stats.spearmanr(s.values, sub[c].values).statistic), 2), p=round(float(stats.spearmanr(s.values, sub[c].values).pvalue), 2))
                              for c in ['apar_movilizacion', 'apar_lula', 'apar_flavio_bolsonaro']}

# 4) crecimiento del canal por intervalos: hitos anunciados como hashtag («Somos N millones») y datos de prensa/chat/captura
def primera(pat):
    q = snap[snap.tn.str.contains(pat)].sort_values(['dia_oct_2026', 'hora_brt'])
    return None if q.empty else pd.Timestamp(2026, 10, int(q.iloc[0].dia_oct_2026)) + pd.Timedelta(hours=int(q.iloc[0].hora_brt[:2]))
T = pd.Timestamp
pts = [('3 M (Lupa, mañana del 12/10)', T(2026, 10, 12, 10), 3.0),
       ('4 M (hashtag)', primera('somos4milhoes'), 4.0), ('5 M (hashtag)', primera('somos5milhoes'), 5.0),
       ('5,4 M (chat, 18/10 22:10)', T(2026, 10, 18, 22, 10), 5.4), ('6 M (hashtag)', primera('6milhoesporjanones'), 6.0),
       ('7 M (hashtag)', primera('7milhoesdesoldados'), 7.0), ('8,2 M (captura, 22/10 16:06)', T(2026, 10, 22, 16, 6), 8.2),
       ('10 M (hashtag)', primera('somos10milhoes'), 10.0), ('10,6 M (prensa, 24/10)', T(2026, 10, 24, 9), 10.6)]
pts = [p for p in pts if p[1] is not None]; pts.sort(key=lambda p: p[1])
rec = []
for (n0, t0, m0), (n1, t1, m1) in zip(pts, pts[1:]):
    dias = (t1 - t0).total_seconds() / 86400
    rec.append(dict(desde=n0, hasta=n1, inicio=str(t0), fin=str(t1), miembros_ini_M=m0, miembros_fin_M=m1, dias=round(dias, 2),
                    millones_por_dia=round((m1 - m0) / dias, 2), tasa_log_diaria=round(float(np.log(m1 / m0) / dias), 3)))
pd.DataFrame(rec).to_csv('data/crecimiento_intervalos.csv', index=False)
# razones de ramificación y número reproductivo R = exp(r·T)
r_pico, r_fin = 0.123, 0.078
out['difusion'] = dict(
    nuevos_por_miembro_5d=round((10.0 - 5.4) / 5.4, 2), nuevos_por_miembro_11d=round((10.0 - 3.0) / 3.0, 2),
    cumplimiento_maximo_pedido_3=round(((10.0 - 5.4) / 5.4) / 3, 2),
    R={f'T={T_}d': dict(pico=round(float(np.exp(r_pico * T_)), 2), final=round(float(np.exp(r_fin * T_)), 2)) for T_ in (1, 2, 3)},
    factor_crecimiento_5d=round(10.0 / 5.4, 2),
    reel=dict(envios_por_vista=round(576 / 4800, 3), comentarios_por_vista=round(695 / 4800, 3), likes_por_vista=round(1000 / 4800, 3),
              reposts_por_vista=round(179 / 4800, 3), interacciones_por_vista=round(2450 / 4800, 3)),
    reenvios_por_seguidor=round(72.1 / 8200, 4), publicaciones_por_cuenta_x=round(8.2e6 / 475.9e3, 1))
# 5) X alrededor de los debates (medias diarias de apariciones)
b = lambda lo, hi, c: round(float(diario.loc[lo:hi, c].mean()), 1)
out['x_debates'] = dict(
    flavio_antes_band_11_17=b(11, 17, 'apar_flavio_bolsonaro'), flavio_despues_band_19_22=b(19, 22, 'apar_flavio_bolsonaro'),
    lula_antes_band_11_17=b(11, 17, 'apar_lula'), lula_despues_band_19_22=b(19, 22, 'apar_lula'),
    mov_antes_band_11_17=b(11, 17, 'apar_movilizacion'), mov_despues_band_19_22=b(19, 22, 'apar_movilizacion'),
    flavio_globo_23_24=b(23, 24, 'apar_flavio_bolsonaro'), mov_globo_23_24=b(23, 24, 'apar_movilizacion'))
out['censura_por_dia'] = {int(k): int(v) for k, v in diario.loc[10:25, 'apar_censura'].items()}
json.dump(out, open('data/modelos_x.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps({k: out[k] for k in ('mann_whitney', 'or_por_millon', 'spearman_tasa_tamano_BF', 'x_debates')}, ensure_ascii=False))
print(pd.DataFrame(rec)[['desde', 'hasta', 'dias', 'millones_por_dia', 'tasa_log_diaria']].to_string(index=False))
print(out['roc']['auc_tamano'], out['roc']['p_permutacion'], out['roc']['auc_loo_tamano'], out['roc']['auc_loo_3vars'])
