"""Encuestas de 2ª vuelta (Lula contra Flávio Bolsonaro): regresión local (LOWESS), modelo de mínimos cuadrados
ponderados con efectos fijos por instituto y estimación del efecto de los debates.
Las 69 encuestas se compilaron de la tabla de Wikipedia («Opinion polling for the 2026 Brazilian presidential election»)
y de prensa (PoderData, AtlasIntel, Quaest, Datafolha, Vox del 10 al 24/10). Las fechas marcadas como aproximadas
corresponden al cierre de campo informado por la prensa.
Uso: python3 code/04_encuestas_lowess.py   (pip install pandas numpy statsmodels)
Salidas: data/encuestas_2a_vuelta.csv, data/encuestas_lowess.csv, data/modelos_encuestas.json"""
import json, datetime as dt
import numpy as np, pandas as pd
import statsmodels.formula.api as smf
from statsmodels.nonparametric.smoothers_lowess import lowess

D = lambda m, d: dt.date(2026, m, d)
rows = [
 ('Nexus', D(8,16), 47, 44, 2003), ('Datafolha', D(8,20), 47, 43, 2058), ('Indexa', D(8,23), 46, 41, 2000), ('Nexus', D(8,23), 46, 45, 2006),
 ('PoderData', D(8,26), 45, 44, 2400), ('Vox', D(8,27), 44.5, 45.1, 2100), ('Atlas', D(8,30), 47.1, 42.6, 5014), ('Nexus', D(8,30), 46, 45, 2005),
 ('Real Time', D(8,31), 44, 44, 2000), ('Futura', D(9,1), 45.6, 45.2, 2000), ('Quaest', D(9,1), 42, 41, 2005), ('PoderData', D(9,2), 44, 45, 3000),
 ('Datafolha', D(9,2), 46, 44, 2002), ('Quaest', D(9,6), 41, 41, 2004), ('Nexus', D(9,7), 45, 46, 2002), ('Ideia', D(9,7), 46, 46, 1500),
 ('Palver', D(9,7), 44, 46, 5000), ('Atlas', D(9,9), 46.2, 46.4, 5000), ('PoderData', D(9,9), 45, 47, 3000), ('Futura', D(9,10), 45, 45.4, 2000),
 ('Datafolha', D(9,10), 46, 44, 2002), ('MDA', D(9,13), 47.3, 40, 2002), ('Indexa', D(9,13), 43, 42, 2000), ('Quaest', D(9,13), 40, 42, 2004),
 ('Nexus', D(9,13), 47, 46, 2003), ('Futura', D(9,15), 43.7, 48.1, 2000), ('Atlas', D(9,16), 46.8, 47.2, 5018), ('PoderData', D(9,16), 44, 46, 3000),
 ('Datafolha', D(9,16), 46, 44, 2002), ('Palver', D(9,20), 43, 47, 5000), ('Quaest', D(9,20), 41, 42, 2004), ('Nexus', D(9,20), 46, 45, 2006),
 ('Atlas', D(9,22), 47.7, 47.4, 5015), ('Real Time', D(9,23), 44, 45, 2000), ('Palver', D(9,23), 45, 48, 5000), ('PoderData', D(9,23), 45, 46, 3000),
 ('Futura', D(9,24), 43.7, 49.4, 2000), ('Datafolha', D(9,24), 47, 45, 2002), ('Palver', D(9,27), 45, 47, 5000), ('Quaest', D(9,27), 42, 42, 2004),
 ('Nexus', D(9,27), 46, 44, 2000), ('Atlas', D(9,28), 47.6, 47.7, 5005), ('Ideia', D(9,28), 48.5, 48, 2000), ('Vox', D(9,28), 44.7, 45.2, 2100),
 ('Futura', D(9,29), 43.5, 49, 2000), ('Indexa', D(9,29), 43, 42, 2000), ('Real Time', D(9,30), 45, 46, 2000), ('Datafolha', D(9,30), 48, 45, 2506),
 ('Vox', D(10,1), 45.2, 48.2, 2100), ('Atlas', D(10,2), 47.6, 47.4, 4945), ('MDA', D(10,2), 47, 43, 2007), ('PoderData', D(10,2), 46, 46, 4000),
 ('Palver', D(10,3), 44, 49, 5000), ('Futura', D(10,3), 45.1, 48, 2000), ('Quaest', D(10,3), 42, 44, 3702), ('Datafolha', D(10,3), 47, 46, 4006),
 ('PoderData', D(10,7), 44, 49, 3000), ('Vox', D(10,7), 44.2, 42.7, 2100), ('Datafolha', D(10,7), 45, 49, 2520), ('Atlas', D(10,8), 45.7, 51.1, 5026),
 ('Ipespe', D(10,8), 44, 49, 1500),
 ('PoderData', D(10,12), 49, 51, 2400), ('Quaest', D(10,20), 44, 45, 2154), ('Atlas', D(10,19), 47.6, 49.8, 4990), ('Datafolha', D(10,22), 50, 50, 2500),
 ('Vox', D(10,23), 46.4, 44.6, 2100), ('Atlas', D(10,23), 49.2, 50.8, 4990), ('Datafolha', D(10,24), 49, 51, 4050), ('Quaest', D(10,24), 49, 51, 3702)]
df = pd.DataFrame(rows, columns=['instituto', 'cierre_campo', 'lula', 'flavio', 'n'])
df['cierre_campo'] = pd.to_datetime(df.cierre_campo)
df['fecha_aproximada'] = (df.cierre_campo >= pd.Timestamp(2026, 10, 12)).astype(int)
df['t'] = (df.cierre_campo - pd.Timestamp(2026, 10, 4)).dt.days
df['lula_validos'] = 100 * df.lula / (df.lula + df.flavio)
df['flavio_validos'] = 100 - df.lula_validos
df.round(2).to_csv('data/encuestas_2a_vuelta.csv', index=False)

x = df.t.values; y = df.lula_validos.values; grid = np.arange(-50, 21)
fit = lambda xx, yy, frac: np.interp(grid, *lowess(yy, xx, frac=frac, return_sorted=True).T)
rng = np.random.default_rng(1); B = 500; out = []
for frac in (0.3, 0.5):
    est = fit(x, y, frac); boots = []
    for _ in range(B):
        i = rng.integers(0, len(x), len(x))
        try: boots.append(fit(x[i], y[i], frac))
        except Exception: pass
    lo, hi = np.percentile(boots, [2.5, 97.5], axis=0)
    for g, e, l, h in zip(grid, est, lo, hi):
        out.append(dict(fraccion=frac, t=int(g), fecha=str((pd.Timestamp(2026, 10, 4) + pd.Timedelta(days=int(g))).date()),
                        estimacion=round(float(e), 2), ic95_inf=round(float(l), 2), ic95_sup=round(float(h), 2)))
pd.DataFrame(out).to_csv('data/encuestas_lowess.csv', index=False)

df['post'] = (df.t >= 0).astype(int); df['tpost'] = np.maximum(df.t, 0)
df['band'] = (df.cierre_campo >= pd.Timestamp(2026, 10, 18)).astype(int)
w = np.sqrt(df.n)
m1 = smf.wls('lula_validos ~ C(instituto) + t + post + tpost', data=df, weights=w).fit(cov_type='HC1')
m2 = smf.wls('lula_validos ~ C(instituto) + t + post + tpost + band', data=df, weights=w).fit(cov_type='HC1')
coef = lambda m, k: dict(coef=round(float(m.params[k]), 3), ee=round(float(m.bse[k]), 3), p=round(float(m.pvalues[k]), 3),
                         ic95=[round(float(v), 2) for v in m.conf_int().loc[k]])
res = dict(n_encuestas=len(df), r2=round(float(m1.rsquared), 3),
           tendencia_previa_pp_dia=coef(m1, 't'), salto_post_1a_vuelta=coef(m1, 'post'), pendiente_posterior_pp_dia=coef(m1, 'tpost'),
           modelo_con_debate_band=dict(band=coef(m2, 'band'), r2=round(float(m2.rsquared), 3)),
           efectos_instituto={k.split('T.')[1].rstrip(']'): round(float(v), 2) for k, v in m1.params.items() if 'instituto' in k})
# medias ajustadas por efecto de instituto, antes/entre/después de los debates
pre = df[df.t < 0]; m0 = smf.wls('lula_validos ~ C(instituto)', data=pre, weights=np.sqrt(pre.n)).fit()
he = m0.params
d = df[df.t >= 0].copy()
d['aj'] = d.apply(lambda r: r.lula_validos - he.get(f'C(instituto)[T.{r.instituto}]', 0), axis=1)
d['periodo'] = np.where(d.cierre_campo < pd.Timestamp(2026, 10, 18), '1) tras la 1ª vuelta, antes de Band',
                np.where(d.cierre_campo < pd.Timestamp(2026, 10, 23), '2) entre Band y Globo', '3) desde Globo'))
res['medias_ajustadas'] = [dict(periodo=k, n=int(v.size), media=round(float(v.mean()), 2)) for k, v in d.groupby('periodo').aj]
res['media_cruda_antes_despues_band'] = [dict(grupo=('después de Band' if k else 'antes de Band'), n=int(v.size), media=round(float(v.mean()), 2))
                                         for k, v in d.groupby(d.cierre_campo >= pd.Timestamp(2026, 10, 18)).lula_validos]
json.dump(res, open('data/modelos_encuestas.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps({k: res[k] for k in ('r2', 'tendencia_previa_pp_dia', 'salto_post_1a_vuelta', 'pendiente_posterior_pp_dia', 'medias_ajustadas')}, ensure_ascii=False))
