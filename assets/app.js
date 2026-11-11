/* Interacciones del informe. Requiere assets/data.js, assets/charts.js y Plotly. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const DATA = window.DATA;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf = (v, d) => (v == null || v === '' || isNaN(v)) ? '' : Number(v).toLocaleString('es-ES', { maximumFractionDigits: d == null ? 2 : d });

	document.addEventListener("DOMContentLoaded", function () {
		const banner = document.getElementById('aiBanner');
		const closeButton = document.getElementById('closeAiBanner');

		// 1. Manejo del evento de cierre
		closeButton.addEventListener('click', function () {
			banner.style.display = 'none';
			localStorage.setItem('ai_banner_dismissed', 'true');
		});
	});
	const currentYear = new Date().getFullYear();
	document.getElementById("current-year").textContent = currentYear;
	document.getElementById("citation-year").textContent = currentYear;

  /* ---------- CSV ---------- */
  function parseCSV(t) {
    const rows = []; let r = [], f = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c;
    }
    if (f.length || r.length) { r.push(f); rows.push(r); }
    return rows;
  }
  const toCSV = (cols, rows) => [cols.map(c => c.label).join(',')].concat(rows.map(r => cols.map(c => { const v = r[c.k]; const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','))).join('\n');
  const download = (name, text, mime) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime || 'text/csv;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };

  /* ---------- tabla interactiva ---------- */
  function makeTable(host, o) {
    const cols = o.cols, all = o.rows, max = o.max || 400; let sortK = null, dir = 1, q = '';
    host.classList.add('tw');
    host.innerHTML = '<div class="bar"><span class="cap"></span><input type="search" placeholder="Filtrar…" aria-label="Filtrar tabla"><span class="small cnt"></span><button type="button">Descargar CSV</button></div><div class="sc"><table><thead></thead><tbody></tbody></table></div>';
    $('.cap', host).textContent = o.title || '';
    const thead = $('thead', host), tbody = $('tbody', host), cnt = $('.cnt', host);
    thead.innerHTML = '<tr>' + cols.map((c, i) => '<th data-i="' + i + '" class="' + (c.num ? 'num' : '') + '">' + esc(c.label) + '</th>').join('') + '</tr>';
    const cell = (c, r) => { const v = r[c.k]; if (c.html) return v == null ? '' : v; return esc(c.num ? nf(v, c.d) : v); };
    function render() {
      let rows = all.filter(r => !q || cols.some(c => String(r[c.k] == null ? '' : r[c.k]).toLowerCase().includes(q)));
      if (sortK != null) { const c = cols[sortK]; rows = rows.slice().sort((a, b) => { const x = a[c.k], y = b[c.k]; if (x == null) return 1; if (y == null) return -1; return (c.num || (!isNaN(x) && !isNaN(y) && x !== '' && y !== '') ? (+x - +y) : String(x).localeCompare(String(y), 'es')) * dir; }); }
      tbody.innerHTML = rows.slice(0, max).map(r => '<tr>' + cols.map(c => '<td class="' + (c.num ? 'num' : '') + '">' + cell(c, r) + '</td>').join('') + '</tr>').join('');
      cnt.textContent = rows.length > max ? 'mostrando ' + max + ' de ' + nf(rows.length, 0) : nf(rows.length, 0) + ' filas';
      host.dispatchEvent(new CustomEvent('rendered'));
    }
    $$('th', thead).forEach(th => th.onclick = () => { const i = +th.dataset.i; dir = sortK === i ? -dir : 1; sortK = i; $$('th', thead).forEach(x => x.className = x.className.replace(/ ?sorted-\w+/g, '')); th.classList.add(dir > 0 ? 'sorted-asc' : 'sorted-desc'); render(); });
    $('input', host).oninput = e => { q = e.target.value.toLowerCase(); render(); };
    $('button', host).onclick = () => download((o.name || 'tabla') + '.csv', toCSV(cols, all));
    render(); return host;
  }
  window.makeTable = makeTable;
  const pill = t => '<span class="pill ' + esc(t) + '">' + esc(t) + '</span>';
  const link = (u, t) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t || u) + '</a>';
  const num = (k, label, d) => ({ k, label, num: true, d });
  const txt = (k, label) => ({ k, label });
  const TABLES = {
    cronologia: () => ({ title: 'Cronología integrada', name: 'cronologia', cols: [txt('fecha', 'Fecha (2026)'), txt('hecho', 'Hecho'), { k: 'tipo_html', label: 'Tipo', html: true }, txt('fuente', 'Fuentes')], rows: DATA.cronologia.map(r => Object.assign({ tipo_html: pill(r.tipo) }, r)), max: 100 }),
    encuestas: () => ({ title: 'Encuestas de 2ª vuelta (69)', name: 'encuestas_2a_vuelta', cols: [txt('instituto', 'Instituto'), txt('cierre_campo', 'Cierre de campo'), num('lula', 'Lula %', 1), num('flavio', 'Flávio %', 1), num('n', 'n', 0), num('lula_validos', 'Lula, % válidos', 1), num('fecha_aproximada', 'Fecha aprox.', 0)], rows: DATA.encuestas.map(r => Object.assign({}, r, { cierre_campo: String(r.cierre_campo).slice(0, 10) })), max: 100 }),
    hashtags: () => ({ title: 'Hashtags ordenadas en el canal y su paso por el top-10 de X', name: 'hashtags_chat', cols: [num('n', 'N.º', 0), txt('hashtag', 'Hashtag'), txt('fase', 'Fase'), num('apariciones', 'Apariciones', 0), txt('dias', 'Días en el top-10 (apariciones)'), txt('primera', 'Primera entrada')], rows: DATA.hashtags, max: 60 }),
    xdiario: () => ({ title: 'Presencia diaria en el top-10 de X (tabla limpia)', name: 'twitter_archive_diario', cols: [num('dia', 'Día de octubre', 0), num('horas_movilizacion', 'Horas con movilización', 0), num('apar_movilizacion', 'Apariciones de movilización', 0), num('apar_lula', 'Con «Lula»', 0), num('apar_flavio_bolsonaro', 'Con «Flávio/Bolsonaro»', 0), num('apar_censura', 'Censura y «ninguém cala»', 0)], rows: DATA.x_diario, max: 40 }),
    nlpfases: () => ({ title: 'Índices del chat por fase', name: 'nlp_fases', cols: [txt('fase', 'Fase'), txt('descripcion', 'Descripción'), num('palabras', 'Palabras', 0), num('mayusculas_pct', 'Mayúsculas %', 1), num('exclamaciones_por_100', 'Excl./100 pal.', 1), num('militar_por_1000', 'Militar', 1), num('urgencia_tiempo_por_1000', 'Urgencia', 1), num('imperativo_por_1000', 'Imperativos', 1), num('primera_singular_por_1000', '1.ª sing.', 1), num('sentimiento_medio', 'Sentimiento', 3)], rows: DATA.nlp_fases, max: 10 }),
    flujos: () => ({ title: 'Flujos estimados por grupo de la 1ª vuelta (e26 / El Atlas)', name: 'flujos_e26', cols: [txt('0', 'Grupo'), num('1', 'Votos (M)', 3), num('2', '→ Lula %', 0), num('3', '→ Flávio %', 0), num('4', 'Blanco/nulo/no votó %', 0), num('5', 'Saldo para Lula (M)', 2)], rows: DATA.flujos_e26.map(r => Object.assign({}, r)), max: 20 }),
    estimadores: () => ({ title: 'Comparación entre estimadores (% del grupo de origen)', name: 'estimadores', cols: [txt('0', 'Flujo'), num('1', 'e26 / El Atlas', 1), num('2', 'lorande, secciones', 1), num('3', 'lorande, municipios', 1), num('4', 'Maia M0', 1), num('5', 'Maia M1', 1), num('6', 'Maia M2', 1)], rows: DATA.estimadores.map(r => Object.assign({}, r)), max: 20 }),
    segmentos: () => ({ title: 'Segmentos: Lula – Flávio según encuestas', name: 'segmentos', cols: [txt('s', 'Segmento'), txt('d0', 'Datafolha antes de la 1ª vuelta (% total)'), txt('d1', 'Datafolha 22/10 (válidos)'), txt('a1', 'AtlasIntel 19/10')], rows: DATA.segmentos.map(r => ({ s: r[0], d0: r[1] ? r[1].join(' – ') : '', d1: r[2] ? r[2].join(' – ') : '', a1: r[3] ? r[3].join(' – ') : '' })), max: 20 }),
    gtcand: () => ({ title: 'Consultas de Google Trends que nombran a candidatos', name: 'google_trends_candidatos', cols: [txt('consulta', 'Consulta'), txt('objetivo', 'Objetivo'), txt('marco', 'Marco'), num('interes_relativo', 'Interés relativo', 0), txt('crecimiento', 'Crecimiento'), txt('ventana', 'Ventana'), txt('categoria', 'Categoría')], rows: DATA.gt_candidatos, max: 60 }),
    intervalos: () => ({ title: 'Crecimiento del canal por intervalos', name: 'crecimiento_intervalos', cols: [txt('desde', 'Desde'), txt('hasta', 'Hasta'), num('dias', 'Días', 2), num('millones_por_dia', 'Millones por día', 2), num('tasa_log_diaria', 'Tasa log diaria', 3)], rows: DATA.intervalos, max: 20 }),
    netlab: () => ({ title: 'NetLab: recomendaciones políticas por plataforma', name: 'netlab_recs', cols: [txt('0', 'Plataforma'), num('1', '% políticas 5–24/10', 2), num('2', '% políticas 24–25/10', 2), num('3', 'Recomendaciones', 0), num('4', 'De candidatos', 0)], rows: DATA.netlab_recs.map(r => Object.assign({}, r)), max: 10 })
  };
  function initTables() { $$('[data-table]').forEach(h => { const f = TABLES[h.dataset.table]; if (f) makeTable(h, f()); }); }

  /* ---------- índice lateral ---------- */
  function initToc() {
    const ol = $('nav.toc ol'), hs = $$('main h2[id]');
    ol.innerHTML = hs.map(h => '<li><a href="#' + h.id + '">' + esc(h.textContent) + '</a></li>').join('');
    const links = $$('a', ol), map = new Map(hs.map((h, i) => [h, links[i]]));
    const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { links.forEach(l => l.classList.remove('on')); map.get(e.target).classList.add('on'); } }); }, { rootMargin: '-10% 0px -80% 0px' });
    hs.forEach(h => io.observe(h));
  }

  /* ---------- citas [S#] y [R#] ---------- */
  function initCites() {
    const idx = {}; DATA.fuentes.fuentes.forEach(s => idx[s.id] = s.texto); DATA.fuentes.referencias.forEach(r => idx[r.id] = r.texto + ' (' + r.anio + ')');
    const re = /\[((?:[SR]\d+[a-z]?)(?:\s*[,;]\s*[SR]\d+[a-z]?)*)\]/g;
    const w = document.createTreeWalker($('main'), NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement.closest('script,pre,code,a,button,select,option,textarea,.lb,[data-skipcite]') || !re.test(n.nodeValue)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => {
      re.lastIndex = 0; const html = esc(n.nodeValue).replace(re, (m, ids) => '<sup class="c">[' + ids.split(/\s*[,;]\s*/).map(id => '<a class="c" href="#' + (id[0] === 'S' ? 's-' : 'r-') + id + '" title="' + esc(idx[id] || id) + '">' + id + '</a>').join(', ') + ']</sup>');
      const sp = document.createElement('span'); sp.innerHTML = html; n.replaceWith(...sp.childNodes);
    });
  }
  function initSources() {
    const f = $('#lista-fuentes'), r = $('#lista-referencias');
    if (f) f.innerHTML = DATA.fuentes.fuentes.map(s => '<li id="s-' + s.id + '"><b>' + s.id + '</b> · ' + link(s.url, s.texto) + '</li>').join('');
    if (r) r.innerHTML = DATA.fuentes.referencias.map(s => '<li id="r-' + s.id + '"><b>' + s.id + '</b> · ' + esc(s.texto) + ' (' + s.anio + '). ' + link(s.url, s.verificada ? 'Enlace verificado en línea' : 'Buscar en Google Académico') + (s.verificada ? '' : ' <span class="small">— citada de memoria: verificar</span>') + '</li>').join('');
  }

  /* ---------- gráficos ---------- */
  const inited = new Map();
  function runChart(fig) {
    const name = fig.dataset.chart, fn = window.CHARTS[name]; if (!fn) return;
    let plot = $('.plot', fig), tools = $('.tools', fig); const note = $('.note', fig);
    if (!tools) { tools = document.createElement('div'); tools.className = 'tools'; note ? note.before(tools) : fig.appendChild(tools); }
    if (!plot) { plot = document.createElement('div'); plot.className = 'plot'; tools.after(plot); }
    tools.innerHTML = ''; $$('.dyn', fig).forEach(e => e.remove());
    if (fig.dataset.h) plot.style.minHeight = fig.dataset.h + 'px';
    try { fn({ fig, plot, tools }); inited.set(fig, true); } catch (e) { plot.innerHTML = '<p class="small">No se pudo dibujar el gráfico: ' + esc(e.message) + '</p>'; console.error(name, e); }
  }
  function initCharts() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); runChart(e.target); } }), { rootMargin: '400px' });
    $$('.fig[data-chart]').forEach(f => io.observe(f));
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => inited.forEach((_, f) => runChart(f)));
  }

  /* ---------- galería ---------- */
  function initGallery() {
    const host = $('#galeria'); if (!host) return;
    const names = { todas: 'Todas', retrato: 'Retratos y bastidores', debate: 'Debates', pieza: 'Piezas gráficas', medios: 'Capturas de medios', tendencias: 'Capturas de tendencias', canal: 'Capturas del canal', presencial: 'Presencial' };
    const cnt = {}; DATA.imagenes.forEach(i => cnt[i.categoria] = (cnt[i.categoria] || 0) + 1);
    host.innerHTML = '<div class="tabs"></div><div class="gal"></div>';
    const tabs = $('.tabs', host), gal = $('.gal', host); let cur = [], k = 0;
    const lb = document.createElement('div'); lb.className = 'lb'; lb.innerHTML = '<button type="button" aria-label="Cerrar">Cerrar ✕</button><figure><img alt=""><figcaption></figcaption></figure>'; document.body.appendChild(lb);
    const show = i => { k = (i + cur.length) % cur.length; const it = cur[k]; $('img', lb).src = it.full; $('figcaption', lb).textContent = it.n + '. ' + it.texto; lb.classList.add('on'); };
    lb.onclick = e => { if (e.target === lb || e.target.tagName === 'BUTTON') lb.classList.remove('on'); else show(k + 1); };
    document.addEventListener('keydown', e => { if (!lb.classList.contains('on')) return; if (e.key === 'Escape') lb.classList.remove('on'); if (e.key === 'ArrowRight') show(k + 1); if (e.key === 'ArrowLeft') show(k - 1); });
    const draw = c => { cur = DATA.imagenes.filter(i => c === 'todas' || i.categoria === c); gal.innerHTML = cur.map((i, j) => '<figure data-j="' + j + '"><img loading="lazy" src="' + esc(i.thumb) + '" alt="' + esc(i.texto) + '"><figcaption>' + i.n + '. ' + esc(i.texto) + '</figcaption></figure>').join(''); $$('figure', gal).forEach(f => f.onclick = () => show(+f.dataset.j)); };
    Object.keys(names).forEach((c, i) => { const b = document.createElement('button'); b.textContent = names[c] + ' (' + (c === 'todas' ? DATA.imagenes.length : cnt[c] || 0) + ')'; b.setAttribute('aria-pressed', i === 0); b.onclick = () => { $$('button', tabs).forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); draw(c); }; tabs.appendChild(b); });
    draw('todas');
  }

  /* ---------- explorador de datos y visor de código ---------- */
  const FILES = [
    ['Chat del canal (original)', 'raw/chat_exercito_do_lula_18-25oct.txt', 'Chat del Canal Exército de Lula del 18 al 25 de octubre exportado a mano.', 'txt'],
    ['Chat del canal', 'chat_lineas.csv', 'Las 1.217 líneas del historial (18–25/10) con fase, tipo (texto, audio, video, imagen, sticker) y texto. Sin horas de envío.', 'csv'],
    ['Twitter Trending Archive, instantáneas', 'twitter_archive_snapshots.csv', '11.980 filas recopiladas visualmente: día, hora (GMT−3), rango 1–10 y tendencia, cada 30 minutos del 1 al 25/10.', 'csv'],
    ['Twitter Trending Archive, serie diaria', 'twitter_archive_diario.csv', 'Horas con hashtags de movilización y apariciones con «Lula», «Flávio/Bolsonaro» y censura.', 'csv'],
    ['Hashtags ordenadas en el chat', 'hashtags_chat.csv', 'Las 48 hashtags, su fase, apariciones y primera entrada al top-10.', 'csv'],
    ['GetDayTrends, tendencias diarias', 'getdaytrends_diario.csv', 'Las 15 tendencias diarias de GetDayTrends recopiladas visualmente.', 'csv'],
    ['GetDayTrends, orientación manual', 'getdaytrends_orientacion_manual.csv', 'Conteos diarios A–F de la clasificación manual.', 'csv'],
    ['Google Trends (original)', 'raw/google_trends_combined_27oct.csv', '24 reportes recopilados visualmente.', 'csv'],
    ['Google Trends, consultas', 'google_trends_consultas.csv', '1.200 filas de los 24 reportes del 27/10, con objetivo y marco para las consultas sobre candidatos.', 'csv'],
    ['Google Trends, resumen', 'google_trends_resumen.json', 'Cruces por objetivo y marco y proporción política.', 'json'],
    ['Encuestas de 2ª vuelta', 'encuestas_2a_vuelta.csv', '69 encuestas compiladas (instituto, cierre de campo, resultados, n, % de válidos).', 'csv'],
    ['Regresión local', 'encuestas_lowess.csv', 'Estimación y IC 95% (500 réplicas) con fracciones 0,3 y 0,5.', 'csv'],
    ['Modelos de encuestas', 'modelos_encuestas.json', 'Efectos por instituto, tendencia, salto, efecto de los debates y medias ajustadas.', 'json'],
    ['Modelos sobre X', 'modelos_x.json', 'Mann-Whitney, regresión logística, ROC, correlaciones, razones de ramificación y medias en torno a los debates.', 'json'],
    ['Crecimiento del canal por intervalos', 'crecimiento_intervalos.csv', 'Millones de miembros por día entre hitos fechados.', 'csv'],
    ['Lenguaje: índices por fase', 'nlp_fases.csv', 'Léxicos por 1.000 palabras, sentimiento y estilo, por fase.', 'csv'],
    ['Lenguaje: palabras distintivas', 'nlp_palabras_distintivas.csv', 'Las 15 palabras más distintivas por fase (razón de log-odds).', 'csv'],
    ['Lenguaje: pares frecuentes', 'nlp_bigramas.csv', 'Los 40 pares de palabras más frecuentes.', 'csv'],
    ['Lenguaje: temas (NMF)', 'nlp_temas.json', 'Seis temas con términos, pesos y proporción de mensajes.', 'json'],
    ['Flujos de votos (e26 / El Atlas)', 'tablas_flujos_e26.csv', 'Transcripción del gráfico de El Atlas.', 'csv'],
    ['Comparación de estimadores', 'tablas_estimadores.csv', 'e26, lorande y auditoría de Maia.', 'csv'],
    ['Descomposición de la reversión', 'tablas_descomposicion.csv', 'Origen de los 6,6 M de reversión por estimador.', 'csv'],
    ['NetLab: anuncios y recomendaciones', 'tablas_netlab_anuncios.csv', 'Anuncios irregulares en Meta por ventana.', 'csv'],
    ['NetLab: recomendaciones', 'tablas_netlab_recs.csv', 'Recomendaciones políticas por plataforma.', 'csv'],
    ['Casa Galileia / Democracia em Xeque', 'tablas_galileia.csv', 'Interacciones en el ecosistema evangélico.', 'csv'],
    ['Galería de imágenes', 'galeria_imagenes.csv', '43 imágenes del Chat o de notas periodísticas con categoría y descripción.', 'csv'],
    ['Fuentes y referencias', 'fuentes_y_referencias.csv', 'Fuentes de datos, prensa y literatura con enlaces.', 'csv']];
  const CODE = [['01_twitter_archive.py', 'Twitter Trending Archive: tabla a series diarias y cruce con el chat'], ['02_chat_nlp.py', 'Chat: fases, léxicos, sentimiento, palabras distintivas, temas'], ['03_google_trends.py', 'Google Trends: parseo y marcos'], ['04_encuestas_lowess.py', 'Encuestas: LOWESS, modelo con efectos por instituto, debates'], ['05_pruebas_x_y_difusion.py', 'X: pruebas, regresión logística, ROC y difusión'], ['06_build_site_data.py', 'Ensambla assets/data.js y tablas descargables']];
  function initExplorer() {
    const host = $('#explorador'); if (!host) return;
    const view = document.createElement('div'); view.id = 'vista';
    host.innerHTML = '<div class="dl"></div>'; host.appendChild(view);
    const dl = $('.dl', host);
    FILES.forEach((f, i) => {
      const d = document.createElement('div'); d.className = 'it'; const url = 'data/' + f[1];
      d.innerHTML = '<b>' + esc(f[0]) + '</b><span>' + esc(f[2]) + '</span><span class="small mono">' + esc(f[1]) + '</span><div class="a">' + (f[3] === 'pdf' ? '' : '<button type="button">Ver</button>') + '<a href="' + esc(url) + '" download>Descargar</a></div>';
      const b = $('button', d); if (b) b.onclick = () => openFile(f, url);
      dl.appendChild(d);
    });
    async function openFile(f, url) {
      view.innerHTML = '<p class="small">Cargando ' + esc(f[1]) + '…</p>'; view.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); const t = await r.text();
        if (f[3] === 'csv') { const rows = parseCSV(t).filter(r => r.length > 1 || r[0] !== ''); const head = rows[0]; const cols = head.map((h, j) => ({ k: j, label: h })); const body = rows.slice(1).map(r => Object.assign({}, r)); const h = document.createElement('div'); view.innerHTML = ''; view.appendChild(h); makeTable(h, { title: f[0] + ' — ' + f[1], cols, rows: body, max: 500, name: f[1].replace(/\W+/g, '_').replace(/_csv$/, '') }); }
        else { view.innerHTML = '<h4>' + esc(f[0]) + '</h4><pre class="code"></pre>'; $('pre', view).textContent = t.length > 200000 ? t.slice(0, 200000) + '\n… (recortado; descargue el archivo completo)' : t; }
      } catch (e) { view.innerHTML = '<div class="callout warn">No se pudo leer el archivo desde el navegador (' + esc(e.message) + '). Si abrió <code>index.html</code> directamente desde el disco, sirva la carpeta con <code>python3 -m http.server</code> o publíquela en GitHub Pages.</div>'; }
    }
    const cd = $('#codigo'); if (cd) {
      cd.innerHTML = '<div class="tabs"></div><pre class="code">Seleccione un script.</pre>'; const tabs = $('.tabs', cd), pre = $('pre', cd);
      CODE.forEach(c => { const b = document.createElement('button'); b.textContent = c[0]; b.title = c[1]; b.onclick = async () => { $$('button', tabs).forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); try { const r = await fetch('code/' + c[0]); pre.textContent = await r.text(); } catch (e) { pre.textContent = 'No se pudo leer el script (' + e.message + '). Ábralo en la carpeta code/.'; } }; tabs.appendChild(b); });
      const a = document.createElement('a'); a.href = 'code/'; a.textContent = 'Carpeta code/'; a.style.margin = 'auto 0 auto .6rem'; tabs.appendChild(a);
    }
  }

  /* ---------- métricas de los modelos ---------- */
  function initModels() {
    const h = $('#metricas'); if (!h) return; const mx = DATA.mod_x, me = DATA.mod_encuestas, c = (b, s) => '<div class="m"><b>' + b + '</b>' + s + '</div>';
    h.innerHTML = '<div class="metrics">' + [
      c(mx.mann_whitney.p, 'Mann-Whitney: horas de movilización, después frente a antes del 10/10'), c(mx.or_por_millon, 'Cociente de probabilidades de entrar al top-10 por millón de miembros'),
      c(mx.roc.auc_tamano, 'AUC del tamaño del canal (permutación p = ' + mx.roc.p_permutacion + ')'), c(mx.roc.auc_loo_tamano + ' / ' + mx.roc.auc_loo_3vars, 'AUC con validación dejando una fuera (tamaño / 3 variables)'),
      c(me.r2, 'R² del modelo de encuestas con efectos por instituto'), c(me.pendiente_posterior_pp_dia.coef + ' pp/día', 'Pendiente posterior a la 1ª vuelta (p = ' + me.pendiente_posterior_pp_dia.p + ')'),
      c(me.tendencia_previa_pp_dia.coef + ' pp/día', 'Tendencia previa (p = ' + me.tendencia_previa_pp_dia.p + ')'), c(me.modelo_con_debate_band.band.coef + ' pp', 'Efecto estimado del debate de Band (IC 95%: ' + me.modelo_con_debate_band.band.ic95.join(' a ') + ')')].join('') + '</div>';
    const t = document.createElement('div'); h.appendChild(t);
    const rows = Object.entries(me.efectos_instituto).map(([k, v]) => ({ k, v })); makeTable(t, { title: 'Efectos de casa por instituto (puntos, respecto de AtlasIntel)', name: 'efectos_instituto', cols: [txt('k', 'Instituto'), num('v', 'Efecto (pp)', 2)], rows, max: 30 });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTables(); initToc(); initSources(); initCites(); initCharts(); initGallery(); initExplorer(); initModels();
  });
})();
