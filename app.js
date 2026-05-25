/* SCADA Simulator v4.0 · Fabricio M. Toso
   Pure vanilla JS — alarmas filtrables, ACK, export CSV,
   CT desinfección, THM, filtros arena, UV-254, KPI planta */

(() => {
  "use strict";

  const TEAL = "#5cbdb9", CYAN = "#2dd4e0", AMBER = "#f5b945",
        RED = "#ff5c7a", GREEN = "#4ade80", MUTED = "#4f7691",
        GRID = "rgba(92,189,185,0.08)";

  // ---------- HiDPI helper ----------
  function fit(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  // ---------- State ----------
  const series = { pressure: [], ph: [], turb: [], flow: [], energy: [] };
  const MAX_POINTS = 60;
  const state = {
    pressure: 3.2, ph: 7.2, turb: 1.4, flow: 850, cl: 1.2,
    inflow: 720, tkA: 78, tkB: 64, pac: 82,
    pacD: 12, clD: 1.6, flocD: 3.2, hclD: 18,
    // NEW industry variables
    ct: 8.4,           // CT = Cl × t_contacto (mg·min/L) — USEPA SWTR
    thm: 42,           // Trihalometanos totales (μg/L) — RD 3/2023
    uv: 0.085,         // UV-254 absorbancia agua cruda (cm⁻¹)
    sdi: 3.2,          // Silt Density Index
    kpi: 96,           // KPI eficiencia planta global
    pumps: [
      { name: "P-01", rpm: 1450, state: "on" },
      { name: "P-02", rpm: 1480, state: "on" },
      { name: "P-03", rpm: 0, state: "off" },
      { name: "P-04", rpm: 980, state: "warn" },
      { name: "P-05", rpm: 1420, state: "on" }
    ],
    filters: [
      { name: "F-01", dp: 0.42, state: "svc" },
      { name: "F-02", dp: 0.31, state: "svc" },
      { name: "F-03", dp: 0.78, state: "svc" }
    ],
    flowAcc: 0, pressureMax: 0
  };

  // Seed series
  for (let i = 0; i < MAX_POINTS; i++) {
    series.pressure.push(3 + Math.sin(i / 6) * 0.4 + Math.random() * 0.2);
    series.ph.push(7.1 + Math.sin(i / 8) * 0.15);
    series.turb.push(1.2 + Math.cos(i / 7) * 0.3);
    series.flow.push(800 + Math.sin(i / 5) * 80 + Math.random() * 30);
  }
  for (let i = 0; i < 12; i++) series.energy.push(40 + Math.random() * 30);

  // ---------- Drawers ----------
  function drawLine(canvas, data, color, opts = {}) {
    const { ctx, w, h } = fit(canvas);
    const min = opts.min ?? Math.min(...data) * 0.95;
    const max = opts.max ?? Math.max(...data) * 1.05;
    const range = max - min || 1;
    const pad = 8;
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = pad + ((h - pad * 2) * i) / 4;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + "55"); grad.addColorStop(1, color + "00");
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = pad + (h - pad * 2) * (1 - (v - min) / range);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = pad + (h - pad * 2) * (1 - (v - min) / range);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 1.8;
    ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
    const lx = w, ly = pad + (h - pad * 2) * (1 - (data[data.length - 1] - min) / range);
    ctx.beginPath(); ctx.arc(lx - 2, ly, 3, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  }

  function drawDualLine(canvas, dataA, dataB, colorA, colorB) {
    const { ctx, w, h } = fit(canvas);
    const pad = 8;
    ctx.strokeStyle = GRID;
    for (let i = 1; i < 4; i++) {
      const y = pad + ((h - pad * 2) * i) / 4;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    const drawSeries = (data, color) => {
      const min = Math.min(...data) * 0.95, max = Math.max(...data) * 1.05;
      const range = max - min || 1;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = pad + (h - pad * 2) * (1 - (v - min) / range);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color; ctx.lineWidth = 1.6;
      ctx.shadowColor = color; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
    };
    drawSeries(dataA, colorA);
    drawSeries(dataB, colorB);
  }

  function drawBars(canvas, data, labels) {
    const { ctx, w, h } = fit(canvas);
    const pad = 10;
    const max = Math.max(...data) * 1.15 || 1;
    const bw = (w - pad * 2) / data.length - 4;
    data.forEach((v, i) => {
      const x = pad + i * ((w - pad * 2) / data.length) + 2;
      const bh = (v / max) * (h - pad * 2 - 12);
      const y = h - pad - bh;
      const grad = ctx.createLinearGradient(0, y, 0, h - pad);
      grad.addColorStop(0, TEAL); grad.addColorStop(1, TEAL + "33");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = MUTED; ctx.font = "10px JetBrains Mono";
      if (labels && labels[i]) ctx.fillText(labels[i], x, h - 1);
    });
  }

  function drawGauge(canvas, value, max) {
    const { ctx, w, h } = fit(canvas);
    const cx = w / 2, cy = h * 0.78, r = Math.min(w * 0.42, h * 0.62);
    const start = Math.PI, end = 2 * Math.PI;
    const pct = Math.max(0, Math.min(1, value / max));
    const cur = start + (end - start) * pct;

    ctx.lineWidth = Math.max(8, r * 0.18);
    ctx.strokeStyle = "rgba(92,189,185,0.12)";
    ctx.beginPath(); ctx.arc(cx, cy, r, start, end); ctx.stroke();

    ctx.strokeStyle = "rgba(122,160,184,0.35)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const a = start + (end - start) * (i / 10);
      const x1 = cx + Math.cos(a) * (r + 6), y1 = cy + Math.sin(a) * (r + 6);
      const x2 = cx + Math.cos(a) * (r + 12), y2 = cy + Math.sin(a) * (r + 12);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    let col = TEAL;
    if (pct > 0.85) col = RED; else if (pct > 0.7) col = AMBER;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, col + "aa"); grad.addColorStop(1, col);
    ctx.strokeStyle = grad; ctx.lineCap = "round";
    ctx.shadowColor = col; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(cx, cy, r, start, cur); ctx.stroke(); ctx.shadowBlur = 0;

    ctx.strokeStyle = "#e6f1f7"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(cur) * (r - 4), cy + Math.sin(cur) * (r - 4));
    ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  }

  function push(arr, v) { arr.push(v); if (arr.length > MAX_POINTS) arr.shift(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---------- Simulation tick ----------
  function tick() {
    state.pressure = clamp(state.pressure + rand(-0.08, 0.08), 2.4, 4.4);
    state.ph = clamp(state.ph + rand(-0.03, 0.03), 6.6, 7.8);
    state.turb = clamp(state.turb + rand(-0.08, 0.08), 0.4, 3.2);
    state.flow = clamp(state.flow + rand(-15, 15), 600, 1050);
    state.inflow = clamp(state.inflow + rand(-12, 12), 500, 950);
    state.cl = clamp(state.cl + rand(-0.04, 0.04), 0.6, 2.2);
    state.tkA = clamp(state.tkA + rand(-0.5, 0.5), 30, 95);
    state.tkB = clamp(state.tkB + rand(-0.5, 0.5), 30, 95);
    state.pac = clamp(state.pac - 0.05, 20, 100);
    state.pacD = clamp(state.pacD + rand(-0.2, 0.2), 8, 18);
    state.clD = clamp(state.clD + rand(-0.04, 0.04), 1.0, 2.2);
    state.flocD = clamp(state.flocD + rand(-0.1, 0.1), 2.0, 4.5);
    state.hclD = clamp(state.hclD + rand(-0.6, 0.6), 10, 28);
    state.flowAcc += state.flow / 3600;
    state.pressureMax = Math.max(state.pressureMax, state.pressure);

    // NEW: CT = Cl × tiempo de contacto (asumimos 7 min en cámara de contacto)
    state.ct = state.cl * 7;
    // THM crece con cloro y materia orgánica (UV-254), decae lento
    state.thm = clamp(state.thm + (state.cl * state.uv * 50 - 2) * 0.08 + rand(-1, 1), 15, 110);
    // UV-254 varía con calidad agua cruda
    state.uv = clamp(state.uv + rand(-0.003, 0.003), 0.04, 0.18);
    state.sdi = clamp(state.sdi + rand(-0.08, 0.08), 1.5, 5.5);

    // Filtros: ΔP aumenta hasta lavado
    state.filters.forEach(f => {
      if (f.state === "bw") { f.dp = clamp(f.dp - 0.15, 0.2, 2.0); if (f.dp <= 0.25) f.state = "svc"; }
      else { f.dp = clamp(f.dp + rand(0.005, 0.025), 0.2, 2.0); if (f.dp > 1.3) f.state = "bw"; }
    });

    // KPI compuesto: penaliza desvíos
    let kpi = 100;
    if (state.turb > 1.0) kpi -= (state.turb - 1.0) * 8;
    if (state.cl < 1.0 || state.cl > 2.0) kpi -= 5;
    if (state.thm > 80) kpi -= (state.thm - 80) * 0.3;
    if (state.ct < 6) kpi -= (6 - state.ct) * 4;
    state.kpi = clamp(kpi, 50, 100);

    state.pumps.forEach(p => {
      if (p.state === "on") p.rpm = clamp(p.rpm + rand(-15, 15), 1380, 1520);
      else if (p.state === "warn") p.rpm = clamp(p.rpm + rand(-20, 20), 900, 1100);
      else p.rpm = 0;
    });

    push(series.pressure, state.pressure);
    push(series.ph, state.ph);
    push(series.turb, state.turb);
    push(series.flow, state.flow);

    render();
    maybeAlarm();
  }

  // ---------- Render ----------
  function render() {
    setVal("pressure", state.pressure.toFixed(2));
    setVal("pressure-max", state.pressureMax.toFixed(2));
    setVal("inflow", Math.round(state.inflow));
    setVal("ph", state.ph.toFixed(2));
    setVal("turb", state.turb.toFixed(2));
    setVal("cl", state.cl.toFixed(2));
    setVal("flow", Math.round(state.flow));
    setVal("flow-acc", Math.round(state.flowAcc));
    setVal("tkA", Math.round(state.tkA));
    setVal("tkB", Math.round(state.tkB));
    setVal("pac", Math.round(state.pac));
    setVal("pac-d", state.pacD.toFixed(1));
    setVal("cl-d", state.clD.toFixed(2));
    setVal("floc-d", state.flocD.toFixed(1));
    setVal("hcl-d", state.hclD.toFixed(1));
    setVal("ct", state.ct.toFixed(2));
    setVal("thm", state.thm.toFixed(0));
    setVal("uv", state.uv.toFixed(3));
    setVal("sdi", state.sdi.toFixed(1));

    // KPI bars
    const ctBar = document.getElementById("ctBar");
    if (ctBar) { ctBar.style.width = Math.min(100, (state.ct / 12) * 100) + "%"; ctBar.className = "kpi-bar-fill" + (state.ct < 6 ? " crit" : state.ct < 8 ? " warn" : ""); }
    const thmBar = document.getElementById("thmBar");
    if (thmBar) { thmBar.style.width = Math.min(100, (state.thm / 110) * 100) + "%"; thmBar.className = "kpi-bar-fill" + (state.thm > 90 ? " crit" : state.thm > 70 ? " warn" : ""); }
    const uvBar = document.getElementById("uvBar");
    if (uvBar) { uvBar.style.width = Math.min(100, (state.uv / 0.2) * 100) + "%"; uvBar.className = "kpi-bar-fill" + (state.uv > 0.15 ? " warn" : ""); }

    const kpiEl = document.getElementById("kpiVal");
    if (kpiEl) kpiEl.textContent = state.kpi.toFixed(0) + "%";

    const get = sel => document.querySelector(`[data-chart="${sel}"]`);
    drawLine(get("pressure"), series.pressure, TEAL);
    drawDualLine(get("ph"), series.ph, series.turb, CYAN, AMBER);
    drawLine(get("flow"), series.flow, TEAL);
    drawBars(get("energy"), series.energy, ["00","02","04","06","08","10","12","14","16","18","20","22"]);
    drawBars(get("pumps"), state.pumps.map(p => p.rpm), state.pumps.map(p => p.name));

    drawGauge(document.querySelector('[data-gauge="inflow"]'), state.inflow, 1200);
    drawGauge(document.querySelector('[data-gauge="cl"]'), state.cl, 3);
    drawGauge(document.querySelector('[data-gauge="tkA"]'), state.tkA, 100);
    drawGauge(document.querySelector('[data-gauge="tkB"]'), state.tkB, 100);
    drawGauge(document.querySelector('[data-gauge="pac"]'), state.pac, 100);

    renderPumps();
    renderFilters();
  }

  function setVal(key, v) {
    document.querySelectorAll(`[data-val="${key}"]`).forEach(el => el.textContent = v);
  }

  function renderPumps() {
    const grid = document.getElementById("pumpGrid");
    grid.innerHTML = state.pumps.map(p => `
      <div class="pump-card ${p.state}">
        <div class="pump-name">${p.name}</div>
        <div class="pump-rpm">${Math.round(p.rpm)}</div>
        <div class="pump-state">${p.state === "on" ? "Running" : p.state === "warn" ? "Vibración" : "Stopped"} · rpm</div>
      </div>`).join("");
  }

  function renderFilters() {
    const grid = document.getElementById("filterGrid");
    grid.innerHTML = state.filters.map(f => {
      const pct = Math.min(100, (f.dp / 1.5) * 100);
      const cls = f.dp > 1.2 ? "crit" : f.dp > 0.9 ? "warn" : "";
      return `<div class="filter-row">
        <span class="fn">${f.name}</span>
        <span class="fb"><div class="${cls}" style="width:${pct}%"></div></span>
        <span class="fs ${f.state}">${f.state === "bw" ? "BW " + f.dp.toFixed(2) : "SVC " + f.dp.toFixed(2)}</span>
      </div>`;
    }).join("");
  }

  // ====================================================
  //  ALARM SYSTEM v4 — filtros, búsqueda, ACK, export
  // ====================================================
  const log = document.getElementById("alarmLog");
  const events = [];
  let activeFilter = "all";
  let searchTerm = "";
  let evId = 0;

  function pushEvent(type, tag, msg) {
    const now = new Date();
    const t = now.toLocaleTimeString("es-ES", { hour12: false });
    events.unshift({ id: ++evId, t, ts: now.toISOString(), type, tag, msg, ack: false });
    if (events.length > 200) events.pop();
    renderEvents();
  }

  function renderEvents() {
    // Counts
    const counts = { all: events.length, crit: 0, warn: 0, info: 0, ok: 0 };
    events.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
    document.getElementById("cntAll").textContent = counts.all;
    document.getElementById("cntCrit").textContent = counts.crit;
    document.getElementById("cntWarn").textContent = counts.warn;
    document.getElementById("cntInfo").textContent = counts.info;
    document.getElementById("cntOk").textContent = counts.ok;

    const unack = events.filter(e => !e.ack).length;
    document.getElementById("evCount").textContent = `${unack} sin ACK / ${events.length} totales`;

    // Filter + search
    const q = searchTerm.toLowerCase();
    const visible = events.filter(e => {
      if (activeFilter !== "all" && e.type !== activeFilter) return false;
      if (!q) return true;
      return (e.msg + " " + e.tag + " " + e.t).toLowerCase().includes(q);
    });

    if (!visible.length) {
      log.innerHTML = `<li class="al-empty">Sin eventos para los filtros actuales</li>`;
      return;
    }

    log.innerHTML = visible.map(e => `
      <li class="${e.ack ? 'ack' : ''}" data-id="${e.id}">
        <span class="t">${e.t}</span>
        <span class="sev sev-${e.type}">${labelOf(e.type)}</span>
        <span class="msg"><strong>${e.tag}</strong> · ${e.msg}</span>
        <button class="ack-btn" data-ack="${e.id}" title="${e.ack ? 'Reconocido' : 'Reconocer'}">${e.ack ? '✓' : '○'}</button>
      </li>
    `).join("");
  }

  function labelOf(t) {
    return { crit: "CRIT", warn: "AVISO", info: "INFO", ok: "OK" }[t] || t.toUpperCase();
  }

  // Alarm rules with tag identifiers (ISA-18.2 style)
  function maybeAlarm() {
    if (state.ph > 7.6)         maybeOnce("AIT-301-HI", "warn", "AIT-301", `pH alto: ${state.ph.toFixed(2)} — ajustando HCl`);
    else if (state.ph < 6.8)    maybeOnce("AIT-301-LO", "warn", "AIT-301", `pH bajo: ${state.ph.toFixed(2)}`);
    if (state.turb > 2.8)       maybeOnce("AIT-302-HH", "crit", "AIT-302", `Turbidez crítica: ${state.turb.toFixed(2)} NTU`);
    else if (state.turb > 2.0)  maybeOnce("AIT-302-HI", "warn", "AIT-302", `Turbidez elevada: ${state.turb.toFixed(2)} NTU`);
    if (state.cl < 0.7)         maybeOnce("AIT-401-LL", "crit", "AIT-401", `Cloro residual bajo: ${state.cl.toFixed(2)} mg/L`);
    if (state.pressure > 4.2)   maybeOnce("PT-101-HI",  "warn", "PT-101",  `Presión elevada: ${state.pressure.toFixed(2)} bar`);
    if (state.tkA < 35)         maybeOnce("LIT-501-LO", "warn", "LIT-501", `Depósito A bajo: ${state.tkA.toFixed(0)}%`);
    if (state.pac < 25)         maybeOnce("WIT-601-LL", "crit", "WIT-601", `Silo PAC bajo: ${state.pac.toFixed(0)}% — reposición`);
    if (state.ct < 6)           maybeOnce("CT-DES-LO",  "crit", "CT-DES",  `CT desinfección bajo: ${state.ct.toFixed(2)} mg·min/L`);
    if (state.thm > 90)         maybeOnce("THM-HI",     "warn", "AIT-501", `THM elevados: ${state.thm.toFixed(0)} μg/L`);
    if (state.uv > 0.15)        maybeOnce("UV-254-HI",  "info", "AIT-201", `UV-254 alto: ${state.uv.toFixed(3)} — materia orgánica`);
    state.filters.forEach(f => {
      if (f.state === "bw") maybeOnce(`${f.name}-BW`, "info", f.name, `Filtro ${f.name} en BACKWASH · ΔP=${f.dp.toFixed(2)} bar`);
    });
    if (state.kpi < 80)         maybeOnce("KPI-LO",     "warn", "KPI",     `Eficiencia planta baja: ${state.kpi.toFixed(0)}%`);
  }
  const lastAlarm = {};
  function maybeOnce(key, type, tag, msg) {
    const now = Date.now();
    if (lastAlarm[key] && now - lastAlarm[key] < 25000) return;
    lastAlarm[key] = now;
    pushEvent(type, tag, msg);
  }

  // ---------- Alarm UI bindings ----------
  function bindAlarmUI() {
    // Filter chips
    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeFilter = chip.dataset.filter;
        renderEvents();
      });
    });
    // Search
    document.getElementById("alarmSearch").addEventListener("input", (e) => {
      searchTerm = e.target.value;
      renderEvents();
    });
    // ACK toggle individual
    log.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-ack]");
      const li = e.target.closest("li[data-id]");
      const id = parseInt((btn && btn.dataset.ack) || (li && li.dataset.id), 10);
      if (!id) return;
      const ev = events.find(x => x.id === id);
      if (ev) { ev.ack = !ev.ack; renderEvents(); }
    });
    // ACK all
    document.getElementById("ackAll").addEventListener("click", () => {
      events.forEach(e => e.ack = true);
      renderEvents();
    });
    // Clear
    document.getElementById("clrAll").addEventListener("click", () => {
      if (confirm("¿Limpiar todo el registro de eventos?")) {
        events.length = 0; renderEvents();
      }
    });
    // Export CSV
    document.getElementById("expCsv").addEventListener("click", exportCsv);
  }

  function exportCsv() {
    if (!events.length) { alert("No hay eventos para exportar."); return; }
    const rows = [["timestamp", "hora", "severidad", "tag", "mensaje", "ack"]];
    events.slice().reverse().forEach(e => rows.push([e.ts, e.t, e.type, e.tag, e.msg, e.ack ? "1" : "0"]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `scada-eventos-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ---------- Ticker / Clock ----------
  function setTicker() {
    const items = [
      `<span class="ok">● Planta operativa</span>`,
      `<span>Caudal acumulado: <strong>${Math.round(state.flowAcc)} m³</strong></span>`,
      `<span class="ok">● 5/5 bombas conectadas</span>`,
      `<span>CT desinfección · <strong>${state.ct.toFixed(2)} mg·min/L</strong></span>`,
      `<span>THM <strong>${state.thm.toFixed(0)} μg/L</strong> (límite 100)</span>`,
      `<span>Mantenimiento Filtro F-02 programado · 18:00</span>`,
      `<span class="warn">⚠ Vibración P-04 — supervisar</span>`,
      `<span>SCADA·SIM v4.0 · Fabricio M. Toso</span>`
    ];
    document.getElementById("ticker").innerHTML = items.concat(items).join(" · ");
  }

  function tickClock() {
    document.getElementById("clock").textContent =
      new Date().toLocaleTimeString("es-ES", { hour12: false });
  }

  // ---------- Boot ----------
  function boot() {
    document.getElementById("yr").textContent = new Date().getFullYear();
    bindAlarmUI();
    pushEvent("info", "SYS", "Sistema iniciado · modo AUTO");
    pushEvent("ok",   "PLC", "Comunicación PLC · OK");
    pushEvent("ok",   "CHEM","Lazo dosificación CHEM · OK");
    pushEvent("info", "DES", "Cámara contacto cloro · t=7 min");
    setTicker();
    tickClock();
    setInterval(tickClock, 1000);
    render();
    setInterval(tick, 1500);
    setInterval(setTicker, 8000);
    window.addEventListener("resize", () => { render(); setTicker(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
