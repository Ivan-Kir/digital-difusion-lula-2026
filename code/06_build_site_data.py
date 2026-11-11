"""Ensambla assets/data.js (datos para los gráficos) y las tablas manuales descargables (data/tablas_*.csv).
Los valores «manuales» provienen de las fuentes citadas en el informe (informes de plataformas, TSE, encuestas,
estimaciones ecológicas y capturas); cada tabla indica su fuente.
Uso: python3 code/06_build_site_data.py  (después de 01-05)"""
import json, csv
import pandas as pd

def rd(p): return pd.read_csv(p).where(lambda d: d.notna(), None).to_dict('records')
J = lambda p: json.load(open(p, encoding='utf-8'))
D = {}

# ---- hitos del canal y eventos
D['hitos'] = [
 dict(t='2026-04-15T14:34', m=0.05, label='Creación del canal (~50 mil en abril)', src='S29,S31'),
 dict(t='2026-10-05T12:00', m=1.0, label='~1 M al inicio de la 2ª vuelta', src='S9'),
 dict(t='2026-10-12T10:00', m=3.0, label='>3 M (Lupa)', src='S1'),
 dict(t='2026-10-12T21:00', m=4.0, label='4 M (hashtag)', src='S26'),
 dict(t='2026-10-17T13:00', m=5.0, label='5 M (hashtag y folleto)', src='S26,S29'),
 dict(t='2026-10-18T22:10', m=5.4, label='5,4 M (chat, antes de la orden de búsquedas)', src='S28'),
 dict(t='2026-10-19T18:00', m=6.0, label='6 M (hashtag)', src='S26'),
 dict(t='2026-10-21T10:00', m=7.0, label='7 M (chat y hashtag)', src='S26,S28'),
 dict(t='2026-10-22T16:06', m=8.2, label='8,2 M (captura)', src='S29'),
 dict(t='2026-10-23T18:00', m=10.0, label='10 M (chat y hashtag)', src='S26,S28'),
 dict(t='2026-10-24T09:00', m=10.6, label='10,6 M (prensa)', src='S9'),
 dict(t='2026-10-25T12:00', m=10.89, label='10.894.817 (captura del directorio, sin fecha)', src='S29')]
D['eventos'] = [
 dict(t='2026-10-04T18:00', label='1ª vuelta', tipo='electoral'), dict(t='2026-10-11T12:00', label='Suspensión y reversión', tipo='judicial'),
 dict(t='2026-10-13T12:00', label='Registro condicionado y espera de 48 h', tipo='judicial'), dict(t='2026-10-15T12:00', label='Plenario dispensa la espera', tipo='judicial'),
 dict(t='2026-10-18T22:00', label='Debate de Band', tipo='debate'), dict(t='2026-10-21T12:00', label='Rumor de baja del canal', tipo='judicial'),
 dict(t='2026-10-23T22:00', label='Debate de Globo y live de 24 h', tipo='debate'), dict(t='2026-10-23T14:00', label='Liminar contra nueva suspensión', tipo='judicial'),
 dict(t='2026-10-25T12:00', label='2ª vuelta', tipo='electoral')]
D['intervalos'] = rd('data/crecimiento_intervalos.csv')

# ---- encuestas
D['encuestas'] = rd('data/encuestas_2a_vuelta.csv'); D['lowess'] = rd('data/encuestas_lowess.csv')
D['mod_encuestas'] = J('data/modelos_encuestas.json'); D['mod_x'] = J('data/modelos_x.json')

# ---- X
D['x_diario'] = rd('data/twitter_archive_diario.csv')
orient = {5:(0,2,0,0,7,6),6:(5,2,0,1,2,5),7:(0,0,1,0,0,14),8:(2,0,1,1,4,7),9:(3,1,2,0,2,7),10:(1,0,0,0,1,13),11:(1,0,0,0,0,14),12:(3,0,2,0,0,10),
 13:(4,2,0,0,2,7),14:(2,3,0,1,3,6),15:(4,1,0,2,3,5),16:(5,1,0,1,4,4),17:(2,2,0,1,2,8),18:(3,0,0,0,0,12),19:(3,3,0,0,5,4),20:(3,4,0,0,2,6),
 21:(1,7,0,0,1,6),22:(6,1,0,0,1,7),23:(6,1,0,0,3,5),24:(6,2,0,0,1,6),25:(0,0,0,0,12,3)}
D['orientacion'] = [dict(dia=d, A=v[0], B=v[1], C=v[2], D=v[3], E=v[4], F=v[5]) for d, v in orient.items()]
pd.DataFrame(D['orientacion']).to_csv('data/getdaytrends_orientacion_manual.csv', index=False)
D['hashtags'] = rd('data/hashtags_chat.csv')

# ---- NLP
D['nlp_fases'] = rd('data/nlp_fases.csv'); D['nlp_palabras'] = rd('data/nlp_palabras_distintivas.csv')
D['nlp_bigramas'] = rd('data/nlp_bigramas.csv'); D['nlp_temas'] = J('data/nlp_temas.json')

# ---- Google
D['gt_resumen'] = J('data/google_trends_resumen.json')
g = pd.read_csv('data/google_trends_consultas.csv'); g = g[g.objetivo.notna()]
D['gt_candidatos'] = g.where(g.notna(), None).to_dict('records')

# ---- resultados y flujos (tablas manuales)
D['resultados'] = dict(
 primera=dict(lula=53879538, flavio=56104503, otros=9316747, validos=119300788, blancos=2300798, nulos=3674249, abstencion_pct=21.08),
 segunda=dict(lula=64256232, flavio=59826041, validos=124082273, blancos_nulos=4153801, abstencion_pct=19.22))
D['flujos_e26'] = [  # grupo, votos (M), a Lula %, a Flávio %, blanco/nulo/no votó %, saldo (M)
 ['Cury', 3.4, 54, 34, 12, 0.69], ['Renan Santos', 2.7, 48, 45, 7, 0.08], ['Caiado', 2.6, 46, 50, 4, -0.10], ['Zema', 0.326, 23, 77, 0, -0.18],
 ['Otros candidatos', 0.261, 79, 20, 1, 0.15], ['Blanco', 2.3, 78, 22, 0, 1.29], ['Nulo', 3.7, 58, 14, 28, 1.62], ['No votó', 33.5, 8, 4, 88, 1.34]]
D['estimadores'] = [  # flujo, e26, lorande secciones, lorande municipios, maia M0, M1, M2
 ['Otros candidatos → Lula', 49.6, 42.4, 52.6, 42.4, 40.9, 58.7], ['Otros candidatos → Flávio', 42.8, 38.1, 35.8, 39.0, 40.6, 26.7],
 ['Blancos → Lula', 78, 69.2, 64.7, 60.9, 59.7, 31.2], ['Nulos → Lula', 58, 59.6, 58.4, 60.9, 59.7, 31.2],
 ['No votó → Lula', 8, 9.5, 6.7, 10.3, 10.5, 9.9], ['Voto de Flávio repetido', 98, 98.8, None, None, None, None], ['Voto de Lula repetido', 100, 98.9, None, None, None, None]]
D['descomposicion'] = [  # origen, e26, lorande secciones, lorande municipios (millones)
 ['Blancos, nulos y abstención', 4.25, 6.05, 5.01], ['Otros candidatos', 0.64, 0.40, 1.56], ['Pérdidas y cambios entre finalistas', 1.77, 0.16, 0.02]]
D['quaest_escenario'] = dict(grupos=['Cury', 'Caiado', 'Renan Santos'], votos_M=[3.449, 2.605, 2.676], lula_pct=[48, 21, 25], flavio_pct=[33, 57, 51])
D['segmentos'] = [  # segmento, datafolha pre (L,F), datafolha 22/10 (L,F), atlas 19/10 (L,F)
 ['Mujeres', [41, 32], [53, 47], [58.9, 39.2]], ['Hombres', None, [46, 54], [35.0, 61.7]], ['Evangélicos', None, [27, 73], [26.3, 69.7]],
 ['Católicos', [43, 32], [59, 41], [51.7, 46.3]], ['Ingreso ≤ 2 s.m.', [46, 29], [58, 42], [55.7, 39.7]], ['Nordeste', [56, 26], [68, 32], None], ['Sur', [27, 45], None, [36.1, 59.5]]]
D['estados'] = [  # estado, Lula 1ª, Lula 2ª (votos), Δ, nota
 ['São Paulo', 9505413, 12119274], ['Minas Gerais', None, None, 1162163], ['Río de Janeiro', None, None, 872372], ['Bahía', None, None, 820487], ['Pernambuco', None, None, 563542], ['Goiás', None, None, 396675]]
D['galileia'] = [['Nikolas Ferreira', 50.7], ['Pablo Marçal', 44.9], ['Flávio Bolsonaro', 36.4], ['André Janones', 23.0]]
D['netlab_anuncios'] = [['20–22/10', 121, None], ['23–24/10', 222, 196], ['23–25/10', 394, 328]]
D['netlab_recs'] = [  # plataforma, % políticas 5–24/10, % políticas 24–25/10, recs, recs candidatos
 ['TikTok', 25.9, 35.6, 14234, 80], ['YouTube', 7.86, 8.32, 16894, 21], ['Instagram', 11.7, 56.4, 40612, 1]]
D['reel'] = dict(vistas=4.8e6, likes=1.0e6, comentarios=695e3, envios=576e3, reposts=179e3)
D['reacciones'] = [['👍', 100000], ['❤️', 16300], ['😮', 1500], ['😂', 476], ['👈', 309], ['🙏', 246], ['❤ (otro)', 149], ['💩', 142], ['👏', 113], ['🖕', 78], ['💪', 69]]
D['precios'] = dict(p2022=[8.49, 3.79, 4.19, 16.95, 17.95, 18.95, 5.99, 7.29, 3.89, 4.57, 16.98, 1.19], p2026=[6.47, 2.87, 3.19, 13.95, 16.95, 15.95, 3.99, 6.79, 2.99, 3.99, 15.97, 1.09])
D['imagenes'] = [
 [1, 'retrato', 'Janones junto a la cola del avión presidencial VC-1'], [2, 'retrato', 'Lula y Janones con saludo militar'], [3, 'retrato', 'Janones con micrófono en el estudio'],
 [4, 'retrato', 'Lula hablando en la mesa del estudio'], [5, 'pieza', 'Cartel «Junte-se ao Exército do Lula» (estética de ilustración generativa)'],
 [6, 'medios', 'Metrópoles: «Pesquisa interna do PT gera euforia na campanha de Lula»'], [7, 'tendencias', 'Tendencias de X: #PowerpointDoFlavio, NÃO CALEM OS NORDESTINOS, #ExplicaAnaClaraFlavio, #OExercitoDoLulaVoltou'],
 [8, 'retrato', 'Janones internado mirando a Lula por TV'], [9, 'debate', 'Debate de Band: Flávio y Lula en escena'], [10, 'debate', 'Debate de Band: ambos en el estudio'],
 [11, 'debate', 'Debate de Band: Lula en el podio'], [12, 'retrato', 'Janones con camiseta verde «Brasil não é quintal de ninguém» en el estudio'],
 [13, 'medios', 'Bacci Notícias: «Lula tem 46,4% e Flávio 44,6% no 2º turno»'], [14, 'pieza', 'Carteles en un edificio: «Lula fez o favelado virar doutor»'],
 [15, 'debate', 'Lula en el set del debate'], [16, 'debate', 'Debate de Band: Flávio muestra la palma con una palabra escrita; tiempos 09:44 y 10:46'],
 [17, 'debate', 'Cruce: «Fica aqui perto de mim, Lula» / «Eu não quero ficar perto de miliciano»'], [18, 'debate', 'Platea: Janones con el celular junto a otros asistentes'],
 [19, 'debate', 'Lula rodeado de prensa tras el debate'], [20, 'medios', 'Tuit de Revista Fórum (18/10, 23:12): indecisos reprueban la agresividad de Flávio'],
 [21, 'presencial', 'Concentración con camisetas «13»'], [22, 'tendencias', 'Tendencias de X a las 17:58 (#ExplicaAnaClaraFlavio 7.º, #OExercitoDoLulaVoltou 9.º)'],
 [23, 'tendencias', 'Explorar en X a las 17:59 (#LulaEmJuazeiro, BOLSONARO MANDOU MATAR LULA, #PowerpointDoFlavio, #NordestinosComLula)'],
 [24, 'pieza', 'Cartel «É hoje, Lula em BH» (21/10, 15 h, Praça da Estação)'], [25, 'pieza', 'Folleto con QR: «ele já tem 5 milhões de seguidores»; pide llevar al menos tres personas'],
 [26, 'pieza', 'Infografía «Mandamentos do Exército»: siete órdenes y dos reglas'], [27, 'canal', 'Tarjeta de contacto «Marechal Lula da Silva»'],
 [28, 'pieza', 'Cartel «Explode a live: Marechal e General» (19 h, YouTube de André Janones)'], [29, 'canal', 'Canal con 8,2 M de seguidores; mensaje con 120.551 reacciones'],
 [30, 'retrato', 'Janones con el gesto de la «L»'], [31, 'retrato', 'Janones y Lula en el estudio'], [32, 'retrato', 'Lula mirando en el celular la selfie con Janones'],
 [33, 'retrato', 'Janja y Lula en bastidores'], [34, 'debate', 'Platea del debate de Globo: asiento del PT y asistente con camiseta «Clara»'],
 [35, 'pieza', 'Infografía de precios 2022 y 2026 (12 productos; «montaje comparativo, no es encarte oficial»)'], [36, 'retrato', 'Janones y Lula con las manos juntas (foto oficial)'],
 [37, 'retrato', 'Janones con la camiseta de la selección y Lula'], [38, 'canal', 'Mosaico de cuatro videos de entrevistas callejeras sobre la elección'],
 [39, 'canal', 'Directorio de canales: Exército do Lula (10.894.817) y Tropa do Flávio (2.144.044)'], [40, 'canal', 'Reel de Janones: 4,8 M de vistas, 695 mil comentarios, 179 mil reposts, 576 mil envíos'],
 [41, 'canal', 'Mensaje del canal: promesa de no difundir noticias falsas («fase de reclutamiento»)'], [42, 'canal', 'Directriz del 12/10: respeto a las religiones y #LulaComAparecida'],
 [43, 'canal', 'Mensaje de misión con video «O nosso exército» (canal con 3,8 M de seguidores)']]
D['imagenes'] = [dict(n=a, categoria=b, texto=c, thumb=f'images/thumb/img_{a:02d}.jpg', full=f'images/full/img_{a:02d}.jpg') for a, b, c in D['imagenes']]
pd.DataFrame(D['imagenes']).to_csv('data/galeria_imagenes.csv', index=False)


D['cronologia'] = [dict(fecha=a, hecho=b, tipo=c, fuente=d) for a, b, c, d in [
 ('15/4', 'Se crea el canal «Exército do Lula» (14:34); ~50 mil miembros en abril.', 'canal', '[S29,S31]'),
 ('3/10', 'Víspera de la 1ª vuelta: seis de siete institutos daban a Lula por delante (Datafolha 45–42; Quaest 46–45; AtlasIntel 47–44,1).', 'encuesta', '[S22]'),
 ('4/10', '1ª vuelta: Flávio 47,03% (56.104.503), Lula 45,16% (53.879.538), Cury 2,89%, Renan Santos 2,24%, Caiado 2,18%; abstención 21,08%.', 'electoral', '[S34]'),
 ('4–8/10', 'Hashtags de fandoms (#FandomsComLula, #ArmysComLula, #StaysComLula): 109 apariciones en el top-10 de X.', 'x', '[S26]'),
 ('5–7/10', 'Janones activa el canal para la 2ª vuelta. El 6/10 «EXÉRCITO DO LULA» y «Janones» entran a la lista diaria; a las 21:07 se crea «Tropa do Flávio».', 'canal', '[S1,S27,S29]'),
 ('7/10', 'Video Lula–Janones; «Janones» en el top-10 de 9 a 18 h.', 'canal', '[S1,S26]'),
 ('~8/10', 'El canal promete no difundir noticias falsas y dice estar en «fase de reclutamiento».', 'canal', '[S1,S29]'),
 ('8–9/10', 'AtlasIntel: Flávio 52,8%–Lula 47,2% (válidos). Cury y Caiado apoyan a Flávio.', 'encuesta', '[S20b]'),
 ('10–12/10', 'PoderData: 51–49 (Lula +2 en 5 días). #EXERCITODOLULACONTRACENSURA encabeza la lista diaria el 10/10.', 'encuesta', '[S21,S27]'),
 ('11/10', 'Nunes Marques suspende el canal a pedido de la campaña de Flávio; Villas Bôas Cueva lo revierte el mismo día. Actos callejeros del PT (11–12/10).', 'judicial', '[S1,S4,S13]'),
 ('12/10', 'Canal con más de 3 M; el TSE técnico no halla contenido falso. A las 10:03 el canal pide subir #LulaComAparecida: top-10 de 10 a 19 h.', 'canal', '[S1,S26,S29]'),
 ('12–13/10', 'La noche del 12/10 aparece #Somos4Milhões (4 M). El 13/10 Nunes Marques condiciona la operación al registro como propaganda y exige 48 h de espera.', 'judicial', '[S4,S11,S26]'),
 ('14–15/10', 'El 14 se libera el canal; el 15 el plenario del TSE dispensa la espera de 48 h para direcciones registradas entre vueltas. Video «celular de Janja».', 'judicial', '[S11,S31b]'),
 ('17/10', '#Somos5Milhões; folleto impreso: «ya tiene 5 millones».', 'canal', '[S26,S29]'),
 ('18/10', 'Acto en Copacabana (16 h). Debate de Band (noche). A las 22:10 el canal ordena buscar tres términos en Google; canal con 5,4 M. Janones es internado por arritmia (alta el 20/10).', 'debate', '[S26,S28,S31c]'),
 ('19/10', 'AtlasIntel: Flávio 51,1–Lula 48,9 (válidos). Meta anuncia restricciones a anuncios políticos. Bites: Lula tiene 5,1 veces más interacciones que Flávio tras el debate.', 'plataforma', '[S15,S20]'),
 ('20/10', 'Actos en Juazeiro y Petrolina. #PesquiseBolsonaroMandouMatarLula (X: 307.583 publicaciones en la 1ª hora). Meta de 7 M. NetLab: 121 anuncios irregulares (20–22/10).', 'canal', '[S5,S8,S28]'),
 ('21/10', 'Acto en Belo Horizonte. El canal supera 7 M y se reabre con nuevo enlace; rumor de baja y plan de contingencia. Quaest: Flávio 45–Lula 44. Flávio vuelve al TSE.', 'judicial', '[S10,S28,S32b]'),
 ('22/10', 'Canal con 8,2 M (16:06). Live con Lula a las 19 h («10 M o la live se cancela»). Datafolha: 50–50. El TSE pide informes a Meta, Google y X.', 'canal', '[S4,S19,S28,S29]'),
 ('23/10', 'Informes de las plataformas sin violaciones sustanciales; liminar contra nueva suspensión administrativa. El canal se cierra hasta los 10 M y los alcanza por la noche. Debate de Globo y live de 24 h (>800 mil simultáneos).', 'debate', '[S5,S9b,S11,S28]'),
 ('24/10', 'Lula entra a la live; acto en la Paulista; canal ~10,6 M. NetLab: Meta incumple la suspensión de anuncios (222 anuncios, 196 anunciantes, 23–24/10).', 'plataforma', '[S8,S9]'),
 ('25/10', '2ª vuelta: Lula 64.256.232 (51,79%), Flávio 59.826.041 (48,21%); abstención 19,22%. NetLab: 394 anuncios irregulares de 328 anunciantes (23–25/10).', 'electoral', '[S8,S16,S17]')]]

# ---- fuentes
D['fuentes'] = json.load(open('code/fuentes.json', encoding='utf-8'))
for k, cols in {'flujos_e26': ['grupo', 'votos_M', 'a_Lula_pct', 'a_Flavio_pct', 'blanco_nulo_no_voto_pct', 'saldo_Lula_M'],
                'estimadores': ['flujo', 'e26_ElAtlas', 'lorande_secciones', 'lorande_municipios', 'maia_M0', 'maia_M1', 'maia_M2'],
                'descomposicion': ['origen', 'e26_M', 'lorande_secciones_M', 'lorande_municipios_M'],
                'netlab_anuncios': ['ventana', 'anuncios', 'anunciantes'], 'netlab_recs': ['plataforma', 'pct_politicas_5_24', 'pct_politicas_24_25', 'recomendaciones', 'recs_de_candidatos'],
                'galileia': ['perfil', 'interacciones_M']}.items():
    pd.DataFrame(D[k], columns=cols).to_csv(f'data/tablas_{k}.csv', index=False)
with open('assets/data.js', 'w', encoding='utf-8') as f:
    f.write('window.DATA=' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';')
print('assets/data.js', round(len(open('assets/data.js', encoding='utf-8').read()) / 1024), 'KB')
