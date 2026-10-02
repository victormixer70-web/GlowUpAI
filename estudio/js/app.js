import * as store from "./store.js";
import * as gemini from "./gemini.js";
import { renderMarkdown, escapeHTML as esc } from "./markdown.js";
import { generatePlan, KIND_LABEL } from "./planner.js";
import * as nb from "./notebook.js";

const $ = (sel, root = document) => root.querySelector(sel);
const view = $("#view");

const ui = {
  route: "hoy",
  planDay: store.isoDate(),
  tutorSubject: store.get().subjects[0]?.id,
  focus: null, // { subjectId, topic, task } cuando se abre el tutor desde un bloque
  streaming: null, // { subjectId, text, controller }
  chatError: null,
  pendingImage: null, // { mimeType, data, url }
  imageCache: new Map(), // id de mensaje -> imagen (solo en memoria)
  planBusy: false,
  planError: null,
  showExamForm: false,
  models: null,
  modelsBusy: false,
  sessionOpen: false,
  alerted: false,
  installPrompt: null,
  tutorTab: "chat", // "chat" | "cuaderno"
  nbTopic: null, // tema abierto en el cuaderno
  nbTab: "leccion", // "leccion" | "evaluacion"
  nbLesson: null, // { topicId, text, controller } mientras se escribe una lección
  nbBusy: false, // preparando una evaluación
  nbError: null,
  quiz: null, // evaluación en curso
  quizCount: 5,
  quizDiff: "media",
  keepInnerScroll: false,
};

// ---------------------------------------------------------------- utilidades

const ICONS = {
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  home: '<path d="M3 10.5L12 3l9 7.5V21H3z"/><path d="M9 21v-6h6v6"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  chart: '<line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="19" y1="20" x2="19" y2="9"/>',
  play: '<polygon points="7 4 20 12 7 20 7 4"/>',
  pause: '<line x1="9" y1="5" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  send: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V3h6v3"/>',
  x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  sparkle: '<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  download: '<path d="M12 4v11"/><polyline points="7 10 12 15 17 10"/><line x1="5" y1="20" x2="19" y2="20"/>',
  upload: '<path d="M12 15V4"/><polyline points="7 9 12 4 17 9"/><line x1="5" y1="20" x2="19" y2="20"/>',
  chevron: '<polyline points="15 18 9 12 15 6"/>',
  chevronRight: '<polyline points="9 18 15 12 9 6"/>',
  timer: '<circle cx="12" cy="13" r="8"/><line x1="12" y1="13" x2="12" y2="9"/><line x1="10" y1="2" x2="14" y2="2"/>',
};

function icon(name, size = 20) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

function color(subject) {
  return /^#[0-9a-f]{6}$/i.test(subject?.color || "") ? subject.color : "#475569";
}

function fmtMin(m) {
  m = Math.round(m);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

function fmtDateLong(iso) {
  return store.parseDate(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function fmtDateShort(iso) {
  return store.parseDate(iso).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function daysLeftLabel(n) {
  if (n === 0) return "hoy";
  if (n === 1) return "mañana";
  return `en ${n} días`;
}

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function nextExams() {
  const today = store.isoDate();
  return store
    .get()
    .exams.filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function minutesOn(date, subjectId) {
  return store
    .get()
    .log.filter((l) => l.date === date && (!subjectId || l.subjectId === subjectId))
    .reduce((a, l) => a + l.minutes, 0);
}

function streak() {
  const days = new Set(store.get().log.filter((l) => l.minutes > 0).map((l) => l.date));
  let d = store.isoDate();
  if (!days.has(d)) d = store.addDays(d, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = store.addDays(d, -1);
  }
  return n;
}

// ---------------------------------------------------------------- componentes

function topbar(eyebrow, title, extra = "") {
  return `<header class="topbar">
    <div class="topbar-text"><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1></div>
    ${extra || `<a class="icon-btn" href="#/ajustes" aria-label="Ajustes">${icon("settings")}</a>`}
  </header>`;
}

function blockRow(b) {
  const sub = store.subjectById(b.subjectId);
  return `<li class="block-row${b.done ? " is-done" : ""}">
    <button class="check${b.done ? " on" : ""}" data-action="toggle-block" data-id="${b.id}" aria-pressed="${b.done}" aria-label="${b.done ? "Marcar como pendiente" : "Marcar como hecho"}">${b.done ? icon("check", 14) : ""}</button>
    <div class="block-main">
      <div class="block-title"><span class="dot" style="background:${color(sub)}"></span>${esc(sub?.name || "Asignatura")} · ${esc(b.topic)}</div>
      <div class="meta">${esc(b.start)} · ${fmtMin(b.minutes)} · ${esc(KIND_LABEL[b.kind] || b.kind)}</div>
      ${b.task && !b.done ? `<p class="task">${esc(b.task)}</p>` : ""}
    </div>
    ${b.done ? "" : `<button class="icon-btn small" data-action="start-block" data-id="${b.id}" aria-label="Empezar sesión de ${esc(b.topic)}">${icon("play", 16)}</button>`}
  </li>`;
}

function setupCard() {
  return `<section class="card card-accent">
    <div class="eyebrow accent">Primer paso</div>
    <h2>Conecta tu IA</h2>
    <p class="muted">Pega tu clave de Google Gemini en Ajustes para crear planes y usar el tutor.</p>
    <a class="btn" href="#/ajustes">Ir a Ajustes</a>
  </section>`;
}

// ---------------------------------------------------------------- vista: Hoy

function viewHoy() {
  const s = store.get();
  const today = store.isoDate();
  const blocks = (s.plan?.blocks || []).filter((b) => b.date === today);
  const next = blocks.find((b) => !b.done);
  const doneCount = blocks.filter((b) => b.done).length;
  const exam = nextExams()[0];

  let hero;
  if (next) {
    const sub = store.subjectById(next.subjectId);
    hero = `<section class="card card-dark">
      <div class="row-between"><div class="eyebrow on-dark">Siguiente bloque · ${fmtMin(next.minutes)}</div><div class="meta on-dark">${esc(next.start)}</div></div>
      <div class="hero-sub">${esc(sub?.name || "")}</div>
      <h2 class="hero-title">${esc(next.topic)}</h2>
      ${next.task ? `<p class="hero-task">${esc(next.task)}</p>` : ""}
      <div class="hero-actions">
        <button class="btn" data-action="start-block" data-id="${next.id}">${icon("play", 18)} Empezar sesión</button>
        <button class="btn btn-on-dark" data-action="ask-block" data-id="${next.id}">${icon("chat", 18)} Tutor</button>
      </div>
    </section>`;
  } else if (blocks.length) {
    hero = `<section class="card card-dark"><div class="eyebrow on-dark">Día completado</div><h2 class="hero-title">Has hecho todos los bloques de hoy</h2><p class="hero-task">Buen trabajo. Si te quedan ganas, repasa con el tutor o haz una sesión libre.</p></section>`;
  } else if (!s.plan) {
    hero = `<section class="card"><div class="eyebrow accent">Sin plan todavía</div><h2>Crea tu plan de estudio</h2><p class="muted">Añade tus exámenes y la IA repartirá el temario de tus asignaturas en bloques diarios.</p><a class="btn" href="#/plan">${icon("sparkle", 18)} Crear mi plan</a></section>`;
  } else {
    hero = `<section class="card"><div class="eyebrow">Sin bloques hoy</div><h2>Hoy no hay nada planificado</h2><p class="muted">Descansa o haz una sesión libre si te apetece.</p></section>`;
  }

  return `
    ${topbar(fmtDateLong(today), "Tu plan de hoy")}
    ${s.settings.apiKey ? "" : setupCard()}
    ${exam ? `<a class="exam-chip" href="#/plan">${icon("flag", 16)}<span>${esc(exam.title || "Examen")} de ${esc(store.subjectById(exam.subjectId)?.name || "")} · <b>${daysLeftLabel(store.daysBetween(today, exam.date))}</b></span></a>` : ""}
    ${hero}
    ${
      blocks.length
        ? `<section class="section">
            <div class="row-between"><h2 class="h3">Bloques de hoy</h2><div class="meta">${doneCount} de ${blocks.length} hechos</div></div>
            <ul class="list">${blocks.map(blockRow).join("")}</ul>
          </section>`
        : ""
    }
    <div class="row-gap">
      <button class="btn btn-secondary grow" data-action="free-session">${icon("timer", 18)} Sesión libre</button>
    </div>
    <a class="ask-bar" href="#/tutor">${icon("sparkle", 18)}<span>Pregúntale al tutor…</span><span class="ask-go">${icon("send", 16)}</span></a>
  `;
}

// ---------------------------------------------------------------- vista: Plan

function viewPlan() {
  const s = store.get();
  const today = store.isoDate();
  const exams = nextExams();
  const plan = s.plan;

  const examList = exams.length
    ? `<ul class="list">${exams
        .map((e) => {
          const sub = store.subjectById(e.subjectId);
          return `<li class="exam-row">
            <span class="dot" style="background:${color(sub)}"></span>
            <div class="block-main"><div class="block-title">${esc(e.title || "Examen")} · ${esc(sub?.name || "")}</div>
            <div class="meta">${esc(fmtDateShort(e.date))} · ${daysLeftLabel(store.daysBetween(today, e.date))}</div>
            ${e.topics ? `<p class="task">${esc(e.topics)}</p>` : ""}</div>
            <button class="icon-btn small ghost" data-action="delete-exam" data-id="${e.id}" aria-label="Borrar examen">${icon("trash", 16)}</button>
          </li>`;
        })
        .join("")}</ul>`
    : `<p class="muted small">Sin exámenes. Añádelos para que el plan se ajuste a las fechas.</p>`;

  const examForm = ui.showExamForm
    ? `<form class="card form" data-form="exam">
        <div class="field"><label for="ex-subject">Asignatura</label>
          <select id="ex-subject" name="subjectId" class="input">${s.subjects.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>
        <div class="field-row">
          <div class="field"><label for="ex-title">Tipo</label><input id="ex-title" name="title" class="input" value="Parcial" maxlength="40"></div>
          <div class="field"><label for="ex-date">Fecha</label><input id="ex-date" name="date" type="date" class="input" min="${today}" required></div>
        </div>
        <div class="field"><label for="ex-topics">Qué entra (opcional)</label><input id="ex-topics" name="topics" class="input" placeholder="p. ej. temas 1 a 3: límites y derivadas" maxlength="200"></div>
        <div class="row-gap"><button type="button" class="btn btn-secondary grow" data-action="toggle-exam-form">Cancelar</button><button class="btn grow" type="submit">Guardar examen</button></div>
      </form>`
    : `<button class="btn btn-secondary" data-action="toggle-exam-form">${icon("plus", 18)} Añadir examen</button>`;

  // Tira de días del plan
  let days = "";
  let dayBlocks = "";
  if (plan) {
    const start = plan.blocks.some((b) => b.date < today) ? store.addDays(today, -3) : today;
    const end = plan.until && plan.until > today ? plan.until : store.addDays(today, 13);
    const list = [];
    for (let d = start; d <= end && list.length < 35; d = store.addDays(d, 1)) list.push(d);
    if (!list.includes(ui.planDay)) ui.planDay = today;
    days = `<div class="daystrip" role="group" aria-label="Días del plan">${list
      .map((d) => {
        const n = plan.blocks.filter((b) => b.date === d);
        const allDone = n.length && n.every((b) => b.done);
        const dt = store.parseDate(d);
        const wd = dt.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "");
        return `<button class="day${d === ui.planDay ? " selected" : ""}${d === today ? " today" : ""}" data-action="pick-day" data-date="${d}" aria-pressed="${d === ui.planDay}">
          <span class="day-wd">${esc(wd)}</span><span class="day-n">${dt.getDate()}</span>
          <span class="day-dots">${n.length ? (allDone ? "✓" : "•".repeat(Math.min(4, n.length))) : ""}</span></button>`;
      })
      .join("")}</div>`;
    const sel = plan.blocks.filter((b) => b.date === ui.planDay);
    const total = sel.reduce((a, b) => a + b.minutes, 0);
    dayBlocks = `<section class="section">
      <div class="row-between"><h2 class="h3">${esc(fmtDateLong(ui.planDay))}</h2><div class="meta">${sel.length ? fmtMin(total) : ""}</div></div>
      ${sel.length ? `<ul class="list">${sel.map(blockRow).join("")}</ul>` : `<p class="muted small">Sin bloques este día.</p>`}
    </section>`;
  }

  // Carga por asignatura en los próximos 7 días
  let load = "";
  if (plan) {
    const end7 = store.addDays(today, 6);
    const rows = s.subjects
      .map((x) => ({ x, m: plan.blocks.filter((b) => b.subjectId === x.id && b.date >= today && b.date <= end7).reduce((a, b) => a + b.minutes, 0) }))
      .filter((r) => r.m > 0);
    if (rows.length) {
      load = `<section class="section"><h2 class="h3">Próximos 7 días por asignatura</h2>
        <ul class="list">${rows
          .map((r) => `<li class="load-row"><span class="bar-side" style="background:${color(r.x)}"></span><span class="grow">${esc(r.x.name)}</span><span class="mono">${fmtMin(r.m)}</span></li>`)
          .join("")}</ul></section>`;
    }
  }

  const gen = `<section class="card">
    <div class="eyebrow accent">Plan con IA</div>
    <h2>${plan ? "Rehacer el plan" : "Crear mi plan"}</h2>
    <p class="muted small">${s.subjects.length} asignaturas · unas ${s.settings.hoursPerDay} h al día · ${s.settings.days.length} días por semana. Puedes cambiarlo en Ajustes.</p>
    <form data-form="plan" class="form">
      <div class="field"><label for="plan-notes">Algo que deba tener en cuenta (opcional)</label>
      <textarea id="plan-notes" name="notes" class="input" rows="2" maxlength="400" placeholder="p. ej. el jueves tengo poco tiempo; me cuesta más Álgebra"></textarea></div>
      <button class="btn" type="submit" ${ui.planBusy ? "disabled" : ""}>${ui.planBusy ? `<span class="spinner"></span> Preparando tu plan…` : `${icon("sparkle", 18)} ${plan ? "Rehacer plan con IA" : "Crear plan con IA"}`}</button>
      ${plan ? `<p class="muted small">Los bloques ya hechos se conservan; los pendientes se sustituyen.</p>` : ""}
      ${ui.planError ? `<p class="error" role="alert">${esc(ui.planError)}</p>` : ""}
    </form>
  </section>`;

  return `
    ${topbar("Plan de estudio", "Tu plan")}
    <section class="section">
      <h2 class="h3">Exámenes</h2>
      ${examList}
      ${examForm}
    </section>
    ${plan?.summary ? `<section class="card summary"><div class="eyebrow">Estrategia</div><p>${esc(plan.summary)}</p></section>` : ""}
    ${days}
    ${dayBlocks}
    ${load}
    ${gen}
  `;
}

// ---------------------------------------------------------------- vista: Tutor

const QUICK = ["Explícalo más simple", "Otro ejemplo", "Ponme un ejercicio"];

function suggestions(sub) {
  const topics = (sub?.topics || "").split(/[,;]/).map((t) => t.trim()).filter(Boolean);
  const t1 = topics[0] || "el primer tema";
  const t2 = topics[1] || t1;
  return [`Explícame ${t1.toLowerCase()} desde cero`, `Ponme 3 ejercicios de ${t2.toLowerCase()}, de fácil a difícil`, "¿Qué errores típicos se cometen en esta asignatura?"];
}

function messageHTML(m) {
  if (m.role === "user") {
    const img = ui.imageCache.get(m.id);
    return `<div class="msg user">${img ? `<img class="msg-img" src="${img.url}" alt="Foto adjunta">` : m.hadImage ? `<div class="meta">Foto adjunta</div>` : ""}${esc(m.text)}</div>`;
  }
  return `<div class="msg model md">${renderMarkdown(m.text)}</div>`;
}

function viewTutor() {
  const s = store.get();
  if (!store.subjectById(ui.tutorSubject)) ui.tutorSubject = s.subjects[0]?.id;
  const sub = store.subjectById(ui.tutorSubject);
  const msgs = s.chats[ui.tutorSubject] || [];
  const streaming = ui.streaming && ui.streaming.subjectId === ui.tutorSubject;
  const focus = ui.focus && ui.focus.subjectId === ui.tutorSubject ? ui.focus : null;
  const lastIsModel = msgs.length && msgs[msgs.length - 1].role === "model";

  const empty = `<div class="tutor-empty">
    <p class="muted">Pregunta lo que no entiendas, pide ejercicios o manda una foto de un problema.</p>
    <div class="suggest">${(focus ? [`Quiero estudiar ${focus.topic}. ${focus.task}`] : suggestions(sub))
      .map((t) => `<button class="suggest-btn" data-action="quick" data-text="${esc(t)}">${esc(t)}</button>`)
      .join("")}</div>
  </div>`;

  return `<div class="tutor">
    <header class="tutor-bar">
      <button class="subject-switch" data-action="open-subjects" aria-haspopup="dialog" aria-label="Asignatura: ${esc(sub?.name || "")}. Cambiar">
        <span class="dot" style="background:${color(sub)}"></span>
        <span class="subject-switch-text"><span class="subject-switch-name">${esc(sub?.name || "Tutor")}</span>${focus ? `<span class="subject-switch-focus">${esc(focus.topic)}</span>` : ""}</span>
        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="mode-toggle" role="group" aria-label="Sección del tutor">
        <button class="mode${ui.tutorTab === "chat" ? " on" : ""}" data-action="tutor-tab" data-tab="chat" aria-pressed="${ui.tutorTab === "chat"}">Chat</button>
        <button class="mode${ui.tutorTab === "cuaderno" ? " on" : ""}" data-action="tutor-tab" data-tab="cuaderno" aria-pressed="${ui.tutorTab === "cuaderno"}">Cuaderno</button>
      </div>
    </header>
    ${ui.tutorTab === "cuaderno" ? `${viewNotebook()}</div>` : `<div class="messages" id="messages" aria-live="polite">
      ${msgs.length || streaming ? msgs.map(messageHTML).join("") : empty}
      ${streaming ? `<div class="msg model md" id="streaming-bubble">${ui.streaming.text ? renderMarkdown(ui.streaming.text) : `<span class="typing"><i></i><i></i><i></i></span>`}</div>` : ""}
      ${ui.chatError ? `<div class="msg error-msg" role="alert">${esc(ui.chatError)}</div>` : ""}
      ${lastIsModel && !streaming ? `<div class="quick">${QUICK.map((q) => `<button class="quick-btn" data-action="quick" data-text="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}
    </div>
    <form class="composer" data-form="chat">
      ${ui.pendingImage ? `<div class="pending-img"><img src="${ui.pendingImage.url}" alt="Foto para enviar"><button type="button" class="pending-remove" data-action="remove-image" aria-label="Quitar foto">${icon("x", 12)}</button></div>` : ""}
      <div class="composer-pill">
        <button type="button" class="composer-icon" data-action="attach" aria-label="Adjuntar foto de un ejercicio">${icon("camera")}</button>
        <label for="chat-input" class="sr-only">Mensaje para el tutor</label>
        <textarea id="chat-input" rows="1" placeholder="Escribe tu duda…" enterkeyhint="send"></textarea>
        ${
          streaming
            ? `<button type="button" class="send stop" data-action="stop" aria-label="Detener respuesta">${icon("stop", 14)}</button>`
            : `<button type="submit" class="send" aria-label="Enviar">${icon("send", 16)}</button>`
        }
      </div>
    </form>
    <input type="file" id="file-input" accept="image/*" hidden>
  </div>`}`;
}

// ---------------------------------------------------------------- tutor: cuaderno

const DIFF_LABEL = { facil: "Fácil", media: "Media", examen: "Examen" };
const LETTERS = "ABCDEF";

function pct(x) {
  return x === null || x === undefined ? "—" : `${Math.round(x * 100)}%`;
}

function levelClass(acc) {
  if (acc === null || acc === undefined) return "";
  return acc >= 0.8 ? "lvl-good" : acc >= 0.5 ? "lvl-mid" : "lvl-bad";
}

function requireKey() {
  if (store.get().settings.apiKey) return true;
  toast("Primero añade tu clave de Gemini en Ajustes");
  location.hash = "#/ajustes";
  return false;
}

function conceptList(items) {
  return `<ul class="concepts">${items
    .map(
      (c) => `<li><button class="concept" data-action="nb-open" data-id="${c.topicId}">
        <span class="grow"><b>${esc(c.name)}</b>${c.name !== c.topic ? `<span class="meta">${esc(c.topic)}</span>` : ""}</span>
        <span class="concept-pct ${levelClass(c.accuracy)}">${pct(c.accuracy)}</span></button></li>`
    )
    .join("")}</ul>`;
}

function viewNotebook() {
  const topic = ui.nbTopic && nb.topicById(ui.tutorSubject, ui.nbTopic);
  if (topic) return viewNotebookTopic(topic);
  ui.nbTopic = null;
  const st = nb.subjectStats(ui.tutorSubject);

  const summary = st.total
    ? `<section class="card nb-summary">
        <div class="row-between"><div class="eyebrow">Tu nivel en evaluaciones</div><div class="meta">${st.total} preguntas</div></div>
        <div class="nb-big ${levelClass(st.accuracy)}">${pct(st.accuracy)} <span>de acierto</span></div>
        ${st.weak.length ? `<h3 class="nb-h">Dónde fallas más</h3>${conceptList(st.weak)}` : ""}
        ${st.strong.length ? `<h3 class="nb-h">Dónde aciertas más</h3>${conceptList(st.strong)}` : ""}
        ${st.weak.length ? `<button class="btn" data-action="nb-review-weak" data-id="${st.weak[0].topicId}">${icon("sparkle", 18)} Repasar mis fallos</button>` : ""}
      </section>`
    : `<section class="card">
        <div class="eyebrow accent">Cuaderno</div>
        <h2>Lecciones y evaluaciones por tema</h2>
        <p class="muted small">Añade los temas que quieras estudiar. En cada uno, la IA te escribe una lección y te pone evaluaciones tipo test. Aquí verás dónde fallas y dónde aciertas más.</p>
      </section>`;

  const list = st.topics.length
    ? `<ul class="list">${st.topics
        .map(
          ({ topic: t, stats: s }) => `<li><button class="nb-topic" data-action="nb-open" data-id="${t.id}">
            <span class="block-main">
              <span class="block-title">${esc(t.name)}</span>
              <span class="meta">${t.lesson ? "Lección ✓" : "Sin lección"} · ${s.attempts ? `${s.attempts} ${s.attempts === 1 ? "evaluación" : "evaluaciones"}` : "sin evaluar"}</span>
              ${s.total ? `<span class="track"><span class="fill ${levelClass(s.accuracy)}" style="width:${Math.max(4, s.accuracy * 100)}%"></span></span>` : ""}
            </span>
            ${s.total ? `<span class="nb-pct ${levelClass(s.accuracy)}">${pct(s.accuracy)}</span>` : ""}
            ${icon("chevronRight", 18)}
          </button></li>`
        )
        .join("")}</ul>`
    : `<p class="muted small">Todavía no hay temas.</p>`;

  return `<div class="nb-scroll" id="nb-scroll">
    ${summary}
    <section class="section">
      <div class="row-between"><h2 class="h3">Temas</h2>${store.subjectById(ui.tutorSubject)?.topics ? `<button class="link-btn small" data-action="nb-import">Importar del temario</button>` : ""}</div>
      ${list}
      <form class="nb-add" data-form="nb-topic">
        <label for="nb-new" class="sr-only">Nuevo tema</label>
        <input id="nb-new" name="name" class="input" placeholder="Nuevo tema, p. ej. Derivadas implícitas" maxlength="80" autocomplete="off">
        <button class="btn" type="submit" aria-label="Añadir tema">${icon("plus", 18)}</button>
      </form>
    </section>
  </div>`;
}

function viewNotebookTopic(topic) {
  const inQuiz = ui.quiz && ui.quiz.topicId === topic.id;
  if (inQuiz) ui.nbTab = "evaluacion";
  const tabs = `<div class="nb-tabs" role="group" aria-label="Sección del tema">
      <button class="nb-tab${ui.nbTab === "leccion" ? " on" : ""}" data-action="nb-tab" data-tab="leccion" aria-pressed="${ui.nbTab === "leccion"}">Lección</button>
      <button class="nb-tab${ui.nbTab === "evaluacion" ? " on" : ""}" data-action="nb-tab" data-tab="evaluacion" aria-pressed="${ui.nbTab === "evaluacion"}">Evaluación</button>
    </div>`;
  return `<div class="nb-scroll" id="nb-scroll">
    <div class="nb-head">
      <button class="icon-btn ghost" data-action="nb-back" aria-label="Volver a los temas">${icon("chevron")}</button>
      <h2 class="nb-title">${esc(topic.name)}</h2>
      ${inQuiz ? "" : `<button class="icon-btn ghost" data-action="nb-delete" data-id="${topic.id}" aria-label="Borrar tema">${icon("trash", 18)}</button>`}
    </div>
    ${inQuiz ? "" : tabs}
    ${ui.nbTab === "evaluacion" ? nbEvaluation(topic) : nbLesson(topic)}
  </div>`;
}

function nbLesson(topic) {
  const live = ui.nbLesson && ui.nbLesson.topicId === topic.id ? ui.nbLesson : null;
  const err = ui.nbError ? `<p class="error" role="alert">${esc(ui.nbError)}</p>` : "";
  if (live) {
    return `<article class="md nb-lesson" id="nb-lesson-live">${live.text ? renderMarkdown(live.text) : `<p class="muted"><span class="spinner"></span> Escribiendo la lección…</p>`}</article>
      <button class="btn btn-secondary" data-action="nb-stop-lesson">${icon("stop", 16)} Detener</button>`;
  }
  if (!topic.lesson) {
    return `<section class="card form">
      <h2 class="h3">Lección de este tema</h2>
      <p class="muted small">La IA te escribe unos apuntes con la idea clave, la teoría, ejemplos resueltos paso a paso, errores típicos y un resumen para repasar.</p>
      <form data-form="nb-lesson" class="form">
        <div class="field"><label for="nb-focus">¿En qué quieres que se centre? (opcional)</label>
        <textarea id="nb-focus" name="focus" class="input" rows="2" maxlength="300" placeholder="p. ej. muchos ejemplos de cálculo"></textarea></div>
        <button class="btn" type="submit">${icon("sparkle", 18)} Generar lección</button>
      </form>
      ${err}
    </section>`;
  }
  return `<article class="md nb-lesson">${renderMarkdown(topic.lesson.text)}</article>
    ${err}
    <div class="nb-actions">
      <button class="btn" data-action="nb-tab" data-tab="evaluacion">${icon("check", 18)} Ponme a prueba</button>
      <button class="btn btn-secondary" data-action="nb-ask" data-id="${topic.id}">${icon("chat", 18)} Preguntar dudas</button>
      <button class="link-btn small" data-action="nb-regen">Volver a generar la lección</button>
    </div>`;
}

function nbEvaluation(topic) {
  const q = ui.quiz && ui.quiz.topicId === topic.id ? ui.quiz : null;
  if (q) return q.done ? quizResult(q) : quizQuestion(q);
  const s = nb.topicStats(topic);
  const err = ui.nbError ? `<p class="error" role="alert">${esc(ui.nbError)}</p>` : "";
  const stats = s.total
    ? `<section class="card">
        <div class="row-between"><div class="eyebrow">Tu nivel en este tema</div><div class="meta">últimas ${Math.min(5, s.attempts)}</div></div>
        <div class="nb-big ${levelClass(s.accuracy)}">${pct(s.accuracy)} <span>de acierto</span></div>
        ${[...s.concepts]
          .sort((a, b) => a.accuracy - b.accuracy)
          .map(
            (c) => `<div class="subject-progress">
              <div class="row-between small"><span>${esc(c.name)}</span><span class="mono">${c.correct}/${c.total}</span></div>
              <div class="track"><div class="fill ${levelClass(c.accuracy)}" style="width:${Math.max(4, c.accuracy * 100)}%"></div></div>
            </div>`
          )
          .join("")}
      </section>`
    : "";
  return `${stats}
    <section class="card form">
      <h2 class="h3">Nueva evaluación</h2>
      ${topic.lesson ? "" : `<p class="muted small">Consejo: genera antes la lección para que las preguntas se basen en ella.</p>`}
      <div class="field"><span class="label">Preguntas</span><div class="pills" role="group" aria-label="Número de preguntas">${[5, 10, 15]
        .map((n) => `<button class="pill-opt${ui.quizCount === n ? " on" : ""}" data-action="nb-count" data-n="${n}" aria-pressed="${ui.quizCount === n}">${n}</button>`)
        .join("")}</div></div>
      <div class="field"><span class="label">Dificultad</span><div class="pills" role="group" aria-label="Dificultad">${Object.entries(DIFF_LABEL)
        .map(([v, l]) => `<button class="pill-opt${ui.quizDiff === v ? " on" : ""}" data-action="nb-diff" data-v="${v}" aria-pressed="${ui.quizDiff === v}">${l}</button>`)
        .join("")}</div></div>
      <button class="btn" data-action="nb-start-quiz" ${ui.nbBusy ? "disabled" : ""}>${ui.nbBusy ? `<span class="spinner"></span> Preparando preguntas…` : `${icon("play", 18)} Empezar evaluación`}</button>
      ${err}
    </section>
    ${
      topic.attempts.length
        ? `<section class="section"><h2 class="h3">Historial</h2><ul class="list">${[...topic.attempts]
            .reverse()
            .slice(0, 10)
            .map((a) => `<li class="load-row"><span class="grow">${esc(fmtDateShort(a.date))} · ${esc(DIFF_LABEL[a.difficulty] || "")}</span><span class="mono ${levelClass(a.correct / a.total)}">${a.correct}/${a.total}</span></li>`)
            .join("")}</ul></section>`
        : ""
    }`;
}

function quizQuestion(q) {
  const item = q.questions[q.index];
  const answered = q.selected !== null;
  const right = answered && q.selected === item.answer;
  return `<section class="quiz">
    <div class="row-between"><div class="eyebrow">Pregunta ${q.index + 1} de ${q.questions.length}</div><button class="link-btn small" data-action="nb-quit-quiz">Salir</button></div>
    <div class="track"><div class="fill" style="width:${((q.index + (answered ? 1 : 0)) / q.questions.length) * 100}%;background:var(--ink)"></div></div>
    <div class="md quiz-q">${renderMarkdown(item.question)}</div>
    <div class="quiz-opts">${item.options
      .map((o, i) => {
        let cls = "";
        if (answered && i === item.answer) cls = " right";
        else if (answered && i === q.selected) cls = " wrong";
        return `<button class="quiz-opt${cls}" data-action="nb-answer" data-i="${i}" ${answered ? "disabled" : ""}><span class="quiz-letter">${LETTERS[i]}</span><span class="md grow">${renderMarkdown(o, { inline: true })}</span></button>`;
      })
      .join("")}</div>
    ${
      answered
        ? `<div class="quiz-feedback ${right ? "ok" : "bad"}" role="status">
            <b>${right ? "¡Correcto!" : `Incorrecto. La respuesta correcta es la ${LETTERS[item.answer]}.`}</b>
            <div class="md">${renderMarkdown(item.explanation)}</div>
          </div>
          <button class="btn" data-action="nb-next">${q.index + 1 < q.questions.length ? "Siguiente" : "Ver resultado"}</button>`
        : ""
    }
  </section>`;
}

function quizResult(q) {
  const total = q.questions.length;
  const acc = q.correct / total;
  const wrong = q.answers.filter((a) => !a.correct);
  const byConcept = {};
  wrong.forEach((a) => (byConcept[a.concept] = (byConcept[a.concept] || 0) + 1));
  const msg =
    acc >= 0.9
      ? "¡Excelente! Dominas este tema."
      : acc >= 0.7
        ? "Bien. Repasa los fallos y lo tendrás."
        : acc >= 0.5
          ? "Vas por buen camino, pero hay conceptos que reforzar."
          : "Este tema necesita más repaso: empieza por la lección y por tus fallos.";
  return `<section class="card quiz-result">
      <div class="eyebrow">Resultado · ${esc(DIFF_LABEL[q.difficulty] || "")}</div>
      <div class="nb-big ${levelClass(acc)}">${q.correct}/${total} <span>${pct(acc)}</span></div>
      <p>${msg}</p>
      ${
        wrong.length
          ? `<h3 class="nb-h">Has fallado en</h3><ul class="concepts">${Object.entries(byConcept)
              .sort((a, b) => b[1] - a[1])
              .map(([c, n]) => `<li class="concept static"><span class="grow"><b>${esc(c)}</b></span><span class="concept-pct lvl-bad">${n} ${n === 1 ? "fallo" : "fallos"}</span></li>`)
              .join("")}</ul>`
          : ""
      }
    </section>
    ${wrong.length ? `<button class="btn" data-action="nb-explain-errors">${icon("chat", 18)} Explícame mis fallos</button>` : ""}
    <div class="row-gap">
      <button class="btn btn-secondary grow" data-action="nb-start-quiz">Otra evaluación</button>
      <button class="btn btn-secondary grow" data-action="nb-close-quiz">Terminar</button>
    </div>`;
}

let lessonPaintQueued = false;
function paintLesson() {
  if (lessonPaintQueued) return;
  lessonPaintQueued = true;
  requestAnimationFrame(() => {
    lessonPaintQueued = false;
    const el = $("#nb-lesson-live");
    if (el && ui.nbLesson) el.innerHTML = renderMarkdown(ui.nbLesson.text);
  });
}

async function startLesson(focusNote = "") {
  if (!requireKey() || ui.nbLesson) return;
  const subjectId = ui.tutorSubject;
  const topicId = ui.nbTopic;
  ui.nbLesson = { topicId, text: "", controller: new AbortController() };
  ui.nbError = null;
  render();
  try {
    const text = await nb.generateLesson({
      subjectId,
      topicId,
      focusNote,
      signal: ui.nbLesson.controller.signal,
      onText: (t) => {
        ui.nbLesson.text = t;
        paintLesson();
      },
    });
    nb.saveLesson(subjectId, topicId, text);
  } catch (e) {
    if (e.name === "AbortError") {
      if (ui.nbLesson?.text) nb.saveLesson(subjectId, topicId, ui.nbLesson.text);
    } else ui.nbError = e.message || "No se pudo generar la lección";
  } finally {
    ui.nbLesson = null;
    if (ui.route === "tutor") render();
  }
}

async function startQuiz(targetWeak = false) {
  if (!requireKey() || ui.nbBusy) return;
  const subjectId = ui.tutorSubject;
  const topicId = ui.nbTopic;
  ui.quiz = null;
  ui.nbBusy = true;
  ui.nbError = null;
  ui.nbTab = "evaluacion";
  render();
  try {
    const questions = await nb.generateQuiz({ subjectId, topicId, count: ui.quizCount, difficulty: ui.quizDiff, targetWeak });
    ui.quiz = { subjectId, topicId, questions, index: 0, selected: null, answers: [], correct: 0, done: false, difficulty: ui.quizDiff };
  } catch (e) {
    ui.nbError = e.message || "No se pudo crear la evaluación";
  } finally {
    ui.nbBusy = false;
    if (ui.route === "tutor") {
      render();
      const sc = $("#nb-scroll");
      if (sc) sc.scrollTop = 0;
    }
  }
}

function finishQuiz() {
  const q = ui.quiz;
  q.done = true;
  nb.saveAttempt(q.subjectId, q.topicId, {
    id: store.uid(),
    date: store.isoDate(),
    difficulty: q.difficulty,
    total: q.questions.length,
    correct: q.correct,
    answers: q.answers.map((a) => ({ question: a.question.slice(0, 200), concept: a.concept, correct: a.correct })),
  });
}

function tutorSystem(subjectId) {
  const s = store.get();
  const sub = store.subjectById(subjectId);
  const focus = ui.focus && ui.focus.subjectId === subjectId ? ui.focus : null;
  const guide = s.settings.tutorStyle === "guiar";
  const weak = nb.weakSummary(subjectId);
  return `Eres un profesor particular excelente de ${sub?.name} para un estudiante de ${s.settings.context}.
Temario de la asignatura: ${sub?.topics || "no especificado"}.
${focus ? `Ahora mismo está estudiando: ${focus.topic}. Tarea del bloque: ${focus.task || "-"}.\n` : ""}${weak ? `Según sus evaluaciones del cuaderno, le cuesta: ${weak}. Tenlo en cuenta al explicar.\n` : ""}
Tu objetivo es que el estudiante entienda de verdad, no solo que tenga la respuesta. Explica como el mejor profesor que haya tenido: claro, riguroso, paciente y con buenos ejemplos. Responde siempre en español de España.

## Cómo explicar un concepto o tema
1. **La idea**: qué es y para qué sirve, en una o dos frases con lenguaje llano. Si ayuda, una analogía o una imagen mental.
2. **Lo formal**: la definición, regla o teorema con la notación correcta, y qué significa cada símbolo.
3. **Ejemplos resueltos paso a paso**: empieza por uno sencillo y, si el tema lo pide, sigue con uno de nivel examen. Justifica cada paso (por qué se hace, no solo qué se hace).
4. **Errores típicos** y trucos útiles para el examen, cuando los haya.
5. Termina con una pregunta corta o un mini ejercicio para que compruebe si lo ha entendido.

Ajusta la extensión a la pregunta: una duda puntual merece una respuesta directa y breve; un tema nuevo, la explicación completa. Nunca rellenes ni repitas.

## Ejercicios
${
  guide
    ? `- El estudiante quiere aprender resolviendo él mismo: no des la solución completa. Guíale un paso cada vez con preguntas y pistas, y espera su respuesta. Si se atasca dos veces seguidas o pide la solución, dásela completa y explicada.`
    : `- Si te pide resolver un ejercicio, resuélvelo completo paso a paso, explicando el porqué de cada paso. Al final resume en pocas líneas el método para que pueda aplicarlo a ejercicios parecidos.`
}
- Si te enseña su propia solución, corrígela: qué está bien, dónde está exactamente el error y por qué.
- Si te pide ejercicios para practicar, ponlos numerados y de dificultad creciente, sin la solución, y corrígelos cuando responda.
- Si recibes una foto, transcribe primero el enunciado para confirmar que lo has leído bien.
- Comprueba tus cálculos antes de dar un resultado (por ejemplo, deriva el resultado de una integral, sustituye la solución de un sistema, traza el código con un ejemplo). Si el enunciado es ambiguo, dilo.

## Formato (se lee en el móvil)
- Markdown: títulos cortos con ###, pasos en listas numeradas, **negrita** solo para lo esencial, párrafos cortos.
- Todas las fórmulas en LaTeX: $...$ en línea y $$...$$ en bloque para las importantes. Nunca escribas matemáticas en texto plano (nada de x^2 ni sqrt(x)).
- Código en bloques \`\`\` indicando el lenguaje, con comentarios breves; explica qué hace cada parte y muestra la salida esperada.
- Usa tablas Markdown cuando ayuden (tablas de verdad, comparaciones, conversiones entre bases).
- Ve al grano: sin frases de relleno como «¡Claro! Aquí tienes…».
- Si no estás seguro de algo, dilo en vez de inventar.`;
}

function buildHistory(subjectId) {
  const msgs = (store.get().chats[subjectId] || []).slice(-30);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  const out = [];
  for (const m of msgs) {
    const parts = [];
    const img = m.role === "user" ? ui.imageCache.get(m.id) : null;
    if (img) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    let text = m.text;
    if (!img && m.hadImage) text = `[Adjunté una foto que ya no está disponible] ${text}`;
    parts.push({ text });
    // Une mensajes seguidos del mismo rol (p. ej. si una respuesta falló).
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.parts.push(...parts);
    else out.push({ role: m.role, parts });
  }
  return out;
}

let paintQueued = false;
function paintStream() {
  if (paintQueued) return;
  paintQueued = true;
  requestAnimationFrame(() => {
    paintQueued = false;
    const el = $("#streaming-bubble");
    if (!el || !ui.streaming) return;
    const box = $("#messages");
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    el.innerHTML = renderMarkdown(ui.streaming.text);
    if (nearBottom) box.scrollTop = box.scrollHeight;
  });
}

function scrollMessages() {
  const box = $("#messages");
  if (box) box.scrollTop = box.scrollHeight;
}

async function sendMessage(text) {
  const s = store.get();
  text = (text || "").trim();
  if (!text && !ui.pendingImage) return;
  if (!s.settings.apiKey) {
    toast("Primero añade tu clave de Gemini en Ajustes");
    location.hash = "#/ajustes";
    return;
  }
  if (ui.streaming) return;
  const subjectId = ui.tutorSubject;
  const img = ui.pendingImage;
  const msg = { id: store.uid(), role: "user", text: text || "Ayúdame con este ejercicio.", hadImage: !!img };
  if (img) ui.imageCache.set(msg.id, img);
  ui.pendingImage = null;
  ui.chatError = null;
  store.update((st) => {
    (st.chats[subjectId] ||= []).push(msg);
    if (st.chats[subjectId].length > 120) st.chats[subjectId] = st.chats[subjectId].slice(-120);
  });
  ui.streaming = { subjectId, text: "", controller: new AbortController() };
  render();
  scrollMessages();

  const saveReply = (t) => {
    if (t) store.update((st) => (st.chats[subjectId] ||= []).push({ id: store.uid(), role: "model", text: t }));
  };
  try {
    const full = await gemini.streamChat({
      apiKey: s.settings.apiKey,
      model: s.settings.model || gemini.DEFAULT_MODEL,
      system: tutorSystem(subjectId),
      history: buildHistory(subjectId),
      signal: ui.streaming.controller.signal,
      onText: (t) => {
        ui.streaming.text = t;
        paintStream();
      },
    });
    saveReply(full);
  } catch (e) {
    if (e.name === "AbortError") saveReply(ui.streaming?.text);
    else ui.chatError = e.message || "No se pudo conectar con Gemini. ¿Tienes conexión?";
  } finally {
    ui.streaming = null;
    if (ui.route === "tutor") {
      render();
      scrollMessages();
    }
  }
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL("image/jpeg", 0.85);
      resolve({ mimeType: "image/jpeg", data: dataUrl.split(",")[1], url: dataUrl });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

// ---------------------------------------------------------------- vista: Progreso

function evalSection() {
  const rows = store
    .get()
    .subjects.map((x) => ({ x, st: nb.subjectStats(x.id) }))
    .filter((r) => r.st.total);
  if (!rows.length) return "";
  return `<section class="section">
    <h2 class="h3">Evaluaciones del cuaderno</h2>
    <ul class="list">${rows
      .map(
        ({ x, st }) => `<li><button class="nb-topic" data-action="open-notebook" data-id="${x.id}">
          <span class="dot" style="background:${color(x)}"></span>
          <span class="block-main"><span class="block-title">${esc(x.name)}</span>
          <span class="meta">${st.weak.length ? `Te cuesta: ${esc(st.weak.map((c) => c.name).join(", "))}` : "Sin puntos débiles claros"}</span></span>
          <span class="nb-pct ${levelClass(st.accuracy)}">${pct(st.accuracy)}</span>${icon("chevronRight", 18)}
        </button></li>`
      )
      .join("")}</ul>
  </section>`;
}

function viewProgreso() {
  const s = store.get();
  const today = store.isoDate();
  const last7 = [];
  for (let i = 6; i >= 0; i--) last7.push(store.addDays(today, -i));
  const mins = last7.map((d) => minutesOn(d));
  const week = mins.reduce((a, b) => a + b, 0);
  const goal = s.settings.hoursPerDay * 60;
  const maxM = Math.max(goal, ...mins, 1);
  const total = s.log.reduce((a, l) => a + l.minutes, 0);

  const past = (s.plan?.blocks || []).filter((b) => b.date <= today);
  const pastDone = past.filter((b) => b.done).length;
  const pct = past.length ? Math.round((pastDone / past.length) * 100) : null;

  const perSubject = s.subjects.map((x) => {
    const w = s.log.filter((l) => l.subjectId === x.id && l.date >= last7[0]).reduce((a, l) => a + l.minutes, 0);
    const t = s.log.filter((l) => l.subjectId === x.id).reduce((a, l) => a + l.minutes, 0);
    return { x, w, t };
  });
  const maxW = Math.max(1, ...perSubject.map((r) => r.w));
  const exams = nextExams();

  return `
    ${topbar("Últimos 7 días", "Progreso")}
    <div class="stats">
      <div class="stat dark"><div class="stat-label">Racha</div><div class="stat-value">${streak()} ${streak() === 1 ? "día" : "días"}</div></div>
      <div class="stat"><div class="stat-label">Esta semana</div><div class="stat-value">${fmtMin(week)}</div></div>
      <div class="stat"><div class="stat-label">Plan cumplido</div><div class="stat-value">${pct === null ? "—" : pct + "%"}</div></div>
      <div class="stat"><div class="stat-label">Total estudiado</div><div class="stat-value">${fmtMin(total)}</div></div>
    </div>

    <section class="card">
      <div class="row-between"><h2 class="h3">Tiempo por día</h2><div class="meta">meta ${fmtMin(goal)}</div></div>
      <div class="chart" role="img" aria-label="Minutos estudiados por día: ${last7.map((d, i) => `${fmtDateShort(d)} ${mins[i]} minutos`).join(", ")}">
        <div class="goal-line" style="bottom:${(goal / maxM) * 100}%"></div>
        ${mins.map((m, i) => `<div class="col"><div class="bar${last7[i] === today ? " today" : ""}${m >= goal ? " met" : ""}" style="height:${(m / maxM) * 100}%"></div></div>`).join("")}
      </div>
      <div class="chart-labels">${last7.map((d) => `<div${d === today ? ' class="today"' : ""}>${esc(store.parseDate(d).toLocaleDateString("es-ES", { weekday: "narrow" }))}</div>`).join("")}</div>
    </section>

    <section class="section">
      <h2 class="h3">Por asignatura (esta semana)</h2>
      ${perSubject
        .map(
          (r) => `<div class="subject-progress">
            <div class="row-between small"><span>${esc(r.x.name)}</span><span class="mono">${fmtMin(r.w)}<span class="muted"> · total ${fmtMin(r.t)}</span></span></div>
            <div class="track"><div class="fill" style="width:${(r.w / maxW) * 100}%;background:${color(r.x)}"></div></div>
          </div>`
        )
        .join("")}
    </section>

    ${evalSection()}

    ${
      exams.length
        ? `<section class="section"><h2 class="h3">Próximos exámenes</h2><ul class="list">${exams
            .map((e) => {
              const n = store.daysBetween(today, e.date);
              return `<li class="exam-row"><span class="countdown"><b>${n}</b><span>${n === 1 ? "día" : "días"}</span></span><div class="block-main"><div class="block-title">${esc(e.title || "Examen")} · ${esc(store.subjectById(e.subjectId)?.name || "")}</div><div class="meta">${esc(fmtDateLong(e.date))}</div></div></li>`;
            })
            .join("")}</ul></section>`
        : ""
    }
    ${s.log.length ? "" : `<p class="muted small center">Cuando termines sesiones de estudio o marques bloques como hechos, aquí verás tu evolución.</p>`}
  `;
}

// ---------------------------------------------------------------- vista: Ajustes

const DAY_LABELS = [
  [1, "L"],
  [2, "M"],
  [3, "X"],
  [4, "J"],
  [5, "V"],
  [6, "S"],
  [0, "D"],
];

function viewAjustes() {
  const s = store.get();
  const st = s.settings;
  const models = ui.models || (st.model ? [{ id: st.model, label: st.model }] : []);
  if (st.model && !models.some((m) => m.id === st.model)) models.unshift({ id: st.model, label: st.model });

  return `
    ${topbar("Configuración", "Ajustes", `<a class="icon-btn" href="#/hoy" aria-label="Volver">${icon("chevron")}</a>`)}

    <section class="card form">
      <h2 class="h3">IA · Google Gemini</h2>
      <div class="field"><label for="api-key">Clave de API</label>
        <div class="row-gap"><input id="api-key" type="password" class="input grow" autocomplete="off" spellcheck="false" placeholder="AIza…" value="${esc(st.apiKey)}">
        <button class="btn" data-action="save-key" ${ui.modelsBusy ? "disabled" : ""}>${ui.modelsBusy ? '<span class="spinner"></span>' : "Guardar"}</button></div>
        <p class="muted small">Consíguela en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. Se guarda solo en este dispositivo.</p>
      </div>
      <div class="field"><label for="model">Modelo</label>
        <select id="model" class="input" data-setting="model" ${models.length ? "" : "disabled"}>
          ${models.length ? models.map((m) => `<option value="${esc(m.id)}"${m.id === st.model ? " selected" : ""}>${esc(m.label)} (${esc(m.id)})</option>`).join("") : `<option>Guarda tu clave para ver los modelos</option>`}
        </select>
        <p class="muted small">Flash: rápido y barato. Pro: explica con más profundidad, pero tarda más y tiene menos uso gratuito.</p>
      </div>
    </section>

    <section class="card form">
      <h2 class="h3">Tu horario</h2>
      <div class="field"><label for="ctx">Qué estudias</label><input id="ctx" class="input" data-setting="context" value="${esc(st.context)}" maxlength="120"></div>
      <div class="field-row">
        <div class="field"><label for="hours">Horas al día</label><input id="hours" type="number" min="0.5" max="10" step="0.5" class="input" data-setting="hoursPerDay" value="${st.hoursPerDay}"></div>
        <div class="field"><label for="start">Empiezo a las</label><input id="start" type="time" class="input" data-setting="startTime" value="${esc(st.startTime)}"></div>
      </div>
      <fieldset class="field"><legend>Días que estudio</legend>
        <div class="days-pick">${DAY_LABELS.map(([d, l]) => `<label class="day-toggle"><input type="checkbox" data-day="${d}"${st.days.includes(d) ? " checked" : ""}><span>${l}</span></label>`).join("")}</div>
      </fieldset>
    </section>

    <section class="section">
      <div class="row-between"><h2 class="h3">Asignaturas</h2><button class="btn btn-secondary small-btn" data-action="add-subject">${icon("plus", 16)} Añadir</button></div>
      <p class="muted small">Escribe el temario real de cada una: el plan y el tutor lo usan.</p>
      ${s.subjects
        .map(
          (x) => `<div class="card form subject-edit">
            <div class="row-gap">
              <label class="color-pick" style="background:${color(x)}"><span class="sr-only">Color de ${esc(x.name)}</span><input type="color" data-subject="${x.id}" data-field="color" value="${color(x)}"></label>
              <label class="sr-only" for="sn-${x.id}">Nombre</label>
              <input id="sn-${x.id}" class="input grow" data-subject="${x.id}" data-field="name" value="${esc(x.name)}" maxlength="60">
              <button class="icon-btn small ghost" data-action="delete-subject" data-id="${x.id}" aria-label="Borrar ${esc(x.name)}">${icon("trash", 16)}</button>
            </div>
            <label class="sr-only" for="st-${x.id}">Temario de ${esc(x.name)}</label>
            <textarea id="st-${x.id}" class="input" rows="3" data-subject="${x.id}" data-field="topics" maxlength="1200" placeholder="Temas separados por comas">${esc(x.topics)}</textarea>
          </div>`
        )
        .join("")}
    </section>

    <section class="card form">
      <h2 class="h3">Instalar en el móvil</h2>
      ${
        ui.installPrompt
          ? `<button class="btn" data-action="install">${icon("download", 18)} Instalar app</button>`
          : `<p class="muted small"><b>iPhone (Safari):</b> botón Compartir → «Añadir a pantalla de inicio».<br><b>Android (Chrome):</b> menú ⋮ → «Instalar aplicación».</p>`
      }
    </section>

    <section class="card form">
      <h2 class="h3">Tus datos</h2>
      <p class="muted small">Todo se guarda en este dispositivo. Haz una copia para pasarla a otro móvil.</p>
      <div class="row-gap">
        <button class="btn btn-secondary grow" data-action="export">${icon("download", 18)} Exportar</button>
        <button class="btn btn-secondary grow" data-action="import">${icon("upload", 18)} Importar</button>
      </div>
      <input type="file" id="import-input" accept="application/json,.json" hidden>
      <button class="btn btn-danger" data-action="reset">Borrar todo</button>
    </section>
  `;
}

async function loadModels(silent) {
  const key = store.get().settings.apiKey;
  if (!key) return;
  ui.modelsBusy = true;
  if (ui.route === "ajustes") render();
  try {
    const models = await gemini.listModels(key);
    ui.models = models;
    const cur = store.get().settings.model;
    if (!cur || !models.some((m) => m.id === cur)) {
      store.update((st) => (st.settings.model = gemini.pickDefaultModel(models)));
    }
    if (!silent) toast(`Conectado · ${store.get().settings.model}`);
  } catch (e) {
    if (!silent) toast(e.message);
  } finally {
    ui.modelsBusy = false;
    if (ui.route === "ajustes") render();
  }
}

// ---------------------------------------------------------------- sesión de estudio

function elapsedMs(sess) {
  return (sess.pausedAt ?? Date.now()) - sess.startedAt - sess.pausedTotal;
}

function fmtClock(ms) {
  const neg = ms < 0;
  const t = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(t / 60);
  const sec = t % 60;
  return `${neg ? "+" : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function startSession({ blockId = null, subjectId, topic, minutes }) {
  const cur = store.get().session;
  if (cur && !confirm("Ya tienes una sesión en marcha. ¿Descartarla y empezar otra?")) return;
  store.update((st) => {
    st.session = { blockId, subjectId, topic, plannedMin: minutes, startedAt: Date.now(), pausedAt: null, pausedTotal: 0 };
  });
  ui.alerted = false;
  ui.sessionOpen = true;
  renderSession();
}

function renderSession() {
  const root = $("#session-root");
  const pill = $("#session-pill");
  const sess = store.get().session;
  if (!sess) {
    root.innerHTML = "";
    root.hidden = true;
    pill.hidden = true;
    document.body.classList.remove("has-pill");
    return;
  }
  const sub = store.subjectById(sess.subjectId);
  if (ui.sessionOpen) {
    root.hidden = false;
    pill.hidden = true;
    document.body.classList.remove("has-pill");
    root.innerHTML = `<div class="session" role="dialog" aria-modal="true" aria-labelledby="session-title">
      <div class="row-between">
        <div class="eyebrow on-dark">Sesión de estudio</div>
        <button class="icon-btn on-dark" data-action="minimize-session" aria-label="Minimizar">${icon("x", 18)}</button>
      </div>
      <div class="session-center">
        <div class="hero-sub">${esc(sub?.name || "")}</div>
        <h2 id="session-title" class="hero-title">${esc(sess.topic)}</h2>
        <div class="clock" data-timer>${fmtClock(sess.plannedMin * 60000 - elapsedMs(sess))}</div>
        <div class="session-track"><div class="session-fill" data-timer-bar></div></div>
        <div class="meta on-dark" data-timer-label></div>
      </div>
      <div class="session-actions">
        <button class="btn btn-on-dark" data-action="toggle-pause">${sess.pausedAt ? `${icon("play", 18)} Reanudar` : `${icon("pause", 18)} Pausar`}</button>
        <button class="btn btn-on-dark" data-action="plus5">+5 min</button>
        <button class="btn btn-on-dark" data-action="session-tutor">${icon("chat", 18)} Tutor</button>
      </div>
      <button class="btn big" data-action="finish-session">${icon("check", 18)} Terminar y guardar</button>
      <button class="link-btn on-dark" data-action="cancel-session">Descartar sesión</button>
    </div>`;
  } else {
    root.hidden = true;
    root.innerHTML = "";
    pill.hidden = false;
    document.body.classList.add("has-pill");
    pill.innerHTML = `<button class="pill" data-action="open-session"><span class="dot" style="background:${color(sub)}"></span><span class="grow">${esc(sub?.name || "")} · ${esc(sess.topic)}</span><span class="mono" data-timer></span></button>`;
  }
  tick();
}

function tick() {
  const sess = store.get().session;
  if (!sess) return;
  const remaining = sess.plannedMin * 60000 - elapsedMs(sess);
  document.querySelectorAll("[data-timer]").forEach((el) => (el.textContent = fmtClock(remaining)));
  const bar = $("[data-timer-bar]");
  if (bar) bar.style.width = `${Math.min(100, (elapsedMs(sess) / (sess.plannedMin * 60000)) * 100)}%`;
  const label = $("[data-timer-label]");
  if (label) label.textContent = sess.pausedAt ? "En pausa" : remaining < 0 ? "Tiempo cumplido · sigue si quieres o termina" : `de ${fmtMin(sess.plannedMin)}`;
  if (remaining <= 0 && !ui.alerted && !sess.pausedAt) {
    ui.alerted = true;
    beep();
    navigator.vibrate?.([200, 100, 200]);
    toast("¡Tiempo! Termina la sesión o sigue un poco más");
  }
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
  } catch {
    /* sin audio */
  }
}

function setBlockDone(id, done, minutes) {
  const today = store.isoDate();
  store.update((st) => {
    const b = st.plan?.blocks.find((x) => x.id === id);
    if (!b) return;
    b.done = done;
    st.log = st.log.filter((l) => l.blockId !== id);
    if (done) st.log.push({ id: store.uid(), date: b.date <= today ? b.date : today, subjectId: b.subjectId, minutes: minutes ?? b.minutes, blockId: id });
  });
}

function finishSession() {
  const sess = store.get().session;
  if (!sess) return;
  const minutes = Math.max(1, Math.round(elapsedMs(sess) / 60000));
  if (sess.blockId && store.get().plan?.blocks.some((b) => b.id === sess.blockId)) {
    setBlockDone(sess.blockId, true, minutes);
  } else {
    store.update((st) => st.log.push({ id: store.uid(), date: store.isoDate(), subjectId: sess.subjectId, minutes, blockId: null }));
  }
  store.update((st) => (st.session = null));
  ui.sessionOpen = false;
  renderSession();
  render();
  toast(`Guardado: ${fmtMin(minutes)} de estudio`);
}

// ---------------------------------------------------------------- hoja inferior

function openSheet(html) {
  const sheet = $("#sheet");
  sheet.innerHTML = `<div class="sheet-backdrop" data-action="close-sheet"></div><div class="sheet-body" role="dialog" aria-modal="true">${html}</div>`;
  sheet.hidden = false;
}

function closeSheet() {
  const sheet = $("#sheet");
  sheet.hidden = true;
  sheet.innerHTML = "";
}

// ---------------------------------------------------------------- acciones

function blockById(id) {
  return store.get().plan?.blocks.find((b) => b.id === id);
}

const actions = {
  "toggle-block": (el) => {
    const b = blockById(el.dataset.id);
    if (b) setBlockDone(b.id, !b.done);
    render();
  },
  "start-block": (el) => {
    const b = blockById(el.dataset.id);
    if (b) startSession({ blockId: b.id, subjectId: b.subjectId, topic: b.topic, minutes: b.minutes });
  },
  "ask-block": (el) => {
    const b = blockById(el.dataset.id);
    if (!b) return;
    ui.focus = { subjectId: b.subjectId, topic: b.topic, task: b.task };
    ui.tutorSubject = b.subjectId;
    location.hash = "#/tutor";
  },
  "free-session": () => {
    const s = store.get();
    openSheet(`<h2 class="h3">Sesión libre</h2><p class="muted small">¿Qué vas a estudiar?</p>
      <div class="field-row"><div class="field"><label for="free-min">Duración</label>
      <select id="free-min" class="input">${[25, 45, 60, 90].map((m) => `<option value="${m}"${m === 45 ? " selected" : ""}>${m} min</option>`).join("")}</select></div></div>
      <div class="sheet-list">${s.subjects.map((x) => `<button class="sheet-item" data-action="start-free" data-id="${x.id}"><span class="dot" style="background:${color(x)}"></span>${esc(x.name)}</button>`).join("")}</div>`);
  },
  "start-free": (el) => {
    const minutes = Number($("#free-min")?.value || 45);
    const sub = store.subjectById(el.dataset.id);
    closeSheet();
    startSession({ subjectId: sub.id, topic: "Sesión libre", minutes });
  },
  "close-sheet": closeSheet,
  "open-session": () => {
    ui.sessionOpen = true;
    renderSession();
  },
  "minimize-session": () => {
    ui.sessionOpen = false;
    renderSession();
  },
  "toggle-pause": () => {
    store.update((st) => {
      const s = st.session;
      if (s.pausedAt) {
        s.pausedTotal += Date.now() - s.pausedAt;
        s.pausedAt = null;
      } else s.pausedAt = Date.now();
    });
    renderSession();
  },
  plus5: () => {
    store.update((st) => (st.session.plannedMin += 5));
    ui.alerted = false;
    tick();
  },
  "session-tutor": () => {
    const sess = store.get().session;
    const b = sess.blockId ? blockById(sess.blockId) : null;
    ui.focus = { subjectId: sess.subjectId, topic: sess.topic, task: b?.task || "" };
    ui.tutorSubject = sess.subjectId;
    ui.sessionOpen = false;
    renderSession();
    location.hash = "#/tutor";
  },
  "finish-session": finishSession,
  "cancel-session": () => {
    if (!confirm("¿Descartar esta sesión sin guardar el tiempo?")) return;
    store.update((st) => (st.session = null));
    ui.sessionOpen = false;
    renderSession();
  },
  "toggle-exam-form": () => {
    ui.showExamForm = !ui.showExamForm;
    render();
  },
  "delete-exam": (el) => {
    if (!confirm("¿Borrar este examen?")) return;
    store.update((st) => (st.exams = st.exams.filter((e) => e.id !== el.dataset.id)));
    render();
  },
  "pick-day": (el) => {
    ui.planDay = el.dataset.date;
    render();
  },
  "open-subjects": () => {
    const s = store.get();
    const hasChat = (s.chats[ui.tutorSubject] || []).length > 0;
    const focus = ui.focus && ui.focus.subjectId === ui.tutorSubject;
    openSheet(`<h2 class="h3">Asignatura</h2>
      <div class="sheet-list">${s.subjects
        .map((x) => `<button class="sheet-item${x.id === ui.tutorSubject ? " selected" : ""}" data-action="pick-subject" data-id="${x.id}" aria-pressed="${x.id === ui.tutorSubject}"><span class="dot" style="background:${color(x)}"></span><span class="grow">${esc(x.name)}</span>${x.id === ui.tutorSubject ? icon("check", 18) : ""}</button>`)
        .join("")}</div>
      <h2 class="h3">Cómo te ayuda el tutor</h2>
      <div class="segmented" role="group" aria-label="Estilo del tutor">
        <button class="seg${s.settings.tutorStyle !== "guiar" ? " on" : ""}" data-action="tutor-style" data-style="explicar" aria-pressed="${s.settings.tutorStyle !== "guiar"}"><b>Explícamelo</b><span>Explicaciones y soluciones completas</span></button>
        <button class="seg${s.settings.tutorStyle === "guiar" ? " on" : ""}" data-action="tutor-style" data-style="guiar" aria-pressed="${s.settings.tutorStyle === "guiar"}"><b>Guíame</b><span>Pistas para resolverlo tú</span></button>
      </div>
      ${focus ? `<button class="btn btn-secondary" data-action="clear-focus">Dejar de centrarse en «${esc(ui.focus.topic)}»</button>` : ""}
      ${hasChat ? `<button class="btn btn-danger" data-action="clear-chat">${icon("trash", 18)} Borrar esta conversación</button>` : ""}`);
  },
  "tutor-style": (el) => {
    store.update((st) => (st.settings.tutorStyle = el.dataset.style));
    closeSheet();
    toast(el.dataset.style === "guiar" ? "Modo guía: te dará pistas paso a paso" : "Modo explicación: te lo explicará todo");
  },
  "tutor-tab": (el) => {
    ui.tutorTab = el.dataset.tab;
    render();
    if (ui.tutorTab === "chat") scrollMessages();
  },
  "open-notebook": (el) => {
    ui.tutorSubject = el.dataset.id;
    ui.tutorTab = "cuaderno";
    ui.nbTopic = null;
    location.hash = "#/tutor";
  },
  "nb-open": (el) => {
    ui.nbTopic = el.dataset.id;
    ui.nbError = null;
    const t = nb.topicById(ui.tutorSubject, ui.nbTopic);
    ui.nbTab = t && !t.lesson && !t.attempts.length ? "leccion" : ui.nbTab;
    render();
  },
  "nb-back": () => {
    ui.nbTopic = null;
    ui.nbError = null;
    render();
  },
  "nb-tab": (el) => {
    ui.nbTab = el.dataset.tab;
    ui.nbError = null;
    render();
  },
  "nb-import": () => {
    const n = nb.importTopicsFromSyllabus(ui.tutorSubject);
    toast(n ? "Temas importados del temario" : "El temario de esta asignatura está vacío (edítalo en Ajustes)");
    render();
  },
  "nb-delete": (el) => {
    const t = nb.topicById(ui.tutorSubject, el.dataset.id);
    if (!t || !confirm(`¿Borrar el tema «${t.name}» con su lección y sus evaluaciones?`)) return;
    nb.deleteTopic(ui.tutorSubject, t.id);
    ui.nbTopic = null;
    render();
  },
  "nb-regen": () => {
    if (confirm("¿Generar una lección nueva? Sustituirá a la actual.")) startLesson();
  },
  "nb-stop-lesson": () => ui.nbLesson?.controller.abort(),
  "nb-ask": (el) => {
    const t = nb.topicById(ui.tutorSubject, el.dataset.id);
    ui.focus = { subjectId: ui.tutorSubject, topic: t.name, task: "" };
    ui.tutorTab = "chat";
    render();
    scrollMessages();
    $("#chat-input")?.focus();
  },
  "nb-count": (el) => {
    ui.quizCount = Number(el.dataset.n);
    ui.keepInnerScroll = true;
    render();
  },
  "nb-diff": (el) => {
    ui.quizDiff = el.dataset.v;
    ui.keepInnerScroll = true;
    render();
  },
  "nb-start-quiz": () => startQuiz(false),
  "nb-review-weak": (el) => {
    ui.nbTopic = el.dataset.id;
    startQuiz(true);
  },
  "nb-answer": (el) => {
    const q = ui.quiz;
    if (!q || q.selected !== null) return;
    const item = q.questions[q.index];
    q.selected = Number(el.dataset.i);
    const correct = q.selected === item.answer;
    if (correct) q.correct++;
    q.answers.push({ question: item.question, concept: item.concept, correct, chosen: item.options[q.selected], right: item.options[item.answer] });
    ui.keepInnerScroll = true;
    render();
    $(".quiz-feedback")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  },
  "nb-next": () => {
    const q = ui.quiz;
    if (!q) return;
    if (q.index + 1 < q.questions.length) {
      q.index++;
      q.selected = null;
    } else finishQuiz();
    render();
  },
  "nb-quit-quiz": () => {
    if (!confirm("¿Salir de la evaluación? No se guardará el resultado.")) return;
    ui.quiz = null;
    render();
  },
  "nb-close-quiz": () => {
    ui.quiz = null;
    render();
  },
  "nb-explain-errors": () => {
    const q = ui.quiz;
    const t = nb.topicById(q.subjectId, q.topicId);
    const wrong = q.answers.filter((a) => !a.correct);
    const text = `He hecho una evaluación del tema «${t?.name}» y he fallado estas preguntas. Explícame en qué me he equivocado, cómo se resuelven bien y qué debo repasar:\n\n${wrong
      .map((a, i) => `${i + 1}. ${a.question}\n   - Respondí: ${a.chosen}\n   - Correcta: ${a.right}`)
      .join("\n")}`;
    ui.focus = { subjectId: q.subjectId, topic: t?.name || "", task: "" };
    ui.tutorSubject = q.subjectId;
    ui.quiz = null;
    ui.tutorTab = "chat";
    sendMessage(text);
  },
  "pick-subject": (el) => {
    ui.tutorSubject = el.dataset.id;
    ui.nbTopic = null;
    ui.chatError = null;
    closeSheet();
    render();
    scrollMessages();
  },
  "clear-focus": () => {
    ui.focus = null;
    closeSheet();
    render();
  },
  "clear-chat": () => {
    closeSheet();
    if (!confirm("¿Borrar la conversación de esta asignatura?")) return;
    store.update((st) => (st.chats[ui.tutorSubject] = []));
    ui.chatError = null;
    render();
  },
  quick: (el) => sendMessage(el.dataset.text),
  stop: () => ui.streaming?.controller.abort(),
  attach: () => $("#file-input")?.click(),
  "remove-image": () => {
    ui.pendingImage = null;
    render();
  },
  "save-key": async () => {
    const key = $("#api-key").value.trim();
    store.update((st) => (st.settings.apiKey = key));
    if (!key) {
      ui.models = null;
      toast("Clave borrada");
      render();
      return;
    }
    await loadModels(false);
  },
  "add-subject": () => {
    store.update((st) =>
      st.subjects.push({ id: store.uid(), name: "Nueva asignatura", color: SUBJECT_COLORS_FREE() || "#475569", topics: "" })
    );
    render();
  },
  "delete-subject": (el) => {
    const sub = store.subjectById(el.dataset.id);
    if (store.get().subjects.length <= 1) return toast("Necesitas al menos una asignatura");
    if (!confirm(`¿Borrar ${sub.name}? Se quitarán también sus exámenes y bloques pendientes.`)) return;
    store.update((st) => {
      st.subjects = st.subjects.filter((x) => x.id !== sub.id);
      st.exams = st.exams.filter((e) => e.subjectId !== sub.id);
      if (st.plan) st.plan.blocks = st.plan.blocks.filter((b) => b.subjectId !== sub.id || b.done);
      delete st.chats[sub.id];
    });
    render();
  },
  install: async () => {
    const p = ui.installPrompt;
    if (!p) return;
    p.prompt();
    await p.userChoice;
    ui.installPrompt = null;
    render();
  },
  export: () => {
    const blob = new Blob([store.exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `estudio-${store.isoDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  import: () => $("#import-input")?.click(),
  reset: () => {
    if (!confirm("Se borrarán plan, exámenes, progreso y conversaciones. ¿Seguro?")) return;
    store.resetAll();
    ui.focus = null;
    render();
    toast("Datos borrados");
  },
};

function SUBJECT_COLORS_FREE() {
  const used = new Set(store.get().subjects.map((x) => x.color));
  return store.SUBJECT_COLORS.find((c) => !used.has(c));
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) {
    e.preventDefault();
    fn(el, e);
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-form]");
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  if (kind === "chat") {
    const input = $("#chat-input");
    const text = input.value;
    const hadFocus = document.activeElement === input;
    input.value = "";
    sendMessage(text);
    if (hadFocus) $("#chat-input")?.focus();
  } else if (kind === "nb-topic") {
    const name = String(new FormData(form).get("name") || "");
    const id = nb.addTopic(ui.tutorSubject, name);
    if (!id) return;
    ui.nbTopic = id;
    ui.nbTab = "leccion";
    render();
  } else if (kind === "nb-lesson") {
    startLesson(String(new FormData(form).get("focus") || "").trim());
  } else if (kind === "exam") {
    const data = Object.fromEntries(new FormData(form));
    if (!data.date) return toast("Pon la fecha del examen");
    store.update((st) => st.exams.push({ id: store.uid(), subjectId: data.subjectId, title: data.title.trim() || "Examen", date: data.date, topics: data.topics.trim() }));
    ui.showExamForm = false;
    render();
    toast("Examen guardado. Rehaz el plan para tenerlo en cuenta.");
  } else if (kind === "plan") {
    if (!store.get().settings.apiKey) {
      toast("Primero añade tu clave de Gemini");
      location.hash = "#/ajustes";
      return;
    }
    if (!store.get().settings.model) store.update((st) => (st.settings.model = gemini.DEFAULT_MODEL));
    const notes = new FormData(form).get("notes") || "";
    ui.planBusy = true;
    ui.planError = null;
    render();
    try {
      await generatePlan({ extraNotes: String(notes).trim() });
      ui.planDay = store.isoDate();
      toast("¡Plan listo!");
    } catch (err) {
      ui.planError = err.message || "No se pudo crear el plan";
    } finally {
      ui.planBusy = false;
      if (ui.route === "plan") render();
    }
  }
});

document.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.dataset.setting) {
    const key = el.dataset.setting;
    let value = el.value;
    if (key === "hoursPerDay") value = Math.min(10, Math.max(0.5, Number(value) || 2));
    store.update((st) => (st.settings[key] = value));
    toast("Guardado");
  } else if (el.dataset.day !== undefined) {
    const d = Number(el.dataset.day);
    store.update((st) => {
      const set = new Set(st.settings.days);
      el.checked ? set.add(d) : set.delete(d);
      st.settings.days = [...set].sort();
    });
  } else if (el.dataset.subject) {
    const { subject, field } = el.dataset;
    store.update((st) => {
      const x = st.subjects.find((s) => s.id === subject);
      if (x) x[field] = field === "name" ? el.value.trim() || x.name : el.value;
    });
    if (field === "color") render();
    else toast("Guardado");
  } else if (el.id === "file-input" && el.files?.[0]) {
    try {
      ui.pendingImage = await compressImage(el.files[0]);
      render();
      $("#chat-input")?.focus();
    } catch (err) {
      toast(err.message);
    }
  } else if (el.id === "import-input" && el.files?.[0]) {
    try {
      store.importData(await el.files[0].text());
      toast("Datos importados");
      render();
    } catch (err) {
      toast(err.message || "No se pudo importar");
    }
  }
});

document.addEventListener("keydown", (e) => {
  // Enter envía en el tutor (Mayús+Enter hace salto de línea), solo con teclado físico.
  if (e.target.id === "chat-input" && e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(pointer: fine)").matches) {
    e.preventDefault();
    e.target.form.requestSubmit();
  }
  if (e.key === "Escape" && !$("#sheet").hidden) closeSheet();
});

// Mientras se escribe en el tutor, esconde la barra inferior para dejar sitio al chat.
document.addEventListener("focusin", (e) => {
  if (e.target.id === "chat-input") document.body.classList.add("typing-chat");
});
document.addEventListener("focusout", (e) => {
  if (e.target.id !== "chat-input") return;
  // Espera un poco: si el foco vuelve al campo (p. ej. tras enviar), la barra no parpadea.
  setTimeout(() => {
    if (document.activeElement?.id !== "chat-input") document.body.classList.remove("typing-chat");
  }, 150);
});
// Los botones del cuadro de texto no le quitan el foco: así el teclado no se cierra
// y el diseño no se mueve justo cuando se pulsa «Enviar».
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".composer button") && document.activeElement?.id === "chat-input") e.preventDefault();
});

document.addEventListener("input", (e) => {
  if (e.target.id === "chat-input") {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(140, e.target.scrollHeight) + "px";
  }
});

// ---------------------------------------------------------------- router

const VIEWS = { hoy: viewHoy, plan: viewPlan, tutor: viewTutor, progreso: viewProgreso, ajustes: viewAjustes };

function render() {
  const fn = VIEWS[ui.route] || viewHoy;
  const keepScroll = ui.route === view.dataset.route ? view.scrollTop : 0;
  view.dataset.route = ui.route;
  view.className = `view view--${ui.route}`;
  const innerTop = ui.keepInnerScroll ? $("#nb-scroll")?.scrollTop || 0 : 0;
  view.innerHTML = fn();
  view.scrollTop = keepScroll;
  if (ui.keepInnerScroll) {
    const inner = $("#nb-scroll");
    if (inner) inner.scrollTop = innerTop;
    ui.keepInnerScroll = false;
  }
  document.querySelectorAll(".tabbar a").forEach((a) => {
    const on = a.dataset.route === ui.route;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function route() {
  const r = location.hash.replace(/^#\/?/, "") || "hoy";
  ui.route = VIEWS[r] ? r : "hoy";
  if (ui.route === "ajustes" && !ui.models && store.get().settings.apiKey && !ui.modelsBusy) loadModels(true);
  view.scrollTop = 0;
  view.dataset.route = "";
  render();
  if (ui.route === "tutor") scrollMessages();
}

window.addEventListener("hashchange", route);
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  ui.installPrompt = e;
  if (ui.route === "ajustes") render();
});

setInterval(tick, 1000);
document.addEventListener("visibilitychange", () => !document.hidden && tick());

if (store.get().settings.apiKey && !store.get().settings.model) store.update((st) => (st.settings.model = gemini.DEFAULT_MODEL));
route();
renderSession();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
