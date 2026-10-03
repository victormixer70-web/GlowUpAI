// Minijuegos para descansar entre bloques de estudio.
// Cada juego se monta en un contenedor y devuelve una función que lo desmonta
// (para timers, bucles y escuchas de teclado).

import * as store from "./store.js";
import { escapeHTML as esc } from "./markdown.js";

export const GAMES = [
  { id: "2048", name: "2048", desc: "Junta fichas iguales hasta llegar a 2048.", record: "Récord", lowerIsBetter: false },
  { id: "serpiente", name: "Serpiente", desc: "Come, crece y no te muerdas la cola.", record: "Récord", lowerIsBetter: false },
  { id: "parejas", name: "Parejas", desc: "Une cada concepto con su pareja: derivadas, binario, lógica…", record: "Menos movimientos", lowerIsBetter: true },
  { id: "binario", name: "Binario contrarreloj", desc: "Decimal, binario y hexadecimal en 60 segundos.", record: "Récord", lowerIsBetter: false },
  { id: "calculo", name: "Cálculo mental", desc: "Todas las operaciones que puedas en 60 segundos.", record: "Récord", lowerIsBetter: false },
];

export function gameById(id) {
  return GAMES.find((g) => g.id === id);
}

export function best(id) {
  return store.get().games?.[id] ?? null;
}

// Guarda la puntuación si es récord. Devuelve true si lo es.
function submit(id, score) {
  const g = gameById(id);
  const cur = best(id);
  if (!g.lowerIsBetter && score <= 0) return false;
  const better = cur === null || (g.lowerIsBetter ? score < cur : score > cur);
  if (better) {
    store.update((st) => {
      st.games ||= {};
      st.games[id] = score;
    });
  }
  return better;
}

export function mount(id, el) {
  const fn = { 2048: mount2048, serpiente: mountSnake, parejas: mountPairs, binario: (e) => mountTimed(e, "binario", genBinary), calculo: (e) => mountTimed(e, "calculo", genMath) }[id];
  return fn ? fn(el) : () => {};
}

// ---------------------------------------------------------------- utilidades

const rand = (n) => Math.floor(Math.random() * n);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function onSwipe(el, cb) {
  let sx = 0;
  let sy = 0;
  let id = null;
  const down = (e) => {
    id = e.pointerId;
    sx = e.clientX;
    sy = e.clientY;
  };
  const up = (e) => {
    if (id !== e.pointerId) return;
    id = null;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointerup", up);
  };
}

function onArrows(cb) {
  const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  const h = (e) => {
    const d = keys[e.key];
    if (!d || e.target.closest?.("input, textarea, select")) return;
    e.preventDefault();
    cb(d);
  };
  document.addEventListener("keydown", h);
  return () => document.removeEventListener("keydown", h);
}

function statsBar(id, extra = "") {
  const b = best(id);
  return `<div class="g-bar">
    <div class="g-stat"><span>Puntos</span><b data-score>0</b></div>
    <div class="g-stat"><span>${esc(gameById(id).record)}</span><b data-best>${b ?? "—"}</b></div>
    ${extra}
  </div>`;
}

function overlay(el, html) {
  const ov = el.querySelector("[data-overlay]");
  if (!html) {
    ov.hidden = true;
    ov.innerHTML = "";
    return;
  }
  ov.innerHTML = `<div class="g-overlay-card">${html}</div>`;
  ov.hidden = false;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ---------------------------------------------------------------- 2048

function mount2048(el) {
  let grid;
  let score;
  let over;
  let won;
  let keepGoing;
  let lastNew = -1;
  let startBest = 0;

  el.innerHTML = `${statsBar("2048", `<button class="btn btn-secondary small-btn" data-new>Nueva</button>`)}
    <div class="g-stage"><div class="g2048" data-board role="img" aria-label="Tablero de 2048"></div><div class="g-overlay" data-overlay hidden></div></div>
    <p class="muted small center">Desliza el dedo sobre el tablero (o usa las flechas).</p>`;
  const board = el.querySelector("[data-board]");

  const lineIdx = (k, dir) => {
    const row = [0, 1, 2, 3].map((j) => k * 4 + j);
    const col = [0, 1, 2, 3].map((j) => k + j * 4);
    return { left: row, right: [...row].reverse(), up: col, down: [...col].reverse() }[dir];
  };

  function addTile() {
    const empty = grid.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (!empty.length) return;
    lastNew = empty[rand(empty.length)];
    grid[lastNew] = Math.random() < 0.9 ? 2 : 4;
  }

  function canMove() {
    for (let i = 0; i < 16; i++) {
      if (!grid[i]) return true;
      if (i % 4 < 3 && grid[i] === grid[i + 1]) return true;
      if (i < 12 && grid[i] === grid[i + 4]) return true;
    }
    return false;
  }

  function draw() {
    board.innerHTML = grid
      .map((v, i) => `<div class="t ${v ? `t${Math.min(v, 4096)}` : ""}${i === lastNew ? " new" : ""}${v >= 1024 ? " small" : ""}">${v || ""}</div>`)
      .join("");
    board.setAttribute("aria-label", `Tablero de 2048. Puntos: ${score}`);
    el.querySelector("[data-score]").textContent = score;
  }

  function finish() {
    const record = score > startBest;
    if (won && !keepGoing) {
      overlay(el, `<h3>¡Has llegado a 2048!</h3><p>${score} puntos${record ? " · ¡nuevo récord!" : ""}</p>
        <div class="row-gap"><button class="btn btn-secondary grow" data-continue>Seguir jugando</button><button class="btn grow" data-new>Nueva partida</button></div>`);
    } else {
      overlay(el, `<h3>Fin de la partida</h3><p>${score} puntos${record ? " · ¡nuevo récord!" : ""}</p><button class="btn" data-new>Jugar otra vez</button>`);
    }
  }

  function move(dir) {
    if (over || (won && !keepGoing)) return;
    let moved = false;
    for (let k = 0; k < 4; k++) {
      const idx = lineIdx(k, dir);
      const vals = idx.map((i) => grid[i]).filter(Boolean);
      const out = [];
      for (let j = 0; j < vals.length; j++) {
        if (vals[j] === vals[j + 1]) {
          const v = vals[j] * 2;
          out.push(v);
          score += v;
          if (v === 2048 && !keepGoing) won = true;
          j++;
        } else out.push(vals[j]);
      }
      while (out.length < 4) out.push(0);
      idx.forEach((i, j) => {
        if (grid[i] !== out[j]) moved = true;
        grid[i] = out[j];
      });
    }
    if (!moved) return;
    addTile();
    if (!canMove()) over = true;
    draw();
    if (submit("2048", score)) el.querySelector("[data-best]").textContent = score;
    if (over || (won && !keepGoing)) finish();
  }

  function reset() {
    startBest = best("2048") ?? 0;
    grid = Array(16).fill(0);
    score = 0;
    over = false;
    won = false;
    keepGoing = false;
    overlay(el, null);
    addTile();
    addTile();
    draw();
  }

  const click = (e) => {
    if (e.target.closest("[data-new]")) reset();
    if (e.target.closest("[data-continue]")) {
      keepGoing = true;
      overlay(el, null);
    }
  };
  el.addEventListener("click", click);
  const offSwipe = onSwipe(board, move);
  const offKeys = onArrows(move);
  reset();
  return () => {
    el.removeEventListener("click", click);
    offSwipe();
    offKeys();
  };
}

// ---------------------------------------------------------------- Serpiente

function mountSnake(el) {
  const N = 17;
  let snake;
  let dir;
  let queue;
  let food;
  let score;
  let running = false;
  let timer = null;
  let speed;

  el.innerHTML = `${statsBar("serpiente", `<button class="btn btn-secondary small-btn" data-pause>Pausa</button>`)}
    <div class="g-stage"><canvas class="snake-canvas" data-canvas role="img" aria-label="Juego de la serpiente"></canvas><div class="g-overlay" data-overlay hidden></div></div>
    <div class="dpad" role="group" aria-label="Controles">
      <button class="dpad-btn up" data-dir="up" aria-label="Arriba"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/></svg></button>
      <button class="dpad-btn left" data-dir="left" aria-label="Izquierda"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
      <button class="dpad-btn right" data-dir="right" aria-label="Derecha"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
      <button class="dpad-btn down" data-dir="down" aria-label="Abajo"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>
    </div>`;
  const canvas = el.querySelector("[data-canvas]");
  const ctx = canvas.getContext("2d");
  const pauseBtn = el.querySelector("[data-pause]");
  const dpr = window.devicePixelRatio || 1;
  const px = Math.min(el.clientWidth || 340, 420);
  canvas.style.width = canvas.style.height = `${px}px`;
  canvas.width = canvas.height = Math.round(px * dpr);
  const cell = canvas.width / N;
  const colors = { bg: cssVar("--surface"), grid: cssVar("--surface-2"), snake: cssVar("--ink"), head: cssVar("--ink"), food: cssVar("--accent") };

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const opposite = { up: "down", down: "up", left: "right", right: "left" };

  function placeFood() {
    const free = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    food = free[rand(free.length)];
  }

  function draw() {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colors.grid;
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2) ctx.fillRect(x * cell, y * cell, cell, cell);
    if (food) {
      ctx.fillStyle = colors.food;
      ctx.beginPath();
      ctx.arc((food.x + 0.5) * cell, (food.y + 0.5) * cell, cell * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
    snake.forEach((s, i) => {
      ctx.fillStyle = colors.snake;
      ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 0.9 - i * 0.02);
      const pad = cell * 0.08;
      ctx.beginPath();
      ctx.roundRect(s.x * cell + pad, s.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.25);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function stop() {
    running = false;
    clearTimeout(timer);
    timer = null;
    pauseBtn.textContent = "Seguir";
  }

  function gameOver() {
    stop();
    pauseBtn.disabled = true;
    const record = submit("serpiente", score);
    el.querySelector("[data-best]").textContent = best("serpiente");
    overlay(el, `<h3>¡Te has chocado!</h3><p>${score} puntos${record ? " · ¡nuevo récord!" : ""}</p><button class="btn" data-start>Jugar otra vez</button>`);
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const [dx, dy] = DIRS[dir];
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    const willEat = food && head.x === food.x && head.y === food.y;
    const body = willEat ? snake : snake.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || body.some((s) => s.x === head.x && s.y === head.y)) {
      gameOver();
      return;
    }
    snake = [head, ...body];
    if (willEat) {
      score++;
      el.querySelector("[data-score]").textContent = score;
      speed = Math.max(70, speed - 4);
      placeFood();
    }
    draw();
    timer = setTimeout(step, speed);
  }

  function start() {
    const mid = Math.floor(N / 2);
    snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    dir = "right";
    queue = [];
    score = 0;
    speed = 150;
    el.querySelector("[data-score]").textContent = 0;
    placeFood();
    overlay(el, null);
    pauseBtn.disabled = false;
    resume();
  }

  function resume() {
    if (running) return;
    running = true;
    pauseBtn.textContent = "Pausa";
    overlay(el, null);
    draw();
    timer = setTimeout(step, speed);
  }

  function turn(d) {
    if (!running) return;
    const last = queue.length ? queue[queue.length - 1] : dir;
    if (d === last || d === opposite[last] || queue.length > 2) return;
    queue.push(d);
  }

  const click = (e) => {
    if (e.target.closest("[data-start]")) start();
    else if (e.target.closest("[data-resume]")) resume();
    else if (e.target.closest("[data-pause]")) {
      if (running) {
        stop();
        overlay(el, `<h3>En pausa</h3><button class="btn" data-resume>Seguir</button>`);
      } else if (snake) resume();
    }
  };
  // Las flechas en pantalla responden al tocar (sin esperar al «click»).
  const press = (e) => {
    const b = e.target.closest("[data-dir]");
    if (!b) return;
    e.preventDefault();
    turn(b.dataset.dir);
  };
  const hide = () => {
    if (document.hidden && running) {
      stop();
      overlay(el, `<h3>En pausa</h3><button class="btn" data-resume>Seguir</button>`);
    }
  };
  el.addEventListener("click", click);
  el.addEventListener("pointerdown", press);
  document.addEventListener("visibilitychange", hide);
  const offSwipe = onSwipe(canvas, turn);
  const offKeys = onArrows(turn);

  snake = null;
  food = null;
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  pauseBtn.disabled = true;
  overlay(el, `<h3>Serpiente</h3><p>Desliza sobre el tablero o usa las flechas de abajo.</p><button class="btn" data-start>Empezar</button>`);

  return () => {
    stop();
    el.removeEventListener("click", click);
    el.removeEventListener("pointerdown", press);
    document.removeEventListener("visibilitychange", hide);
    offSwipe();
    offKeys();
  };
}

// ---------------------------------------------------------------- Parejas

// Pares de conceptos de primer curso: cada lado es único en todo el banco.
const PAIRS = [
  ["1010₂", "10"],
  ["0xFF", "255"],
  ["2¹⁰", "1024"],
  ["1 byte", "8 bits"],
  ["(x²)′", "2x"],
  ["(sin x)′", "cos x"],
  ["(eˣ)′", "eˣ"],
  ["∫ 1/x dx", "ln|x| + C"],
  ["cos²x + sin²x", "1"],
  ["lím sin x / x, x→0", "uno (límite notable)"],
  ["¬(A ∧ B)", "¬A ∨ ¬B"],
  ["A + A·B", "A"],
  ["A XOR A", "0"],
  ["det de [[1,2],[3,4]]", "−2"],
  ["rango de I₃", "3"],
  ["Búsqueda binaria", "O(log n)"],
  ["Dos for anidados", "O(n²)"],
  ["chmod 755", "rwxr-xr-x"],
  ["ls -a", "Muestra ocultos"],
  ["Σ xⁿ (|x|<1)", "1 / (1 − x)"],
];

function mountPairs(el) {
  let cards;
  let open;
  let moves;
  let found;
  let lock;
  let t0;
  let timer = null;
  let flipBack = null;

  el.innerHTML = `<div class="g-bar">
      <div class="g-stat"><span>Movimientos</span><b data-score>0</b></div>
      <div class="g-stat"><span>Tiempo</span><b data-time>0:00</b></div>
      <div class="g-stat"><span>${esc(gameById("parejas").record)}</span><b data-best>${best("parejas") ?? "—"}</b></div>
    </div>
    <div class="g-stage"><div class="pairs" data-board></div><div class="g-overlay" data-overlay hidden></div></div>
    <div class="row-gap"><button class="btn btn-secondary grow" data-new>Nueva partida</button></div>`;
  const board = el.querySelector("[data-board]");

  function clock() {
    if (!t0) return;
    const s = Math.floor((Date.now() - t0) / 1000);
    el.querySelector("[data-time]").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function draw() {
    board.innerHTML = cards
      .map(
        (c, i) => `<button class="pcard${c.open || c.done ? " open" : ""}${c.done ? " done" : ""}" data-i="${i}" ${c.done ? "disabled" : ""} aria-label="${c.open || c.done ? esc(c.text) : "Carta boca abajo"}">
          <span class="pcard-in"><span class="pcard-back" aria-hidden="true"></span><span class="pcard-front">${esc(c.text)}</span></span>
        </button>`
      )
      .join("");
    el.querySelector("[data-score]").textContent = moves;
  }

  function reset() {
    clearTimeout(flipBack);
    clearInterval(timer);
    const chosen = shuffle(PAIRS).slice(0, 8);
    cards = shuffle(chosen.flatMap((p, k) => [{ pair: k, text: p[0] }, { pair: k, text: p[1] }]));
    open = [];
    moves = 0;
    found = 0;
    lock = false;
    t0 = null;
    el.querySelector("[data-time]").textContent = "0:00";
    overlay(el, null);
    draw();
  }

  function flip(i) {
    const c = cards[i];
    if (lock || c.open || c.done) return;
    if (!t0) {
      t0 = Date.now();
      timer = setInterval(clock, 500);
    }
    c.open = true;
    open.push(i);
    if (open.length === 2) {
      moves++;
      const [a, b] = open.map((k) => cards[k]);
      if (a.pair === b.pair) {
        a.done = b.done = true;
        a.open = b.open = false;
        open = [];
        found++;
        if (found === 8) {
          clearInterval(timer);
          clock();
          const record = submit("parejas", moves);
          el.querySelector("[data-best]").textContent = best("parejas");
          setTimeout(() => overlay(el, `<h3>¡Completado!</h3><p>${moves} movimientos en ${el.querySelector("[data-time]").textContent}${record ? " · ¡nuevo récord!" : ""}</p><button class="btn" data-new>Jugar otra vez</button>`), 400);
        }
      } else {
        lock = true;
        flipBack = setTimeout(() => {
          a.open = b.open = false;
          open = [];
          lock = false;
          draw();
        }, 1000);
      }
    }
    draw();
  }

  const click = (e) => {
    if (e.target.closest("[data-new]")) return reset();
    const card = e.target.closest("[data-i]");
    if (card) flip(Number(card.dataset.i));
  };
  el.addEventListener("click", click);
  reset();
  return () => {
    clearTimeout(flipBack);
    clearInterval(timer);
    el.removeEventListener("click", click);
  };
}

// ---------------------------------------------------------------- juegos contrarreloj

function uniqueOptions(answer, candidates) {
  const opts = [answer];
  for (const c of candidates) {
    if (opts.length === 4) break;
    if (!opts.includes(c)) opts.push(c);
  }
  return shuffle(opts);
}

const bin = (n) => n.toString(2);
const hex = (n) => `0x${n.toString(16).toUpperCase()}`;

function genBinary(score) {
  const max = score < 5 ? 31 : score < 12 ? 127 : 255;
  const n = 1 + rand(max);
  const near = () => {
    const out = [];
    for (let k = 0; k < 8; k++) out.push(n ^ (1 << k));
    out.push(n + 1, n - 1, n + 2, n * 2, n >> 1, n + 16, n - 16);
    return shuffle(out.filter((x) => x > 0 && x <= 255 && x !== n));
  };
  const modes = score < 3 ? ["d2b", "b2d"] : ["d2b", "b2d", "d2h", "h2d"];
  const mode = modes[rand(modes.length)];
  if (mode === "d2b") return { label: "Decimal → binario", prompt: String(n), answer: bin(n), options: uniqueOptions(bin(n), near().map(bin)), mono: true };
  if (mode === "b2d") return { label: "Binario → decimal", prompt: bin(n), answer: String(n), options: uniqueOptions(String(n), near().map(String)) };
  if (mode === "d2h") return { label: "Decimal → hexadecimal", prompt: String(n), answer: hex(n), options: uniqueOptions(hex(n), near().map(hex)), mono: true };
  return { label: "Hexadecimal → decimal", prompt: hex(n), answer: String(n), options: uniqueOptions(String(n), near().map(String)) };
}

function genMath(score) {
  const lvl = score < 5 ? 0 : score < 12 ? 1 : 2;
  const ops = lvl === 0 ? ["+", "−"] : ["+", "−", "×", "÷"];
  const op = ops[rand(ops.length)];
  let a;
  let b;
  let r;
  const big = [20, 60, 150][lvl];
  if (op === "+") {
    a = 2 + rand(big);
    b = 2 + rand(big);
    r = a + b;
  } else if (op === "−") {
    a = 5 + rand(big);
    b = 1 + rand(a);
    r = a - b;
  } else if (op === "×") {
    a = 2 + rand([6, 10, 15][lvl]);
    b = 2 + rand([6, 12, 20][lvl]);
    r = a * b;
  } else {
    b = 2 + rand([6, 10, 13][lvl]);
    r = 2 + rand([6, 12, 15][lvl]);
    a = b * r;
  }
  const near = shuffle([r + 1, r - 1, r + 10, r - 10, r + 2, r - 2, r + b, r - b, Number(String(r).split("").reverse().join(""))]).filter((x) => x >= 0 && x !== r);
  return { label: "¿Cuánto es?", prompt: `${a} ${op} ${b}`, answer: String(r), options: uniqueOptions(String(r), near.map(String)) };
}

function mountTimed(el, id, gen) {
  const DURATION = 60000;
  let score;
  let endAt;
  let penalty;
  let current;
  let tick = null;
  let playing = false;

  el.innerHTML = `${statsBar(id, `<div class="g-stat"><span>Tiempo</span><b data-time>60</b></div>`)}
    <div class="g-stage">
      <div class="quick-game" data-board>
        <div class="qg-label" data-label>&nbsp;</div>
        <div class="qg-prompt" data-prompt>&nbsp;</div>
        <div class="qg-opts" data-opts></div>
        <div class="qg-time"><div class="qg-time-fill" data-bar></div></div>
      </div>
      <div class="g-overlay" data-overlay hidden></div>
    </div>
    <p class="muted small center">Acierto: +1 punto. Fallo: −3 segundos.</p>`;
  const board = el.querySelector("[data-board]");

  function next() {
    current = gen(score);
    el.querySelector("[data-label]").textContent = current.label;
    const p = el.querySelector("[data-prompt]");
    p.textContent = current.prompt;
    el.querySelector("[data-opts]").innerHTML = current.options
      .map((o) => `<button class="qg-opt${current.mono ? " mono" : ""}" data-opt="${esc(o)}">${esc(o)}</button>`)
      .join("");
  }

  function update() {
    const left = Math.max(0, endAt - penalty - Date.now());
    el.querySelector("[data-time]").textContent = Math.ceil(left / 1000);
    el.querySelector("[data-bar]").style.width = `${(left / DURATION) * 100}%`;
    if (left <= 0) end();
  }

  function end() {
    playing = false;
    clearInterval(tick);
    const record = submit(id, score);
    el.querySelector("[data-best]").textContent = best(id);
    overlay(el, `<h3>¡Tiempo!</h3><p>${score} ${score === 1 ? "acierto" : "aciertos"}${record ? " · ¡nuevo récord!" : ""}</p><button class="btn" data-start>Jugar otra vez</button>`);
  }

  function start() {
    score = 0;
    penalty = 0;
    endAt = Date.now() + DURATION;
    playing = true;
    el.querySelector("[data-score]").textContent = 0;
    overlay(el, null);
    next();
    update();
    tick = setInterval(update, 100);
  }

  function answer(btn) {
    if (!playing) return;
    const ok = btn.dataset.opt === current.answer;
    if (ok) {
      score++;
      el.querySelector("[data-score]").textContent = score;
    } else {
      penalty += 3000;
      navigator.vibrate?.(60);
    }
    board.classList.remove("flash-ok", "flash-bad");
    void board.offsetWidth; // reinicia la animación
    board.classList.add(ok ? "flash-ok" : "flash-bad");
    update();
    if (playing) next();
  }

  const click = (e) => {
    if (e.target.closest("[data-start]")) return start();
    const opt = e.target.closest("[data-opt]");
    if (opt) answer(opt);
  };
  el.addEventListener("click", click);
  const g = gameById(id);
  overlay(el, `<h3>${esc(g.name)}</h3><p>${esc(g.desc)}</p><button class="btn" data-start>Empezar</button>`);
  return () => {
    clearInterval(tick);
    el.removeEventListener("click", click);
  };
}
