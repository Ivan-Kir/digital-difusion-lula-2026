/* Gráficos del informe. Requiere Plotly y window.DATA (assets/data.js). */
(function (root) {
  'use strict';
  const D = () => root.DATA;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const P = () => ({ ink: css('--ink'), muted: css('--muted'), rule: css('--rule'), lula: css('--lula'), flavio: css('--flavio'), accent: css('--accent'), amber: css('--amber'), grey: css('--grey'), surface: css('--surface') });
  const PH = ['#8c1d18', '#c2332b', '#e08a3c', '#2f7f87', '#23508f', '#7b8794'];
  const T = s => String(s).replace('T', ' ');
  const merge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]); else a[k] = b[k]; } return a; };
  const base = () => { const p = P(); return { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { family: 'Archivo, Helvetica, Arial, sans-serif', size: 12, color: p.ink }, margin: { l: 58, r: 22, t: 18, b: 46 }, xaxis: { gridcolor: p.rule, zeroline: false, linecolor: p.rule, automargin: true }, yaxis: { gridcolor: p.rule, zeroline: false, linecolor: p.rule, automargin: true }, legend: { orientation: 'h', y: -0.2 }, hovermode: 'closest' }; };
  const draw = (el, traces, layout, cfg) => Plotly.react(el, traces, merge(base(), layout || {}), Object.assign({ responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'] }, cfg || {}));
  const evColor = k => ({ judicial: P().amber, debate: P().accent, electoral: P().grey }[k] || P().grey);
  const evShapes = (events, yref) => {
    const shapes = [], ann = [];
    (events || []).forEach(e => {
      shapes.push({ type: 'line', xref: 'x', yref: yref || 'paper', x0: T(e.t), x1: T(e.t), y0: 0, y1: 1, line: { color: evColor(e.tipo), width: 1.2, dash: 'dot' }, layer: 'below' });
      ann.push({ x: T(e.t), y: 1, xref: 'x', yref: 'paper', text: e.label, textangle: -90, showarrow: false, xanchor: 'right', yanchor: 'top', font: { size: 10, color: evColor(e.tipo) } });
    });
    return { shapes, annotations: ann };
  };
  const dayISO = d => `2026-10-${String(d).padStart(2, '0')}`;

  /* ---------- LOWESS (Cleveland, tricúbico, iteraciones robustas) ---------- */
  function lowessFit(x, y, f, it) {
    const n = x.length, k = Math.max(2, Math.min(n, Math.ceil(f * n)));
    const idx = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
    const xs = idx.map(i => x[i]), ys = idx.map(i => y[i]);
    let rw = new Array(n).fill(1), fit = new Array(n).fill(0);
    const local = (x0, w0) => {
      const d = xs.map(v => Math.abs(v - x0)); const sd = d.slice().sort((a, b) => a - b); const h = Math.max(sd[k - 1], 1e-12);
      let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
      for (let i = 0; i < n; i++) { const u = d[i] / h; if (u >= 1) continue; const w = Math.pow(1 - u * u * u, 3) * w0[i]; sw += w; swx += w * xs[i]; swy += w * ys[i]; swxx += w * xs[i] * xs[i]; swxy += w * xs[i] * ys[i]; }
      if (sw <= 0) return NaN; const den = sw * swxx - swx * swx;
      if (Math.abs(den) < 1e-12) return swy / sw; const b = (sw * swxy - swx * swy) / den; const a = (swy - b * swx) / sw; return a + b * x0;
    };
    for (let t = 0; t <= it; t++) {
      for (let i = 0; i < n; i++) fit[i] = local(xs[i], rw);
      if (t < it) {
        const res = fit.map((v, i) => Math.abs(ys[i] - v)); const med = res.slice().sort((a, b) => a - b)[Math.floor(n / 2)] || 1e-9;
        rw = res.map(r => { const u = r / (6 * med); return u < 1 ? Math.pow(1 - u * u, 2) : 0; });
      }
    }
    return { xs, fit };
  }
  const interp = (xs, fit, g) => g.map(v => { if (v <= xs[0]) return fit[0]; if (v >= xs[xs.length - 1]) return fit[fit.length - 1]; let j = 1; while (xs[j] < v) j++; const t = (v - xs[j - 1]) / (xs[j] - xs[j - 1] || 1); return fit[j - 1] + t * (fit[j] - fit[j - 1]); });
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function lowessBand(x, y, f, grid, B, seed) {
    const { xs, fit } = lowessFit(x, y, f, 3), est = interp(xs, fit, grid), rnd = mulberry(seed || 1), boots = [];
    for (let b = 0; b < B; b++) { const ix = Array.from({ length: x.length }, () => Math.floor(rnd() * x.length)); const xb = ix.map(i => x[i]), yb = ix.map(i => y[i]); const r = lowessFit(xb, yb, f, 3); boots.push(interp(r.xs, r.fit, grid)); }
    const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); const pos = (s.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos); return s[lo] + (s[hi] - s[lo]) * (pos - lo); };
    return { est, lo: grid.map((_, j) => q(boots.map(r => r[j]), 0.025)), hi: grid.map((_, j) => q(boots.map(r => r[j]), 0.975)) };
  }
  root.LOWESS = { lowessFit, lowessBand, interp };

  /* ---------- registro de gráficos ---------- */
  const CH = {};
  const btns = (tools, items, cb, first) => { items.forEach((it, i) => { const b = document.createElement('button'); b.textContent = it[0]; b.setAttribute('aria-pressed', i === (first || 0)); b.onclick = () => { [...tools.querySelectorAll('button')].forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); cb(it[1]); }; tools.appendChild(b); }); };

  CH.growth = (c) => {
    const h = D().hitos, ev = evShapes(D().eventos.filter(e => e.tipo !== 'electoral' || true));
    const draw1 = (type) => draw(c.plot, [{ x: h.map(d => T(d.t)), y: h.map(d => d.m), mode: 'lines+markers', line: { color: P().lula, width: 2.4, shape: 'spline', smoothing: 0.4 }, marker: { size: 8, color: P().lula }, text: h.map(d => d.label + ' [' + d.src + ']'), hovertemplate: '%{text}<br>%{x|%d/%m %H:%M}<extra></extra>', name: 'Miembros' }],
      { yaxis: { title: 'Miembros del canal (millones)', type }, xaxis: { range: ['2026-10-03', '2026-10-26'] }, shapes: ev.shapes, annotations: ev.annotations, showlegend: false, margin: { t: 70 } });
    draw1('linear'); btns(c.tools, [['Escala lineal', 'linear'], ['Escala logarítmica', 'log']], draw1);
  };
  CH.rates = (c) => {
    const r = D().intervalos; const col = r.map((_, i) => i < 2 ? P().amber : P().accent);
    const mid = r.map(d => new Date((new Date(T(d.inicio)).getTime() + new Date(T(d.fin)).getTime()) / 2)), wid = r.map(d => d.dias * 86400000 * 0.92);
    draw(c.plot, [{ type: 'bar', x: mid, y: r.map(d => d.millones_por_dia), width: wid, marker: { color: col }, customdata: r.map(d => [d.desde, d.hasta, d.dias, d.tasa_log_diaria]), hovertemplate: '%{customdata[0]} → %{customdata[1]}<br>%{y:.2f} M por día · %{customdata[2]} días<br>tasa log diaria %{customdata[3]}<extra></extra>' }],
      { yaxis: { title: 'Miembros nuevos por día (millones)' }, xaxis: { range: ['2026-10-12', '2026-10-25'] }, showlegend: false, shapes: evShapes(D().eventos).shapes, annotations: evShapes(D().eventos).annotations, margin: { t: 70 } });
  };
  CH.results = (c) => {
    const r = D().resultados, M = 1e6, a = r.primera, b = r.segunda;
    draw(c.plot, [{ type: 'bar', name: '1ª vuelta (4/10)', x: ['Lula', 'Flávio', 'Otros candidatos', 'Blancos y nulos'], y: [a.lula / M, a.flavio / M, a.otros / M, (a.blancos + a.nulos) / M], marker: { color: P().grey }, hovertemplate: '%{x}: %{y:.2f} M<extra>1ª vuelta</extra>' },
      { type: 'bar', name: '2ª vuelta (25/10)', x: ['Lula', 'Flávio', 'Otros candidatos', 'Blancos y nulos'], y: [b.lula / M, b.flavio / M, 0, b.blancos_nulos / M], marker: { color: [P().lula, P().flavio, P().grey, P().grey] }, hovertemplate: '%{x}: %{y:.2f} M<extra>2ª vuelta</extra>' }],
      { barmode: 'group', yaxis: { title: 'Votos (millones)' } });
  };
  CH.flows = (c) => {
    const f = D().flujos_e26.slice().reverse(), p = P();
    draw(c.plot, [{ type: 'bar', orientation: 'h', name: '→ Lula', y: f.map(r => r[0] + ' (' + r[1] + ' M)'), x: f.map(r => r[2]), marker: { color: p.lula }, text: f.map(r => r[2] + '%'), textposition: 'inside', hovertemplate: '%{y}: %{x}% a Lula<extra></extra>' },
      { type: 'bar', orientation: 'h', name: '→ Flávio', y: f.map(r => r[0] + ' (' + r[1] + ' M)'), x: f.map(r => r[3]), marker: { color: p.flavio }, text: f.map(r => r[3] + '%'), textposition: 'inside', hovertemplate: '%{y}: %{x}% a Flávio<extra></extra>' },
      { type: 'bar', orientation: 'h', name: 'Blanco, nulo o no votó', y: f.map(r => r[0] + ' (' + r[1] + ' M)'), x: f.map(r => r[4]), marker: { color: p.grey, opacity: 0.55 }, hovertemplate: '%{y}: %{x}% blanco, nulo o no votó<extra></extra>' }],
      { barmode: 'stack', xaxis: { title: '% de los votantes de la 1ª vuelta de cada grupo', range: [0, 118] }, margin: { l: 150, r: 20, t: 10, b: 60 },
        annotations: f.map(r => ({ x: 112, y: r[0] + ' (' + r[1] + ' M)', text: (r[5] >= 0 ? '+' : '−') + Math.abs(r[5]).toFixed(2) + ' M', showarrow: false, font: { size: 11, color: r[5] >= 0 ? p.lula : p.flavio } })) });
  };
  CH.estimators = (c) => {
    const E = D().estimadores, names = ['e26 / El Atlas', 'lorande, secciones', 'lorande, municipios', 'Maia M0', 'Maia M1', 'Maia M2'], cols = [P().lula, P().amber, '#d9a35c', P().flavio, '#5b87c4', '#9bb7de'];
    draw(c.plot, names.map((n, j) => ({ type: 'bar', name: n, x: E.map(r => r[0]), y: E.map(r => r[j + 1]), marker: { color: cols[j] }, hovertemplate: '%{x}<br>' + n + ': %{y}%<extra></extra>' })),
      { barmode: 'group', yaxis: { title: '% del grupo de origen', range: [0, 105] }, xaxis: { tickangle: -18 } });
  };
  CH.decomp = (c) => {
    const d = D().descomposicion, xs = ['e26 / El Atlas', 'lorande, secciones', 'lorande, municipios'], cols = [P().lula, P().flavio, P().grey];
    draw(c.plot, d.map((r, i) => ({ type: 'bar', name: r[0], x: xs, y: r.slice(1), marker: { color: cols[i] }, hovertemplate: r[0] + '<br>%{y:.2f} M<extra>%{x}</extra>' })), { barmode: 'stack', yaxis: { title: 'Reversión Lula − Flávio (millones de votos)' } });
  };
  CH.quaest = (c) => {
    const q = D().quaest_escenario, e = [54, 46, 48]; // Cury, Caiado, Renan: e26
    draw(c.plot, [{ type: 'bar', name: 'Intención declarada (Quaest)', x: q.grupos, y: q.lula_pct, marker: { color: P().grey } }, { type: 'bar', name: 'Estimación sobre urnas (e26)', x: q.grupos, y: e, marker: { color: P().lula } }],
      { barmode: 'group', yaxis: { title: '% del grupo que va a Lula' } });
  };

  /* ---------- encuestas: LOWESS interactivo ---------- */
  CH.lowess = (c) => {
    const E = D().encuestas, t = E.map(r => r.t), tools = c.tools;
    tools.innerHTML = '<label>Suavizado <input type="range" min="0.15" max="0.8" step="0.05" value="0.3" id="lw-f"><span id="lw-fv">0,30</span></label><label><input type="checkbox" id="lw-ci" checked> banda IC 95%</label>';
    const sel = document.createElement('select'); sel.innerHTML = '<option value="v">Lula, % de votos válidos</option><option value="b">Lula y Flávio, % del total de la encuesta</option>'; tools.prepend(sel);
    const grid = Array.from({ length: 71 }, (_, i) => i - 50), iso = g => new Date(Date.UTC(2026, 9, 4 + g)).toISOString().slice(0, 10);
    const out = document.createElement('div'); out.className = 'note dyn'; c.plot.after(out);
    const run = () => {
      const f = +$('#lw-f', tools).value, ci = $('#lw-ci', tools).checked, mode = sel.value, p = P(); $('#lw-fv', tools).textContent = f.toFixed(2).replace('.', ',');
      const series = mode === 'v' ? [{ n: 'Lula, % de válidos', y: E.map(r => r.lula_validos), col: p.lula }] : [{ n: 'Lula', y: E.map(r => r.lula), col: p.lula }, { n: 'Flávio Bolsonaro', y: E.map(r => r.flavio), col: p.flavio }];
      const traces = [], shapes = [], ann = []; let txt = [];
      series.forEach((s, k) => {
        const L = lowessBand(t, s.y, f, grid, ci ? 250 : 0, 3 + k), x = grid.map(iso);
        if (ci) traces.push({ x: x.concat(x.slice().reverse()), y: L.hi.concat(L.lo.slice().reverse()), fill: 'toself', fillcolor: s.col, opacity: 0.16, line: { width: 0 }, hoverinfo: 'skip', showlegend: false });
        traces.push({ x, y: L.est, mode: 'lines', line: { color: s.col, width: 3 }, name: 'Regresión local · ' + s.n, hovertemplate: '%{x}: %{y:.1f}%<extra>' + s.n + '</extra>' });
        traces.push({ x: E.map(r => r.cierre_campo.slice(0, 10)), y: s.y, mode: 'markers', name: s.n + ' (encuestas)', marker: { color: s.col, size: E.map(r => 4 + r.n / 900), opacity: 0.45, line: { width: 0 } }, text: E.map(r => r.instituto + ' · n=' + r.n + (r.fecha_aproximada ? ' · fecha aprox.' : '')), hovertemplate: '%{text}<br>%{x}: %{y:.1f}%<extra></extra>' });
        const j = grid.indexOf(20); txt.push(s.n + ' el 24/10: ' + L.est[j].toFixed(1) + '% (IC 95%: ' + L.lo[j].toFixed(1) + '–' + L.hi[j].toFixed(1) + ')');
      });
      if (mode === 'v') traces.push({ x: ['2026-10-25'], y: [51.79], mode: 'markers+text', marker: { symbol: 'star', size: 15, color: p.ink }, text: ['Resultado 51,79%'], textposition: 'top left', name: 'Resultado', hoverinfo: 'text' });
      const ev = evShapes(D().eventos.filter(e => ['1ª vuelta', 'Debate de Band', 'Debate de Globo y live de 24 h', 'Suspensión y reversión'].includes(e.label)));
      draw(c.plot, traces, { xaxis: { range: ['2026-08-14', '2026-10-27'] }, yaxis: { title: mode === 'v' ? '% de votos válidos' : '% del total' }, shapes: ev.shapes, annotations: ev.annotations, margin: { t: 80 }, legend: { y: -0.25 } });
      out.innerHTML = txt.join(' · ') + '. Intervalos por remuestreo (250 réplicas) en tu navegador; la tabla precalculada está en <code>data/encuestas_lowess.csv</code>.';
    };
    $('#lw-f', tools).oninput = run; $('#lw-ci', tools).onchange = run; sel.onchange = run; run();
  };
  const $ = (s, r) => (r || document).querySelector(s);

  CH.integrated = (c) => {
    const L = D().lowess.filter(r => r.fraccion === 0.3 && r.t >= -30), x = L.map(r => r.fecha), p = P(), h = D().hitos.filter(d => d.t >= '2026-10-04'), xd = D().x_diario.filter(r => r.dia >= 4);
    const ev = evShapes(D().eventos);
    draw(c.plot, [
      { x: x.concat(x.slice().reverse()), y: L.map(r => r.ic95_sup).concat(L.map(r => r.ic95_inf).reverse()), fill: 'toself', fillcolor: p.lula, opacity: 0.14, line: { width: 0 }, hoverinfo: 'skip', showlegend: false, xaxis: 'x', yaxis: 'y' },
      { x, y: L.map(r => r.estimacion), name: 'Lula, % de válidos (regresión local)', line: { color: p.lula, width: 3 }, xaxis: 'x', yaxis: 'y' },
      { x: ['2026-10-25'], y: [51.79], mode: 'markers', marker: { symbol: 'star', size: 14, color: p.ink }, name: 'Resultado 51,79%', xaxis: 'x', yaxis: 'y' },
      { x: h.map(d => T(d.t)), y: h.map(d => d.m), name: 'Miembros del canal (M, eje derecho)', mode: 'lines+markers', line: { color: p.accent, width: 2.4 }, marker: { size: 6 }, xaxis: 'x', yaxis: 'y2', text: h.map(d => d.label), hovertemplate: '%{text}<extra></extra>' },
      { type: 'bar', x: xd.map(r => dayISO(r.dia)), y: xd.map(r => r.horas_movilizacion), name: 'Horas con hashtags de movilización en el top-10', marker: { color: p.amber, opacity: 0.8 }, xaxis: 'x', yaxis: 'y3' }],
      { xaxis: { range: ['2026-09-20', '2026-10-26'], domain: [0, 1] }, yaxis: { domain: [0.36, 1], title: '% de válidos', range: [46, 53] }, yaxis2: { overlaying: 'y', side: 'right', title: 'Miembros (M)', showgrid: false, range: [0, 12] }, yaxis3: { domain: [0, 0.27], title: 'Horas al día', range: [0, 24] },
        shapes: ev.shapes.map(s => Object.assign({}, s, { yref: 'paper' })), annotations: ev.annotations, margin: { t: 80, r: 60 }, legend: { y: -0.12 } });
  };
  CH.xdaily = (c) => {
    const xd = D().x_diario.filter(r => r.dia >= 4), p = P(), ev = evShapes(D().eventos);
    draw(c.plot, [{ type: 'bar', x: xd.map(r => dayISO(r.dia)), y: xd.map(r => r.horas_movilizacion), name: 'Horas con hashtags de movilización (de 24)', marker: { color: p.amber, opacity: 0.85 } },
      { x: xd.map(r => dayISO(r.dia)), y: xd.map(r => r.apar_lula), name: 'Apariciones con «Lula»', yaxis: 'y2', line: { color: p.lula, width: 2.4 } },
      { x: xd.map(r => dayISO(r.dia)), y: xd.map(r => r.apar_flavio_bolsonaro), name: 'Apariciones con «Flávio/Bolsonaro»', yaxis: 'y2', line: { color: p.flavio, width: 2.4 } }],
      { yaxis: { title: 'Horas al día', range: [0, 26] }, yaxis2: { overlaying: 'y', side: 'right', title: 'Apariciones diarias', showgrid: false }, xaxis: { range: ['2026-10-03 12:00', '2026-10-25 12:00'] }, shapes: ev.shapes, annotations: ev.annotations, margin: { t: 80, r: 60 } });
  };
  CH.orient = (c) => {
    const o = D().orientacion, nm = { A: 'A · a favor de Lula o movilización', B: 'B · contra Flávio/Bolsonaro', C: 'C · a favor de Flávio', D: 'D · contra Lula', E: 'E · institucional o ambigua', F: 'F · no política' }, col = { A: P().lula, B: '#8c1d18', C: P().flavio, D: '#5b87c4', E: P().grey, F: '#c3cad2' };
    const run = (hideF) => draw(c.plot, ['A', 'B', 'C', 'D', 'E', 'F'].filter(k => !(hideF && k === 'F')).map(k => ({ type: 'bar', name: nm[k], x: o.map(r => dayISO(r.dia)), y: o.map(r => r[k]), marker: { color: col[k] } })), { barmode: 'stack', yaxis: { title: 'Tendencias de la lista diaria (de 15)' }, legend: { y: -0.3 } });
    run(false); btns(c.tools, [['Mostrar todas', false], ['Ocultar no políticas (F)', true]], run);
  };
  CH.hashrate = (c) => {
    const t = D().mod_x.tasa_por_fase, p = P();
    draw(c.plot, [{ type: 'bar', x: t.map(r => 'Fase ' + r.fase), y: t.map(r => 100 * r.tasa), name: '% de hashtags ordenadas que entran al top-10', marker: { color: PH }, text: t.map(r => r.entran + ' de ' + r.ordenadas), textposition: 'outside' },
      { x: t.map(r => 'Fase ' + r.fase), y: t.map(r => r.miembros_M), name: 'Miembros del canal (M)', yaxis: 'y2', mode: 'lines+markers', line: { color: p.accent, width: 2.4 } }],
      { yaxis: { title: '% que entra', range: [0, 118] }, yaxis2: { overlaying: 'y', side: 'right', title: 'Miembros (M)', range: [0, 12], showgrid: false }, margin: { r: 60 } });
  };
  CH.hashbars = (c) => {
    const h = D().hashtags.filter(r => r.apariciones > 0).sort((a, b) => a.apariciones - b.apariciones);
    draw(c.plot, [{ type: 'bar', orientation: 'h', y: h.map(r => r.hashtag), x: h.map(r => r.apariciones), marker: { color: h.map(r => PH['ABCDEF'.indexOf(r.fase)]) }, customdata: h.map(r => [r.fase, r.dias, r.primera]), hovertemplate: '%{y}<br>fase %{customdata[0]} · %{x} apariciones<br>%{customdata[1]}<br>primera: %{customdata[2]}<extra></extra>' }],
      { xaxis: { title: 'Apariciones en instantáneas semihorarias del top-10 (48 por día)' }, margin: { l: 220 }, height: 820 });
  };
  CH.orderhour = (c) => {
    const o = D().mod_x.orden_vs_hora, mk = (k, n, col) => { const h = o[k].horas_absolutas, h0 = h[0]; return { x: h.map((_, i) => i + 1), y: h.map(v => v - h0), name: n + ' (ρ = ' + o[k].rho + ')', mode: 'lines+markers', line: { color: col, width: 2.4 } }; };
    draw(c.plot, [mk('debate_band', 'Noche del debate de Band, 18/10', P().lula), mk('live_22_10', 'Live del 22/10', P().flavio), mk('globo_24_10', 'Debate de Globo y live, 23–24/10', P().amber)],
      { xaxis: { title: 'Posición de la hashtag en la lista de órdenes del chat', dtick: 1 }, yaxis: { title: 'Horas desde la primera hashtag en entrar al top-10' } });
  };

  /* ---------- NLP ---------- */
  const LEXK = [['militar_por_1000', 'Léxico militar'], ['urgencia_tiempo_por_1000', 'Urgencia y tiempo'], ['imperativo_por_1000', 'Imperativos'], ['sancion_presion_por_1000', 'Sanción y presión'], ['identidad_colectiva_por_1000', 'Identidad colectiva'], ['primera_singular_por_1000', 'Primera persona singular'], ['primera_plural_por_1000', 'Primera persona plural'], ['segunda_persona_por_1000', 'Segunda persona y «soldados»'], ['positivo_por_1000', 'Léxico positivo'], ['amenaza_conflicto_por_1000', 'Amenaza o conflicto']];
  CH.nlpheat = (c) => {
    const F = D().nlp_fases, z = LEXK.map(([k]) => { const v = F.map(r => r[k]), mn = Math.min(...v), mx = Math.max(...v); return v.map(a => mx === mn ? 0 : (a - mn) / (mx - mn)); });
    draw(c.plot, [{ type: 'heatmap', x: F.map(r => 'Fase ' + r.fase), y: LEXK.map(l => l[1]), z, text: LEXK.map(([k]) => F.map(r => r[k])), texttemplate: '%{text}', colorscale: [[0, css('--surface')], [1, P().accent]], showscale: false, hovertemplate: '%{y}<br>%{x}: %{text} por 1.000 palabras<extra></extra>' }], { margin: { l: 190, t: 10 }, yaxis: { autorange: 'reversed' }, height: 420 });
  };
  CH.nlpsent = (c) => {
    const F = D().nlp_fases, p = P(), x = F.map(r => 'Fase ' + r.fase);
    draw(c.plot, [{ type: 'bar', x, y: F.map(r => r.sentimiento_medio), name: 'Sentimiento medio (LeIA, −1 a +1)', marker: { color: F.map(r => r.sentimiento_medio >= 0 ? p.accent : p.amber) } },
      { x, y: F.map(r => r.lineas_positivas_pct), name: '% de líneas positivas', yaxis: 'y2', mode: 'lines+markers', line: { color: p.flavio } }, { x, y: F.map(r => r.lineas_negativas_pct), name: '% de líneas negativas', yaxis: 'y2', mode: 'lines+markers', line: { color: p.lula } }],
      { yaxis: { title: 'Sentimiento medio', range: [-0.15, 0.15] }, yaxis2: { overlaying: 'y', side: 'right', title: '% de líneas', range: [0, 40], showgrid: false }, margin: { r: 60 } });
  };
  CH.nlpwords = (c) => {
    const W = D().nlp_palabras, sel = document.createElement('select'); c.tools.appendChild(sel);
    D().nlp_fases.forEach(r => { const o = document.createElement('option'); o.value = r.fase; o.textContent = 'Fase ' + r.fase + ' · ' + r.descripcion; sel.appendChild(o); });
    const run = () => { const w = W.filter(r => r.fase === sel.value).slice().reverse(); draw(c.plot, [{ type: 'bar', orientation: 'h', y: w.map(r => r.palabra), x: w.map(r => r.z), marker: { color: PH['ABCDEF'.indexOf(sel.value)] }, customdata: w.map(r => r.frecuencia), hovertemplate: '%{y}: z = %{x}<br>frecuencia %{customdata}<extra></extra>' }], { xaxis: { title: 'Distintividad (z de la razón de log-odds)' }, margin: { l: 110 }, height: 470 }); };
    sel.onchange = run; run();
  };
  CH.nlptopics = (c) => {
    const t = D().nlp_temas.temas.slice().reverse();
    draw(c.plot, [{ type: 'bar', orientation: 'h', y: t.map(r => 'Tema ' + r.tema), x: t.map(r => r.mensajes_pct), marker: { color: P().accent }, text: t.map(r => r.terminos.slice(0, 5).join(', ')), textposition: 'inside', insidetextanchor: 'start', textfont: { color: '#fff', size: 11 }, hovertemplate: '%{y}: %{x}% de los mensajes<br>%{customdata}<extra></extra>', customdata: t.map(r => r.terminos.join(', ')) }], { xaxis: { title: '% de mensajes de 5+ palabras asignados al tema' }, margin: { l: 70 }, height: 380 });
  };

  /* ---------- Google, plataformas, métricas ---------- */
  CH.gtframes = (c) => {
    const m = D().gt_resumen.cruce_objetivo_marco, obj = ['Flávio', 'Lula', 'Janones', 'Otro'], col = [P().lula, P().amber, P().grey];
    draw(c.plot, Object.keys(m).map((k, i) => ({ type: 'bar', name: k, x: obj, y: obj.map(o => m[k][o] || 0), marker: { color: col[i] } })), { barmode: 'stack', yaxis: { title: 'Consultas únicas que nombran al candidato' } });
  };
  CH.gtbars = (c) => {
    const seen = {}, rows = D().gt_candidatos.filter(r => { const k = r.consulta.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).sort((a, b) => b.interes_relativo - a.interes_relativo).slice(0, 28).reverse();
    const col = { 'Flávio': P().flavio, 'Lula': P().lula, 'Janones': P().amber, 'Otro': P().grey };
    draw(c.plot, [{ type: 'bar', orientation: 'h', y: rows.map(r => r.consulta), x: rows.map(r => r.interes_relativo), marker: { color: rows.map(r => col[r.objetivo]) }, customdata: rows.map(r => [r.objetivo, r.marco, r.crecimiento, r.ventana, r.categoria]), hovertemplate: '%{y}<br>interés relativo %{x}<br>%{customdata[0]} · %{customdata[1]}<br>crecimiento: %{customdata[2]} · %{customdata[3]}<extra></extra>' }],
      { xaxis: { title: 'Interés relativo dentro de su lista (0–100)' }, margin: { l: 250 }, height: 640 });
  };
  CH.netads = (c) => {
    const a = D().netlab_anuncios;
    draw(c.plot, [{ type: 'bar', name: 'Anuncios', x: a.map(r => r[0]), y: a.map(r => r[1]), marker: { color: P().amber } }, { type: 'bar', name: 'Anunciantes', x: a.map(r => r[0]), y: a.map(r => r[2]), marker: { color: P().grey } }], { barmode: 'group', yaxis: { title: 'Anuncios político-electorales irregulares en Meta' } });
  };
  CH.netrecs = (c) => {
    const r = D().netlab_recs;
    draw(c.plot, [{ type: 'bar', name: '5–24/10', x: r.map(a => a[0]), y: r.map(a => a[1]), marker: { color: P().grey } }, { type: 'bar', name: '24–25/10 (víspera y día de la elección)', x: r.map(a => a[0]), y: r.map(a => a[2]), marker: { color: P().accent } }], { barmode: 'group', yaxis: { title: '% de recomendaciones con contenido político' } });
  };
  CH.reel = (c) => {
    const r = D().reel, v = r.vistas;
    draw(c.plot, [{ type: 'bar', x: ['Me gusta', 'Comentarios', 'Envíos', 'Reposts'], y: [r.likes / v, r.comentarios / v, r.envios / v, r.reposts / v].map(a => 100 * a), marker: { color: [P().lula, P().amber, P().accent, P().flavio] }, text: ['20,8%', '14,5%', '12,0%', '3,7%'], textposition: 'outside' }], { yaxis: { title: '% de las 4,8 M de vistas', range: [0, 25] } });
  };
  CH.reactions = (c) => {
    const r = D().reacciones.slice().reverse();
    draw(c.plot, [{ type: 'bar', orientation: 'h', y: r.map(a => a[0]), x: r.map(a => a[1]), marker: { color: r.map(a => ['💩', '🖕'].includes(a[0]) ? P().lula : P().accent) }, hovertemplate: '%{y}: %{x} reacciones<extra></extra>' }], { xaxis: { type: 'log', title: 'Reacciones (escala logarítmica); total 120.551' }, margin: { l: 70 }, height: 380 });
  };
  CH.segments = (c) => {
    const S = D().segmentos, m = i => S.map(s => s[i] ? s[i][0] - s[i][1] : null);
    draw(c.plot, [{ type: 'bar', name: 'Datafolha, antes de la 1ª vuelta (% total)', x: S.map(s => s[0]), y: m(1), marker: { color: P().grey } }, { type: 'bar', name: 'Datafolha 22/10 (% válidos)', x: S.map(s => s[0]), y: m(2), marker: { color: P().accent } }, { type: 'bar', name: 'AtlasIntel 19/10', x: S.map(s => s[0]), y: m(3), marker: { color: P().amber } }],
      { barmode: 'group', yaxis: { title: 'Ventaja de Lula sobre Flávio (puntos; negativo = ventaja de Flávio)' } });
  };
  CH.geo = (c) => {
    const g = [['São Paulo', 2.614], ['Minas Gerais', 1.162], ['Río de Janeiro', 0.872], ['Bahía', 0.820], ['Pernambuco', 0.564], ['Goiás', 0.397]];
    draw(c.plot, [{ type: 'bar', x: g.map(a => a[0]), y: g.map(a => a[1]), marker: { color: P().lula }, text: g.map(a => '+' + a[1].toFixed(2) + ' M'), textposition: 'outside' }], { yaxis: { title: 'Votos adicionales de Lula, 2ª vs 1ª vuelta (M)', range: [0, 3.1] } });
  };
  CH.galileia = (c) => {
    const g = D().galileia.slice().reverse();
    draw(c.plot, [{ type: 'bar', orientation: 'h', y: g.map(a => a[0]), x: g.map(a => a[1]), marker: { color: [P().amber, P().flavio, P().grey, P().flavio] }, text: g.map(a => a[1] + ' M'), textposition: 'outside' }], { xaxis: { title: 'Interacciones, 28/9–11/10 (M)', range: [0, 60] }, margin: { l: 120 }, height: 300 });
  };
  CH.diffusion = (c) => {
    const R = Array.from({ length: 96 }, (_, i) => i / 100), pts = [[0.12, 'Reel: 0,12 envíos por vista'], [0.36, 'Si cada envío llegara a 3 personas'], [0.85, '0,85: si fuera por generación completa (hipótesis)']];
    draw(c.plot, [{ x: R, y: R.map(r => 1 / (1 - r)), name: 'Alcance total por semilla, 1/(1−R)', line: { color: P().accent, width: 3 } }, { x: pts.map(a => a[0]), y: pts.map(a => 1 / (1 - a[0])), mode: 'markers+text', text: pts.map(a => a[1]), textposition: 'top left', marker: { size: 10, color: P().lula }, name: 'Valores observados o hipotéticos' }],
      { xaxis: { title: 'Descendientes por individuo o por vista (R, proceso subcrítico)' }, yaxis: { title: 'Personas o vistas totales por semilla', range: [0, 22] }, showlegend: false });
  };
  CH.debates = (c) => {
    const m = D().mod_encuestas.medias_ajustadas, x = D().mod_x.x_debates, p = P();
    draw(c.plot, [{ type: 'bar', x: m.map(r => r.periodo.replace(/^\d\) /, '') + ' (n=' + r.n + ')'), y: m.map(r => r.media), marker: { color: [p.grey, p.accent, p.lula] }, text: m.map(r => r.media.toFixed(1) + '%'), textposition: 'outside', xaxis: 'x', yaxis: 'y', showlegend: false },
      { type: 'bar', x: ['Flávio/Bolsonaro', 'Lula', 'Movilización'], y: [x.flavio_antes_band_11_17, x.lula_antes_band_11_17, x.mov_antes_band_11_17], name: 'Antes de Band (11–17/10)', marker: { color: p.grey }, xaxis: 'x2', yaxis: 'y2' },
      { type: 'bar', x: ['Flávio/Bolsonaro', 'Lula', 'Movilización'], y: [x.flavio_despues_band_19_22, x.lula_despues_band_19_22, x.mov_despues_band_19_22], name: 'Después de Band (19–22/10)', marker: { color: p.accent }, xaxis: 'x2', yaxis: 'y2' },
      { type: 'bar', x: ['Flávio/Bolsonaro', 'Movilización'], y: [x.flavio_globo_23_24, x.mov_globo_23_24], name: 'Tras Globo (23–24/10)', marker: { color: p.lula }, xaxis: 'x2', yaxis: 'y2' }],
      { grid: { rows: 1, columns: 2, pattern: 'independent' }, xaxis: { domain: [0, 0.44], tickfont: { size: 10 } }, yaxis: { title: 'Lula, % de válidos (ajustado por instituto)', range: [46, 52] }, xaxis2: { domain: [0.56, 1] }, yaxis2: { title: 'Apariciones diarias medias en el top-10', anchor: 'x2' }, barmode: 'group', legend: { y: -0.3 }, height: 420 });
  };
  CH.censura = (c) => {
    const c2 = D().mod_x.censura_por_dia, ks = Object.keys(c2).map(Number), ev = evShapes(D().eventos.filter(e => e.tipo === 'judicial'));
    draw(c.plot, [{ type: 'bar', x: ks.map(dayISO), y: ks.map(k => c2[k]), marker: { color: ks.map(k => k >= 11 && k <= 16 || k === 23 ? P().amber : P().grey) }, hovertemplate: '%{x}: %{y} apariciones<extra></extra>' }],
      { yaxis: { title: 'Apariciones diarias de hashtags de censura y «ninguém cala»' }, xaxis: { range: ['2026-10-09 12:00', '2026-10-25 12:00'] }, shapes: ev.shapes, annotations: ev.annotations, margin: { t: 80 }, showlegend: false });
  };
  CH.roc = (c) => {
    const r = D().mod_x.roc, pos = r.positivos, neg = r.n - r.positivos, p = P();
    c.tools.innerHTML = '<label>Umbral de decisión <input type="range" min="0" max="' + (r.fpr.length - 1) + '" value="' + Math.floor(r.fpr.length / 2) + '" id="roc-i"></label><span id="roc-o" class="small"></span>';
    const run = () => {
      const i = +$('#roc-i', c.tools).value, tp = r.tpr[i] * pos, fp = r.fpr[i] * neg, prec = tp + fp ? tp / (tp + fp) : 0, acc = (tp + neg - fp) / r.n;
      $('#roc-o', c.tools).innerHTML = 'umbral ≥ ' + r.umbral[i] + ' · sensibilidad ' + (100 * r.tpr[i]).toFixed(0) + '% · tasa de falsos positivos ' + (100 * r.fpr[i]).toFixed(0) + '% · precisión ' + (100 * prec).toFixed(0) + '% · exactitud ' + (100 * acc).toFixed(0) + '%';
      draw(c.plot, [{ x: r.fpr, y: r.tpr, mode: 'lines', name: 'Curva ROC (validación dejando una fuera; AUC ' + r.auc_loo_tamano + ')', line: { color: p.accent, width: 3, shape: 'hv' } }, { x: [0, 1], y: [0, 1], mode: 'lines', line: { color: p.grey, dash: 'dot' }, name: 'Azar' }, { x: [r.fpr[i]], y: [r.tpr[i]], mode: 'markers', marker: { size: 13, color: p.lula }, name: 'Umbral elegido' }],
        { xaxis: { title: 'Tasa de falsos positivos', range: [0, 1] }, yaxis: { title: 'Sensibilidad', range: [0, 1.02] }, height: 380 });
    };
    $('#roc-i', c.tools).oninput = run; run();
  };
  CH.precios = (c) => {
    const n = ['Aceite de soja 900 ml', 'Azúcar Guarani 1 kg', 'Azúcar União 1 kg', 'Arroz Rei do Sul 5 kg', 'Arroz Ouro Nobre 5 kg', 'Arroz Carreteiro 5 kg', 'Frijol Sanes 1 kg', 'Frijol Máximo 1 kg', 'Fubá Granfino 1 kg', 'Leche Glória 1 L', 'Pechuga Rivelli (kg)', 'Salsa Pramesa 300 g'], p = D().precios;
    draw(c.plot, [{ type: 'bar', name: '2022', x: n, y: p.p2022, marker: { color: P().grey } }, { type: 'bar', name: '2026', x: n, y: p.p2026, marker: { color: P().accent } }], { barmode: 'group', yaxis: { title: 'Precio de oferta (R$)' }, xaxis: { tickangle: -35 }, height: 420, margin: { b: 130 } });
  };

  root.CHARTS = CH; root.chartTheme = () => { P(); };
})(window);
