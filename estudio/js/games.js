// Minijuegos de estudio: uno por asignatura.
// Todos usan el mismo motor «arcade»: 3 vidas, combos, niveles que suben la dificultad
// y una explicación después de cada respuesta, para aprender de los fallos.

import * as store from "./store.js";
import { escapeHTML as esc, renderMarkdown } from "./markdown.js";
import { genDerivadas, genMatrices, genCircuitos, genTraza, TERMINAL_MISSIONS } from "./game-content.js";

export const GAMES = [
  {
    id: "derivadas",
    subject: "calculo",
    name: "Duelo de derivadas",
    desc: "Deriva e integra contra el reloj. Del x² a la regla de la cadena y el producto.",
    how: "Elige el resultado correcto antes de que se acabe el tiempo. Cada 5 aciertos subes de nivel: primero reglas básicas, luego regla de la cadena, después producto y cociente.",
    gen: genDerivadas,
    time: 25,
  },
  {
    id: "matrices",
    subject: "algebra",
    name: "Matriz relámpago",
    desc: "Determinantes, productos, sistemas, rango y valores propios.",
    how: "Calcula de cabeza (o con papel) y elige la respuesta. Las opciones incorrectas son los errores típicos: fíjate en la explicación cuando falles.",
    gen: genMatrices,
    time: 45,
  },
  {
    id: "terminal",
    subject: "programario",
    name: "Terminal Quest",
    desc: "Escribe el comando correcto para cada misión: de ls a scripts de Bash.",
    how: "Lee la misión y escribe el comando como en una terminal real. Si fallas, te damos una pista y otro intento. «Pista» resta la mitad de los puntos y «Ver solución» no da puntos, pero no quita vidas.",
    gen: null, // usa misiones
    time: null,
  },
  {
    id: "circuitos",
    subject: "fundamentos",
    name: "Enciende el circuito",
    desc: "Puertas lógicas, binario, hexadecimal y complemento a 2.",
    how: "Unas veces tendrás que activar los interruptores para que se encienda la bombilla; otras, calcular qué sale o convertir entre bases.",
    gen: genCircuitos,
    time: 40,
  },
  {
    id: "traza",
    subject: "programacion",
    name: "¿Qué imprime?",
    desc: "Lee el código y adivina la salida: bucles, condiciones, funciones y recursión.",
    how: "Traza el programa a mano y elige lo que muestra por pantalla. Las respuestas falsas son los fallos típicos (te pasas o te quedas corto en un bucle, división entera…).",
    gen: genTraza,
    time: 45,
    languages: true,
  },
];

export function gameById(id) {
  return GAMES.find((g) => g.id === id);
}

export function best(id) {
  const v = store.get().games?.[id];
  return typeof v === "object" && v ? v : null; // { score, level }
}

function saveBest(id, score, level) {
  const cur = best(id);
  if (score <= 0 || (cur && cur.score >= score)) return false;
  store.update((st) => {
    st.games ||= {};
    st.games[id] = { score, level };
  });
  return true;
}

export function mount(id, el) {
  const g = gameById(id);
  return g ? mountArcade(el, g) : () => {};
}

// ---------------------------------------------------------------- utilidades

const rand = (n) => Math.floor(Math.random() * n);

const HEART = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4h2c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>';

function md(text, inline = false) {
  return renderMarkdown(text, { inline });
}

function langPref() {
  return store.get().games?.lang || null;
}

// ---------------------------------------------------------------- motor arcade

function mountArcade(el, game) {
  const LIVES = 3;
  const PER_LEVEL = 5;
  let s; // estado de la partida
  let q; // pregunta actual
  let tick = null;
  let autoNext = null;
  let qStart = 0;

  el.innerHTML = `
    <div class="arc-bar">
      <div class="arc-lives" data-lives aria-label="Vidas"></div>
      <div class="arc-level" data-level>Nivel 1</div>
      <div class="arc-score"><span data-score>0</span><small data-combo></small></div>
    </div>
    <div class="g-stage">
      <section class="arc-card" data-card aria-live="polite"></section>
      <div class="g-overlay" data-overlay hidden></div>
    </div>`;
  const card = el.querySelector("[data-card]");
  const ov = el.querySelector("[data-overlay]");

  function overlay(html) {
    if (!html) {
      ov.hidden = true;
      ov.innerHTML = "";
      return;
    }
    ov.innerHTML = `<div class="g-overlay-card">${html}</div>`;
    ov.hidden = false;
  }

  function mult() {
    return s.combo >= 8 ? 4 : s.combo >= 5 ? 3 : s.combo >= 3 ? 2 : 1;
  }

  function hud() {
    el.querySelector("[data-lives]").innerHTML = Array.from({ length: LIVES }, (_, i) => `<span class="heart${i < s.lives ? "" : " lost"}">${HEART}</span>`).join("");
    el.querySelector("[data-lives]").setAttribute("aria-label", `${s.lives} vidas`);
    el.querySelector("[data-level]").textContent = `Nivel ${s.level}`;
    el.querySelector("[data-score]").textContent = s.score;
    el.querySelector("[data-combo]").textContent = mult() > 1 ? ` ×${mult()}` : "";
  }

  // -------- preguntas

  function nextQuestion() {
    clearTimeout(autoNext);
    if (game.id === "terminal") {
      const pool = TERMINAL_MISSIONS.filter((m) => m.level <= s.level && !s.used.has(m.id));
      const fresh = pool.filter((m) => m.level === s.level);
      const pick = (fresh.length ? fresh : pool)[rand((fresh.length ? fresh : pool).length)];
      if (!pick) return end(true);
      s.used.add(pick.id);
      q = { ...pick, type: "input", attempts: 0, hinted: false };
    } else {
      q = game.gen(s.level, { lang: s.lang });
      q.attempts = 0;
    }
    q.answered = false;
    qStart = Date.now();
    drawQuestion();
    if (game.time) startTimer();
  }

  function timeLimit() {
    // un poco menos de tiempo en niveles altos, pero nunca menos del 60 %
    return game.time * 1000 * Math.max(0.6, 1 - (s.level - 1) * 0.1);
  }

  function startTimer() {
    clearInterval(tick);
    const bar = card.querySelector("[data-time]");
    tick = setInterval(() => {
      const left = timeLimit() - (Date.now() - qStart);
      if (bar) bar.style.width = `${Math.max(0, (left / timeLimit()) * 100)}%`;
      if (left <= 0) {
        clearInterval(tick);
        resolve(false, { timeout: true });
      }
    }, 100);
  }

  function drawQuestion() {
    let body = "";
    if (q.type === "choice") {
      body = `<div class="arc-opts${q.options.length > 2 && q.options.every((o) => o.length < 28) ? " grid" : ""}">${q.options
        .map((o, i) => `<button class="arc-opt" data-opt="${i}">${md(o, true)}</button>`)
        .join("")}</div>`;
    } else if (q.type === "switches") {
      body = `<div class="switches">${q.vars
        .map((v) => `<button class="switch" data-switch="${v}" aria-pressed="false"><span class="switch-name">${v}</span><span class="switch-val">0</span></button>`)
        .join("")}</div>
        <div class="bulb" data-bulb aria-hidden="true"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1v.5h5V16c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg></div>
        <button class="btn" data-check>Comprobar</button>`;
    } else if (q.type === "input") {
      body = `<form class="term" data-term autocomplete="off">
          <div class="term-head"><span></span><span></span><span></span></div>
          <div class="term-body">
            <div class="term-line"><span class="term-prompt">ana@vcd:~$</span>
            <label class="sr-only" for="term-in">Comando</label>
            <input id="term-in" class="term-input" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" autocomplete="off"></div>
            <div class="term-msg" data-term-msg></div>
          </div>
        </form>
        <div class="row-gap">
          <button class="btn btn-secondary grow" data-hint>Pista</button>
          <button class="btn btn-secondary grow" data-skip>Ver solución</button>
          <button class="btn grow" data-run>Ejecutar</button>
        </div>`;
    }
    card.innerHTML = `
      <div class="arc-concept">${esc(q.concept)}</div>
      <div class="arc-prompt md">${md(q.prompt)}</div>
      ${q.code ? `<pre class="code-view"><code>${highlight(q.code, q.lang)}</code></pre>` : ""}
      ${q.expr ? `<div class="expr">${md(q.expr)}</div>` : ""}
      ${body}
      ${game.time ? `<div class="arc-time"><div class="arc-time-fill" data-time></div></div>` : ""}
      <div data-feedback></div>`;
    if (q.type === "input") setTimeout(() => card.querySelector("#term-in")?.focus(), 50);
  }

  // -------- respuestas

  function points() {
    let p = 10 * s.level * mult();
    if (game.time) {
      const left = Math.max(0, timeLimit() - (Date.now() - qStart));
      p += Math.round((left / timeLimit()) * 5 * s.level);
    }
    if (q.hinted) p = Math.round(p / 2);
    return p;
  }

  function resolve(correct, { timeout = false, skipped = false } = {}) {
    if (q.answered) return;
    q.answered = true;
    clearInterval(tick);
    card.querySelectorAll("button.arc-opt, button.switch, [data-check], [data-hint], [data-skip], [data-run]").forEach((b) => (b.disabled = true));
    const input = card.querySelector("#term-in");
    if (input) input.readOnly = true;
    s.asked++;
    let gained = 0;
    let levelUp = false;
    if (correct) {
      s.combo++;
      s.correct++;
      gained = points();
      s.score += gained;
      s.inLevel++;
      if (s.inLevel >= PER_LEVEL && s.level < 5) {
        s.level++;
        s.inLevel = 0;
        levelUp = true;
      }
    } else {
      s.combo = 0;
      if (!skipped) s.lives--;
      s.missed.push(q.concept);
    }
    hud();
    if (correct) {
      card.classList.remove("shake");
      card.classList.add("pulse-ok");
    } else {
      card.classList.add("shake");
      navigator.vibrate?.(80);
    }
    setTimeout(() => card.classList.remove("pulse-ok", "shake"), 450);

    const title = correct
      ? `¡Correcto! +${gained}${mult() > 1 ? ` (combo ×${mult()})` : ""}`
      : timeout
        ? "¡Se acabó el tiempo!"
        : skipped
          ? "Solución"
          : "No es correcto";
    const solution = q.type === "input" ? `<pre class="code-view small"><code>${esc(q.solution)}</code></pre>` : q.answerText ? `<p><b>Respuesta:</b> ${md(q.answerText, true)}</p>` : "";
    const fb = card.querySelector("[data-feedback]");
    fb.innerHTML = `<div class="arc-fb ${correct ? "ok" : "bad"}" role="status">
        <b>${title}</b>
        ${!correct || q.type === "input" ? solution : ""}
        <div class="md">${md(q.explanation)}</div>
        ${levelUp ? `<div class="level-up">¡Subes a nivel ${s.level}!</div>` : ""}
      </div>
      <button class="btn" data-next>${s.lives > 0 ? (correct ? "Siguiente" : "Entendido, sigo") : "Ver resultado"}</button>`;
    fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // Si aciertas, se avanza solo; si fallas, te paras a leer la explicación.
    if (correct && s.lives > 0) autoNext = setTimeout(nextQuestion, levelUp ? 2600 : 1900 + Math.min(2500, q.explanation.length * 12));
  }

  function check(value) {
    if (q.type === "choice") return Number(value) === q.answer;
    if (q.type === "switches") return q.evaluate(value) === q.target;
    if (q.type === "input") {
      const cmd = value.trim().replace(/\s+/g, " ");
      return q.accept.some((re) => re.test(cmd));
    }
    return false;
  }

  function onChoice(btn) {
    const i = Number(btn.dataset.opt);
    const ok = check(i);
    btn.classList.add(ok ? "right" : "wrong");
    if (!ok) card.querySelector(`[data-opt="${q.answer}"]`)?.classList.add("right");
    resolve(ok);
  }

  function switchValues() {
    const vals = {};
    card.querySelectorAll("[data-switch]").forEach((b) => (vals[b.dataset.switch] = b.getAttribute("aria-pressed") === "true" ? 1 : 0));
    return vals;
  }

  function onCheckSwitches() {
    const vals = switchValues();
    const out = q.evaluate(vals);
    const ok = out === q.target;
    const bulb = card.querySelector("[data-bulb]");
    bulb.classList.toggle("on", out === 1);
    resolve(ok);
  }

  function onRun() {
    const input = card.querySelector("#term-in");
    const value = input.value;
    if (!value.trim()) return;
    const msg = card.querySelector("[data-term-msg]");
    if (check(value)) {
      msg.innerHTML = q.output ? `<pre>${esc(q.output)}</pre>` : "";
      resolve(true);
      return;
    }
    q.attempts++;
    if (q.attempts === 1) {
      q.hinted = true;
      msg.innerHTML = `<span class="term-err">${esc(value.trim().split(" ")[0])}: no es lo que pide la misión.</span><br><span class="term-hint">Pista: ${md(q.hint, true)}</span>`;
      card.querySelector("[data-hint]").disabled = true;
      input.select();
    } else {
      msg.innerHTML = `<span class="term-err">Tampoco. Fíjate en la solución:</span>`;
      resolve(false);
    }
  }

  // -------- partida

  function start(lang) {
    s = { lives: LIVES, score: 0, combo: 0, level: 1, inLevel: 0, asked: 0, correct: 0, missed: [], used: new Set(), lang };
    overlay(null);
    hud();
    nextQuestion();
  }

  function end(exhausted = false) {
    clearInterval(tick);
    clearTimeout(autoNext);
    const record = saveBest(game.id, s.score, s.level);
    const counts = {};
    s.missed.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
    const review = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const acc = s.asked ? Math.round((s.correct / s.asked) * 100) : 0;
    const subject = store.subjectById(game.subject);
    overlay(`<h3>${exhausted ? "¡Has completado todas las misiones!" : "Fin de la partida"}</h3>
      <div class="end-score">${s.score}<span>puntos</span></div>
      <p>Nivel ${s.level} · ${s.correct}/${s.asked} aciertos (${acc} %)${record ? " · <b>¡nuevo récord!</b>" : ""}</p>
      ${
        review.length
          ? `<div class="review"><b>Para repasar</b><ul>${review.map(([c, n]) => `<li>${esc(c)}${n > 1 ? ` <span class="muted">×${n}</span>` : ""}</li>`).join("")}</ul></div>`
          : ""
      }
      <button class="btn" data-start>Jugar otra vez</button>
      ${subject ? `<button class="btn btn-secondary" data-action="open-notebook" data-id="${subject.id}">Estudiar ${esc(subject.name)} en el cuaderno</button>` : ""}`);
  }

  function intro() {
    const b = best(game.id);
    const subject = store.subjectById(game.subject);
    const pref = langPref();
    overlay(`<div class="eyebrow accent">${esc(subject?.name || "")}</div>
      <h3>${esc(game.name)}</h3>
      <p>${esc(game.how)}</p>
      <p class="small">3 vidas · combos ×2, ×3, ×4 seguidos · ${game.time ? "contrarreloj" : "sin prisa"}</p>
      ${b ? `<p class="small">Tu récord: <b>${b.score}</b> puntos (nivel ${b.level})</p>` : ""}
      ${
        game.languages
          ? `<div class="lang-pick" role="group" aria-label="Lenguaje"><b class="small">Lenguaje del código</b>
              <div class="pills">${["python", "cpp"]
                .map((l) => `<button class="pill-opt${(pref || detectLang()) === l ? " on" : ""}" data-lang="${l}" aria-pressed="${(pref || detectLang()) === l}">${l === "python" ? "Python" : "C++"}</button>`)
                .join("")}</div></div>`
          : ""
      }
      <button class="btn" data-start>Empezar</button>`);
  }

  function detectLang() {
    const t = (store.subjectById("programacion")?.topics || "").toLowerCase();
    return /c\+\+|\bcpp\b|\bc\b/.test(t) && !/python/.test(t) ? "cpp" : "python";
  }

  // -------- eventos

  const click = (e) => {
    const t = e.target;
    if (t.closest("[data-start]")) {
      const lang = game.languages ? langPref() || detectLang() : null;
      return start(lang);
    }
    const langBtn = t.closest("[data-lang]");
    if (langBtn) {
      store.update((st) => {
        st.games ||= {};
        st.games.lang = langBtn.dataset.lang;
      });
      ov.querySelectorAll("[data-lang]").forEach((b) => {
        const on = b === langBtn;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      return;
    }
    if (t.closest("[data-next]")) {
      clearTimeout(autoNext);
      return s.lives > 0 ? nextQuestion() : end();
    }
    if (!q || q.answered) return;
    const opt = t.closest("[data-opt]");
    if (opt) return onChoice(opt);
    const sw = t.closest("[data-switch]");
    if (sw) {
      const on = sw.getAttribute("aria-pressed") !== "true";
      sw.setAttribute("aria-pressed", String(on));
      sw.querySelector(".switch-val").textContent = on ? "1" : "0";
      return;
    }
    if (t.closest("[data-check]")) return onCheckSwitches();
    if (t.closest("[data-run]")) return onRun();
    if (t.closest("[data-hint]")) {
      q.hinted = true;
      t.closest("[data-hint]").disabled = true;
      card.querySelector("[data-term-msg]").innerHTML = `<span class="term-hint">Pista: ${md(q.hint, true)}</span>`;
      card.querySelector("#term-in")?.focus();
      return;
    }
    if (t.closest("[data-skip]")) return resolve(false, { skipped: true });
  };
  const submitTerm = (e) => {
    if (!e.target.closest("[data-term]")) return;
    e.preventDefault();
    if (q && !q.answered) onRun();
  };
  const hide = () => {
    // Al salir de la app no se agota el tiempo: se reinicia el reloj de la pregunta.
    if (!document.hidden && q && !q.answered && game.time) qStart = Date.now() - Math.min(Date.now() - qStart, timeLimit() * 0.5);
  };
  el.addEventListener("click", click);
  el.addEventListener("submit", submitTerm);
  document.addEventListener("visibilitychange", hide);

  intro();
  return () => {
    clearInterval(tick);
    clearTimeout(autoNext);
    el.removeEventListener("click", click);
    el.removeEventListener("submit", submitTerm);
    document.removeEventListener("visibilitychange", hide);
  };
}

// ---------------------------------------------------------------- resaltado de código

const KEYWORDS = {
  python: /\b(def|return|for|in|range|while|if|elif|else|print|and|or|not|True|False|None|len)\b/g,
  cpp: /\b(int|void|return|for|while|if|else|cout|endl|bool|true|false|auto|const|std|include|using|namespace|main)\b/g,
};

function highlight(code, lang) {
  // Se escapa primero y se marcan números, cadenas, comentarios y palabras clave.
  const tokens = [];
  const keep = (html) => {
    tokens.push(html);
    return `\u0000T${tokens.length - 1}T\u0000`;
  };
  let src = esc(code);
  src = src.replace(/(#.*$|\/\/.*$)/gm, (m) => (lang === "cpp" && m.startsWith("#include") ? m : keep(`<span class="hl-c">${m}</span>`)));
  src = src.replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, (m) => keep(`<span class="hl-s">${m}</span>`));
  src = src.replace(KEYWORDS[lang] || KEYWORDS.python, (m) => keep(`<span class="hl-k">${m}</span>`));
  src = src.replace(/\b(\d+)\b/g, (m) => keep(`<span class="hl-n">${m}</span>`));
  return src.replace(/\u0000T(\d+)T\u0000/g, (_, i) => tokens[Number(i)]);
}
