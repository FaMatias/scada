/* SCADA Simulator v5.0 · ETAP completa + Tratamiento de Lodos
   Autor: Fabricio M. Toso · Vanilla JS, sin dependencias.
   Todo en español, unidades L/s y L/h en tiempo real. */

(() => {
  "use strict";

  const TEAL="#5cbdb9", CYAN="#2dd4e0", AMBER="#f5b945", RED="#ff5c7a",
        GREEN="#4ade80", VIOLET="#a78bfa", MUTED="#4f7691",
        GRID="rgba(92,189,185,0.08)";

  // ============== TOOLTIPS ==============
  const INFO = {
    raw:       ["Agua cruda","Agua captada del afluente natural (río o lago) antes de cualquier tratamiento."],
    turb:      ["Turbidez","Mide las partículas en suspensión en el agua, expresada en NTU (Nephelometric Turbidity Units). El RD 3/2023 exige <1 NTU en agua tratada."],
    ph:        ["pH","Acidez/alcalinidad del agua (0–14). Valor neutro 7. Agua potable: 6.5–9.5."],
    qin:       ["Caudal entrada","Caudal volumétrico que ingresa a la planta desde la captación, medido en L/s, L/h y m³/h."],
    cond:      ["Conductividad","Indicador indirecto de sales disueltas, en µS/cm. Aguas naturales típicas 100–800 µS/cm."],
    uv:        ["UV-254","Absorbancia ultravioleta a 254 nm: indica presencia de materia orgánica natural, precursora de THM."],
    afluente:  ["Nivel afluente","Nivel del recurso hídrico de captación (% del rango operativo)."],
    sdi:       ["SDI","Silt Density Index: índice de ensuciamiento por sólidos finos, relevante para membranas."],

    coag:      ["Coagulación","Adición de un coagulante (PAC, sulfato de aluminio o FeCl₃) que neutraliza cargas de los coloides para que se aglomeren."],
    coagulante:["Coagulante","Reactivo que desestabiliza los coloides en suspensión. La dosis óptima depende de turbidez, pH y temperatura."],
    silo:      ["Silo","Depósito de almacenamiento del reactivo en sólido o solución concentrada."],
    mixer:     ["Mezcla rápida","Agitación enérgica (~30 s) para distribuir el coagulante. Gradiente de velocidad G alto (>500 s⁻¹)."],
    effCoag:   ["Eficiencia coagulación","% de remoción de turbidez logrado entre entrada y salida del proceso de coagulación-floculación."],

    floc:      ["Floculación","Agitación lenta (~20–30 min) que favorece el contacto entre partículas desestabilizadas, formando flóculos sedimentables."],
    polielec:  ["Polielectrolito","Polímero (catiónico o aniónico) usado como ayudante de floculación. Dosis pequeñas (<1 mg/L)."],
    paddle:    ["Paletas","Agitador lento de la cámara de floculación. Velocidad baja para no romper los flóculos."],
    tret:      ["Tiempo de retención","Tiempo medio que el agua permanece en la cámara de floculación."],
    qfloc:     ["Calidad del flóculo","Índice visual del tamaño y densidad de los flóculos formados (0–10)."],

    decant:    ["Decantación","Separación gravitacional de los flóculos. Se usa decantador circular con puente barredor que recoge los lodos hacia el centro."],
    turbDec:   ["Turbidez salida decantador","Turbidez del agua que sale del decantador, antes de los filtros. Objetivo típico <3 NTU."],
    carga:     ["Carga superficial","Caudal por unidad de superficie de decantador (m³/m²·h). Determina la eficiencia de sedimentación."],
    puente:    ["Puente barredor","Mecanismo rotatorio que arrastra los lodos sedimentados hacia la tolva central de purga."],
    purga:     ["Purga de lodos","Extracción de los lodos sedimentados, enviados al espesador para tratamiento de fangos."],

    filt:      ["Filtración","Paso del agua decantada a través de un lecho filtrante (arena, antracita) para retener partículas finas."],
    filtros:   ["Filtros de arena","Filtros rápidos por gravedad. ΔP aumenta con la colmatación; al superar el umbral se inicia el backwash."],
    turbFilt:  ["Turbidez filtrada","Turbidez del agua filtrada, parámetro clave de calidad. Límite legal <1 NTU."],
    bw:        ["Backwash","Lavado en contracorriente del filtro con agua y aire para regenerar el lecho. Vuelve a cabecera o a espesador."],

    des:       ["Desinfección","Inactivación de microorganismos patógenos, generalmente con cloro (gas o hipoclorito)."],
    cl:        ["Cloro residual","Concentración de cloro libre en la red, en mg/L. Garantiza protección microbiológica residual (0.2–1.0 mg/L)."],
    ct:        ["CT desinfección","Producto Cl × tiempo de contacto, indicador de inactivación microbiana según USEPA SWTR. Objetivo ≥6 mg·min/L."],
    thm:       ["THM totales","Trihalometanos, subproductos de la cloración. Límite legal 100 µg/L (RD 3/2023)."],
    naclo:     ["Hipoclorito","Solución NaClO al 10–15% almacenada en tanque; dosificada por bomba electromagnética."],

    phReg:     ["Regulación pH","Ajuste final del pH del agua tratada. Se elige reactivo ácido o base según el desvío respecto al setpoint."],
    reactivo:  ["Reactivo pH","CO₂ y H₂SO₄ bajan el pH; NaOH y Ca(OH)₂ lo suben. La elección depende del agua y del impacto en alcalinidad."],
    phOut:     ["pH tratado","pH a la salida de regulación, justo antes de la red de distribución."],
    phDose:    ["Dosificación pH","Caudal de reactivo inyectado por bomba dosificadora proporcional al error de pH."],

    out:       ["Agua tratada","Agua que sale hacia depósitos y red de distribución, ya potabilizada y desinfectada."],
    qout:      ["Caudal salida","Caudal que la planta entrega a red. Suele equilibrarse con la demanda y el nivel de depósitos."],
    pres:      ["Presión de red","Presión a la cabecera de la red de distribución, en bar."],
    dep:       ["Depósito","Depósito regulador de agua tratada. Mantener nivel entre 30–95%."],

    sludge:    ["Tratamiento de lodos","Línea paralela que trata los fangos generados por purgas de decantador y backwash de filtros, reduciendo su volumen para gestión final."],
    espesador: ["Espesador","Concentra los lodos por gravedad: entran al ~0.5% de sólidos y salen al ~3%. Reduce drásticamente el volumen."],
    sequedad:  ["Sequedad torta","% materia seca en la torta tras deshidratación. Centrífugas: 20–25%; filtros banda: 16–20%."],
    captura:   ["Captura de sólidos","% de sólidos retenidos por el equipo deshidratador. Buen acondicionamiento → >95%."],
    polimero:  ["Polímero catiónico","Acondicionador previo a la deshidratación. Mejora drenaje y captura de sólidos."],
    deshid:    ["Deshidratación","Reduce humedad del lodo mediante centrífuga decanter o filtro banda hasta obtener torta manipulable."],
    torta:     ["Torta de lodo","Producto final deshidratado almacenado en contenedor para gestión externa (valorización, vertedero, agricultura)."],

    bombas:    ["Bombas / Equipos","Estado en tiempo real de bombas principales. Verde: en marcha. Ámbar: vibración. Gris: parada."],
    dosif:     ["Dosificación química","Resumen de todos los reactivos dosificados en la planta y sus caudales actuales."],
    alarmas:   ["Eventos","Registro de alarmas y eventos. Filtrar por severidad, buscar, reconocer (ACK) y exportar a CSV."]
  };

  function initTooltips() {
    const tip = document.getElementById("tip");
    let cur = null;
    function show(el) {
      const k = el.dataset.info;
      const data = INFO[k]; if (!data) return;
      tip.innerHTML = `<strong>${data[0]}</strong>${data[1]}`;
      const r = el.getBoundingClientRect();
      const tw = 280; let x = r.left + r.width/2 - tw/2;
      x = Math.max(8, Math.min(window.innerWidth - tw - 8, x));
      let y = r.bottom + 8;
      tip.style.left = x + "px"; tip.style.top = y + "px";
      tip.style.maxWidth = tw + "px";
      tip.classList.add("show"); tip.setAttribute("aria-hidden","false");
      cur = el;
    }
    function hide() { tip.classList.remove("show"); tip.setAttribute("aria-hidden","true"); cur = null; }
    document.addEventListener("mouseover", e => { const t = e.target.closest(".info"); if (t) show(t); });
    document.addEventListener("mouseout",  e => { if (e.target.closest(".info")) hide(); });
    document.addEventListener("focusin",   e => { const t = e.target.closest(".info"); if (t) show(t); });
    document.addEventListener("focusout",  e => { if (e.target.closest(".info")) hide(); });
    document.addEventListener("click",     e => { const t = e.target.closest(".info"); if (t) { if (cur===t) hide(); else show(t); } else hide(); });
    // make info dots focusable
    document.querySelectorAll(".info").forEach(i => { i.tabIndex = 0; i.setAttribute("aria-label","Información"); });
  }

  // ============== HiDPI ==============
  function fit(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0);
    return { ctx, w: r.width, h: r.height };
  }

  // ============== STATE ==============
  const MAX = 60;
  const series = { turbRaw:[], phRaw:[], turbDec:[], turbFilt:[], phOut:[], qout:[], cake:[] };

  const S = {
    // raw
    turbRaw: 12, turbRawMax: 12, phRaw: 7.4, tempRaw: 14.2,
    qinLps: 240, cond: 410, uv: 0.085, afluente: 78, sdi: 3.2,
    // coag
    coagulant: "PAC",
    coagDose: 28, coagConc: 12, coagSilo: 78, mixerRpm: 320, coagEff: 88,
    // floc
    flocDose: 0.4, flocConc: 0.1, paddleRpm: 18, tretFloc: 22, flocQ: 8.4,
    // decantador
    turbDec: 2.1, puenteRpm: 0.6, purgaLps: 4.5, carga: 1.8,
    // filtración
    filters: [
      { name: "FLT-01", dp: 0.42, state: "svc" },
      { name: "FLT-02", dp: 0.31, state: "svc" },
      { name: "FLT-03", dp: 0.78, state: "svc" }
    ],
    turbFilt: 0.38, bwVol: 120,
    // desinfección
    cl: 1.1, ct: 7.7, thm: 42, clDose: 1.4, clTank: 72,
    // pH
    phReact: "CO2", phOut: 7.5, phTank: 65,
    // salida
    qoutLps: 235, qoutAcc: 0, pres: 3.2, tkA: 78, tkB: 64,
    // lodos
    thIn: 0.5, thOut: 3.0, manto: 55,
    polDose: 5.0, polConc: 0.3,
    deshType: "CENT", cake: 22.5, captura: 96,
    tnAcum: 4.2, autonomy: 6.5, retLps: 2.1,
    // bombas y kpi
    pumps: [
      { name: "P-01 Captación", rpm: 1450, state: "on" },
      { name: "P-02 Decantador", rpm: 1480, state: "on" },
      { name: "P-03 Filtros",   rpm: 0,    state: "off" },
      { name: "P-04 Cloración", rpm: 980,  state: "warn" },
      { name: "P-05 Lodos",     rpm: 1420, state: "on" }
    ],
    kpi: 96
  };

  // Seed
  for (let i=0;i<MAX;i++){
    series.turbRaw.push(10 + Math.sin(i/6)*3 + Math.random()*2);
    series.phRaw.push(7.3 + Math.sin(i/8)*0.15);
    series.turbDec.push(2 + Math.cos(i/7)*0.3);
    series.turbFilt.push(0.4 + Math.random()*0.1);
    series.phOut.push(7.5 + Math.sin(i/9)*0.08);
    series.qout.push(230 + Math.sin(i/5)*20);
    series.cake.push(22 + Math.sin(i/6)*1.5);
  }

  // ============== DRAW ==============
  function drawLine(canvas, data, color, opts={}) {
    const { ctx, w, h } = fit(canvas);
    const min = opts.min ?? Math.min(...data)*0.95;
    const max = opts.max ?? Math.max(...data)*1.05;
    const range = max - min || 1, pad = 8;
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    for (let i=1;i<4;i++){ const y = pad+((h-pad*2)*i)/4; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,color+"55"); grad.addColorStop(1,color+"00");
    ctx.beginPath();
    data.forEach((v,i)=>{ const x=(i/(data.length-1))*w; const y=pad+(h-pad*2)*(1-(v-min)/range); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    data.forEach((v,i)=>{ const x=(i/(data.length-1))*w; const y=pad+(h-pad*2)*(1-(v-min)/range); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.strokeStyle = color; ctx.lineWidth = 1.8;
    ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
    const ly = pad+(h-pad*2)*(1-(data[data.length-1]-min)/range);
    ctx.beginPath(); ctx.arc(w-2,ly,3,0,Math.PI*2); ctx.fillStyle = color; ctx.fill();
  }

  function drawGauge(canvas, value, max) {
    const { ctx, w, h } = fit(canvas);
    const cx=w/2, cy=h*0.78, r=Math.min(w*0.42,h*0.62);
    const start=Math.PI, end=2*Math.PI;
    const pct=Math.max(0,Math.min(1,value/max));
    const cur=start+(end-start)*pct;
    ctx.lineWidth = Math.max(8,r*0.18);
    ctx.strokeStyle = "rgba(92,189,185,0.12)";
    ctx.beginPath(); ctx.arc(cx,cy,r,start,end); ctx.stroke();
    ctx.strokeStyle = "rgba(122,160,184,0.35)"; ctx.lineWidth = 1;
    for (let i=0;i<=10;i++){ const a=start+(end-start)*(i/10); const x1=cx+Math.cos(a)*(r+6),y1=cy+Math.sin(a)*(r+6); const x2=cx+Math.cos(a)*(r+12),y2=cy+Math.sin(a)*(r+12); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
    let col = TEAL; if (pct>0.85) col=RED; else if (pct>0.7) col=AMBER;
    const grad = ctx.createLinearGradient(0,0,w,0);
    grad.addColorStop(0,col+"aa"); grad.addColorStop(1,col);
    ctx.strokeStyle = grad; ctx.lineCap = "round";
    ctx.shadowColor = col; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(cx,cy,r,start,cur); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = "#e6f1f7"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(cur)*(r-4), cy+Math.sin(cur)*(r-4)); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fill();
  }

  // ============== HELPERS ==============
  const push = (a,v) => { a.push(v); if (a.length>MAX) a.shift(); };
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const rand = (a,b) => a + Math.random()*(b-a);
  const setVal = (k,v) => document.querySelectorAll(`[data-val="${k}"]`).forEach(el=>el.textContent=v);

  // ============== SIMULATION ==============
  function tick() {
    // AGUA CRUDA
    S.turbRaw = clamp(S.turbRaw + rand(-1.2, 1.2), 3, 280);
    S.turbRawMax = Math.max(S.turbRawMax, S.turbRaw);
    S.phRaw = clamp(S.phRaw + rand(-0.04, 0.04), 6.6, 8.4);
    S.tempRaw = clamp(S.tempRaw + rand(-0.1, 0.1), 8, 22);
    S.qinLps = clamp(S.qinLps + rand(-5, 5), 150, 310);
    S.cond = clamp(S.cond + rand(-6, 6), 200, 750);
    S.uv = clamp(S.uv + rand(-0.003, 0.003), 0.04, 0.18);
    S.afluente = clamp(S.afluente + rand(-0.3, 0.3), 30, 98);
    S.sdi = clamp(S.sdi + rand(-0.08, 0.08), 1.5, 5.5);

    // COAGULACIÓN — dosis adaptativa a turbidez cruda
    const targetDose = clamp(8 + S.turbRaw*0.18, 8, 60);
    S.coagDose = S.coagDose + (targetDose - S.coagDose)*0.15 + rand(-0.3,0.3);
    S.coagConc = (S.coagulant === "PAC") ? 18 : (S.coagulant === "ALSO4") ? 8 : 12;
    S.coagSilo = clamp(S.coagSilo - 0.015, 8, 100);
    S.mixerRpm = clamp(S.mixerRpm + rand(-4,4), 280, 360);
    S.coagEff  = clamp(95 - (S.turbRaw>120 ? (S.turbRaw-120)*0.05 : 0) + rand(-0.6,0.6), 70, 99);

    // FLOC
    S.flocDose = clamp(0.3 + S.turbRaw*0.003 + rand(-0.02,0.02), 0.2, 1.2);
    S.paddleRpm = clamp(S.paddleRpm + rand(-0.4,0.4), 12, 28);
    S.tretFloc  = clamp(S.tretFloc + rand(-0.2,0.2), 18, 28);
    S.flocQ     = clamp(8 + (S.coagEff-85)*0.05 + rand(-0.15,0.15), 4, 10);

    // DECANT
    S.turbDec = clamp(S.turbRaw*(1 - S.coagEff/100) + rand(-0.1,0.1), 0.5, 8);
    S.carga   = clamp(S.qinLps*3.6 / 480, 0.8, 3.5); // 480 m² superficie
    S.puenteRpm = 0.6;
    S.purgaLps  = clamp(S.qinLps*0.018 + rand(-0.2,0.2), 2, 8);

    // FILTROS
    S.filters.forEach(f => {
      if (f.state === "bw") { f.dp = clamp(f.dp - 0.15, 0.2, 2.0); if (f.dp<=0.25) f.state="svc"; }
      else { f.dp = clamp(f.dp + rand(0.005,0.025), 0.2, 2.0); if (f.dp>1.3) f.state="bw"; }
    });
    S.turbFilt = clamp(S.turbDec*0.08 + rand(-0.02,0.02), 0.1, 1.5);
    S.bwVol    = clamp(S.bwVol + (S.filters.some(f=>f.state==="bw") ? 0.4 : 0.02), 50, 600);

    // DESINFECCIÓN
    S.cl = clamp(S.cl + rand(-0.04, 0.04), 0.4, 2.2);
    S.ct = S.cl * 7;
    S.thm = clamp(S.thm + (S.cl*S.uv*50 - 2)*0.08 + rand(-1,1), 15, 110);
    S.clDose = clamp(0.9 + (1.2 - S.cl)*0.4 + rand(-0.05,0.05), 0.6, 2.5);
    S.clTank = clamp(S.clTank - 0.012, 10, 100);

    // pH
    S.phOut = clamp(S.phOut + (7.5 - S.phOut)*0.12 + rand(-0.03,0.03), 6.6, 8.6);
    S.phTank = clamp(S.phTank - 0.01, 8, 100);

    // SALIDA
    S.qoutLps = clamp(S.qinLps - S.purgaLps - 1.2 + rand(-2,2), 140, 305);
    S.qoutAcc += S.qoutLps / 1000; // m³ aprox
    S.pres = clamp(S.pres + rand(-0.05, 0.05), 2.4, 4.4);
    S.tkA = clamp(S.tkA + rand(-0.4, 0.4), 30, 95);
    S.tkB = clamp(S.tkB + rand(-0.4, 0.4), 30, 95);

    // LODOS
    S.thIn = clamp(0.45 + rand(-0.03, 0.03), 0.3, 0.8);
    S.thOut = clamp(3.0 + rand(-0.1, 0.1), 2.5, 4);
    S.manto = clamp(S.manto + rand(-0.4, 0.4), 30, 80);
    S.polDose = clamp(S.polDose + rand(-0.05,0.05), 3.5, 7);
    const targetCake = (S.deshType === "CENT") ? 23 : 18;
    S.cake = clamp(S.cake + (targetCake - S.cake)*0.08 + rand(-0.2,0.2), 14, 28);
    S.captura = clamp(94 + (S.polDose-4)*1.2 + rand(-0.5,0.5), 80, 99);
    const kgMSh = S.purgaLps * 3.6 * (S.thOut/100) * 1000; // kg MS/h
    S._kgMSh = kgMSh;
    S.tnAcum = clamp(S.tnAcum + kgMSh/1000/3600, 0, 30);
    S.autonomy = clamp((25 - S.tnAcum) / (kgMSh*24/1000), 0.5, 30);
    S.retLps = clamp(S.purgaLps*0.6 + rand(-0.1,0.1), 1, 6);

    // BOMBAS
    S.pumps.forEach(p => {
      if (p.state === "on")   p.rpm = clamp(p.rpm + rand(-15,15), 1380, 1520);
      else if (p.state === "warn") p.rpm = clamp(p.rpm + rand(-20,20), 900, 1100);
      else p.rpm = 0;
    });

    // KPI
    let k = 100;
    if (S.turbFilt > 1.0) k -= (S.turbFilt-1.0)*15;
    if (S.cl < 1.0 || S.cl > 2.0) k -= 5;
    if (S.thm > 80) k -= (S.thm-80)*0.3;
    if (S.ct < 6) k -= (6 - S.ct)*4;
    if (S.cake < 20) k -= (20 - S.cake)*1.5;
    if (Math.abs(S.phOut - 7.5) > 0.4) k -= 4;
    S.kpi = clamp(k, 50, 100);

    // SERIES
    push(series.turbRaw, S.turbRaw);
    push(series.phRaw, S.phRaw);
    push(series.turbDec, S.turbDec);
    push(series.turbFilt, S.turbFilt);
    push(series.phOut, S.phOut);
    push(series.qout, S.qoutLps);
    push(series.cake, S.cake);

    render();
    maybeAlarm();
  }

  // ============== RENDER ==============
  function render() {
    // Raw
    setVal("turbRaw", S.turbRaw.toFixed(1));
    setVal("turbRawMax", S.turbRawMax.toFixed(1));
    setVal("phRaw", S.phRaw.toFixed(2));
    setVal("tempRaw", S.tempRaw.toFixed(1));
    setVal("qinLps", S.qinLps.toFixed(1));
    setVal("qinLph", Math.round(S.qinLps*3600).toLocaleString("es-ES"));
    setVal("qinM3h", Math.round(S.qinLps*3.6));
    setVal("cond", Math.round(S.cond));
    setVal("uv", S.uv.toFixed(3));
    setVal("afluente", Math.round(S.afluente));
    setVal("sdi", S.sdi.toFixed(1));

    // Coag
    setVal("coagDose", S.coagDose.toFixed(1));
    setVal("coagConc", S.coagConc.toFixed(1));
    const coagLps = (S.coagDose * S.qinLps) / (S.coagConc*10000); // L/s solución
    setVal("coagLps", coagLps.toFixed(3));
    setVal("coagLph", Math.round(coagLps*3600));
    setVal("coagKgDay", Math.round(S.coagDose * S.qinLps * 0.0864));
    setVal("coagSilo", Math.round(S.coagSilo));
    setVal("mixerRpm", Math.round(S.mixerRpm));
    setVal("gMix", Math.round(550 + (S.mixerRpm-320)*2));
    setVal("coagEff", S.coagEff.toFixed(1));

    // Floc
    setVal("flocDose", S.flocDose.toFixed(2));
    const flocLps = (S.flocDose * S.qinLps) / (S.flocConc*10000);
    setVal("flocLps", flocLps.toFixed(3));
    setVal("flocLph", Math.round(flocLps*3600));
    setVal("flocConc", S.flocConc.toFixed(2));
    setVal("flocKgDay", Math.round(S.flocDose * S.qinLps * 0.0864 * 10)/10);
    setVal("paddleRpm", S.paddleRpm.toFixed(1));
    setVal("gFloc", Math.round(45 + (S.paddleRpm-18)*2));
    setVal("tretFloc", S.tretFloc.toFixed(0));
    setVal("flocQ", S.flocQ.toFixed(1));

    // Decant
    setVal("turbDec", S.turbDec.toFixed(2));
    setVal("decEff", (100*(1 - S.turbDec/Math.max(S.turbRaw,1))).toFixed(1));
    setVal("carga", S.carga.toFixed(2));
    setVal("puenteRpm", S.puenteRpm.toFixed(2));
    setVal("purgaLps", S.purgaLps.toFixed(2));
    setVal("purgaLph", Math.round(S.purgaLps*3600));

    // Filt
    setVal("turbFilt", S.turbFilt.toFixed(2));
    setVal("bwVol", Math.round(S.bwVol));

    // Des
    setVal("cl", S.cl.toFixed(2));
    setVal("ct", S.ct.toFixed(2));
    setVal("thm", S.thm.toFixed(0));
    setVal("clDose", S.clDose.toFixed(2));
    const clLps = (S.clDose * S.qoutLps) / (120000); // NaClO ~12%
    setVal("clLps", clLps.toFixed(4));
    setVal("clLph", (clLps*3600).toFixed(1));
    setVal("clTank", Math.round(S.clTank));

    // pH
    setVal("phOut", S.phOut.toFixed(2));
    const phLps = Math.max(0.0005, Math.abs(S.phOut - 7.5)*0.02);
    setVal("phLps", phLps.toFixed(4));
    setVal("phLph", (phLps*3600).toFixed(1));
    setVal("phTank", Math.round(S.phTank));
    setVal("phKgDay", (phLps*3600*24*1.2).toFixed(1));
    const reactLabel = {CO2:"CO₂", H2SO4:"H₂SO₄", NAOH:"NaOH 30%", CAOH:"Ca(OH)₂"}[S.phReact];
    const sub = document.getElementById("phReactivoSub"); if (sub) sub.textContent = reactLabel;

    // Out
    setVal("qoutLps", S.qoutLps.toFixed(1));
    setVal("qoutM3h", Math.round(S.qoutLps*3.6));
    setVal("qoutAcc", Math.round(S.qoutAcc));
    setVal("pres", S.pres.toFixed(2));
    setVal("tkA", Math.round(S.tkA));
    setVal("tkB", Math.round(S.tkB));

    // Lodos
    setVal("thIn", S.thIn.toFixed(2));
    setVal("thOut", S.thOut.toFixed(2));
    setVal("thLps", S.purgaLps.toFixed(2));
    setVal("thLph", Math.round(S.purgaLps*3600));
    setVal("manto", Math.round(S.manto));
    setVal("polDose", S.polDose.toFixed(1));
    const polLps = (S._kgMSh * S.polDose/1000) / (S.polConc*10) / 3600;
    setVal("polLps", polLps.toFixed(4));
    setVal("polLph", (polLps*3600).toFixed(1));
    setVal("polConc", S.polConc.toFixed(2));
    setVal("polKgDay", (S._kgMSh * S.polDose/1000 * 24).toFixed(1));
    const deshLps = S.purgaLps + S.retLps*0.1;
    setVal("deshLps", deshLps.toFixed(2));
    setVal("deshLph", Math.round(deshLps*3600));
    setVal("kgMSh", Math.round(S._kgMSh));
    setVal("cake", S.cake.toFixed(1));
    setVal("captura", S.captura.toFixed(1));
    setVal("tnAcum", S.tnAcum.toFixed(2));
    setVal("humTorta", (100 - S.cake).toFixed(1));
    setVal("autonomy", S.autonomy.toFixed(1));
    setVal("retLps", S.retLps.toFixed(2));

    // KPI bars
    setBar("ctBar", (S.ct/12)*100, S.ct<6?"crit":S.ct<8?"warn":"");
    setBar("thmBar", (S.thm/110)*100, S.thm>90?"crit":S.thm>70?"warn":"");
    setBar("coagBar", S.coagEff, S.coagEff<80?"warn":"");
    setBar("flocBar", S.flocQ*10, S.flocQ<6?"warn":"");

    const kpiEl = document.getElementById("kpiVal");
    if (kpiEl) kpiEl.textContent = S.kpi.toFixed(0) + "%";

    // Charts
    const q = s => document.querySelector(`[data-chart="${s}"]`);
    drawLine(q("turbRaw"), series.turbRaw, AMBER);
    drawLine(q("phRaw"), series.phRaw, CYAN);
    drawLine(q("turbDec"), series.turbDec, TEAL);
    drawLine(q("turbFilt"), series.turbFilt, GREEN, {min:0, max:1.2});
    drawLine(q("phOut"), series.phOut, CYAN, {min:6.8, max:8.2});
    drawLine(q("qout"), series.qout, TEAL);
    drawLine(q("cake"), series.cake, VIOLET, {min:14, max:28});

    // Gauges
    drawGauge(document.querySelector('[data-gauge="qin"]'), S.qinLps, 350);
    drawGauge(document.querySelector('[data-gauge="afluente"]'), S.afluente, 100);
    drawGauge(document.querySelector('[data-gauge="coagSilo"]'), S.coagSilo, 100);
    drawGauge(document.querySelector('[data-gauge="cl"]'), S.cl, 3);
    drawGauge(document.querySelector('[data-gauge="pres"]'), S.pres, 5);
    drawGauge(document.querySelector('[data-gauge="tkA"]'), S.tkA, 100);
    drawGauge(document.querySelector('[data-gauge="tkB"]'), S.tkB, 100);
    drawGauge(document.querySelector('[data-gauge="captura"]'), S.captura, 100);

    renderPumps();
    renderFilters();
  }

  function setBar(id, pct, cls) {
    const el = document.getElementById(id); if (!el) return;
    el.style.width = clamp(pct,0,100) + "%";
    el.className = "kpi-bar-fill" + (cls?" "+cls:"");
  }

  function renderPumps() {
    document.getElementById("pumpGrid").innerHTML = S.pumps.map(p => `
      <div class="pump-card ${p.state}">
        <div class="pump-name">${p.name}</div>
        <div class="pump-rpm">${Math.round(p.rpm)}</div>
        <div class="pump-state">${p.state==="on"?"En marcha":p.state==="warn"?"Vibración":"Parada"} · rpm</div>
      </div>`).join("");
  }

  function renderFilters() {
    document.getElementById("filterGrid").innerHTML = S.filters.map(f => {
      const pct = Math.min(100, (f.dp/1.5)*100);
      const cls = f.dp>1.2 ? "crit" : f.dp>0.9 ? "warn" : "";
      return `<div class="filter-row">
        <span class="fn">${f.name}</span>
        <span class="fb"><div class="${cls}" style="width:${pct}%"></div></span>
        <span class="fs ${f.state}">${f.state==="bw"?"BACKWASH "+f.dp.toFixed(2):"SERVICIO "+f.dp.toFixed(2)} bar</span>
      </div>`;
    }).join("");
  }

  // ============== ALARMS ==============
  const log = document.getElementById("alarmLog");
  const events = []; let activeFilter="all", searchTerm="", evId=0;

  function pushEvent(type, tag, msg) {
    const now = new Date();
    const t = now.toLocaleTimeString("es-ES",{hour12:false});
    events.unshift({ id:++evId, t, ts:now.toISOString(), type, tag, msg, ack:false });
    if (events.length > 200) events.pop();
    renderEvents();
  }

  function renderEvents() {
    const counts = { all:events.length, crit:0, warn:0, info:0, ok:0 };
    events.forEach(e => { if (counts[e.type]!==undefined) counts[e.type]++; });
    document.getElementById("cntAll").textContent = counts.all;
    document.getElementById("cntCrit").textContent = counts.crit;
    document.getElementById("cntWarn").textContent = counts.warn;
    document.getElementById("cntInfo").textContent = counts.info;
    document.getElementById("cntOk").textContent = counts.ok;
    const unack = events.filter(e=>!e.ack).length;
    document.getElementById("evCount").textContent = `${unack} sin reconocer / ${events.length} totales`;
    const q = searchTerm.toLowerCase();
    const visible = events.filter(e => {
      if (activeFilter!=="all" && e.type!==activeFilter) return false;
      if (!q) return true;
      return (e.msg+" "+e.tag+" "+e.t).toLowerCase().includes(q);
    });
    if (!visible.length) { log.innerHTML = `<li class="al-empty">Sin eventos para los filtros actuales</li>`; return; }
    log.innerHTML = visible.map(e => `
      <li class="${e.ack?'ack':''}" data-id="${e.id}">
        <span class="t">${e.t}</span>
        <span class="sev sev-${e.type}">${({crit:"CRÍTICA",warn:"AVISO",info:"INFO",ok:"OK"})[e.type]}</span>
        <span class="msg"><strong>${e.tag}</strong> · ${e.msg}</span>
        <button class="ack-btn" data-ack="${e.id}" title="${e.ack?'Reconocido':'Reconocer'}">${e.ack?'✓':'○'}</button>
      </li>`).join("");
  }

  const lastA = {};
  function once(key, type, tag, msg) {
    const now = Date.now();
    if (lastA[key] && now - lastA[key] < 25000) return;
    lastA[key] = now; pushEvent(type, tag, msg);
  }

  function maybeAlarm() {
    if (S.turbRaw > 200) once("RAW-HH","crit","AIT-101",`Turbidez cruda crítica: ${S.turbRaw.toFixed(0)} NTU — revisar captación`);
    else if (S.turbRaw > 120) once("RAW-HI","warn","AIT-101",`Turbidez cruda elevada: ${S.turbRaw.toFixed(0)} NTU`);
    if (S.phRaw < 6.5 || S.phRaw > 8.5) once("PH-RAW","warn","AIT-102",`pH cruda fuera de rango: ${S.phRaw.toFixed(2)}`);
    if (S.coagSilo < 15) once("SILO-LL","crit","WIT-201",`Silo coagulante bajo: ${S.coagSilo.toFixed(0)}% — programar reposición`);
    if (S.turbDec > 5) once("DEC-HI","warn","AIT-401",`Turbidez salida decantador alta: ${S.turbDec.toFixed(2)} NTU`);
    if (S.turbFilt > 1.0) once("FILT-HI","crit","AIT-501",`Turbidez filtrada > 1 NTU: ${S.turbFilt.toFixed(2)} — RD 3/2023`);
    S.filters.forEach(f => { if (f.state==="bw") once(`${f.name}-BW`,"info",f.name,`Filtro ${f.name} en BACKWASH · ΔP=${f.dp.toFixed(2)} bar`); });
    if (S.cl < 0.6) once("CL-LL","crit","AIT-601",`Cloro residual bajo: ${S.cl.toFixed(2)} mg/L`);
    if (S.ct < 6) once("CT-LO","crit","CT-DES",`CT desinfección insuficiente: ${S.ct.toFixed(2)} mg·min/L`);
    if (S.thm > 90) once("THM-HI","warn","AIT-602",`THM elevados: ${S.thm.toFixed(0)} µg/L`);
    if (Math.abs(S.phOut - 7.5) > 0.4) once("PH-OUT","warn","AIT-701",`pH tratado fuera de banda: ${S.phOut.toFixed(2)}`);
    if (S.pres > 4.2) once("PRES-HI","warn","PT-801",`Presión red elevada: ${S.pres.toFixed(2)} bar`);
    if (S.tkA < 35) once("LIT-501","warn","LIT-501",`Depósito A bajo: ${S.tkA.toFixed(0)}%`);
    if (S.cake < 18) once("CAKE-LO","warn","TK-902",`Sequedad torta baja: ${S.cake.toFixed(1)}% — revisar polímero`);
    if (S.captura < 88) once("CAP-LO","warn","TK-902",`Captura de sólidos baja: ${S.captura.toFixed(1)}%`);
    if (S.autonomy < 1.5) once("CONT-FULL","crit","BIN-901",`Contenedor torta casi lleno · autonomía ${S.autonomy.toFixed(1)} d`);
    if (S.kpi < 80) once("KPI-LO","warn","KPI",`Eficiencia planta baja: ${S.kpi.toFixed(0)}%`);
  }

  // ============== UI BINDINGS ==============
  function bindUI() {
    document.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
      c.classList.add("active"); activeFilter = c.dataset.filter; renderEvents();
    }));
    document.getElementById("alarmSearch").addEventListener("input", e => { searchTerm = e.target.value; renderEvents(); });
    log.addEventListener("click", e => {
      const btn = e.target.closest("[data-ack]");
      const li  = e.target.closest("li[data-id]");
      const id = parseInt((btn && btn.dataset.ack) || (li && li.dataset.id), 10);
      if (!id) return;
      const ev = events.find(x=>x.id===id);
      if (ev) { ev.ack = !ev.ack; renderEvents(); }
    });
    document.getElementById("ackAll").addEventListener("click", () => { events.forEach(e=>e.ack=true); renderEvents(); });
    document.getElementById("clrAll").addEventListener("click", () => {
      if (confirm("¿Limpiar todo el registro de eventos?")) { events.length = 0; renderEvents(); }
    });
    document.getElementById("expCsv").addEventListener("click", exportCsv);

    // Selects
    const coagSel = document.getElementById("coagSel");
    const phSel   = document.getElementById("phSel");
    const deshSel = document.getElementById("deshSel");
    // restore
    const saved = JSON.parse(localStorage.getItem("scada5-prefs") || "{}");
    if (saved.coag) coagSel.value = S.coagulant = saved.coag;
    if (saved.ph) phSel.value = S.phReact = saved.ph;
    if (saved.desh) deshSel.value = S.deshType = saved.desh;
    const save = () => localStorage.setItem("scada5-prefs", JSON.stringify({coag:S.coagulant, ph:S.phReact, desh:S.deshType}));
    coagSel.addEventListener("change", e => { S.coagulant = e.target.value; save(); pushEvent("info","CHEM",`Coagulante cambiado a ${S.coagulant}`); });
    phSel.addEventListener("change",   e => { S.phReact   = e.target.value; save(); pushEvent("info","pH",`Reactivo pH cambiado a ${S.phReact}`); });
    deshSel.addEventListener("change", e => { S.deshType  = e.target.value; save(); pushEvent("info","LODOS",`Deshidratación cambiada a ${S.deshType==="CENT"?"centrífuga":"filtro banda"}`); });
  }

  function exportCsv() {
    if (!events.length) { alert("No hay eventos para exportar."); return; }
    const rows = [["timestamp","hora","severidad","tag","mensaje","reconocido"]];
    events.slice().reverse().forEach(e => rows.push([e.ts,e.t,e.type,e.tag,e.msg,e.ack?"1":"0"]));
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `scada-eventos-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ============== TICKER / CLOCK ==============
  function setTicker() {
    const items = [
      `<span class="ok">● Planta operativa</span>`,
      `<span>Caudal entrada · <strong>${S.qinLps.toFixed(0)} L/s</strong> (${Math.round(S.qinLps*3.6)} m³/h)</span>`,
      `<span>Caudal salida · <strong>${S.qoutLps.toFixed(0)} L/s</strong></span>`,
      `<span>Turbidez cruda <strong>${S.turbRaw.toFixed(1)} NTU</strong> → filtrada <strong>${S.turbFilt.toFixed(2)} NTU</strong></span>`,
      `<span class="ok">● CT ${S.ct.toFixed(1)} mg·min/L</span>`,
      `<span>THM <strong>${S.thm.toFixed(0)} µg/L</strong> (límite 100)</span>`,
      `<span>Lodos · sequedad torta <strong>${S.cake.toFixed(1)}%</strong></span>`,
      `<span class="warn">⚠ Vibración P-04 — supervisar</span>`,
      `<span>SCADA·SIM v5.0 · Fabricio M. Toso</span>`
    ];
    document.getElementById("ticker").innerHTML = items.concat(items).join(" · ");
  }
  function tickClock() {
    document.getElementById("clock").textContent = new Date().toLocaleTimeString("es-ES",{hour12:false});
  }

  // ============== BOOT ==============
  function boot() {
    document.getElementById("yr").textContent = new Date().getFullYear();
    initTooltips();
    bindUI();
    pushEvent("ok","SYS","SCADA v5.0 iniciado · ETAP + tratamiento de lodos");
    pushEvent("info","SYS","Modo AUTO · operador F. TOSO");
    tick(); setTicker(); tickClock();
    setInterval(tick, 1000);
    setInterval(setTicker, 12000);
    setInterval(tickClock, 1000);
    window.addEventListener("resize", render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
